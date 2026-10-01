import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery: pgQueryMock }));
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
}));
vi.mock("../../services/geminiService.js", () => ({
	getGeminiKeys: () => ["key-1"],
	withGeminiConcurrencyLimit: (fn: () => unknown) => fn(),
	GEMINI_REFUSAL_RE: /^I can't help with that$/,
	GEMINI_MODEL: "gemini-test",
	geminiUrl: () => "https://gemini.test/generate",
}));
const newsMock = vi.fn();
vi.mock("../../services/finnhubService.js", () => ({ getCompanyNews: newsMock }));

/** What the fake database holds for the test: the window's usage, and an optional existing conversation. */
interface Db {
	used: number;
	oldest?: string | null;
	conversation?: { id: string; uid: string; context: unknown; last_tickers: string[] } | null;
}
let db: Db;

/** Routes each query by its SQL, the way the real tables would answer it. */
function fakePg(sql: string, params: unknown[] = []) {
	const rows = (r: unknown[]) => Promise.resolve({ rows: r, rowCount: r.length });
	if (/FROM stak_ai_usage/.test(sql)) return rows([{ used: db.used, oldest: db.oldest ?? (db.used ? "2026-10-01T10:00:00.000Z" : null) }]);
	if (/SELECT id, context, last_tickers FROM stak_ai_conversations/.test(sql)) {
		const c = db.conversation;
		return rows(c && c.id === params[0] && c.uid === params[1] ? [c] : []);
	}
	if (/FROM users WHERE uid/.test(sql)) return rows([{ tag_scores: { tech: 3 }, preferences: { familiarity: "beginner" }, research_cohort: true }]);
	if (/FROM stak_brands/.test(sql)) return rows([]);
	if (/FROM stak_ai_messages WHERE conversation_id/.test(sql)) return rows([]);
	if (/INSERT INTO stak_ai_conversations/.test(sql)) return rows([{ id: "conv-new" }]);
	if (/INSERT INTO stak_ai_messages/.test(sql)) return rows([{ id: 11, role: "user" }, { id: 12, role: "assistant" }]);
	if (/^(DELETE|UPDATE) .*stak_ai_conversations/s.test(sql.trim())) {
		const c = db.conversation;
		return rows(c && c.id === params[0] && c.uid === params[1] ? [{ id: c.id }] : []);
	}
	if (/UPDATE stak_ai_messages SET feedback/.test(sql)) return rows(params[0] === 12 ? [{ id: 12 }] : []);
	return rows([]);
}

/** Every request body sent to Gemini, and every stock looked up, so tests can see what the model was given. */
let geminiBodies: any[];
let stockLookups: string[];
function stubFetch() {
	geminiBodies = [];
	stockLookups = [];
	vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
		if (url.includes("/api/stock/")) {
			stockLookups.push(decodeURIComponent(url.split("/api/stock/")[1]!));
			return new Response(JSON.stringify({ quote: { price: 100, changePercent: -3.2, marketState: "REGULAR" }, metrics: { peRatio: 30, marketCap: "1T", beta: 1.1 } }));
		}
		geminiBodies.push(JSON.parse(init!.body!));
		return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Here's what happened." }] } }] }));
	}));
}

async function buildApp() {
	vi.resetModules();
	const { stakAiRouter } = await import("../stakAi.js");
	const app = express();
	app.use(express.json());
	app.use("/", stakAiRouter);
	return app;
}

/** All the text the model saw for the latest question, notes included. */
const promptText = () => JSON.stringify(geminiBodies.at(-1)!.contents);

beforeEach(() => {
	db = { used: 0, conversation: null };
	pgQueryMock.mockReset();
	pgQueryMock.mockImplementation(fakePg);
	newsMock.mockReset();
	newsMock.mockResolvedValue([{ headline: "Chip stocks slide on export curbs" }]);
	stubFetch();
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /chat", () => {
	it("refuses once the window is used up, and says when a slot frees", async () => {
		db.used = 5;
		const res = await request(await buildApp()).post("/chat").send({ message: "Why did Nvidia drop?" });
		expect(res.status).toBe(429);
		expect(res.body.usage).toEqual({ limit: 5, used: 5, remaining: 0, resetsAt: "2026-10-01T16:00:00.000Z" });
		expect(geminiBodies).toHaveLength(0);
	});

	it("opened from a stock page, it gets that stock's live data and remembers the page", async () => {
		const res = await request(await buildApp()).post("/chat").send({ message: "Why is it down today?", context: { type: "stock", ticker: "nvda" } });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ response: "Here's what happened.", conversationId: "conv-new", messageId: 12 });
		expect(res.body.usage).toMatchObject({ used: 1, remaining: 4 });
		expect(stockLookups).toEqual(["NVDA"]);
		expect(promptText()).toContain("stock page");
		expect(promptText()).toContain("Chip stocks slide on export curbs");
		const insert = pgQueryMock.mock.calls.find(([sql]) => /INSERT INTO stak_ai_conversations/.test(sql))!;
		expect(JSON.parse(insert[1][2])).toEqual({ type: "stock", ticker: "NVDA" });
		expect(insert[1][3]).toEqual(["NVDA"]);
		expect(pgQueryMock.mock.calls.some(([sql]) => /INSERT INTO stak_ai_usage/.test(sql))).toBe(true);
	});

	it("a follow-up that doesn't name a company keeps the one the conversation was about", async () => {
		db.conversation = { id: "conv-1", uid: "u1", context: null, last_tickers: ["AAPL"] };
		const res = await request(await buildApp()).post("/chat").send({ message: "Is that normal for it?", conversationId: "conv-1" });
		expect(res.status).toBe(200);
		expect(stockLookups).toEqual(["AAPL"]);
		const update = pgQueryMock.mock.calls.find(([sql]) => /UPDATE stak_ai_conversations SET updated_at/.test(sql))!;
		expect(update[1][1]).toEqual(["AAPL"]);
	});

	it("naming a new company switches to it", async () => {
		db.conversation = { id: "conv-1", uid: "u1", context: null, last_tickers: ["AAPL"] };
		await request(await buildApp()).post("/chat").send({ message: "What about Nvidia?", conversationId: "conv-1" });
		expect(stockLookups).toEqual(["NVDA"]);
	});

	it("a $cashtag gets live data even outside the catalog", async () => {
		await request(await buildApp()).post("/chat").send({ message: "Why did $ZZQX jump?" });
		expect(stockLookups).toEqual(["ZZQX"]);
	});

	it("an article's headline and summary reach the model; a non-web link is dropped", async () => {
		await request(await buildApp()).post("/chat").send({
			message: "What does this mean for me?",
			context: { type: "article", headline: "Apple raises foldable orders", summary: "Suppliers told to prepare 10M units.", source: "Bloomberg", url: "javascript:alert(1)", tickers: ["aapl", "not a ticker", "AAPL"] },
		});
		expect(promptText()).toContain("Apple raises foldable orders");
		expect(promptText()).toContain("Suppliers told to prepare 10M units.");
		expect(stockLookups).toEqual(["AAPL"]);
		const insert = pgQueryMock.mock.calls.find(([sql]) => /INSERT INTO stak_ai_conversations/.test(sql))!;
		const saved = JSON.parse(insert[1][2]);
		expect(saved.url).toBeUndefined();
		expect(saved.tickers).toEqual(["AAPL"]);
	});

	it("a malformed context is ignored rather than failing the question", async () => {
		const res = await request(await buildApp()).post("/chat").send({ message: "What is a P/E ratio?", context: { type: "stock", ticker: "<script>" } });
		expect(res.status).toBe(200);
		expect(stockLookups).toEqual([]);
	});

	it("someone else's conversation is not found", async () => {
		db.conversation = { id: "conv-1", uid: "other", context: null, last_tickers: [] };
		const res = await request(await buildApp()).post("/chat").send({ message: "Hi", conversationId: "conv-1" });
		expect(res.status).toBe(404);
	});

	it("the instructions the model gets are clean text", async () => {
		await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		const system = geminiBodies[0].system_instruction.parts[0].text as string;
		expect(system).not.toMatch(/[ÂÃâ][\u0080-¿ -⃿]/);
		expect(system).toContain("━━━ STYLE ━━━");
		expect(system).toContain("American English");
	});
});

describe("conversations, usage and feedback", () => {
	it("usage reports what's left in the window", async () => {
		db.used = 2;
		const res = await request(await buildApp()).get("/usage");
		expect(res.body).toEqual({ limit: 5, used: 2, remaining: 3, resetsAt: "2026-10-01T16:00:00.000Z" });
	});

	it("deletes and renames only the owner's conversation", async () => {
		db.conversation = { id: "conv-1", uid: "u1", context: null, last_tickers: [] };
		const app = await buildApp();
		expect((await request(app).patch("/conversations/conv-1").send({ title: "  Nvidia questions  " })).body).toEqual({ ok: true, title: "Nvidia questions" });
		expect((await request(app).patch("/conversations/conv-1").send({ title: "  " })).status).toBe(400);
		expect((await request(app).delete("/conversations/conv-2")).status).toBe(404);
		expect((await request(app).delete("/conversations/conv-1")).body).toEqual({ ok: true });
	});

	it("thumbs on an answer: 1, -1 or null; anything else is refused", async () => {
		const app = await buildApp();
		expect((await request(app).post("/messages/12/feedback").send({ value: 1 })).body).toEqual({ ok: true });
		expect((await request(app).post("/messages/12/feedback").send({ value: null })).status).toBe(200);
		expect((await request(app).post("/messages/12/feedback").send({ value: 5 })).status).toBe(400);
		expect((await request(app).post("/messages/99/feedback").send({ value: -1 })).status).toBe(404);
	});
});

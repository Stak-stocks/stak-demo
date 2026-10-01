import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Every query, from pgQuery or a transaction's client, lands in this one mock so tests can see them all in order.
const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	pgPool: { connect: async () => ({ query: pgQueryMock, release: () => {} }) },
}));
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
}));
vi.mock("../../services/geminiService.js", () => ({
	getGeminiKeys: () => ["key-1"],
	withGeminiConcurrencyLimit: (fn: () => unknown) => fn(),
	GEMINI_REFUSAL_RE: /^I'm sorry/,
	GEMINI_MODEL: "gemini-test",
	geminiUrl: () => "https://gemini.test/generate",
	geminiStreamUrl: () => "https://gemini.test/stream",
}));
const newsMock = vi.fn();
vi.mock("../../services/finnhubService.js", () => ({ getCompanyNews: newsMock }));
const stockLookups: string[] = [];
vi.mock("../stock.js", () => ({
	getStockSnapshot: async (t: string) => {
		stockLookups.push(t);
		return { quote: { price: 100, changePercent: -3.2, marketState: "REGULAR" }, metrics: { peRatio: 30, marketCap: "1T", beta: 1.1 } };
	},
}));

const CONV_1 = "11111111-1111-4111-8111-111111111111";
const CONV_2 = "22222222-2222-4222-8222-222222222222";

/** What the fake database holds: the window's usage, an optional existing conversation, and failure switches. */
interface Db {
	used: number;
	conversation?: { id: string; uid: string; title?: string; context: unknown; last_tickers: string[] } | null;
	failMessageInsert?: boolean;
}
let db: Db;

/** Answers each query by its SQL, the way the real tables would. */
function fakePg(sql: string, params: unknown[] = []) {
	const rows = (r: unknown[]) => Promise.resolve({ rows: r, rowCount: r.length });
	const s = sql.trim();
	if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(s) || /pg_advisory_xact_lock/.test(s)) return rows([]);
	if (/FROM stak_ai_usage/.test(s)) return rows([{ used: db.used, oldest: db.used ? "2026-10-01T10:00:00.000Z" : null }]);
	if (/^INSERT INTO stak_ai_usage/.test(s)) return rows([{ id: 77 }]);
	if (/^DELETE FROM stak_ai_usage/.test(s)) return rows([]);
	if (/SELECT id, context, last_tickers FROM stak_ai_conversations/.test(s) || /SELECT id, title, context FROM stak_ai_conversations/.test(s)) {
		const c = db.conversation;
		return rows(c && c.id === params[0] && c.uid === params[1] ? [{ title: "A chat", ...c }] : []);
	}
	if (/FROM users WHERE uid/.test(s)) return rows([{ tag_scores: { tech: 3 }, preferences: {}, research_cohort: true }]);
	if (/FROM stak_brands/.test(s)) return rows([]);
	if (/FROM stak_ai_messages WHERE conversation_id = \$1 ORDER BY created_at DESC/.test(s)) return rows([]);
	if (/^INSERT INTO stak_ai_conversations/.test(s)) return rows([{ id: "conv-new" }]);
	if (/^INSERT INTO stak_ai_messages/.test(s)) {
		if (db.failMessageInsert) return Promise.reject(new Error("insert failed"));
		return rows([{ id: 11, role: "user" }, { id: 12, role: "assistant" }]);
	}
	if (/FROM stak_ai_conversations c/.test(s)) {
		return rows([{ id: CONV_1, title: "NVIDIA: Why is it down?", context: { type: "stock", ticker: "NVDA" }, preview: "It fell on export curbs.", created_at: "2026-10-01T09:00:00Z", updated_at: "2026-10-01T09:05:00Z" }]);
	}
	if (/FROM stak_ai_messages WHERE conversation_id = \$1 AND uid/.test(s)) return rows([{ id: 12, role: "assistant", content: "Hi", kind: "declined", feedback: 1, created_at: "x" }]);
	if (/^(DELETE|UPDATE) .*stak_ai_conversations/s.test(s)) {
		const c = db.conversation;
		return rows(c && c.id === params[0] && c.uid === params[1] ? [{ id: c.id }] : []);
	}
	if (/UPDATE stak_ai_messages SET feedback/.test(s)) return rows(params[0] === 12 && params[1] === "u1" ? [{ id: 12 }] : []);
	return rows([]);
}

/** Every request body sent to Gemini; the model's next reply text (null makes the call fail). */
let geminiBodies: any[];
let geminiReply: string | null;
function stubFetch() {
	geminiBodies = [];
	vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: { body?: string }) => {
		geminiBodies.push(JSON.parse(init!.body!));
		if (geminiReply === null) return new Response("boom", { status: 500 });
		return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: geminiReply }] } }] }));
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

const promptText = () => JSON.stringify(geminiBodies.at(-1)!.contents);
const calls = (re: RegExp) => pgQueryMock.mock.calls.filter(([sql]) => re.test(sql));

beforeEach(() => {
	db = { used: 0, conversation: null };
	stockLookups.length = 0;
	pgQueryMock.mockReset();
	pgQueryMock.mockImplementation(fakePg);
	newsMock.mockReset();
	newsMock.mockResolvedValue([{ headline: "Chip stocks slide on export curbs", url: "https://news.test/a" }]);
	geminiReply = "It fell on export curbs.\n[[FOLLOWUPS]] What are export curbs? | Did other chip stocks fall?";
	stubFetch();
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /chat", () => {
	it("refuses once the window is used up, with a code and when a slot frees", async () => {
		db.used = 5;
		const res = await request(await buildApp()).post("/chat").send({ message: "Why did Nvidia drop?" });
		expect(res.status).toBe(429);
		expect(res.body.code).toBe("limit_reached");
		expect(res.body.usage).toEqual({ limit: 5, used: 5, remaining: 0, resetsAt: "2026-10-01T16:00:00.000Z" });
		expect(geminiBodies).toHaveLength(0);
		expect(calls(/^INSERT INTO stak_ai_usage/)).toHaveLength(0);
	});

	it("claims the question under a per-user lock before calling the AI", async () => {
		await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		const sqls = pgQueryMock.mock.calls.map(([sql]) => String(sql).trim());
		const lock = sqls.findIndex((s) => /pg_advisory_xact_lock/.test(s));
		const claim = sqls.findIndex((s) => /^INSERT INTO stak_ai_usage/.test(s));
		expect(lock).toBeGreaterThan(-1);
		expect(claim).toBeGreaterThan(lock);
	});

	it("opened from a stock page: that stock's data, a labelled title, follow-ups and sources", async () => {
		const res = await request(await buildApp()).post("/chat").send({ message: "why is it down today?", context: { type: "stock", ticker: "nvda" } });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ response: "It fell on export curbs.", conversationId: "conv-new", messageId: 12, answerKind: "answer" });
		expect(res.body.followUps).toEqual(["What are export curbs?", "Did other chip stocks fall?"]);
		expect(res.body.sources).toEqual([{ ticker: "NVDA", headline: "Chip stocks slide on export curbs", url: "https://news.test/a" }]);
		expect(res.body.usage).toMatchObject({ used: 1, remaining: 4 });
		expect(stockLookups).toEqual(["NVDA"]);
		expect(promptText()).toContain("stock page");
		const insert = calls(/^\s*INSERT INTO stak_ai_conversations/)[0]!;
		expect(insert[1][1]).toMatch(/^.+: Why is it down today\?$/);
		expect(JSON.parse(insert[1][2])).toEqual({ type: "stock", ticker: "NVDA" });
		expect(insert[1][3]).toEqual(["NVDA"]);
		// The stored answer has no markers.
		expect(calls(/^\s*INSERT INTO stak_ai_messages/)[0]![1][3]).toBe("It fell on export curbs.");
	});

	it("a follow-up that points back keeps the conversation's company — even with a word like 'now'", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: ["AAPL"] };
		const res = await request(await buildApp()).post("/chat").send({ message: "is that normal for it now?", conversationId: CONV_1 });
		expect(res.status).toBe(200);
		expect(stockLookups).toEqual(["AAPL"]);
	});

	it("naming a new company switches to it", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: ["AAPL"] };
		await request(await buildApp()).post("/chat").send({ message: "What about Nvidia?", conversationId: CONV_1 });
		expect(stockLookups).toEqual(["NVDA"]);
		expect(calls(/UPDATE stak_ai_conversations SET updated_at/)[0]![1][1]).toEqual(["NVDA"]);
	});

	it("a general question, or a company it can't recognise, gets no stale data from the last one", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: ["AAPL"] };
		const app = await buildApp();
		await request(app).post("/chat").send({ message: "What's a P/E ratio?", conversationId: CONV_1 });
		await request(app).post("/chat").send({ message: "Why is Foobarco moving?", conversationId: CONV_1 });
		expect(stockLookups).toEqual([]);
	});

	it("re-sending the same page context doesn't drag a follow-up back to it", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: { type: "stock", ticker: "TSLA" }, last_tickers: ["NVDA"] };
		await request(await buildApp()).post("/chat").send({ message: "is that normal for it?", conversationId: CONV_1, context: { type: "stock", ticker: "TSLA" } });
		expect(stockLookups).toEqual(["NVDA"]);
	});

	it("a $cashtag gets live data even outside the catalog", async () => {
		await request(await buildApp()).post("/chat").send({ message: "Why did $ZZQX jump?" });
		expect(stockLookups).toEqual(["ZZQX"]);
	});

	it("an article's text reaches the model and titles the chat; a non-web link is dropped", async () => {
		await request(await buildApp()).post("/chat").send({
			message: "What does this mean for me?",
			context: { type: "article", headline: "Apple raises foldable orders", summary: "Suppliers told to prepare 10M units.", url: "javascript:alert(1)", tickers: ["aapl", "not a ticker", "AAPL"] },
		});
		expect(promptText()).toContain("Suppliers told to prepare 10M units.");
		expect(stockLookups).toEqual(["AAPL"]);
		const insert = calls(/^\s*INSERT INTO stak_ai_conversations/)[0]!;
		expect(insert[1][1]).toBe("Apple raises foldable orders");
		const saved = JSON.parse(insert[1][2]);
		expect(saved.url).toBeUndefined();
		expect(saved.tickers).toEqual(["AAPL"]);
		expect(JSON.parse(calls(/INSERT INTO stak_ai_research_log/)[0]![1][7]).type).toBe("article");
	});

	it("a declined answer doesn't count and comes back marked", async () => {
		geminiReply = "[[DECLINED]] I can't tell you whether to buy it, but I can explain what's been moving it.";
		const res = await request(await buildApp()).post("/chat").send({ message: "Should I buy Tesla?" });
		expect(res.body.answerKind).toBe("declined");
		expect(calls(/^\s*INSERT INTO stak_ai_messages/)[0]![1][4]).toBe("declined");
		expect(res.body.response).toBe("I can't tell you whether to buy it, but I can explain what's been moving it.");
		expect(res.body.followUps).toEqual([]);
		expect(res.body.usage).toMatchObject({ used: 0, remaining: 5 });
		expect(calls(/^DELETE FROM stak_ai_usage/)).toHaveLength(1);
	});

	it("when the AI fails, nothing is saved and the question is handed back", async () => {
		geminiReply = null;
		const res = await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(res.status).toBe(503);
		expect(res.body.code).toBe("ai_unavailable");
		expect(res.body.error).toMatch(/didn't count/);
		expect(calls(/^\s*INSERT INTO stak_ai_conversations/)).toHaveLength(0);
		expect(calls(/^DELETE FROM stak_ai_usage/)).toHaveLength(1);
	});

	it("if saving fails, the whole exchange rolls back and the question is handed back", async () => {
		db.failMessageInsert = true;
		const res = await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(res.status).toBe(500);
		expect(res.body.code).toBe("server_error");
		expect(calls(/^ROLLBACK$/).length).toBeGreaterThan(0);
		expect(calls(/^DELETE FROM stak_ai_usage/)).toHaveLength(1);
	});

	it("bad input is a 400/404, not a crash", async () => {
		const app = await buildApp();
		expect((await request(app).post("/chat").send({ message: 123 })).status).toBe(400);
		expect((await request(app).post("/chat").send({ message: "Hi", conversationId: "not-a-uuid" })).status).toBe(404);
	});

	it("someone else's conversation is not found, and the claim is handed back", async () => {
		db.conversation = { id: CONV_1, uid: "other", context: null, last_tickers: [] };
		const res = await request(await buildApp()).post("/chat").send({ message: "Hi", conversationId: CONV_1 });
		expect(res.status).toBe(404);
		expect(calls(/^DELETE FROM stak_ai_usage/)).toHaveLength(1);
	});

	it("the instructions are clean, educational and never advice", async () => {
		await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		const system = geminiBodies[0].system_instruction.parts[0].text as string;
		expect(system).not.toMatch(/[ÂÃâ][\u0080-¿ -⃿]/);
		expect(system).toContain("Comparisons and financial-health questions are welcome");
		expect(system).toContain("Never tell someone what to do with their money");
		expect(system).toContain("assume a beginner");
		// The fixed rules come before the per-user profile.
		expect(system.indexOf("━━━ STYLE ━━━")).toBeLessThan(system.indexOf("━━━ ABOUT THIS USER ━━━"));
	});
});

describe("helpers", () => {
	it("word-like tickers only count as $cashtags; names that are words need a capital", async () => {
		const { detectNamedTickers } = await import("../stakAi.js");
		expect(detectNamedTickers("is that normal for it now? so what?")).toEqual([]);
		expect(detectNamedTickers("Why did $NOW jump?")).toEqual(["NOW"]);
		expect(detectNamedTickers("analysts raised the price target")).toEqual([]);
		expect(detectNamedTickers("why is apple up")).toEqual(["AAPL"]);
	});

	it("titles are capitalized and cut on a word with an ellipsis", async () => {
		const { makeTitle } = await import("../stakAi.js");
		expect(makeTitle("what is beta", null)).toBe("What is beta");
		const long = makeTitle("how do interest rate decisions by the federal reserve affect tech stocks over time", null);
		expect(long.length).toBeLessThanOrEqual(61);
		expect(long.endsWith("…")).toBe(true);
	});

	it("parseAnswer strips markers wherever they are", async () => {
		const { parseAnswer } = await import("../stakAi.js");
		expect(parseAnswer("[[CLARIFY]] Do you mean Apple or Alphabet?")).toEqual({ text: "Do you mean Apple or Alphabet?", kind: "clarify", followUps: [] });
		expect(parseAnswer("Answer.\n\n[[FOLLOWUPS]] - One? | Two? ")).toEqual({ text: "Answer.", kind: "answer", followUps: ["One?", "Two?"] });
		expect(parseAnswer("Plain answer.")).toEqual({ text: "Plain answer.", kind: "answer", followUps: [] });
	});
});

describe("conversations, usage and feedback", () => {
	it("usage reports what's left in the window", async () => {
		db.used = 2;
		expect((await request(await buildApp()).get("/usage")).body).toEqual({ limit: 5, used: 2, remaining: 3, resetsAt: "2026-10-01T16:00:00.000Z" });
	});

	it("the list labels what each chat was opened from and previews its latest answer", async () => {
		const res = await request(await buildApp()).get("/conversations");
		expect(res.body.conversations[0]).toMatchObject({ id: CONV_1, context_type: "stock", preview: "It fell on export curbs." });
		expect(res.body.conversations[0].context_label).toBeTruthy();
		expect(res.body.conversations[0].context).toBeUndefined();
		expect(res.body.nextBefore).toBeNull();
	});

	it("a conversation's messages come with its title, context and feedback", async () => {
		db.conversation = { id: CONV_1, uid: "u1", title: "NVIDIA chat", context: { type: "stock", ticker: "NVDA" }, last_tickers: [] };
		const res = await request(await buildApp()).get(`/conversations/${CONV_1}/messages`);
		expect(res.body).toMatchObject({ title: "NVIDIA chat", context: { type: "stock", ticker: "NVDA" } });
		expect(res.body.messages[0]).toMatchObject({ id: 12, kind: "declined", feedback: 1 });
	});

	it("rename and delete only touch the owner's conversation", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: [] };
		const app = await buildApp();
		expect((await request(app).patch(`/conversations/${CONV_1}`).send({ title: "  Nvidia questions  " })).body).toEqual({ ok: true, title: "Nvidia questions" });
		expect((await request(app).patch(`/conversations/${CONV_1}`).send({ title: "  " })).status).toBe(400);
		expect((await request(app).patch(`/conversations/${CONV_2}`).send({ title: "Mine now" })).status).toBe(404);
		expect((await request(app).delete(`/conversations/${CONV_2}`)).status).toBe(404);
		expect((await request(app).delete("/conversations/not-a-uuid")).status).toBe(404);
		expect((await request(app).delete(`/conversations/${CONV_1}`)).body).toEqual({ ok: true });
	});

	it("thumbs on an answer: 1, -1 or null; anything else is refused", async () => {
		const app = await buildApp();
		expect((await request(app).post("/messages/12/feedback").send({ value: 1 })).body).toEqual({ ok: true });
		expect((await request(app).post("/messages/12/feedback").send({ value: null })).status).toBe(200);
		expect((await request(app).post("/messages/12/feedback").send({ value: 5 })).status).toBe(400);
		expect((await request(app).post("/messages/1e20/feedback").send({ value: 1 })).status).toBe(400);
		expect((await request(app).post("/messages/99/feedback").send({ value: -1 })).status).toBe(404);
	});
});

// ── Streaming ───────────────────────────────────────────────────────────────

/** Gemini's streamGenerateContent?alt=sse reply, split into the given text pieces. */
function geminiSse(pieces: string[]) {
	const body = pieces.map((t) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\r\n\r\n`).join("");
	return new Response(new ReadableStream({
		start(c) {
			const bytes = new TextEncoder().encode(body);
			// Cut mid-line too, as the network would.
			for (let i = 0; i < bytes.length; i += 37) c.enqueue(bytes.slice(i, i + 37));
			c.close();
		},
	}), { headers: { "Content-Type": "text/event-stream" } });
}

/** The SSE events in a response body, in order. */
function events(text: string) {
	return text.split("\n\n").filter(Boolean).map((block) => {
		const event = block.match(/^event: (.*)$/m)?.[1];
		const data = block.match(/^data: (.*)$/m)?.[1];
		return { event, data: data ? JSON.parse(data) : null };
	});
}

describe("POST /chat/stream", () => {
	it("streams the answer without the markers, then the clean reply", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => geminiSse(["Chips **fell** on ", "export curbs.\n[[FOLL", "OWUPS]] What are curbs? | Who else fell?"])));
		const res = await request(await buildApp()).post("/chat/stream").send({ message: "Why is NVDA down?", via: "starter" });
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
		const evs = events(res.text);
		const streamed = evs.filter((e) => e.event === "delta").map((e) => e.data.text).join("");
		expect(streamed).not.toMatch(/\[\[|FOLLOWUPS/);
		expect(streamed).toContain("Chips **fell** on export curbs.");
		const done = evs.find((e) => e.event === "done")!.data;
		expect(done).toMatchObject({ response: "Chips **fell** on export curbs.", answerKind: "answer", followUps: ["What are curbs?", "Who else fell?"], messageId: 12 });
		const usageEvent = calls(/INSERT INTO events/)[0]!;
		expect(JSON.parse(usageEvent[1][1])).toMatchObject({ via: "starter", kind: "answer", streamed: true });
	});

	it("a decline streams without its marker and doesn't count", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => geminiSse(["[[DECL", "INED]] I can't tell you ", "whether to buy it."])));
		const res = await request(await buildApp()).post("/chat/stream").send({ message: "Should I buy Tesla?" });
		const evs = events(res.text);
		expect(evs.filter((e) => e.event === "delta").map((e) => e.data.text).join("")).toBe("I can't tell you whether to buy it.");
		expect(evs.find((e) => e.event === "done")!.data.answerKind).toBe("declined");
		expect(calls(/^DELETE FROM stak_ai_usage/)).toHaveLength(1);
	});

	it("out of questions is a plain 429 before any stream starts", async () => {
		db.used = 5;
		const res = await request(await buildApp()).post("/chat/stream").send({ message: "One more?" });
		expect(res.status).toBe(429);
		expect(res.body.code).toBe("limit_reached");
	});

	it("when the AI fails mid-way, the stream ends with an error and the question is handed back", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
		const res = await request(await buildApp()).post("/chat/stream").send({ message: "What is beta?" });
		const evs = events(res.text);
		expect(evs.at(-1)).toMatchObject({ event: "error", data: { code: "ai_unavailable" } });
		expect(calls(/^DELETE FROM stak_ai_usage/)).toHaveLength(1);
		expect(calls(/^\s*INSERT INTO stak_ai_conversations/)).toHaveLength(0);
	});
});

describe("streamableText", () => {
	it("holds back what might be a marker", async () => {
		const { streamableText } = await import("../stakAi.js");
		expect(streamableText("[[DEC")).toBe("");
		expect(streamableText("[[CLARIFY]] Do you mean")).toBe("Do you mean");
		expect(streamableText("Answer here.\n[")).toBe("Answer here.\n");
		expect(streamableText("Answer.\n[[FOLLOWUPS]] a | b")).toBe("Answer.\n");
		expect(streamableText("[Note] plain text after a bracket")).toBe("[Note] plain text after a bracket");
	});
});

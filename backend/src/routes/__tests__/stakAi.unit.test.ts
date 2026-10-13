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
	AMERICAN_ENGLISH: { parts: [{ text: "American English" }] },
	getGeminiKeys: () => ["key-1", "key-2"],
	withGeminiConcurrencyLimit: (fn: () => unknown) => fn(),
	GEMINI_REFUSAL_RE: /^I'm sorry/,
	GEMINI_MODEL: "gemini-test",
	geminiStreamUrl: () => "https://gemini.test/stream",
}));
const newsMock = vi.fn();
vi.mock("../../services/finnhubService.js", async (real) => ({ ...(await real<object>()), getCompanyNews: newsMock }));
const stockLookups: string[] = [];
vi.mock("../stock.js", () => ({
	getStockSnapshot: async (t: string) => {
		stockLookups.push(t);
		if (t === "ZZNQ") return { quote: null, metrics: {} };
		return { quote: { price: 100, changePercent: -3.2, marketState: "REGULAR" }, metrics: { peRatio: 30, marketCap: "1T", beta: 1.1, week52Low: 80, week52High: 210.5, yearReturn: -53.06, ytdReturn: 4, return5d: -4.03, return13w: 8.68, return26w: 28.74, revenueGrowthQuarterYoy: 105.85, epsGrowthQuarterYoy: -12, profitMargin: "63.7%" } };
	},
	getQuarterlyEps: async (t: string) => {
		epsLookups.push(t);
		return [
			{ period: "2026-09-30", quarter: 2, year: 2027, actual: 2.22, estimate: 2.1384, surprisePercent: 3.8159 },
			{ period: "2026-06-30", quarter: 1, year: 2027, actual: -0.1, estimate: 0.05, surprisePercent: -300 },
		];
	},
}));
const epsLookups: string[] = [];

const CONV_1 = "11111111-1111-4111-8111-111111111111";
const CONV_2 = "22222222-2222-4222-8222-222222222222";

/** What the fake database holds: the window's usage, an optional existing conversation, and failure switches. */
interface Db {
	used: number;
	/** The account's own question limit (stak_ai_limits), if it has one; "none" for no limit. */
	ownLimit?: number | "none" | null;
	conversation?: { id: string; uid: string; title?: string; context: unknown; last_tickers: string[] } | null;
	failMessageInsert?: boolean;
}
let db: Db;

/** Answers each query by its SQL, the way the real tables would. */
function fakePg(sql: string, params: unknown[] = []) {
	const rows = (r: unknown[]) => Promise.resolve({ rows: r, rowCount: r.length });
	const s = sql.trim();
	if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(s) || /pg_advisory_xact_lock/.test(s)) return rows([]);
	if (/FROM stak_ai_usage/.test(s)) return rows([{ used: db.used, oldest: db.used ? "2026-10-01T10:00:00.000Z" : null, own_limit: typeof db.ownLimit === "number" ? db.ownLimit : null, unlimited: db.ownLimit === "none" }]);
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

/** Every request body sent to Gemini; the model's next reply text (null makes every key fail). */
let geminiBodies: any[];
let geminiReply: string | null;
/** Tool requests the model makes first, one round per entry, before it answers with geminiReply. */
let geminiToolRounds: { name: string; args: Record<string, unknown> }[][];
/** Answers given in turn before geminiReply (an answer and then its rewrite, say). */
let geminiTexts: string[];
function stubFetch() {
	geminiBodies = [];
	geminiToolRounds = [];
	geminiTexts = [];
	vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: { body?: string }) => {
		const body = JSON.parse(init!.body!);
		geminiBodies.push(body);
		if (geminiReply === null) return new Response("boom", { status: 500 });
		// Asked to answer without tools (the last round): it answers.
		const round = body.toolConfig?.functionCallingConfig?.mode === "NONE" ? undefined : geminiToolRounds.shift();
		return round ? geminiCallSse(round) : geminiSse([geminiTexts.shift() ?? geminiReply]);
	}));
}

/** A streamed reply that only asks for tools. */
function geminiCallSse(calls: { name: string; args: Record<string, unknown> }[]) {
	const chunk = { candidates: [{ content: { role: "model", parts: calls.map((c) => ({ functionCall: c })) }, finishReason: "STOP" }] };
	return new Response(`data: ${JSON.stringify(chunk)}\r\n\r\n`, { headers: { "Content-Type": "text/event-stream" } });
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
	epsLookups.length = 0;
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
		expect(promptText()).toContain("52-week range $80.00-$210.50 (as of last close) | past year -53.1% | year to date +4.0%");
		expect(promptText()).toContain("past 5 trading days -4.0% (to last close) | past 13 weeks (about a quarter) +8.7% (to last close) | past 26 weeks +28.7% (to last close) | latest reported quarter vs the same quarter a year earlier: revenue +105.8%, EPS -12.0% | net profit margin (last 12 months) 63.7%");
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
		// ...and it's told so, rather than left to fill the gap.
		expect(promptText()).toContain("No company data was loaded up front for this question");
	});

	it("a follow-up asking what's happening keeps the conversation's company", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: ["APP"] };
		const app = await buildApp();
		await request(app).post("/chat").send({ message: "Any negative catalyst", conversationId: CONV_1 });
		await request(app).post("/chat").send({ message: "lawsuit?", conversationId: CONV_1 });
		expect(stockLookups).toEqual(["APP", "APP"]);
	});

	it("a follow-up naming a company we don't know doesn't get the last one's data", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: ["APP"] };
		await request(await buildApp()).post("/chat").send({ message: "Any news on Foobarco?", conversationId: CONV_1 });
		expect(stockLookups).toEqual([]);
	});

	it("acronyms, days and market-wide questions don't confuse the follow-up rule", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: ["APP"] };
		const app = await buildApp();
		await request(app).post("/chat").send({ message: "any lawsuit from the SEC on Monday?", conversationId: CONV_1 });
		expect(stockLookups).toEqual(["APP"]);
		await request(app).post("/chat").send({ message: "why is the market down today", conversationId: CONV_1 });
		expect(stockLookups).toEqual(["APP"]);
	});

	it("after switching companies, the page it was opened from isn't re-noted beside the new one's data", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: { type: "stock", ticker: "TSLA" }, last_tickers: ["NVDA"] };
		await request(await buildApp()).post("/chat").send({ message: "lawsuit?", conversationId: CONV_1 });
		expect(stockLookups).toEqual(["NVDA"]);
		expect(promptText()).not.toContain("stock page");
	});

	it("news that times out is reported as not loaded, not as no news", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout"] });
		newsMock.mockReturnValue(new Promise(() => {}));
		const pending = request(await buildApp()).post("/chat").send({ message: "Why did $ZZQX jump?" }).then((r) => r);
		await vi.advanceTimersByTimeAsync(3_100);
		vi.useRealTimers();
		await pending;
		expect(promptText()).toContain("ZZQX (ZZQX): news couldn't be loaded just now.");
	});

	it("history breaks a turn's shared timestamp by id, so the question comes before its answer", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: [] };
		await request(await buildApp()).post("/chat").send({ message: "What is beta?", conversationId: CONV_1 });
		const history = calls(/FROM stak_ai_messages WHERE conversation_id = \$1 ORDER BY/)[0]![0] as string;
		expect(history).toMatch(/ORDER BY created_at DESC, id DESC/);
		expect(history).toMatch(/ORDER BY created_at ASC, id ASC/);
	});

	it("a company with no quote or news is said to have none, not left for the model to fill in", async () => {
		newsMock.mockResolvedValue([]);
		await request(await buildApp()).post("/chat").send({ message: "Why did $ZZQX jump?" });
		expect(promptText()).toContain("ZZQX (ZZQX): no headlines found from the past week.");
	});

	it("headlines carry their US Eastern date, so the model can tell today's news from last week's", async () => {
		newsMock.mockResolvedValue([{ headline: "Kids ads lawsuit filed", url: "https://news.test/k", datetime: 1_760_000_000, source: "SeekingAlpha" }]);
		await request(await buildApp()).post("/chat").send({ message: "Why did $ZZQX jump?" });
		expect(promptText()).toContain("  - (Thu, Oct 9) Seeking Alpha: Kids ads lawsuit filed");
		// Undated: no made-up date.
		newsMock.mockResolvedValue([{ headline: "Kids ads lawsuit filed", url: "https://news.test/k", datetime: 0 }]);
		await request(await buildApp()).post("/chat").send({ message: "Why did $ZZQX jump?" });
		expect(promptText()).toContain("  - Kids ads lawsuit filed");
	});

	it("a question about a story looks back a month for it, and labels the older story as not recent news", async () => {
		const now = Math.floor(Date.now() / 1000);
		const long = `A judge heard Unity's request ${"in a long hearing about ad data and auctions ".repeat(8)}and ruled.`;
		newsMock.mockImplementation(async (_t: string, _limit: number, _name?: string, opts?: { days?: number }) =>
			opts?.days === 30
				? [{ headline: "AppLovin takes Unity to court", summary: long, url: "https://news.test/u", datetime: now - 20 * 86_400 }]
				: [{ headline: "Chip stocks slide", summary: "", url: "https://news.test/a", datetime: now - 3_600 }]);
		const app = await buildApp();
		await request(app).post("/chat").send({ message: "Why is NVDA down today?" });
		expect(newsMock.mock.calls.some((c) => c[3]?.days === 30)).toBe(false);

		await request(app).post("/chat").send({ message: "What about the Unity court case with $NVDA?" });
		expect(newsMock.mock.calls.filter((c) => c[3]?.days === 30).map((c) => c[2])).toEqual([undefined]);
		const prompt = promptText();
		expect(prompt).toContain("NVIDIA (NVDA) headlines from the past week:");
		expect(prompt).toContain("NVIDIA (NVDA) older stories matching the question (not recent news):");
		// A long summary is cut at a word, marked with "…".
		expect(prompt).toMatch(/A judge heard Unity's request [a-z ]+…/);
		expect(prompt).not.toContain("and ruled.");
	});

	it("a question about results gets the last reported quarters; other questions don't fetch them", async () => {
		const app = await buildApp();
		await request(app).post("/chat").send({ message: "Why is $ZZQX moving today?" });
		expect(epsLookups).toEqual([]);
		await request(app).post("/chat").send({ message: "Did $ZZQX beat earnings last quarter?" });
		expect(epsLookups).toEqual(["ZZQX"]);
		const prompt = promptText();
		expect(prompt).toContain("Past quarterly results:");
		expect(prompt).toContain("Fiscal Q2 2027 (period listed as Sep 2026): $2.22 vs $2.14 estimate - beat by $0.08 (3.8%)");
		// A loss against a small positive estimate: the gap in dollars, no "300%".
		expect(prompt).toContain("Fiscal Q1 2027 (period listed as Jun 2026): -$0.10 vs $0.05 estimate - missed by $0.15");
		expect(prompt).not.toContain("300");
	});

	it("an earnings follow-up keeps the conversation's company; a definition doesn't", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: ["AAPL"] };
		const app = await buildApp();
		await request(app).post("/chat").send({ message: "What does EPS mean?", conversationId: CONV_1 });
		await request(app).post("/chat").send({ message: "I don't want to miss out", conversationId: CONV_1 });
		expect(stockLookups).toEqual([]);
		await request(app).post("/chat").send({ message: "and last quarter's earnings?", conversationId: CONV_1 });
		expect(stockLookups).toEqual(["AAPL"]);
		expect(epsLookups).toEqual(["AAPL"]);
		// "What about the quarter before?" once got nothing, and the model answered from memory.
		await request(app).post("/chat").send({ message: "What about the quarter before?", conversationId: CONV_1 });
		expect(epsLookups).toEqual(["AAPL", "AAPL"]);
	});

	it("the model fetches what wasn't loaded up front, and the conversation is then about that company", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: [] };
		geminiToolRounds = [[{ name: "get_quarterly_results", args: { ticker: "nvda" } }]];
		const res = await request(await buildApp()).post("/chat").send({ message: "and the quarter before that one?", conversationId: CONV_1 });
		expect(res.status).toBe(200);
		expect(geminiBodies).toHaveLength(2);
		expect(geminiBodies[0].tools[0].functionDeclarations.map((d: { name: string }) => d.name))
			.toEqual(["find_company", "get_stock", "get_news", "get_quarterly_results"]);
		// The request, as the model sent it, then the result going back.
		const second = JSON.stringify(geminiBodies[1].contents);
		expect(second).toContain('"functionCall":{"name":"get_quarterly_results"');
		expect(second).toContain("Fiscal Q2 2027 (period listed as Sep 2026): $2.22 vs $2.14 estimate");
		expect(epsLookups).toEqual(["NVDA"]);
		expect(calls(/UPDATE stak_ai_conversations SET updated_at/)[0]![1][1]).toEqual(["NVDA"]);
		expect(JSON.parse(calls(/INSERT INTO events/)[0]![1][1]).tools).toBe(1);
	});

	it("a misspelled company is found through find_company", async () => {
		const { findCompanies } = await import("../stakAi.js");
		expect(findCompanies("apploving")).toEqual([{ ticker: "APP", name: "AppLovin Corp" }]);
		expect(findCompanies("netflix").map((m) => m.ticker)).toContain("NFLX");
		expect(findCompanies("foobarco")).toEqual([]);
	});

	it("after two rounds of lookups it must answer, and a bad ticker is turned back", async () => {
		geminiToolRounds = [
			[{ name: "get_stock", args: { ticker: "not a ticker!" } }],
			[{ name: "get_stock", args: { ticker: "AAPL" } }],
			[{ name: "get_stock", args: { ticker: "MSFT" } }],
		];
		const res = await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(res.status).toBe(200);
		expect(res.body.response).toBe("It fell on export curbs.");
		expect(geminiBodies).toHaveLength(3);
		expect(geminiBodies[2].toolConfig.functionCallingConfig.mode).toBe("NONE");
		expect(JSON.stringify(geminiBodies[1].contents)).toContain("That isn't a stock ticker");
		expect(stockLookups).toEqual(["AAPL"]);
	});

	it("every request in a round gets an answer: past eight, 'too many'; an unknown tool is named", async () => {
		geminiToolRounds = [[
			...["A1", "A2", "A3", "A4"].map(() => ({ name: "find_company", args: { name: "apple" } })),
			...["B1", "B2", "B3", "B4"].map(() => ({ name: "find_company", args: { name: "nvidia" } })),
			{ name: "get_stock", args: { ticker: "AAPL" } },
			{ name: "get_weather", args: {} },
		]];
		await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		const results = geminiBodies[1].contents.at(-1).parts.map((p: { functionResponse: { response: unknown } }) => JSON.stringify(p.functionResponse.response));
		expect(results).toHaveLength(10);
		expect(results[0]).toContain('"ticker":"AAPL"');
		expect(results[8]).toContain("Too many lookups");
		expect(results[9]).toContain("Too many lookups");
		// Eight calls used: the next request must answer.
		expect(geminiBodies[1].toolConfig.functionCallingConfig.mode).toBe("NONE");
		geminiToolRounds = [[{ name: "get_weather", args: {} }]];
		await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(JSON.stringify(geminiBodies.at(-1).contents)).toContain("No tool called get_weather");
	});

	it("a company already loaded isn't cited twice, and a ticker with no data isn't remembered", async () => {
		db.conversation = { id: CONV_1, uid: "u1", context: null, last_tickers: [] };
		// NVDA's news is loaded up front; the model asks for it again, and for a ticker that has no quote.
		geminiToolRounds = [[{ name: "get_news", args: { ticker: "NVDA" } }, { name: "get_stock", args: { ticker: "ZZNQ" } }]];
		const res = await request(await buildApp()).post("/chat").send({ message: "Why is Nvidia down?", conversationId: CONV_1 });
		expect(res.body.sources).toEqual([{ ticker: "NVDA", headline: "Chip stocks slide on export curbs", url: "https://news.test/a" }]);
		expect(calls(/UPDATE stak_ai_conversations SET updated_at/)[0]![1][1]).toEqual(["NVDA"]);
	});

	it("an answer covers at most four companies, the ones loaded up front included", async () => {
		geminiToolRounds = [[
			{ name: "get_stock", args: { ticker: "AAPL" } },
			{ name: "get_stock", args: { ticker: "MSFT" } },
			{ name: "get_stock", args: { ticker: "TSLA" } },
		]];
		await request(await buildApp()).post("/chat").send({ message: "Compare $ZZQX and $ZZNQ" });
		const results = JSON.stringify(geminiBodies[1].contents.at(-1).parts);
		expect(results).toContain("Too many companies for one answer");
		expect(stockLookups).toEqual(["ZZQX", "ZZNQ", "AAPL", "MSFT"]);
	});

	it("a misspelled company is looked up, and the stream keeps the connection alive while it is", async () => {
		geminiToolRounds = [[{ name: "find_company", args: { name: "apploving" } }]];
		const res = await request(await buildApp()).post("/chat/stream").send({ message: "how is apploving doing" });
		expect(JSON.stringify(geminiBodies[1].contents)).toContain('{"ticker":"APP","name":"AppLovin Corp"}');
		expect(res.text).toContain(": working\n\n");
		expect(events(res.text).at(-1)!.event).toBe("done");
	});

	it("streams the answer that follows a lookup", async () => {
		geminiToolRounds = [[{ name: "get_stock", args: { ticker: "TSLA" } }]];
		const res = await request(await buildApp()).post("/chat/stream").send({ message: "how's the car company doing?" });
		const evs = events(res.text);
		expect(evs.filter((e) => e.event === "delta").map((e) => e.data.text).join("").trim()).toBe("It fell on export curbs.");
		expect(evs.at(-1)!.event).toBe("done");
		expect(evs.at(-1)!.data.response).toBe("It fell on export curbs.");
	});

	it("an answer with a figure it wasn't given is rewritten once, and the check is logged", async () => {
		// The up-front data says down 3.20% at $100.00; "$87.50" came from nowhere.
		geminiTexts = ["NVIDIA closed at $87.50, down 3.20%.\n[[FOLLOWUPS]] Why? | What next?"];
		geminiReply = "NVIDIA closed at $100.00, down 3.20%.\n[[FOLLOWUPS]] Why? | What next?";
		const res = await request(await buildApp()).post("/chat").send({ message: "Why is Nvidia down?" });
		expect(res.body.response).toBe("NVIDIA closed at $100.00, down 3.20%.");
		expect(geminiBodies).toHaveLength(2);
		expect(JSON.stringify(geminiBodies[1].contents)).toContain("these figures in your answer aren't in the notes, your tools' results or the user's messages: $87.50");
		expect(JSON.parse(calls(/INSERT INTO events/)[0]![1][1]).figures).toEqual({ flagged: ["$87.50"], rewritten: true, unsupported: [] });
	});

	it("a rewrite that still has one is kept, and logged; a clean answer isn't checked twice", async () => {
		geminiTexts = ["Apple is up 12.5% this year."];
		geminiReply = "Apple is up 12.5% this year, still.";
		await request(await buildApp()).post("/chat").send({ message: "How is Apple doing?" });
		expect(geminiBodies).toHaveLength(2);
		expect(JSON.parse(calls(/INSERT INTO events/)[0]![1][1]).figures).toEqual({ flagged: ["12.5%"], rewritten: true, unsupported: ["12.5%"] });
		// Clean: one call, nothing logged.
		geminiBodies.length = 0;
		pgQueryMock.mockClear();
		geminiReply = "NVIDIA is down 3.20% today.";
		await request(await buildApp()).post("/chat").send({ message: "Why is Nvidia down?" });
		expect(geminiBodies).toHaveLength(1);
		expect(JSON.parse(calls(/INSERT INTO events/)[0]![1][1]).figures).toBeUndefined();
	});

	it("a rewrite that fails or is refused leaves the first answer standing", async () => {
		// The rewrite request gets a 500 on every key: the first answer, figure and all, is what's saved.
		geminiTexts = ["NVIDIA closed at $87.50, down 3.20%."];
		let fetches = 0;
		const okFetch = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).getMockImplementation()!;
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: { body?: string }) =>
			++fetches > 1 ? new Response("boom", { status: 500 }) : okFetch(url, init));
		const failed = await request(await buildApp()).post("/chat").send({ message: "Why is Nvidia down?" });
		expect(failed.status).toBe(200);
		expect(failed.body.response).toBe("NVIDIA closed at $87.50, down 3.20%.");
		expect(JSON.parse(calls(/INSERT INTO events/)[0]![1][1]).figures).toEqual({ flagged: ["$87.50"], rewritten: false, unsupported: ["$87.50"] });

		// A rewrite that comes back as a canned refusal: the first answer again, saved as an answer.
		stubFetch();
		pgQueryMock.mockClear();
		geminiTexts = ["NVIDIA closed at $87.50, down 3.20%."];
		geminiReply = "I'm sorry, I can't help with that.";
		const refused = await request(await buildApp()).post("/chat").send({ message: "Why is Nvidia down?" });
		expect(refused.body).toMatchObject({ response: "NVIDIA closed at $87.50, down 3.20%.", answerKind: "answer" });
	});

	it("a rewrite's apology line is dropped, and earlier answers don't vouch for a figure", async () => {
		geminiTexts = ["NVIDIA closed at $87.50."];
		geminiReply = "You're right, here's the corrected answer:\nNVIDIA closed at $100.00.";
		const res = await request(await buildApp()).post("/chat").send({ message: "Why is Nvidia down?" });
		expect(res.body.response).toBe("NVIDIA closed at $100.00.");

		// "$87.50" was said in an earlier answer: it still isn't in the data, so it's still flagged.
		const { assembleChat } = await import("../stakAi.js");
		const built = await assembleChat({
			question: "What's a P/E?", newContext: null, contextIsNew: false, context: null, lastTickers: [],
			history: [{ role: "user", content: "How is NVDA?" }, { role: "assistant", content: "NVIDIA closed at $87.50." }],
			familiarity: null, brandNames: [], topTags: [],
		});
		expect(built.evidence).toContain("How is NVDA?");
		expect(built.evidence).not.toContain("$87.50");
	});

	it("an answer that opens with an apology is still an answer; a canned refusal is a decline with no marker showing", async () => {
		geminiReply = "I apologize, but the data shows Apple is up 1.29% today.\n[[FOLLOWUPS]] What's a P/E? | How has Apple done this year?";
		const answered = await request(await buildApp()).post("/chat").send({ message: "You're wrong, Apple is up 50%" });
		expect(answered.body).toMatchObject({ answerKind: "answer", response: "I apologize, but the data shows Apple is up 1.29% today." });
		geminiReply = "I'm sorry, I can't help with that. [[CLARIFY]]";
		const refused = await request(await buildApp()).post("/chat").send({ message: "?" });
		expect(refused.body.answerKind).toBe("declined");
		expect(refused.body.response).not.toContain("[[");
	});

	it("a company with no quote is said to have none", async () => {
		await request(await buildApp()).post("/chat").send({ message: "Why did $ZZNQ jump?" });
		expect(promptText()).toContain("ZZNQ (ZZNQ): no live quote available right now");
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
		expect(system).toContain("Never state a current or recent price");
		expect(system).toContain("You can't browse the web or open pages");
		expect(system).toContain("Call tools silently");
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

	it("finds companies the way people type them: everyday names, lowercase tickers, split names", async () => {
		const { detectNamedTickers } = await import("../stakAi.js");
		expect(detectNamedTickers("Any meaningful update on Applovin")).toEqual(["APP"]);
		expect(detectNamedTickers("Why is app lovin down today")).toEqual(["APP"]);
		expect(detectNamedTickers("What is avgo pe ratio")).toEqual(["AVGO"]);
		expect(detectNamedTickers("Avgo")).toEqual(["AVGO"]);
		expect(detectNamedTickers("why did ARM move")).toEqual(["ARM"]);
		expect(detectNamedTickers("what's up with Sony")).toEqual(["SONY"]);
		// Words stay words.
		expect(detectNamedTickers("my arm hurts")).toEqual([]);
		expect(detectNamedTickers("is there an app for this? what about mrna vaccines or a usb stick")).toEqual([]);
		expect(detectNamedTickers("a lucid explanation of the riot")).toEqual([]);
		expect(detectNamedTickers("what is a trade war, and is southern california pricey")).toEqual([]);
		expect(detectNamedTickers("oh snap, is the fed an ally? Penn State grad here")).toEqual([]);
		// Acronym names in any case; curly apostrophes and names ending in punctuation.
		expect(detectNamedTickers("at&t news")).toEqual(["T"]);
		expect(detectNamedTickers("tsmc down?")).toEqual(["TSM"]);
		expect(detectNamedTickers("McDonald’s earnings")).toEqual(["MCD"]);
		expect(detectNamedTickers("Why did Delta miss earnings")).toEqual(["DAL"]);
	});

	it("a word-like ticker counts in plainly stock phrasing, and stays a word everywhere else", async () => {
		const { detectNamedTickers } = await import("../stakAi.js");
		const counts: [string, string][] = [
			["Why is app down", "APP"], ["App stock today?", "APP"], ["app's earnings", "APP"], ["how come app is falling", "APP"],
			["why did app drop", "APP"], ["why is coin up", "COIN"], ["hood shares", "HOOD"],
		];
		for (const [q, ticker] of counts) expect(detectNamedTickers(q), q).toEqual([ticker]);
		for (const q of [
			"the app is down", "is the app down?", "my app's price is wrong", "why is the app so slow", "is there an app for this",
			"why is app store down", "which app should I use", "why is it down", "why is now a good time", "is my net worth up",
			"why is net income down", "my jack is broken", "this app's stock page", "STAK app stock list",
			// From review: the everyday word in stock-ish sentences.
			"is app up to date", "why is app down for me", "why did app crash", "which app stock", "the new app stock",
			"best meme coin stocks", "crypto coin stocks", "what does net earnings mean", "net shares bought by insiders",
			"why is snow falling", "team stock", "shop stocks to buy", "why is path down", "was jack up all night",
		]) {
			expect(detectNamedTickers(q), q).toEqual([]);
		}
	});

	it("a one-letter slip in a long company name still finds it; everyday words don't", async () => {
		const { detectNamedTickers } = await import("../stakAi.js");
		expect(detectNamedTickers("Did unity and apploving have a court case")).toEqual(["APP"]);
		expect(detectNamedTickers("is robinhod down")).toEqual(["HOOD"]);
		expect(detectNamedTickers("Why had app lost 53% in a year")).toEqual(["APP"]);
		expect(detectNamedTickers("mcdonalds earnings")).toEqual(["MCD"]);
		for (const q of [
			"the fed interest rate", "investing basics", "semiconductor stocks", "earnings season", "a general question",
			"give me a synopsis of the news", "marvels movies", "goodman sachs", "why did app lose my streak",
			"why has app lost my progress", "why is app losing my xp",
		]) {
			expect(detectNamedTickers(q), q).toEqual([]);
		}
	});

	it("only words that could name a story count as topics", async () => {
		const { questionTopics } = await import("../stakAi.js");
		expect(questionTopics("I thought there was a Unity restraining order", "APP")).toEqual(["unity", "restraining", "order"]);
		expect(questionTopics("Why is AppLovin falling? Is it a good investment?", "APP")).toEqual([]);
	});

	it("headlines about what the question asks come first, then the newest, up to six", async () => {
		const { pickHeadlines } = await import("../stakAi.js");
		const a = (headline: string, summary = "") => ({ headline, summary, url: "", image: "", source: "", datetime: 0, category: "", id: 0, related: "" });
		const articles = [
			a("AppLovin e-commerce ad share rising"), a("Needham sees 70% upside"), a("Five AI stocks for 2030"), a("Analyst upgrade"),
			a("Trade Desk down 68%"), a("Q3 preview"), a("Court weighs Unity's restraining order", "A judge heard Unity's request against AppLovin."),
		];
		const picked = pickHeadlines(articles, "I thought there was a Unity restraining order", "APP").map((x) => x.headline);
		expect(picked[0]).toBe("Court weighs Unity's restraining order");
		expect(picked).toHaveLength(6);
		// The story it asks about can come from the past month; the rest stay this week's newest.
		const older = [a("AppLovin takes Unity to court over ad data"), articles[1]!];
		const withOlder = pickHeadlines(articles.slice(0, 6), "the unity court case?", "APP", older).map((x) => x.headline);
		expect(withOlder[0]).toBe("AppLovin takes Unity to court over ad data");
		expect(withOlder.filter((h) => h === "Needham sees 70% upside")).toHaveLength(1);
		// Nothing to match ("why is it down?"): just the newest six.
		expect(pickHeadlines(articles, "why is it down today?", "APP").map((x) => x.headline)).toEqual(articles.slice(0, 6).map((x) => x.headline));
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

	it("an account with its own limit gets that many, and is only stopped there", async () => {
		db.ownLimit = 50;
		db.used = 5;
		expect((await request(await buildApp()).get("/usage")).body).toMatchObject({ limit: 50, remaining: 45 });
		const res = await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(res.status).toBe(200);
		db.used = 50;
		const full = await request(await buildApp()).post("/chat").send({ message: "One more?" });
		expect(full.status).toBe(429);
		expect(full.body.error).toBe("You've used your 50 STAK AI questions for now.");
	});

	it("an account with no limit is never stopped, and says so", async () => {
		db.ownLimit = "none";
		db.used = 400;
		expect((await request(await buildApp()).get("/usage")).body).toEqual({ limit: 999, used: 400, remaining: 999, resetsAt: null, unlimited: true });
		const res = await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(res.status).toBe(200);
		expect(res.body.usage.unlimited).toBe(true);
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

/** Gemini's streamGenerateContent?alt=sse reply, split into the given text pieces; the last carries [finish]. */
function geminiSse(pieces: string[], finish: string | null = "STOP") {
	const body = pieces.map((t, i) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] }, ...(i === pieces.length - 1 && finish ? { finishReason: finish } : {}) }] })}\r\n\r\n`).join("");
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

describe("Gemini keys and incomplete answers", () => {
	it("a plain question falls back to the next key when the first fails", async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response("busy", { status: 429 }))
			.mockResolvedValueOnce(geminiSse(["Beta measures swings."]));
		vi.stubGlobal("fetch", fetchMock);
		const res = await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(res.status).toBe(200);
		expect(res.body.response).toBe("Beta measures swings.");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("once words are on screen, a failure isn't retried on another key (it would restart under them)", async () => {
		const fetchMock = vi.fn().mockResolvedValue(geminiSse(["Chips fell on ", "export"], null));
		vi.stubGlobal("fetch", fetchMock);
		const res = await request(await buildApp()).post("/chat/stream").send({ message: "Why is NVDA down?" });
		const evs = events(res.text);
		expect(evs.some((e) => e.event === "delta")).toBe(true);
		expect(evs.at(-1)).toMatchObject({ event: "error", data: { code: "ai_unavailable" } });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(calls(/^DELETE FROM stak_ai_usage/)).toHaveLength(1);
		expect(calls(/^\s*INSERT INTO stak_ai_messages/)).toHaveLength(0);
	});

	it("an answer cut off by a safety stop isn't saved as complete", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiSse(["Here's a partial"], "SAFETY")));
		const res = await request(await buildApp()).post("/chat").send({ message: "What is beta?" });
		expect(res.status).toBe(503);
		expect(calls(/^\s*INSERT INTO stak_ai_messages/)).toHaveLength(0);
	});

	it("a blocked prompt isn't retried on the other keys", async () => {
		const blocked = new Response(`data: ${JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })}\n\n`, { headers: { "Content-Type": "text/event-stream" } });
		const fetchMock = vi.fn().mockResolvedValue(blocked);
		vi.stubGlobal("fetch", fetchMock);
		const res = await request(await buildApp()).post("/chat").send({ message: "something" });
		expect(res.status).toBe(503);
		expect(fetchMock).toHaveBeenCalledTimes(1);
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

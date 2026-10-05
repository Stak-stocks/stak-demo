import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheGet = vi.fn();
const cacheSet = vi.fn();
const getCompanyNews = vi.fn();
vi.mock("../../lib/cache.js", () => ({ cacheGet, cacheSet }));
vi.mock("../../services/finnhubService.js", () => ({
	getMarketNews: vi.fn(),
	searchNewsArticles: vi.fn(),
	getCompanyNews,
	// Every story is about the company it was asked for.
	classifyArticle: () => "company",
}));
vi.mock("../../services/geminiService.js", () => ({
	simplifyArticles: async (articles: { headline: string }[], types: string[]) =>
		articles.map((a, i) => ({ headline: a.headline, url: `https://x.test/${a.headline}`, type: types[i], datetime: 1 })),
	classifyEarnings: async () => "none",
	filterMarketRelevant: async (a: unknown[]) => a,
}));

const story = (headline: string) => ({ headline, summary: "", url: `https://x.test/${headline}`, datetime: 1_700_000_000, source: "Test" });

async function buildApp() {
	vi.resetModules();
	const { newsRouter } = await import("../news.js");
	const app = express();
	app.use(express.json());
	app.use("/", newsRouter);
	return app;
}

beforeEach(() => {
	vi.clearAllMocks();
	cacheGet.mockResolvedValue(null);
});

describe("POST /for-you", () => {
	it("returns each saved company's stories in one request, catalogue tickers only", async () => {
		getCompanyNews.mockImplementation(async (t: string) => [story(`${t} news`)]);
		const res = await request(await buildApp()).post("/for-you").send({ tickers: ["nvda", "AAPL", "NOTREAL", "NVDA", 7] });
		expect(res.status).toBe(200);
		expect(res.body.results.map((r: { ticker: string }) => r.ticker)).toEqual(["NVDA", "AAPL"]);
		expect(res.body.results[0].articles[0].headline).toBe("NVDA news");
		expect(getCompanyNews).toHaveBeenCalledTimes(2);
	});

	it("serves cached companies from the cache, the same entries /company/:symbol uses", async () => {
		cacheGet.mockImplementation(async (key: string) => (key === "news:company:v3:AAPL" ? { articles: [{ headline: "cached" }], earningsSignal: { status: "none", date: null } } : null));
		getCompanyNews.mockResolvedValue([story("fresh")]);
		const res = await request(await buildApp()).post("/for-you").send({ tickers: ["AAPL", "MSFT"] });
		expect(res.body.results[0].articles[0].headline).toBe("cached");
		expect(getCompanyNews).toHaveBeenCalledTimes(1);
		expect(getCompanyNews).toHaveBeenCalledWith("MSFT", 24, undefined);
	});

	it("a company that fails comes back empty instead of failing the list", async () => {
		getCompanyNews.mockImplementation(async (t: string) => { if (t === "TSLA") throw new Error("down"); return [story(`${t} news`)]; });
		const res = await request(await buildApp()).post("/for-you").send({ tickers: ["TSLA", "AAPL"] });
		expect(res.status).toBe(200);
		expect(res.body.results).toEqual([
			{ ticker: "TSLA", articles: [] },
			{ ticker: "AAPL", articles: [expect.objectContaining({ headline: "AAPL news" })] },
		]);
	});

	it("caps the list at 10 companies and rejects a body without a tickers array", async () => {
		getCompanyNews.mockResolvedValue([]);
		const app = await buildApp();
		const many = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "NFLX", "AMD", "INTC", "KO", "PEP"];
		const res = await request(app).post("/for-you").send({ tickers: many });
		expect(res.body.results.length).toBeLessThanOrEqual(10);
		expect((await request(app).post("/for-you").send({})).status).toBe(400);
	});
});

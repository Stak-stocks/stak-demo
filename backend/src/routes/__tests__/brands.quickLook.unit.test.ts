import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
const newsMock = vi.fn();
vi.mock("../../lib/cache.js", () => ({
	cacheGet: cacheGetMock,
	cacheSet: cacheSetMock,
}));
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: vi.fn().mockResolvedValue({ rows: [] }),
	ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../services/finnhubService.js", () => ({
	getCompanyNews: newsMock,
}));
vi.mock("../../services/geminiService.js", () => ({
	AMERICAN_ENGLISH: { parts: [{ text: "American English" }] },
	getGeminiKeys: () => ["test-key"],
	GEMINI_MODEL: "test-model",
	geminiUrl: () => "https://gemini.test/generate",
	withGeminiConcurrencyLimit: (fn: () => unknown) => fn(),
}));

const HOUR = 60 * 60 * 1000;
const QUICK_LOOK = {
	in10Seconds: "Makes phones.", whyNow: "New launch.", setup: "Loyal buyers.", catch: "Pricey.", whatToWatch: "Earnings.", keyThemes: ["Industry leader"],
};
const geminiReply = (body: unknown) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }) });

async function buildApp() {
	vi.resetModules();
	const { brandsRouter } = await import("../brands.js");
	const app = express();
	app.use("/", brandsRouter);
	return app;
}

async function aaplId(app: express.Express): Promise<string> {
	const list = await request(app).get("/");
	return list.body.brands.find((b: { ticker: string }) => b.ticker === "AAPL").id;
}

describe("GET /:id/quick-look caching", () => {
	const fetchMock = vi.fn();
	beforeEach(() => {
		vi.clearAllMocks();
		cacheGetMock.mockResolvedValue(null);
		newsMock.mockResolvedValue([]);
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(() => { vi.unstubAllGlobals(); });

	it("keeps a generated Quick Look for 24 hours", async () => {
		fetchMock.mockResolvedValue(geminiReply(QUICK_LOOK));
		const app = await buildApp();
		const id = await aaplId(app);

		const res = await request(app).get(`/${id}/quick-look`);

		expect(res.body.quickLook).toMatchObject({ whyNow: "New launch." });
		expect(cacheSetMock).toHaveBeenCalledWith(`brand:v1:${id}:quick-look`, { quickLook: res.body.quickLook }, 24 * HOUR);
	});

	it("remembers a failed generation for 30 minutes", async () => {
		fetchMock.mockResolvedValue(geminiReply({ in10Seconds: "only one field" }));
		const app = await buildApp();
		const id = await aaplId(app);

		const res = await request(app).get(`/${id}/quick-look`);

		expect(res.body).toEqual({ quickLook: null });
		expect(cacheSetMock).toHaveBeenCalledWith(`brand:v1:${id}:quick-look`, { quickLook: null }, HOUR / 2);
	});

	it("serves a remembered failure without the news fetch or Gemini", async () => {
		const app = await buildApp();
		const id = await aaplId(app);
		cacheGetMock.mockResolvedValue({ quickLook: null });

		const res = await request(app).get(`/${id}/quick-look`);

		expect(res.body).toEqual({ quickLook: null });
		expect(newsMock).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

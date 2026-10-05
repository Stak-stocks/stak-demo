import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
vi.mock("../../lib/cache.js", () => ({
	cacheGet: cacheGetMock,
	cacheSet: cacheSetMock,
}));
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: vi.fn().mockResolvedValue({ rows: [] }),
	ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../services/geminiService.js", () => ({
	AMERICAN_ENGLISH: { parts: [{ text: "American English" }] },
	getGeminiKeys: () => ["test-key"],
	GEMINI_MODEL: "test-model",
	geminiUrl: () => "https://gemini.test/generate",
	withGeminiConcurrencyLimit: (fn: () => unknown) => fn(),
}));

const DAY = 24 * 60 * 60 * 1000;

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

const geminiReply = (text: string) => ({ json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });

describe("GET /:id/tip caching", () => {
	const fetchMock = vi.fn();
	beforeEach(() => {
		vi.clearAllMocks();
		cacheGetMock.mockResolvedValue(null);
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(() => { vi.unstubAllGlobals(); });

	it("keeps a generated tip for 30 days", async () => {
		fetchMock.mockResolvedValue(geminiReply("Chip stocks swing hard. Small stakes, long views."));
		const app = await buildApp();
		const id = await aaplId(app);

		const res = await request(app).get(`/${id}/tip`);

		expect(res.body.tip).toBe("Chip stocks swing hard. Small stakes, long views.");
		expect(cacheSetMock).toHaveBeenCalledWith(`brand:v2:${id}:tip`, { tip: res.body.tip }, 30 * DAY);
	});

	it("people opening the same cold card together share one generation, written in American English", async () => {
		let release!: () => void;
		fetchMock.mockImplementation(() => new Promise((resolve) => { release = () => resolve(geminiReply("Chip stocks swing hard. Small stakes, long views.")); }));
		const app = await buildApp();
		const id = await aaplId(app);

		const all = Promise.all([1, 2, 3].map(() => request(app).get(`/${id}/tip`).then((r) => r.body.tip)));
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
		release();

		expect(await all).toEqual(Array(3).fill("Chip stocks swing hard. Small stakes, long views."));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(JSON.parse(fetchMock.mock.calls[0]![1].body).system_instruction).toEqual({ parts: [{ text: "American English" }] });
	});

	it("remembers an empty or failed generation for 5 minutes so it isn't retried on every view", async () => {
		const app = await buildApp();
		const id = await aaplId(app);

		fetchMock.mockResolvedValueOnce(geminiReply(""));
		await request(app).get(`/${id}/tip`);
		fetchMock.mockRejectedValueOnce(new Error("Gemini down"));
		const failed = await request(app).get(`/${id}/tip`);

		expect(failed.body).toEqual({ tip: "" });
		expect(cacheSetMock).toHaveBeenNthCalledWith(1, `brand:v2:${id}:tip`, { tip: "" }, 5 * 60 * 1000);
		expect(cacheSetMock).toHaveBeenNthCalledWith(2, `brand:v2:${id}:tip`, { tip: "" }, 5 * 60 * 1000);
	});

	it("serves a cached entry - including a remembered failure - without calling Gemini", async () => {
		const app = await buildApp();
		const id = await aaplId(app);
		cacheGetMock.mockResolvedValue({ tip: "" });

		const res = await request(app).get(`/${id}/tip`);

		expect(res.body).toEqual({ tip: "" });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

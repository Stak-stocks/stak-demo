import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["FINNHUB_API_KEY", "FINNHUB_API_KEY_2", "FINNHUB_API_KEY_3", "REDIS_URL"] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

async function load() {
	vi.resetModules();
	process.env.FINNHUB_API_KEY = "k1";
	delete process.env.FINNHUB_API_KEY_2;
	delete process.env.FINNHUB_API_KEY_3;
	delete process.env.REDIS_URL;
	return import("../stock.js");
}

async function buildApp() {
	const { stockRouter } = await load();
	const app = express();
	app.use("/", stockRouter);
	return app;
}

const symbolOf = (url: string) => new URL(url).searchParams.get("symbol");
/** A Finnhub quote whose last trade is now (today's move), or `daysAgo` days back. */
const quote = (c: number, daysAgo = 0) => ({
	ok: true,
	status: 200,
	json: async () => ({ c, d: 1, dp: 0.5, t: Math.floor((Date.now() - daysAgo * 86_400_000) / 1000) }),
});

describe("batch quotes and getQuote", () => {
	const originalFetch = global.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.useRealTimers();
		vi.doUnmock("@stak/shared");
		for (const k of ENV_KEYS) {
			if (savedEnv[k] === undefined) delete process.env[k];
			else process.env[k] = savedEnv[k];
		}
	});

	it("keeps the other prices when one symbol's lookup fails (2026-11-11: one timeout lost all 27)", async () => {
		fetchMock.mockImplementation(async (url: string) => {
			if (symbolOf(url) === "NKE") throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
			return quote(symbolOf(url) === "EL" ? 112.49 : 107.01);
		});
		const app = await buildApp();
		const res = await request(app).get("/batch-quotes?tickers=EL,NKE,LULU");
		expect(res.status).toBe(200);
		expect(Object.keys(res.body.quotes).sort()).toEqual(["EL", "LULU"]);
		expect(res.body.quotes.EL.price).toBe(112.49);
	});

	it("waits for Finnhub no longer than it's told, then answers without it", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		fetchMock.mockImplementation(() => new Promise(() => {}));
		const { getQuote } = await load();
		const pending = getQuote("NKE", 6000);
		await vi.advanceTimersByTimeAsync(6000);
		await expect(pending).resolves.toBeNull();
	});

	const marketIs = (bucket: string) =>
		vi.doMock("@stak/shared", async (orig) => ({ ...(await orig<typeof import("@stak/shared")>()), marketSessionBucket: () => bucket }));

	it("while open, serves a price under 90s old at once and refreshes it behind", async () => {
		marketIs("open");
		const { getQuote } = await load();
		fetchMock.mockImplementation(async () => quote(38.17));
		expect((await getQuote("NKE"))?.c).toBe(38.17);
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 60_000);
		fetchMock.mockImplementation(() => new Promise(() => {}));
		expect((await getQuote("NKE", 6000))?.c).toBe(38.17);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("while open, waits for Finnhub once a price is past 90s, and stands in with today's for an outage", async () => {
		marketIs("open");
		const { getQuote } = await load();
		fetchMock.mockImplementation(async () => quote(38.17));
		await getQuote("NKE");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 5 * 60_000);
		fetchMock.mockImplementation(async () => { throw new TypeError("fetch failed"); });
		expect((await getQuote("NKE"))?.c).toBe(38.17);
		// Past the outage window (30 min): nothing rather than a price that old.
		vi.setSystemTime(Date.now() + 40 * 60_000);
		expect(await getQuote("NKE")).toBeNull();
	});

	it("while closed, serves the last price at any age (it can't have moved)", async () => {
		marketIs("closed");
		const { getQuote } = await load();
		fetchMock.mockImplementation(async () => quote(38.17, 1));
		await getQuote("NKE");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 2 * 86_400_000);
		fetchMock.mockImplementation(() => new Promise(() => {}));
		expect((await getQuote("NKE"))?.c).toBe(38.17);
	});

	it("caps a served price's age when asked (push alerts)", async () => {
		marketIs("open");
		const { getQuote } = await load();
		fetchMock.mockImplementation(async () => quote(38.17));
		await getQuote("NKE");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 70_000);
		fetchMock.mockImplementation(async () => quote(40));
		expect((await getQuote("NKE", 6000, { maxStaleMs: 60_000 }))?.c).toBe(40);
	});

	it("never serves an earlier day's quote as today's while the market is open", async () => {
		marketIs("open");
		const { getQuote } = await load();
		// Kept from yesterday's session; today Finnhub can't be reached.
		fetchMock.mockImplementation(async () => quote(38.17, 1));
		await getQuote("NKE");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 30_000);
		fetchMock.mockImplementation(async () => { throw new TypeError("fetch failed"); });
		expect(await getQuote("NKE")).toBeNull();
	});

	it("doesn't keep a zero price (an unknown symbol)", async () => {
		fetchMock.mockImplementation(async () => quote(0));
		const { getQuote } = await load();
		expect(await getQuote("ZZZZ")).toBeNull();
		fetchMock.mockImplementation(async () => { throw new TypeError("fetch failed"); });
		expect(await getQuote("ZZZZ")).toBeNull();
	});
});

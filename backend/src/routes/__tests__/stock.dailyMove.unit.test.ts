import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function buildApp() {
	vi.resetModules();
	const { stockRouter } = await import("../stock.js");
	const app = express();
	app.use(express.json());
	app.use("/", stockRouter);
	return app;
}

function geminiBulletsResponse(bullets: Array<{ text: string; tone: string }>) {
	return {
		ok: true,
		status: 200,
		json: async () => ({
			candidates: [{ content: { parts: [{ text: JSON.stringify(bullets) }] } }],
		}),
	};
}

describe("GET /:symbol/daily-move", () => {
	const originalFetch = global.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.GEMINI_API_KEY = "test-key";
		fetchMock = vi.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it("coalesces two concurrent requests for the same cold cache key into a single Gemini call", async () => {
		const bullets = [
			{ text: "Test bullet one", tone: "bullish" },
			{ text: "Test bullet two", tone: "neutral" },
			{ text: "Test bullet three", tone: "bearish" },
		];
		const control: { resolveFetch: (() => void) | null } = { resolveFetch: null };
		let resolveFetchStarted: (() => void) | null = null;
		const fetchStarted = new Promise<void>((r) => { resolveFetchStarted = r; });
		fetchMock.mockImplementation(() => {
			resolveFetchStarted?.();
			return new Promise((resolve) => { control.resolveFetch = () => resolve(geminiBulletsResponse(bullets)); });
		});

		const app = await buildApp();
		const server = app.listen(0);
		const url = "/AAPL/daily-move?pct=2.5&name=Apple&sentences=3";

		const req1 = request(server).get(url);
		const req2 = request(server).get(url);
		// supertest's Test object doesn't actually dispatch its request until first
		// awaited/`.then()`'d -- force both to fire now instead of lazily on the
		// `Promise.all` below, which would have started them sequentially-in-effect and
		// defeated the point of this test.
		const p1 = req1.then((r) => r);
		const p2 = req2.then((r) => r);

		// Wait for the first (and, if coalescing is broken, only the first of two) fetch
		// call to actually start, then give the second request a window to reach the
		// in-flight check before the single outstanding fetch resolves -- this is what
		// proves they shared one Gemini call instead of each independently triggering
		// their own.
		await fetchStarted;
		await new Promise((r) => setTimeout(r, 50));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		control.resolveFetch?.();

		const [res1, res2] = await Promise.all([p1, p2]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(res1.status).toBe(200);
		expect(res2.status).toBe(200);
		expect(res1.body.bullets).toHaveLength(3);
		expect(res2.body).toEqual(res1.body);
		server.close();
	});

	it("makes a fresh Gemini call for a second request once the first has already completed", async () => {
		fetchMock.mockImplementation(async () => geminiBulletsResponse([
			{ text: "First call bullet", tone: "neutral" },
		]));

		const app = await buildApp();
		// A different ticker each call avoids hitting the (now-warm) cache entry from the
		// first request -- this test is about the in-flight map being cleaned up after
		// completion, not about cache TTLs.
		await request(app).get("/AAPL/daily-move?pct=2.5&name=Apple&sentences=3");
		await request(app).get("/MSFT/daily-move?pct=2.5&name=Microsoft&sentences=3");

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

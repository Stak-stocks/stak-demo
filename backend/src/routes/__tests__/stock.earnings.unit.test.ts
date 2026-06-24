import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConsensusEarningsDateMock = vi.fn();
const getConsensusEarningsResultMock = vi.fn();
const getEarningsBeatMissFromWebMock = vi.fn();

vi.mock("../../services/earningsConsensus.js", () => ({
	getConsensusEarningsDate: getConsensusEarningsDateMock,
}));

vi.mock("../../services/earningsResultConsensus.js", () => ({
	getConsensusEarningsResult: getConsensusEarningsResultMock,
}));

vi.mock("../../services/geminiService.js", () => ({
	getEarningsBeatMissFromWeb: getEarningsBeatMissFromWebMock,
	getGeminiKeys: vi.fn(() => []),
}));

async function buildApp() {
	vi.resetModules();
	const { stockRouter } = await import("../stock.js");
	const app = express();
	app.use(express.json());
	app.use("/", stockRouter);
	return app;
}

/** A Finnhub /calendar/earnings response containing a single entry for `symbol`. */
function calendarResponse(symbol: string, date: string, hour = "amc") {
	return { earningsCalendar: [{ symbol, date, hour, epsActual: null, epsEstimate: null, revenueActual: null, revenueEstimate: null }] };
}

/** A Finnhub /stock/earnings response — `actual: null` means not yet reported. */
function epsHistoryResponse(actual: number | null, estimate: number | null) {
	return [{ actual, estimate, period: "2026-05-31", quarter: 3, year: 2026, surprise: null, surprisePercent: null }];
}

describe("GET /:symbol/earnings", () => {
	const originalFetch = global.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.FINNHUB_API_KEY = "test-key";
		fetchMock = vi.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
		getConsensusEarningsDateMock.mockResolvedValue({ date: null, sources: {}, confidence: "low" });
		getConsensusEarningsResultMock.mockResolvedValue({
			status: "none", epsActual: null, epsEstimate: null, epsSurprisePct: null,
			revenueActual: null, revenueEstimate: null, revChangePct: null, confidence: "low",
			sources: { finnhub: null, fmp: null, yahoo: null, gemini: null },
		});
		getEarningsBeatMissFromWebMock.mockResolvedValue({ result: "none", date: null });
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.useRealTimers();
	});

	// Fixed "today" for every test so calendar dates are deterministic. Each test uses
	// its own ticker (cache is a shared in-process map) to avoid cross-test collisions.
	const TODAY = "2026-06-24";

	function mockFetchSequence(...responses: unknown[]) {
		let call = 0;
		fetchMock.mockImplementation(async () => {
			const body = responses[call] ?? null;
			call++;
			return { ok: true, status: 200, json: async () => body };
		});
	}

	it("reports earnings scheduled for today as still upcoming when Finnhub has no actual data yet", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST1";
		// 1st fetch: EPS history (not yet reported), 2nd fetch: calendar (today)
		mockFetchSequence(epsHistoryResponse(null, 1.5), calendarResponse(symbol, TODAY));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "upcoming", date: TODAY, hour: "amc" });
		// Must not have asked Gemini at all — this is exactly the bug: falling through
		// to the unreliable web-search fallback for a same-day, not-yet-reported ticker.
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("reports earnings scheduled for today as still upcoming for an established reporter whose latest Finnhub entry is last quarter's (non-null) data", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST1B";
		// This reproduces the live MU bug: Finnhub's "latest" EPS entry is never null for an
		// established reporter -- it's always last quarter's real result until the new one
		// posts. A stale period (~120 days old) must not be mistaken for today's report.
		const staleEpsHistory = [{ actual: 2.1, estimate: 2.0, period: "2026-02-28", quarter: 2, year: 2026, surprise: null, surprisePercent: null }];
		mockFetchSequence(staleEpsHistory, calendarResponse(symbol, TODAY));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "upcoming", date: TODAY, hour: "amc" });
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("reports earnings scheduled for today as still upcoming when the latest Finnhub entry is exactly one normal inter-quarter gap old (~85 days)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST1C";
		// This is the exact live MU bug, reproduced precisely: last quarter's period is
		// ~85 days old -- the *normal* ~91-day gap between quarters, not staleness. A
		// threshold wide enough to reject genuinely old data (BUGTEST1B's ~120 days) was
		// still loose enough to accept this as "recent", wrongly treating it as confirmation
		// that today's report had already landed. Finnhub's calendar also has a real gap
		// here -- it skips straight to next quarter (Sept) -- so this also exercises the
		// 4-source date consensus correctly overriding Finnhub's wrong/missing date.
		const lastQuarterEpsHistory = [{ actual: 12.2, estimate: 9.58, period: "2026-03-31", quarter: 2, year: 2026, surprise: 2.62, surprisePercent: 27.28 }];
		mockFetchSequence(lastQuarterEpsHistory, { earningsCalendar: [{ symbol, date: "2026-09-21", hour: "amc", epsActual: null, epsEstimate: 25.27, revenueActual: null, revenueEstimate: 42863476069 }] });
		getConsensusEarningsDateMock.mockResolvedValue({
			date: TODAY,
			sources: { finnhub: "2026-09-21", yahoo: TODAY, fmp: "2026-06-30", gemini: TODAY },
			confidence: "medium",
		});

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "upcoming", date: TODAY, hour: "amc" });
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("reports beat/miss directly from Finnhub once today's report actually lands", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T22:00:00.000Z`));
		const symbol = "BUGTEST2";
		mockFetchSequence(epsHistoryResponse(2.5, 2.0), calendarResponse(symbol, TODAY));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "beat", date: TODAY });
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("reports miss directly from Finnhub when actual is below estimate", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T22:00:00.000Z`));
		const symbol = "BUGTEST3";
		mockFetchSequence(epsHistoryResponse(1.0, 2.0), calendarResponse(symbol, TODAY));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "miss", date: TODAY });
	});

	it("reports a clearly future calendar date as upcoming (unaffected regression check)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST4";
		const futureDate = "2026-07-30";
		mockFetchSequence(epsHistoryResponse(null, null), calendarResponse(symbol, futureDate, "bmo"));
		getConsensusEarningsDateMock.mockResolvedValue({ date: futureDate, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "upcoming", date: futureDate, hour: "bmo" });
	});

	it("uses Finnhub's own actual-vs-estimate when no calendar entry exists but a report was already filed", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST5";
		// 1st fetch: EPS history (already reported), 2nd fetch: calendar (no entry for this symbol)
		mockFetchSequence(epsHistoryResponse(3.0, 2.5), { earningsCalendar: [] });
		getConsensusEarningsDateMock.mockResolvedValue({ date: null, sources: {}, confidence: "low" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body.status).toBe("beat");
		// Direct Finnhub data settles it — the unreliable web search is never consulted.
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("rejects an implausibly stale date from the Gemini fallback instead of presenting it as current", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST6";
		// No calendar entry, no Finnhub EPS data at all (uncovered ticker)
		mockFetchSequence(null, { earningsCalendar: [] });
		getConsensusEarningsDateMock.mockResolvedValue({ date: null, sources: {}, confidence: "low" });
		// Reproduces the real MU bug: Gemini "finds" a report from ~2 years ago
		getEarningsBeatMissFromWebMock.mockResolvedValue({ result: "beat", date: "2024-06-26" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "none", date: null });
	});

	it("still trusts the Gemini fallback when its date is plausibly recent", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST7";
		mockFetchSequence(null, { earningsCalendar: [] });
		getConsensusEarningsDateMock.mockResolvedValue({ date: null, sources: {}, confidence: "low" });
		const recentDate = "2026-05-20"; // ~35 days before TODAY — within the plausible window
		getEarningsBeatMissFromWebMock.mockResolvedValue({ result: "beat", date: recentDate });
		getConsensusEarningsResultMock.mockResolvedValue({
			status: "beat", epsActual: null, epsEstimate: null, epsSurprisePct: null,
			revenueActual: null, revenueEstimate: null, revChangePct: null, confidence: "medium",
			sources: { finnhub: null, fmp: null, yahoo: null, gemini: "beat" },
		});

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "beat", date: recentDate });
	});
});

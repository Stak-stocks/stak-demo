import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConsensusEarningsDateMock = vi.fn();
const getConsensusEarningsResultMock = vi.fn();
const getEarningsBeatMissFromWebMock = vi.fn();
const hasSameDayEarningsArticleMock = vi.fn();

vi.mock("../../services/earningsConsensus.js", () => ({
	getConsensusEarningsDate: getConsensusEarningsDateMock,
}));

vi.mock("../../services/earningsResultConsensus.js", () => ({
	getConsensusEarningsResult: getConsensusEarningsResultMock,
	hasSameDayEarningsArticle: hasSameDayEarningsArticleMock,
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

describe("GET /market-earnings", () => {
	const originalFetch = global.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;
	const TODAY = "2026-06-24";

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
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
		hasSameDayEarningsArticleMock.mockResolvedValue(false);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.useRealTimers();
	});

	function mockFetchSequence(...responses: unknown[]) {
		let call = 0;
		fetchMock.mockImplementation(async () => {
			const body = responses[call] ?? null;
			call++;
			return { ok: true, status: 200, json: async () => body };
		});
	}

	it("tracks a ticker outside the old hardcoded ~80-ticker list now that MARKET_TICKERS derives from the full shared brand catalog", async () => {
		// ELF (e.l.f. Beauty) was never in the old hand-maintained MARKET_TICKERS map,
		// but it is a real brand in the shared catalog -- confirms the bulk calendar now
		// tracks everything in @stak/shared, not just the old curated ~80.
		const futureDate = "2026-07-30";
		mockFetchSequence({
			earningsCalendar: [{ symbol: "ELF", date: futureDate, hour: "amc", epsActual: null, epsEstimate: 0.5, revenueActual: null, revenueEstimate: null }],
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual([
			expect.objectContaining({ symbol: "ELF", date: futureDate, status: "upcoming" }),
		]);
	});

	it("reports a clearly future calendar entry as upcoming without calling the resolver's consensus/Gemini checks", async () => {
		const futureDate = "2026-07-30";
		// Only 1 fetch expected: the shared calendar lookup. No EPS-history fetch since the
		// fast path for future dates skips resolveEarningsStatus entirely.
		mockFetchSequence({
			earningsCalendar: [{ symbol: "AAPL", date: futureDate, hour: "amc", epsActual: null, epsEstimate: 1.5, revenueActual: null, revenueEstimate: null }],
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual([
			expect.objectContaining({ symbol: "AAPL", date: futureDate, status: "upcoming" }),
		]);
		expect(getConsensusEarningsDateMock).not.toHaveBeenCalled();
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("does not show a wrong beat/miss for a ticker whose Finnhub calendar entry is today but whose EPS history is just last quarter's stale data (live MU bug)", async () => {
		// Finnhub's calendar entry says "today" but its own EPS history hasn't caught up --
		// same shape as the live MU bug. 1st fetch: calendar (today entry), 2nd fetch:
		// EPS-history (stale, ~85 days old, inside resolveEarningsStatus).
		mockFetchSequence(
			{ earningsCalendar: [{ symbol: "MU", date: TODAY, hour: "amc", epsActual: null, epsEstimate: 25.27, revenueActual: null, revenueEstimate: null }] },
			[{ actual: 12.2, estimate: 9.58, period: "2026-03-31", quarter: 2, year: 2026, surprise: 2.62, surprisePercent: 27.28 }],
		);
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=MU");

		expect(res.status).toBe(200);
		const mu = res.body.entries.find((e: { symbol: string }) => e.symbol === "MU");
		expect(mu).toEqual(expect.objectContaining({ symbol: "MU", status: "upcoming", date: TODAY }));
	});

	it("omits a Stak ticker entirely (rather than showing a wrong Missed) when Finnhub's calendar has no entry at all and EPS history is just last quarter's stale data", async () => {
		// This is the exact scenario from the live bug report: Finnhub's calendar has NO
		// entry for MU at all (not even a wrong one) -- it only shows up via the
		// "missing Stak tickers" fallback, which must defer to the same shared resolver
		// instead of trusting Gemini's narrative on its own.
		mockFetchSequence(
			{ earningsCalendar: [] }, // shared calendar lookup finds nothing for MU
			[{ actual: 12.2, estimate: 9.58, period: "2026-03-31", quarter: 2, year: 2026, surprise: 2.62, surprisePercent: 27.28 }], // EPS history inside resolveEarningsStatus
		);
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: { yahoo: TODAY, gemini: TODAY }, confidence: "medium" });
		// Even if Gemini's narrative claims a miss, it must never be reached -- the
		// consensus date check (step 2) resolves "upcoming" first.
		getEarningsBeatMissFromWebMock.mockResolvedValue({ result: "miss", date: TODAY });

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=MU");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "MU")).toBeUndefined();
	});

	it("does not surface a Stak ticker on the 'today' tab when it has no calendar entry but DOES have a fresh EPS report from days earlier (live COST/LULU/MU/WMT bug)", async () => {
		// Real incident: Finnhub's calendar has no entry for the ticker in the queried window
		// at all, but its EPS history shows a report from a few days ago (within the 60-day
		// freshness window) -- old code fell back to `reportDateAnchor = calendarEntry?.date ??
		// todayStr`, fabricating "today" as the report date with zero evidence it happened
		// today. That made every Stak ticker with any recent report falsely show up in the
		// "Today" tab. The fix anchors the date to confirmedEps.period (fiscal quarter end,
		// always before the real announcement date) instead, so the date-range filter below
		// correctly excludes it from "today".
		mockFetchSequence(
			{ earningsCalendar: [] }, // shared calendar lookup finds nothing for MU
			[{ actual: 12.2, estimate: 9.58, period: "2026-06-15", quarter: 2, year: 2026, surprise: 2.62, surprisePercent: 27.28 }], // recent EPS history inside resolveEarningsStatus
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=MU");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "MU")).toBeUndefined();
	});

	it("keeps a confirmed beat/miss for a past calendar entry instead of letting a stale 'upcoming' consensus date override it (live MU bug)", async () => {
		// Real incident: Finnhub's calendar entry for MU already had actual EPS for the report
		// that posted this week, but the 4-source consensus (Yahoo/FMP/Gemini) still voted for a
		// later placeholder date that hadn't reported yet -- which used to win outright, making
		// MU vanish from "earnings this week" despite having already reported a beat.
		const reportDate = "2026-06-22"; // within this week's Sun-Sat window, before TODAY
		mockFetchSequence(
			{
				earningsCalendar: [{
					symbol: "MU", date: reportDate, hour: "amc",
					epsActual: 25.11, epsEstimate: 21.4, revenueActual: 41456000000, revenueEstimate: 36923508824,
				}],
			},
			[{ actual: 12.2, estimate: 9.58, period: "2026-03-31", quarter: 2, year: 2026, surprise: 2.62, surprisePercent: 27.28 }], // stale latestEps, irrelevant once calendarEntry.epsActual is present
		);
		// Wrong/stale majority vote: still claims MU hasn't reported yet
		getConsensusEarningsDateMock.mockResolvedValue({ date: "2026-06-30", sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=MU");

		expect(res.status).toBe(200);
		const mu = res.body.entries.find((e: { symbol: string }) => e.symbol === "MU");
		expect(mu).toEqual(expect.objectContaining({ symbol: "MU", status: "beat", date: reportDate }));
		// Ground truth (calendar entry already has actual EPS) must short-circuit before any
		// "when's the next report" lookup even runs.
		expect(getConsensusEarningsDateMock).not.toHaveBeenCalled();
	});
});

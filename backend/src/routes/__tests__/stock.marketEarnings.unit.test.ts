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
		process.env.FMP_API_KEY = "test-fmp-key";
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
			{ earningsCalendar: [] }, // 90-day lookback also finds nothing
			[], // FMP 30-day calendar also finds nothing
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
		// Real incident: Finnhub's calendar has no entry for MU in the queried window or the
		// 90-day lookback, but its EPS history shows a report whose period falls on a date that
		// is NOT today (so it's correctly omitted from the Today tab by the date-range filter).
		mockFetchSequence(
			{ earningsCalendar: [] }, // today's calendar lookup finds nothing for MU
			{ earningsCalendar: [] }, // 90-day lookback also finds nothing
			[], // FMP 30-day calendar also finds nothing
			[{ actual: 12.2, estimate: 9.58, period: "2026-06-15", quarter: 2, year: 2026, surprise: 2.62, surprisePercent: 27.28 }], // EPS history inside resolveEarningsStatus
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=MU");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "MU")).toBeUndefined();
	});

	it("does not surface a Stak ticker on the 'today' tab when its EPS period equals today (Finnhub quirk on fiscal quarter-end boundaries)", async () => {
		// Real incident: todayStr === "2026-06-30" (a calendar quarter-end). Finnhub returned
		// period === "2026-06-30" (= today) with actual already populated for COST/WMT/NVDA --
		// impossible for real data (companies need weeks post-quarter-end to file actual results),
		// but happens in Finnhub's data on quarter boundaries. The fix treats period === todayStr
		// as untrustworthy and returns date: null, so callers exclude it from all time-windowed tabs.
		mockFetchSequence(
			{ earningsCalendar: [] }, // today's calendar
			{ earningsCalendar: [] }, // 90-day lookback
			[], // FMP 30-day calendar also finds nothing
			[{ actual: 4.93, estimate: 5.03, period: TODAY, quarter: 3, year: 2026, surprise: -0.1, surprisePercent: -1.99 }],
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=COST");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "COST")).toBeUndefined();
	});

	it("correctly surfaces a Stak ticker with a real past calendar entry found via 90-day lookback (live MU/LULU fix)", async () => {
		// Real incident: MU's actual calendar entry (date: "2026-06-24", epsActual populated)
		// was outside the "today" query window but findable by looking back 90 days.
		// The fix: one extra calendar call covers the lookback window so resolveEarningsStatus
		// gets the real confirmed calendarEntry, anchoring the date correctly.
		const realDate = "2026-06-22"; // within this week's window, before TODAY
		mockFetchSequence(
			{ earningsCalendar: [] }, // today's calendar has nothing
			{ earningsCalendar: [{ symbol: "MU", date: realDate, hour: "amc", epsActual: 25.11, epsEstimate: 21.40, revenueActual: 41456000000, revenueEstimate: 36923508824 }] }, // lookback finds it
			[], // FMP 30-day calendar has nothing (Finnhub already provided the entry)
			[{ actual: 25.11, estimate: 21.40, period: TODAY, quarter: 3, year: 2026, surprise: 3.71, surprisePercent: 17.33 }],
		);
		getConsensusEarningsResultMock.mockResolvedValue({
			status: "beat", epsActual: 25.11, epsEstimate: 21.40, epsSurprisePct: 17.33,
			revenueActual: 41456000000, revenueEstimate: 36923508824, revChangePct: 12.5,
			confidence: "high", sources: { finnhub: "beat", fmp: "beat", yahoo: "beat", gemini: null },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=MU");

		expect(res.status).toBe(200);
		const mu = res.body.entries.find((e: { symbol: string }) => e.symbol === "MU");
		expect(mu).toEqual(expect.objectContaining({ symbol: "MU", status: "beat", date: realDate }));
	});

	it("surfaces a Stak ticker as beat when FMP income-statement has EPS actuals before Finnhub's calendar or EPS-history catches up (live NKE scenario)", async () => {
		// Real scenario: NKE reports after close on 2026-06-30 (= TODAY). Finnhub's
		// /stock/earnings still shows last quarter (period="2026-03-31", 91 days old, stale).
		// Finnhub's calendar has no confirmed entry for NKE. FMP's earnings-calendar has the
		// correct date (TODAY) but epsActual: null. FMP's income-statement, however, already
		// has eps: 0.72 (filingDate = TODAY) within minutes of the SEC filing.
		// The fix: fill calendarEntry.epsActual from income-statement → resolveEarningsStatus
		// sees alreadyReported=true with epsActual=0.72, epsEstimate=0.11 → returns beat.
		mockFetchSequence(
			{ earningsCalendar: [] }, // Finnhub main calendar: no NKE entry
			{ earningsCalendar: [] }, // Finnhub 90-day lookback: nothing
			[{ symbol: "NKE", date: TODAY, epsActual: null, epsEstimated: 0.11, revenueActual: 10972000000, revenueEstimated: 10849540000 }], // FMP calendar: correct date, no EPS yet
			{}, // EDGAR CIK map: NKE not found → EDGAR returns null, falls through to FMP
			[{ eps: 0.72, filingDate: TODAY }], // FMP income-statement: has EPS already
			[{ actual: null, estimate: 0.11, period: "2026-03-31", quarter: 3, year: 2026, surprise: null, surprisePercent: null }], // Finnhub EPS history: stale
		);
		getConsensusEarningsResultMock.mockResolvedValue({
			status: "beat", epsActual: 0.72, epsEstimate: 0.11, epsSurprisePct: 554.5,
			revenueActual: 10972000000, revenueEstimate: 10849540000, revChangePct: 1.13,
			confidence: "high", sources: { finnhub: "beat", fmp: "beat", yahoo: null, gemini: null },
		});

		const app = await buildApp();
		const res = await request(app).get(`/market-earnings?period=today&tickers=NKE`);

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "beat", date: TODAY }));
	});

	it("surfaces a Stak ticker as upcoming in the 'this week' tab when FMP calendar has a scheduled date (pre-announcement fix)", async () => {
		// Real incident: NKE was reporting the following day but didn't appear in "this week".
		// The supplement path filtered out upcoming results unconditionally.
		// Fix: allow upcoming through when pastEntry !== null (real calendar anchor exists).
		// TODAY = "2026-06-24" (Wednesday) → week window is Sun 2026-06-21 – Sat 2026-06-27.
		const reportDate = "2026-06-26"; // Friday of this week, after TODAY
		mockFetchSequence(
			{ earningsCalendar: [] }, // Finnhub main calendar: no NKE for the short window
			{ earningsCalendar: [] }, // Finnhub 90-day lookback: nothing
			[{ symbol: "NKE", date: reportDate, epsActual: null, epsEstimated: 0.11, revenueActual: null, revenueEstimated: 10849540000 }], // FMP calendar: scheduled for reportDate, no EPS yet
			{}, // EDGAR CIK map: NKE not found → EDGAR returns null, falls through to FMP
			[], // FMP income-statement: empty — NKE hasn't filed yet
			[{ actual: null, estimate: 0.11, period: "2026-03-31", quarter: 3, year: 2026, surprise: null, surprisePercent: null }], // Finnhub EPS history: stale
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "upcoming", date: reportDate, priceChangePct: null }));
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

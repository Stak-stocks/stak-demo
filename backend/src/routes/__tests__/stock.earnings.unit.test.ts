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
		hasSameDayEarningsArticleMock.mockResolvedValue(false);
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

	it("still resolves to today's ET date in the US evening, after UTC has already rolled to tomorrow", async () => {
		vi.useFakeTimers();
		// 00:30 UTC the day after TODAY -- already "tomorrow" in UTC, but still ~8:30pm ET
		// on TODAY itself (EDT is UTC-4 in June). A raw `new Date().toISOString()` based
		// "today" would wrongly compute TOMORROW here, which is exactly what made a same-day
		// earnings entry vanish from the calendar hours before the US evening was even over.
		vi.setSystemTime(new Date("2026-06-25T00:30:00.000Z"));
		const symbol = "BUGTEST1D";
		mockFetchSequence(calendarResponse(symbol, TODAY), epsHistoryResponse(2.5, 2.0));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "beat", date: TODAY, hour: "amc" });
	});

	it("reports earnings scheduled for today as still upcoming when Finnhub has no actual data yet", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST1";
		// 1st fetch: calendar (today), 2nd fetch: EPS history (not yet reported)
		mockFetchSequence(calendarResponse(symbol, TODAY), epsHistoryResponse(null, 1.5));
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
		mockFetchSequence(calendarResponse(symbol, TODAY), staleEpsHistory);
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
		mockFetchSequence({ earningsCalendar: [{ symbol, date: "2026-09-21", hour: "amc", epsActual: null, epsEstimate: 25.27, revenueActual: null, revenueEstimate: 42863476069 }] }, lastQuarterEpsHistory);
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

	it("uses the consensus result when a same-day earnings article exists but /stock/earnings hasn't caught up yet", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T22:00:00.000Z`));
		const symbol = "BUGTEST2A";
		// Finnhub's structured endpoints still say "not yet" (calendar epsActual null,
		// EPS history null) -- but a same-day earnings article already exists, so the
		// resolver should ask the cross-source consensus instead of settling for "upcoming".
		mockFetchSequence(calendarResponse(symbol, TODAY), epsHistoryResponse(null, 2.0));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });
		hasSameDayEarningsArticleMock.mockResolvedValue(true);
		getConsensusEarningsResultMock.mockResolvedValue({
			status: "beat", epsActual: 2.5, epsEstimate: 2.0, epsSurprisePct: 25,
			revenueActual: null, revenueEstimate: null, revChangePct: null, confidence: "medium",
			sources: { finnhub: null, fmp: "beat", yahoo: "beat", gemini: null },
		});

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "beat", date: TODAY, hour: "amc" });
	});

	it("falls back to upcoming when a same-day article exists but consensus still finds nothing -- never a wrong verdict", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T22:00:00.000Z`));
		const symbol = "BUGTEST2B";
		// A false-positive keyword match (e.g. an article generically discussing "earnings"
		// without this being the actual new report) should never escalate past "upcoming"
		// if none of the independent consensus sources confirm it either.
		mockFetchSequence(calendarResponse(symbol, TODAY), epsHistoryResponse(null, 2.0));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });
		hasSameDayEarningsArticleMock.mockResolvedValue(true);
		// getConsensusEarningsResultMock already defaults to status: "none" in beforeEach

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "upcoming", date: TODAY, hour: "amc" });
	});

	it("reports beat/miss directly from Finnhub once today's report actually lands", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T22:00:00.000Z`));
		const symbol = "BUGTEST2";
		mockFetchSequence(calendarResponse(symbol, TODAY), epsHistoryResponse(2.5, 2.0));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		// hour is now included for beat/miss too (previously dropped) — it's available from
		// the calendar entry the shared resolver already has, so there's no reason not to.
		expect(res.body).toEqual({ status: "beat", date: TODAY, hour: "amc" });
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("falls back to the calendar entry's own epsActual when /stock/earnings hasn't caught up yet", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T22:00:00.000Z`));
		const symbol = "BUGTEST2B";
		// Finnhub's /stock/earnings history and its /calendar/earnings feed are separate
		// endpoints that can update on different schedules -- a report that's landed can
		// show up in the calendar's epsActual before the EPS-history endpoint catches up.
		// Reproduces the live MU bug from the other direction: without this fallback, the
		// resolver would still call it "upcoming" purely because the *other* endpoint lags.
		const calendarWithActual = {
			earningsCalendar: [{ symbol, date: TODAY, hour: "amc", epsActual: 2.5, epsEstimate: 2.0, revenueActual: null, revenueEstimate: null }],
		};
		mockFetchSequence(calendarWithActual, epsHistoryResponse(null, 2.0));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "beat", date: TODAY, hour: "amc" });
		// Confirmed via Finnhub's own calendar field -- no need to ask Gemini.
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("reports miss directly from Finnhub when actual is below estimate", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T22:00:00.000Z`));
		const symbol = "BUGTEST3";
		mockFetchSequence(calendarResponse(symbol, TODAY), epsHistoryResponse(1.0, 2.0));
		getConsensusEarningsDateMock.mockResolvedValue({ date: TODAY, sources: {}, confidence: "high" });

		const app = await buildApp();
		const res = await request(app).get(`/${symbol}/earnings`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "miss", date: TODAY, hour: "amc" });
	});

	it("reports a clearly future calendar date as upcoming (unaffected regression check)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${TODAY}T14:00:00.000Z`));
		const symbol = "BUGTEST4";
		const futureDate = "2026-07-30";
		mockFetchSequence(calendarResponse(symbol, futureDate, "bmo"), epsHistoryResponse(null, null));
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
		// 1st fetch: calendar (no entry for this symbol), 2nd fetch: EPS history (already reported)
		mockFetchSequence({ earningsCalendar: [] }, epsHistoryResponse(3.0, 2.5));
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

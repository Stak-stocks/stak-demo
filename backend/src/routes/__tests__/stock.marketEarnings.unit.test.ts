import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These services are still used by /:symbol/earnings (resolveEarningsStatus),
// but market-earnings no longer calls them — mocked here to prevent import errors.
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

	// Mock call order for market-earnings:
	// 1. FMP calendar (fetchFMPEarningsCalendar → financialmodelingprep.com)
	// 2. Finnhub calendar (finnhubGet → api.finnhub.io, for hour enrichment)
	// 3. [Optional] EDGAR CIK map (sec.gov/files/company_tickers.json) — only for
	//    past entries with no epsActual within 3 days of today
	// 4. [Optional] EDGAR submissions JSON, filing index JSON, exhibit HTML (text)
	// 5. [Optional] FMP income-statement — if EDGAR returned null
	//
	// String responses are served via .text(); everything else via .json().
	function mockFetchSequence(...responses: unknown[]) {
		let call = 0;
		fetchMock.mockImplementation(async () => {
			const body = responses[call] ?? null;
			call++;
			if (typeof body === "string") {
				return { ok: true, status: 200, text: async () => body, json: async () => { throw new Error("not json"); } };
			}
			return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
		});
	}

	it("shows an upcoming entry when FMP calendar has a scheduled future date (primary scheduling source)", async () => {
		const futureDate = "2026-07-10";
		mockFetchSequence(
			[{ symbol: "AAPL", date: futureDate, epsActual: null, epsEstimated: 1.5, revenueActual: null, revenueEstimated: null }], // FMP calendar
			{ earningsCalendar: [] }, // Finnhub (no hour for AAPL)
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual([
			expect.objectContaining({ symbol: "AAPL", date: futureDate, status: "upcoming" }),
		]);
	});

	it("enriches the hour field from Finnhub when FMP (which hardcodes amc) has the wrong timing", async () => {
		const futureDate = "2026-07-10";
		mockFetchSequence(
			[{ symbol: "AAPL", date: futureDate, epsActual: null, epsEstimated: 1.5, revenueActual: null, revenueEstimated: null }], // FMP calendar (no reliable hour)
			{ earningsCalendar: [{ symbol: "AAPL", date: futureDate, hour: "bmo", epsActual: null, epsEstimate: 1.5 }] }, // Finnhub: has bmo
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		const aapl = res.body.entries.find((e: { symbol: string }) => e.symbol === "AAPL");
		expect(aapl).toEqual(expect.objectContaining({ hour: "bmo" }));
	});

	it("shows a beat when FMP calendar already has epsActual (report landed before next FMP sync)", async () => {
		mockFetchSequence(
			[{ symbol: "AAPL", date: TODAY, epsActual: 1.65, epsEstimated: 1.5, revenueActual: 95000000000, revenueEstimated: 93000000000 }], // FMP calendar with EPS
			{ earningsCalendar: [{ symbol: "AAPL", date: TODAY, hour: "amc" }] }, // Finnhub hour
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		const aapl = res.body.entries.find((e: { symbol: string }) => e.symbol === "AAPL");
		expect(aapl).toEqual(expect.objectContaining({
			symbol: "AAPL", status: "beat", date: TODAY,
			epsActual: 1.65, epsEstimate: 1.5,
		}));
		// No consensus/Gemini calls — beat/miss computed directly from FMP data
		expect(getConsensusEarningsResultMock).not.toHaveBeenCalled();
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("shows a miss when epsActual is below epsEstimate", async () => {
		mockFetchSequence(
			[{ symbol: "AAPL", date: TODAY, epsActual: 1.30, epsEstimated: 1.5, revenueActual: null, revenueEstimated: null }],
			{ earningsCalendar: [] },
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		const aapl = res.body.entries.find((e: { symbol: string }) => e.symbol === "AAPL");
		expect(aapl).toEqual(expect.objectContaining({ symbol: "AAPL", status: "miss", epsActual: 1.30 }));
	});

	it("fills EPS from EDGAR when FMP calendar has no epsActual for a past entry within 3 days", async () => {
		// NKE reported yesterday — FMP calendar has the date but no EPS yet.
		// EDGAR has the 8-K filing with EPS. The route should fill and surface as beat.
		const yesterday = "2026-06-23";
		mockFetchSequence(
			[{ symbol: "NKE", date: yesterday, epsActual: null, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null }], // FMP calendar: date but no EPS
			{ earningsCalendar: [] }, // Finnhub: no hour
			// EDGAR CIK map — SEC format: { "0": { cik_str: number, ticker: string }, ... }
			{ "0": { cik_str: 1386112, ticker: "NKE" } },
			// EDGAR submissions JSON for CIK 0001386112
			{ filings: { recent: { form: ["8-K"], items: ["2.02"], filingDate: [yesterday], primaryDocument: ["ex99.htm"], accessionNumber: ["0001386112-26-001234"] } } },
			// EDGAR filing index (EX-99.1 exhibit)
			{ directory: { item: [{ name: "ex99.htm", type: "EX-99.1" }] } },
			// EDGAR exhibit HTML — extractEpsFromText extracts 0.72 from this
			"Diluted earnings per share was $0.72",
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "beat", epsActual: 0.72 }));
	});

	it("falls back to FMP income-statement when EDGAR CIK is not found", async () => {
		// NKE reported today but isn't in EDGAR's CIK map — fall through to FMP income-statement.
		mockFetchSequence(
			[{ symbol: "NKE", date: TODAY, epsActual: null, epsEstimated: 0.11, revenueActual: 10972000000, revenueEstimated: 10849540000 }], // FMP calendar: correct date, no EPS yet
			{ earningsCalendar: [] }, // Finnhub: no hour
			{}, // EDGAR CIK map: NKE not found → EDGAR returns null
			[{ eps: 0.72, filingDate: TODAY }], // FMP income-statement: has EPS
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "beat", date: TODAY, epsActual: 0.72 }));
		// No consensus/Gemini — beat computed directly from EDGAR/FMP income-statement
		expect(getConsensusEarningsResultMock).not.toHaveBeenCalled();
	});

	it("shows an upcoming entry for today when FMP calendar has no EPS yet (pre-close same-day announcement)", async () => {
		mockFetchSequence(
			[{ symbol: "COST", date: TODAY, epsActual: null, epsEstimated: 4.88, revenueActual: null, revenueEstimated: null }], // FMP: scheduled today, no EPS
			{ earningsCalendar: [] }, // Finnhub: no hour
			{}, // EDGAR CIK map: no COST (or returns null fast)
			[], // FMP income-statement: empty — COST hasn't filed yet
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=COST");

		expect(res.status).toBe(200);
		const cost = res.body.entries.find((e: { symbol: string }) => e.symbol === "COST");
		expect(cost).toEqual(expect.objectContaining({ symbol: "COST", status: "upcoming", date: TODAY }));
	});

	it("excludes a past entry when FMP has the date but no EPS could be filled (older than 3 days = likely postponed)", async () => {
		// Entry from 4 days ago — outside the 3-day fill window. No EDGAR/income-statement
		// calls will be made for it. Entry should be excluded entirely.
		const fourDaysAgo = "2026-06-20";
		mockFetchSequence(
			[{ symbol: "MU", date: fourDaysAgo, epsActual: null, epsEstimated: 1.0, revenueActual: null, revenueEstimated: null }], // FMP: old date, no EPS
			{ earningsCalendar: [] }, // Finnhub: no hour
			// No EDGAR/income-statement calls — date is outside 3-day fill window
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=MU");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "MU")).toBeUndefined();
	});

	it("shows NKE as upcoming this week when FMP calendar has a future date within the week window", async () => {
		// The original NKE bug: Finnhub's calendar missed NKE, so it never showed in 'this week'.
		// With FMP as primary, NKE appears as long as FMP has the scheduled date.
		// TODAY = "2026-06-24" (Wednesday) → week window: Sun 2026-06-22 – Sat 2026-06-28.
		const reportDate = "2026-06-26"; // Friday of this week
		mockFetchSequence(
			[{ symbol: "NKE", date: reportDate, epsActual: null, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null }], // FMP: scheduled Friday
			{ earningsCalendar: [] }, // Finnhub: no hour for NKE
			// No EDGAR/income-statement — date is in future
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "upcoming", date: reportDate, priceChangePct: null }));
		// No Gemini or consensus calls — FMP gives the date directly
		expect(getConsensusEarningsDateMock).not.toHaveBeenCalled();
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("does not show a ticker not in FMP calendar even if it's in extraTickers (trust FMP for scheduling)", async () => {
		// Stale Finnhub EPS history or guessing from last quarter's date was the root cause
		// of wrong "beat/miss" entries. Now if FMP has no entry, we simply don't show.
		mockFetchSequence(
			[], // FMP: no MU entry in this period
			{ earningsCalendar: [] }, // Finnhub: also no MU
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=MU");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "MU")).toBeUndefined();
		// No Gemini, no consensus, no EPS-history fallback — no guessing
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("tracks a ticker from the full brand catalog (not just the old hardcoded list)", async () => {
		// ELF (e.l.f. Beauty) was never in the old hand-maintained MARKET_TICKERS map,
		// but it is a real brand in the shared catalog.
		const futureDate = "2026-07-30";
		mockFetchSequence(
			[{ symbol: "ELF", date: futureDate, epsActual: null, epsEstimated: 0.5, revenueActual: null, revenueEstimated: null }], // FMP: ELF upcoming
			{ earningsCalendar: [] }, // Finnhub: no hour
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual([
			expect.objectContaining({ symbol: "ELF", date: futureDate, status: "upcoming" }),
		]);
	});

	it("beats/misses appear before upcoming entries in the sorted result", async () => {
		// Beat entries (already reported) should sort before upcoming entries regardless
		// of date, so the most actionable data is first.
		const pastDate = "2026-06-22"; // Monday of this week, before TODAY
		const futureDate = "2026-06-26"; // Friday of this week, after TODAY
		mockFetchSequence(
			[
				{ symbol: "MU", date: pastDate, epsActual: 25.11, epsEstimated: 21.40, revenueActual: null, revenueEstimated: null },
				{ symbol: "NKE", date: futureDate, epsActual: null, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null },
			], // FMP: one beat (past), one upcoming (future)
			{ earningsCalendar: [] }, // Finnhub: no hour
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=MU,NKE");

		expect(res.status).toBe(200);
		expect(res.body.entries[0]).toEqual(expect.objectContaining({ symbol: "MU", status: "beat" }));
		expect(res.body.entries[1]).toEqual(expect.objectContaining({ symbol: "NKE", status: "upcoming" }));
	});

	it("computes epsSurprisePct correctly from epsActual and epsEstimate", async () => {
		// NKE: actual 0.72, estimate 0.11 → surprise = (0.72 - 0.11) / 0.11 * 100 ≈ 554.5%
		mockFetchSequence(
			[{ symbol: "NKE", date: TODAY, epsActual: 0.72, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null }],
			{ earningsCalendar: [] },
		);

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		// calcPercentChange rounds to 1 decimal: (0.72 - 0.11) / 0.11 * 100 = 554.5%
		expect(nke?.epsSurprisePct).toBeCloseTo(554.5, 0);
	});
});

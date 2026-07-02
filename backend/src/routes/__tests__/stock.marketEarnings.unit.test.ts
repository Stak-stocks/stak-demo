import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These services are used by /:symbol/earnings (resolveEarningsStatus) but
// market-earnings no longer calls them — mocked here to prevent import errors.
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

	// URL-based mock: routes each fetch call to a specific response based on
	// which service the URL belongs to. More robust than call-order mocking
	// because FMP and Finnhub are now queried in parallel (Promise.all).
	//
	// URL routing:
	//   financialmodelingprep.com/stable/earnings-calendar → FMP calendar
	//   api.finnhub.io → Finnhub calendar (hour enrichment)
	//   sec.gov/files/company_tickers.json → EDGAR CIK map
	//   data.sec.gov/submissions → EDGAR submissions JSON
	//   sec.gov/Archives/edgar + -index.json → EDGAR filing index
	//   sec.gov/Archives/edgar (exhibit, no -index.json) → EDGAR exhibit HTML
	//   financialmodelingprep.com/stable/income-statement → FMP income-statement
	function mockFetchByUrl(routes: Record<string, unknown>) {
		fetchMock.mockImplementation(async (url: string) => {
			for (const [pattern, body] of Object.entries(routes)) {
				if (url.includes(pattern)) {
					if (typeof body === "string") {
						return { ok: true, status: 200, text: async () => body, json: async () => { throw new Error("not json"); } };
					}
					return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
				}
			}
			// Unmatched URL → empty/default response
			return { ok: true, status: 200, json: async () => null, text: async () => "" };
		});
	}

	it("shows an upcoming entry when FMP calendar has a scheduled future date (primary scheduling source)", async () => {
		const futureDate = "2026-07-10";
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "AAPL", date: futureDate, epsActual: null, epsEstimated: 1.5, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual([
			expect.objectContaining({ symbol: "AAPL", date: futureDate, status: "upcoming" }),
		]);
	});

	it("still shows entries when FMP fails and Finnhub is the only source (resilience fallback)", async () => {
		// Simulates FMP returning a rate-limit error (not an array) — fetchFMPEarningsCalendar
		// returns [] silently. Finnhub's calendar covers for it.
		const futureDate = "2026-07-10";
		mockFetchByUrl({
			"earnings-calendar": { message: "Limit Reach." }, // FMP rate limit → returns []
			"finnhub.io": { earningsCalendar: [{ symbol: "AAPL", date: futureDate, hour: "amc", epsActual: null, epsEstimate: 1.5, revenueActual: null, revenueEstimate: null }] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual([
			expect.objectContaining({ symbol: "AAPL", date: futureDate, status: "upcoming" }),
		]);
	});

	it("enriches the hour field from Finnhub when FMP (which hardcodes amc) has the wrong timing", async () => {
		const futureDate = "2026-07-10";
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "AAPL", date: futureDate, epsActual: null, epsEstimated: 1.5, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [{ symbol: "AAPL", date: futureDate, hour: "bmo", epsActual: null, epsEstimate: 1.5 }] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		const aapl = res.body.entries.find((e: { symbol: string }) => e.symbol === "AAPL");
		expect(aapl).toEqual(expect.objectContaining({ hour: "bmo" }));
	});

	it("shows a beat when FMP calendar already has epsActual", async () => {
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "AAPL", date: TODAY, epsActual: 1.65, epsEstimated: 1.5, revenueActual: 95000000000, revenueEstimated: 93000000000 }],
			"finnhub.io": { earningsCalendar: [{ symbol: "AAPL", date: TODAY, hour: "amc" }] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		const aapl = res.body.entries.find((e: { symbol: string }) => e.symbol === "AAPL");
		expect(aapl).toEqual(expect.objectContaining({
			symbol: "AAPL", status: "beat", date: TODAY,
			epsActual: 1.65, epsEstimate: 1.5,
		}));
		expect(getConsensusEarningsResultMock).not.toHaveBeenCalled();
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("shows a miss when epsActual is below epsEstimate", async () => {
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "AAPL", date: TODAY, epsActual: 1.30, epsEstimated: 1.5, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		const aapl = res.body.entries.find((e: { symbol: string }) => e.symbol === "AAPL");
		expect(aapl).toEqual(expect.objectContaining({ symbol: "AAPL", status: "miss", epsActual: 1.30 }));
	});

	it("fills EPS from EDGAR when FMP calendar has no epsActual for a past entry within 3 days", async () => {
		const yesterday = "2026-06-23";
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "NKE", date: yesterday, epsActual: null, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
			// EDGAR CIK map — SEC format: { "0": { cik_str: number, ticker: string } }
			"sec.gov/files/company_tickers.json": { "0": { cik_str: 1386112, ticker: "NKE" } },
			"data.sec.gov/submissions": { filings: { recent: {
				form: ["8-K"], items: ["2.02"], filingDate: [yesterday],
				primaryDocument: ["ex99.htm"], accessionNumber: ["0001386112-26-001234"],
			} } },
			// EDGAR filing index (has "-index.json" in URL)
			"-index.json": { directory: { item: [{ name: "ex99.htm", type: "EX-99.1" }] } },
			// EDGAR exhibit HTML (under /Archives/edgar, matched after -index.json)
			"sec.gov/Archives/edgar": "Diluted earnings per share was $0.72",
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "beat", epsActual: 0.72 }));
	});

	it("falls back to FMP income-statement when EDGAR CIK is not found", async () => {
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "NKE", date: TODAY, epsActual: null, epsEstimated: 0.11, revenueActual: 10972000000, revenueEstimated: 10849540000 }],
			"finnhub.io": { earningsCalendar: [] },
			"sec.gov/files/company_tickers.json": {}, // EDGAR CIK map: NKE not found
			"income-statement": [{ eps: 0.72, filingDate: TODAY }],
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "beat", date: TODAY, epsActual: 0.72 }));
		expect(getConsensusEarningsResultMock).not.toHaveBeenCalled();
	});

	it("shows an upcoming entry for today when no EPS source has data yet (pre-close same-day)", async () => {
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "COST", date: TODAY, epsActual: null, epsEstimated: 4.88, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
			"sec.gov/files/company_tickers.json": {}, // EDGAR: no CIK
			"income-statement": [], // FMP income-statement: empty
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=COST");

		expect(res.status).toBe(200);
		const cost = res.body.entries.find((e: { symbol: string }) => e.symbol === "COST");
		expect(cost).toEqual(expect.objectContaining({ symbol: "COST", status: "upcoming", date: TODAY }));
	});

	it("excludes a past entry older than 3 days with no EPS (likely postponed)", async () => {
		const fourDaysAgo = "2026-06-20";
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "MU", date: fourDaysAgo, epsActual: null, epsEstimated: 1.0, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=MU");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "MU")).toBeUndefined();
	});

	it("shows NKE as upcoming this week when FMP has the scheduled date (the original bug)", async () => {
		// TODAY = "2026-06-24" (Wednesday) → week window: Sun 2026-06-22 – Sat 2026-06-28.
		const reportDate = "2026-06-26"; // Friday of this week
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "NKE", date: reportDate, epsActual: null, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		expect(nke).toEqual(expect.objectContaining({ symbol: "NKE", status: "upcoming", date: reportDate, priceChangePct: null }));
		expect(getConsensusEarningsDateMock).not.toHaveBeenCalled();
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("does not show a ticker absent from both FMP and Finnhub calendars", async () => {
		mockFetchByUrl({
			"earnings-calendar": [], // FMP: no MU
			"finnhub.io": { earningsCalendar: [] }, // Finnhub: no MU either
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=MU");

		expect(res.status).toBe(200);
		expect(res.body.entries.find((e: { symbol: string }) => e.symbol === "MU")).toBeUndefined();
		expect(getEarningsBeatMissFromWebMock).not.toHaveBeenCalled();
	});

	it("tracks a ticker from the full brand catalog (not just the old hardcoded list)", async () => {
		const futureDate = "2026-07-30";
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "ELF", date: futureDate, epsActual: null, epsEstimated: 0.5, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today");

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual([
			expect.objectContaining({ symbol: "ELF", date: futureDate, status: "upcoming" }),
		]);
	});

	it("beats sort before upcoming in the result", async () => {
		const pastDate = "2026-06-22";
		const futureDate = "2026-06-26";
		mockFetchByUrl({
			"earnings-calendar": [
				{ symbol: "MU", date: pastDate, epsActual: 25.11, epsEstimated: 21.40, revenueActual: null, revenueEstimated: null },
				{ symbol: "NKE", date: futureDate, epsActual: null, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null },
			],
			"finnhub.io": { earningsCalendar: [] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=week&tickers=MU,NKE");

		expect(res.status).toBe(200);
		expect(res.body.entries[0]).toEqual(expect.objectContaining({ symbol: "MU", status: "beat" }));
		expect(res.body.entries[1]).toEqual(expect.objectContaining({ symbol: "NKE", status: "upcoming" }));
	});

	it("computes epsSurprisePct correctly from epsActual and epsEstimate", async () => {
		mockFetchByUrl({
			"earnings-calendar": [{ symbol: "NKE", date: TODAY, epsActual: 0.72, epsEstimated: 0.11, revenueActual: null, revenueEstimated: null }],
			"finnhub.io": { earningsCalendar: [] },
		});

		const app = await buildApp();
		const res = await request(app).get("/market-earnings?period=today&tickers=NKE");

		expect(res.status).toBe(200);
		const nke = res.body.entries.find((e: { symbol: string }) => e.symbol === "NKE");
		// (0.72 - 0.11) / 0.11 * 100 = 554.5%, rounded to 1 decimal = 554.5
		expect(nke?.epsSurprisePct).toBeCloseTo(554.5, 0);
	});
});

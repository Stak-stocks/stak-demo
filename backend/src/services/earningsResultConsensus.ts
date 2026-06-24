/**
 * Earnings results consensus service.
 * Cross-checks beat/miss, EPS, and revenue across 4 sources:
 *   1. Finnhub    — EPS actual/estimate from earnings calendar or history (caller-provided)
 *   2. FMP        — EPS from /stable/earnings-surprises; revenue actual from /stable/income-statement
 *   3. Yahoo      — EPS from earningsHistory module; revenue actual from incomeStatementHistoryQuarterly
 *   4. Gemini     — Narrative beat/miss via web search (getEarningsBeatMissFromWeb)
 *
 * Beat/miss status is determined by majority vote.
 * EPS values fall back: Finnhub → FMP → Yahoo.
 * Revenue actual falls back: Finnhub → FMP → Yahoo (estimate stays from Finnhub only).
 */

import { cacheGet, cacheSet } from "../lib/cache.js";
import { getYahooCrumb, invalidateYahooCrumb } from "../lib/yahooAuth.js";
import { getEarningsBeatMissFromWeb } from "./geminiService.js";
import { getCompanyNews } from "./finnhubService.js";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_KEY = process.env.FMP_API_KEY ?? "";

// Shared with news.ts's extractEarningsSignal (same keyword list, same purpose: spotting
// a results-announcement article by headline/summary text).
export const EARNINGS_CORE = [
	// Direct mentions
	"earnings", "eps",
	// Results announcements (the most common phrasing in press releases)
	"financial results", "quarterly results", "quarterly earnings",
	"annual results", "full year results", "fourth quarter results",
	"third quarter results", "second quarter results", "first quarter results",
	"q1 results", "q2 results", "q3 results", "q4 results",
	"results for the quarter", "results for the year",
	// Report/announce patterns
	"reports results", "reports revenue", "reports earnings",
	"announces results", "announces earnings", "announces revenue",
	"fiscal quarter", "revenue and earnings",
	// Revenue + period patterns
	"quarterly revenue", "q4 revenue", "q3 revenue", "q2 revenue", "q1 revenue",
];

/**
 * Does a same-day, on-topic earnings article already exist in Finnhub's company-news
 * feed? Used by stock.ts's resolveEarningsStatus purely as a TRIGGER, not a verdict --
 * if true, it's worth running the full getConsensusEarningsResult check (FMP/Yahoo/Gemini,
 * each independently date-validated) right away instead of waiting on Finnhub's calendar/
 * EPS-history endpoints alone. A false-positive keyword match just costs one extra
 * consensus check that comes back "none" -- it can never produce a wrong beat/miss, since
 * the verdict always still comes from the already-cross-validated consensus function.
 */
export async function hasSameDayEarningsArticle(
	symbol: string,
	companyName: string | undefined,
	todayStr: string,
): Promise<boolean> {
	// Just a trigger for an extra consensus check, not a verdict -- on any failure
	// (rate limit, network error), fall back to false and let the caller proceed
	// exactly as if this check didn't exist, rather than failing the whole request.
	let articles: Awaited<ReturnType<typeof getCompanyNews>>;
	try {
		articles = await getCompanyNews(symbol, 24, companyName);
	} catch {
		return false;
	}
	return articles.some((a) => {
		const text = `${a.headline} ${a.summary}`.toLowerCase();
		if (!EARNINGS_CORE.some((k) => text.includes(k))) return false;
		const dateStr = new Date(a.datetime * 1000).toISOString().split("T")[0];
		return dateStr === todayStr;
	});
}

type BeatMiss = "beat" | "miss" | null;

/** Absolute difference in days between two YYYY-MM-DD strings. */
function daysDiff(a: string, b: string): number {
	return (
		Math.abs(
			new Date(a + "T12:00:00Z").getTime() - new Date(b + "T12:00:00Z").getTime(),
		) / 86400000
	);
}

function toDateOnly(s: string): string {
	return s.substring(0, 10);
}

// ── FMP: earnings surprises (EPS beat/miss) ───────────────────────────────────

interface FMPEarningsResult {
	status: BeatMiss;
	epsActual: number | null;
	epsEstimate: number | null;
}

async function getFMPEarningsResult(
	symbol: string,
	reportDate: string,
): Promise<FMPEarningsResult> {
	const empty: FMPEarningsResult = { status: null, epsActual: null, epsEstimate: null };
	if (!FMP_KEY) return empty;
	try {
		const url = `${FMP_BASE}/earnings-surprises?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return empty;
		const data: { date: string; actualEarningResult: number; estimatedEarning: number }[] =
			await res.json();
		if (!Array.isArray(data) || data.length === 0) return empty;

		// Find the entry whose date is closest to reportDate, within 45 days
		const match = data
			.map((e) => ({ ...e, diff: daysDiff(toDateOnly(e.date), reportDate) }))
			.filter((e) => e.diff <= 45)
			.sort((a, b) => a.diff - b.diff)[0];
		if (!match) return empty;

		const epsActual = match.actualEarningResult ?? null;
		const epsEstimate = match.estimatedEarning ?? null;
		const status: BeatMiss =
			epsActual != null && epsEstimate != null
				? epsActual >= epsEstimate
					? "beat"
					: "miss"
				: null;
		return { status, epsActual, epsEstimate };
	} catch {
		return empty;
	}
}

// ── FMP: income statement (revenue actual) ────────────────────────────────────

async function getFMPRevenueActual(symbol: string, reportDate: string): Promise<number | null> {
	if (!FMP_KEY) return null;
	try {
		const url = `${FMP_BASE}/income-statement?symbol=${encodeURIComponent(symbol)}&period=quarter&limit=4&apikey=${FMP_KEY}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return null;
		const data: { date: string; revenue: number }[] = await res.json();
		if (!Array.isArray(data) || data.length === 0) return null;

		// Quarter end date is typically 4–8 weeks before the earnings announcement.
		// Find the entry whose quarter end is within 90 days before reportDate.
		const match = data
			.map((e) => ({
				...e,
				diff:
					(new Date(reportDate + "T12:00:00Z").getTime() -
						new Date(toDateOnly(e.date) + "T12:00:00Z").getTime()) /
					86400000,
			}))
			.filter((e) => e.diff >= 0 && e.diff <= 90)
			.sort((a, b) => a.diff - b.diff)[0];
		return match?.revenue ?? null;
	} catch {
		return null;
	}
}

// ── Yahoo Finance: earnings history (EPS) + quarterly revenue ────────────────

interface YahooEarningsResult {
	status: BeatMiss;
	epsActual: number | null;
	epsEstimate: number | null;
	revenueActual: number | null;
}

async function getYahooEarningsResult(
	symbol: string,
	reportDate: string,
): Promise<YahooEarningsResult> {
	const empty: YahooEarningsResult = {
		status: null,
		epsActual: null,
		epsEstimate: null,
		revenueActual: null,
	};

	const doFetch = async (
		auth: Awaited<ReturnType<typeof getYahooCrumb>>,
	): Promise<Response> => {
		const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";
		// Fetch EPS history and quarterly income statement in one request
		const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=earningsHistory,incomeStatementHistoryQuarterly${crumbParam}`;
		return fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0",
				...(auth?.cookie ? { "Cookie": auth.cookie } : {}),
			},
			signal: AbortSignal.timeout(8000),
		});
	};

	try {
		let auth = await getYahooCrumb();
		let res = await doFetch(auth);

		if (res.status === 401 || res.status === 403) {
			invalidateYahooCrumb();
			auth = await getYahooCrumb();
			res = await doFetch(auth);
		}
		if (!res.ok) return empty;

		const data = await res.json();
		if (data?.quoteSummary?.error?.code === "Unauthorized") {
			invalidateYahooCrumb();
			return empty;
		}

		const result = data?.quoteSummary?.result?.[0];

		// ── EPS from earningsHistory ──────────────────────────────────────────
		type HistoryEntry = {
			epsActual?: { raw: number };
			epsEstimate?: { raw: number };
			quarter?: { raw: number };
		};
		const history: HistoryEntry[] = result?.earningsHistory?.history ?? [];
		const epsMatch = history
			.filter((h) => h.quarter?.raw != null)
			.map((h) => {
				const qDate = new Date(h.quarter!.raw * 1000).toISOString().split("T")[0]!;
				return { ...h, diff: daysDiff(qDate, reportDate) };
			})
			.filter((h) => h.diff <= 60)
			.sort((a, b) => a.diff - b.diff)[0];

		const epsActual = epsMatch?.epsActual?.raw ?? null;
		const epsEstimate = epsMatch?.epsEstimate?.raw ?? null;
		const status: BeatMiss =
			epsActual != null && epsEstimate != null
				? epsActual >= epsEstimate
					? "beat"
					: "miss"
				: null;

		// ── Revenue from incomeStatementHistoryQuarterly ──────────────────────
		type IncomeEntry = {
			totalRevenue?: { raw: number };
			endDate?: { raw: number };
		};
		const incomeHistory: IncomeEntry[] =
			result?.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? [];
		const revenueMatch = incomeHistory
			.filter((e) => e.endDate?.raw != null)
			.map((e) => {
				const eDate = new Date(e.endDate!.raw * 1000).toISOString().split("T")[0]!;
				// Quarter end date should be before (or at) the earnings report date
				const diff =
					(new Date(reportDate + "T12:00:00Z").getTime() -
						new Date(eDate + "T12:00:00Z").getTime()) /
					86400000;
				return { ...e, diff };
			})
			.filter((e) => e.diff >= 0 && e.diff <= 90)
			.sort((a, b) => a.diff - b.diff)[0];

		const revenueActual = revenueMatch?.totalRevenue?.raw ?? null;

		return { status, epsActual, epsEstimate, revenueActual };
	} catch {
		return empty;
	}
}

// ── Majority vote on beat/miss ────────────────────────────────────────────────

function voteOnStatus(statuses: BeatMiss[]): "beat" | "miss" | "none" {
	const valid = statuses.filter((s): s is "beat" | "miss" => s !== null);
	if (valid.length === 0) return "none";
	const beats = valid.filter((s) => s === "beat").length;
	const misses = valid.filter((s) => s === "miss").length;
	if (beats > misses) return "beat";
	if (misses > beats) return "miss";
	// Tie — first non-null wins (priority order: Finnhub > FMP > Yahoo > Gemini)
	return valid[0] ?? "none";
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface FinnhubEarningsData {
	epsActual: number | null;
	epsEstimate: number | null;
	revenueActual?: number | null;
	revenueEstimate?: number | null;
}

export interface ConsensusEarningsResult {
	status: "beat" | "miss" | "none";
	epsActual: number | null;
	epsEstimate: number | null;
	epsSurprisePct: number | null;
	revenueActual: number | null;
	revenueEstimate: number | null;
	revChangePct: number | null;
	confidence: "high" | "medium" | "low"; // high = 3+ agree, medium = 2, low = 1
	sources: {
		finnhub: BeatMiss;
		fmp: BeatMiss;
		yahoo: BeatMiss;
		gemini: BeatMiss;
	};
}

/**
 * Returns consensus beat/miss, EPS, and revenue for a stock's reported earnings.
 * Queries FMP, Yahoo Finance, and Gemini in parallel alongside Finnhub data already
 * fetched by the caller. Results are cached per symbol+reportDate for 24 hours.
 *
 * EPS values: Finnhub → FMP → Yahoo fallback chain.
 * Revenue actual: Finnhub → FMP → Yahoo fallback chain.
 * Revenue estimate: Finnhub only (analyst consensus unavailable from free sources).
 */
export async function getConsensusEarningsResult(
	symbol: string,
	companyName: string | undefined,
	reportDate: string,
	finnhubData: FinnhubEarningsData,
): Promise<ConsensusEarningsResult> {
	// Bumped to v2 to invalidate stale results cached during the earnings status
	// investigation, before any of the related fixes were deployed.
	const cacheKey = `result-consensus:v2:${symbol}:${reportDate}`;
	const cached = await cacheGet<ConsensusEarningsResult>(cacheKey);
	if (cached) return cached;

	// Query all external sources in parallel
	const [fmpEps, fmpRevenue, yahooResult, geminiRaw] = await Promise.all([
		getFMPEarningsResult(symbol, reportDate),
		getFMPRevenueActual(symbol, reportDate),
		getYahooEarningsResult(symbol, reportDate),
		getEarningsBeatMissFromWeb(symbol, companyName),
	]);

	// ── Beat/miss per source ──────────────────────────────────────────────────
	const finnhubStatus: BeatMiss =
		finnhubData.epsActual != null && finnhubData.epsEstimate != null
			? finnhubData.epsActual >= finnhubData.epsEstimate
				? "beat"
				: "miss"
			: null;
	// Only count Gemini's vote if its report date is within 45 days of our anchor date.
	// Gemini caches by symbol without a date, so a cached result from a different quarter
	// should not influence the vote for the quarter we're currently fact-checking.
	const geminiDateOk =
		!geminiRaw.date || daysDiff(geminiRaw.date, reportDate) <= 45;
	const geminiStatus: BeatMiss =
		geminiDateOk && (geminiRaw.result === "beat" || geminiRaw.result === "miss")
			? geminiRaw.result
			: null;

	const sources = {
		finnhub: finnhubStatus,
		fmp: fmpEps.status,
		yahoo: yahooResult.status,
		gemini: geminiStatus,
	};

	const status = voteOnStatus([finnhubStatus, fmpEps.status, yahooResult.status, geminiStatus]);

	// ── Confidence ────────────────────────────────────────────────────────────
	const agreementCount =
		status !== "none" ? Object.values(sources).filter((s) => s === status).length : 0;
	const confidence: ConsensusEarningsResult["confidence"] =
		agreementCount >= 3 ? "high" : agreementCount >= 2 ? "medium" : "low";

	// ── Best EPS: Finnhub → FMP → Yahoo ──────────────────────────────────────
	const epsActual =
		finnhubData.epsActual ?? fmpEps.epsActual ?? yahooResult.epsActual ?? null;
	const epsEstimate =
		finnhubData.epsEstimate ?? fmpEps.epsEstimate ?? yahooResult.epsEstimate ?? null;
	const epsSurprisePct =
		epsActual != null && epsEstimate != null && epsEstimate !== 0
			? Math.round(((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 1000) / 10
			: null;

	// ── Best Revenue actual: Finnhub → FMP → Yahoo ───────────────────────────
	// Revenue estimate: analyst consensus only available from Finnhub calendar.
	// IMPORTANT: Finnhub calendar reports revenue in MILLIONS; FMP/Yahoo return raw USD.
	// revChangePct is only computed when Finnhub has the actual (guarantees same unit as estimate).
	// FMP/Yahoo revenue fills revenueActual for display when Finnhub is null, but the
	// percentage is skipped to avoid a ×1,000,000 unit mismatch.
	const finnhubRevenueActual = finnhubData.revenueActual ?? null;
	const revenueActual = finnhubRevenueActual ?? fmpRevenue ?? yahooResult.revenueActual ?? null;
	const revenueEstimate = finnhubData.revenueEstimate ?? null;
	const revChangePct =
		finnhubRevenueActual != null && revenueEstimate != null && revenueEstimate !== 0
			? Math.round(((finnhubRevenueActual - revenueEstimate) / Math.abs(revenueEstimate)) * 1000) / 10
			: null;

	const result: ConsensusEarningsResult = {
		status,
		epsActual,
		epsEstimate,
		epsSurprisePct,
		revenueActual,
		revenueEstimate,
		revChangePct,
		confidence,
		sources,
	};

	// Only cache when at least one source responded
	const hasSomeData =
		Object.values(sources).some((s) => s !== null) || finnhubData.epsActual != null;
	if (hasSomeData) {
		await cacheSet(cacheKey, result, 24 * 60 * 60 * 1000);
	}

	return result;
}

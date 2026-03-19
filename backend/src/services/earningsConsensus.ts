/**
 * Earnings date consensus service.
 * Queries Finnhub, Yahoo Finance, FMP, and Gemini in parallel,
 * then picks the majority answer. Prevents wrong dates from any single source
 * (e.g. Finnhub returning a past date when the company hasn't reported yet).
 */

import { cacheGet, cacheSet } from "../lib/cache.js";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_KEY = process.env.FMP_API_KEY ?? "";

function getGeminiKeys(): string[] {
	return [
		process.env.GEMINI_API_KEY,
		process.env.GEMINI_API_KEY_2,
		process.env.GEMINI_API_KEY_3,
	].filter((k): k is string => !!k);
}

function fmt(d: Date): string {
	return d.toISOString().split("T")[0];
}

function todayStr(): string {
	return fmt(new Date());
}

// ── Source 1: Yahoo Finance calendarEvents ───────────────────────────────────

async function getYahooEarningsDate(symbol: string): Promise<string | null> {
	try {
		const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents`;
		const res = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) return null;
		const data = await res.json();
		const dates: { raw: number; fmt: string }[] =
			data?.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate ?? [];
		if (dates.length === 0) return null;
		// Yahoo returns a [start, end] range — take the midpoint date
		const timestamps = dates.map((d) => d.raw * 1000);
		const mid = new Date((timestamps[0] + (timestamps[timestamps.length - 1] ?? timestamps[0])) / 2);
		return fmt(mid);
	} catch {
		return null;
	}
}

// ── Source 2: FMP earnings calendar ─────────────────────────────────────────

async function getFMPEarningsDate(symbol: string): Promise<string | null> {
	if (!FMP_KEY) return null;
	try {
		const today = todayStr();
		const sixMonthsOut = fmt(new Date(Date.now() + 180 * 86400000));
		const url = `${FMP_BASE}/earning_calendar?symbol=${encodeURIComponent(symbol)}&from=${today}&to=${sixMonthsOut}&apikey=${FMP_KEY}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return null;
		const data: { date: string; symbol: string }[] = await res.json();
		if (!Array.isArray(data) || data.length === 0) return null;
		// Return the nearest upcoming date
		const sorted = data
			.map((e) => e.date)
			.filter((d) => d >= today)
			.sort();
		return sorted[0] ?? null;
	} catch {
		return null;
	}
}

// ── Source 3: Gemini web search for upcoming earnings date ───────────────────

async function getGeminiEarningsDate(symbol: string, companyName?: string): Promise<string | null> {
	const keys = getGeminiKeys();
	if (keys.length === 0) return null;

	const subject = companyName
		? `${companyName} (ticker: ${symbol})`
		: `the company with ticker ${symbol}`;

	const prompt = `What is the exact upcoming earnings report date for ${subject}?
Search investor relations pages, SEC filings, and financial news sites.
Return ONLY a JSON object: { "date": "YYYY-MM-DD" } where date is the next scheduled earnings date.
If not found, return { "date": null }.
Return ONLY valid JSON, no markdown, no extra text.`;

	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					signal: AbortSignal.timeout(15000),
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						tools: [{ google_search: {} }],
						generationConfig: { temperature: 0 },
					}),
				},
			);
			if (res.status === 429) continue;
			if (!res.ok) break;
			const data = await res.json();
			const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
			const jsonMatch = rawText.match(/\{[\s\S]*\}/);
			if (!jsonMatch) continue;
			const parsed = JSON.parse(jsonMatch[0]);
			const date: string | null = parsed?.date ?? null;
			if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
		} catch {
			continue;
		}
	}
	return null;
}

// ── Majority vote ────────────────────────────────────────────────────────────

function majorityVote(dates: (string | null)[]): string | null {
	const valid = dates.filter((d): d is string => d !== null && /^\d{4}-\d{2}-\d{2}$/.test(d));
	if (valid.length === 0) return null;

	// Count votes per date
	const votes: Record<string, number> = {};
	for (const d of valid) {
		votes[d] = (votes[d] ?? 0) + 1;
	}

	// Find max votes
	const maxVotes = Math.max(...Object.values(votes));

	// If any date has 2+ votes, use it (prefer most future if tie)
	if (maxVotes >= 2) {
		const winners = Object.entries(votes)
			.filter(([, v]) => v === maxVotes)
			.map(([d]) => d)
			.sort()
			.reverse(); // most future first
		return winners[0];
	}

	// All different — prefer the most future date >= today (safest for upcoming)
	const today = todayStr();
	const future = valid.filter((d) => d >= today).sort();
	if (future.length > 0) return future[0];

	// All in past — return the most recent
	return valid.sort().reverse()[0];
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface ConsensusEarningsDate {
	date: string | null;
	sources: {
		finnhub: string | null;
		yahoo: string | null;
		fmp: string | null;
		gemini: string | null;
	};
	confidence: "high" | "medium" | "low"; // high = 3+, medium = 2, low = 1
}

/**
 * Returns the consensus upcoming earnings date for a ticker using 4 sources.
 * Cached per symbol per day. Pass the Finnhub date if already known to avoid re-fetching.
 */
export async function getConsensusEarningsDate(
	symbol: string,
	companyName?: string,
	finnhubDate?: string | null,
): Promise<ConsensusEarningsDate> {
	const cacheKey = `consensus-date:v1:${symbol}:${todayStr()}`;
	const cached = await cacheGet<ConsensusEarningsDate>(cacheKey);
	if (cached) return cached;

	// Query all sources in parallel (Finnhub already queried by caller — reuse)
	const [yahoo, fmp, gemini] = await Promise.all([
		getYahooEarningsDate(symbol),
		getFMPEarningsDate(symbol),
		getGeminiEarningsDate(symbol, companyName),
	]);

	const sources = {
		finnhub: finnhubDate ?? null,
		yahoo,
		fmp,
		gemini,
	};

	const allDates = Object.values(sources);
	const validDates = allDates.filter(Boolean);
	const date = majorityVote(allDates);

	// Count how many sources agree on the winner
	const agreementCount = date ? allDates.filter((d) => d === date).length : 0;
	const confidence: ConsensusEarningsDate["confidence"] =
		agreementCount >= 3 ? "high" : agreementCount === 2 ? "medium" : "low";

	const result: ConsensusEarningsDate = { date, sources, confidence };

	// Cache longer if high confidence
	const ttl = confidence === "high" ? 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
	if (validDates.length > 0) await cacheSet(cacheKey, result, ttl);

	return result;
}

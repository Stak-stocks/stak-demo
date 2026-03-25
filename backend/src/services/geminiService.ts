import type { FinnhubArticle } from "./finnhubService.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

export interface SimplifiedArticle {
	headline: string;
	source: string;
	url: string;
	image: string;
	datetime: number;
	summary: string;
	explanation: string;
	whyItMatters: string;
	sentiment: "bullish" | "bearish" | "neutral";
	type: "macro" | "sector" | "company";
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 8;

function getCacheKey(articles: FinnhubArticle[]): string {
	return articles.map((a) => String(a.id || a.headline)).join("|");
}

/** Chunk an array into groups of `size` */
function chunk<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getGeminiKeys(): string[] {
	return [
		process.env.GEMINI_API_KEY,
		process.env.GEMINI_API_KEY_2,
		process.env.GEMINI_API_KEY_3,
	].filter((k): k is string => !!k);
}

type SimplifyResult = { explanation: string; whyItMatters: string; sentiment: string };

/** Try one Gemini key with one retry on 429. Returns parsed results or null if rate-limited. */
async function trySimplifyKey(key: string, prompt: string, count: number): Promise<SimplifyResult[] | null> {
	for (let attempt = 0; attempt < 2; attempt++) {
		if (attempt > 0) await sleep(2000);

		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
				}),
			},
		);

		if (res.status === 429) continue;
		if (!res.ok) throw new Error(`Gemini error ${res.status}`);

		const geminiData = await res.json();
		const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
		try {
			return JSON.parse(rawText);
		} catch {
			return Array.from({ length: count }, () => ({
				explanation: "Could not simplify this article.",
				whyItMatters: "Check the original source for details.",
				sentiment: "neutral",
			}));
		}
	}
	return null;
}

/** Call Gemini for a single batch of up to BATCH_SIZE articles, rotating keys on 429 */
async function simplifyBatch(articles: FinnhubArticle[]): Promise<SimplifyResult[]> {
	const keys = getGeminiKeys();
	if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");

	const prompt = `You are a financial news assistant for beginner investors aged 18-25.

Simplify the following ${articles.length} stock market news article(s) for beginners.
Use simple, conversational language. Be concise (1-2 sentences per field).

Return a JSON array with exactly ${articles.length} objects in this format:
[
  {
    "explanation": "plain English explanation of what happened",
    "whyItMatters": "one sentence on why this could impact stock prices",
    "sentiment": "bullish" | "bearish" | "neutral"
  }
]

Articles:
${articles.map((a, i) => `${i + 1}. Title: ${a.headline}\nSummary: ${a.summary}`).join("\n\n")}

Return ONLY valid JSON, no markdown, no extra text.`;

	for (const key of keys) {
		const result = await trySimplifyKey(key, prompt, articles.length);
		if (result !== null) return result;
	}

	// All keys exhausted — return raw summaries rather than failing
	return articles.map((a) => ({
		explanation: a.summary,
		whyItMatters: "Read the full article for more context.",
		sentiment: "neutral",
	}));
}

/** Simplify all articles, processing them in sequential batches of BATCH_SIZE.
 *  Results are cached for 30 minutes keyed by article IDs. */
export async function simplifyArticles(
	articles: FinnhubArticle[],
	types?: ("macro" | "sector" | "company")[],
): Promise<SimplifiedArticle[]> {
	if (articles.length === 0) return [];

	const cacheKey = getCacheKey(articles);
	const cached = await cacheGet<SimplifiedArticle[]>(cacheKey);
	if (cached) return cached;

	// Process batches in parallel for speed
	const batches = chunk(articles, BATCH_SIZE);
	const batchResults = await Promise.all(batches.map((batch) => simplifyBatch(batch)));
	const simplified = batchResults.flat();

	const result: SimplifiedArticle[] = articles.map((article, i) => {
		const s = simplified[i] ?? {
			explanation: article.summary,
			whyItMatters: "Read more at the source.",
			sentiment: "neutral",
		};
		return {
			headline: article.headline,
			source: article.source,
			url: article.url,
			image: article.image,
			datetime: article.datetime,
			summary: article.summary,
			explanation: s.explanation || article.summary,
			whyItMatters: s.whyItMatters || "Read more at the source.",
			sentiment: (["bullish", "bearish", "neutral"].includes(s.sentiment)
				? s.sentiment
				: "neutral") as "bullish" | "bearish" | "neutral",
			type: types?.[i] ?? "sector",
		};
	});

	await cacheSet(cacheKey, result, CACHE_TTL_MS);
	return result;
}

type EarningsOutcome = "beat" | "miss" | "none";

const WEB_EARNINGS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Use Gemini 2.0 Flash with Google Search grounding to determine if a company
 * beat or missed earnings in their most recent quarter, along with the report date.
 * Makes 1 call per stock per 24 hours.
 */
export async function getEarningsBeatMissFromWeb(
	symbol: string,
	companyName?: string,
): Promise<{ result: EarningsOutcome; date: string | null }> {
	const cacheKey = `web:v2:${symbol}`;
	const cached = await cacheGet<{ result: EarningsOutcome; date: string | null }>(cacheKey);
	if (cached) return { result: cached.result, date: cached.date };

	const keys = getGeminiKeys();
	if (keys.length === 0) return { result: "none", date: null };

	const subject = companyName
		? `${companyName} (stock ticker: ${symbol})`
		: `the company with stock ticker ${symbol} on US stock exchanges`;
	const prompt = `Search for the most recent quarterly earnings report for ${subject}.

Determine whether the company OVERALL beat or missed earnings expectations. Use the following approach:

1. Find what financial media (CNBC, Bloomberg, Reuters, Seeking Alpha, MarketWatch) say about the results — did they describe it as a "beat", "topped estimates", "exceeded expectations" OR a "miss", "fell short", "below expectations"?
2. Check both EPS and revenue results. Prefer non-GAAP / adjusted EPS over GAAP if available (that's what analysts track).
3. Use the OVERALL narrative: a company can miss EPS but beat revenue and be widely described as a beat — in that case return "beat". Use what the market and analysts actually concluded, not just one metric.
4. Only consider earnings reported in the last 60 days.

Return a JSON object with exactly these two fields:
{
  "outcome": "beat" | "miss" | "none",
  "reportDate": "YYYY-MM-DD" | null
}

Where:
- "outcome": "beat" if analysts/media broadly say the company beat or topped expectations, "miss" if they broadly say the company missed or fell short, "none" if no recent report found or the verdict is unclear
- "reportDate": the date the earnings were publicly reported (not the fiscal quarter end date), or null if none

Return ONLY valid JSON, no markdown, no extra text.`;

	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
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
			// Extract JSON object from the response (Gemini may wrap in markdown fences)
			const jsonMatch = rawText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				try {
					const parsed = JSON.parse(jsonMatch[0]);
					const result: EarningsOutcome = ["beat", "miss", "none"].includes(parsed.outcome)
						? parsed.outcome
						: "none";
					const date: string | null = typeof parsed.reportDate === "string" ? parsed.reportDate : null;
					await cacheSet(cacheKey, { result, date }, WEB_EARNINGS_TTL_MS);
					return { result, date };
				} catch {
					// JSON parse failed — fall through to next key
				}
			}
		} catch {
			// ignore, try next key
		}
	}
	return { result: "none", date: null };
}

/**
 * Ask Gemini to classify an ambiguous earnings article as beat, miss, or none.
 * Used when keyword matching in news.ts can't determine the outcome.
 */
export async function classifyEarnings(headline: string, summary: string): Promise<EarningsOutcome> {
	const cacheKey = headline.slice(0, 80);
	const cached = await cacheGet<EarningsOutcome>(cacheKey);
	if (cached) return cached;

	const keys = getGeminiKeys();
	if (keys.length === 0) return "none";

	const prompt = `You are a financial analyst. Read this news article about a company's earnings report and determine the outcome.

Headline: ${headline}
Summary: ${summary}

Did the company beat or miss earnings expectations?
- "beat" = results were better than expected (beat estimates, revenue beat, EPS beat, topped forecasts, etc.)
- "miss" = results were worse than expected (missed estimates, fell short, below forecasts, etc.)
- "none" = cannot determine from this text, or this is not an earnings results article

Return ONLY one of these exact strings: beat, miss, none`;

	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { temperature: 0, maxOutputTokens: 10 },
					}),
				},
			);
			if (res.status === 429) continue;
			if (!res.ok) break;
			const data = await res.json();
			const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().toLowerCase();
			let result: EarningsOutcome = "none";
			if (text === "beat") result = "beat";
			else if (text === "miss") result = "miss";
			await cacheSet(cacheKey, result, CACHE_TTL_MS);
			return result;
		} catch {
			// ignore, try next key
		}
	}
	return "none";
}

const FILTER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Filter articles to only those relevant to financial markets for the given query.
 * Sends headlines only to Gemini for speed. Times out after 2.5s and falls back
 * to returning all articles so the app never blocks on this call.
 */
export async function filterMarketRelevant(
	articles: FinnhubArticle[],
	query: string,
): Promise<FinnhubArticle[]> {
	if (articles.length === 0) return articles;

	// Cache keyed by query only (not article IDs) so it survives Finnhub cache refreshes.
	// Stores a Record<headline, boolean> so new articles not yet seen pass through by default.
	const cacheKey = `filter:${query.toLowerCase()}`;
	const cached = await cacheGet<Record<string, boolean>>(cacheKey);
	if (cached) return articles.filter((a) => cached[a.headline] !== false);

	const keys = getGeminiKeys();
	if (keys.length === 0) return articles;

	const prompt = `Stak is a stock market app for young investors. A user searched for "${query}".

For each article headline below, return true if it is relevant to financial markets, stocks, investing, or the economic impact of "${query}". Return false if it has no financial angle (e.g. pure entertainment, sports scores, academic research, lifestyle).

Return a JSON array of booleans with exactly ${articles.length} values in the same order.
Example: [true, false, true]

Headlines:
${articles.map((a, i) => `${i + 1}. ${a.headline}`).join("\n")}

Return ONLY valid JSON, no markdown, no extra text.`;

	for (const key of keys) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 2500);
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { temperature: 0, responseMimeType: "application/json" },
					}),
					signal: controller.signal,
				},
			);
			if (!res.ok) continue;
			const data = await res.json();
			const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
			const flags: boolean[] = JSON.parse(raw);
			if (!Array.isArray(flags) || flags.length !== articles.length) return articles;
			const record: Record<string, boolean> = {};
			articles.forEach((a, i) => { record[a.headline] = flags[i]; });
			await cacheSet(cacheKey, record, FILTER_CACHE_TTL_MS);
			return articles.filter((_, i) => flags[i] !== false);
		} catch {
			// timeout or error — try next key
		} finally {
			clearTimeout(timeout);
		}
	}
	return articles;
}

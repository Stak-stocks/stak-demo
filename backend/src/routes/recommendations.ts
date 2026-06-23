import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { STAK_WEIGHTED_STOCK_TAGS, type StakStockTagConfig } from "../data/stockTags.js";
import { computeRecommendationScore, type RecommendationFreshness } from "@stak/shared";

export const recommendationsRouter = Router();

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKeys(): string[] {
	return [
		process.env.FINNHUB_API_KEY,
		process.env.FINNHUB_API_KEY_2,
		process.env.FINNHUB_API_KEY_3,
	].filter((k): k is string => !!k);
}

async function finnhubGet(path: string): Promise<unknown | null> {
	const keys = getApiKeys();
	for (const key of keys) {
		try {
			const res = await fetch(`${FINNHUB_BASE}${path}&token=${key}`);
			if (res.status === 403 || res.status === 429) continue;
			if (!res.ok) return null;
			return res.json();
		} catch {
			continue;
		}
	}
	return null;
}

// Tickers we compute freshness signals for — covers nearly all top-ranked deck cards
const WATCH_TICKERS = [
	"AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "NFLX",
	"AVGO", "AMD", "INTC", "QCOM", "ORCL", "ADBE", "CRM", "CSCO",
	"UBER", "ABNB", "DASH", "SPOT", "SNAP", "PINS", "RDDT", "COIN",
	"HOOD", "RBLX", "PLTR", "DUOL", "CRWD", "SNOW", "DDOG", "NET",
	"SHOP", "PYPL", "SQ", "V", "MA", "JPM", "GS", "BAC",
	"WMT", "COST", "TGT", "HD", "MCD", "SBUX", "NKE", "LULU",
	"DIS", "CMCSA", "RIVN", "F", "GM", "LLY", "ABBV", "PANW",
];
const WATCH_TICKER_SET = new Set<string>(WATCH_TICKERS);

/** Fetch tickers with earnings in the next 7 days. Cached for 1 hour. */
async function getUpcomingEarningsTickers(): Promise<Set<string>> {
	const cacheKey = "recommendations:upcoming-earnings:v1";
	const cached = await cacheGet<string[]>(cacheKey);
	if (cached) return new Set(cached);

	const now = new Date();
	const fmt = (d: Date) => d.toISOString().split("T")[0];
	const fromStr = fmt(now);
	const toStr = fmt(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

	const data = await finnhubGet(`/calendar/earnings?from=${fromStr}&to=${toStr}`) as
		{ earningsCalendar?: { symbol: string; date: string }[] } | null;

	const todayStr = fmt(now);
	const tickers = (data?.earningsCalendar ?? [])
		.filter((e) => e.date > todayStr)
		.map((e) => e.symbol.toUpperCase());

	await cacheSet(cacheKey, tickers, 60 * 60 * 1000); // 1 hour
	return new Set(tickers);
}

type Mood = "Bullish" | "Bearish" | "Cautious" | "Volatile" | "Calm" | "Mixed";

function deriveMood(spyDp: number | null, qqqDp: number | null): Mood {
	if (spyDp === null && qqqDp === null) return "Mixed";
	const avg = spyDp !== null && qqqDp !== null ? (spyDp + qqqDp) / 2 : (spyDp ?? qqqDp)!;
	const divergence = spyDp !== null && qqqDp !== null ? Math.abs(spyDp - qqqDp) : 0;
	if (Math.abs(avg) >= 2.5 || divergence >= 3) return "Volatile";
	if (avg >= 1.5) return "Bullish";
	if (avg <= -1.5) return "Bearish";
	if (avg <= -0.5) return "Cautious";
	if (Math.abs(avg) <= 0.5) return "Calm";
	return "Mixed";
}

const MOOD_DECK_IDS: Record<Mood, string[]> = {
	Bullish:  ["high_growth", "consumer_tech", "explore"],
	Bearish:  ["defensive", "dividend", "value"],
	Cautious: ["defensive", "quality", "dividend"],
	Volatile: ["high_growth", "defensive", "explore"],
	Calm:     ["explore", "dividend", "defensive"],
	Mixed:    ["diversified", "high_growth", "defensive"],
};

/** Returns today's Daily Brief theme IDs derived from market mood. Caches 30 min. */
async function getTodayThemes(): Promise<string[]> {
	const cacheKey = "recommendations:today-themes:v1";
	const cached = await cacheGet<string[]>(cacheKey);
	if (cached) return cached;

	// Reuse SPY/QQQ quotes already cached by dailyBrief.ts (same cache keys, 5-min TTL)
	const [spyDp, qqqDp] = await Promise.all([
		cacheGet<number>("daily-brief:quote:SPY"),
		cacheGet<number>("daily-brief:quote:QQQ"),
	]);

	const mood = deriveMood(spyDp, qqqDp);
	const themes = MOOD_DECK_IDS[mood];
	await cacheSet(cacheKey, themes, 30 * 60 * 1000);
	return themes;
}

/** STAK tickers mentioned in Finnhub general news in the last 48h. Cached 2h. */
async function getMajorNewsTickers(): Promise<Set<string>> {
	const cacheKey = "freshness:major-news:v1";
	const cached = await cacheGet<string[]>(cacheKey);
	if (cached) return new Set(cached);

	const data = await finnhubGet("/news?category=general") as
		Array<{ datetime: number; related: string }> | null;

	const cutoff = Math.floor(Date.now() / 1000) - 48 * 60 * 60;
	const tickers = new Set<string>();

	for (const article of data ?? []) {
		if (article.datetime < cutoff) continue;
		if (!article.related) continue;
		for (const t of article.related.split(/[,;\s]+/)) {
			const sym = t.toUpperCase().trim();
			if (sym && WATCH_TICKER_SET.has(sym)) tickers.add(sym);
		}
	}

	await cacheSet(cacheKey, [...tickers], 2 * 60 * 60 * 1000);
	return tickers;
}

/** STAK tickers with |daily% change| ≥ 3 — via Yahoo Finance batch quote. Cached 30 min. */
async function getUnusualMovers(): Promise<Set<string>> {
	const cacheKey = "freshness:unusual-movers:v1";
	const cached = await cacheGet<string[]>(cacheKey);
	if (cached) return new Set(cached);

	try {
		const symbols = WATCH_TICKERS.join(",");
		const res = await fetch(
			`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketChangePercent`,
			{ headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) },
		);
		if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);
		const data = await res.json() as {
			quoteResponse?: { result?: Array<{ symbol: string; regularMarketChangePercent?: number }> };
		};
		const movers = (data?.quoteResponse?.result ?? [])
			.filter((q) => Math.abs(q.regularMarketChangePercent ?? 0) >= 3)
			.map((q) => q.symbol.toUpperCase());
		await cacheSet(cacheKey, movers, 30 * 60 * 1000);
		return new Set(movers);
	} catch {
		await cacheSet(cacheKey, [], 30 * 60 * 1000); // cache empty so we don't hammer Yahoo on errors
		return new Set();
	}
}

/** STAK tickers with an analyst recommendation update within the last 7 days. Cached 6h. */
async function getAnalystUpdatedTickers(): Promise<Set<string>> {
	const cacheKey = "freshness:analyst-updated:v1";
	const cached = await cacheGet<string[]>(cacheKey);
	if (cached) return new Set(cached);

	const results = await Promise.all(
		WATCH_TICKERS.map(async (symbol) => {
			const tickerKey = `freshness:analyst:${symbol}`;
			let rec = await cacheGet<Array<{ period?: string }>>(tickerKey);
			if (!rec) {
				rec = await finnhubGet(`/stock/recommendation?symbol=${symbol}`) as Array<{ period?: string }> | null;
				if (rec) await cacheSet(tickerKey, rec, 6 * 60 * 60 * 1000);
			}
			if (!Array.isArray(rec) || rec.length === 0 || !rec[0]?.period) return null;
			const daysAgo = (Date.now() - new Date(rec[0].period).getTime()) / (1000 * 60 * 60 * 24);
			return daysAgo <= 7 ? symbol : null;
		}),
	);

	const tickers = results.filter((t): t is string => t !== null);
	await cacheSet(cacheKey, tickers, 6 * 60 * 60 * 1000);
	return new Set(tickers);
}

interface FreshnessSignals {
	majorNewsLast48h: Set<string>;
	unusualMovers: Set<string>;
	analystUpdatesLast7d: Set<string>;
}

async function getFreshnessSignals(): Promise<FreshnessSignals> {
	const [majorNewsLast48h, unusualMovers, analystUpdatesLast7d] = await Promise.all([
		getMajorNewsTickers(),
		getUnusualMovers(),
		getAnalystUpdatedTickers(),
	]);
	return { majorNewsLast48h, unusualMovers, analystUpdatesLast7d };
}

function computeScore(
	stock: StakStockTagConfig,
	tagScores: Record<string, number>,
	earningsTickers: Set<string>,
	freshness: FreshnessSignals,
	todayThemes: string[],
) {
	const recFreshness: RecommendationFreshness = {
		earningsTickers,
		majorNewsTickers: freshness.majorNewsLast48h,
		unusualMovers: freshness.unusualMovers,
		analystUpdatedTickers: freshness.analystUpdatesLast7d,
	};
	const { finalScore, scoreBreakdown, matchedUserTags } =
		computeRecommendationScore(stock.ticker, stock, tagScores, recFreshness, todayThemes);

	return {
		ticker: stock.ticker,
		primaryCategory: stock.primaryCategory,
		displayTags: stock.displayTags,
		finalScore,
		scoreBreakdown,
		matchedUserTags,
	};
}

// GET /api/recommendations/freshness — publicly cached freshness signals for scoring
// Returns tickers with major news (48h), unusual moves (≥3%), or recent analyst updates (7d)
recommendationsRouter.get("/freshness", async (_req, res) => {
	try {
		const signals = await getFreshnessSignals();
		res.json({
			majorNewsLast48h:    [...signals.majorNewsLast48h],
			unusualMovers:       [...signals.unusualMovers],
			analystUpdatesLast7d:[...signals.analystUpdatesLast7d],
		});
	} catch (error) {
		console.error("Error computing freshness signals:", error);
		res.status(500).json({ error: "Failed to compute freshness signals" });
	}
});

// GET /api/recommendations/debug — full score breakdown for every tracked stock
// Returns stocks sorted by finalScore descending so you can verify the system isn't random
recommendationsRouter.get("/debug", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const limit = Math.min(Number(req.query.limit ?? 50), 334);

		// Read user's tagScores from Firestore
		const userSnap = await adminDb.collection("users").doc(uid).get();
		const tagScores: Record<string, number> = (userSnap.data()?.tagScores as Record<string, number>) ?? {};

		const hasScores = Object.keys(tagScores).length > 0;

		// Fetch all scoring signals in parallel
		const [earningsTickers, todayThemes, freshness] = await Promise.all([
			getUpcomingEarningsTickers(),
			getTodayThemes(),
			getFreshnessSignals(),
		]);

		// Score every tracked stock
		const stocks = STAK_WEIGHTED_STOCK_TAGS as unknown as StakStockTagConfig[];
		const scored = stocks
			.map((stock) => computeScore(stock, tagScores, earningsTickers, freshness, todayThemes))
			.sort((a, b) => b.finalScore - a.finalScore)
			.slice(0, limit);

		res.json({
			uid,
			hasTagScores: hasScores,
			tagScoreCount: Object.keys(tagScores).length,
			upcomingEarningsCount: earningsTickers.size,
			upcomingEarningsTickers: [...earningsTickers],
			todayThemes,
			freshnessSignals: {
				majorNewsCount: freshness.majorNewsLast48h.size,
				unusualMoversCount: freshness.unusualMovers.size,
				analystUpdatesCount: freshness.analystUpdatesLast7d.size,
				majorNewsTickers: [...freshness.majorNewsLast48h],
				unusualMoverTickers: [...freshness.unusualMovers],
				analystUpdatedTickers: [...freshness.analystUpdatesLast7d],
			},
			totalStocks: stocks.length,
			returnedCount: scored.length,
			stocks: scored,
		});
	} catch (error) {
		console.error("Error computing recommendation debug:", error);
		res.status(500).json({ error: "Failed to compute recommendations" });
	}
});

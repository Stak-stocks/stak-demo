import { Router } from "express";
import { getMarketNews, getCompanyNews, classifyArticle, searchNewsArticles, type FinnhubArticle } from "../services/finnhubService.js";
import { simplifyArticles, type SimplifiedArticle } from "../services/geminiService.js";

export const newsRouter = Router();

// ── Earnings extraction from article headlines (no extra API call) ──────────
const EARNINGS_CORE = ["earnings", "eps", "quarterly results", "quarterly earnings", "q1 results", "q2 results", "q3 results", "q4 results", "fiscal quarter", "revenue and earnings"];
const BEAT_WORDS    = ["beat", "topped", "exceeded", "surpassed", "above expectations", "better than expected", "blew past", "smashed estimates", "topped estimates"];
const MISS_WORDS    = ["missed", "miss", "fell short", "below expectations", "worse than expected", "disappointed", "came in below", "missed estimates", "below estimate"];
const UPCOMING_WORDS = ["upcoming earnings", "reports earnings on", "will report earnings", "scheduled to report", "earnings date", "earnings call scheduled", "due to report", "set to report", "preview", "what to expect"];

// How far ahead we show "upcoming" — articles published within 14 days of today
const UPCOMING_WINDOW_DAYS = 14;

interface EarningsSignal {
	status: "upcoming" | "beat" | "miss" | "none";
	date: string | null;
}

function extractEarningsSignal(articles: FinnhubArticle[]): EarningsSignal {
	const nowMs = Date.now();
	const windowMs = UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

	for (const article of articles) {
		const text = `${article.headline} ${article.summary}`.toLowerCase();
		if (!EARNINGS_CORE.some((k) => text.includes(k))) continue;

		const dateStr = new Date(article.datetime * 1000).toISOString().split("T")[0];
		const articleAgeMs = nowMs - article.datetime * 1000;

		// Upcoming: article is recent (within 14 days) AND mentions a future event
		if (UPCOMING_WORDS.some((k) => text.includes(k)) && articleAgeMs < windowMs) {
			return { status: "upcoming", date: dateStr };
		}

		// Beat: positive earnings news
		if (BEAT_WORDS.some((k) => text.includes(k))) return { status: "beat", date: dateStr };

		// Miss: negative earnings news
		if (MISS_WORDS.some((k) => text.includes(k))) return { status: "miss", date: dateStr };

		// Earnings article exists but can't determine beat/miss — skip, don't show badge
	}
	return { status: "none", date: null };
}

// ── Convert simplified articles → TrendCards ────────────────────────────────
function articlesToTrendCards(articles: SimplifiedArticle[], ticker: string) {
	return articles
		.filter((a) => a.type === "company")
		.slice(0, 3)
		.map((a) => ({
			type: "company" as const,
			label: ticker,
			topic: a.headline,
			why: a.explanation,
			impact: a.whyItMatters,
			takeaway:
				a.sentiment === "bullish" ? "Positive signal for investors." :
				a.sentiment === "bearish" ? "Watch for potential downside." :
				"Monitor for further developments.",
		}));
}

// GET /api/news/market — market-wide news (already macro-curated by Finnhub general endpoint)
newsRouter.get("/market", async (_req, res) => {
	try {
		const articles = await getMarketNews(16);
		// All general news is treated as macro — no extra filtering needed
		const simplified = await simplifyArticles(articles, articles.map(() => "macro" as const));
		res.json({ articles: simplified });
	} catch (error) {
		console.error("Error fetching market news:", error);
		res.status(500).json({ error: "Failed to fetch market news" });
	}
});

// GET /api/news/company/:symbol — company + sector news with earnings signal + trend cards
newsRouter.get("/company/:symbol", async (req, res) => {
	try {
		const { symbol } = req.params;
		const ticker = symbol.toUpperCase();
		const companyName = req.query.name as string | undefined;

		// Fetch more candidates so we can re-rank by specificity before capping at 8
		const articles = await getCompanyNews(ticker, 24, companyName);

		if (articles.length === 0) {
			res.json({ articles: [], earningsSignal: { status: "none", date: null }, trendCards: [] });
			return;
		}

		// Classify each article (pass companyName so "Nvidia" matches, not just "NVDA")
		const classified = articles.map((a) => ({ article: a, type: classifyArticle(a, companyName, ticker) }));

		// Drop pure macro; sort company-specific headlines first, then sector by recency
		const relevant = classified
			.filter((c) => c.type !== "macro")
			.sort((a, b) => {
				if (a.type === "company" && b.type !== "company") return -1;
				if (a.type !== "company" && b.type === "company") return 1;
				return b.article.datetime - a.article.datetime;
			})
			.slice(0, 8);

		if (relevant.length === 0) {
			res.json({ articles: [], earningsSignal: { status: "none", date: null }, trendCards: [] });
			return;
		}

		// Extract earnings signal from raw articles before Gemini (keyword-based, instant)
		const earningsSignal = extractEarningsSignal(relevant.map((c) => c.article));

		const simplified = await simplifyArticles(
			relevant.map((c) => c.article),
			relevant.map((c) => c.type),
		);

		// Convert top company articles into trend cards
		const trendCards = articlesToTrendCards(simplified, ticker);

		res.json({ articles: simplified, earningsSignal, trendCards });
	} catch (error) {
		console.error("Error fetching company news:", error);
		res.status(500).json({ error: "Failed to fetch company news" });
	}
});

// GET /api/news/search?q=:query — keyword or ticker search
newsRouter.get("/search", async (req, res) => {
	const q = (req.query.q as string | undefined)?.trim();
	if (!q || q.length < 2) {
		res.status(400).json({ error: "Query must be at least 2 characters" });
		return;
	}
	try {
		const articles = await searchNewsArticles(q);
		if (articles.length === 0) {
			res.json({ articles: [] });
			return;
		}
		const simplified = await simplifyArticles(
			articles,
			articles.map(() => "sector" as const),
		);
		res.json({ articles: simplified });
	} catch (error) {
		console.error("Error searching news:", error);
		res.status(500).json({ error: "Failed to search news" });
	}
});

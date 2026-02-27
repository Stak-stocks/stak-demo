import { Router } from "express";
import { getMarketNews, getCompanyNews, classifyArticle, searchNewsArticles, type FinnhubArticle } from "../services/finnhubService.js";
import { simplifyArticles, classifyEarnings } from "../services/geminiService.js";

export const newsRouter = Router();

// ── Earnings signal extraction from article headlines ────────────────────────
const EARNINGS_CORE = [
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
const BEAT_WORDS = [
	"beat", "topped", "exceeded", "surpassed", "above expectations",
	"better than expected", "blew past", "smashed estimates", "topped estimates",
	"beat on revenue", "revenue beat", "narrowed loss", "smaller loss",
	"loss narrowed", "ahead of estimates", "ahead of expectations",
];
const MISS_WORDS = [
	"missed", "miss", "fell short", "below expectations", "worse than expected",
	"disappointed", "came in below", "missed estimates", "below estimate",
	"widened loss", "loss widened", "miss on revenue", "revenue miss",
	"below consensus", "trailed estimates",
];
const UPCOMING_WORDS = [
	"upcoming earnings", "reports earnings on", "will report earnings",
	"scheduled to report", "earnings date", "earnings call scheduled",
	"due to report", "set to report", "earnings preview", "what to expect from",
];

// Only flag "upcoming" if the article was published within this window
const UPCOMING_WINDOW_DAYS = 14;

interface EarningsSignal {
	status: "upcoming" | "beat" | "miss" | "none";
	date: string | null;
}

/** Scan articles for an earnings signal. Uses keywords first, Gemini as fallback for ambiguous cases. */
async function extractEarningsSignal(articles: FinnhubArticle[]): Promise<EarningsSignal> {
	const nowMs = Date.now();
	const windowMs = UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

	for (const article of articles) {
		const text = `${article.headline} ${article.summary}`.toLowerCase();
		if (!EARNINGS_CORE.some((k) => text.includes(k))) continue;

		const dateStr = new Date(article.datetime * 1000).toISOString().split("T")[0];
		const articleAgeMs = nowMs - article.datetime * 1000;

		// Upcoming: recent article mentioning a future earnings event
		if (UPCOMING_WORDS.some((k) => text.includes(k)) && articleAgeMs < windowMs) {
			return { status: "upcoming", date: dateStr };
		}

		// Beat: explicit positive keyword
		if (BEAT_WORDS.some((k) => text.includes(k))) return { status: "beat", date: dateStr };

		// Miss: explicit negative keyword
		if (MISS_WORDS.some((k) => text.includes(k))) return { status: "miss", date: dateStr };

		// Ambiguous earnings article — ask Gemini to classify
		const geminiResult = await classifyEarnings(article.headline, article.summary);
		if (geminiResult !== "none") return { status: geminiResult, date: dateStr };
	}
	return { status: "none", date: null };
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

// GET /api/news/company/:symbol — company + sector news with earnings signal
newsRouter.get("/company/:symbol", async (req, res) => {
	try {
		const { symbol } = req.params;
		const ticker = symbol.toUpperCase();
		const companyName = req.query.name as string | undefined;

		// Fetch more candidates so we can re-rank by specificity before capping at 8
		const articles = await getCompanyNews(ticker, 24, companyName);

		if (articles.length === 0) {
			res.json({ articles: [], earningsSignal: { status: "none", date: null } });
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

		// Extract earnings signal from all raw articles in parallel with simplification
		const [earningsSignal, simplified] = await Promise.all([
			extractEarningsSignal(articles),
			relevant.length > 0
				? simplifyArticles(relevant.map((c) => c.article), relevant.map((c) => c.type))
				: Promise.resolve([]),
		]);

		if (relevant.length === 0) {
			res.json({ articles: [], earningsSignal });
			return;
		}

		res.json({ articles: simplified, earningsSignal });
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

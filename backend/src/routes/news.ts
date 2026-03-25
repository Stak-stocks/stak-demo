import { Router } from "express";
import { getMarketNews, getCompanyNews, classifyArticle, searchNewsArticles, type FinnhubArticle } from "../services/finnhubService.js";
import { simplifyArticles, classifyEarnings, filterMarketRelevant } from "../services/geminiService.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

const MARKET_NEWS_TTL_MS  = 15 * 60 * 1000; // 15 minutes
const COMPANY_NEWS_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SEARCH_NEWS_TTL_MS  =  5 * 60 * 1000; //  5 minutes

export const newsRouter = Router();

// ── Non-financial content filter ─────────────────────────────────────────────
const NON_FINANCIAL_KEYWORDS = [
	// Academic / research
	"researchgate", "abstract", "methodology", "case study", "literature review",
	"peer-reviewed", "peer reviewed", "scientific american", "arxiv", "pubmed",
	"scientific reports", "journal of", "meta-analysis", "randomized trial",
	"research paper", "university study", "hypothesis", "clinical study",
	"dissertation", "scholarly", "academic journal", "neuroscience", "paleontology",
	"archaeology", "astronomy", "astrophysics", "marine biology", "ecology study",
	// Entertainment
	"film review", "tv show", "trailer", "director", "cast member",
	"actor", "actress", "celebrity", "album release", "concert tour", "spoiler",
	"streaming now", "grammy", "oscar", "emmy", "golden globe", "music video",
	"new album", "season finale", "reality show", "podcast episode", "box office hit",
	"tiktok viral", "youtube video", "viral video", "movie review", "new movie",
	"new series", "binge watch", "fan theory", "comic con", "anime", "manga",
	"video game release", "game review", "esports tournament", "twitch stream",
	"new song", "music tour", "festival lineup", "celebrity gossip", "red carpet",
	"award show", "mtv awards", "bet awards", "billboard chart",
	// Wrestling / combat entertainment
	"wwe", "wrestlemania", "wwe raw", "smackdown", "aew wrestling", "wwe champion",
	"wrestling match", "royal rumble", "summerslam", "monday night raw",
	"pro wrestling", "ufc fight night", "bellator mma",
	// Sports (non-financial)
	"nfl draft", "nba trade", "fifa", "premier league", "la liga", "champions league",
	"match result", "game recap", "touchdown", "hat trick", "transfer window",
	"super bowl", "world cup", "nba finals", "stanley cup",
	"boxing match", "tennis tournament", "golf tournament", "olympic games",
	"mlb season", "nhl season", "sports highlights", "sports scores",
	"fantasy football", "fantasy sports", "draft picks", "trade deadline",
	"roster move", "injury report", "player stats", "game preview", "halftime",
	"march madness", "ncaa tournament", "college football", "college basketball",
	"formula 1 race", "f1 race", "nascar race", "motogp",
	// Personal finance / lifestyle
	"side hustle", "passive income", "how i earned", "quit my job", "started a business",
	"budgeting tips", "credit score tips", "retirement tips", "career advice",
	"entrepreneurship tips", "get rich quick", "financial freedom", "dave ramsey",
	"weight loss", "fitness tips", "diet plan", "mental health tips",
	"relationship advice", "travel guide", "travel tips", "recipe", "cooking tips",
	"home decor", "fashion tips", "beauty tips", "skincare routine",
	"horoscope", "zodiac", "astrology", "meditation guide", "self help",
	"morning routine", "productivity tips", "life hack", "parenting tips",
	"pet care", "dog training", "cat care", "gardening tips",
	// Political (no market angle)
	"political rally", "campaign trail", "election debate", "poll numbers",
	"approval rating", "political speech", "party convention",
	"gun control debate", "abortion rights rally", "social justice protest",
];

function isNonFinancial(headline: string, summary: string): boolean {
	const text = `${headline} ${summary}`.toLowerCase();
	return NON_FINANCIAL_KEYWORDS.some((kw) => text.includes(kw));
}

// ── Topic diversity cap ───────────────────────────────────────────────────────
const STOP_WORDS = new Set([
	"the","and","for","that","with","this","from","have","will","been","their",
	"about","more","also","into","after","over","when","than","then","were","what",
	"which","there","they","some","other","would","could","said","says","new","its",
	"has","are","was","but","not","can","may","all","had","one","our","out","who",
]);

function extractTerms(headline: string): string[] {
	return headline.toLowerCase()
		.replace(/[^a-z\s]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length > 4 && !STOP_WORDS.has(w));
}

/** Ensure no single topic dominates — max `maxPerCluster` articles per topic cluster. */
function capByTopicDiversity(articles: FinnhubArticle[], maxPerCluster = 2): FinnhubArticle[] {
	const clusters: { terms: Set<string>; count: number }[] = [];
	const result: FinnhubArticle[] = [];

	for (const article of articles) {
		const terms = new Set(extractTerms(article.headline));
		const match = clusters.find((c) => [...terms].some((t) => c.terms.has(t)));

		if (match) {
			if (match.count >= maxPerCluster) continue;
			match.count++;
			for (const t of terms) match.terms.add(t);
		} else {
			clusters.push({ terms, count: 1 });
		}
		result.push(article);
	}
	return result;
}

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

		// Let Gemini determine beat/miss — more accurate than keyword matching
		// which produces false positives (e.g. "misses revenue" ≠ overall miss)
		const geminiResult = await classifyEarnings(article.headline, article.summary);
		if (geminiResult !== "none") return { status: geminiResult, date: dateStr };
	}
	return { status: "none", date: null };
}

// GET /api/news/market — market-wide news (already macro-curated by Finnhub general endpoint)
newsRouter.get("/market", async (_req, res) => {
	const cacheKey = "news:market";
	try {
		const cached = await cacheGet<object>(cacheKey);
		if (cached) { res.json(cached); return; }

		const raw = await getMarketNews(40);
		const articles = capByTopicDiversity(raw, 2).slice(0, 16);
		const simplified = await simplifyArticles(articles, articles.map(() => "macro" as const));
		const result = { articles: simplified };
		if (simplified.length > 0) await cacheSet(cacheKey, result, MARKET_NEWS_TTL_MS);
		res.json(result);
	} catch (error) {
		console.error("Error fetching market news:", error);
		res.status(500).json({ error: "Failed to fetch market news" });
	}
});

// GET /api/news/company/:symbol — company + sector news with earnings signal
newsRouter.get("/company/:symbol", async (req, res) => {
	const { symbol } = req.params;
	const ticker = symbol.toUpperCase();
	const companyName = req.query.name as string | undefined;
	const cacheKey = `news:company:${ticker}`;
	try {
		const cached = await cacheGet<object>(cacheKey);
		if (cached) { res.json(cached); return; }

		const articles = await getCompanyNews(ticker, 24, companyName);

		if (articles.length === 0) {
			res.json({ articles: [], earningsSignal: { status: "none", date: null } });
			return;
		}

		const classified = articles.map((a) => ({ article: a, type: classifyArticle(a, companyName, ticker) }));

		const relevant = classified
			.filter((c) => c.type !== "macro")
			.sort((a, b) => {
				if (a.type === "company" && b.type !== "company") return -1;
				if (a.type !== "company" && b.type === "company") return 1;
				return b.article.datetime - a.article.datetime;
			})
			.slice(0, 8);

		const [earningsSignal, simplified] = await Promise.all([
			extractEarningsSignal(articles),
			relevant.length > 0
				? simplifyArticles(relevant.map((c) => c.article), relevant.map((c) => c.type))
				: Promise.resolve([]),
		]);

		const result = relevant.length === 0
			? { articles: [], earningsSignal }
			: { articles: simplified, earningsSignal };

		if (simplified.length > 0) await cacheSet(cacheKey, result, COMPANY_NEWS_TTL_MS);
		res.json(result);
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
	const cacheKey = `news:search:${q.toLowerCase()}`;
	try {
		const cached = await cacheGet<object>(cacheKey);
		if (cached) { res.json(cached); return; }

		const raw = await searchNewsArticles(q);
		const keywordFiltered = raw.filter((a) => !isNonFinancial(a.headline, a.summary));
		const articles = await filterMarketRelevant(keywordFiltered, q);
		if (articles.length === 0) {
			res.json({ articles: [] });
			return;
		}
		const simplified = await simplifyArticles(
			articles,
			articles.map(() => "sector" as const),
		);
		const result = { articles: simplified };
		await cacheSet(cacheKey, result, SEARCH_NEWS_TTL_MS);
		res.json(result);
	} catch (error) {
		console.error("Error searching news:", error);
		res.status(500).json({ error: "Failed to search news" });
	}
});

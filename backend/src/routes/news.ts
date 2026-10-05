import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getMarketNews, getCompanyNews, classifyArticle, searchNewsArticles, type FinnhubArticle } from "../services/finnhubService.js";
import { simplifyArticles, classifyEarnings, filterMarketRelevant, type SimplifiedArticle } from "../services/geminiService.js";
import { EARNINGS_CORE } from "../services/earningsResultConsensus.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { singleFlight } from "../lib/singleFlight.js";
import { brands } from "@stak/shared/brands";

// The catalogue's name for each ticker, so an article can be matched to its company
// without the caller having to send the name.
const NAME_BY_TICKER = new Map(brands.map((b) => [b.ticker.toUpperCase(), b.name]));

const MARKET_NEWS_TTL_MS  = 15 * 60 * 1000; // 15 minutes
const COMPANY_NEWS_TTL_MS = 15 * 60 * 1000; // 15 minutes
const EMPTY_COMPANY_NEWS_TTL_MS = 5 * 60 * 1000; // a company with nothing (or a failed summary): asked again in 5 minutes
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
	"film review", "tv show", "movie trailer", "cast member",
	"actor", "actress", "celebrity gossip", "album release", "concert tour", "spoiler",
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
	"horoscope", "astrology reading", "meditation guide", "self help",
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
		.replaceAll(/[^a-z\s]/g, " ")
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
// EARNINGS_CORE lives in earningsResultConsensus.ts -- shared with stock.ts's
// resolveEarningsStatus, which uses it to decide when to check for a confirmed
// result sooner instead of waiting on Finnhub's calendar/EPS-history alone.
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
	// v2: built from articles cleaned of encoding damage when fetched.
	const cacheKey = "news:market:v2";
	try {
		const cached = await cacheGet<object>(cacheKey);
		if (cached) { res.json(cached); return; }

		const raw = await getMarketNews(30);
		const articles = capByTopicDiversity(raw, 2).slice(0, 10);
		const simplified = await simplifyArticles(articles, articles.map(() => "macro" as const));
		const result = { articles: simplified };
		if (simplified.length > 0) await cacheSet(cacheKey, result, MARKET_NEWS_TTL_MS);
		res.json(result);
	} catch (error) {
		console.error("Error fetching market news:", error);
		res.status(500).json({ error: "Failed to fetch market news" });
	}
});

type CompanyNews = { articles: SimplifiedArticle[]; earningsSignal: Awaited<ReturnType<typeof extractEarningsSignal>> };

/**
 * A company's news (its own stories first, then ones about its sector) with an earnings signal, cached 15 minutes.
 * Callers asking for the same company (and name) while it's being built share the one build. A company with nothing to
 * show is remembered for 5 minutes too, so repeat requests don't rebuild it. `callerName` is only ever the caller's own: getCompanyNews falls back to NewsAPI whenever it's given a name and Finnhub comes back empty, so
 * handing it the catalogue name would turn that fallback on for every request and a Finnhub outage would spend the
 * NewsAPI quota. The catalogue name only classifies.
 */
async function companyNews(ticker: string, callerName?: string): Promise<CompanyNews> {
	// The catalogue knows every Stak stock's name, so a caller that doesn't send one (Android never did) still gets
	// its articles matched by name: without it a Tesla headline counted only if it happened to spell out "TSLA".
	const companyName = NAME_BY_TICKER.get(ticker) ?? callerName;
	// v2: classified by whole-word name/ticker; v1 entries carry the substring labels.
	// v3: articles are cleaned of encoding damage when fetched; v2 copies still hold it.
	const cacheKey = `news:company:v3:${ticker}`;
	const cached = await cacheGet<CompanyNews>(cacheKey);
	if (cached) return cached;
	// Empty answers are kept apart per name: a nameless miss mustn't stop a named caller trying the NewsAPI fallback.
	const emptyKey = `${cacheKey}:empty:${callerName ?? ""}`;
	const empty = await cacheGet<CompanyNews>(emptyKey);
	if (empty) return empty;

	return singleFlight(`${cacheKey}:${callerName ?? ""}`, async () => {
		const articles = await getCompanyNews(ticker, 24, callerName);
		if (articles.length === 0) {
			const none: CompanyNews = { articles: [], earningsSignal: { status: "none", date: null } };
			await cacheSet(emptyKey, none, EMPTY_COMPANY_NEWS_TTL_MS);
			return none;
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

		const result: CompanyNews = { articles: relevant.length === 0 ? [] : simplified, earningsSignal };
		if (simplified.length > 0) await cacheSet(cacheKey, result, COMPANY_NEWS_TTL_MS);
		else await cacheSet(emptyKey, result, EMPTY_COMPANY_NEWS_TTL_MS);
		return result;
	});
}

// GET /api/news/company/:symbol — company + sector news with earnings signal
newsRouter.get("/company/:symbol", async (req, res) => {
	try {
		res.json(await companyNews(req.params.symbol.toUpperCase(), req.query.name as string | undefined));
	} catch (error) {
		console.error("Error fetching company news:", error);
		res.status(500).json({ error: "Failed to fetch company news" });
	}
});

/** The most companies one For You request covers - the apps read the newest saves, 10 at most. */
const FOR_YOU_MAX_TICKERS = 10;
/** How long For You waits for companies that aren't cached yet; slower ones keep building and come back as `pending`. */
const FOR_YOU_WAIT_MS = 6_000;
/** One request can start up to 10 builds, so For You gets a tighter allowance than the rest of /api/news. */
const forYouLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests, please try again later." } });

// POST /api/news/for-you { tickers } — every company's news for the For You list in one request, instead of one
// request per saved stock. Catalogue tickers only (each cold one costs a summary). Cached companies answer at once;
// one still building after FOR_YOU_WAIT_MS is listed in `pending` (its build carries on and fills the cache, so the
// apps ask again once), and one that fails comes back empty. Each company is the entry /company/:symbol serves.
newsRouter.post("/for-you", forYouLimiter, async (req, res) => {
	const raw: unknown = req.body?.tickers;
	if (!Array.isArray(raw)) { res.status(400).json({ error: "tickers must be an array" }); return; }
	const tickers = [...new Set(raw.filter((t): t is string => typeof t === "string").map((t) => t.trim().toUpperCase()))]
		.filter((t) => NAME_BY_TICKER.has(t))
		.slice(0, FOR_YOU_MAX_TICKERS);

	const TIMED_OUT = Symbol("pending");
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<typeof TIMED_OUT>((resolve) => { timer = setTimeout(() => resolve(TIMED_OUT), FOR_YOU_WAIT_MS); });
	const settled = await Promise.all(tickers.map(async (ticker) => {
		try {
			const got = await Promise.race([companyNews(ticker), deadline]);
			return got === TIMED_OUT ? { ticker, articles: [] as SimplifiedArticle[], pending: true } : { ticker, articles: got.articles, pending: false };
		} catch (error) {
			console.warn(`[news] For You: ${ticker} failed:`, (error as Error)?.message);
			return { ticker, articles: [] as SimplifiedArticle[], pending: false };
		}
	}));
	clearTimeout(timer);
	res.json({
		results: settled.map(({ ticker, articles }) => ({ ticker, articles })),
		pending: settled.filter((r) => r.pending).map((r) => r.ticker),
	});
});

// GET /api/news/search?q=:query — keyword or ticker search
newsRouter.get("/search", async (req, res) => {
	const q = (req.query.q as string | undefined)?.trim();
	if (!q || q.length < 2) {
		res.status(400).json({ error: "Query must be at least 2 characters" });
		return;
	}
	// v2: search results (NewsAPI included) are cleaned of encoding damage when fetched.
	const cacheKey = `news:search:v2:${q.toLowerCase()}`;
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

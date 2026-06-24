import { cacheGet, cacheSet } from "../lib/cache.js";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

/** Collect all configured Finnhub API keys (FINNHUB_API_KEY, FINNHUB_API_KEY_2, FINNHUB_API_KEY_3) */
function getApiKeys(): string[] {
	return [
		process.env.FINNHUB_API_KEY,
		process.env.FINNHUB_API_KEY_2,
		process.env.FINNHUB_API_KEY_3,
	].filter((k): k is string => !!k);
}

/**
 * Fetch a Finnhub URL, rotating through available API keys on 403/429.
 * Returns the Response on success, or null if all keys are rate-limited.
 */
async function finnhubFetch(buildUrl: (key: string) => string): Promise<Response | null> {
	const keys = getApiKeys();
	if (keys.length === 0) throw new Error("No FINNHUB_API_KEY configured");

	for (const key of keys) {
		const res = await fetch(buildUrl(key));
		if (res.status === 403 || res.status === 429) {
			console.warn(`Finnhub rate limited (${res.status}) on key ...${key.slice(-4)} — trying next`);
			continue;
		}
		return res; // success or a real error — let caller decide
	}

	console.warn("All Finnhub API keys rate limited");
	return null;
}

export interface FinnhubArticle {
	headline: string;
	summary: string;
	url: string;
	image: string;
	source: string;
	datetime: number;
	category: string;
	id: number;
	related: string;
}

const ONE_WEEK_AGO_MS = 7 * 24 * 60 * 60 * 1000;

const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes


const FINANCIAL_TERMS = [
	// Core P&L
	"stock", "share", "shares", "revenue", "earnings", "profit", "loss", "sales",
	"margin", "cash flow", "balance sheet", "income statement", "ebitda", "eps",
	// Time periods
	"quarter", "quarterly", "fiscal", "annual", "q1", "q2", "q3", "q4", "full year",
	// Corporate events
	"ipo", "acquisition", "merger", "buyout", "takeover", "spin-off", "spinoff",
	"divest", "divestiture", "going public", "going private",
	// Leadership / org
	"ceo", "cfo", "cto", "coo", "chief executive", "chief financial", "board of directors",
	"executive", "management team", "appoint", "resign", "fired",
	// Investors / markets
	"investor", "analyst", "hedge fund", "private equity", "venture capital",
	"nasdaq", "nyse", "s&p", "dow jones", "market cap", "valuation",
	"listed", "delisted", "ipo price", "trading halt",
	// Guidance / ratings
	"forecast", "guidance", "outlook", "estimate", "price target",
	"upgrade", "downgrade", "rating", "overweight", "underweight",
	"buy rating", "sell rating", "hold rating",
	// Returns / capital allocation
	"dividend", "buyback", "share repurchase", "stock split",
	// Workforce
	"layoff", "lay off", "job cut", "headcount", "restructur", "reorganiz",
	"bankrupt", "chapter 11", "chapter 7", "default",
	// Macro / regulatory
	"interest rate", "federal reserve", "fed rate", "inflation", "tariff",
	"antitrust", "regulation", "sec investigation", "ftc", "doj",
	"lawsuit", "settlement", "fine", "penalty", "class action",
	// Growth / momentum
	"record revenue", "record profit", "beat expectation", "miss expectation",
	"raised guidance", "lowered guidance", "subscription", "user growth",
	// Supply chain / ops
	"supply chain", "shortage", "inventory", "demand outlook",
];

const SPORTS_TERMS = [
	// Leagues
	"nfl", "nba", "mlb", "nhl", "mls", "ncaa", "pga tour", "ufc", "wwe",
	// NFL teams
	"seahawks", "cowboys", "patriots", "chiefs", "eagles", "49ers", "giants",
	"jets", "bears", "packers", "steelers", "ravens", "broncos", "chargers",
	"raiders", "dolphins", "bills", "browns", "bengals", "colts", "titans",
	"jaguars", "texans", "falcons", "saints", "panthers", "buccaneers",
	"cardinals", "rams", "vikings", "lions", "commanders",
	// NBA teams
	"lakers", "celtics", "bulls", "warriors", "knicks", "heat", "spurs",
	"thunder", "clippers", "mavericks", "nuggets", "suns", "bucks", "76ers",
	"raptors", "pelicans", "jazz", "grizzlies", "rockets", "magic", "pistons",
	"cavaliers", "wizards", "blazers",
	// MLB teams
	"yankees", "red sox", "dodgers", "cubs", "mets", "braves", "astros",
	"phillies", "nationals", "mariners", "padres", "rockies", "marlins",
	"brewers", "orioles", "tigers", "white sox", "twins", "royals",
	// Sports events
	"super bowl", "world series", "march madness", "nba finals", "stanley cup",
	"olympic", "world cup", "wimbledon", "us open", "masters tournament",
	// Sports plays / actions
	"touchdown", "quarterback", "slam dunk", "home run", "hat trick",
	"penalty kick", "free throw", "grand slam",
	// Sports context
	"playoffs", "championship game", "draft pick", "free agent", "trade deadline",
	"halftime", "game day", "stadium naming rights", "jersey sponsor",
	"arena naming", "sports sponsorship", "naming rights",
];

// Signals that mark an article as primarily macro / market-wide
const MACRO_SIGNALS = [
	"federal reserve", "fed raises", "fed cuts", "fed holds", "fed hikes",
	"fomc", "jerome powell", "janet yellen",
	"interest rate", "rate cut", "rate hike", "rate decision", "rate pause",
	"inflation report", "cpi report", "ppi report", "cpi rises", "cpi falls",
	"cpi climbs", "inflation data", "inflation hits", "inflation slows",
	"recession", "economic slowdown", "gdp growth", "gdp shrinks", "gdp contracts",
	"bond yield", "treasury yield", "10-year yield", "yield curve",
	"tariff", "trade war", "trade policy", "import tax", "export ban",
	"jobs report", "unemployment rate", "nonfarm payroll", "labor market data",
	"central bank", "monetary policy", "fiscal policy",
	"national debt", "debt ceiling", "budget deficit",
];

/** Classify an article as macro, company-specific, or sector-level */
export function classifyArticle(
	article: FinnhubArticle,
	companyName?: string,
	ticker?: string,
): "macro" | "sector" | "company" {
	const headline = article.headline.toLowerCase();
	const body = `${headline} ${article.summary.toLowerCase()}`;

	// Company: company name or ticker appears in the headline
	if (companyName && headline.includes(companyName.toLowerCase())) return "company";
	if (ticker && headline.includes(ticker.toLowerCase())) return "company";

	// Macro: strong market-wide signal in headline or summary
	if (MACRO_SIGNALS.some((s) => body.includes(s))) return "macro";

	return "sector";
}

/** Returns true if the article is likely financially relevant to the stock */
function isStockRelevant(article: FinnhubArticle): boolean {
	const text = `${article.headline} ${article.summary}`.toLowerCase();
	const hasSports = SPORTS_TERMS.some((t) => text.includes(t));
	if (!hasSports) return true;
	const hasFinance = FINANCIAL_TERMS.some((t) => text.includes(t));
	return hasFinance; // sports article only survives if it also has financial content
}

/**
 * Stricter filter for search results: the article must contain at least one
 * financial term or macro signal, not just "not be about sports".
 * Prevents lifestyle, politics, or entertainment results from appearing.
 */
function isFinanciallyRelevant(article: FinnhubArticle): boolean {
	const text = `${article.headline} ${article.summary}`.toLowerCase();
	return (
		FINANCIAL_TERMS.some((t) => text.includes(t)) ||
		MACRO_SIGNALS.some((t) => text.includes(t))
	);
}

const MARKET_CACHE_KEY = "market:all";

/** Fetches fresh general market news from Finnhub and populates the shared cache pool. */
async function fetchFreshMarketNews(): Promise<FinnhubArticle[]> {
	const cutoff = Math.floor((Date.now() - ONE_WEEK_AGO_MS) / 1000); // unix seconds
	const res = await finnhubFetch((key) => `${FINNHUB_BASE}/news?category=general&token=${key}`);
	if (!res) return []; // all keys rate-limited
	if (!res.ok) {
		// 5xx = transient server error — log and return empty rather than throwing
		console.warn(`Finnhub market news unavailable (${res.status}) — returning empty`);
		return [];
	}
	const data: FinnhubArticle[] = await res.json();
	const finnhubFiltered = data.filter((a) => a.headline && a.summary && a.datetime >= cutoff && isStockRelevant(a));

	// Supplement with geopolitical energy news (Iran war, OPEC, Middle East oil)
	// so major events that move markets surface in the feed even if Finnhub misses them
	const geoNews = await getGeopoliticalEnergyNews();
	const seenUrls = new Set(finnhubFiltered.map((a) => a.url));
	const merged = [
		...finnhubFiltered,
		...geoNews.filter((a) => !seenUrls.has(a.url)),
	];
	await cacheSet(MARKET_CACHE_KEY, merged, NEWS_CACHE_TTL_MS);
	return merged;
}

/** Fetch general market news (IPOs, interest rates, macro events).
 *  Returns up to `limit` articles from the past 7 days. */
export async function getMarketNews(limit = 30): Promise<FinnhubArticle[]> {
	const pool = (await cacheGet<FinnhubArticle[]>(MARKET_CACHE_KEY)) ?? await fetchFreshMarketNews();
	return [...pool].sort((a, b) => b.datetime - a.datetime).slice(0, limit);
}

/**
 * Some brands in the app use non-US tickers (Euronext, TSE, etc.) that
 * Finnhub free-tier doesn't support for company news.
 * Map them to their US ADR equivalents so news still loads.
 */
const ADR_MAP: Record<string, string> = {
	OR: "LRLCY",    // L'Oreal → ADR
	EL: "EL",       // Estée Lauder is already NYSE-listed
	ASML: "ASML",   // ASML trades on Nasdaq (fine as-is)
	TSM: "TSM",     // TSMC trades on NYSE (fine as-is)
};

function resolveNewsSymbol(symbol: string): string {
	return ADR_MAP[symbol.toUpperCase()] ?? symbol;
}

/** Fetch company news from NewsAPI by company name (fallback for non-US stocks).
 *  Returns up to `limit` headlines from the past 7 days. */
async function getNewsApiArticles(companyName: string, limit: number): Promise<FinnhubArticle[]> {
	const apiKey = process.env.NEWSAPI_KEY;
	if (!apiKey) return [];

	const sevenDaysAgo = new Date(Date.now() - ONE_WEEK_AGO_MS).toISOString().split("T")[0];
	const quotedName = encodeURIComponent('"' + companyName + '"');
	const url = `https://newsapi.org/v2/everything?q=${quotedName}&language=en&sortBy=publishedAt&pageSize=${limit}&from=${sevenDaysAgo}&apiKey=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) {
		console.warn(`NewsAPI error: ${res.status}`);
		return [];
	}

	const data = await res.json();
	return (data.articles ?? [])
		.filter((a: { title?: string; description?: string }) => a.title && a.description)
		.map((a: { title: string; description: string; url: string; urlToImage?: string; source?: { name?: string }; publishedAt: string }) => ({
			headline: a.title,
			summary: a.description,
			url: a.url,
			image: a.urlToImage ?? "",
			source: a.source?.name ?? "NewsAPI",
			datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000),
			category: "general",
			id: 0,
			related: "",
		}))
		.slice(0, limit);
}

/** Oil/energy tickers where geopolitical news (Iran, OPEC, Middle East) is directly price-relevant */
const OIL_ENERGY_TICKERS = new Set([
	"XOM", "CVX", "COP", "OXY", "PSX", "VLO", "MPC", "HAL", "SLB", "BKR",
	"EOG", "PXD", "DVN", "MRO", "BP", "SHEL", "TTE", "ENB", "ET",
]);

/** Fetch geopolitical energy news (Iran, Middle East, OPEC) from NewsAPI.
 *  Supplements market feed and oil company news tabs with major events that move prices. */
async function getGeopoliticalEnergyNews(): Promise<FinnhubArticle[]> {
	const CACHE_KEY = "geo:energy";
	const cached = await cacheGet<FinnhubArticle[]>(CACHE_KEY);
	if (cached) return cached;

	const apiKey = process.env.NEWSAPI_KEY;
	if (!apiKey) return [];

	const sevenDaysAgo = new Date(Date.now() - ONE_WEEK_AGO_MS).toISOString().split("T")[0];
	const q = encodeURIComponent('Iran war oil OR Iran oil sanctions OR Middle East conflict oil OR OPEC crude');
	const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=10&from=${sevenDaysAgo}&apiKey=${apiKey}`;

	try {
		const res = await fetch(url);
		if (!res.ok) return [];
		const data = await res.json();
		const articles: FinnhubArticle[] = (data.articles ?? [])
			.filter((a: { title?: string; description?: string }) => a.title && a.description)
			.map((a: { title: string; description: string; url: string; urlToImage?: string; source?: { name?: string }; publishedAt: string }) => ({
				headline: a.title,
				summary: a.description,
				url: a.url,
				image: a.urlToImage ?? "",
				source: a.source?.name ?? "NewsAPI",
				datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000),
				category: "general",
				id: 0,
				related: "",
			}));
		await cacheSet(CACHE_KEY, articles, NEWS_CACHE_TTL_MS);
		return articles;
	} catch {
		return [];
	}
}

/** Fetch company-specific news for a given ticker symbol.
 *  Falls back to NewsAPI by company name when Finnhub returns nothing (e.g. non-US stocks).
 *  Returns up to `limit` articles from the past 7 days. */
export async function getCompanyNews(symbol: string, limit = 15, companyName?: string): Promise<FinnhubArticle[]> {
	const cacheKey = `company:${symbol}:${limit}`;
	const cached = await cacheGet<FinnhubArticle[]>(cacheKey);
	if (cached) return cached;

	const newsSymbol = resolveNewsSymbol(symbol);
	const today = new Date().toISOString().split("T")[0];
	const sevenDaysAgo = new Date(Date.now() - ONE_WEEK_AGO_MS).toISOString().split("T")[0];

	const res = await finnhubFetch(
		(key) => `${FINNHUB_BASE}/company-news?symbol=${newsSymbol}&from=${sevenDaysAgo}&to=${today}&token=${key}`,
	);

	if (res && res.ok) {
		const data: FinnhubArticle[] = await res.json();
		const filtered = data.filter((a) => a.headline && a.summary && isStockRelevant(a));
		filtered.sort((a, b) => b.datetime - a.datetime);
		if (filtered.length > 0) {
			// For oil/energy tickers, supplement with geopolitical news (Iran war, OPEC, Middle East)
			// since these events directly drive oil prices regardless of the company's own headlines
			if (OIL_ENERGY_TICKERS.has(symbol.toUpperCase())) {
				const geoNews = await getGeopoliticalEnergyNews();
				const seenUrls = new Set(filtered.map((a) => a.url));
				const combined = [
					...filtered,
					...geoNews.filter((a) => !seenUrls.has(a.url)),
				].slice(0, limit);
				await cacheSet(cacheKey, combined, NEWS_CACHE_TTL_MS);
				return combined;
			}
			const result = filtered.slice(0, limit);
			await cacheSet(cacheKey, result, NEWS_CACHE_TTL_MS);
			return result;
		}
	} else if (res && !res.ok) {
		console.warn(`Finnhub company news unavailable (${res.status}) for ${symbol} — trying fallback`);
	}

	// Finnhub returned nothing (rate-limited, unsupported ticker, or 0 articles) — try NewsAPI
	if (companyName) {
		console.info(`Finnhub returned 0 articles for ${symbol} — falling back to NewsAPI for "${companyName}"`);
		const fallback = await getNewsApiArticles(companyName, limit);
		if (fallback.length > 0) await cacheSet(cacheKey, fallback, NEWS_CACHE_TTL_MS);
		return fallback;
	}

	return [];
}

/**
 * Search news by any keyword, company name, topic, or ticker.
 * Filters the Finnhub market news pool first (same source as the feed).
 * If fewer than 8 results are found, supplements with NewsAPI to fill the gap.
 * Returns up to 20 articles sorted by recency.
 */
export async function searchNewsArticles(query: string): Promise<FinnhubArticle[]> {
	const q = query.trim().toLowerCase();
	const cacheKey = `search:${q}`;
	const cached = await cacheGet<FinnhubArticle[]>(cacheKey);
	if (cached) return cached;

	const pool = (await cacheGet<FinnhubArticle[]>(MARKET_CACHE_KEY)) ?? await fetchFreshMarketNews();
	const fromFinnhub = pool
		.filter((a) => a.headline.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q))
		.sort((a, b) => b.datetime - a.datetime);

	let result = fromFinnhub;

	// Supplement with NewsAPI if Finnhub cache doesn't have enough
	if (fromFinnhub.length < 8) {
		const extra = await getNewsApiArticles(query.trim(), 25);
		const seenUrls = new Set(fromFinnhub.map((a) => a.url));
		const deduped = extra.filter((a) => !seenUrls.has(a.url));
		result = [...fromFinnhub, ...deduped].sort((a, b) => b.datetime - a.datetime);
	}

	result = result.slice(0, 20);
	await cacheSet(cacheKey, result, NEWS_CACHE_TTL_MS);
	return result;
}

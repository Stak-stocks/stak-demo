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

/** Fetch general market news (IPOs, interest rates, macro events).
 *  Returns up to `limit` articles from the past 7 days. */
export async function getMarketNews(limit = 30): Promise<FinnhubArticle[]> {
	const cutoff = Math.floor((Date.now() - ONE_WEEK_AGO_MS) / 1000); // unix seconds

	const res = await finnhubFetch((key) => `${FINNHUB_BASE}/news?category=general&token=${key}`);
	if (!res) return []; // all keys rate-limited
	if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);

	const data: FinnhubArticle[] = await res.json();
	return data
		.filter((a) => a.headline && a.summary && a.datetime >= cutoff && isStockRelevant(a))
		.slice(0, limit);
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

/** Fetch company-specific news for a given ticker symbol.
 *  Returns up to `limit` articles from the past 7 days. */
export async function getCompanyNews(symbol: string, limit = 15): Promise<FinnhubArticle[]> {
	const newsSymbol = resolveNewsSymbol(symbol);
	const today = new Date().toISOString().split("T")[0];
	const sevenDaysAgo = new Date(Date.now() - ONE_WEEK_AGO_MS).toISOString().split("T")[0];

	const res = await finnhubFetch(
		(key) => `${FINNHUB_BASE}/company-news?symbol=${newsSymbol}&from=${sevenDaysAgo}&to=${today}&token=${key}`,
	);
	if (!res) return []; // all keys rate-limited
	if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);

	const data: FinnhubArticle[] = await res.json();
	return data.filter((a) => a.headline && a.summary && isStockRelevant(a)).slice(0, limit);
}

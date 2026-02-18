const FINNHUB_BASE = "https://finnhub.io/api/v1";

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
	"stock", "share", "revenue", "earnings", "profit", "loss", "sales",
	"quarter", "fiscal", "ipo", "acquisition", "merger", "ceo", "cfo",
	"investor", "analyst", "forecast", "guidance", "dividend", "buyback",
	"valuation", "fund", "upgrade", "downgrade", "rating", "results",
	"market cap", "price target", "outlook", "layoff", "restructur",
];

const SPORTS_TERMS = [
	"nfl", "nba", "mlb", "nhl", "mls", "ncaa", "touchdown", "quarterback",
	"playoffs", "championship", "roster", "coach", "draft pick", "game day",
	"halftime", "super bowl", "world series", "march madness",
];

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
	const apiKey = process.env.FINNHUB_API_KEY;
	if (!apiKey) throw new Error("FINNHUB_API_KEY not set");

	const cutoff = Math.floor((Date.now() - ONE_WEEK_AGO_MS) / 1000); // unix seconds

	const res = await fetch(`${FINNHUB_BASE}/news?category=general&token=${apiKey}`);
	if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);

	const data: FinnhubArticle[] = await res.json();

	return data
		.filter((a) => a.headline && a.summary && a.datetime >= cutoff)
		.slice(0, limit);
}

/** Fetch company-specific news for a given ticker symbol.
 *  Returns up to `limit` articles from the past 7 days. */
export async function getCompanyNews(symbol: string, limit = 15): Promise<FinnhubArticle[]> {
	const apiKey = process.env.FINNHUB_API_KEY;
	if (!apiKey) throw new Error("FINNHUB_API_KEY not set");

	const today = new Date().toISOString().split("T")[0];
	const sevenDaysAgo = new Date(Date.now() - ONE_WEEK_AGO_MS).toISOString().split("T")[0];

	const res = await fetch(
		`${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${sevenDaysAgo}&to=${today}&token=${apiKey}`,
	);
	if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);

	const data: FinnhubArticle[] = await res.json();
	return data.filter((a) => a.headline && a.summary && isStockRelevant(a)).slice(0, limit);
}

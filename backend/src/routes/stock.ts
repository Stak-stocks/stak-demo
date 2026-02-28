import { Router } from "express";
import { getEarningsBeatMissFromWeb } from "../services/geminiService.js";

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
		const res = await fetch(`${FINNHUB_BASE}${path}&token=${key}`);
		if (res.status === 403 || res.status === 429) continue;
		if (!res.ok) return null;
		return res.json();
	}
	return null;
}

// Fetch the stock's price % change on (or after) the earnings report date.
// AMC reporters react the next trading day; BMO react same day.
// Uses Yahoo Finance free API for historical daily closes.
async function getPriceChangePct(symbol: string, earningsDate: string, hour: string | null): Promise<number | null> {
	const cacheKey = `price-chg:${symbol}:${earningsDate}`;
	const cached = getCached(cacheKey) as number | null;
	if (cached !== null) return cached;

	const isAmc = !hour || hour === "amc" || hour === "after_trading_hours";
	const base = new Date(earningsDate + "T12:00:00Z");
	const from = Math.floor(new Date(base.getTime() - 5 * 86400000).getTime() / 1000);
	const to   = Math.floor(new Date(base.getTime() + (isAmc ? 2 : 1) * 86400000).getTime() / 1000);

	try {
		const res = await fetch(
			`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`,
			{ headers: { "User-Agent": "Mozilla/5.0" } },
		);
		if (!res.ok) return null;
		const data = await res.json() as {
			chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: number[] }> } }> }
		};
		const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((c): c is number => c != null);
		if (!closes || closes.length < 2) return null;

		const prev = closes[closes.length - 2];
		const reaction = closes[closes.length - 1];
		if (prev === 0) return null;

		const pct = Math.round(((reaction - prev) / prev) * 1000) / 10;
		setCached(cacheKey, pct, 24 * 60 * 60 * 1000);
		return pct;
	} catch {
		return null;
	}
}


// In-memory cache with per-key TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached(key: string): unknown | null {
	const entry = cache.get(key);
	if (entry && entry.expiresAt > Date.now()) return entry.data;
	return null;
}

function setCached(key: string, data: unknown, ttl: number) {
	cache.set(key, { data, expiresAt: Date.now() + ttl });
}

const QUOTE_TTL_MS = 60 * 1000;              // 1 minute
const METRICS_TTL_MS = 6 * 60 * 60 * 1000;  // 6 hours
const EARNINGS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Map non-US tickers to their US-listed equivalents for quote lookups
const TICKER_MAP: Record<string, string> = {
	"OR.PA": "LRLCY",
	OR: "LRLCY",
	"MC.PA": "LVMUY",
};

function resolveSymbol(symbol: string): string {
	return TICKER_MAP[symbol.toUpperCase()] ?? symbol;
}

function formatMarketCap(millions: number): string {
	if (millions >= 1_000_000) return `$${(millions / 1_000_000).toFixed(2)}T`;
	if (millions >= 1_000) return `$${(millions / 1_000).toFixed(1)}B`;
	return `$${millions.toFixed(0)}M`;
}

export const stockRouter = Router();

// ── Earnings Calendar ────────────────────────────────────────────────────────

interface CalendarEntry {
	symbol: string;
	date: string;
	hour: string;
	epsActual: number | null;
	epsEstimate: number | null;
	revenueActual: number | null;
	revenueEstimate: number | null;
}

interface CalendarResponse {
	today: CalendarEntry[];
	tomorrow: CalendarEntry[];
	week: CalendarEntry[];
}

// GET /api/stock/calendar — earnings calendar for today, tomorrow, and this week
// IMPORTANT: must be before /:symbol so "calendar" isn't treated as a symbol
stockRouter.get("/calendar", async (_req, res) => {
	const cacheKey = "earnings:calendar";
	const cached = getCached(cacheKey) as CalendarResponse | null;
	if (cached) { res.json(cached); return; }

	const now = new Date();
	const fmt = (d: Date) => d.toISOString().split("T")[0];
	const todayStr = fmt(now);
	const tomorrowStr = fmt(new Date(now.getTime() + 24 * 60 * 60 * 1000));
	const in7Days = fmt(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

	const data = await finnhubGet(
		`/calendar/earnings?from=${todayStr}&to=${in7Days}`,
	) as { earningsCalendar?: CalendarEntry[] } | null;

	const entries = (data?.earningsCalendar ?? [])
		.filter((e) => e.symbol && !e.symbol.includes("."))
		.map((e) => ({
			symbol: e.symbol,
			date: e.date,
			hour: e.hour,
			epsActual: e.epsActual ?? null,
			epsEstimate: e.epsEstimate ?? null,
			revenueActual: e.revenueActual ?? null,
			revenueEstimate: e.revenueEstimate ?? null,
		}));

	const result: CalendarResponse = {
		today: entries.filter((e) => e.date === todayStr),
		tomorrow: entries.filter((e) => e.date === tomorrowStr),
		week: entries.filter((e) => e.date > tomorrowStr && e.date <= in7Days),
	};

	setCached(cacheKey, result, 15 * 60 * 1000); // 15-min cache
	res.json(result);
});

// ── Popular tickers shown in the market-wide earnings calendar ──────────────
const MARKET_TICKERS: Record<string, string> = {
	AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
	META: "Meta", NVDA: "NVIDIA", TSLA: "Tesla", NFLX: "Netflix",
	AVGO: "Broadcom", AMD: "AMD", INTC: "Intel", QCOM: "Qualcomm",
	ORCL: "Oracle", ADBE: "Adobe", CRM: "Salesforce", CSCO: "Cisco",
	IBM: "IBM", TXN: "Texas Instruments", INTU: "Intuit", NOW: "ServiceNow",
	UBER: "Uber", ABNB: "Airbnb", DASH: "DoorDash", LYFT: "Lyft",
	SPOT: "Spotify", SNAP: "Snap", PINS: "Pinterest", RDDT: "Reddit",
	COIN: "Coinbase", HOOD: "Robinhood", RBLX: "Roblox", U: "Unity",
	PLTR: "Palantir", SOUN: "SoundHound AI", DUOL: "Duolingo", AI: "C3.ai",
	HIMS: "Hims & Hers", ROKU: "Roku", CRWD: "CrowdStrike", SNOW: "Snowflake",
	DDOG: "Datadog", NET: "Cloudflare", PATH: "UiPath", GTLB: "GitLab",
	SMCI: "Super Micro", ARM: "Arm Holdings", ANET: "Arista Networks",
	SHOP: "Shopify", PYPL: "PayPal", SQ: "Block", V: "Visa", MA: "Mastercard",
	JPM: "JPMorgan", GS: "Goldman Sachs", BAC: "Bank of America", MS: "Morgan Stanley",
	WFC: "Wells Fargo", C: "Citigroup",
	WMT: "Walmart", COST: "Costco", TGT: "Target", HD: "Home Depot",
	MCD: "McDonald's", SBUX: "Starbucks", NKE: "Nike", LULU: "Lululemon",
	DIS: "Disney", CMCSA: "Comcast", T: "AT&T", VZ: "Verizon", TMUS: "T-Mobile",
	DELL: "Dell", HPQ: "HP Inc", HPE: "HP Enterprise",
	RIVN: "Rivian", F: "Ford", GM: "General Motors", NIO: "NIO",
	BA: "Boeing", GE: "GE", CAT: "Caterpillar", HON: "Honeywell",
	JNJ: "Johnson & Johnson", PFE: "Pfizer", MRNA: "Moderna", LLY: "Eli Lilly",
	ABBV: "AbbVie", AMGN: "Amgen", XOM: "ExxonMobil", CVX: "Chevron",
	BABA: "Alibaba", JD: "JD.com", PDD: "PDD Holdings",
};

/** Market-wide earnings calendar for popular stocks — MUST be before /:symbol */
stockRouter.get("/market-earnings", async (req, res) => {
	const period = (req.query.period as string) ?? "today";
	const now = new Date();
	const fmt = (d: Date) => d.toISOString().split("T")[0];
	const todayStr = fmt(now);

	let fromStr: string, toStr: string;
	if (period === "tomorrow") {
		const d = new Date(now.getTime() + 86400000);
		fromStr = toStr = fmt(d);
	} else if (period === "week") {
		// Full calendar week: Sunday → Saturday
		const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
		const weekSunday = new Date(now.getTime() - dayOfWeek * 86400000);
		const weekSaturday = new Date(weekSunday.getTime() + 6 * 86400000);
		fromStr = fmt(weekSunday);
		toStr = fmt(weekSaturday);
	} else {
		fromStr = toStr = todayStr;
	}

	const cacheKey = `market-earnings:v2:${period}:${todayStr}`;
	const cached = getCached(cacheKey);
	if (cached) { res.json(cached); return; }

	const data = await finnhubGet(`/calendar/earnings?from=${fromStr}&to=${toStr}`) as
		{ earningsCalendar?: FinnhubCalendarEntry[] } | null;

	const calEntries = (data?.earningsCalendar ?? []).filter((e) => e.symbol in MARKET_TICKERS);

	// Same logic as /:symbol/earnings in My Stak:
	// - future date → "upcoming" (no Gemini call needed)
	// - today or past date → Gemini web search for beat/miss (parallel, 24h cached internally)
	const entries = await Promise.all(
		calEntries.map(async (e) => {
			const revChangePct = e.revenueActual != null && e.revenueEstimate != null && e.revenueEstimate !== 0
				? Math.round(((e.revenueActual - e.revenueEstimate) / Math.abs(e.revenueEstimate)) * 1000) / 10
				: null;

			if (e.date > todayStr) {
				// Upcoming — don't call Gemini yet
				return {
					symbol: e.symbol, name: MARKET_TICKERS[e.symbol],
					date: e.date, hour: e.hour || null,
					epsActual: e.epsActual, epsEstimate: e.epsEstimate,
					epsSurprisePct: null, priceChangePct: null,
					revChangePct, status: "upcoming" as const,
				};
			}

			// Already reported — run Gemini + price reaction in parallel
			const [{ result: signal, date: reportDate }, priceChangePct] = await Promise.all([
				getEarningsBeatMissFromWeb(e.symbol, MARKET_TICKERS[e.symbol]),
				getPriceChangePct(e.symbol, e.date, e.hour),
			]);
			// Fallback to Finnhub EPS comparison if Gemini returns "none"
			const fallbackStatus = e.epsActual != null && e.epsEstimate != null
				? (e.epsActual >= e.epsEstimate ? "beat" : "miss")
				: "none";
			const epsSurprisePct = e.epsActual != null && e.epsEstimate != null && e.epsEstimate !== 0
				? Math.round(((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 1000) / 10
				: null;
			return {
				symbol: e.symbol, name: MARKET_TICKERS[e.symbol],
				date: reportDate ?? e.date, hour: e.hour || null,
				epsActual: e.epsActual, epsEstimate: e.epsEstimate,
				epsSurprisePct, priceChangePct,
				revChangePct,
				status: (signal !== "none" ? signal : fallbackStatus) as "beat" | "miss" | "none",
			};
		}),
	);

	entries.sort((a, b) => {
		if (a.status !== "upcoming" && b.status === "upcoming") return -1;
		if (a.status === "upcoming" && b.status !== "upcoming") return 1;
		return a.date.localeCompare(b.date);
	});

	const result = { entries, from: fromStr, to: toStr };
	setCached(cacheKey, result, 15 * 60 * 1000);
	res.json(result);
});

// ── Stock quote & metrics ─────────────────────────────────────────────────────

stockRouter.get("/:symbol", async (req, res) => {
	const raw = req.params.symbol.toUpperCase();
	const symbol = resolveSymbol(raw);

	try {
		// Quote (1-min cache)
		const quoteKey = `quote:${symbol}`;
		let quoteRaw = getCached(quoteKey) as Record<string, number> | null;
		if (!quoteRaw) {
			quoteRaw = (await finnhubGet(`/quote?symbol=${symbol}`)) as Record<string, number> | null;
			if (quoteRaw) setCached(quoteKey, quoteRaw, QUOTE_TTL_MS);
		}

		// Fundamentals (6-hour cache)
		const metricsKey = `metrics:${symbol}`;
		let metricsRaw = getCached(metricsKey) as { metric?: Record<string, number> } | null;
		if (!metricsRaw) {
			metricsRaw = (await finnhubGet(`/stock/metric?symbol=${symbol}&metric=all`)) as { metric?: Record<string, number> } | null;
			if (metricsRaw) setCached(metricsKey, metricsRaw, METRICS_TTL_MS);
		}

		const q = quoteRaw ?? {};
		const m = metricsRaw?.metric ?? {};

		// c === 0 means Finnhub has no data for this symbol
		const quote = q.c
			? {
					price: q.c,
					change: q.d,
					changePercent: q.dp,
					high: q.h,
					low: q.l,
					open: q.o,
					prevClose: q.pc,
				}
			: null;

		const peRatio = m.peTTM ?? null;
		const marketCapRaw = m.marketCapitalization ?? null;

		res.json({
			quote,
			metrics: {
				peRatio: peRatio != null ? Number(peRatio.toFixed(1)) : null,
				marketCap: marketCapRaw != null ? formatMarketCap(marketCapRaw) : null,
				revenueGrowth: m.revenueGrowthTTMYoy != null ? `${m.revenueGrowthTTMYoy.toFixed(1)}%` : null,
				profitMargin: m.netProfitMarginTTM != null ? `${m.netProfitMarginTTM.toFixed(1)}%` : null,
				beta: m.beta != null ? Number(m.beta.toFixed(2)) : null,
				dividendYield: m.dividendYieldIndicatedAnnual != null ? `${m.dividendYieldIndicatedAnnual.toFixed(2)}%` : null,
				week52High: m["52WeekHigh"] ?? null,
				week52Low: m["52WeekLow"] ?? null,
			},
		});
	} catch (error) {
		console.error("Error fetching stock data:", error);
		res.status(500).json({ error: "Failed to fetch stock data" });
	}
});

// ── Earnings beat/miss per symbol ─────────────────────────────────────────────

interface EarningsStatus {
	status: "upcoming" | "beat" | "miss" | "none";
	date: string | null;
	hour?: string;
}

interface FinnhubCalendarEntry {
	symbol: string;
	date: string;
	hour: string;
	epsActual: number | null;
	epsEstimate: number | null;
	revenueActual: number | null;
	revenueEstimate: number | null;
}

stockRouter.get("/:symbol/earnings", async (req, res) => {
	const symbol = req.params.symbol.toUpperCase();
	const companyName = req.query.name as string | undefined;
	const cacheKey = `earnings:v4:${symbol}`;

	const cached = getCached(cacheKey) as EarningsStatus | null;
	if (cached) { res.json(cached); return; }

	const now = new Date();
	const fmt = (d: Date) => d.toISOString().split("T")[0];
	const todayStr = fmt(now);
	const in14Days = fmt(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));

	// ── 1. Check Finnhub calendar for upcoming earnings (next 14 days) ──
	const calData = await finnhubGet(`/calendar/earnings?from=${todayStr}&to=${in14Days}`) as
		{ earningsCalendar?: FinnhubCalendarEntry[] } | null;
	const upcoming = calData?.earningsCalendar?.find((e) => e.symbol === symbol);
	if (upcoming) {
		const result: EarningsStatus = { status: "upcoming", date: upcoming.date, hour: upcoming.hour };
		setCached(cacheKey, result, 15 * 60 * 1000);
		res.json(result);
		return;
	}

	// ── 2. Gemini + Google Search grounding — finds the actual earnings article and reads it ──
	// Cached 24 hours so we only call Gemini once per day per stock.
	const { result: signal, date: reportDate } = await getEarningsBeatMissFromWeb(symbol, companyName);
	const result: EarningsStatus = signal !== "none"
		? { status: signal, date: reportDate ?? todayStr }
		: { status: "none", date: null };

	// 24h for beat/miss (Gemini result is already cached internally); 1h for none
	setCached(cacheKey, result, signal !== "none" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
	res.json(result);
});

import { Router } from "express";
import { getEarningsBeatMissFromWeb, getGeminiKeys } from "../services/geminiService.js";
import { getConsensusEarningsDate } from "../services/earningsConsensus.js";
import { getConsensusEarningsResult } from "../services/earningsResultConsensus.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { PEER_GROUPS } from "../data/peerGroups.js";
import { getYahooCrumb } from "../lib/yahooAuth.js";
import { marketSessionBucket } from "@stak/shared";

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
// If reaction day is today, uses Finnhub live quote (dp field) since candle won't have it yet.
// Otherwise uses Yahoo Finance historical daily closes.
async function getPriceChangePct(symbol: string, earningsDate: string, hour: string | null): Promise<number | null> {
	const fmt = (d: Date) => d.toISOString().split("T")[0];
	const todayStr = fmt(new Date());
	const isAmc = !hour || hour === "amc" || hour === "after_trading_hours";

	// Reaction date: AMC = next calendar day (skip weekend handled by Yahoo), BMO = same day
	const base = new Date(earningsDate + "T12:00:00Z");
	const reactionDate = fmt(new Date(base.getTime() + (isAmc ? 86400000 : 0)));

	// If reaction day is today or in the future, use live Finnhub quote dp (daily % change)
	if (reactionDate >= todayStr) {
		const cacheKey = `price-chg-live:${symbol}`;
		const cached = await cacheGet<number>(cacheKey);
		if (cached !== null) return cached;

		const quote = await finnhubGet(`/quote?symbol=${symbol}`) as { dp?: number } | null;
		if (quote?.dp == null) return null;
		const pct = Math.round(quote.dp * 10) / 10;
		await cacheSet(cacheKey, pct, 2 * 60 * 1000); // 2 min — live data changes throughout the day
		return pct;
	}

	// Historical reaction — use Yahoo Finance daily candles
	const cacheKey = `price-chg:${symbol}:${earningsDate}`;
	const cached = await cacheGet<number>(cacheKey);
	if (cached !== null) return cached;

	const from = Math.floor(new Date(base.getTime() - 5 * 86400000).getTime() / 1000);
	const to   = Math.floor(new Date(base.getTime() + (isAmc ? 3 : 2) * 86400000).getTime() / 1000);

	// Primary: Yahoo Finance historical daily candles
	try {
		const res = await fetch(
			`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`,
			{ headers: { "User-Agent": "Mozilla/5.0" } },
		);
		if (res.ok) {
			const data = await res.json() as {
				chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: number[] }> } }> }
			};
			const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((c): c is number => c != null);
			if (closes && closes.length >= 2) {
				const prev = closes[closes.length - 2]!;
				const reaction = closes[closes.length - 1]!;
				if (prev !== 0) {
					const pct = Math.round(((reaction - prev) / prev) * 1000) / 10;
					await cacheSet(cacheKey, pct, 24 * 60 * 60 * 1000);
					return pct;
				}
			}
		}
	} catch {
		// fall through to Finnhub candle
	}

	// Fallback: Finnhub daily candle (same date range)
	try {
		const candle = await finnhubGet(
			`/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}`,
		) as { c?: number[]; s?: string } | null;
		if (candle?.s === "ok" && Array.isArray(candle.c) && candle.c.length >= 2) {
			const prev = candle.c[candle.c.length - 2]!;
			const reaction = candle.c[candle.c.length - 1]!;
			if (prev !== 0) {
				const pct = Math.round(((reaction - prev) / prev) * 1000) / 10;
				await cacheSet(cacheKey, pct, 24 * 60 * 60 * 1000);
				return pct;
			}
		}
	} catch {
		// both sources failed
	}

	return null;
}

const QUOTE_TTL_MS = 60 * 1000;              // 1 minute
const METRICS_TTL_MS = 6 * 60 * 60 * 1000;  // 6 hours

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
	const cached = await cacheGet<CalendarResponse>(cacheKey);
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

	await cacheSet(cacheKey, result, 15 * 60 * 1000);
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

	const extraTickersParam = (req.query.tickers as string) ?? "";
	const extraTickers = extraTickersParam
		? extraTickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
		: [];
	const extraTickersKey = [...extraTickers].sort().join(",");

	// Use fromStr:toStr (not todayStr) so week/tomorrow cache survives across days within the same period
	const periodKey = period === "today" ? todayStr : `${fromStr}:${toStr}`;
	const cacheKey = `market-earnings:v4:${period}:${periodKey}${extraTickersKey ? `:${extraTickersKey}` : ""}`;
	const cached = await cacheGet(cacheKey);
	if (cached) { res.json(cached); return; }

	const data = await finnhubGet(`/calendar/earnings?from=${fromStr}&to=${toStr}`) as
		{ earningsCalendar?: FinnhubCalendarEntry[] } | null;

	const tickerSet = new Set([...Object.keys(MARKET_TICKERS), ...extraTickers]);
	const calEntries = (data?.earningsCalendar ?? []).filter((e) => tickerSet.has(e.symbol));

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
					symbol: e.symbol, name: MARKET_TICKERS[e.symbol] ?? e.symbol,
					date: e.date, hour: e.hour || null,
					epsActual: e.epsActual, epsEstimate: e.epsEstimate,
					epsSurprisePct: null, priceChangePct: null,
					revChangePct, status: "upcoming" as const,
				};
			}

			// Date is today or past — but if epsActual is null, Finnhub may have the wrong date.
			// Run consensus across Yahoo, FMP, and Gemini to verify.
			if (e.epsActual === null) {
				const consensus = await getConsensusEarningsDate(
					e.symbol,
					MARKET_TICKERS[e.symbol] ?? e.symbol,
					e.date,
				);
				if (consensus.date && consensus.date > todayStr) {
					// Consensus says it hasn't reported yet — but if the corrected date falls outside
					// the requested period window, exclude it entirely rather than leaking into the wrong tab.
					if (consensus.date > toStr) return null;
					return {
						symbol: e.symbol, name: MARKET_TICKERS[e.symbol] ?? e.symbol,
						date: consensus.date, hour: e.hour || null,
						epsActual: null, epsEstimate: e.epsEstimate,
						epsSurprisePct: null, priceChangePct: null,
						revChangePct: null, status: "upcoming" as const,
					};
				}
			}

			// Already reported — cross-check beat/miss, EPS, and revenue across 4 sources
			const [consensusResult, priceChangePct] = await Promise.all([
				getConsensusEarningsResult(
					e.symbol,
					MARKET_TICKERS[e.symbol] ?? e.symbol,
					e.date,
					{
						epsActual: e.epsActual,
						epsEstimate: e.epsEstimate,
						revenueActual: e.revenueActual,
						revenueEstimate: e.revenueEstimate,
					},
				),
				getPriceChangePct(e.symbol, e.date, e.hour),
			]);
			return {
				symbol: e.symbol, name: MARKET_TICKERS[e.symbol] ?? e.symbol,
				date: e.date, hour: e.hour || null,
				epsActual: consensusResult.epsActual,
				epsEstimate: consensusResult.epsEstimate,
				epsSurprisePct: consensusResult.epsSurprisePct,
				priceChangePct,
				revChangePct: consensusResult.revChangePct,
				status: consensusResult.status,
			};
		}),
	);

	// Filter out nulls (entries excluded by period-window guard after consensus date correction)
	const filteredEntries = entries.filter((e): e is NonNullable<typeof e> => e !== null);

	// ── Gemini fallback for Stak tickers Finnhub missed entirely ────────────────
	// extraTickers = all tickers from the user's Stak (sent by the frontend).
	// If Finnhub had no calendar entry for a Stak ticker, ask Gemini whether
	// they reported in this period. Results are cached 24h so this is cheap.
	if (extraTickers.length > 0) {
		const finnhubFoundSymbols = new Set(calEntries.map((e) => e.symbol));
		const missingStakTickers = extraTickers.filter((t) => !finnhubFoundSymbols.has(t));

		const supplements = await Promise.all(
			missingStakTickers.map(async (ticker) => {
				const name = MARKET_TICKERS[ticker] ?? ticker;
				const geminiResult = await getEarningsBeatMissFromWeb(ticker, name);
				if (geminiResult.result === "none" || !geminiResult.date) return null;
				// Only include if the reported date is within the requested window
				if (geminiResult.date < fromStr || geminiResult.date > toStr) return null;

				// Fetch historical EPS from Finnhub to populate actual/estimate columns
				type FinnhubEpsEntry = { actual: number | null; estimate: number | null; period: string };
				const epsKey = `eps-history:${ticker}`;
				let epsHistory = await cacheGet<FinnhubEpsEntry[]>(epsKey);
				if (!epsHistory) {
					epsHistory = await finnhubGet(`/stock/earnings?symbol=${ticker}&limit=2`) as FinnhubEpsEntry[] | null;
					if (epsHistory) await cacheSet(epsKey, epsHistory, 6 * 60 * 60 * 1000);
				}
				const latestEps = Array.isArray(epsHistory) && epsHistory.length > 0 ? epsHistory[0] : null;

				// Cross-check beat/miss and EPS across all 4 sources
				const [consensusResult, priceChangePct] = await Promise.all([
					getConsensusEarningsResult(ticker, name, geminiResult.date, {
						epsActual: latestEps?.actual ?? null,
						epsEstimate: latestEps?.estimate ?? null,
					}),
					getPriceChangePct(ticker, geminiResult.date, null),
				]);
				return {
					symbol: ticker,
					name,
					date: geminiResult.date,
					hour: null as string | null,
					epsActual: consensusResult.epsActual,
					epsEstimate: consensusResult.epsEstimate,
					epsSurprisePct: consensusResult.epsSurprisePct,
					priceChangePct,
					revChangePct: consensusResult.revChangePct,
					status: consensusResult.status,
				};
			}),
		);

		for (const s of supplements) {
			if (s) filteredEntries.push(s);
		}
	}

	filteredEntries.sort((a, b) => {
		if (a.status !== "upcoming" && b.status === "upcoming") return -1;
		if (a.status === "upcoming" && b.status !== "upcoming") return 1;
		return a.date.localeCompare(b.date);
	});

	const result = { entries: filteredEntries, from: fromStr, to: toStr };
	// today: 1h (earnings reported once); week/tomorrow: 6h (dates don't shift mid-period)
	const cacheTtl = period === "today" ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
	await cacheSet(cacheKey, result, cacheTtl);
	res.json(result);
});

// ── Market session helper ─────────────────────────────────────────────────────
// Returns true when US markets are outside regular hours (pre or after-hours)
function isExtendedHours(): boolean {
	return marketSessionBucket() !== "open";
}

// ── Yahoo Finance extended-hours quote ────────────────────────────────────────
// Only called outside regular market hours to get pre/after prices.

interface YahooExtended {
	extendedPrice: number;
	extendedChange: number;
	extendedChangePercent: number;
	marketState: "PRE" | "REGULAR" | "POST" | "POSTPOST" | "PREPRE" | "CLOSED";
}

async function fetchYahooExtended(symbol: string): Promise<YahooExtended | null> {
	try {
		const auth = await getYahooCrumb();
		const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";
		const cookie = auth?.cookie ?? "";
		const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price${crumbParam}`;
		const r = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0", ...(cookie ? { Cookie: cookie } : {}) },
			signal: AbortSignal.timeout(8000),
		});
		if (!r.ok) return null;
		const data = await r.json() as {
			quoteSummary?: { result?: Array<{ price?: Record<string, { raw?: number }> }> };
		};
		const p = data?.quoteSummary?.result?.[0]?.price;
		if (!p) return null;
		const marketState = ((p.marketState as unknown as string) ?? "CLOSED") as YahooExtended["marketState"];
		const isPre = marketState === "PRE" || marketState === "PREPRE";
		const isPost = marketState === "POST" || marketState === "POSTPOST";
		if (!isPre && !isPost) return null;
		const ep = isPre ? (p.preMarketPrice?.raw ?? null) : (p.postMarketPrice?.raw ?? null);
		const ec = isPre ? (p.preMarketChange?.raw ?? null) : (p.postMarketChange?.raw ?? null);
		const ecp = isPre ? (p.preMarketChangePercent?.raw ?? null) : (p.postMarketChangePercent?.raw ?? null);
		if (!ep || ec == null || ecp == null) return null;
		return {
			extendedPrice: Math.round(ep * 100) / 100,
			extendedChange: Math.round(ec * 100) / 100,
			extendedChangePercent: Math.round(ecp * 10000) / 10000,
			marketState,
		};
	} catch {
		return null;
	}
}

// ── Stock quote & metrics ─────────────────────────────────────────────────────

stockRouter.get("/:symbol", async (req, res) => {
	const raw = req.params.symbol.toUpperCase();
	const symbol = resolveSymbol(raw);

	try {
		const extended = isExtendedHours();

		// Finnhub for regular market price (fast, reliable)
		const fbKey = `quote:fb:${symbol}`;
		let finnhubQuoteRaw = await cacheGet<Record<string, number>>(fbKey);
		if (!finnhubQuoteRaw) {
			finnhubQuoteRaw = (await finnhubGet(`/quote?symbol=${symbol}`)) as Record<string, number> | null;
			if (finnhubQuoteRaw) await cacheSet(fbKey, finnhubQuoteRaw, QUOTE_TTL_MS);
		}

		// Yahoo only during extended hours — gets pre/after-market prices
		let yahooExt: YahooExtended | null = null;
		if (extended) {
			const yKey = `quote:ext:${symbol}`;
			yahooExt = await cacheGet<YahooExtended>(yKey);
			if (!yahooExt) {
				yahooExt = await fetchYahooExtended(symbol);
				if (yahooExt) await cacheSet(yKey, yahooExt, QUOTE_TTL_MS);
			}
		}

		// Fundamentals (6-hour cache) — Finnhub
		const metricsKey = `metrics:${symbol}`;
		let metricsRaw = await cacheGet<{ metric?: Record<string, number> }>(metricsKey);
		if (!metricsRaw) {
			metricsRaw = (await finnhubGet(`/stock/metric?symbol=${symbol}&metric=all`)) as { metric?: Record<string, number> } | null;
			if (metricsRaw) await cacheSet(metricsKey, metricsRaw, METRICS_TTL_MS);
		}

		const m = metricsRaw?.metric ?? {};
		const fb = finnhubQuoteRaw ?? {};

		const quote = fb.c
			? {
					// Regular hours: Finnhub price. Extended hours: Yahoo extended price if available, else last Finnhub close
					price: extended && yahooExt ? yahooExt.extendedPrice : fb.c,
					change: fb.d,
					changePercent: fb.dp,
					high: fb.h,
					low: fb.l,
					open: fb.o,
					prevClose: fb.pc,
					marketState: yahooExt?.marketState ?? (extended ? "CLOSED" as const : "REGULAR" as const),
					extendedPrice: yahooExt?.extendedPrice ?? null,
					extendedChange: yahooExt?.extendedChange ?? null,
					extendedChangePercent: yahooExt?.extendedChangePercent ?? null,
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
				// Cap extreme margins — pre-revenue companies can show -10000%+ which is meaningless
				profitMargin: m.netProfitMarginTTM != null && Math.abs(m.netProfitMarginTTM) <= 500
					? `${m.netProfitMarginTTM.toFixed(1)}%`
					: m.netProfitMarginTTM != null
					? null
					: null,
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

// ── Quick earnings (EPS actual vs estimate) — fast single Finnhub call ──────
// MUST be before /:symbol/earnings so "earnings-quick" isn't parsed as a symbol.
stockRouter.get("/:symbol/earnings-quick", async (req, res) => {
	const symbol = (req.params["symbol"] as string).toUpperCase();
	const cacheKey = `earnings-quick:${symbol}`;

	const cached = await cacheGet<unknown>(cacheKey);
	if (cached !== null) return res.json(cached);

	type FinnhubEpsEntry = {
		actual: number | null;
		estimate: number | null;
		period: string;
		quarter: number;
		year: number;
		surprise: number | null;
		surprisePercent: number | null;
	};

	const data = await finnhubGet(`/stock/earnings?symbol=${encodeURIComponent(symbol)}&limit=1`) as FinnhubEpsEntry[] | null;
	const latest = Array.isArray(data) && data.length > 0 ? data[0] : null;

	const payload = latest ? {
		period:          latest.period,
		quarter:         latest.quarter,
		year:            latest.year,
		epsActual:       latest.actual,
		epsEstimate:     latest.estimate,
		beat:            latest.actual !== null && latest.estimate !== null ? latest.actual >= latest.estimate : null,
		surprisePercent: latest.surprisePercent ?? null,
	} : null;

	await cacheSet(cacheKey, payload, 12 * 60 * 60 * 1000); // 12 h
	res.json(payload);
});

type FinnhubEpsEntry = { actual: number | null; estimate: number | null; period: string };

// Finnhub's own actual-vs-estimate is ground truth for "has this been reported" — it's
// structured data, not a guess. Cached briefly (not the usual hours-long TTL) so that on
// the day a report drops, the transition from "upcoming" to "beat"/"miss" is detected
// within minutes rather than waiting out a long-lived cache entry.
async function getLatestEpsEntry(symbol: string): Promise<FinnhubEpsEntry | null> {
	const epsHistKey = `eps-history:v2:${symbol}`;
	const cached = await cacheGet<FinnhubEpsEntry[]>(epsHistKey);
	const epsHistory = cached ?? await finnhubGet(`/stock/earnings?symbol=${symbol}&limit=1`) as FinnhubEpsEntry[] | null;
	if (!cached && epsHistory) await cacheSet(epsHistKey, epsHistory, 15 * 60 * 1000);
	return Array.isArray(epsHistory) && epsHistory.length > 0 ? epsHistory[0]! : null;
}

// A reported-earnings date this old can't be "the report we're checking for" — wider
// than any single quarter, so it only catches genuine staleness, e.g. an established
// company's Finnhub history always has a non-null actual for its LAST completed quarter
// (never null, even moments before a brand new report drops), and the AI web-search
// fallback finding a same-month report from a prior year instead of the current one.
const MAX_PLAUSIBLE_REPORT_AGE_DAYS = 100;

// True only if this EPS entry's fiscal period is recent enough to plausibly BE the report
// currently being checked for — not just that *some* actual value exists. Without this,
// "alreadyReported" would be true for literally any company with reporting history, since
// Finnhub's "latest" entry is always last quarter's real result until the new one posts.
function isRecentEpsEntry(entry: { period: string } | null, now: Date): boolean {
	if (!entry?.period) return false;
	const ageDays = (now.getTime() - new Date(entry.period + "T12:00:00Z").getTime()) / 86400000;
	return ageDays >= 0 && ageDays <= MAX_PLAUSIBLE_REPORT_AGE_DAYS;
}

stockRouter.get("/:symbol/earnings", async (req, res) => {
	const symbol = req.params.symbol.toUpperCase();
	const companyName = req.query.name as string | undefined;
	// Bumped to v6 to invalidate any bad results already cached for 24h by the previous
	// (buggy) deploy — e.g. MU was cached as {status: "beat", date: "<future date>"}.
	const cacheKey = `earnings:v6:${symbol}`;

	try {
		const cached = await cacheGet<EarningsStatus>(cacheKey);
		if (cached) { res.json(cached); return; }

		const now = new Date();
		const fmt = (d: Date) => d.toISOString().split("T")[0];
		const todayStr = fmt(now);

		// Ground truth for "has the company actually reported yet" — checked up front so every
		// branch below can defer to it instead of guessing from dates alone (a report scheduled
		// for *today* hasn't happened yet the moment markets open, even though date === todayStr).
		const latestEps = await getLatestEpsEntry(symbol);
		const alreadyReported = latestEps?.actual != null && isRecentEpsEntry(latestEps, now);

		// ── 1. Check Finnhub calendar for upcoming earnings (next 90 days) ──
		const in90Days = fmt(new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000));
		const calData = await finnhubGet(`/calendar/earnings?from=${todayStr}&to=${in90Days}`) as
			{ earningsCalendar?: FinnhubCalendarEntry[] } | null;
		const upcoming = calData?.earningsCalendar?.find((e) => e.symbol === symbol);
		if (upcoming) {
			// Verify with consensus before trusting Finnhub date
			const consensus = await getConsensusEarningsDate(symbol, companyName, upcoming.date);
			const confirmedDate = consensus.date ?? upcoming.date;
			// Still upcoming if the date is in the future, OR it's today but Finnhub doesn't
			// have actual results yet (>= not > — a same-day report isn't "past" until it lands).
			if (confirmedDate > todayStr || (confirmedDate === todayStr && !alreadyReported)) {
				const result: EarningsStatus = { status: "upcoming", date: confirmedDate, hour: upcoming.hour };
				// Short TTL on the day of the report so the UI flips to beat/miss promptly once it lands.
				await cacheSet(cacheKey, result, confirmedDate === todayStr ? 15 * 60 * 1000 : 60 * 60 * 1000);
				res.json(result);
				return;
			}
		}

		// ── 2. Finnhub missed it — run consensus to check for upcoming date ──
		if (!upcoming) {
			const consensus = await getConsensusEarningsDate(symbol, companyName, null);
			if (consensus.date && (consensus.date > todayStr || (consensus.date === todayStr && !alreadyReported))) {
				const result: EarningsStatus = { status: "upcoming", date: consensus.date };
				await cacheSet(cacheKey, result, consensus.date === todayStr ? 15 * 60 * 1000 : 6 * 60 * 60 * 1000);
				res.json(result);
				return;
			}
		}

		// ── 3. Finnhub itself confirms a report is in: compute beat/miss from its structured
		// actual-vs-estimate directly. No AI guessing needed — this is the common case for any
		// stock Finnhub covers, which is also exactly why steps 1–2 falling through is *not* on
		// its own evidence the company never had an upcoming date; it just means we now have
		// better evidence (the report itself) than a calendar lookup.
		if (alreadyReported && latestEps) {
			const reportDateAnchor = upcoming?.date ?? todayStr;
			const consensusResult = await getConsensusEarningsResult(symbol, companyName, reportDateAnchor, {
				epsActual: latestEps.actual,
				epsEstimate: latestEps.estimate,
			});
			const finnhubDirectStatus: "beat" | "miss" | null =
				latestEps.actual != null && latestEps.estimate != null
					? (latestEps.actual >= latestEps.estimate ? "beat" : "miss")
					: null;
			// Finnhub's own actual-vs-estimate wins when available — most direct, least
			// ambiguous. Fall back to the cross-source vote only if Finnhub lacks an estimate.
			const finalStatus = finnhubDirectStatus ?? consensusResult.status;
			const result: EarningsStatus = { status: finalStatus, date: reportDateAnchor };
			await cacheSet(cacheKey, result, 24 * 60 * 60 * 1000);
			res.json(result);
			return;
		}

		// ── 4. No confirmed date anywhere AND Finnhub has no actual data — last resort: ask
		// Gemini to search the web. Only reached for tickers Finnhub's calendar/EPS history
		// doesn't cover at all. Sanity-checked so a stale/hallucinated date can't be presented
		// as current.
		const { result: geminiSignal, date: reportDate } = await getEarningsBeatMissFromWeb(symbol, companyName);
		const reportAgeDays = reportDate
			? (new Date(todayStr + "T12:00:00Z").getTime() - new Date(reportDate + "T12:00:00Z").getTime()) / 86400000
			: null;
		const dateIsPlausible = reportAgeDays != null && reportAgeDays >= 0 && reportAgeDays <= MAX_PLAUSIBLE_REPORT_AGE_DAYS;
		if (geminiSignal === "none" || !reportDate || !dateIsPlausible) {
			const noneResult: EarningsStatus = { status: "none", date: null };
			await cacheSet(cacheKey, noneResult, 60 * 60 * 1000); // 1h — retry sooner
			res.json(noneResult);
			return;
		}

		const consensusResult = await getConsensusEarningsResult(symbol, companyName, reportDate, {
			epsActual: null,
			epsEstimate: null,
		});

		// Use consensus status; fall back to geminiSignal if consensus found nothing
		const finalStatus = consensusResult.status !== "none" ? consensusResult.status : geminiSignal as "beat" | "miss";
		const result: EarningsStatus = { status: finalStatus, date: reportDate };

		await cacheSet(cacheKey, result, 24 * 60 * 60 * 1000);
		res.json(result);
	} catch (error) {
		console.error("Error fetching earnings status:", error);
		res.status(500).json({ error: "Failed to fetch earnings status" });
	}
});

// ── Analyst price targets + consensus recommendation ─────────────────────────
// GET /api/stock/:symbol/analyst
// IMPORTANT: must come after /:symbol/earnings so "analyst" isn't matched as "earnings"

stockRouter.get("/:symbol/analyst", async (req, res) => {
	const raw = req.params.symbol.toUpperCase();
	const symbol = resolveSymbol(raw);
	const companyName = (req.query.name as string | undefined)?.trim();
	const cacheKey = `analyst:v2:${symbol}`;

	const cached = await cacheGet(cacheKey);
	if (cached) { res.json(cached); return; }

	const [targetRaw, recRaw] = await Promise.all([
		finnhubGet(`/stock/price-target?symbol=${symbol}`),
		finnhubGet(`/stock/recommendation?symbol=${symbol}`),
	]) as [
		{ targetHigh?: number; targetLow?: number; targetMean?: number; targetMedian?: number } | null,
		Array<{ strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number; period?: string }> | null,
	];

	const latest = Array.isArray(recRaw) && recRaw.length > 0 ? recRaw[0] : null;

	// Finnhub price target is behind a paywall — fall back to Gemini + Google Search
	let priceTarget: { low: number | null; avg: number | null; high: number | null } | null =
		targetRaw?.targetMean != null
			? { low: targetRaw.targetLow ?? null, avg: targetRaw.targetMean, high: targetRaw.targetHigh ?? null }
			: null;

	if (priceTarget === null) {
		const keys = getGeminiKeys();
		const subject = companyName ? `${companyName} (${symbol})` : symbol;
		const prompt = `Search for the current Wall Street analyst consensus price target for ${subject} stock.

Find the official analyst price target consensus from financial sites like MarketBeat, TipRanks, Yahoo Finance, Barclays, or Bloomberg.

Return ONLY a JSON object with exactly these fields:
{ "low": 85, "avg": 107, "high": 130 }

Where low/avg/high are numbers (no $ sign). If any value is not found, use null. Return null for all if no consensus data exists.`;

		for (const key of keys) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 15000);
			try {
				const gemRes = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							contents: [{ parts: [{ text: prompt }] }],
							tools: [{ google_search: {} }],
							generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0, maxOutputTokens: 100 },
						}),
						signal: controller.signal,
					},
				);
				if (gemRes.status === 429) continue;
				if (!gemRes.ok) break;
				const data = await gemRes.json();
				const rawText: string = (data?.candidates?.[0]?.content?.parts ?? [])
					.map((p: { text?: string }) => p.text ?? "").join("").trim()
					.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
				try {
					const parsed = JSON.parse(rawText);
					if (parsed && typeof parsed === "object") {
						const low  = typeof parsed.low  === "number" ? parsed.low  : null;
						const avg  = typeof parsed.avg  === "number" ? parsed.avg  : null;
						const high = typeof parsed.high === "number" ? parsed.high : null;
						if (avg !== null) { priceTarget = { low, avg, high }; }
					}
				} catch { /* parse failed — try next key */ }
				break;
			} catch { /* timeout or error */ } finally { clearTimeout(timeout); }
		}
	}

	const result = {
		priceTarget,
		recommendation: latest ? {
			strongBuy:  latest.strongBuy  ?? 0,
			buy:        latest.buy        ?? 0,
			hold:       latest.hold       ?? 0,
			sell:       latest.sell       ?? 0,
			strongSell: latest.strongSell ?? 0,
			period:     latest.period     ?? null,
		} : null,
	};

	await cacheSet(cacheKey, result, 6 * 60 * 60 * 1000); // 6 hours
	res.json(result);
});

// ── Individual analyst firm actions ─────────────────────────────────────────
// GET /api/stock/:symbol/analyst-actions
// Uses Gemini + Google Search to find the 5 most recent firm-level analyst ratings.
// Cached 12h — ratings don't change hourly.

export interface AnalystAction {
	firm: string;
	action: string;
	priceTarget: number | null;
}

stockRouter.get("/:symbol/analyst-actions", async (req, res) => {
	const raw = (req.params["symbol"] as string).toUpperCase();
	const symbol = resolveSymbol(raw);
	const companyName = (req.query.name as string | undefined)?.trim() || symbol;
	const cacheKey = `analyst-actions:v1:${symbol}`;

	const cached = await cacheGet<AnalystAction[]>(cacheKey);
	if (cached !== null) { res.json(cached); return; }

	const keys = getGeminiKeys();
	if (keys.length === 0) { res.json([]); return; }

	const subject = companyName !== symbol ? `${companyName} (${symbol})` : symbol;
	const prompt = `Search for the most recent analyst price target ratings for ${subject} stock.

Find ratings from major investment banks and research firms published in the last 3 months. Return the 5 most recent.

Return a JSON array ONLY with exactly this format:
[
  { "firm": "Morgan Stanley", "action": "Overweight", "priceTarget": 125 },
  { "firm": "Barclays", "action": "Equal Weight", "priceTarget": 105 }
]

Rules:
- "action" must be one of: "Strong Buy", "Buy", "Outperform", "Overweight", "Neutral", "Equal Weight", "Hold", "Underperform", "Underweight", "Sell", "Strong Sell"
- "priceTarget" is a number (no $ sign) or null if not given
- Return ONLY valid JSON array, no markdown, no extra text
- If fewer than 5 found, return what exists. If none found, return []`;

	for (const key of keys) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 20000);
		try {
			const gemRes = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						tools: [{ google_search: {} }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0, maxOutputTokens: 500 },
					}),
					signal: controller.signal,
				},
			);
			if (gemRes.status === 429) continue;
			if (!gemRes.ok) break;
			const data = await gemRes.json();
			const rawText: string = (data?.candidates?.[0]?.content?.parts ?? [])
				.map((p: { text?: string }) => p.text ?? "").join("").trim();
			try {
				// Strip markdown fences if present (```json ... ```)
				const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
				const parsed = JSON.parse(jsonStr);
				if (Array.isArray(parsed)) {
					const actions: AnalystAction[] = parsed
						.filter((a) => typeof a.firm === "string" && typeof a.action === "string")
						.slice(0, 5)
						.map((a) => ({
							firm: a.firm,
							action: a.action,
							priceTarget: typeof a.priceTarget === "number" ? a.priceTarget : null,
						}));
					await cacheSet(cacheKey, actions, 12 * 60 * 60 * 1000);
					res.json(actions);
					return;
				}
			} catch {
				// JSON parse failed — try next key
			}
		} catch {
			// timeout or error — try next key
		} finally {
			clearTimeout(timeout);
		}
	}

	res.json([]);
});

// ── Peer metrics ────────────────────────────────────────────────────────────
// Returns median P/E, revenue growth, profit margin, and beta for a stock's
// peer group. Cached 24 h — these numbers don't need to be real-time.

interface FinnhubMetricAll {
	metric: {
		peNormalizedAnnual?: number;
		revenueGrowthTTMYoy?: number;
		netProfitMarginTTM?: number;
		beta?: number;
	};
}

function numericMedian(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]!
		: (sorted[mid - 1]! + sorted[mid]!) / 2;
}

stockRouter.get("/peer-metrics/:ticker", async (req, res) => {
	const ticker = (req.params["ticker"] as string).toUpperCase();
	const peerTickers = PEER_GROUPS[ticker] ?? [];

	const cacheKey = `peer-metrics:${ticker}`;
	const cached = await cacheGet<unknown>(cacheKey);
	if (cached !== null) return res.json(cached);

	// Fetch Finnhub basic metrics for each peer in parallel; ignore failures.
	const metricResults = await Promise.allSettled(
		peerTickers.map(async (t) => {
			const data = await finnhubGet(`/stock/metric?symbol=${encodeURIComponent(t)}&metric=all`);
			return data as FinnhubMetricAll | null;
		}),
	);

	const pes:    number[] = [];
	const growths: number[] = [];
	const margins: number[] = [];
	const betas:  number[] = [];

	for (const r of metricResults) {
		if (r.status !== "fulfilled" || !r.value?.metric) continue;
		const m = r.value.metric;
		if (m.peNormalizedAnnual != null && isFinite(m.peNormalizedAnnual) && m.peNormalizedAnnual > 0) pes.push(m.peNormalizedAnnual);
		if (m.revenueGrowthTTMYoy != null && isFinite(m.revenueGrowthTTMYoy)) growths.push(m.revenueGrowthTTMYoy);
		if (m.netProfitMarginTTM != null && isFinite(m.netProfitMarginTTM) && Math.abs(m.netProfitMarginTTM) <= 500) margins.push(m.netProfitMarginTTM);
		if (m.beta != null && isFinite(m.beta) && m.beta > 0) betas.push(m.beta);
	}

	const round1 = (v: number | null) => v !== null ? Math.round(v * 10) / 10 : null;

	const payload = {
		ticker,
		peerTickers,
		peerCount: peerTickers.length,
		pe:             round1(numericMedian(pes)),
		revenueGrowth:  round1(numericMedian(growths)),
		profitMargin:   round1(numericMedian(margins)),
		beta:           round1(numericMedian(betas)),
	};

	await cacheSet(cacheKey, payload, 24 * 60 * 60 * 1000); // 24 h
	res.json(payload);
});

// ── Daily move explanation ───────────────────────────────────────────────────
// GET /api/stock/:symbol/daily-move
// Asks Gemini to explain why a stock is moving today, using live quote + recent headlines.
// Cached 30 minutes.

const DAILY_MOVE_TTL_MS = 30 * 60 * 1000;

stockRouter.get("/:symbol/daily-move", async (req, res) => {
	const raw = (req.params["symbol"] as string).toUpperCase();
	const symbol = resolveSymbol(raw);

	// Frontend passes the live changePercent, optional company name, and sentence count
	const pctParam = parseFloat(req.query.pct as string);
	const changePercent = isFinite(pctParam) ? pctParam : 0;
	const companyName = (req.query.name as string | undefined)?.trim() || symbol;
	const sentencesParam = parseInt(req.query.sentences as string);
	const sentences = isFinite(sentencesParam) && sentencesParam > 1 ? sentencesParam : 1;
	const marketClosed = req.query.marketClosed === "1";
	// closeRef: "today", "yesterday", "Friday", etc. — tells us exactly when last close was
	const closeRef = ((req.query.closeRef as string | undefined)?.trim()) || (marketClosed ? "recently" : "today");
	const direction: "up" | "down" | "flat" =
		changePercent > 0.15 ? "up" : changePercent < -0.15 ? "down" : "flat";

	const cacheKey = `daily-move:v10:${symbol}:${direction}:s${sentences}:${closeRef}`;
	const cached = await cacheGet<{ explanation: string; direction: "up" | "down" | "flat"; bullets?: Array<{text: string; tone: string}> }>(cacheKey);
	if (cached !== null) { res.json(cached); return; }

	const sign = changePercent >= 0 ? "+" : "";
	const moveSummary = `${sign}${changePercent.toFixed(2)}%`;
	const subject = companyName !== symbol ? `${companyName} (${symbol})` : symbol;
	// "today" = live market | "close" = finalized same-day close | "yesterday"/"Friday" = prior session
	const timeRef = closeRef === "today" ? "today" : closeRef === "close" ? "at today's close" : `at ${closeRef}'s close`;
	const searchRef = (closeRef === "today" || closeRef === "close") ? "today" : closeRef;

	const keys = getGeminiKeys();
	if (keys.length === 0) {
		const fallback = { explanation: `${subject} was ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} ${timeRef}.`, direction };
		res.json(fallback);
		return;
	}

	// Pure Gemini + Google Search — no Finnhub dependency.
	const prompt = sentences > 1
		? `${subject} stock (ticker: ${symbol}) was ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} ${timeRef}.${marketClosed ? " Note: US markets are currently closed." : ""}

Search the web for the latest news on why ${symbol} moved ${searchRef}.

Figure out the full story — then distill it into exactly 3 short bullet points a young investor can instantly understand. Think of it like turning a paragraph explanation into the 3 most important takeaways.

Return ONLY a valid JSON array of exactly 3 objects. No markdown, no extra text before or after:
[{"text":"...","tone":"bearish"},{"text":"...","tone":"neutral"},{"text":"...","tone":"bullish"}]

Rules:
- Each bullet is a key point from the story — no fixed structure, just what matters most
- Max 12 words per bullet. Think headline, not sentence.
- Do NOT restate that the stock went up or down — the user already sees the price move. Jump straight to the reason why.
- Use real numbers and data when available. Use → for changes (e.g. "odds dropped 25% → 15%")
- tone must be exactly "bullish", "bearish", or "neutral" — pick whichever fits that point
- Plain everyday language — no jargon, no "it is worth noting", no filler
- When referencing when the move happened, use "${timeRef}" — do not substitute a different time reference`
		: `${subject} stock (ticker: ${symbol}) was ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} ${timeRef}.${marketClosed ? " Note: US markets are currently closed." : ""}

Search the web right now for the specific reason why ${symbol} moved ${searchRef}. Look for: earnings results, product announcements, analyst upgrades/downgrades, partnerships, regulatory news, or broader sector moves.

Write exactly 1 sentence (max 20 words) explaining the main catalyst to a young investor. Be specific — name the actual event. Do not say "various factors" or be vague. Use "${timeRef}" when referencing when the move happened.

Return ONLY that single sentence — no bullet points, no markdown, no JSON, no additional sentences.`;

	for (const key of keys) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);
		try {
			const gemRes = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						tools: [{ google_search: {} }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.3, maxOutputTokens: sentences > 1 ? 500 : 200 },
					}),
					signal: controller.signal,
				},
			);
			if (gemRes.status === 429) continue;
			if (!gemRes.ok) break;
			const data = await gemRes.json();
			// With Google Search grounding, text may be in a different part index
			const parts: Array<{ text?: string }> = data?.candidates?.[0]?.content?.parts ?? [];
			const raw = parts.map((p) => p.text ?? "").join("").trim();
			if (sentences > 1) {
				// Expect JSON array of bullets
				try {
					const match = raw.match(/\[[\s\S]*\]/);
					if (match) {
						// Repair common LLM JSON mistakes before parsing:
						// 1. Missing comma between adjacent quoted tokens: `"value" "key"` → `"value", "key"`
						// 2. Trailing commas before ] or }: `[{...},]` → `[{...}]`
						const repaired = match[0]
							.replace(/"(\s+)"/g, '", "')
							.replace(/,(\s*[}\]])/g, "$1");
						const parsed = JSON.parse(repaired) as Array<{ text?: string; tone?: string }>;
						const TONE_MAP: Record<string, string> = {
							bullish: "bullish", positive: "bullish", up: "bullish",
							bearish: "bearish", negative: "bearish", down: "bearish",
						};
						const bullets = parsed
							.filter((b) => typeof b.text === "string" && b.text.trim().length > 0)
							.map((b) => ({
								text: b.text!.trim(),
								tone: TONE_MAP[b.tone?.toLowerCase() ?? ""] ?? "neutral",
							}));
						if (bullets.length > 0) {
							const explanation = bullets.map((b) => b.text).join(" ");
							const result = { explanation, bullets, direction };
							await cacheSet(cacheKey, result, DAILY_MOVE_TTL_MS);
							res.json(result);
							return;
						}
					}
				} catch { /* fall through to plain text fallback */ }
				if (raw) {
					const result = { explanation: raw, direction };
					await cacheSet(cacheKey, result, DAILY_MOVE_TTL_MS);
					res.json(result);
					return;
				}
			} else {
				const explanation = raw.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? raw.split("\n")[0]?.trim() ?? raw;
				if (explanation) {
					const result = { explanation, direction };
					await cacheSet(cacheKey, result, DAILY_MOVE_TTL_MS);
					res.json(result);
					return;
				}
			}
		} catch {
			// timeout or network error — try next key
		} finally {
			clearTimeout(timeout);
		}
	}

	// All keys exhausted or errored — return simple fallback
	const fallback = { explanation: `${symbol} is ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} today.`, direction };
	await cacheSet(cacheKey, fallback, 5 * 60 * 1000); // short TTL so we retry sooner
	res.json(fallback);
});

// ── Key risk ──────────────────────────────────────────────────────────────────
// GET /api/stock/:symbol/key-risk
// Gemini + Google Search: 1-2 sentence financial/macro risk for this stock.
// Cached 6 hours — risks don't change minute-to-minute.

stockRouter.get("/:symbol/key-risk", async (req, res) => {
	const symbol = resolveSymbol((req.params["symbol"] as string).toUpperCase());
	const companyName = ((req.query.name as string | undefined) || symbol).trim();
	const betaStr = req.query.beta as string | undefined;
	const peStr = req.query.pe as string | undefined;

	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `key-risk:v4:${symbol}:${today}`;
	const cached = await cacheGet<{ risk: string }>(cacheKey);
	if (cached) { res.json(cached); return; }

	const keys = getGeminiKeys();
	if (keys.length === 0) { res.json({ risk: null }); return; }

	const financialLines = [
		betaStr ? `Beta: ${betaStr} (${parseFloat(betaStr) >= 1.4 ? "high volatility" : parseFloat(betaStr) >= 0.85 ? "moderate volatility" : "low volatility"})` : null,
		peStr ? `P/E ratio: ${peStr}` : null,
	].filter(Boolean).join(", ");

	const prompt = `You are writing a "Key Risk" for ${companyName} (${symbol}) in a stock-learning app for young investors.
${financialLines ? `Static financial context: ${financialLines}.` : ""}

Search the web for what the main risk facing ${companyName} is right now. Look for:
- Macro risk relevant to this company (interest rate sensitivity, tariff/trade exposure, currency risk, sector headwinds)
- Valuation risk (is it trading at a stretched multiple?)
- Company-specific financial risk (high debt load, slowing revenue growth, margin pressure, competition)
- Any significant recent news that introduces new risk

Write a single sentence (35 words max) in plain English naming the most important risk and why it matters to a beginner investor. No disclaimers, no "it's important to note", no financial advice language.

Return ONLY that sentence as plain text — no markdown, no JSON, no bullets.`;

	for (const key of keys) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);
		try {
			const gemRes = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						tools: [{ google_search: {} }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.3, maxOutputTokens: 80 },
					}),
					signal: controller.signal,
				},
			);
			if (gemRes.status === 429) continue;
			if (!gemRes.ok) break;
			const data = await gemRes.json();
			const parts: Array<{ text?: string }> = data?.candidates?.[0]?.content?.parts ?? [];
			const rawRisk = parts.map(p => p.text ?? "").join("").trim();
			if (rawRisk) {
				// Gemini doesn't reliably honor the word-count instruction (especially with
				// search grounding on) — enforce the cap server-side as a safety net.
				const words = rawRisk.split(/\s+/);
				const risk = words.length > 35 ? `${words.slice(0, 35).join(" ").replace(/[,;:]+$/, "")}...` : rawRisk;
				const result = { risk };
				await cacheSet(cacheKey, result, 6 * 60 * 60 * 1000);
				res.json(result);
				return;
			}
		} catch {
			// timeout or network error — try next key
		} finally {
			clearTimeout(timeout);
		}
	}

	res.json({ risk: null });
});

// ── Price chart ───────────────────────────────────────────────────────────────
// GET /api/stock/:symbol/chart?range=1d|1w|1m|3m|ytd|1y
// 1d/1w include pre/after-hours via prePost=true

stockRouter.get("/:symbol/chart", async (req, res) => {
	const symbol = (req.params["symbol"] as string).toUpperCase();
	const range = (req.query.range as string) || "1m";
	const cacheKey = `stock:chart:v3:${symbol}:${range}`;
	const cached = await cacheGet<{ prices: { ts: string; close: number; session: "pre" | "regular" | "post" }[] }>(cacheKey);
	if (cached) { res.json(cached); return; }

	const now = Math.floor(Date.now() / 1000);
	let from: number;
	let interval: string;
	let cacheTtl: number;
	let prePost = false;

	if (range === "1d") {
		// Start 6 hours before market open to capture pre-market
		const d = new Date(); d.setHours(0, 0, 0, 0);
		from = Math.floor(d.getTime() / 1000);
		interval = "5m"; cacheTtl = 5 * 60 * 1000; prePost = true;
	} else if (range === "1w") {
		from = now - 7 * 24 * 60 * 60;
		interval = "1h"; cacheTtl = 30 * 60 * 1000; prePost = true;
	} else if (range === "ytd") {
		const jan1 = new Date(new Date().getFullYear(), 0, 1);
		from = Math.floor(jan1.getTime() / 1000);
		interval = "1d"; cacheTtl = 4 * 60 * 60 * 1000;
	} else if (range === "3m") {
		from = now - 91 * 24 * 60 * 60;
		interval = "1d"; cacheTtl = 4 * 60 * 60 * 1000;
	} else if (range === "1y") {
		from = now - 365 * 24 * 60 * 60;
		interval = "1d"; cacheTtl = 4 * 60 * 60 * 1000;
	} else { // 1m default
		from = now - 35 * 24 * 60 * 60;
		interval = "1d"; cacheTtl = 4 * 60 * 60 * 1000;
	}

	try {
		const prePostParam = prePost ? "&includePrePost=true" : "";
		const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${from}&period2=${now}&interval=${interval}${prePostParam}`;
		const r = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(10000),
		});
		if (!r.ok) { res.json({ prices: [] }); return; }
		const data = await r.json() as {
			chart?: { result?: Array<{
				timestamp?: number[];
				indicators?: { quote?: Array<{ close?: (number | null)[] }> };
				meta?: { tradingPeriods?: { regular?: Array<Array<{ start: number; end: number }>> } };
			}> };
		};
		const result = data?.chart?.result?.[0];
		const timestamps = result?.timestamp ?? [];
		const closes = result?.indicators?.quote?.[0]?.close ?? [];

		// Build a flat set of regular-session windows from the metadata
		type RegularWindow = { start: number; end: number };
		const regularWindows: RegularWindow[] = (result?.meta?.tradingPeriods?.regular ?? []).flat();

		function getSession(unixSec: number): "pre" | "regular" | "post" {
			if (regularWindows.length === 0) return "regular";
			for (const w of regularWindows) {
				if (unixSec >= w.start && unixSec < w.end) return "regular";
			}
			// Determine which side of the nearest session window we're on
			const first = regularWindows[0]!;
			const last = regularWindows[regularWindows.length - 1]!;
			if (unixSec < first.start) return "pre";
			if (unixSec >= last.end) return "post";
			// Between two sessions on different days — overnight counts as post of previous day
			return "post";
		}

		const prices: { ts: string; close: number; session: "pre" | "regular" | "post" }[] = [];
		for (let i = 0; i < timestamps.length; i++) {
			const c = closes[i];
			if (c == null) continue;
			const unixSec = timestamps[i]!;
			prices.push({
				ts: new Date(unixSec * 1000).toISOString(),
				close: Math.round(c * 100) / 100,
				session: prePost ? getSession(unixSec) : "regular",
			});
		}
		const payload = { prices };
		await cacheSet(cacheKey, payload, cacheTtl);
		res.json(payload);
	} catch {
		res.json({ prices: [] });
	}
});

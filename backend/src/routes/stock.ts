import { Router } from "express";
import { getEarningsBeatMissFromWeb, getGeminiKeys } from "../services/geminiService.js";
import { getFinnhubKeys } from "../services/finnhubService.js";
import { getConsensusEarningsDate } from "../services/earningsConsensus.js";
import { getConsensusEarningsResult, hasSameDayEarningsArticle } from "../services/earningsResultConsensus.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { getYahooCrumb } from "../lib/yahooAuth.js";
import { marketSessionBucket, getEasternDateKey, getPeerTickers, formatMarketCap, calcPercentChange } from "@stak/shared";
import { brands } from "@stak/shared/brands";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

async function finnhubGet(path: string): Promise<unknown | null> {
	const keys = getFinnhubKeys();
	for (const key of keys) {
		const res = await fetch(`${FINNHUB_BASE}${path}&token=${key}`, { signal: AbortSignal.timeout(8000) });
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
	// fmt itself stays UTC -- safe here because it only ever derives reactionDate from an
	// already-ET-anchored `base` below (noon UTC of a known date, +/- whole days never
	// crosses into a different calendar day). todayStr is the one call that actually needs
	// to know "what day is it right now", so it alone uses the ET-aware helper.
	const fmt = (d: Date) => d.toISOString().split("T")[0];
	const todayStr = getEasternDateKey();
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
				const pct = calcPercentChange(reaction, prev);
				if (pct !== null) {
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
			const pct = calcPercentChange(reaction, prev);
			if (pct !== null) {
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
	const todayStr = getEasternDateKey(now);
	const tomorrowStr = getEasternDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
	const in7Days = getEasternDateKey(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

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

// ── Tickers tracked by the market-wide earnings calendar ────────────────────
// Derived from the full shared brand catalog instead of a hand-maintained list --
// every brand is tracked, but EarningsCalendar.tsx's MarketEarningsWidget already
// client-side filters to the viewer's own Stak before rendering, so this only
// changes what's trackable, not what any given viewer actually sees.
const MARKET_TICKERS: Record<string, string> = Object.fromEntries(
	brands.map((b) => [b.ticker.toUpperCase(), b.name]),
);

/** Market-wide earnings calendar for popular stocks — MUST be before /:symbol */
stockRouter.get("/market-earnings", async (req, res) => {
	const period = (req.query.period as string) ?? "today";
	const now = new Date();
	const todayStr = getEasternDateKey(now);

	try {
		let fromStr: string, toStr: string;
		if (period === "tomorrow") {
			fromStr = toStr = getEasternDateKey(new Date(now.getTime() + 86400000));
		} else if (period === "week") {
			// Full calendar week: Sunday → Saturday, anchored to ET "today" (not raw
			// now.getDay(), which is the server process's own local/UTC weekday and can
			// already be tomorrow's weekday in the US evening) -- todayStr is already
			// ET-correct, and noon-UTC whole-day arithmetic on it never crosses into a
			// different calendar day, same safe anchoring pattern used in dailyBrief.ts.
			const todayAnchor = new Date(todayStr + "T12:00:00Z");
			const dayOfWeek = todayAnchor.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
			const weekSunday = new Date(todayAnchor.getTime() - dayOfWeek * 86400000);
			const weekSaturday = new Date(weekSunday.getTime() + 6 * 86400000);
			fromStr = weekSunday.toISOString().split("T")[0];
			toStr = weekSaturday.toISOString().split("T")[0];
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
		// Bumped to v6 -- MARKET_TICKERS now derives from the full shared brand catalog
		// (333 tickers) instead of a hardcoded ~80-ticker list; a stale cache entry from
		// before this change would keep returning the narrower set.
		const cacheKey = `market-earnings:v6:${period}:${periodKey}${extraTickersKey ? `:${extraTickersKey}` : ""}`;
		const cached = await cacheGet(cacheKey);
		if (cached) { res.json(cached); return; }

		const data = await finnhubGet(`/calendar/earnings?from=${fromStr}&to=${toStr}`) as
			{ earningsCalendar?: FinnhubCalendarEntry[] } | null;

		const tickerSet = new Set([...Object.keys(MARKET_TICKERS), ...extraTickers]);
		const calEntries = (data?.earningsCalendar ?? []).filter((e) => tickerSet.has(e.symbol));

		const entries = await Promise.all(
			calEntries.map(async (e) => {
				const name = MARKET_TICKERS[e.symbol] ?? e.symbol;

				if (e.date > todayStr) {
					// Comfortably in the future — trust Finnhub's calendar directly, no need for
					// the full resolver's consensus/Gemini calls. This endpoint processes many
					// tickers per request; running the full pipeline on dates that aren't even
					// close yet would be needlessly expensive. The risky window (same-day-not-
					// yet-reported, or Finnhub disagreeing with reality) is today-or-earlier,
					// handled by the shared resolver below.
					const revChangePct = e.revenueActual != null && e.revenueEstimate != null
						? calcPercentChange(e.revenueActual, e.revenueEstimate)
						: null;
					return {
						symbol: e.symbol, name, date: e.date, hour: e.hour || null,
						epsActual: e.epsActual, epsEstimate: e.epsEstimate,
						epsSurprisePct: null, priceChangePct: null,
						revChangePct, status: "upcoming" as const,
					};
				}

				const resolved = await resolveEarningsStatus(e.symbol, name, todayStr, e);
				// Consensus may have corrected the date — if that lands outside the requested
				// period window, exclude it rather than leaking into the wrong tab.
				if (resolved.date && (resolved.date < fromStr || resolved.date > toStr)) return null;
				const priceChangePct = (resolved.status === "beat" || resolved.status === "miss")
					? await getPriceChangePct(e.symbol, resolved.date ?? e.date, resolved.hour ?? e.hour)
					: null;
				return {
					symbol: e.symbol, name, date: resolved.date ?? e.date, hour: resolved.hour ?? (e.hour || null),
					epsActual: resolved.epsActual, epsEstimate: resolved.epsEstimate, epsSurprisePct: resolved.epsSurprisePct,
					priceChangePct, revChangePct: resolved.revChangePct, status: resolved.status,
				};
			}),
		);

		// Filter out nulls (entries excluded by period-window guard after consensus date correction)
		const filteredEntries = entries.filter((e): e is NonNullable<typeof e> => e !== null);

		// ── Fallback for Stak tickers Finnhub's calendar missed entirely ────────────
		// extraTickers = all tickers from the user's Stak (sent by the frontend). Finnhub
		// having no calendar entry doesn't necessarily mean nothing happened — same shared
		// resolver, just with no calendar entry to anchor on (it'll fall back to date
		// consensus, then Finnhub's own EPS-history freshness, then Gemini as a last resort).
		if (extraTickers.length > 0) {
			const finnhubFoundSymbols = new Set(calEntries.map((e) => e.symbol));
			const missingStakTickers = extraTickers.filter((t) => !finnhubFoundSymbols.has(t));

			const supplements = await Promise.all(
				missingStakTickers.map(async (ticker) => {
					const name = MARKET_TICKERS[ticker] ?? ticker;
					const resolved = await resolveEarningsStatus(ticker, name, todayStr, null);
					// This section exists specifically to catch reports Finnhub's calendar
					// missed -- an "upcoming"/"none" result has no calendar entry to anchor a
					// useful date/hour against, so only confirmed reports are worth surfacing here.
					if (resolved.status !== "beat" && resolved.status !== "miss") return null;
					if (!resolved.date || resolved.date < fromStr || resolved.date > toStr) return null;
					const priceChangePct = await getPriceChangePct(ticker, resolved.date, resolved.hour);
					return {
						symbol: ticker, name, date: resolved.date, hour: resolved.hour,
						epsActual: resolved.epsActual, epsEstimate: resolved.epsEstimate, epsSurprisePct: resolved.epsSurprisePct,
						priceChangePct, revChangePct: resolved.revChangePct, status: resolved.status,
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
		// week/tomorrow: 6h, dates don't shift mid-period. today: 15min while anything is
		// still genuinely pending (matches /:symbol/earnings' same-day TTL, so a transition
		// to beat/miss is picked up quickly instead of sitting stale for up to an hour);
		// 1h once everything for today is already resolved, since nothing left to change.
		const hasPendingToday = period === "today" && filteredEntries.some(
			(e) => e.status === "upcoming" && e.date === todayStr,
		);
		const cacheTtl = period !== "today" ? 6 * 60 * 60 * 1000 : hasPendingToday ? 15 * 60 * 1000 : 60 * 60 * 1000;
		await cacheSet(cacheKey, result, cacheTtl);
		res.json(result);
	} catch (error) {
		console.error("Error fetching market earnings:", error);
		res.status(500).json({ error: "Failed to fetch market earnings" });
	}
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

// A web-search-derived report date this old can't be "the report we're checking for" —
// wider than any single quarter, so it only catches genuine staleness/hallucination, e.g.
// the AI fallback finding a same-month report from a prior year instead of the current one.
const MAX_PLAUSIBLE_REPORT_AGE_DAYS = 100;

// SEC rules require quarterly filings within ~40-45 days of quarter-end, so any real
// company's reporting lag is bounded by that — a freshly reported quarter is always
// "young" by this measure. The *previous* quarter's period, sitting unchanged in
// Finnhub's history right before a new report drops, is naturally ~85-90 days old (the
// ~91-day gap between quarters). 60 days sits safely between those two cases: comfortably
// above any real lag, comfortably below "this is actually last quarter's leftover data."
const EPS_PERIOD_FRESHNESS_DAYS = 60;

// True only if this EPS entry's fiscal period is recent enough to plausibly BE the report
// currently being checked for — not just that *some* actual value exists. Without this,
// "alreadyReported" would be true for literally any company with reporting history, since
// Finnhub's "latest" entry is always last quarter's real result until the new one posts,
// and last quarter's period is *always* going to look "recent-ish" right before that —
// it's only ~91 days old, not stale by any wide margin, just not THIS report.
function isRecentEpsEntry(entry: { period: string } | null, now: Date): boolean {
	if (!entry?.period) return false;
	const ageDays = (now.getTime() - new Date(entry.period + "T12:00:00Z").getTime()) / 86400000;
	return ageDays >= 0 && ageDays <= EPS_PERIOD_FRESHNESS_DAYS;
}

interface ResolvedEarnings {
	status: "upcoming" | "beat" | "miss" | "none";
	date: string | null;
	hour: string | null;
	epsActual: number | null;
	epsEstimate: number | null;
	epsSurprisePct: number | null;
	revChangePct: number | null;
}

/**
 * Single source of truth for "is this stock's earnings actually in, and was it a beat or
 * miss" — shared by /:symbol/earnings and /market-earnings so this logic only ever needs
 * fixing in one place. Previously each endpoint had its own copy; one got hardened against
 * Finnhub calendar gaps and AI hallucination, the other didn't, and kept showing wrong
 * results independently.
 *
 * calendarEntry: the caller's own Finnhub calendar entry for this symbol, if it has one —
 * null means no calendar entry was found (which can mean either Finnhub genuinely has
 * nothing, or a gap in Finnhub's calendar data for this specific ticker).
 */
async function resolveEarningsStatus(
	symbol: string,
	companyName: string | undefined,
	todayStr: string,
	calendarEntry: FinnhubCalendarEntry | null,
): Promise<ResolvedEarnings> {
	const now = new Date(todayStr + "T12:00:00Z");
	const empty: Omit<ResolvedEarnings, "status" | "date"> = {
		hour: null, epsActual: null, epsEstimate: null, epsSurprisePct: null, revChangePct: null,
	};

	// Ground truth for "has the company actually reported yet" — checked up front so every
	// branch below can defer to it instead of guessing from dates alone (a report scheduled
	// for *today* hasn't happened yet the moment markets open, even though date === todayStr).
	// Two independent Finnhub signals, not one: /stock/earnings (latestEps) and the calendar
	// entry's own epsActual field can update on different schedules, so a report that's
	// landed but hasn't shown up in one might already be visible in the other. Prefer
	// latestEps (it's the one with full surprise-history context); fall back to the
	// calendar's actual/estimate only when latestEps hasn't caught up yet.
	const latestEps = await getLatestEpsEntry(symbol);
	const confirmedEps = (latestEps?.actual != null && isRecentEpsEntry(latestEps, now))
		? latestEps
		: calendarEntry?.epsActual != null
			? { actual: calendarEntry.epsActual, estimate: calendarEntry.epsEstimate, period: calendarEntry.date }
			: null;
	const alreadyReported = confirmedEps != null;

	// ── 1. Finnhub itself confirms a report is in: compute beat/miss from its structured
	// actual-vs-estimate directly. No AI guessing needed — this is the common case for any
	// stock Finnhub covers. Checked first, ahead of any "is it still upcoming" date lookup
	// below: those lookups (calendar consensus, Yahoo/FMP/Gemini majority vote) answer "when
	// will this report," a question that no longer applies once a report has actually landed.
	// Asking it anyway risks a stale "next date" guess from another source overriding a result
	// Finnhub already confirmed (seen live with MU: its calendar entry already had actual EPS
	// for the report that posted, but the cross-source vote still won with a later placeholder
	// date, so the company never showed up in "earnings this week" despite already reporting).
	if (alreadyReported && confirmedEps) {
		const reportDateAnchor = calendarEntry?.date ?? todayStr;
		const consensusResult = await getConsensusEarningsResult(symbol, companyName, reportDateAnchor, {
			epsActual: confirmedEps.actual,
			epsEstimate: confirmedEps.estimate,
			revenueActual: calendarEntry?.revenueActual ?? null,
			revenueEstimate: calendarEntry?.revenueEstimate ?? null,
		});
		const finnhubDirectStatus: "beat" | "miss" | null =
			confirmedEps.actual != null && confirmedEps.estimate != null
				? (confirmedEps.actual >= confirmedEps.estimate ? "beat" : "miss")
				: null;
		// Finnhub's own actual-vs-estimate wins when available — most direct, least
		// ambiguous. Fall back to the cross-source vote only if Finnhub lacks an estimate.
		return {
			status: finnhubDirectStatus ?? consensusResult.status, date: reportDateAnchor,
			hour: calendarEntry?.hour || null, epsActual: consensusResult.epsActual, epsEstimate: consensusResult.epsEstimate,
			epsSurprisePct: consensusResult.epsSurprisePct, revChangePct: consensusResult.revChangePct,
		};
	}

	// ── 2. Not yet confirmed reported — trust the calendar entry, verified against the
	// 4-source consensus ──
	if (calendarEntry) {
		const consensus = await getConsensusEarningsDate(symbol, companyName, calendarEntry.date);
		const confirmedDate = consensus.date ?? calendarEntry.date;
		if (confirmedDate > todayStr) {
			return { ...empty, status: "upcoming", date: confirmedDate, hour: calendarEntry.hour || null, epsEstimate: calendarEntry.epsEstimate };
		}
		// Still upcoming if it's today but Finnhub doesn't have actual results yet --
		// a same-day report isn't "past" until it lands. Finnhub's own two endpoints can
		// both lag a real announcement by hours, though, so before settling for another
		// cache cycle of "upcoming", check whether a same-day earnings article already
		// exists in Finnhub's news feed -- if so, it's worth asking the full cross-source
		// consensus (FMP/Yahoo/Gemini, each independently date-checked) right now instead
		// of waiting. The article is only ever a trigger, never the verdict: if consensus
		// also comes back with nothing, this still falls through to "upcoming" below, so a
		// false-positive keyword match can only cost one extra check, never a wrong status.
		if (confirmedDate === todayStr) {
			if (await hasSameDayEarningsArticle(symbol, companyName, todayStr)) {
				const consensusResult = await getConsensusEarningsResult(symbol, companyName, todayStr, {
					epsActual: null,
					epsEstimate: calendarEntry.epsEstimate,
					revenueActual: calendarEntry.revenueActual,
					revenueEstimate: calendarEntry.revenueEstimate,
				});
				if (consensusResult.status !== "none") {
					return {
						status: consensusResult.status, date: todayStr, hour: calendarEntry.hour || null,
						epsActual: consensusResult.epsActual, epsEstimate: consensusResult.epsEstimate,
						epsSurprisePct: consensusResult.epsSurprisePct, revChangePct: consensusResult.revChangePct,
					};
				}
			}
			return { ...empty, status: "upcoming", date: confirmedDate, hour: calendarEntry.hour || null, epsEstimate: calendarEntry.epsEstimate };
		}
	}

	// ── 3. No calendar entry — run consensus to check for an upcoming date anyway ──
	if (!calendarEntry) {
		const consensus = await getConsensusEarningsDate(symbol, companyName, null);
		if (consensus.date && consensus.date >= todayStr) {
			return { ...empty, status: "upcoming", date: consensus.date };
		}
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
		return { ...empty, status: "none", date: null };
	}

	const consensusResult = await getConsensusEarningsResult(symbol, companyName, reportDate, {
		epsActual: null,
		epsEstimate: null,
	});

	// Use consensus status; fall back to geminiSignal if consensus found nothing
	const finalStatus = consensusResult.status !== "none" ? consensusResult.status : geminiSignal as "beat" | "miss";
	return {
		status: finalStatus, date: reportDate, hour: null,
		epsActual: consensusResult.epsActual, epsEstimate: consensusResult.epsEstimate,
		epsSurprisePct: consensusResult.epsSurprisePct, revChangePct: consensusResult.revChangePct,
	};
}

stockRouter.get("/:symbol/earnings", async (req, res) => {
	const symbol = req.params.symbol.toUpperCase();
	const companyName = req.query.name as string | undefined;
	// Bumped to v8 to invalidate bad results cached by the previous (still buggy) deploys.
	const cacheKey = `earnings:v8:${symbol}`;

	try {
		const cached = await cacheGet<EarningsStatus>(cacheKey);
		if (cached) { res.json(cached); return; }

		const now = new Date();
		const todayStr = getEasternDateKey(now);

		const in90Days = getEasternDateKey(new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000));
		const calData = await finnhubGet(`/calendar/earnings?from=${todayStr}&to=${in90Days}`) as
			{ earningsCalendar?: FinnhubCalendarEntry[] } | null;
		const calendarEntry = calData?.earningsCalendar?.find((e) => e.symbol === symbol) ?? null;

		const resolved = await resolveEarningsStatus(symbol, companyName, todayStr, calendarEntry);
		const result: EarningsStatus = {
			status: resolved.status, date: resolved.date,
			...(resolved.hour ? { hour: resolved.hour } : {}),
		};

		const ttl = result.status === "upcoming"
			? (result.date === todayStr ? 15 * 60 * 1000 : 60 * 60 * 1000)
			: result.status === "none" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
		await cacheSet(cacheKey, result, ttl);
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
				if (gemRes.status === 429) {
					console.warn(`[Gemini] analyst price-target(${symbol}) rate limited (429) on key ...${key.slice(-4)} — trying next`);
					continue;
				}
				if (!gemRes.ok) {
					console.warn(`[Gemini] analyst price-target(${symbol}) got ${gemRes.status} on key ...${key.slice(-4)} — giving up`);
					break;
				}
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
			} catch (e) {
				console.warn(`[Gemini] analyst price-target(${symbol}) errored on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
			} finally { clearTimeout(timeout); }
		}
		if (priceTarget === null) {
			console.warn(`[Gemini] analyst price-target(${symbol}): all ${keys.length} keys exhausted/failed — no coverage shown`);
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
			if (gemRes.status === 429) {
				console.warn(`[Gemini] analyst-actions(${symbol}) rate limited (429) on key ...${key.slice(-4)} — trying next`);
				continue;
			}
			if (!gemRes.ok) {
				console.warn(`[Gemini] analyst-actions(${symbol}) got ${gemRes.status} on key ...${key.slice(-4)} — giving up`);
				break;
			}
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
				console.warn(`[Gemini] analyst-actions(${symbol}): unparseable response on key ...${key.slice(-4)}`);
			}
		} catch (e) {
			console.warn(`[Gemini] analyst-actions(${symbol}) errored on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
		} finally {
			clearTimeout(timeout);
		}
	}

	console.warn(`[Gemini] analyst-actions(${symbol}): all ${keys.length} keys exhausted/failed — returning empty`);
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
	const peerTickers = getPeerTickers(ticker, brands);

	// Bumped to v2 -- peerTickers now comes from getPeerTickers() (category +
	// market-cap fallback) instead of the old static PEER_GROUPS map, so some
	// tickers' peer lists changed (e.g. MTCH went from [] to a real list after
	// fixing a ticker-key typo) -- a stale v1 cache entry would keep serving
	// the old, sometimes-empty list for up to its full TTL after deploy.
	const cacheKey = `peer-metrics:v2:${ticker}`;
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

type DailyMoveResult = { explanation: string; direction: "up" | "down" | "flat"; bullets?: Array<{ text: string; tone: string }> };

// In-flight de-dup: when the cache is cold and two requests for the exact same key
// land concurrently (e.g. two people opening the same stock seconds apart), the
// second one awaits the first's already-running Gemini call instead of starting its
// own -- without this, both compete for the same small pool of Gemini keys at once,
// making a 429 on one of them more likely right when it matters most. Per-instance
// only (not shared across Cloud Run instances via Redis), but covers the common case.
const dailyMoveInFlight = new Map<string, Promise<DailyMoveResult>>();

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

	const cacheKey = `daily-move:v11:${symbol}:${direction}:s${sentences}:${closeRef}`;
	const cached = await cacheGet<DailyMoveResult>(cacheKey);
	if (cached !== null) { res.json(cached); return; }

	const existing = dailyMoveInFlight.get(cacheKey);
	if (existing) { res.json(await existing); return; }

	const compute = computeDailyMove({ symbol, changePercent, companyName, sentences, marketClosed, closeRef, direction, cacheKey });
	dailyMoveInFlight.set(cacheKey, compute);
	try {
		res.json(await compute);
	} finally {
		dailyMoveInFlight.delete(cacheKey);
	}
});

async function computeDailyMove(params: {
	symbol: string; changePercent: number; companyName: string; sentences: number;
	marketClosed: boolean; closeRef: string; direction: "up" | "down" | "flat"; cacheKey: string;
}): Promise<DailyMoveResult> {
	const { symbol, changePercent, companyName, sentences, marketClosed, closeRef, direction, cacheKey } = params;
	const sign = changePercent >= 0 ? "+" : "";
	const moveSummary = `${sign}${changePercent.toFixed(2)}%`;
	const subject = companyName !== symbol ? `${companyName} (${symbol})` : symbol;
	// "today" = live market | "close" = finalized same-day close | "yesterday"/"Friday" = prior session
	const timeRef = closeRef === "today" ? "today" : closeRef === "close" ? "at today's close" : `at ${closeRef}'s close`;
	const searchRef = (closeRef === "today" || closeRef === "close") ? "today" : closeRef;

	const keys = getGeminiKeys();
	if (keys.length === 0) {
		return { explanation: `${subject} was ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} ${timeRef}.`, direction };
	}

	// Pure Gemini + Google Search — no Finnhub dependency.
	// Up/down moves need the explanation to actually justify that direction, not just
	// report nearby news -- without this, a stock can fall on broad weakness while
	// Gemini still surfaces a same-week analyst upgrade and calls it a day, leaving a
	// set of bullish-sounding bullets next to a red price badge.
	const directionNote = direction !== "flat"
		? ` The explanation must justify why it moved ${direction} specifically -- don't just report any recent news about the company. If the most prominent headline (an upgrade, a price-target raise, a positive-sounding announcement) doesn't obviously match that direction, explain the market's actual read on it instead (e.g. a price increase seen as a demand risk, profit-taking after a run-up, a beat that still missed whisper numbers, broad sector/market weakness) rather than presenting it as good news that contradicts the move.`
		: "";
	const prompt = sentences > 1
		? `${subject} stock (ticker: ${symbol}) was ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} ${timeRef}.${marketClosed ? " Note: US markets are currently closed." : ""}

Search the web for the latest news on why ${symbol} moved ${searchRef}.

Figure out the full story — then distill it into exactly 3 short bullet points a young investor can instantly understand. Think of it like turning a paragraph explanation into the 3 most important takeaways.${directionNote}

Return ONLY a valid JSON array of exactly 3 objects. No markdown, no extra text before or after:
[{"text":"...","tone":"bearish"},{"text":"...","tone":"neutral"},{"text":"...","tone":"bullish"}]

Rules:
- The 3 bullets, taken together, must add up to a coherent explanation for the move's actual direction — not 3 disconnected headlines
- Each bullet is a key point from the story — no fixed structure, just what matters most
- Max 12 words per bullet. Think headline, not sentence.
- Do NOT restate that the stock went up or down — the user already sees the price move. Jump straight to the reason why.
- Use real numbers and data when available. Use → for changes (e.g. "odds dropped 25% → 15%")
- tone must be exactly "bullish", "bearish", or "neutral" — pick whichever fits that point
- Plain everyday language — no jargon, no "it is worth noting", no filler
- When referencing when the move happened, use "${timeRef}" — do not substitute a different time reference`
		: `${subject} stock (ticker: ${symbol}) was ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} ${timeRef}.${marketClosed ? " Note: US markets are currently closed." : ""}

Search the web right now for the specific reason why ${symbol} moved ${searchRef}. Look for: earnings results, product announcements, analyst upgrades/downgrades, partnerships, regulatory news, or broader sector moves.

Write exactly 1 sentence (max 20 words) explaining the main catalyst to a young investor. Be specific — name the actual event. Do not say "various factors" or be vague.${directionNote} Use "${timeRef}" when referencing when the move happened.

Return ONLY that single sentence — no bullet points, no markdown, no JSON, no additional sentences.`;

	for (const key of keys) {
		const controller = new AbortController();
		// Shortened from 15s -- with up to 3 keys tried sequentially, a 15s-per-key worst
		// case (~45s total) risked outliving some intermediate timeout between browser and
		// backend, killing the connection well before the fallback at the end of this loop
		// ever got a chance to run.
		const timeout = setTimeout(() => controller.abort(), 8000);
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
			if (gemRes.status === 429) {
				console.warn(`[Gemini] daily-move(${symbol}) rate limited (429) on key ...${key.slice(-4)} — trying next`);
				continue;
			}
			if (!gemRes.ok) {
				console.warn(`[Gemini] daily-move(${symbol}) got ${gemRes.status} on key ...${key.slice(-4)} — giving up`);
				break;
			}
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
							return result;
						}
					}
				} catch { /* fall through to plain text fallback */ }
				if (raw) {
					const result = { explanation: raw, direction };
					await cacheSet(cacheKey, result, DAILY_MOVE_TTL_MS);
					return result;
				}
			} else {
				const explanation = raw.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? raw.split("\n")[0]?.trim() ?? raw;
				if (explanation) {
					const result = { explanation, direction };
					await cacheSet(cacheKey, result, DAILY_MOVE_TTL_MS);
					return result;
				}
			}
		} catch (e) {
			console.warn(`[Gemini] daily-move(${symbol}) errored on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
		} finally {
			clearTimeout(timeout);
		}
	}

	// All keys exhausted or errored — return simple fallback
	console.warn(`[Gemini] daily-move(${symbol}): all ${keys.length} keys exhausted/failed — falling back to generic explanation`);
	const fallback = { explanation: `${symbol} is ${direction === "flat" ? "roughly flat" : `${direction} ${moveSummary}`} today.`, direction };
	await cacheSet(cacheKey, fallback, 5 * 60 * 1000); // short TTL so we retry sooner
	return fallback;
}

// ── Key risk ──────────────────────────────────────────────────────────────────
// GET /api/stock/:symbol/key-risk
// Gemini + Google Search: 1-2 sentence financial/macro risk for this stock.
// Cached 6 hours — risks don't change minute-to-minute.

stockRouter.get("/:symbol/key-risk", async (req, res) => {
	const symbol = resolveSymbol((req.params["symbol"] as string).toUpperCase());
	const companyName = ((req.query.name as string | undefined) || symbol).trim();
	const betaStr = req.query.beta as string | undefined;
	const peStr = req.query.pe as string | undefined;

	const today = getEasternDateKey();
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
			if (gemRes.status === 429) {
				console.warn(`[Gemini] key-risk(${symbol}) rate limited (429) on key ...${key.slice(-4)} — trying next`);
				continue;
			}
			if (!gemRes.ok) {
				console.warn(`[Gemini] key-risk(${symbol}) got ${gemRes.status} on key ...${key.slice(-4)} — giving up`);
				break;
			}
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
		} catch (e) {
			console.warn(`[Gemini] key-risk(${symbol}) errored on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
		} finally {
			clearTimeout(timeout);
		}
	}

	console.warn(`[Gemini] key-risk(${symbol}): all ${keys.length} keys exhausted/failed — returning null`);
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

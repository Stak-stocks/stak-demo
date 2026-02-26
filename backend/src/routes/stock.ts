import { Router } from "express";

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

interface CalEntry {
	date: string;
	hour: string;
	epsActual: number | null;
	epsEstimate: number | null;
}

interface EarningsStatus {
	status: "upcoming" | "beat" | "miss" | "reported" | "none";
	date: string | null;
	hour?: string;
}

stockRouter.get("/:symbol/earnings", async (req, res) => {
	const symbol = req.params.symbol.toUpperCase();
	const cacheKey = `earnings2:${symbol}`;

	const cached = getCached(cacheKey) as EarningsStatus | null;
	if (cached) { res.json(cached); return; }

	const now = new Date();
	const fmt = (d: Date) => d.toISOString().split("T")[0];
	const todayStr = fmt(now);
	// Show beat/miss for 2 days: from = yesterday so entries disappear after day+1
	const from = fmt(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000));
	// Upcoming window: next 14 days
	const to = fmt(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));

	const calData = await finnhubGet(
		`/calendar/earnings?from=${from}&to=${to}&symbol=${symbol}`,
	) as { earningsCalendar?: CalEntry[] } | null;

	const entries = calData?.earningsCalendar ?? [];

	// Entries where earnings already happened and actuals are published
	const reported = entries
		.filter((e) => e.date <= todayStr && e.epsActual != null)
		.sort((a, b) => b.date.localeCompare(a.date));

	// Entries that are still in the future (or today pre-announcement)
	const upcoming = entries
		.filter((e) => e.date > todayStr || (e.date === todayStr && e.epsActual == null))
		.sort((a, b) => a.date.localeCompare(b.date));

	let result: EarningsStatus;

	if (reported.length > 0) {
		const latest = reported[0];
		const beat =
			latest.epsActual != null && latest.epsEstimate != null
				? latest.epsActual >= latest.epsEstimate
				: null;
		result = {
			status: beat === true ? "beat" : beat === false ? "miss" : "reported",
			date: latest.date,
		};
	} else if (upcoming.length > 0) {
		const next = upcoming[0];
		result = { status: "upcoming", date: next.date, hour: next.hour };
	} else {
		result = { status: "none", date: null };
	}

	setCached(cacheKey, result, EARNINGS_TTL_MS);
	res.json(result);
});

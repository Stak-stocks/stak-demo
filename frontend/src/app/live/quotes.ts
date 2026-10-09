/**
 * Prices. The STAK API serves live quotes (`/api/stock/:symbol`); when it is unreachable or the
 * symbol is unknown, the demo table answers so every screen still has a number. One health
 * probe per session decides which, so an offline API costs a single request, not one per card.
 */
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { getMarketStatusLive, getStockData } from "@/lib/api";
import { normalizeTicker } from "./catalog";
import { DEMO_QUOTES } from "./demoQuotes";
import { round2 } from "./format";

export type Quote = { ticker: string; price: number; change: number; changePercent: number; live: boolean };

export const hasDemoQuote = (ticker: string) => normalizeTicker(ticker) in DEMO_QUOTES;

const demoCache = new Map<string, Quote | null>();

/** The demo table's quote: one object per ticker for the whole session, so memos keyed on quotes hold. */
export function demoQuote(ticker: string): Quote | null {
	const t = normalizeTicker(ticker);
	const hit = demoCache.get(t);
	if (hit !== undefined) return hit;
	const d = DEMO_QUOTES[t];
	const prev = d ? d.price / (1 + d.changePercent / 100) : 0;
	const q: Quote | null = d ? { ticker: t, price: d.price, changePercent: d.changePercent, change: round2(d.price - prev), live: false } : null;
	demoCache.set(t, q);
	return q;
}

const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

/**
 * The API health probe. `settled` is false until the first answer; a reachable API is trusted for five
 * minutes, an unreachable one is asked again every 30 s so one slow probe cannot pin the app to demo prices.
 */
export function useApiHealthState(): { healthy: boolean; settled: boolean } {
	const client = useQueryClient();
	const q = useQuery({
		queryKey: ["stak-api-health"],
		queryFn: async () => {
			try {
				const status = await Promise.race([getMarketStatusLive(), timeout(2500)]);
				client.setQueryData(["market-status"], status); // the probe's answer is the market status Home and News show: one request, not two
				return true;
			} catch {
				return false;
			}
		},
		staleTime: (query) => (query.state.data === false ? 30_000 : 5 * 60_000),
		refetchInterval: (query) => (query.state.data === false ? 30_000 : false),
		gcTime: 30 * 60_000,
		retry: false,
	});
	return { healthy: q.data === true, settled: q.data !== undefined };
}

/** True once the API answered the market-status probe; false while it is pending or when it did not. */
export function useApiHealth(): boolean {
	return useApiHealthState().healthy;
}

type StockData = Awaited<ReturnType<typeof getStockData>>;

/** The API's full answer for a symbol (quote, metrics, ranges), shared by every screen that asks about it. */
export const stockDataQuery = (ticker: string, enabled: boolean) => ({
	queryKey: ["stock-data", ticker],
	queryFn: (): Promise<StockData> => Promise.race([getStockData(ticker), timeout(6000)]),
	enabled,
	staleTime: 60_000,
	retry: 0,
});

// one selector per ticker, so TanStack Query reuses the selected Quote object instead of building a new one every render
const selectors = new Map<string, (data: StockData) => Quote | null>();
function quoteSelector(ticker: string) {
	let fn = selectors.get(ticker);
	if (!fn) {
		fn = (data) => {
			const q = data?.quote;
			if (!q || typeof q.price !== "number") return null;
			return { ticker, price: q.price, change: q.change ?? 0, changePercent: q.changePercent ?? 0, live: true };
		};
		selectors.set(ticker, fn);
	}
	return fn;
}

/** The shared quote query (the stock-data cache seen as a Quote) for screens that must know when a live quote is still loading. */
export const quoteQuery = (ticker: string, enabled: boolean) => ({ ...stockDataQuery(ticker, enabled), select: quoteSelector(ticker) });

/** The live quote when the API has one, the demo quote otherwise, null for an unknown symbol. */
export function useQuote(ticker: string): Quote | null {
	const t = normalizeTicker(ticker);
	const healthy = useApiHealth();
	const q = useQuery(quoteQuery(t, healthy && t.length > 0));
	return q.data ?? demoQuote(t);
}

/** Quotes for a list of tickers, keyed by ticker (missing when neither source knows it). */
export function useQuotes(tickers: readonly string[]): Record<string, Quote> {
	const healthy = useApiHealth();
	const list = [...new Set(tickers.map(normalizeTicker).filter(Boolean))];
	const results = useQueries({ queries: list.map((t) => quoteQuery(t, healthy)) });
	const next: Record<string, Quote> = {};
	list.forEach((t, i) => {
		const q = results[i]?.data ?? demoQuote(t);
		if (q) next[t] = q;
	});
	// hand back the previous record while nothing in it changed, so memos keyed on quotes hold between renders
	const prev = useRef(next);
	if (!sameQuotes(prev.current, next)) prev.current = next;
	return prev.current;
}

function sameQuotes(a: Record<string, Quote>, b: Record<string, Quote>): boolean {
	const ka = Object.keys(a);
	if (ka.length !== Object.keys(b).length) return false;
	for (const k of ka) if (a[k] !== b[k]) return false;
	return true;
}

/** Market value of a position list at the given quotes. */
export function valueOf(positions: readonly { ticker: string; shares: number }[], quotes: Record<string, Quote>): number {
	return round2(positions.reduce((sum, p) => sum + p.shares * (quotes[normalizeTicker(p.ticker)]?.price ?? 0), 0));
}

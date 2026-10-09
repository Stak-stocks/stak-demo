/**
 * Prices. The STAK API serves live quotes (`/api/stock/:symbol`); when it is unreachable or the
 * symbol is unknown, the demo table answers so every screen still has a number. One health
 * probe per session decides which, so an offline API costs a single request, not one per card.
 */
import { useQueries, useQuery } from "@tanstack/react-query";
import { getMarketStatusLive, getStockData } from "@/lib/api";
import { normalizeTicker } from "./catalog";
import { DEMO_QUOTES } from "./demoQuotes";
import { round2 } from "./format";

export type Quote = { ticker: string; price: number; change: number; changePercent: number; live: boolean };

export const hasDemoQuote = (ticker: string) => normalizeTicker(ticker) in DEMO_QUOTES;

export function demoQuote(ticker: string): Quote | null {
	const t = normalizeTicker(ticker);
	const d = DEMO_QUOTES[t];
	if (!d) return null;
	const prev = d.price / (1 + d.changePercent / 100);
	return { ticker: t, price: d.price, changePercent: d.changePercent, change: round2(d.price - prev), live: false };
}

const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

/** True once the API answered the market-status probe; false (and cached) when it did not. */
export function useApiHealth(): boolean {
	const q = useQuery({
		queryKey: ["stak-api-health"],
		queryFn: async () => {
			try {
				await Promise.race([getMarketStatusLive(), timeout(2500)]);
				return true;
			} catch {
				return false;
			}
		},
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
		retry: false,
	});
	return q.data === true;
}

async function fetchQuote(ticker: string): Promise<Quote | null> {
	const data = await Promise.race([getStockData(ticker), timeout(6000)]);
	const q = data?.quote;
	if (!q || typeof q.price !== "number") return null;
	return { ticker, price: q.price, change: q.change ?? 0, changePercent: q.changePercent ?? 0, live: true };
}

/** The shared quote query (same key as useQuote / useQuotes) for screens that must know when a live quote is still loading. */
export const quoteQuery = (ticker: string, enabled: boolean) => ({
	queryKey: ["quote", ticker],
	queryFn: () => fetchQuote(ticker),
	enabled,
	staleTime: 60_000,
	retry: 0,
});

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
	const out: Record<string, Quote> = {};
	list.forEach((t, i) => {
		const q = results[i]?.data ?? demoQuote(t);
		if (q) out[t] = q;
	});
	return out;
}

/** Market value of a position list at the given quotes. */
export function valueOf(positions: readonly { ticker: string; shares: number }[], quotes: Record<string, Quote>): number {
	return round2(positions.reduce((sum, p) => sum + p.shares * (quotes[normalizeTicker(p.ticker)]?.price ?? 0), 0));
}

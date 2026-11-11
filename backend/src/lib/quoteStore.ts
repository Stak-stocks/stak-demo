/**
 * Where each symbol's last Finnhub quote is kept, and for how long - read and written by stock.ts's getQuote (every
 * price feed) and sandbox.ts's fills. Stored as { q: Finnhub's quote, at: when it was fetched }.
 */
export const QUOTE_KEEP_MS = 3 * 24 * 60 * 60 * 1000;

export function quoteKey(symbol: string): string {
	return `quote:v2:${symbol}`;
}

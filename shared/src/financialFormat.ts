/** Formats a market cap given in millions of USD into a display string (e.g. "$1.55T", "$55.9B", "$900M"). */
export function formatMarketCap(millions: number): string {
	if (millions >= 1_000_000) return `$${(millions / 1_000_000).toFixed(2)}T`;
	if (millions >= 1_000) return `$${(millions / 1_000).toFixed(1)}B`;
	return `$${millions.toFixed(0)}M`;
}

/**
 * Percent change of `actual` relative to `baseline`, rounded to 1 decimal place.
 * Used for price moves, EPS surprise, and revenue surprise — all the same formula,
 * previously copy-pasted separately at each call site.
 */
export function calcPercentChange(actual: number, baseline: number): number | null {
	if (baseline === 0) return null;
	return Math.round(((actual - baseline) / Math.abs(baseline)) * 1000) / 10;
}

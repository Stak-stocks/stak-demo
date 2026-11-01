// Parses formatted financial display strings (e.g. "$1.55T", "23.4%", "45.2x", "1,234")
// back into a number, correctly applying T/B/M/K magnitude suffixes. A naive
// parseFloat(str.replace(/[^0-9.-]/g, "")) silently drops the suffix, which previously
// caused market-cap comparisons to rank a $1.55T company below a $55.9B one.
export function parseFinancialValue(raw: string | number | null | undefined): number | null {
	if (raw == null) return null;
	if (typeof raw === "number") return isNaN(raw) ? null : raw;
	const s = raw.trim();
	if (s === "" || s === "N/A" || s === "—") return null;

	const cleaned = s.replace(/[$%x,]/gi, "");
	const match = cleaned.match(/^(-?[\d.]+)\s*([TBMK])?$/i);
	if (!match) {
		const n = parseFloat(cleaned);
		return isNaN(n) ? null : n;
	}

	const n = parseFloat(match[1]);
	if (isNaN(n)) return null;
	const suffix = match[2]?.toUpperCase();
	const multiplier = suffix === "T" ? 1e12 : suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1;
	return n * multiplier;
}

export type MarketCapTier = "mega_cap" | "large_cap" | "mid_cap" | "small_cap";

const MARKET_CAP_LABELS: Record<MarketCapTier, string> = {
	mega_cap: "Mega Cap",
	large_cap: "Large Cap",
	mid_cap: "Mid Cap",
	small_cap: "Small Cap",
};

// Thresholds are absolute USD, not raw display-unit numbers — classifying off the
// unconverted number (e.g. "900" from "$900M") is the same bug class as above.
export function classifyMarketCap(raw: string | number | null | undefined): { tier: MarketCapTier; label: string } | null {
	const usd = parseFinancialValue(raw);
	if (usd == null) return null;
	if (usd > 200e9) return { tier: "mega_cap", label: MARKET_CAP_LABELS.mega_cap };
	if (usd > 10e9) return { tier: "large_cap", label: MARKET_CAP_LABELS.large_cap };
	if (usd > 2e9) return { tier: "mid_cap", label: MARKET_CAP_LABELS.mid_cap };
	return { tier: "small_cap", label: MARKET_CAP_LABELS.small_cap };
}

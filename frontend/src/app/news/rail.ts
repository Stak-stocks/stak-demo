import { money, type Tone, toneOf } from "@/app/live/format";
import type { StatRows } from "./articles";

/**
 * The article rail's figures (Figma 2:4508 / 2:4613 ticker card, 2:4518 / 2:4632 Key stats) once they follow the
 * company's quote (the audit's news #5; the coordinator's D9: "the article rail uses the same quote as the stock page",
 * useQuote, superseding the build's story-consistent figures): the phones do the same, taking every catalogued company's
 * own quote and keeping only the authored Apple card frame-exact (android NewsArticleFeed.kt:512-522; iOS
 * NewsArticleFeed.swift:498-512). The template's formats are kept: "+4.84% today", "$4.58T", "34.2", "$301.20–$309.80",
 * "0.42%".
 */

/**
 * The tone of today's move on the ticker card, read at the precision the card prints it (two decimals), so the colour can
 * never contradict the figure: the shared rule of src/app/live/format.ts `toneOf` (ZERO IS NEUTRAL: the coordinator's
 * N23c / N28c / N30.3c). The change line and the card's line both take it (the route's ChangeLine, TickerLine.tsx
 * PriceLine).
 */
export const changeTone = (pct: number): Tone => toneOf(pct, 2);

/**
 * The ticker card's change line in the template's format (2:4625 "+4.84% today": a sign, two decimals). A move that
 * PRINTS zero carries no sign: "0.00% today", whether it is exactly flat or a rounding's worth either way (the review of
 * 2026-11-09: a flat day read "+0.00% today" in green and a move of -0.004% "-0.00% today" in red).
 */
export const changeToday = (pct: number): string => {
	const tone = changeTone(pct);
	return tone === "flat" ? "0.00% today" : `${tone === "down" ? "-" : "+"}${Math.abs(pct).toFixed(2)}% today`;
};

/** "$4.65T" (the catalog writes some caps without the sign, funds with " AUM") */
export const formatCap = (v: string): string => (v.startsWith("$") ? v : `$${v}`).replace(/\s*AUM$/, "");
/** "49.6": one decimal, as the frame's "34.2" */
export const formatPe = (v: string | number): string => {
	const n = Number(v);
	return Number.isFinite(n) && String(v).trim() !== "" ? n.toFixed(1) : String(v);
};
/** "0.03%": two decimals, as the frame's "0.42%" */
export const formatYield = (v: string): string => {
	const n = Number(String(v).replace("%", "").trim());
	return Number.isFinite(n) && String(v).trim() !== "" ? `${n.toFixed(2)}%` : v;
};
/** "$301.20–$309.80" */
export const formatRange = (lo: number, hi: number): string => `${money(lo)}–${money(hi)}`;

/** A range with no figure to show (no quote anywhere): the dash the phones print for a missing figure. */
export const NO_DATA = "—";

/** What the rail knows about the company besides its quote. */
export type RailSources = {
	/**
	 * The company's P/E and market cap as EVERY page prints them: src/app/stocks/fundamentals.ts `fundamentalsOf`, the ONE
	 * accessor of those figures (the coordinator's N23j / N23o; the hunt's NUM-05: NVDA's article said P/E 49.6 and
	 * $4.65T beside its stock page's 52.8 and $3.0T). null: a company nobody states a figure for.
	 */
	fundamentals?: { readonly text: { readonly pe: string; readonly cap: string } } | null;
	/** the STAK API's answer, used only when the quote itself is a live one (the same source as the price) */
	api: {
		marketCap?: string | null;
		peRatio?: number | null;
		dividendYield?: string | null;
		week52Low?: number | null;
		week52High?: number | null;
		dayLow?: number | null;
		dayHigh?: number | null;
	} | null;
	/** the catalog's financial snapshot (financialsOf): cap, P/E and yield */
	catalog: { marketCap?: { value: string }; peRatio?: { value: string }; dividendYield?: { value: string } } | null;
	/** the day's and the year's closes (FOUNDATION usePriceHistory 1D / 1Y), each ending at the quote */
	day: { low: number; high: number } | null;
	year: { low: number; high: number } | null;
};

const usable = (v: string | null | undefined): v is string => typeof v === "string" && v.trim() !== "";
const positive = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * The six Key stats cells of the template, in its order and labels (market cap, P/E ratio / day range, volume / 52-wk
 * range, div yield), from the quote's own sources, so no figure contradicts the price above it:
 * - market cap and P/E: the company's ONE figure, the stock pages' own (`fundamentals`: the phones' authored figures
 *   for their nineteen companies, the catalog's for the rest, "—" where it states none), whatever the quote's source: the
 *   article and the stock page it opens never print two P/Es or two caps (N23j, NUM-05). Only a company the accessor
 *   does not know falls back to the API's metrics when the quote is live, then the catalog's snapshot, then the
 *   record's showcase figure;
 * - dividend yield (not one of the accessor's figures): the API's when the quote is live, otherwise the catalog's
 *   snapshot, otherwise the record's showcase figure;
 * - day range: the API's day low / high when the quote is live, otherwise the low / high of the day's closes (the demo
 *   day runs from the previous close to the price, so the price is always inside it);
 * - 52-wk range: the API's when the quote is live, otherwise the low / high of the year's closes widened to hold the
 *   day's range (the year includes today);
 * - volume: the record's figure (the API sends no volume); a range with no source at all reads "—".
 */
export function railStats(authored: StatRows, src: RailSources): StatRows {
	const cell = (row: number, col: number) => authored[row]![col]!;
	const [cap, pe, day, vol, wk, dy] = [cell(0, 0), cell(0, 1), cell(1, 0), cell(1, 1), cell(2, 0), cell(2, 1)];
	const api = src.api ?? {};
	const catalogCap = src.catalog?.marketCap?.value;
	const catalogPe = src.catalog?.peRatio?.value;
	const catalogYield = src.catalog?.dividendYield?.value;
	const apiPe = api.peRatio;
	const one = src.fundamentals ?? null;
	const capValue = one ? one.text.cap : usable(api.marketCap) ? formatCap(api.marketCap) : usable(catalogCap) ? formatCap(catalogCap) : cap.value;
	const peValue = one ? one.text.pe : typeof apiPe === "number" && Number.isFinite(apiPe) ? formatPe(apiPe) : usable(catalogPe) ? formatPe(catalogPe) : pe.value;
	const yieldValue = usable(api.dividendYield) ? formatYield(api.dividendYield) : usable(catalogYield) ? formatYield(catalogYield) : dy.value;
	const { dayLow, dayHigh, week52Low, week52High } = api;
	const dayRange: [number, number] | null =
		positive(dayLow) && positive(dayHigh) ? [dayLow, dayHigh] : src.day ? [src.day.low, src.day.high] : null;
	const apiYear = positive(week52Low) && positive(week52High);
	let yearRange: [number, number] | null = apiYear ? [week52Low as number, week52High as number] : src.year ? [src.year.low, src.year.high] : null;
	// the year's closes end at the quote, but today's low may sit below its last bars: the year holds the day
	if (!apiYear && yearRange && dayRange) yearRange = [Math.min(yearRange[0], dayRange[0]), Math.max(yearRange[1], dayRange[1])];
	return [
		[
			{ label: cap.label, value: capValue },
			{ label: pe.label, value: peValue },
		],
		[
			{ label: day.label, value: dayRange ? formatRange(dayRange[0], dayRange[1]) : NO_DATA },
			{ label: vol.label, value: vol.value },
		],
		[
			{ label: wk.label, value: yearRange ? formatRange(yearRange[0], yearRange[1]) : NO_DATA },
			{ label: dy.label, value: yieldValue },
		],
	];
}

/**
 * The Simulate hero's chart ranges. The account's value over each range comes from the FOUNDATION module
 * (src/app/live/portfolioHistory.ts usePortfolioValueHistory, coordinator decisions D3 / D4): the STAK API's closes when
 * it answers, the deterministic demo series otherwise, so every range draws a line (this file's own API-only hook is
 * gone: nobody re-implements the history in a page, FOUNDATION-API.md).
 */
import type { HistoryRange, ValueHistory } from "@/app/live";

/** The range buttons of the "Mini chart" (2:650), in Figma's order; 1M is the frames' selected range. */
export const RANGES = ["1D", "1W", "1M", "1Y"] as const satisfies readonly HistoryRange[];
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = "1M";

/**
 * What the mini chart draws: Figma's own line (2:651, the untouched showcase on 1M), the account's value over the range,
 * the flat baseline (2:2269: a value that did not move), or, while the API's closes load, whatever was drawn before.
 */
export type ChartLine = { kind: "figma" } | { kind: "series"; values: number[] } | { kind: "flat" } | { kind: "pending" };

/** The line a value history draws (the caller draws Figma's own line for the showcase's 1M). */
export function lineFor(history: Pick<ValueHistory, "status" | "values">): ChartLine {
	if (history.status === "loading") return { kind: "pending" };
	const v = history.values;
	return v.length > 1 && Math.max(...v) - Math.min(...v) >= 0.005 ? { kind: "series", values: v } : { kind: "flat" };
}


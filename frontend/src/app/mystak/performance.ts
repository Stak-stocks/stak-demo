/**
 * The figures behind the performance card's range tabs (Figma 2:4804: 1D · 1W · 1M · 3M · YTD · 1Y).
 *
 * Every range draws a figure, a line and its best and worst saves (coordinator decision D3, 2026-11-07; mystak audit
 * item 2), as both phones do (android ui/mystak/MyStakScreen.kt:389-402 + ui/components/RangeChart.kt, iOS
 * Theme/RangeChart.swift). The closes come from the one shared price history (FOUNDATION, src/app/live/history.ts
 * usePriceHistories): the STAK API's closes when the company's quote is a live one and the endpoint answers, otherwise
 * the deterministic demo series per range that ends at the company's current (demo) price and agrees with its day move.
 * - 1D: the figure, the best and the worst are today's quotes (useCollections: the equal-weight average change across
 *   the saves, the best and the worst mover; they equal the 1D series' own moves); the line is the 1D histories'
 *   equal-weight index.
 * - 1W · 1M · 3M · YTD · 1Y: each save's move from the range's first close to its last, their equal-weight average,
 *   the best and the worst save, and the equal-weight index as the line.
 * - A company with no quote at all has no history and is left out ("Across N stocks" counts the ones with figures).
 * The untouched demo persona's 3M tab is the frame itself (SHOWCASE.performance and Figma's own chart line) and asks
 * this module for nothing (`skip`).
 */
import { useMemo } from "react";
import { usePriceHistories } from "@/app/live/history";
import type { StockChartPoint } from "@/lib/api";
import type { Range } from "./data";

export type Mover = { ticker: string; changePercent: number };

export type RangeFigures = {
	/** "ready": the figures exist; "loading": the API's closes are on their way; "none": nothing serves this range */
	status: "ready" | "loading" | "none";
	/** equal-weight % change across the saves over the range */
	value: number | null;
	/** how many saves the figure covers */
	count: number;
	best: Mover | null;
	worst: Mover | null;
	/** the saves' equal-weight index over the range, oldest first (first point = 100); null without a price series */
	series: number[] | null;
};

/** Today's figures, from the quotes (live/collections); `live`: every quote behind them is a live one. */
export type TodayFigures = { avgChange: number | null; best: Mover | null; worst: Mover | null; count: number; live: boolean };

/** The most points a line needs: the frame's own line has 45 vertices over 547px. */
export const MAX_POINTS = 200;

/**
 * Best and worst are named only once at least two saves have a figure: with one, the same stock would be both (android
 * ui/StakInsights.kt:56-61 `bestWorst()` returns null under two, MyStakScreen.kt:431-433; iOS StakInsights.swift:60,
 * MyStakView.swift:315-317).
 */
export const showsBestWorst = (f: Pick<RangeFigures, "count" | "best" | "worst">): boolean => f.count >= 2 && !!f.best && !!f.worst;

/**
 * Whether the performance card draws its best / worst row (and the hairline above it): when the range names them
 * (showsBestWorst), and also while the range's closes are on their way for two or more saves, where the row reads "—"
 * until they land. Otherwise a range opened for the first time with the STAK API up (an account, live quotes) would drop
 * the row and shrink the card by 55 px while it loads, then grow it back, moving everything under the card (review 1).
 */
export const drawsBestWorst = (f: Pick<RangeFigures, "status" | "count" | "best" | "worst">, saves: number): boolean =>
	showsBestWorst(f) || (f.status === "loading" && saves >= 2);

const usable = (prices: readonly StockChartPoint[]) =>
	prices.filter((p) => typeof p.close === "number" && Number.isFinite(p.close) && p.close > 0 && !Number.isNaN(Date.parse(p.ts)));

/** % change from the first to the last close of a series; null without two usable points. */
export function seriesReturn(prices: readonly StockChartPoint[]): number | null {
	const ok = usable(prices);
	if (ok.length < 2) return null;
	const sorted = [...ok].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
	return (sorted[sorted.length - 1]!.close / sorted[0]!.close - 1) * 100;
}

/**
 * The equal-weight index of several price series (first point = 100), on the timeline of the series with the
 * most points: at each of its times every ticker contributes its close at or just before that time (half a
 * step of slack, for feeds a few seconds apart), normalised to its own first close, and the average is taken.
 */
export function equalWeightIndex(seriesList: readonly (readonly StockChartPoint[])[]): number[] | null {
	const lists = seriesList
		.map((s) => [...usable(s)].map((p) => ({ t: Date.parse(p.ts), close: p.close })).sort((a, b) => a.t - b.t))
		.filter((s) => s.length >= 2);
	if (lists.length === 0) return null;
	const anchor = lists.reduce((a, b) => (b.length > a.length ? b : a));
	let step = Number.POSITIVE_INFINITY;
	for (let i = 1; i < anchor.length; i++) step = Math.min(step, anchor[i]!.t - anchor[i - 1]!.t || step);
	const slack = Number.isFinite(step) ? step / 2 : 0;
	const cursor = lists.map(() => 0);
	const last = lists.map(() => 1);
	const out: number[] = [];
	for (const { t } of anchor) {
		let sum = 0;
		lists.forEach((s, i) => {
			while (cursor[i]! < s.length && s[cursor[i]!]!.t <= t + slack) {
				last[i] = s[cursor[i]!]!.close / s[0]!.close;
				cursor[i]!++;
			}
			sum += last[i]!;
		});
		out.push((sum / lists.length) * 100);
	}
	return out.length >= 2 ? out : null;
}

/** At most `max` points, evenly picked, always keeping the first and the last. */
export function downsample(values: readonly number[], max = MAX_POINTS): number[] {
	if (values.length <= max) return [...values];
	const out: number[] = [];
	for (let i = 0; i < max; i++) out.push(values[Math.round((i * (values.length - 1)) / (max - 1))]!);
	return out;
}

/** Best and worst of a list of moves. */
export function extremes(moves: readonly Mover[]): { best: Mover | null; worst: Mover | null } {
	if (moves.length === 0) return { best: null, worst: null };
	const sorted = [...moves].sort((a, b) => b.changePercent - a.changePercent);
	return { best: sorted[0]!, worst: sorted[sorted.length - 1]! };
}

/** The figures of one range from the per-ticker series (tickers without a usable series are left out). */
export function figuresFromSeries(byTicker: readonly { ticker: string; prices: readonly StockChartPoint[] }[]): RangeFigures {
	const moves: Mover[] = [];
	for (const { ticker, prices } of byTicker) {
		const r = seriesReturn(prices);
		if (r !== null) moves.push({ ticker, changePercent: r });
	}
	if (moves.length === 0) return { status: "none", value: null, count: 0, best: null, worst: null, series: null };
	const value = moves.reduce((s, m) => s + m.changePercent, 0) / moves.length;
	const index = equalWeightIndex(byTicker.filter((b) => moves.some((m) => m.ticker === b.ticker)).map((b) => b.prices));
	return { status: "ready", value, count: moves.length, ...extremes(moves), series: index ? downsample(index) : null };
}

/**
 * One range's figures from its histories (pure): `loading` while the API's closes are on their way and nothing is
 * ready yet; 1D takes today's figures with the histories' line.
 */
export function rangeFigures(range: Range, histories: readonly { ticker: string; prices: readonly StockChartPoint[] }[], loading: boolean, today: TodayFigures): RangeFigures {
	const fromSeries = figuresFromSeries(histories);
	if (range === "1D") {
		if (today.avgChange === null) return { status: loading ? "loading" : "none", value: null, count: 0, best: null, worst: null, series: null };
		return { status: "ready", value: today.avgChange, count: today.count, best: today.best, worst: today.worst, series: fromSeries.series };
	}
	if (loading) return { status: "loading", value: null, count: fromSeries.count, best: null, worst: null, series: null };
	return fromSeries;
}

/** The card's figures for one range. `skip` is the untouched demo persona on its authored tab (nothing is asked for). */
export function useRangeFigures(range: Range, tickers: readonly string[], today: TodayFigures, skip: boolean): RangeFigures {
	const hs = usePriceHistories(tickers, range, { enabled: !skip && tickers.length > 0 });
	return useMemo(
		() =>
			rangeFigures(
				range,
				Object.values(hs.bySymbol).map((h) => ({ ticker: h.symbol, prices: h.points })),
				hs.status === "loading",
				today,
			),
		[range, hs, today],
	);
}

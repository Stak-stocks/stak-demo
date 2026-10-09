/**
 * The paper portfolio, derived: every position priced at its quote, gains against the stake,
 * today's move, the all-time result against the starting budget, and the leaderboard rank.
 */
import { useMemo } from "react";
import type { Position, SoldEntry } from "./guest";
import { round2 } from "./format";
import { useQuotes, type Quote } from "./quotes";
import { type Live, useLive } from "./store";

export type PositionRow = Position & {
	quote: Quote | null;
	/** today's price (the cost basis when no quote exists) */
	price: number;
	/** shares × price */
	value: number;
	/** shares × cost basis */
	stake: number;
	gain: number;
	/** gain as a % of the stake */
	pct: number;
	/** shares × today's change */
	today: number;
};

export type Portfolio = {
	live: Live;
	cash: number;
	budget: number;
	positions: PositionRow[];
	holdings: number;
	value: number;
	allTime: number;
	allTimePct: number;
	today: number;
	todayPct: number;
	rank: number;
	sold: SoldEntry[];
	quotes: Record<string, Quote>;
};

/** The five demo leaders of the frames (trailing-week returns, %). */
export const DEMO_LEADERS = [9.4, 7.8, 6.5, 5.2, 4.1] as const;
/** The frames' demo rank for anyone below the five. */
export const DEMO_RANK = 47;

/** Above the k-th demo leader → rank k; below all five → the demo rank (#47). */
export function rankFor(returnPct: number): number {
	const k = DEMO_LEADERS.findIndex((r) => returnPct > r);
	return k === -1 ? DEMO_RANK : k + 1;
}

export function positionRow(p: Position, quote: Quote | null): PositionRow {
	const basis = p.priceAtAdd ?? quote?.price ?? 0;
	const price = quote?.price ?? basis;
	const value = round2(p.shares * price);
	const stake = round2(p.shares * basis);
	const gain = round2(value - stake);
	return { ...p, quote, price, value, stake, gain, pct: stake > 0 ? (gain / stake) * 100 : 0, today: round2(p.shares * (quote?.change ?? 0)) };
}

export function usePortfolio(): Portfolio {
	const live = useLive();
	const quotes = useQuotes(live.positions.map((p) => p.ticker));
	const key = live.positions.map((p) => `${p.ticker}:${quotes[p.ticker]?.price ?? "-"}:${quotes[p.ticker]?.change ?? "-"}`).join("|");
	return useMemo(() => {
		const positions = live.positions.map((p) => positionRow(p, quotes[p.ticker] ?? null));
		const holdings = round2(positions.reduce((s, p) => s + p.value, 0));
		const value = round2(live.cash + holdings);
		const budget = live.budget;
		const allTime = round2(value - budget);
		const allTimePct = budget > 0 ? (allTime / budget) * 100 : 0;
		const today = round2(positions.reduce((s, p) => s + p.today, 0));
		const yesterday = value - today;
		const todayPct = yesterday > 0 ? (today / yesterday) * 100 : 0;
		return { live, cash: live.cash, budget, positions, holdings, value, allTime, allTimePct, today, todayPct, rank: rankFor(allTimePct), sold: live.sold, quotes };
		// `key` folds the quote values into the dependency so a price tick re-derives the rows
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [live, key]);
}

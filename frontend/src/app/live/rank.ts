/**
 * One leaderboard and one rank (coordinator decision D4, 2026-11-07): the Simulate hero ("#47 on the leaderboard") and
 * its Leaderboard card, the Leaderboard page and the Profile hub ("#47 this week") all read the same figures from here.
 *
 * - The board: the five demo leaders the frames draw (Leaderboard 2:941-2:963: Amara O. +9.4%, Tunde A. +7.8%, Zoe K.
 *   +6.5%, Malik R. +5.2%, Ivy C. +4.1% this week; Simulate's card 2:713-2:719 names the first three) and a
 *   deterministic demo field of other players below them (no leaderboard API exists), for two periods: the trailing
 *   week ("This week · Trailing 7 days", the frames' period) and all time ("All time" re-ranks by all-time return).
 * - You: the account's trailing-week return (live/portfolioHistory.ts, the 1W value history) and all-time return
 *   (value against the paper budget). Rank = 1 + the players with a strictly higher return, so the rank follows the
 *   return; You takes its place in the top five when it beats a leader, the leaders below moving down one place.
 * - Before the first trade (nothing held, nothing ever sold) You is unranked (rank null): the phones show a new account
 *   unranked ("—" / "Unranked", android ui/simulate/PaperPortfolio.kt:115-116, ios Simulate/PaperPortfolio.swift:44).
 * - The field is drawn so the guest persona's own week (+$186.25 on $10,053.75 = +1.85%, printed as the frames' "+$186"
 *   and "+1.9%": live/ledger.ts PERSONA_WEEK_GAIN) is exactly the frames' #47, before and after the first action: the
 *   untouched showcase keeps #47 because its computed return IS the frames' return (the phones pin the persona at #47:
 *   android ui/simulate/PaperPortfolio.kt:103).
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FRAMES_WEEK_GAIN, PERSONA_BUDGET } from "./ledger";
import { usePortfolio } from "./portfolio";
import { usePortfolioValueHistory } from "./portfolioHistory";
import { useShowcase } from "./showcase";

export type BoardPeriod = "week" | "allTime";
export const BOARD_PERIODS: readonly BoardPeriod[] = ["week", "allTime"];

export type Leader = {
	id: string;
	/** "Amara O." (the Leaderboard page's rows) */
	name: string;
	/** "Amara" (Simulate's Leaderboard card) */
	short: string;
	initial: string;
	/** trailing-week return, % (the frames') */
	week: number;
	/** all-time return, % (demo: the frames draw no all-time list) */
	allTime: number;
};

/** The five demo leaders, in the frames' weekly order. */
export const LEADERS: readonly Leader[] = [
	{ id: "amara", name: "Amara O.", short: "Amara", initial: "A", week: 9.4, allTime: 31.6 },
	{ id: "tunde", name: "Tunde A.", short: "Tunde", initial: "T", week: 7.8, allTime: 22.4 },
	{ id: "zoe", name: "Zoe K.", short: "Zoe", initial: "Z", week: 6.5, allTime: 41.2 },
	{ id: "malik", name: "Malik R.", short: "Malik", initial: "M", week: 5.2, allTime: 18.9 },
	{ id: "ivy", name: "Ivy C.", short: "Ivy", initial: "I", week: 4.1, allTime: 27.3 },
];

/** Players on the demo board besides You: the five leaders and the field at places 6 to 260. */
export const FIELD_SIZE = 260;

/**
 * The field's return at each place, as knots (place, %) joined by straight lines, best first. The week's has the
 * persona's gap: place 46 at +1.95%, place 47 at +1.75%, so any week from +1.75% to just under +1.95% (the frames'
 * +1.9%, the computed +1.85%) ranks #47. A flat account (0.0%) ranks about #142.
 */
const KNOTS: Readonly<Record<BoardPeriod, readonly (readonly [number, number])[]>> = {
	week: [
		[6, 4.0],
		[20, 3.0],
		[46, 1.95],
		[47, 1.75],
		[90, 0.8],
		[130, 0.2],
		[170, -0.5],
		[210, -1.6],
		[240, -3.0],
		[260, -6.5],
	],
	allTime: [
		[6, 17.5],
		[25, 11.0],
		[60, 6.0],
		[100, 3.4],
		[140, 1.6],
		[170, 0.0],
		[210, -2.5],
		[240, -7.0],
		[260, -18.0],
	],
};

const fieldCache = new Map<BoardPeriod, number[]>();

/** Every other player's return for a period, best first (the leaders, then places 6..FIELD_SIZE). */
export function boardReturns(period: BoardPeriod): readonly number[] {
	const hit = fieldCache.get(period);
	if (hit) return hit;
	const knots = KNOTS[period];
	const field: number[] = [];
	for (let place = 6; place <= FIELD_SIZE; place++) {
		const i = Math.max(0, knots.findIndex(([p], j) => j + 1 < knots.length && place >= p && place <= knots[j + 1]![0]));
		const [p0, r0] = knots[i]!;
		const [p1, r1] = knots[Math.min(i + 1, knots.length - 1)]!;
		field.push(p1 === p0 ? r0 : r0 + ((r1 - r0) * (place - p0)) / (p1 - p0));
	}
	const all = [...LEADERS.map((l) => l[period]).sort((a, b) => b - a), ...field];
	fieldCache.set(period, all);
	return all;
}

/** The rank a return takes on the period's board: 1 + the players with a strictly higher return. */
export function rankOf(period: BoardPeriod, returnPct: number): number {
	if (!Number.isFinite(returnPct)) return FIELD_SIZE + 1;
	let above = 0;
	for (const r of boardReturns(period)) if (r > returnPct) above++;
	return above + 1;
}

export type BoardRow = {
	rank: number;
	you: boolean;
	id: string;
	name: string;
	short: string;
	initial: string;
	returnPct: number;
};

export type Board = {
	period: BoardPeriod;
	/**
	 * The five leaders ranked by the period's return; when You beats one of them, You among them at its rank and the
	 * leaders below one place down (six rows, every rank once), else the five alone.
	 */
	rows: BoardRow[];
	/** You's own row (null when unranked) */
	you: BoardRow | null;
	/** whether `rows` holds You */
	youInRows: boolean;
};

const leaderRow = (l: Leader, period: BoardPeriod, rank: number): BoardRow => ({
	rank,
	you: false,
	id: l.id,
	name: l.name,
	short: l.short,
	initial: l.initial,
	returnPct: l[period],
});

/** The board for a period with You placed by its return (`you` null: unranked, the leaders alone). */
export function boardFor(period: BoardPeriod, you: { returnPct: number; name?: string; initial?: string } | null): Board {
	const leaders = [...LEADERS].sort((a, b) => b[period] - a[period]);
	if (!you || !Number.isFinite(you.returnPct)) return { period, rows: leaders.map((l, i) => leaderRow(l, period, i + 1)), you: null, youInRows: false };
	const rank = rankOf(period, you.returnPct);
	const youRow: BoardRow = { rank, you: true, id: "you", name: you.name ?? "You", short: you.name ?? "You", initial: you.initial ?? "Y", returnPct: you.returnPct };
	if (rank > leaders.length) return { period, rows: leaders.map((l, i) => leaderRow(l, period, i + 1)), you: youRow, youInRows: false };
	const rows: BoardRow[] = [];
	leaders.forEach((l, i) => {
		if (i + 1 === rank) rows.push(youRow);
		rows.push(leaderRow(l, period, i + 1 < rank ? i + 1 : i + 2));
	});
	return { period, rows, you: youRow, youInRows: true };
}

/** A period's figure for You: the dollars, the % and the rank (null: unranked). */
export type StandingFigure = { change: number; pct: number; rank: number | null };

export type Standing = {
	/**
	 * "loading": the week's API closes are on their way. `week` then keeps the last week the closes gave; before any, its
	 * text holds the all-time figure (the apps' fallback) with NO rank (`week.rank` null: the hero prints "Unranked", the
	 * board has no You row) rather than that figure ranked on the week board (review 2: #35 for a second, then #47).
	 */
	status: "ready" | "loading";
	/** false before the first trade (nothing held, nothing sold): every rank is null, the board has no You */
	ranked: boolean;
	/** the untouched signed-out persona (live/showcase.ts): its figures are the frames' (SHOWCASE_STANDING) */
	showcase: boolean;
	week: StandingFigure;
	allTime: StandingFigure;
	/** the board for a period with You on it */
	board: (period: BoardPeriod) => Board;
};

/**
 * The frames' own standing as they print it (Simulate 2:648-2:649 and 2:720-2:722, Leaderboard 2:965-2:969, Profile
 * 2:2525): "+$186 (+1.9%) this week", "#47", "+$240.00 all time". The computed standing of the untouched persona
 * prints the same (useStanding: +$186.25 / +1.8525% / #47 this week, +$240.00 / +2.4% all time).
 */
export const SHOWCASE_STANDING = {
	week: { change: FRAMES_WEEK_GAIN, pct: 1.9, rank: 47 },
	allTime: { change: 240, pct: (240 / PERSONA_BUDGET) * 100 },
} as const;

/**
 * The figures from a ledger's numbers (pure). `week` null: the week is not known yet (its closes are on their way): the
 * week's TEXT falls back to the all-time figure, as the phones print the all-time gain in the week's slot (android
 * ui/simulate/PaperPortfolio.kt:117-119, ios Simulate/PaperPortfolio.swift:46-47), but no rank is drawn from it
 * (`week.rank` null, like the phones' rank for an account that is not the demo: PaperPortfolio.kt:115-116): an all-time
 * return ranked on the week board read #35 for a second, then #47 (review 2, 2026-11-08).
 */
export function standingFrom(input: {
	ranked: boolean;
	week: { change: number; pct: number } | null;
	allTime: { change: number; pct: number };
}): Pick<Standing, "ranked" | "week" | "allTime"> {
	const week = input.week ?? input.allTime;
	return {
		ranked: input.ranked,
		week: { change: week.change, pct: week.pct, rank: input.ranked && input.week ? rankOf("week", input.week.pct) : null },
		allTime: { change: input.allTime.change, pct: input.allTime.pct, rank: input.ranked ? rankOf("allTime", input.allTime.pct) : null },
	};
}

/**
 * The account's standing: the trailing week from the 1W value history, all time from the portfolio, the ranks from the
 * board. One hook for Simulate's hero and card, the Leaderboard page and the Profile hub.
 */
export function useStanding(): Standing {
	const pf = usePortfolio();
	const showcase = useShowcase();
	const week = usePortfolioValueHistory("1W");
	const ranked = pf.positions.length > 0 || pf.sold.length > 0;
	const ready = week.status === "ready";
	// the last week the closes gave, kept while they are on their way again (a company with a live quote joining the
	// ledger asks for its closes): the figure and the rank hold instead of blinking to the fallback and back
	const lastWeek = useRef<{ change: number; pct: number } | null>(null);
	useEffect(() => {
		if (ready) lastWeek.current = { change: week.change, pct: week.changePercent };
	}, [ready, week.change, week.changePercent]);
	const known = ready ? { change: week.change, pct: week.changePercent } : lastWeek.current;
	const knownChange = known?.change;
	const knownPct = known?.pct;
	const figures = useMemo(
		() =>
			standingFrom({
				ranked,
				week: knownChange !== undefined && knownPct !== undefined ? { change: knownChange, pct: knownPct } : null,
				allTime: { change: pf.allTime, pct: pf.allTimePct },
			}),
		[ranked, knownChange, knownPct, pf.allTime, pf.allTimePct],
	);
	const name = pf.live.displayName;
	const board = useCallback(
		(period: BoardPeriod) => {
			// the week board has no You row while the week is not known (its rank is null), never the all-time return's place
			const pct = period === "week" ? (figures.week.rank === null ? null : figures.week.pct) : figures.allTime.pct;
			return boardFor(period, figures.ranked && pct !== null ? { returnPct: pct, initial: name ? name.charAt(0).toUpperCase() : undefined } : null);
		},
		[figures, name],
	);
	return useMemo(() => ({ status: week.status, showcase, ...figures, board }), [week.status, showcase, figures, board]);
}

/**
 * Price history for any symbol and range (coordinator decision D3, 2026-11-07: every range of every chart draws a line).
 *
 * Source rule, the same one the quote follows (quotes.ts useQuote), so a line always ends where the page's price is:
 * - the STAK API's closes (`/api/stock/:symbol/chart?range=`, the existing chart client and its types) when the
 *   company's quote is a live one (the API answers, and the person is signed in or the design never priced the
 *   company) and the chart endpoint answers with at least two closes;
 * - otherwise the company's own deterministic PRICE PATH (coordinator ruling N21, 2026-11-09), ending exactly at the
 *   company's current quote (demo quotes included): a year of daily closes up to yesterday's, a geometric random walk
 *   seeded by the symbol alone, as volatile as the company's beta says, and pinned where each range's window opens (the
 *   close that range's move puts there: demoRangeMove), then today's intraday path from yesterday's close to the quote.
 *   Every range is a WINDOW of that one path: 1D is today, 1W the last five sessions hour by hour, 1M / 3M / YTD / 1Y
 *   the daily closes of their window and today's price. So the ranges agree with each other (the 1W line ends with the
 *   day's move, the 1M line with the week's, the YTD line is the 1Y line's tail) and no two companies share a line;
 * - a company with no quote at all gets no series (`status: "none"`): callers draw nothing.
 *
 * Before N21 the demo series was the phones' RANGE_SERIES shape scaled to the range's move (android
 * ui/components/RangeChart.kt:17-39, ios Theme/RangeChart.swift:24-35; a fall drawn upside down, android
 * ui/StakInsights.kt:129-134): on a range every company drew that ONE shape or its mirror image, which the user saw on
 * the stock pages (2026-11-09: "the graph line in different stocks"). The phones still draw it: reported for both apps.
 *
 * Determinism: the closes depend only on the symbol and the quote (price and day move), never on the clock; only the
 * times move with it (each range's window ends now), and how many of the year's closes the YTD window holds (the closes
 * since January 1). The same symbol and range always give the same closes.
 *
 * Coordinator ruling N9b (2026-11-08) stands: the long-range trend (3M / YTD / 1Y) rises for the companies the site's
 * own stories carry as rising (STORY_TREND: MU, GS, KO, O), so a chart never contradicts the story beside it; every
 * other company keeps its seeded draw. It holds for a visitor who saves or buys one of them too (rulings N40a / N41a:
 * pricePath keeps their 3M, 1Y and, from 45 closes, YTD openings under the price). N9a (a larger nudge of the 1D
 * shape's anchors) is superseded by the path.
 *
 * THE PATH PASSES THROUGH WHAT THE LEDGER RECORDED (coordinator ruling N23a, 2026-11-09; the hunt's NUM-02: "Picked May
 * 20 at $210.59" stood beside a year that never went under $248.50). Every price the account holds for a company is an
 * ANCHOR of its path (PriceAnchor: each buy's time and fill price, each save's time and price, each sale's time and
 * proceeds a share, and that sale's buy): the walk is a bridge between consecutive anchors, then to yesterday's close,
 * then to the quote. The hooks gather the anchors from the live state (usePriceHistory / usePriceHistories); the plain
 * functions take them as an optional last argument; with none the path is N21's, closes untouched. WHERE an anchor is
 * pinned, exactly (pinPlan; the rule demoPriceHistory's own comment and FOUNDATION-API.md section 1 state):
 * - on the DAILY closes, once: the close AT OR BEFORE its moment (closeAt's rule) on the one daily timeline. So from the
 *   local midnight AFTER the record was made, on every daily range (1M, 3M, YTD, 1Y) whose window holds its moment,
 *   `closeAt(history, anchor.t)` is the recorded price to the cent. A record made TODAY is not on the daily ranges yet:
 *   the close before it is yesterday's, which never moves (the day's move stands);
 * - on the WEEK's own bars and on TODAY's: the bar at or before its moment, or THE NEXT BAR when that bar is a daily
 *   close of the week's line (every seventh bar, yesterday's included) or the day's first bar: `closeAt` then reads
 *   that daily close, and the line passes through the recorded price one bar (4.8 hours, 5 minutes) later.
 * The 52-week range holds every recorded price of the year, and "up 18.0% since the pick" can be read off the line.
 * With anchors the daily closes depend on which close each date falls on, so on the DAY the clock stands on, never on
 * the hour; the shocks stay the symbol's own.
 * THE WEEK'S OPENING CLOSE STANDS on the week's own line, as yesterday's close stands for the day (coordinator ruling
 * N35a, 2026-11-09): a record whose daily close is the one that opens the week (made 4.3 to 5.8 days before today's
 * midnight) is held by the daily ranges there, while the 1W series keeps its seeded opening. So a save, a top-up or a
 * sale never changes a company's "this week" (pricePath, below).
 * A RECORD NEXT TO A SEEDED WINDOW OPENING TAKES ITS PLACE (coordinator ruling N38a, 2026-11-10; round 5's review): the
 * seeded pins where the 1M, 3M and 1Y windows open and the YTD waypoint give way to a record within K sessions of them
 * (recordReach: K = ceil(|ln(record / seeded close)| / (3 x the daily volatility))), so a record is never bridged to a
 * seeded opening in one or two sessions (a cliff: MSFT's 1Y line of May 30, 2027 opened with a drop of 95% of the
 * chart's height). On those days the window reads the move since about the record; the week's opening and yesterday's
 * close never give way.
 *
 * ONE DAILY TIMELINE FOR EVERY RANGE (coordinator ruling on review 2, 2026-11-09). The daily closes stand on one
 * timeline counted back from today's local midnight, a session (SESSION_MS, 1.45 days) apart: yesterday's close at
 * midnight itself (where the 1D range starts), the one before a session earlier, and so on. 1M, 3M and 1Y are the last
 * 24 / 63 / 252 sessions of it and YTD the closes since January 1 (windowSessions: its point count follows the
 * calendar), each ending with today's price at the clock. So a date falls on ONE daily close whichever range reads it,
 * each record is pinned once, and a company's closes stand still through a calendar day. Until then every daily range
 * spread its closes evenly over its own window: one date fell on neighbouring closes through two ranges' grids, on some
 * days two records of one company met on one close and one stopped reading back (AMD's $151.40 save read $148.02 on the
 * year's line on Nov 12 to 16), a calm company showed three equal closes in a row, and the closes moved with the minute.
 */
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type ChartRange, getStockChart, type StockChartPoint } from "@/lib/api";
import { betaOf, normalizeTicker } from "./catalog";
import { round2 } from "./format";
import type { Position, SaveEntry, SoldEntry } from "./guest";
import { framesWeekMove, positionLots } from "./ledger";
import { demoQuote, hasDemoQuote, quoteQuery, type Quote, useApiHealthState } from "./quotes";
import { useLive } from "./store";

/** The six ranges every chart offers, in Figma's order (the phones' RANGE_LABELS). */
export type HistoryRange = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y";
export const HISTORY_RANGES: readonly HistoryRange[] = ["1D", "1W", "1M", "3M", "YTD", "1Y"];
export const isHistoryRange = (range: string): range is HistoryRange => (HISTORY_RANGES as readonly string[]).includes(range);

/** The STAK API's `range` parameter for each range. */
export const CHART_RANGE: Readonly<Record<HistoryRange, ChartRange>> = { "1D": "1d", "1W": "1w", "1M": "1m", "3M": "3m", YTD: "ytd", "1Y": "1y" };

const DAY = 86_400_000;

/** Local midnight of the day `now` stands on: where the 1D range starts, and where yesterday's close stands on the daily timeline. */
function midnightOf(now: number): number {
	const d = new Date(now);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/**
 * Where a range's window starts: the first moment of its series. At least a minute before `now`.
 * - 1D from local midnight and 1W 7 days back: the API's own windows (stak-demo-web/backend src/routes/stock.ts, GET
 *   /:symbol/chart).
 * - 1M, 3M, YTD and 1Y open on a close of the ONE daily timeline (below: closeMoment, windowSessions): the close 23 / 62
 *   / 251 sessions before yesterday's, and for YTD the last close at or before January 1. A session is SESSION_MS (1.45
 *   days), so their 24 / 63 / 252 sessions span 34.8 / 91.3 / 365.0 days to the end of today's session (the API's
 *   windows are 35 / 91 / 365 days); the last point of every series stands at the clock, so as stamped a window is a
 *   day or less shorter than that. Until the review of 2026-11-09 each daily range spread its closes evenly from the
 *   API's own start to `now`, a grid of its own: one date then fell on different closes in different ranges.
 */
export function rangeStart(range: HistoryRange, now: number = Date.now()): number {
	let start: number;
	if (range === "1D") start = midnightOf(now);
	else if (range === "1W") start = now - 7 * DAY;
	else start = closeMoment(midnightOf(now), windowSessions(range, now) - 1);
	return Math.min(start, now - 60_000);
}

/** One company's closes over one range, oldest first. */
export type PriceHistory = {
	symbol: string;
	range: HistoryRange;
	/** "api": the STAK API's closes; "demo": the deterministic stand-in */
	source: "api" | "demo";
	/** the points in the API's own shape ({ ts: ISO 8601, close }) */
	points: StockChartPoint[];
	/** each point's time in ms, same order */
	times: number[];
	closes: number[];
	/** the first and the last close */
	first: number;
	last: number;
	/** last − first, in dollars (cents) and as a % of first */
	change: number;
	changePercent: number;
	/** the lowest and the highest close */
	low: number;
	high: number;
};

/** What a chart draws: `ready` (a line), `loading` (the API's closes are on their way: keep what is drawn), `none` (no quote: draw nothing). */
export type PriceHistoryState = { status: "ready"; history: PriceHistory } | { status: "loading"; history: null } | { status: "none"; history: null };

const LOADING: PriceHistoryState = { status: "loading", history: null };
const NONE: PriceHistoryState = { status: "none", history: null };

/**
 * The phones' demo shapes, fractions of the chart's height from the bottom, evenly spread: RANGE_SERIES, with 3M the
 * SERIES_3M the phones draw when a line is drawn instead of exported (android ui/components/RangeChart.kt:31-39).
 * No line is drawn from them any more: the companies' lines are windows of their price paths (N21, below), and the one
 * path that has no price of its own, the guest persona's unlisted picks, walks between its anchors since N25
 * (portfolioHistory.ts offBookValueAt; it followed shapeValue until then). They stay exported with shapedSeries and
 * shapeValue as the phones' shapes (the unit tests keep them as the measure of the defect the path removed).
 */
export const RANGE_SERIES: Readonly<Record<HistoryRange, readonly number[]>> = {
	"1D": [0.45, 0.5, 0.42, 0.55, 0.6, 0.52, 0.58, 0.66, 0.62, 0.7],
	"1W": [0.3, 0.38, 0.35, 0.5, 0.46, 0.6, 0.72],
	"1M": [0.25, 0.3, 0.28, 0.42, 0.38, 0.52, 0.48, 0.6, 0.55, 0.68, 0.75],
	"3M": [0.3, 0.34, 0.32, 0.4, 0.38, 0.46, 0.52, 0.48, 0.58, 0.56, 0.64, 0.7, 0.66, 0.76, 0.84],
	YTD: [0.2, 0.35, 0.3, 0.45, 0.4, 0.55, 0.5, 0.62, 0.7, 0.66, 0.8],
	"1Y": [0.15, 0.22, 0.3, 0.26, 0.4, 0.36, 0.5, 0.55, 0.48, 0.62, 0.7, 0.82],
};

/**
 * Closes per demo series, as the API's bars come: 5-minute bars of a 6.5 h session, hourly bars of five sessions, one
 * close a session. YTD's figure is where the path PINS the year-to-date move (210 sessions back, WINDOW_SESSIONS); the
 * YTD series itself holds the closes since January 1, as many as the calendar gives (windowSessions(range, now) + 1:
 * 2 on New Year's Day, 218 on November 9, never more than the year's 253).
 */
export const DEMO_POINTS: Readonly<Record<HistoryRange, number>> = { "1D": 79, "1W": 36, "1M": 25, "3M": 64, YTD: 211, "1Y": 253 };

/** The hourly bars of one session on the week's line (a 6.5 h session: seven bars, the last one the session's close). */
export const SESSION_BARS = 7;

/**
 * Where each range's move is pinned on the price path, in sessions before today: 1D at yesterday's close, 1W five
 * sessions back (the close before the four sessions and today that its hourly bars cover: 1 + 4 x 7 + 7 = 36 points),
 * the daily ranges one close a session before today's price (DEMO_POINTS less one: 24, 63, 210, 252). It is also where
 * the range's WINDOW opens, for every range but YTD, whose window follows the calendar (windowSessions).
 */
export const WINDOW_SESSIONS: Readonly<Record<HistoryRange, number>> = {
	"1D": 1,
	"1W": (DEMO_POINTS["1W"] - 1) / SESSION_BARS,
	"1M": DEMO_POINTS["1M"] - 1,
	"3M": DEMO_POINTS["3M"] - 1,
	YTD: DEMO_POINTS.YTD - 1,
	"1Y": DEMO_POINTS["1Y"] - 1,
};

// ── The daily timeline (coordinator ruling on review 2, 2026-11-09: one timeline for every range) ───────────────────

/** One session of the daily timeline in calendar time: the year's 365 days over its 252 sessions, 1.45 days. */
export const SESSION_MS = (365 * DAY) / WINDOW_SESSIONS["1Y"];

/**
 * The moment the daily close `back` sessions before yesterday's stands at, in EVERY range: yesterday's close (back 0) at
 * today's local midnight, the same moment the 1D range gives it, and each earlier close a session before the next. The
 * timeline is counted from midnight, never from the minute, so it stands still through a calendar day.
 */
const closeMoment = (midnight: number, back: number) => Math.round(midnight - back * SESSION_MS);

/**
 * Which daily close holds the moment `t`: how many sessions before yesterday's close the close AT OR BEFORE `t` stands
 * (closeAt's rule). 0 from today's local midnight on: the close at or before such a moment is yesterday's.
 */
function sessionsBefore(t: number, midnight: number): number {
	if (!(t < midnight)) return 0;
	let back = Math.max(1, Math.ceil((midnight - t) / SESSION_MS));
	while (back > 1 && closeMoment(midnight, back - 1) <= t) back--;
	while (closeMoment(midnight, back) > t) back++;
	return back;
}

/**
 * Where a range's window opens at the clock `now`, in sessions before today's price: WINDOW_SESSIONS for every range but
 * YTD, which follows the calendar. The YTD window opens on the last daily close at or before January 1 (the close the
 * year began on, so every moment of the year has its close inside the window): 1 session on New Year's Day (yesterday's
 * close and today's price), one more every day and a half, 217 on November 9, never more than the year's 252.
 */
export function windowSessions(range: HistoryRange, now: number = Date.now()): number {
	if (range !== "YTD") return WINDOW_SESSIONS[range];
	const newYear = new Date(new Date(now).getFullYear(), 0, 1).getTime();
	return Math.min(WINDOW_SESSIONS["1Y"], sessionsBefore(newYear, midnightOf(now)) + 1);
}

/** A short range's typical move for a company of average swing, in % (1D is the quote's own day move). */
const TYPICAL_MOVE = { "1W": 2.2, "1M": 4.5 } as const;
/** The typical year's move; 3M and YTD take a share of the same trend. */
const TYPICAL_YEAR = 16;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** FNV-1a, then mulberry32 (deck.ts uses the same pair for its daily shuffle): a seeded generator of [0, 1). */
function seeded(key: string): () => number {
	let h = 2166136261;
	for (let i = 0; i < key.length; i++) {
		h ^= key.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	let a = h >>> 0 || 1;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A standard normal draw (Box-Muller). */
function gauss(rand: () => number): number {
	const u = 1 - rand();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * The long-range (3M / YTD / 1Y) trend's direction for the companies the site's own stories state one for (coordinator
 * ruling N9b, 2026-11-08 08:45, confirmed 10:50): MU ("Memory chips soar as the AI trade rotates", memory-chips-soar),
 * GS ("Dow closes at a record as chips slide", dow-record-chips), KO ("Wall Street's fear gauge reads 32",
 * fear-gauge-32) and O ("June jobs miss eases Fed hike bets", june-jobs-miss) rise, so the chart beside a story never
 * falls against it. XOM keeps the seeded draw (the oil story is a one-day slip, not a trend); no other company is forced.
 * Only the direction is set: the size of the move stays the company's own seeded draw.
 */
export const STORY_TREND: Readonly<Record<string, 1 | -1>> = { MU: 1, GS: 1, KO: 1, O: 1 };

/**
 * The demo move of a company over a range, in %: on 1D the quote's own day move. 1W and 1M: a per-company figure around
 * the range's typical move, up three times in five. 3M, YTD and 1Y share one per-company trend (up seven times in ten,
 * or the direction the site's stories give it: STORY_TREND): the same direction, the longer window the further (3M
 * 30-60% of the year's move, YTD 70-95%). Every figure is wider for the companies whose day moves are wider (the demo
 * table's swing), and never below -60%.
 * The price path is pinned to these moves (WINDOW_SESSIONS before today it stands at price / (1 + move), the first
 * close of that range's series), so the rule is the one from before N21 and every range still prints the move it
 * printed, but on the days a recorded price lies within reach of a 1M, 3M or 1Y opening or of the YTD waypoint, which
 * then takes that pin's place (pricePath, N38a). YTD alone no longer prints its figure on every day: its window is the closes since January 1 (windowSessions),
 * so its series opens wherever the calendar puts it on the path, and the YTD move stays a waypoint of the path 210
 * sessions back (the series prints exactly this figure on the day the year is 210 sessions old, at the end of October).
 * ONE COMPANY'S WEEK IS A FRAME'S (coordinator ruling N35b, 2026-11-09): where a frame prints what a seeded pick made
 * this week (the NVDA pick page, "This week +$3.80"), the company's 1W move is the one that makes the seeded shares earn
 * exactly those dollars (ledger.ts framesWeekMove: NVDA opens its week at $118.36, +3.16%, where the seeded draw gave
 * $118.45, +3.08%, and the cell read "+$3.71" after the first action). Not rounded to a hundredth of a percent: the
 * opening close it gives is the wanted one to the cent.
 */
export function demoRangeMove(symbol: string, range: HistoryRange, dayChangePercent: number): number {
	const day = Number.isFinite(dayChangePercent) ? dayChangePercent : 0;
	if (range === "1D") return day;
	const T = normalizeTicker(symbol);
	if (range === "1W") {
		const frame = framesWeekMove(T);
		if (frame !== null) return frame;
	}
	const swing = clamp(0.5 + Math.abs(day) / 2.4, 0.5, 2.5);
	let move: number;
	if (range === "1W" || range === "1M") {
		const rand = seeded(`${T}|${range}|move`);
		const size = TYPICAL_MOVE[range] * swing * (0.35 + 1.3 * rand());
		move = rand() < 0.6 ? size : -size;
	} else {
		// one draw order for the three long ranges, so they read the same trend whichever is asked for
		const rand = seeded(`${T}|trend|move`);
		const year = TYPICAL_YEAR * swing * (0.35 + 1.3 * rand());
		// the coin is drawn for every company, so the story table changes nothing for the others
		const coin = rand();
		const sign = STORY_TREND[T] ?? (coin < 0.7 ? 1 : -1);
		const ytd = 0.7 + 0.25 * rand();
		const quarter = 0.3 + 0.3 * rand();
		move = sign * year * (range === "1Y" ? 1 : range === "YTD" ? ytd : quarter);
	}
	return Math.round(clamp(move, -60, 300) * 100) / 100;
}

/** Catmull-Rom through p1 -> p2 (u in [0, 1]); it passes through every anchor. */
const catmullRom = (p0: number, p1: number, p2: number, p3: number, u: number) =>
	0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);

/**
 * How far a shape's inner anchors are nudged per company in shapedSeries, as a share of the shape's span (N9a,
 * 2026-11-08: 1D's larger, the other ranges' a fine 0.08; the first and the last anchor never). SUPERSEDED for the
 * companies' lines by the price path (N21, 2026-11-09): a nudged shape was still one shape. Kept with shapedSeries.
 */
export const ANCHOR_NUDGE: Readonly<Record<HistoryRange, number>> = { "1D": 0.3, "1W": 0.08, "1M": 0.08, "3M": 0.08, YTD: 0.08, "1Y": 0.08 };

/**
 * `count` values from `first` to `last` along the range's phone shape: the shape's inner anchors nudged (ANCHOR_NUDGE:
 * more on 1D) and a fine wobble added (both seeded by `key`), the shape's first anchor mapped to `first` and its last to
 * `last`. A fall (last < first) maps the same shape upside down; first = last is flat.
 * This was every company's demo series until N21 (2026-11-09) and is NOT any more (demoPriceHistory draws the price
 * path): on a range it gives every key the same shape or its mirror image. It stays as a building block for a line
 * that should follow the phones' shape; the unit tests keep it as the measure of the defect the path removed.
 */
export function shapedSeries(key: string, range: HistoryRange, first: number, last: number, count: number = DEMO_POINTS[range]): number[] {
	const anchors = RANGE_SERIES[range];
	const k = anchors.length;
	const n = Math.max(2, Math.round(count));
	const rand = seeded(`${key}|${range}|shape`);
	const span = Math.max(...anchors) - Math.min(...anchors);
	const a = anchors.map((v, j) => (j === 0 || j === k - 1 ? v : v + (rand() - 0.5) * ANCHOR_NUDGE[range] * span));
	const at = (j: number) => a[clamp(j, 0, k - 1)]!;
	const sigma = (0.1 * span) / Math.sqrt(n);
	const walk = [0];
	for (let i = 1; i < n; i++) walk.push(walk[i - 1]! + gauss(rand) * sigma);
	const drift = walk[n - 1]!;
	const f0 = anchors[0]!;
	const f1 = anchors[k - 1]!;
	const out: number[] = [];
	for (let i = 0; i < n; i++) {
		if (i === 0) {
			out.push(first);
			continue;
		}
		if (i === n - 1) {
			out.push(last);
			continue;
		}
		const x = (i / (n - 1)) * (k - 1);
		const j = Math.min(k - 2, Math.floor(x));
		const f = catmullRom(at(j - 1), at(j), at(j + 1), at(j + 2), x - j) + walk[i]! - (i / (n - 1)) * drift;
		out.push(first + ((f - f0) / (f1 - f0)) * (last - first));
	}
	return out;
}

/**
 * The phone shape of a range as a continuous path from `first` (u = 0) to `last` (u = 1): the same Catmull-Rom through
 * RANGE_SERIES as shapedSeries, without the per-company nudges (for a path read at arbitrary moments).
 */
export function shapeValue(range: HistoryRange, first: number, last: number, u: number): number {
	const a = RANGE_SERIES[range];
	const k = a.length;
	const x = clamp(u, 0, 1) * (k - 1);
	const j = Math.min(k - 2, Math.floor(x));
	const at = (i: number) => a[clamp(i, 0, k - 1)]!;
	const f = catmullRom(at(j - 1), at(j), at(j + 1), at(j + 2), x - j);
	return first + ((f - a[0]!) / (a[k - 1]! - a[0]!)) * (last - first);
}

// ── The price path (coordinator ruling N21, 2026-11-09) ─────────────────────────────────────────────────────────────

/** The path's daily volatility for a company of beta 1: about 1.1% a day. */
export const DAILY_VOL = 0.011;
/** The band the betas are kept in: the calmest company still moves, the wildest still draws a readable line. */
const BETA_BAND = { low: 0.45, high: 2.6 } as const;
/** The share of a day's volatility that happens inside the session (the rest is the step from the previous close). */
const SESSION_VOL = 0.9;
/** A session that travelled far was a lively one: its volatility is at least this share of its own move. */
const MOVE_VOL = 0.5;

/**
 * How much a company's path moves in a day (the standard deviation of its daily log return): DAILY_VOL times its beta
 * (catalog betaOf, kept inside BETA_BAND), so a utility wiggles less than a chip maker. A company the catalog has no
 * beta for moves like the market (beta 1).
 */
export function demoDailyVol(symbol: string): number {
	const beta = betaOf(symbol);
	return DAILY_VOL * clamp(beta === null ? 1 : Math.abs(beta), BETA_BAND.low, BETA_BAND.high);
}

/** A seeded random walk from 0: `steps` standard normal steps, `steps + 1` values. */
function randomWalk(key: string, steps: number): number[] {
	const rand = seeded(key);
	const out = [0];
	for (let i = 1; i <= steps; i++) out.push(out[i - 1]! + gauss(rand));
	return out;
}

/** The furthest a seededWalk is read: a hundred years of steps a fifth of a day long (a broken clock reads the end). */
const WALK_LIMIT = 200_000;

/**
 * A seeded standard walk readable at any step, whole or not (between two steps: the straight line between them),
 * worked out as far as it is read: the same key always gives the same walk. For a path with no grid of its own, read
 * at arbitrary moments (portfolioHistory.ts: the off-book holding, N25).
 */
export function seededWalk(key: string): (step: number) => number {
	const rand = seeded(key);
	const w = [0];
	return (step: number) => {
		const x = Number.isFinite(step) ? Math.min(WALK_LIMIT, Math.max(0, step)) : 0;
		const hi = Math.ceil(x);
		while (w.length <= hi) w.push(w[w.length - 1]! + gauss(rand));
		const lo = Math.floor(x);
		return w[lo]! + (w[hi]! - w[lo]!) * (x - lo);
	};
}

/**
 * A walk pinned at both ends (a Brownian bridge): step `i` of `steps` on the way from `from` to `to`, following the
 * walk `w` from its index `at` and moving `sd` a step. It is exactly `from` at step 0 and `to` at the last one.
 */
function pinned(w: readonly number[], at: number, steps: number, i: number, from: number, to: number, sd: number): number {
	const u = i / steps;
	return from + (to - from) * u + sd * (w[at + i]! - w[at]! - u * (w[at + steps]! - w[at]!));
}

const cents = (n: number) => Math.max(0.01, round2(n));

// ── What the ledger recorded (coordinator ruling N23a, 2026-11-09) ──────────────────────────────────────────────────

/** A price the account recorded for a company: what a buy filled at, what a save saw, what a sale returned a share. */
export type PriceAnchor = { t: number; price: number };

/** The parts of an account's state that record prices: the live state, a guest state, the seed. */
export type AnchorSource = {
	positions?: readonly Pick<Position, "ticker" | "shares" | "priceAtAdd" | "addedAt" | "lots">[];
	saves?: readonly SaveEntry[];
	sold?: readonly Pick<SoldEntry, "ticker" | "shares" | "proceeds" | "stake" | "soldAt" | "addedAt" | "price" | "lots">[];
};

/**
 * Every price `state` recorded for a company, as the anchors of its price path (N23a):
 * - each sale's buys: the buys the sale sold when it recorded them (SoldEntry.lots: every sale since the review of
 *   2026-11-09, a closing sale since that morning), otherwise one buy on addedAt at the stake a share;
 * - each sale: soldAt, at its fill price (SoldEntry.price), or the proceeds a share on an older record;
 * - each save: savedAt, priceAtSave;
 * - each buy of an open position: its lots' time and fill price (ledger.ts positionLots: a position without lots is
 *   one buy at its cost a share on addedAt).
 * Listed with the least say first: where two records share a point of the path the later entry wins, so a lot's own
 * fill price stands over the average cost a part sale of the same position carries for the first buy's day.
 */
export function priceAnchorsOf(symbol: string, state: AnchorSource | null | undefined): PriceAnchor[] {
	const T = normalizeTicker(symbol);
	if (!T || !state) return [];
	const out: PriceAnchor[] = [];
	const add = (t: unknown, price: unknown) => {
		if (typeof t === "number" && Number.isFinite(t) && typeof price === "number" && Number.isFinite(price) && price > 0) out.push({ t, price });
	};
	const sold = (state.sold ?? []).filter((s) => normalizeTicker(s.ticker) === T && s.shares > 0);
	const buysOf = (s: (typeof sold)[number]) => (s.lots ?? []).filter((l) => l.price > 0 && Number.isFinite(l.at));
	for (const s of sold) if (buysOf(s).length === 0) add(s.addedAt, s.stake / s.shares);
	for (const s of sold) for (const l of buysOf(s)) add(l.at, l.price);
	for (const s of sold) add(s.soldAt, s.price ?? s.proceeds / s.shares);
	for (const s of state.saves ?? []) if (normalizeTicker(s.ticker) === T) add(s.savedAt, s.priceAtSave);
	for (const p of state.positions ?? []) if (normalizeTicker(p.ticker) === T) for (const l of positionLots(p)) add(l.at, l.price);
	return out;
}

const anchorsKey = (anchors: readonly PriceAnchor[] | null | undefined) => (anchors && anchors.length > 0 ? anchors.map((a) => `${a.t}:${a.price}`).join(",") : "");

/**
 * The point at or before `t` on the week's or the day's own grid: `steps` even steps from `start` to `now`, each time
 * rounded as demoTimes rounds it, read as closeAt reads it. 0 for a moment before the grid, `steps` from `now` on.
 */
function gridIndex(t: number, start: number, now: number, steps: number): number {
	const at = (i: number) => (i >= steps ? now : Math.round(start + ((now - start) * i) / steps));
	let i = Math.max(0, Math.min(steps, Math.floor(((t - start) / Math.max(1, now - start)) * steps)));
	while (i < steps && at(i + 1) <= t) i++;
	while (i > 0 && at(i) > t) i--;
	return i;
}

/** Where the anchors pin a path: (index, close) on the year's daily closes, on the week's hourly bars and on today's bars. */
type PinPlan = { daily: readonly (readonly [number, number])[]; hourly: readonly (readonly [number, number])[]; minute: readonly (readonly [number, number])[]; key: string };
const NO_PINS: PinPlan = { daily: [], hourly: [], minute: [], key: "" };

/**
 * The pins of a company's anchors at the clock `now` (N23a; one timeline since the review of 2026-11-09). Each anchor
 * pins its recorded price, in cents:
 * - ON THE DAILY CLOSES, ONCE: the close at or before its moment on the daily timeline (sessionsBefore), whichever
 *   ranges hold it. So every record made before today's local midnight is a daily close from that midnight on, the same
 *   one in 1M, 3M, YTD and 1Y, and the pins move with the calendar day alone. A record made today has yesterday's close
 *   before it, which never moves (the day's move): it shows on today's bars only, until tomorrow.
 * - ON THE WEEK'S OWN BARS: the bar at or before its moment on the week's grid (36 points over seven days), when that
 *   bar is an hourly bar of a past session or one of today's bars. When it is one of the week's five daily closes
 *   (every seventh bar: only the timeline pins those, and yesterday's never) the record takes the NEXT bar, so the
 *   week's line passes through it within one bar of its moment: for a record 28.8 to 33.6 hours old, whose bar is
 *   yesterday's close, that is today's first bar (review 2, low 4: no range held such a record).
 * - ON TODAY'S OWN BARS: the 5-minute bar at or before its moment, the next one when that is the day's first
 *   (yesterday's close).
 * Never yesterday's close nor today's price: the day's move and the quote stand, and a record the clock has not reached
 * yet (a trade seconds after the page's minute) counts as made at the clock, where the path is the quote already. A
 * later anchor wins a shared point.
 * The daily pin on the close that OPENS THE WEEK (five sessions back) is the daily ranges' alone: the week's own line
 * keeps its seeded opening there (pricePath; coordinator ruling N35a).
 */
function pinPlan(anchors: readonly PriceAnchor[] | null | undefined, now: number): PinPlan {
	if (!anchors || anchors.length === 0) return NO_PINS;
	const year = WINDOW_SESSIONS["1Y"];
	const back = WINDOW_SESSIONS["1W"];
	const weekBars = DEMO_POINTS["1W"] - 1;
	const dayBars = DEMO_POINTS["1D"] - 1;
	const yesterdayBar = (back - 1) * SESSION_BARS;
	const midnight = midnightOf(now);
	const weekStart = rangeStart("1W", now);
	const dayStart = rangeStart("1D", now);
	const daily = new Map<number, number>();
	const hourly = new Map<number, number>();
	const minute = new Map<number, number>();
	for (const a of anchors) {
		if (!(a.price > 0) || !Number.isFinite(a.price) || !Number.isFinite(a.t)) continue;
		const close = cents(a.price);
		const t = Math.min(a.t, now);
		if (t < midnight) {
			// the year's closes run from index 0 (251 sessions before yesterday's) to year - 1 (yesterday's, never pinned)
			const d = year - 1 - sessionsBefore(t, midnight);
			if (d >= 0) daily.set(d, close);
		}
		if (t >= weekStart) {
			let i = gridIndex(t, weekStart, now, weekBars);
			// a daily close of the week's line belongs to the timeline: the record takes the next bar
			if (i <= yesterdayBar && i % SESSION_BARS === 0) i++;
			if (i < yesterdayBar) hourly.set(i, close);
			else if (i < weekBars) minute.set(Math.round((dayBars * (i - yesterdayBar)) / SESSION_BARS), close);
		}
		if (t >= dayStart) {
			// the day's first bar is yesterday's close: the record takes the next one
			const b = Math.max(1, gridIndex(t, dayStart, now, dayBars));
			if (b < dayBars) minute.set(b, close);
		}
	}
	const sorted = (m: Map<number, number>) => [...m.entries()].sort((x, y) => x[0] - y[0]);
	const plan = { daily: sorted(daily), hourly: sorted(hourly), minute: sorted(minute) };
	const text = (pins: readonly (readonly [number, number])[]) => pins.map(([i, c]) => `${i}:${c}`).join(",");
	const key = `${text(plan.daily)}/${text(plan.hourly)}/${text(plan.minute)}`;
	return key === "//" ? NO_PINS : { ...plan, key };
}

/** One pin of a stretch of bars: its bar, its close and log(close / price). */
type BarPin = { i: number; close: number; log: number };

/**
 * The closes of a stretch of bars that runs through pins (oldest first; the first and the last are the stretch's
 * ends): each pin's own close at its bar, and between two neighbours a bridge along the walk `w` (indexed by bar),
 * moving `sd` a bar. With the two ends alone it is the one bridge of N21.
 */
function barsThrough(w: readonly number[], pins: readonly BarPin[], sd: number, price: number): number[] {
	const out: number[] = [];
	for (let k = 0; k + 1 < pins.length; k++) {
		const a = pins[k]!;
		const b = pins[k + 1]!;
		for (let i = a.i; i < b.i; i++) out.push(i === a.i ? a.close : cents(price * Math.exp(pinned(w, a.i, b.i - a.i, i - a.i, a.log, b.log, sd))));
	}
	out.push(pins[pins.length - 1]!.close);
	return out;
}

/** One company's path for one quote: everything its six series are cut from. */
type PricePath = {
	/** the year's daily closes, oldest first: cents, except the last one, yesterday's close, which is exact */
	daily: number[];
	/** the last five sessions hour by hour (the 1W series): the close five sessions back, four sessions, today */
	week: number[];
	/** today in 5-minute bars (the 1D series): yesterday's close (exact), cents, the price */
	today: number[];
};

const pathCache = new Map<string, PricePath>();

/**
 * The seeded window openings a record may take the place of (coordinator ruling N38a, 2026-11-10): the 1M, 3M and 1Y
 * openings and the YTD waypoint. Not the week's (N35a: the week's line keeps its seeded opening whatever was recorded
 * there) and not yesterday's close (the day's move: never a record's).
 */
export const YIELDING_PINS: readonly HistoryRange[] = ["1M", "3M", "YTD", "1Y"];

/**
 * How near a record must come to a seeded window opening to take its place (N38a, the reviewer's rule): K =
 * ceil(|ln(record / seeded close)| / (3 x the company's daily volatility)) sessions, and a record WITHIN K sessions (K
 * or fewer apart) replaces the seeded pin. A bridge of more than K sessions between the two prices moves under 3x the
 * company's volatility a session; a shorter one was a cliff (MSFT's 1Y line of May 30, 2027 opened $524.92 -> $431.10
 * in one session, 19.9x its volatility).
 */
export function recordReach(record: number, seeded: number, vol: number): number {
	return Math.ceil(Math.abs(Math.log(record / seeded)) / (3 * vol));
}

/**
 * How far under the price a story company's window opening is pinned where a record left it at or over the price
 * (coordinator rulings N40a and N41a, 2026-11-10): a rise the line shows and no cliff (a 0.2% step). Since N44b
 * (2026-11-10, round 7's review) the pin is cents(min(price, yesterday's close) / (1 + 0.2%)): 0.2% under the lower END
 * OF THE DAY, so the line rises up to yesterday's close as well as to the price, whatever the day's move. At price / 1.002
 * it stood over yesterday's close on a day the price rose more than 0.2% (MU +4.2%, GS +1.2%), so the line fell to
 * yesterday's close and only the day's last step rose: the pick page, which clipped that step, drew MU's 1Y on November
 * 3, 2027 falling under "+$0.24 (0.2% up)".
 */
export const STORY_OPENING_MARGIN = 0.002;

/**
 * From how many closes a story company's YTD opening is kept under the price (N41a): the bound N35c / N37b / N38b set
 * for a YTD line to rise (45 closes, the first days of March). A younger YTD line moves like the week and the month.
 */
export const STORY_YTD_CLOSES = 45;

/**
 * The year's daily closes through `pins` (index -> close; yesterday's among them, exact), walking `w` at `vol` a
 * session: each pin's own close at its index, a Brownian bridge between two neighbours, and before the first pin a
 * free walk back from it (N38a: a record that took the year's opening). `logs` holds log(close / price), unrounded.
 */
function walkYear(pins: ReadonlyMap<number, number>, w: readonly number[], vol: number, price: number, year: number): { logs: number[]; daily: number[] } {
	const sorted = [...pins.entries()].map(([i, close]) => ({ i, close })).sort((a, b) => a.i - b.i);
	const logs = new Array<number>(year).fill(0);
	const daily = new Array<number>(year).fill(price);
	const head = sorted[0]!;
	for (let i = 0; i < head.i; i++) {
		logs[i] = Math.log(head.close / price) + vol * (w[i]! - w[head.i]!);
		daily[i] = cents(price * Math.exp(logs[i]!));
	}
	for (let k = 0; k + 1 < sorted.length; k++) {
		const a = sorted[k]!;
		const b = sorted[k + 1]!;
		const from = Math.log(a.close / price);
		const to = Math.log(b.close / price);
		for (let i = a.i; i <= b.i; i++) {
			logs[i] = i === a.i ? from : i === b.i ? to : pinned(w, a.i, b.i - a.i, i - a.i, from, to, vol);
			daily[i] = i === a.i ? a.close : i === b.i ? b.close : cents(price * Math.exp(logs[i]!));
		}
	}
	return { logs, daily };
}

/**
 * The company's price path for a quote (N21).
 * - THE YEAR: DEMO_POINTS["1Y"] - 1 daily closes ending at yesterday's close, price / (1 + day move), exact. In log
 *   price it is one random walk seeded by the symbol alone (the same shocks whatever the quote), moving demoDailyVol a
 *   day, pinned where each range's window opens: at the close that range's move puts there (demoRangeMove; the year's
 *   start, then the YTD, 3M, 1M and 1W openings, then yesterday). Between two pins it is a Brownian bridge. So each
 *   range keeps the move it had before N21, the story trends hold on 3M and YTD as on 1Y, and one path serves them all.
 * - TODAY: DEMO_POINTS["1D"] 5-minute closes from yesterday's close to the quote, a bridge of the day's own
 *   volatility: the series' change IS the quote's day move.
 * - THE WEEK: the close five sessions back, then the four sessions before today in SESSION_BARS hourly bars each (a
 *   bridge from one daily close to the next; the last bar of a session IS its daily close), then today's path read at
 *   seven of its own bars. So the week's line passes through the daily closes the longer ranges draw and ends with the
 *   day the 1D range draws.
 * Closes are cents, as the API's are; yesterday's close stays exact wherever it appears (the day's move reads the same
 * on every range, a low price included: AMC's -3.9%).
 * - WHAT THE LEDGER RECORDED (N23a): `plan` holds the pins of the account's anchors (pinPlan). A pinned daily close is
 *   one more pin of the year's walk (within reach of a seeded window opening it takes that pin's place: below); a
 *   pinned hourly bar or 5-minute bar splits its session's bridge in two. No pins: N21's path, to the last digit.
 * - A RECORD NEXT TO A SEEDED WINDOW OPENING TAKES ITS PLACE (coordinator ruling N38a, 2026-11-10, which superseded
 *   N37a; round 5's review). A record's daily pin within K = recordReach(record, seeded, vol) sessions of the 1M, 3M or
 *   1Y opening or of the YTD waypoint (YIELDING_PINS; K or fewer apart, on it included) DROPS that seeded pin, so the
 *   walk runs from pin to pin through the record and no bridge between a record and a seeded opening is shorter than
 *   the gap between their prices needs. When the year's opening is dropped, the closes before the first pin walk free,
 *   back from that record. The week's opening (N35a, below) and yesterday's close are never dropped. On those days the
 *   window opens where the one path is, about the record (a record made at the frozen demo quote and read a window
 *   later: $0.00), the ranges stay windows of one path and every record reads back. Until the ruling a record ON the
 *   opening took its place and a record one or two sessions from it was bridged to it in one or two sessions: the
 *   seed's records gave 170 company-days over 6x the daily volatility on 1Y from February 19 to July 5, 2027 (LLY
 *   23.9x, MSFT 19.9x), a save made on November 9 gave NVDA's 3M line 8.4x on February 5-6, 2027.
 * - THE STORY COMPANIES' WINDOWS OPEN ON THEIR STORY'S SIDE OF THE PRICE (coordinator rulings N40a and N41a,
 *   2026-11-10; round 6's review). For a STORY_TREND company with a record, after those drops, the 3M and 1Y openings
 *   and, once the YTD window holds STORY_YTD_CLOSES (45) closes, YTD's (`ytdOpen`: the close at or before January 1,
 *   which demoPriceHistory passes) are kept below the price (all four rise): one that a record left at or over it, and
 *   that is no pin of its own, is pinned at min(price, yesterday's close) / (1 + STORY_OPENING_MARGIN) (N44b: under both
 *   ends of the day, so the rise survives the day's move; it was price / 1.002), where every pin of the path lies at
 *   least recordReach(pin, that close) sessions away. A record ON an opening stands (N38a's exact day: $0.00; YTD's
 *   opening is the close at or before January 1, so a save made from about Dec 31 09:00 to Jan 2 10:00 IS that opening on
 *   most days of the next March to December: accepted, N44d). Until the ruling a visitor who saved MU, GS, KO or O at the
 *   frozen demo quote saw those lines fall on 6 to 19 readings around the window openings (GS 3M -3.6% on February 4-5,
 *   2027) and YTD on up to 56 days of spring 2027 (MU -9.8% on June 10, 2027): the bridge from the save crossed the
 *   opening above the price.
 * - THE WEEK'S OPENING CLOSE STANDS ON THE WEEK'S OWN LINE, as yesterday's close stands for the day (coordinator ruling
 *   N35a, 2026-11-09; follow-up F6). A record made 4.3 to 5.8 days before today's midnight has its daily close on the
 *   one that opens the week (five sessions back), for one or two calendar days. The DAILY closes keep the record there
 *   (the read-back of N23a holds on 1M, 3M, YTD and 1Y); the WEEK's line keeps its seeded opening, price / (1 + the 1W
 *   move), and its first session's bridge starts from it. The record still stands on its own bar of the week (pinPlan),
 *   and the week's other daily closes (bars 7, 14, 21 and 28) are the daily ranges' own. So on those days the week's
 *   FIRST bar alone is not the month's close of the same session, and a company's "this week" never becomes "the move
 *   since the record": before the ruling a plain SAVE of a held pick made on November 9 read "This week $0.00" on its
 *   pick page on November 15 and took the persona's "+$186 (+1.9%) this week" to "+$183 (+1.8%)".
 */
function pricePath(T: string, price: number, day: number, plan: PinPlan = NO_PINS, ytdOpen: number | null = null): PricePath {
	const vol = demoDailyVol(T);
	// the volatility follows the catalog's beta, which lands with the catalog chunk: part of the key; so is the YTD
	// opening a story company keeps under the price (N41a), given only when it applies
	const key = `${T}|${price}|${day}|${vol}|${plan.key}${ytdOpen === null ? "" : `|ytd@${ytdOpen}`}`;
	const hit = pathCache.get(key);
	if (hit) return hit;
	const year = WINDOW_SESSIONS["1Y"];
	const back = WINDOW_SESSIONS["1W"];
	const closeAtPin = new Map<number, number>();
	for (const range of HISTORY_RANGES) {
		const exact = price / Math.max(0.01, 1 + demoRangeMove(T, range, day) / 100);
		closeAtPin.set(year - WINDOW_SESSIONS[range], range === "1D" ? exact : cents(exact));
	}
	// the close the week's line opens on, as the 1W move puts it: it stands there whatever was recorded on that close (N35a)
	const weekOpen = closeAtPin.get(year - back)!;
	// yesterday's close, price / (1 + the day's move), exact: never dropped, never a record's (the day's move stands)
	const yesterday = closeAtPin.get(year - WINDOW_SESSIONS["1D"])!;
	// yesterday's close is never an anchor's (pinPlan), so the day's move stands
	const records = plan.daily.filter(([i]) => i >= 0 && i < year - 1);
	// a record within reach of a seeded window opening (1M, 3M, the YTD waypoint, 1Y) takes its place: the seeded pin is
	// dropped, so no bridge between the two is too short for the gap between their prices (N38a)
	for (const range of YIELDING_PINS) {
		const at = year - WINDOW_SESSIONS[range];
		const seeded = closeAtPin.get(at)!;
		if (records.some(([i, close]) => Math.abs(i - at) <= recordReach(close, seeded, vol))) closeAtPin.delete(at);
	}
	for (const [i, close] of records) closeAtPin.set(i, close);
	const barPin = ([i, close]: readonly [number, number]): BarPin => ({ i, close, log: Math.log(close / price) });
	const w = randomWalk(`${T}|path|daily`, year - 1);
	// log(close / price), unrounded: what the intraday bridges run between; before the first pin (a record that took the
	// year's opening, N38a) the walk runs free, back from that record
	let { logs, daily } = walkYear(closeAtPin, w, vol, price, year);
	// THE STORY COMPANIES' WINDOWS OPEN ON THEIR STORY'S SIDE OF THE PRICE (N40a, N41a): where a record left the 3M or the
	// 1Y opening, or the YTD one (`ytdOpen`, from 45 closes on), at or over the price and that close is no pin of its own,
	// it is pinned 0.2% under the lower of the price and yesterday's close (N44b: the rise survives the day's move, so the
	// line up to yesterday's close rises too), when no pin (a record's, a seeded one) lies nearer it than the gap between
	// the two prices needs (recordReach: K or more sessions apart). A record ON an opening stands: the exact day reads $0.00
	const sign = STORY_TREND[T];
	if (sign !== undefined && records.length > 0) {
		const openings = [...new Set([0, year - WINDOW_SESSIONS["3M"], ...(ytdOpen === null ? [] : [ytdOpen])])].filter((at) => at >= 0 && at < year - 1);
		// the story's side of BOTH ends of the day: under the lower of the two for a rise (all four), over the higher for a fall
		const end = sign > 0 ? Math.min(price, yesterday) : Math.max(price, yesterday);
		const target = cents(end / (1 + sign * STORY_OPENING_MARGIN));
		const roomFor = (at: number) => [...closeAtPin.entries()].every(([i, close]) => Math.abs(i - at) >= recordReach(close, target, vol));
		// a pin moves the bridges either side of it, so the openings are read again after each round (three at most)
		for (let round = 0; round < openings.length; round++) {
			const due = openings.filter((at) => !closeAtPin.has(at) && !(sign * (price - daily[at]!) > 0) && roomFor(at));
			if (due.length === 0) break;
			for (const at of due) closeAtPin.set(at, target);
			({ logs, daily } = walkYear(closeAtPin, w, vol, price, year));
		}
	}

	const sessionSd = (move: number, steps: number) => Math.max(SESSION_VOL * vol, MOVE_VOL * Math.abs(move)) / Math.sqrt(steps);
	const steps = DEMO_POINTS["1D"] - 1;
	const open = logs[year - 1]!;
	const wt = randomWalk(`${T}|path|today`, steps);
	const sd = sessionSd(open, steps);
	const today = barsThrough(
		wt,
		[{ i: 0, close: daily[year - 1]!, log: open }, ...plan.minute.filter(([i]) => i > 0 && i < steps).map(barPin), { i: steps, close: price, log: 0 }],
		sd,
		price,
	);

	// the week opens on its seeded close; the daily closes hold a record there instead on the day or two it sits on that
	// close (N35a). Without such a record the two are one figure: daily[year - back] IS weekOpen
	const week = [weekOpen];
	for (let s = year - back + 1; s < year; s++) {
		const opens = s - 1 === year - back;
		const prev = opens ? weekOpen : daily[s - 1]!;
		const from = opens ? Math.log(weekOpen / price) : logs[s - 1]!;
		const to = logs[s]!;
		// seeded by how many sessions ago it was, so each session keeps its own hours
		const ws = randomWalk(`${T}|path|session|${year - s}`, SESSION_BARS);
		const sds = sessionSd(to - from, SESSION_BARS);
		// the session's first bar on the week's line (the bar after the previous close), for the anchors' hourly pins
		const first = (s - (year - back) - 1) * SESSION_BARS;
		const inside = plan.hourly.filter(([i]) => i > first && i < first + SESSION_BARS).map(([i, close]) => barPin([i - first, close]));
		const bars = barsThrough(ws, [{ i: 0, close: prev, log: from }, ...inside, { i: SESSION_BARS, close: daily[s]!, log: to }], sds, price);
		for (let j = 1; j <= SESSION_BARS; j++) week.push(bars[j]!);
	}
	for (let j = 1; j <= SESSION_BARS; j++) week.push(today[Math.round((steps * j) / SESSION_BARS)]!);

	const path: PricePath = { daily, week, today };
	if (pathCache.size > 400) pathCache.clear();
	pathCache.set(key, path);
	return path;
}

/** A range's closes: its window of the path (the last `sessions` daily closes for a daily range), ending at the price. */
function pathCloses(path: PricePath, range: HistoryRange, price: number, sessions: number): number[] {
	if (range === "1D") return [...path.today];
	if (range === "1W") return [...path.week];
	return [...path.daily.slice(Math.max(0, path.daily.length - sessions)), price];
}

/**
 * The moments of a demo series of `count` points ending at `now`.
 * - 1D and 1W: evenly spaced from the range's window start.
 * - The daily ranges: the daily timeline. The last point is the clock, the one before it yesterday's close at today's
 *   local midnight (a minute before the clock in the day's first minute, as the 1D range starts), and each earlier
 *   close stands a session (SESSION_MS) before the next: the same moments whichever range asks, so a series of `count`
 *   points is the tail of any longer one.
 */
export function demoTimes(range: HistoryRange, count: number, now: number): number[] {
	const n = Math.max(2, count);
	if (range !== "1D" && range !== "1W") {
		const midnight = midnightOf(now);
		return Array.from({ length: n }, (_, i) => (i === n - 1 ? now : i === n - 2 ? Math.min(midnight, now - 60_000) : closeMoment(midnight, n - 2 - i)));
	}
	const start = rangeStart(range, now);
	return Array.from({ length: n }, (_, i) => (i === n - 1 ? now : Math.round(start + ((now - start) * i) / (n - 1))));
}

function historyOf(symbol: string, range: HistoryRange, source: PriceHistory["source"], times: number[], closes: number[]): PriceHistory {
	const first = closes[0]!;
	const last = closes[closes.length - 1]!;
	const change = round2(last - first);
	return {
		symbol,
		range,
		source,
		points: times.map((t, i) => ({ ts: new Date(t).toISOString(), close: closes[i]! })),
		times,
		closes,
		first,
		last,
		change,
		// from the closes themselves, not the cent-rounded change: a demo day ends exactly on its quote's day move
		changePercent: first > 0 ? ((last - first) / first) * 100 : 0,
		low: Math.min(...closes),
		high: Math.max(...closes),
	};
}

const demoCache = new Map<string, PriceHistory>();

/**
 * The deterministic demo series of a company for a range (pure): the range's window of the company's price path
 * (pricePath), ending at `quote.price`. Its first close is where the range's move puts it (demoRangeMove), in cents;
 * on 1D it is the exact previous close (price / (1 + day move), unrounded, the figure the quote's own change comes
 * from: demoQuote), so the series' change IS the quote's day move to the last digit (a cent-rounded first close made
 * a low price such as AMC's $4.85 print -4.0% for a -3.9% day). null when there is no usable quote.
 * The closes in between are rounded to cents, as the API's are, except yesterday's close where a longer range passes
 * through it (the same exact figure the 1D series starts at); the last close is the quote's price exactly.
 * `anchors` (optional, N23a): the prices the account recorded for the company (priceAnchorsOf). The path then passes
 * through each of them: `closeAt(history, anchor.t)` is the recorded price in cents on every daily range whose window
 * holds the moment, from the local midnight after the record on (pinPlan: one close of the one timeline), and on the
 * week's and the day's own bars while they hold it (a record whose bar there is a daily close stands on the next bar).
 * The week's FIRST close is never a record's: it stays where the 1W move puts it (N35a), so `first` and `change` of the
 * 1W series are the same with and without anchors.
 * Without anchors the closes do not depend on `now`, only the YTD window's length does (the closes since January 1);
 * with them the daily closes follow the DAY the clock stands on, never the hour.
 */
export function demoPriceHistory(
	symbol: string,
	range: HistoryRange,
	quote: Pick<Quote, "price" | "changePercent"> | null,
	now: number = Date.now(),
	anchors?: readonly PriceAnchor[] | null,
): PriceHistory | null {
	const T = normalizeTicker(symbol);
	if (!T || !quote || !(quote.price > 0) || !Number.isFinite(quote.price)) return null;
	const day = Number.isFinite(quote.changePercent) ? quote.changePercent : 0;
	const plan = pinPlan(anchors, now);
	const key = `${T}|${range}|${quote.price}|${day}|${now}|${demoDailyVol(T)}|${plan.key}`;
	const hit = demoCache.get(key);
	if (hit) return hit;
	// where today's YTD window opens on the year's closes, for a story company with records once YTD holds 45 closes (N41a)
	const ytd = windowSessions("YTD", now);
	const ytdOpen = STORY_TREND[T] !== undefined && plan.daily.length > 0 && ytd >= STORY_YTD_CLOSES ? WINDOW_SESSIONS["1Y"] - ytd : null;
	const closes = pathCloses(pricePath(T, quote.price, day, plan, ytdOpen), range, quote.price, windowSessions(range, now));
	const history = historyOf(T, range, "demo", demoTimes(range, closes.length, now), closes);
	if (demoCache.size > 600) demoCache.clear();
	demoCache.set(key, history);
	return history;
}

/** The API's points as a history (usable closes only, oldest first); null with fewer than two. */
export function apiPriceHistory(symbol: string, range: HistoryRange, points: readonly StockChartPoint[] | null | undefined): PriceHistory | null {
	const ok = (points ?? [])
		.map((p) => ({ t: Date.parse(p.ts), close: p.close }))
		.filter((p) => Number.isFinite(p.t) && typeof p.close === "number" && Number.isFinite(p.close) && p.close > 0)
		.sort((a, b) => a.t - b.t);
	if (ok.length < 2) return null;
	return historyOf(normalizeTicker(symbol), range, "api", ok.map((p) => p.t), ok.map((p) => p.close));
}

/**
 * The plain-function form of the rule: the API's points when they hold a series, otherwise the demo series for `quote`,
 * through the account's `anchors` when given (N23a; the API's closes are what they are).
 */
export function priceHistoryFor(
	symbol: string,
	range: HistoryRange,
	quote: Pick<Quote, "price" | "changePercent"> | null,
	apiPoints?: readonly StockChartPoint[] | null,
	now: number = Date.now(),
	anchors?: readonly PriceAnchor[] | null,
): PriceHistory | null {
	return (apiPoints ? apiPriceHistory(symbol, range, apiPoints) : null) ?? demoPriceHistory(symbol, range, quote, now, anchors);
}

const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

/** The chart query, under the cache entry the stock page, the pick page and Simulate already share for that company and range. */
export const chartQuery = (symbol: string, range: HistoryRange, enabled: boolean) => ({
	queryKey: ["stock-chart", normalizeTicker(symbol), CHART_RANGE[range]] as const,
	queryFn: () => Promise.race([getStockChart(normalizeTicker(symbol), CHART_RANGE[range]), timeout(8000)]),
	enabled,
	staleTime: 5 * 60_000,
	gcTime: 30 * 60_000,
	retry: 0,
});

/**
 * The async plain function (for code outside React): asks the API when `live` is true (the caller's quote is a live one),
 * falls back to the demo series for `quote`.
 */
export async function fetchPriceHistory(
	symbol: string,
	range: HistoryRange,
	opts: { quote: Pick<Quote, "price" | "changePercent"> | null; live: boolean; now?: number; anchors?: readonly PriceAnchor[] | null },
): Promise<PriceHistory | null> {
	if (opts.live) {
		try {
			const answer = await chartQuery(symbol, range, true).queryFn();
			const api = apiPriceHistory(symbol, range, answer?.prices);
			if (api) return api;
		} catch {
			/* unreachable or slow: the stand-in below */
		}
	}
	return demoPriceHistory(symbol, range, opts.quote, opts.now, opts.anchors);
}

/** The close at or before `t` (the first close for a moment before the series starts). */
export function closeAt(history: Pick<PriceHistory, "times" | "closes">, t: number): number {
	const { times, closes } = history;
	if (t <= times[0]!) return closes[0]!;
	let lo = 0;
	let hi = times.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (times[mid]! <= t) lo = mid;
		else hi = mid - 1;
	}
	return closes[lo]!;
}

/**
 * The hooks' clock: whole minutes, fixed per range for the life of the component, so every series a screen asks for at
 * once shares one grid (the portfolio history sums them point by point).
 */
export function useHistoryNow(range: HistoryRange): number {
	return useMemo(() => Math.floor(Date.now() / 60_000) * 60_000, [range]);
}

/**
 * Which companies take the API's figures: quotes.ts useQuote's own rule (useLiveFor): the API answers, and the person is
 * signed in or the design never priced the company (a signed-out visitor keeps the frames' demo prices all visit).
 */
function useLiveRule(signedIn: boolean): (ticker: string) => boolean {
	const healthy = useApiHealthState().healthy;
	return (ticker: string) => healthy && ticker.length > 0 && (signedIn || !hasDemoQuote(ticker));
}

type QueryLike<T> = { data: T | undefined; isPending: boolean };

function resolve(
	T: string,
	range: HistoryRange,
	live: boolean,
	quoteQ: QueryLike<Quote | null>,
	chartQ: QueryLike<{ prices: StockChartPoint[] }>,
	now: number,
	anchors: readonly PriceAnchor[],
): PriceHistoryState {
	if (live && quoteQ.isPending) return LOADING;
	const liveQuote = live ? (quoteQ.data ?? null) : null;
	if (liveQuote) {
		if (chartQ.isPending) return LOADING;
		const api = apiPriceHistory(T, range, chartQ.data?.prices);
		if (api) return { status: "ready", history: api };
	}
	// no live answer: the stand-in, ending at the quote the page shows (the live one, or the demo table's) and passing
	// through the prices the person's own ledger recorded for the company (N23a)
	const demo = demoPriceHistory(T, range, liveQuote ?? demoQuote(T), now, anchors);
	return demo ? { status: "ready", history: demo } : NONE;
}

/**
 * One company's history for one range, from the same quote source as the stock page. `enabled: false` asks nothing
 * (status "none"), e.g. while the caller draws Figma's own line for the showcase.
 * The demo series passes through what the person's ledger recorded for the company (N23a): the hook reads the anchors
 * from the live state (priceAnchorsOf: the picks' lots, the saves, the sales), so a pick's chart holds its pick-day
 * price on its day and "since you saved" can be read off the line.
 */
export function usePriceHistory(symbol: string, range: HistoryRange, opts: { enabled?: boolean } = {}): PriceHistoryState {
	const T = normalizeTicker(symbol);
	const enabled = opts.enabled ?? true;
	const account = useLive();
	const liveFor = useLiveRule(account.signedIn);
	const live = enabled && liveFor(T);
	const quoteQ = useQuery(quoteQuery(T, live));
	const chartQ = useQuery(chartQuery(T, range, live));
	const now = useHistoryNow(range);
	// the anchors' text stands for them: a fresh array every render would rebuild the series every render
	const recorded = enabled && T ? priceAnchorsOf(T, account) : [];
	const recordedKey = anchorsKey(recorded);
	return useMemo(
		() => (enabled && T ? resolve(T, range, live, quoteQ, chartQ, now, recorded) : NONE),
		// the queries' data objects and pending flags stand for the queries
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[enabled, T, range, live, quoteQ.data, quoteQ.isPending, chartQ.data, chartQ.isPending, now, recordedKey],
	);
}

/** Several companies' histories for one range, on one shared clock. */
export type PriceHistories = {
	/** "loading" while any company's API closes are on their way (the ready ones are already in `bySymbol`) */
	status: "ready" | "loading";
	bySymbol: Record<string, PriceHistory>;
	/** companies with no series at all (no quote anywhere) */
	missing: string[];
	/** the shared clock the demo series end on */
	now: number;
};

export function usePriceHistories(symbols: readonly string[], range: HistoryRange, opts: { enabled?: boolean } = {}): PriceHistories {
	const enabled = opts.enabled ?? true;
	// keyed on the symbols' text, so a caller passing a fresh array every render keeps one result object
	const key = [...new Set(symbols.map(normalizeTicker).filter(Boolean))].join(",");
	const list = useMemo(() => (key ? key.split(",") : []), [key]);
	const account = useLive();
	const liveFor = useLiveRule(account.signedIn);
	const lives = list.map((t) => enabled && liveFor(t));
	const quoteQs = useQueries({ queries: list.map((t, i) => quoteQuery(t, lives[i]!)) });
	const chartQs = useQueries({ queries: list.map((t, i) => chartQuery(t, range, lives[i]!)) });
	const now = useHistoryNow(range);
	const stamp = [...quoteQs, ...chartQs].map((q) => `${q.status}:${q.dataUpdatedAt}`).join(",");
	// what the person's ledger recorded for each company (N23a), as usePriceHistory reads it
	const recorded = useMemo(
		() => list.map((t) => (enabled ? priceAnchorsOf(t, account) : [])),
		// the three lists are the anchors' only sources
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[enabled, list, account.positions, account.saves, account.sold],
	);
	return useMemo(() => {
		const bySymbol: Record<string, PriceHistory> = {};
		const missing: string[] = [];
		let loading = false;
		list.forEach((t, i) => {
			if (!enabled) return;
			const state = resolve(t, range, lives[i]!, quoteQs[i]!, chartQs[i]!, now, recorded[i] ?? []);
			if (state.status === "ready") bySymbol[t] = state.history;
			else if (state.status === "loading") loading = true;
			else missing.push(t);
		});
		return { status: loading ? "loading" : "ready", bySymbol, missing, now };
		// `stamp` stands for the query results (new arrays every render); `lives` for the live rule's answers
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, list, range, now, stamp, lives.join(","), recorded]);
}

// ── The market, for "vs the market" ─────────────────────────────────────────────────────────────────────────────────

/** The market proxy the STAK API is asked for (an S&P 500 fund). */
export const MARKET_SYMBOL = "SPY";

/**
 * The demo market: up 3.2% over the period of the frames' picks (the phones author every pick's "vs the market" as its
 * gain less that ~3.2%: NVDA +24.0% -> "+20.8% ahead", TSLA +14.8%, JPM -1.2%, MSFT -6.2%; android
 * ui/simulate/PickDetailScreen.kt:84-92), flat through the picks' window (to Jul 10, 2026) and rising steadily since,
 * so a pick made today is even with the market (the phones' "Even with the market", PaperPortfolio.kt:365).
 */
export const DEMO_MARKET = { periodMove: 3.2, flatUntil: new Date(2026, 6, 10).getTime() } as const;

/** The demo market's move from `since` to `now`, in % (pure). */
export function demoMarketMoveSince(since: number, now: number = Date.now()): number {
	if (!(since < now)) return 0;
	const flatUntil = Math.min(DEMO_MARKET.flatUntil, now - DAY);
	if (since <= flatUntil) return DEMO_MARKET.periodMove;
	return (DEMO_MARKET.periodMove * (now - since)) / (now - flatUntil);
}

export type MarketMove = { status: "ready" | "loading"; source: "api" | "demo"; pct: number };

/**
 * The market's move since `since` (a pick's date), from the same kind of figures as the pick's own price, so "vs the
 * market" never sets a live market against a demo gain: SPY's 1Y closes from the STAK API (the close at or before
 * `since` to the last close) when the pick's quote is a live one by quotes.ts useLiveFor's rule (the API answers, and
 * the person is signed in or `ticker` is a company the design never priced; without a `ticker`, signed in), otherwise
 * the demo market (a signed-out visitor's demo-priced picks). `since` older than a year reads the year's first close.
 */
export function useMarketMove(since: number | null | undefined, opts: { enabled?: boolean; ticker?: string } = {}): MarketMove {
	const enabled = (opts.enabled ?? true) && typeof since === "number" && Number.isFinite(since);
	const healthy = useApiHealthState().healthy;
	const signedIn = useLive().signedIn;
	const T = opts.ticker ? normalizeTicker(opts.ticker) : "";
	const live = healthy && (signedIn || (T.length > 0 && !hasDemoQuote(T)));
	const q = useQuery(chartQuery(MARKET_SYMBOL, "1Y", enabled && live));
	const now = useHistoryNow("1Y");
	return useMemo<MarketMove>(() => {
		const demo = { status: "ready" as const, source: "demo" as const, pct: enabled ? demoMarketMoveSince(since as number, now) : 0 };
		if (!enabled || !live) return demo;
		if (q.isPending) return { ...demo, status: "loading" };
		const h = apiPriceHistory(MARKET_SYMBOL, "1Y", q.data?.prices);
		if (!h) return demo;
		const then = closeAt(h, since as number);
		return { status: "ready", source: "api", pct: then > 0 ? (h.last / then - 1) * 100 : 0 };
	}, [enabled, live, since, now, q.data, q.isPending]);
}

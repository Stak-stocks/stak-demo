/**
 * The account's paper value over a range (coordinator decisions D3 / D4, 2026-11-07): every range of the portfolio
 * chart draws the account's own line, and the trailing week behind the one weekly figure and rank comes from here.
 *
 * At each moment of the range: today's cash, plus every open position at that moment's close (live/history.ts: the
 * API's closes or the demo series, whichever the company's quote takes), plus, for every sale inside the range, the
 * shares at their close until the sale less the proceeds today's cash already holds. EVERY BUY IS ITS OWN LOT, of an
 * open position (ledger.ts heldLots) and of a sale alike (ledger.ts soldLots: the buys that sale sold): before a lot
 * was bought its cost was still cash, from then on it is worth its closes. A lot's path is bridged so it starts at
 * exactly what it cost when it was bought inside the range and ends at exactly today's price, or the sale's (a demo
 * series, or the API's last bar, need not pass through the price the order filled at): no line steps at a purchase or
 * a sale, and the last point is today's portfolio value, the hero's figure.
 * So a trade at today's price moves no figure of any range: a pick topped up and then sold, in part or whole, leaves
 * the day, the week, the month and the rank where they were. Until the review of 2026-11-09 a sale counted everything
 * it sold as held since the position's FIRST buy: $5,000 of TSLA bought and sold within the hour read as held all week,
 * and "+$186 (+1.9%) this week · #47" became "+$392 (+4.0%) · #7" (follow-up F1).
 *
 * The guest persona's ledger also holds the frames' unlisted picks (live/ledger.ts): one path from what they cost (Jun
 * 12, 2026) to what they are worth, whose last week is anchored so the persona's trailing week is the frames' own
 * "+$186 (+1.9%) this week" whatever the six listed picks did (the demo series move them a little). So the untouched
 * showcase's computed week IS the frames' (#47 on the board, live/rank.ts) and the first action changes none of it.
 *
 * Since 2026-11-09 (coordinator ruling N21) a company's demo series is a window of its own price path (history.ts): the
 * six listed picks now walk between the closes that open and end each range, where they used to follow the phones'
 * shape. The anchor is read from those series (seedListedWeekChange), so it follows them by itself; and because each
 * range still opens at the close its move puts there, the picks' week and the persona's pinned figures are what they
 * were: 1W +$186.25, and +$240.00 from the $10,000 budget on the ranges that reach back before its first pick (1Y; YTD
 * through 2026). 1D is the listed picks' own day move: +$10.45 on the exact seed (it was +$10.44 on the four-decimal
 * shares). The six listed picks make $12.41 of the week since round 4 (N35b: NVDA's week is the frame's +$3.80; they
 * made $12.32 while it was the seeded +$3.71, and $12.33 on the four-decimal seed) and the off-book holding the rest.
 *
 * Since the fix round of 2026-11-09 (coordinator rulings N23a and N25): (1) a company's series passes through the
 * prices the ledger recorded for it (history.ts PriceAnchor), so a position's own line is at what it cost on the day
 * it was bought and the bridge below corrects nothing there; (2) the off-book holding WALKS between its anchors (its
 * stake on its stake date, its value a week ago, today's value) like a basket of six picks, where it used to follow
 * the phones' smooth shape: past the showcase Simulate's 1M line lay flat for three weeks and then stepped up.
 */
import { useMemo } from "react";
import { round2 } from "./format";
import type { Lot, SoldEntry } from "./guest";
import { seedGuest } from "./guest";
import { closeAt, DAILY_VOL, demoPriceHistory, type HistoryRange, type PriceHistory, priceAnchorsOf, rangeStart, seededWalk, usePriceHistories } from "./history";
import { FRAMES_VALUE, heldLots, type OffBook, PERSONA_WEEK_GAIN, personaOffBook, soldLots } from "./ledger";
import { usePortfolio } from "./portfolio";
import { demoQuote } from "./quotes";

const DAY = 86_400_000;

/**
 * One position as the history reads it: `price` is today's price (PositionRow.price: the quote, or the cost basis
 * without one); `lots` every buy (guest.ts Position.lots), else the position is one buy at `priceAtAdd` on `addedAt`.
 */
export type LedgerHolding = { ticker: string; shares: number; priceAtAdd: number | null; addedAt: number; price: number; lots?: readonly Lot[] };
export type LedgerInput = { cash: number; positions: readonly LedgerHolding[]; sold: readonly SoldEntry[]; offBook: OffBook | null };

export type ValuePoint = { t: number; value: number };

export type ValueHistory = {
	range: HistoryRange;
	/** "loading" while a company's API closes are on their way (a line drawn now would change shape) */
	status: "ready" | "loading";
	/** where the companies' closes came from; "cash" when nothing was held or sold during the range (a flat line) */
	source: "api" | "demo" | "mixed" | "cash";
	/** oldest first; the last point is today's value */
	points: ValuePoint[];
	values: number[];
	/** the value at the range's first point and today (cents) */
	start: number;
	end: number;
	/** end − start (cents), and as a % of start */
	change: number;
	changePercent: number;
};

/** The most points a line needs (the widest chart is ~770 px). */
export const MAX_VALUE_POINTS = 600;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

let seedWeek: { now: number; change: number } | null = null;
/**
 * What the persona's own ledger made over the trailing week WITHOUT its off-book holding: the week's change of the
 * value history itself (portfolioValueHistory below) over the seed's cash, its six listed picks and its two closed
 * ones. So the anchor follows the ledger's own rule on every clock (review 2, low 5): a pick bought inside the week
 * counts from its buy, one the clock has not reached yet as cash until the clock. It used to be shares x (today's price
 * - the week's first close) for all six, which takes each pick as held all week: at the capture tools' frame clock
 * (July 4 to 13, 2026: JPM picked July 1, MSFT July 8) it assumed $12.33 where the history booked $7.52, and the
 * persona's week read $181.44 instead of $186.25.
 * The series are the ones the pages draw for the persona: through the prices the seed recorded (history.ts
 * priceAnchorsOf, N23a). Those are dated April to July 2026, so on a clock a week or more past them every pick was held
 * all week and the figure is what the series' ends give: $12.41 (NVDA +3.80, the frame's own "This week": coordinator
 * ruling N35b, ledger.ts framesWeekMove; TSLA +4.86, AMD -2.30, AAPL +2.24, JPM +2.34, MSFT +1.47; each series opens at
 * the close the week's move puts five sessions back, history.ts demoRangeMove, whatever the path does in between and
 * whatever the ledger recorded on that close: N35a), and the off-book holding carries the other $173.84 of the frames'
 * week.
 * THE LIVE LEDGER'S RECORDS DO NOT MOVE IT (N35a): a company's 1W series opens on its seeded close with or without
 * anchors, so a save, a top-up or a sale made after the seed leaves each listed pick's week, and with it the persona's
 * +$186.25, where the seed's own series put them. A top-up's own shares earn their week once they are a week old, and
 * a sold half stops earning it then: those are the ledger's, not the path's.
 */
function seedListedWeekChange(now: number): number {
	if (seedWeek && seedWeek.now === now) return seedWeek.change;
	const seed = seedGuest();
	const positions: LedgerHolding[] = seed.positions.map((p) => ({ ...p, price: demoQuote(p.ticker)?.price ?? p.priceAtAdd ?? 0 }));
	const histories: Record<string, PriceHistory> = {};
	for (const ticker of new Set([...seed.positions, ...seed.sold].map((x) => x.ticker.toUpperCase()))) {
		const h = demoPriceHistory(ticker, "1W", demoQuote(ticker), now, priceAnchorsOf(ticker, seed));
		if (h) histories[ticker] = h;
	}
	const change = portfolioValueHistory({ cash: seed.cash, positions, sold: seed.sold, offBook: null }, "1W", histories, now).change;
	seedWeek = { now, change };
	return change;
}

/**
 * The off-book holding's share of its ledger's anchored trailing week: the persona's week (PERSONA_WEEK_GAIN, the
 * frames' "+$186 (+1.9%)") less what the seed's six listed picks make on their own series, so the persona's computed
 * week is the frames' whatever those picks did.
 * A ledger worth LESS than the frames' $10,240 anchors its week in proportion to its value against the frames' (the
 * ledger's week is PERSONA_WEEK_GAIN x value / 10,240, of which the holding carries what the listed picks do not, never
 * less than nothing), not to the holding's own value (coordinator ruling 2026-11-08 10:50 on a migrated browser that had
 * spent nearly everything under the old seed, cash clamped to $0 and the holding cut, guest.ts unlistedCut: on a ledger
 * a tenth of the persona's the holding's own 27% week read "+$119 (+11.7%) this week" and "#1 on the leaderboard"
 * beside "-$8,864.00 all time" (review 2); in proportion to the ledger it reads "+$21 (+1.9%)" and #47). The rule is
 * not tied to the cut: a browser whose old cash just covered the seed's $604 keeps the whole holding on a ledger of
 * $1,440 and read "+14.9%" / #1 the same way. Every real persona ledger is worth the frames' $10,240 to the cent (demo
 * prices are frozen and every trade is at today's price), so for it the proportion is 1 and the week is the frames'.
 * `ledgerValue` is today's value of the whole ledger (portfolioValueHistory passes it); a pure caller without it gets
 * the holding's own proportion.
 */
function anchoredWeekGain(ob: OffBook, now: number, ledgerValue?: number): number {
	const listed = seedListedWeekChange(now);
	if (ledgerValue !== undefined && Number.isFinite(ledgerValue)) return Math.max(0, PERSONA_WEEK_GAIN * Math.min(1, ledgerValue / FRAMES_VALUE) - listed);
	return (PERSONA_WEEK_GAIN - listed) * (ob.value / personaOffBook().value);
}

/**
 * How much the off-book holding moves in a day (the standard deviation of its daily log return): the volatility of a
 * basket of six picks like the persona's six listed ones. Those average a beta of 1.4 (the catalog's: NVDA 1.7, TSLA
 * 1.87, AMD 1.8, AAPL 1.09, JPM 1.15, MSFT 0.9), so each moves about 1.1% x 1.4 a day (history.ts DAILY_VOL), and six
 * that move together about a third of the time are calmer than any one of them: x sqrt((1 + 5 x 0.35) / 6). About
 * 1.04% a day.
 */
export const OFF_BOOK_DAILY_VOL = DAILY_VOL * 1.4 * Math.sqrt((1 + 5 * 0.35) / 6);
/** One step of the holding's walk: a fifth of a calendar day, seven to a session (five sessions a week), as the week's hourly bars. */
const WALK_STEP = DAY / 5;
const STEPS_A_SESSION = 7;
/** A stretch that travelled far was a lively one: its volatility is at least this share of its own move (history.ts asks half of a session). */
const MOVE_VOL = 0.4;

/**
 * The holding's own shocks: one walk, counted in steps back from an origin near today (the clock for the last week,
 * today's local midnight for the months before it), so the line of a range looks the same whatever the day.
 */
const offBookWalk = seededWalk("stak|off-book|walk");

const midnightOf = (ms: number) => {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

/**
 * The local midnight `days` CALENDAR days before the day `ms` stands on. Counted on the calendar, not in hours: the day
 * the clocks change is 23 or 25 hours long, so `midnightOf(ms - days x 24 h)` names another calendar day for one hour
 * of every day of the week after a change (at 23:00 to 24:00 after the autumn change, 00:00 to 01:00 after the spring
 * one).
 */
const midnightDaysBefore = (ms: number, days: number) => {
	const d = new Date(ms);
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() - days).getTime();
};

/**
 * One leg of the holding's path: a walk pinned at both ends (a Brownian bridge in log value), exactly `v0` at `t0` and
 * `v1` at `t1`, moving OFF_BOOK_DAILY_VOL a session (more on a leg that travels far), never the straight segment
 * between them. A holding worth nothing at an end (a cut one) keeps the straight segment: there is no log to walk in.
 * `origin`: the moment the walk's steps are counted back from.
 */
function leg(t: number, t0: number, t1: number, v0: number, v1: number, origin: number): number {
	if (!(t1 > t0)) return v1;
	const u = clamp01((t - t0) / (t1 - t0));
	if (!(v0 > 0) || !(v1 > 0)) return v0 + (v1 - v0) * u;
	const stepsBack = (moment: number) => (origin - moment) / WALK_STEP;
	const move = Math.log(v1 / v0);
	const sd = Math.max(OFF_BOOK_DAILY_VOL / Math.sqrt(STEPS_A_SESSION), (MOVE_VOL * Math.abs(move)) / Math.sqrt(Math.max(1, (t1 - t0) / WALK_STEP)));
	const w0 = offBookWalk(stepsBack(t0));
	const w1 = offBookWalk(stepsBack(t1));
	return v0 * Math.exp(move * u + sd * (offBookWalk(stepsBack(t)) - w0 - u * (w1 - w0)));
}

/**
 * The off-book holding's worth at `t`: its stake until it was bought; then a WALK (coordinator ruling N25, 2026-11-09)
 * pinned at its stake on its stake date, at its value a week ago (the anchor) and at today's value at local midnight;
 * then today's value all day. One path, so every range reads the same holding, and the totals at the three pins are
 * what they were ($10,240.00 today, +$186.25 on the week, the $10,000 budget before the first pick).
 * Until N25 the two legs were the phones' smooth shapes (history.ts shapeValue): from its stake of $604.00 to $608.16 a
 * week ago (the exact seed's figures) the holding barely moved for five months and then gained $174 in a week, so past the showcase Simulate's 1M
 * line lay flat for three weeks and then stepped up. It is the frames' own figures that put $174 of the +$186 week on
 * this holding (N7a: the data decides); the walk makes both legs a real line: the long one wanders as a basket of six
 * picks does (OFF_BOOK_DAILY_VOL), the last week climbs the way a lively week does (MOVE_VOL).
 * Flat over today: the unlisted picks have no quote, so nothing moves them during the day, and the persona's 1D change
 * is its listed picks' own day move (usePortfolio's `today`) at any hour (review 1: it used to rise along the week's
 * shape until `now`, adding an hour-dependent drift to the 1D figure). The week's total is unchanged.
 * THE MONTHS BEFORE THE WEEK STAND STILL THROUGH A CALENDAR DAY (fix round 3, 2026-11-09, with the companies' one daily
 * timeline: history.ts): the long leg ends at the local midnight SEVEN CALENDAR DAYS before today's and its walk is
 * counted back from today's local midnight, so a moment of last month is worth the same at 09:00 and at 21:00, and so
 * are the month's, the quarter's and the year's figures. From that midnight to the week's start, a day at most (25
 * hours in the week after the autumn clock change), the holding rests on its value a week ago; no daily close and no
 * bar of the week falls in that stretch. The week's own leg stays counted from the clock: it is the trailing seven days.
 * ON THE CALENDAR (round 4, review 3's low 4; coordinator ruling N35d): the leg's end was midnightOf(now - 7 x 24 h),
 * which is another calendar day for one hour of every day of the week after a clock change, so the month and the
 * quarter read differently in that hour (November 1 to 7, 2026 at 23:55: 1M +189.53 against +187.15 earlier that day;
 * March 15, 2027 before 01:00). In the first hour of the seven days after the spring change the trailing week begins up
 * to an hour before that midnight: the week's leg starts there as always, and the long leg is read short of its end.
 * NOT STILL, and left so: a moment INSIDE the trailing week is read on the week's leg, which slides with the clock. Only
 * a window that opens inside the week reads its first point there: the YTD window on January 2 to 6 (its figure then
 * moves with the hour; no page draws a YTD value line: Simulate's tabs are 1D, 1W, 1M and 1Y).
 * `ledgerValue`: today's value of the whole ledger, for a migrated browser's cut holding (anchoredWeekGain).
 */
export function offBookValueAt(ob: OffBook, t: number, now: number, ledgerValue?: number): number {
	if (t < ob.since) return ob.stake;
	const today = Math.max(rangeStart("1D", now), ob.since);
	if (t >= today) return ob.value;
	const weekStart = Math.max(now - 7 * DAY, ob.since);
	// a week ago it was worth the anchored week less: the persona's week is then the frames' "+$186 (+1.9%)" (bought
	// less than a week ago, it is one leg from its stake: only a clock before Jun 19, 2026 sees that)
	const weekGain = anchoredWeekGain(ob, now, ledgerValue);
	const weekAgo = weekStart === ob.since ? ob.stake : ob.value - weekGain;
	if (t >= weekStart) return leg(t, weekStart, today, weekAgo, ob.value, now);
	// the long leg ends ON THE CALENDAR: the local midnight seven calendar days before today's (review 3, low 4)
	const longEnd = midnightDaysBefore(now, 7);
	// bought the very day the week began on: one short leg to the week's start, as before
	if (!(longEnd > ob.since)) return leg(t, ob.since, weekStart, ob.stake, weekAgo, now);
	return t >= longEnd ? weekAgo : leg(t, ob.since, longEnd, ob.stake, weekAgo, midnightOf(now));
}

/**
 * A position's buys, their shares adding up to exactly what is held now: the ledger's one accessor (ledger.ts heldLots;
 * a position without lots is one buy at its cost a share, or at today's price without a cost basis, on `addedAt`). The
 * position goes straight through: the accessor reads its lots and returns new ones (ledger.ts Holding: readonly lots).
 */
const openLots = (p: LedgerHolding): Lot[] => heldLots(p, p.price);

/** One buy as a sale sold it: the shares of it that sale sold, what they had cost, what they returned, when they were bought. */
type SoldPart = { shares: number; cost: number; proceeds: number; at: number };

/**
 * The buys one sale sold (ledger.ts soldLots: the record's own lots, or ONE lot on `addedAt` at the stake a share for a
 * record stored without them; a record that does not know its buy day reads as held since before any range), scaled so
 * the parts add up to exactly what the sale booked: its shares, its stake, its proceeds.
 */
function soldParts(x: SoldEntry): SoldPart[] {
	const lots = soldLots(x);
	const shares = lots.reduce((s, l) => s + l.shares, 0);
	if (!(shares > 0)) return [];
	const cost = lots.reduce((s, l) => s + l.shares * l.price, 0);
	return lots.map((l) => ({
		shares: (l.shares * x.shares) / shares,
		cost: cost > 0 ? (x.stake * l.shares * l.price) / cost : (x.stake * l.shares) / shares,
		proceeds: (x.proceeds * l.shares) / shares,
		at: l.at,
	}));
}

/** A position's correction toward the price it really entered and left at: linear from the entry's gap to the exit's. */
function bridge(t: number, t0: number, t1: number, entryGap: number, exitGap: number): number {
	const u = t1 > t0 ? clamp01((t - t0) / (t1 - t0)) : 1;
	return entryGap + (exitGap - entryGap) * u;
}

/** Today's value exactly as usePortfolio computes it (each position rounded to cents, then the sum). */
function valueToday(ledger: LedgerInput): number {
	const holdings = round2(ledger.positions.reduce((s, p) => s + round2(p.shares * p.price), 0));
	return round2(ledger.cash + holdings + (ledger.offBook?.value ?? 0));
}

/**
 * The value history of a ledger over a range (pure). `histories` holds the companies' series for that range (keyed by
 * ticker; a company without one is valued flat at today's price while held), `now` the moment the range ends.
 */
export function portfolioValueHistory(ledger: LedgerInput, range: HistoryRange, histories: Readonly<Record<string, PriceHistory>>, now: number): Omit<ValueHistory, "status"> {
	const from = rangeStart(range, now);
	// A trade the clock has not reached counts as made at `now`, the end of the window: the hooks' clock is the minute the
	// page mounted (useHistoryNow), so a sale or a buy seconds later lands after it. Dropping such a sale used to count
	// its shares as cash for the whole window and take their week out of the weekly figure and the rank (review 1).
	const at = (t: number) => Math.min(t, now);
	const todayValue = valueToday(ledger);
	const sales = ledger.sold.filter((s) => s.soldAt >= from);
	const used = new Set<PriceHistory>();
	const seriesOf = (ticker: string) => {
		const h = histories[ticker.toUpperCase()];
		if (h) used.add(h);
		return h;
	};
	// every buy is its own holding, of an open position and of a sale alike: it counts as cash until it was bought, then
	// at its close (until it was sold). One entry per company: what is held of it and what was sold of it in the range
	type Company = {
		s: PriceHistory | undefined;
		open: { price: number; lots: Lot[] }[];
		sales: { x: SoldEntry; soldAt: number; boughtAt: number | undefined; exit: number; parts: SoldPart[] }[];
	};
	const companies = new Map<string, Company>();
	const companyOf = (ticker: string): Company => {
		const T = ticker.toUpperCase();
		let c = companies.get(T);
		if (!c) {
			c = { s: seriesOf(T), open: [], sales: [] };
			companies.set(T, c);
		}
		return c;
	};
	for (const p of ledger.positions) companyOf(p.ticker).open.push({ price: p.price, lots: openLots(p).map((l) => ({ ...l, at: at(l.at) })) });
	for (const x of sales) {
		companyOf(x.ticker).sales.push({
			x,
			soldAt: at(x.soldAt),
			boughtAt: x.addedAt === undefined ? undefined : at(x.addedAt),
			exit: x.shares > 0 ? x.proceeds / x.shares : 0,
			parts: soldParts(x).map((l) => ({ ...l, at: at(l.at) })),
		});
	}

	// the grid: every series' moments inside the range (a demo series' grid is the range's), every buy and sale inside
	// it (so the line passes through what each one cost or returned), and today
	const times = new Set<number>([from]);
	for (const h of used) for (const t of h.times) if (t >= from && t < now) times.add(t);
	for (const { open, sales: sold } of companies.values()) {
		for (const { lots } of open) for (const lot of lots) if (lot.at > from && lot.at < now) times.add(lot.at);
		for (const { soldAt, parts } of sold) {
			if (soldAt > from && soldAt < now) times.add(soldAt);
			for (const lot of parts) if (lot.at > from && lot.at < soldAt) times.add(lot.at);
		}
	}
	if (ledger.offBook && used.size === 0) {
		const n = 64;
		for (let i = 1; i < n; i++) times.add(Math.round(from + ((now - from) * i) / n));
	}
	let grid = [...times].sort((a, b) => a - b);
	if (grid.length > MAX_VALUE_POINTS - 1) {
		const keep = MAX_VALUE_POINTS - 1;
		grid = Array.from({ length: keep }, (_, i) => grid[Math.round((i * (grid.length - 1)) / (keep - 1))]!);
	}

	// each company's worth is rounded to cents, then summed, at every moment: the way usePortfolio values today (one
	// position a company), so the first point and the last one are measured alike: a purchase changes neither by a stray
	// cent, and neither does a part sale, whose shares and the ones still held are one figure before it
	const valueAt = (t: number): number => {
		let v = ledger.cash;
		for (const { s, open, sales: sold } of companies.values()) {
			let worth = 0;
			for (const { price, lots } of open) {
				for (const lot of lots) {
					if (t < lot.at) worth += lot.shares * lot.price; // the stake was still cash
					else if (!s) worth += lot.shares * price;
					else {
						const inside = lot.at >= from;
						worth += lot.shares * (closeAt(s, t) + bridge(t, inside ? lot.at : from, now, inside ? lot.price - closeAt(s, lot.at) : 0, price - closeAt(s, now)));
					}
				}
			}
			for (const { x, soldAt, boughtAt, exit, parts } of sold) {
				if (t >= soldAt) continue; // the proceeds are in today's cash
				// today's cash holds the proceeds; before the sale they were still shares, and before a buy, that buy's cost
				v -= x.proceeds;
				if (parts.length === 0) {
					// a record of no shares: what it cost until its buy, what it returned from then on
					worth += boughtAt !== undefined && t < boughtAt ? x.stake : x.proceeds;
					continue;
				}
				// each buy the sale sold, from its own day (follow-up F1): a top-up made today was cash all week
				for (const lot of parts) {
					if (t < lot.at) worth += lot.cost; // not bought yet: its cost was still cash
					else if (!s) worth += lot.proceeds; // no closes to read: held at what it sold for
					else {
						const inside = lot.at >= from;
						worth += lot.shares * (closeAt(s, t) + bridge(t, inside ? lot.at : from, soldAt, inside ? lot.cost / lot.shares - closeAt(s, lot.at) : 0, exit - closeAt(s, soldAt)));
					}
				}
			}
			v += round2(worth);
		}
		if (ledger.offBook) v += offBookValueAt(ledger.offBook, t, now, todayValue);
		return v;
	};

	const points: ValuePoint[] = grid.map((t) => ({ t, value: round2(valueAt(t)) }));
	points.push({ t: now, value: todayValue });
	const start = points[0]!.value;
	const end = points[points.length - 1]!.value;
	const change = round2(end - start);
	const sources = new Set([...used].map((h) => h.source));
	const source: ValueHistory["source"] = sources.size === 0 ? (ledger.offBook ? "demo" : "cash") : sources.size > 1 ? "mixed" : [...sources][0]!;
	return {
		range,
		source,
		points,
		values: points.map((p) => p.value),
		start,
		end,
		change,
		changePercent: start > 0 ? (change / start) * 100 : 0,
	};
}

/**
 * The signed-in account's or the guest's value over `range` (positions, sales and cash from usePortfolio; every
 * company's closes from usePriceHistories). `enabled: false` asks for nothing and returns an empty history at today's
 * value (e.g. while the caller draws Figma's own line for the showcase).
 */
export function usePortfolioValueHistory(range: HistoryRange, opts: { enabled?: boolean } = {}): ValueHistory {
	const enabled = opts.enabled ?? true;
	const pf = usePortfolio();
	// the companies held, and those sold inside the range (a sale before it is already all cash); a minute's margin,
	// since the window the histories end on starts on the clock's whole minute (useHistoryNow), up to a minute earlier
	const from = useMemo(() => rangeStart(range) - 60_000, [range]);
	const tickers = useMemo(
		() => [...new Set([...pf.positions.map((p) => p.ticker), ...pf.sold.filter((s) => s.soldAt >= from).map((s) => s.ticker)])],
		[pf.positions, pf.sold, from],
	);
	const histories = usePriceHistories(tickers, range, { enabled });
	return useMemo<ValueHistory>(() => {
		if (!enabled) return { range, status: "ready", source: "cash", points: [], values: [], start: pf.value, end: pf.value, change: 0, changePercent: 0 };
		const ledger: LedgerInput = {
			cash: pf.cash,
			positions: pf.positions.map((p) => ({ ticker: p.ticker, shares: p.shares, priceAtAdd: p.priceAtAdd, addedAt: p.addedAt, price: p.price, lots: p.lots })),
			sold: pf.sold,
			offBook: pf.offBook,
		};
		return { ...portfolioValueHistory(ledger, range, histories.bySymbol, histories.now), status: histories.status };
	}, [enabled, range, pf, histories]);
}

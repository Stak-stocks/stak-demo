/**
 * The price path behind every chart (coordinator ruling N21, 2026-11-09), accepted over all 77 quoted companies and
 * the six ranges: determinism, the quote end, the day move, the ranges agreeing with each other, distinct lines, no
 * straight ramp. The user's report (2026-11-09, a stock page): "you noticed something off here, the graph line in
 * different stocks": on a range every company's demo line was one shape or its mirror image.
 */
import { beforeAll, describe, expect, it } from "vitest";
// read only: the frame's own "This week" string and the pick page's own sum for that cell (round 4, N35b)
import { pickDetail } from "@/app/simulate/data";
import { weekMove } from "@/app/simulate/figures";
import { loadCatalog } from "../catalog";
import { DEMO_QUOTES } from "../demoQuotes";
import { round2, signedMoney, signedPct } from "../format";
import { type GuestState, type Position, SEED_PICKS, type SoldEntry, seedGuest } from "../guest";
import {
	closeAt,
	DAILY_VOL,
	DEMO_POINTS,
	demoDailyVol,
	demoPriceHistory,
	demoRangeMove,
	HISTORY_RANGES,
	type HistoryRange,
	type PriceAnchor,
	type PriceHistory,
	priceAnchorsOf,
	priceHistoryFor,
	rangeStart,
	recordReach,
	seededWalk,
	SESSION_BARS,
	SESSION_MS,
	shapedSeries,
	STORY_OPENING_MARGIN,
	STORY_TREND,
	WINDOW_SESSIONS,
	windowSessions,
	YIELDING_PINS,
} from "../history";
import { averageCost, FRAMES_VALUE, framesWeekMove, lotsAfterSale, paperSale, paperShares, PERSONA_WEEK_GAIN, personaOffBook, positionLots, saleRecord } from "../ledger";
import { positionRow } from "../portfolio";
import { OFF_BOOK_DAILY_VOL, offBookValueAt, portfolioValueHistory, type LedgerInput } from "../portfolioHistory";
import { demoQuote } from "../quotes";
import { rankOf } from "../rank";

const NOW = new Date(2026, 10, 9, 14, 30).getTime();
const DAY = 86_400_000;
const TICKERS = Object.keys(DEMO_QUOTES);
const closesOf = (t: string, range: HistoryRange, now = NOW) => demoPriceHistory(t, range, demoQuote(t), now)!.closes;

/** A line as the charts draw it: its lowest close on the box's bottom edge, its highest on the top one. */
const unitBox = (c: readonly number[]) => {
	const lo = Math.min(...c);
	const hi = Math.max(...c);
	return c.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5));
};
const meanGap = (a: readonly number[], b: readonly number[]) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]!), 0) / a.length;
/** Over every pair of lines: how many are a mean of 0.08 apart, how many are the same line or its mirror image within 0.03. */
function pairs(lines: readonly (readonly number[])[]) {
	let count = 0;
	let apart = 0;
	let same = 0;
	let mirrored = 0;
	let closest = Number.POSITIVE_INFINITY;
	let closestMirror = Number.POSITIVE_INFINITY;
	for (let i = 0; i < lines.length; i++) {
		for (let j = i + 1; j < lines.length; j++) {
			const d = meanGap(lines[i]!, lines[j]!);
			const m = meanGap(
				lines[i]!,
				lines[j]!.map((v) => 1 - v),
			);
			count++;
			if (d >= 0.08) apart++;
			if (d < 0.03) same++;
			if (m < 0.03) mirrored++;
			closest = Math.min(closest, d);
			closestMirror = Math.min(closestMirror, m);
		}
	}
	return { count, apartShare: apart / count, same, mirrored, closest, closestMirror };
}
/** The furthest a line gets from the straight segment between its two ends, in the unit box. */
const offTheRamp = (y: readonly number[]) => {
	const n = y.length - 1;
	return Math.max(...y.map((v, i) => Math.abs(v - (y[0]! + ((y[n]! - y[0]!) * i) / n))));
};

beforeAll(() => loadCatalog());

describe("the price path: one deterministic path per company (N21)", () => {
	it("serves the 77 quoted companies on six ranges, with the API's point counts", () => {
		expect(TICKERS).toHaveLength(77);
		expect(DEMO_POINTS).toEqual({ "1D": 79, "1W": 36, "1M": 25, "3M": 64, YTD: 211, "1Y": 253 });
		// where each window opens, in sessions before today; the week is the close before its five sessions of hourly bars
		expect(WINDOW_SESSIONS).toEqual({ "1D": 1, "1W": 5, "1M": 24, "3M": 63, YTD: 210, "1Y": 252 });
		expect(1 + (WINDOW_SESSIONS["1W"] - 1) * SESSION_BARS + SESSION_BARS).toBe(DEMO_POINTS["1W"]);
		// RE-DERIVED (one daily timeline, 2026-11-09). Before: the YTD series had DEMO_POINTS.YTD = 211 closes on every day.
		// Now it holds the closes since January 1 (windowSessions): 218 on November 9; 211 stays where the path pins the
		// year-to-date move
		expect(windowSessions("YTD", NOW)).toBe(217);
		for (const range of ["1D", "1W", "1M", "3M", "1Y"] as const) expect(windowSessions(range, NOW)).toBe(WINDOW_SESSIONS[range]);
		for (const t of TICKERS) {
			for (const range of HISTORY_RANGES) {
				const h = demoPriceHistory(t, range, demoQuote(t), NOW)!;
				expect(h.source).toBe("demo");
				expect(h.closes).toHaveLength(range === "YTD" ? 218 : DEMO_POINTS[range]);
				for (const c of h.closes) expect(Number.isFinite(c) && c > 0).toBe(true);
			}
		}
	});

	it("gives the same closes for the same symbol and range: whatever the clock, and when it is worked out again", () => {
		const first = TICKERS.map((t) => HISTORY_RANGES.map((range) => closesOf(t, range)));
		const yearAt = HISTORY_RANGES.indexOf("1Y");
		// another clock (a January night, next week): only the times move, and how many closes the year to date holds
		// (RE-DERIVED, one daily timeline: the YTD series is the closes since January 1, so on another day it is another
		// tail of the same year: 11 closes on January 14)
		for (const now of [new Date(2026, 0, 14, 0, 30).getTime(), NOW + 8 * DAY + 7 * 3_600_000]) {
			TICKERS.forEach((t, i) =>
				HISTORY_RANGES.forEach((range, j) => {
					const h = demoPriceHistory(t.toLowerCase(), range, demoQuote(t), now)!;
					if (range === "YTD") {
						expect(h.closes).toHaveLength(windowSessions("YTD", now) + 1);
						expect(h.closes).toEqual(first[i]![yearAt]!.slice(-h.closes.length));
					} else expect(h.closes).toEqual(first[i]![j]);
					expect(h.times[0]).toBe(rangeStart(range, now));
					expect(h.times.at(-1)).toBe(now);
				}),
			);
		}
		expect(windowSessions("YTD", new Date(2026, 0, 14, 0, 30).getTime())).toBe(10);
		// worked out afresh (other companies push every remembered path out first): the same closes, new arrays
		for (let i = 0; i < 700; i++) demoPriceHistory(`ZZ${i}`, "1D", { price: 10 + i, changePercent: 1 }, NOW);
		TICKERS.forEach((t, i) =>
			HISTORY_RANGES.forEach((range, j) => {
				const again = closesOf(t, range, NOW + 1);
				expect(again).not.toBe(first[i]![j]);
				expect(again).toEqual(first[i]![j]);
			}),
		);
	});

	it("follows the symbol alone: another price is the same path at another scale", () => {
		for (const range of HISTORY_RANGES) {
			const a = demoPriceHistory("NVDA", range, { price: 122.1, changePercent: 2.4 }, NOW)!.closes;
			const b = demoPriceHistory("NVDA", range, { price: 244.2, changePercent: 2.4 }, NOW)!.closes;
			// to the cents both are rounded to (the pins and the closes)
			a.forEach((c, i) => expect(Math.abs(b[i]! / (2 * c) - 1)).toBeLessThan(2e-4));
		}
	});

	it("ends every range exactly at the quote and opens it where that range's move puts it (the rule of before N21)", () => {
		for (const t of TICKERS) {
			const q = demoQuote(t)!;
			for (const range of HISTORY_RANGES) {
				const h = demoPriceHistory(t, range, q, NOW)!;
				expect(h.last).toBe(q.price);
				expect(h.closes.at(-1)).toBe(q.price);
				const exact = q.price / (1 + demoRangeMove(t, range, q.changePercent) / 100);
				// RE-DERIVED (one daily timeline): the YTD series opens on the close the year began on, wherever the calendar puts
				// it on the path; its move stays pinned WINDOW_SESSIONS.YTD (210) sessions back, a waypoint of the year's line
				const pinned = range === "YTD" ? demoPriceHistory(t, "1Y", q, NOW)!.closes.at(-(WINDOW_SESSIONS.YTD + 1)) : h.first;
				expect(pinned).toBe(range === "1D" ? exact : Math.max(0.01, round2(exact)));
			}
		}
	});

	it("moves by the quote's day move on 1D, for every company", () => {
		const off: string[] = [];
		for (const t of TICKERS) {
			const q = demoQuote(t)!;
			const h = demoPriceHistory(t, "1D", q, NOW)!;
			expect(Math.abs(h.changePercent - q.changePercent)).toBeLessThan(1e-9);
			expect(h.change).toBe(q.change);
			if (signedPct(h.changePercent) !== signedPct(q.changePercent)) off.push(t);
			// 5-minute closes in cents between the exact previous close and the price
			for (const c of h.closes.slice(1, -1)) expect(round2(c)).toBe(c);
		}
		expect(off).toEqual([]);
	});
});

describe("every range is a window of that one path (N21 point 3)", () => {
	it("nests the daily ranges: the YTD line is the 1Y line's tail, 3M the YTD's, 1M the 3M's", () => {
		for (const t of TICKERS) {
			const year = closesOf(t, "1Y");
			const ytd = closesOf(t, "YTD");
			const quarter = closesOf(t, "3M");
			const month = closesOf(t, "1M");
			// the YTD window follows the calendar (218 closes on November 9: longer than the quarter's 64)
			expect(ytd).toEqual(year.slice(-ytd.length));
			expect(quarter).toEqual(ytd.slice(-DEMO_POINTS["3M"]));
			expect(month).toEqual(quarter.slice(-DEMO_POINTS["1M"]));
		}
	});

	it("stands every daily close at one moment whichever range reads it: one timeline from local midnight (review 2)", () => {
		const midnight = new Date(2026, 10, 9).getTime();
		const year = demoPriceHistory("NVDA", "1Y", demoQuote("NVDA"), NOW)!;
		// today's price at the clock, yesterday's close at today's local midnight (where the 1D range starts), and every
		// earlier close a session (365 days / 252) before the next
		expect(SESSION_MS).toBe((365 * DAY) / 252);
		expect(year.times.at(-1)).toBe(NOW);
		expect(year.times.at(-2)).toBe(midnight);
		expect(year.times.at(-2)).toBe(rangeStart("1D", NOW));
		for (let back = 1; back <= 251; back++) expect(year.times.at(-2 - back)).toBe(Math.round(midnight - back * SESSION_MS));
		// 1M, 3M and YTD are the tail of that timeline: the same moments, the same closes
		for (const range of ["1M", "3M", "YTD"] as const) {
			const h = demoPriceHistory("NVDA", range, demoQuote("NVDA"), NOW)!;
			expect(h.times).toEqual(year.times.slice(-h.times.length));
			expect(h.closes).toEqual(year.closes.slice(-h.closes.length));
			expect(h.times[0]).toBe(rangeStart(range, NOW));
		}
		// counted to the end of today's session the windows span 34.8 / 91.3 / 365 days (the API's are 35 / 91 / 365)
		expect(Math.abs((WINDOW_SESSIONS["1M"] * SESSION_MS) / DAY - 35)).toBeLessThan(1 / 3);
		expect(Math.abs((WINDOW_SESSIONS["3M"] * SESSION_MS) / DAY - 91)).toBeLessThan(1 / 3);
		expect((WINDOW_SESSIONS["1Y"] * SESSION_MS) / DAY).toBe(365);
		// the timeline stands still through a calendar day: the same moments at 00:05, 09:00 and 23:55 but the clock's own
		for (const [hh, mm] of [
			[0, 5],
			[9, 0],
			[23, 55],
		] as const) {
			const at = new Date(2026, 10, 9, hh, mm).getTime();
			const h = demoPriceHistory("NVDA", "1Y", demoQuote("NVDA"), at)!;
			expect(h.times.slice(0, -1)).toEqual(year.times.slice(0, -1));
			expect(h.times.at(-1)).toBe(at);
		}
		// the next day every close stands a day later (the clock's day, never its minute)
		const tomorrow = demoPriceHistory("NVDA", "1Y", demoQuote("NVDA"), NOW + DAY)!;
		expect(tomorrow.times.at(-2)).toBe(midnight + DAY);
		// in the day's first minute yesterday's close keeps its minute before the clock, as the 1D range does
		expect(demoPriceHistory("NVDA", "1M", demoQuote("NVDA"), midnight)!.times.slice(-2)).toEqual([midnight - 60_000, midnight]);
	});

	it("holds the closes since January 1 on YTD: its point count follows the calendar", () => {
		const q = demoQuote("NVDA")!;
		const at = (y: number, m: number, d: number, hh = 12) => new Date(y, m, d, hh, 0).getTime();
		const ytd = (now: number) => demoPriceHistory("NVDA", "YTD", q, now)!;
		// New Year's Day: yesterday's close and today's price, so the year to date is the day's move
		const first = ytd(at(2026, 0, 1, 9));
		expect(first.closes).toHaveLength(2);
		expect(first.times[0]).toBe(new Date(2026, 0, 1).getTime());
		expect(Math.abs(first.changePercent - q.changePercent)).toBeLessThan(1e-9);
		// it opens on the last close at or before January 1 (the close the year began on) and grows with the year
		let before = 1;
		for (const now of [at(2026, 0, 2), at(2026, 0, 14), at(2026, 2, 31), at(2026, 5, 30), at(2026, 9, 31), NOW, at(2026, 11, 30)]) {
			const h = ytd(now);
			const year = demoPriceHistory("NVDA", "1Y", q, now)!;
			const newYear = new Date(new Date(now).getFullYear(), 0, 1).getTime();
			expect(h.closes).toHaveLength(windowSessions("YTD", now) + 1);
			expect(h.closes.length).toBeGreaterThan(before);
			before = h.closes.length;
			expect(h.closes).toEqual(year.closes.slice(-h.closes.length));
			expect(h.times).toEqual(year.times.slice(-h.times.length));
			expect(h.times[0]).toBeLessThanOrEqual(newYear);
			expect(h.times[1]).toBeGreaterThan(newYear);
		}
		// the year is 210 sessions old at the end of October: the series then opens on the path's own YTD pin
		expect(windowSessions("YTD", at(2026, 9, 30))).toBe(WINDOW_SESSIONS.YTD);
		expect(ytd(at(2026, 9, 30)).first).toBe(Math.max(0.01, round2(q.price / (1 + demoRangeMove("NVDA", "YTD", q.changePercent) / 100))));
		// never more than the year's closes
		expect(ytd(at(2026, 11, 31, 23)).closes).toHaveLength(DEMO_POINTS["1Y"]);
		expect(windowSessions("YTD", at(2027, 0, 1))).toBe(1);
	});

	it("runs the week through the month's daily closes, and ends it with the day", () => {
		const back = WINDOW_SESSIONS["1W"];
		for (const t of TICKERS) {
			const q = demoQuote(t)!;
			const month = closesOf(t, "1M");
			const week = closesOf(t, "1W");
			const day = closesOf(t, "1D");
			// the week opens at the close five sessions back, and each session's last hourly bar is that session's daily close
			const dailyCloses = month.slice(-(back + 1), -1);
			expect(week[0]).toBe(dailyCloses[0]);
			for (let s = 1; s < back; s++) expect(week[s * SESSION_BARS]).toBe(dailyCloses[s]);
			// yesterday's close: the same exact figure on the week, the month and the day
			const yesterday = week[(back - 1) * SESSION_BARS]!;
			expect(yesterday).toBe(day[0]);
			expect(yesterday).toBe(month.at(-2));
			expect(Math.abs(yesterday - q.price / (1 + q.changePercent / 100))).toBeLessThan(1e-9);
			// today on the week's line: seven of the day's own bars, ending at the price
			const todayBars = week.slice(-SESSION_BARS);
			todayBars.forEach((c, j) => expect(c).toBe(day[Math.round(((day.length - 1) * (j + 1)) / SESSION_BARS)]));
			expect(todayBars.at(-1)).toBe(q.price);
		}
	});

	it("agrees on every move two ranges both show, to 0.01%", () => {
		const pct = (from: number, to: number) => (to / from - 1) * 100;
		let worst = 0;
		for (const t of TICKERS) {
			const q = demoQuote(t)!;
			const [day, week, month, quarter, ytd, year] = HISTORY_RANGES.map((range) => demoPriceHistory(t, range, q, NOW)!);
			const gaps = [
				// the 1W line ends with the day's move
				pct(week!.closes[(WINDOW_SESSIONS["1W"] - 1) * SESSION_BARS]!, week!.last) - day!.changePercent,
				// the 1M line ends with the week's move, and with the day's
				pct(month!.closes.at(-(WINDOW_SESSIONS["1W"] + 1))!, month!.last) - week!.changePercent,
				pct(month!.closes.at(-2)!, month!.last) - day!.changePercent,
				// each longer line ends with the shorter one's move
				pct(quarter!.closes.at(-DEMO_POINTS["1M"])!, quarter!.last) - month!.changePercent,
				pct(ytd!.closes.at(-DEMO_POINTS["3M"])!, ytd!.last) - quarter!.changePercent,
				pct(year!.closes.at(-ytd!.closes.length)!, year!.last) - ytd!.changePercent,
				pct(year!.closes.at(-2)!, year!.last) - q.changePercent,
			];
			for (const g of gaps) worst = Math.max(worst, Math.abs(g));
		}
		expect(worst).toBeLessThan(0.01);
		// they are the same closes, so the agreement is exact (to the arithmetic)
		expect(worst).toBeLessThan(1e-9);
	});

	it("keeps the story companies rising on the 3M and the YTD windows too (N9b)", () => {
		for (const t of Object.keys(STORY_TREND)) {
			for (const range of ["3M", "YTD", "1Y"] as const) {
				const h = demoPriceHistory(t, range, demoQuote(t), NOW)!;
				expect(h.last).toBeGreaterThan(h.first);
			}
		}
	});

	it("keeps them rising on 3M and 1Y on EVERY day of a year; on YTD once the year is old enough (N9b over the calendar; rulings N34b / N35c)", () => {
		// RULED, NO CHANGE (review 3, low 3): the YTD series is the closes since January 1, so in the first weeks of a year it
		// is a few sessions long and moves like the week and the month, whose direction N9b never set. PINNED HERE, as built:
		// 3M and 1Y rise for MU, GS, KO and O on every day of the next 366; a YTD line that does not rise is a YOUNG one.
		// MEASURED (2026-11-09 to 2027-11-09): MU rises on every day; GS does not on 8 days (January 4 to 8, February 26,
		// March 3 and 4, 2027: 4 to 44 closes), KO on 13 (January 2 to 16: 2 to 12 closes), O on 17 (January 2 to March 2: 2
		// to 43 closes). THE BRIEF ASKED FOR "from 30 closes on": that does NOT hold as built (GS at 40 and 44 closes, O at
		// 31 to 43), so the bound pinned is the true one: from 45 closes on (the first days of March)
		const OLD_ENOUGH = 45;
		const seed = seedGuest();
		const youngest: Record<string, number> = {};
		const failed: string[] = [];
		for (let d = 0; d < 366; d++) {
			const now = new Date(2026, 10, 9 + d, 9, 0).getTime();
			for (const t of Object.keys(STORY_TREND)) {
				// as the pages draw it for the persona (O is one of its saves), and for a visitor who recorded nothing
				for (const anchors of [priceAnchorsOf(t, seed), null]) {
					for (const range of ["3M", "1Y"] as const) {
						const h = demoPriceHistory(t, range, demoQuote(t), now, anchors)!;
						if (!(h.last > h.first)) failed.push(`${t} ${range} on ${dayOf(now)}`);
					}
					const ytd = demoPriceHistory(t, "YTD", demoQuote(t), now, anchors)!;
					const closes = ytd.closes.length - 1;
					expect(closes).toBe(windowSessions("YTD", now));
					if (ytd.last > ytd.first) continue;
					if (closes >= OLD_ENOUGH) failed.push(`${t} YTD on ${dayOf(now)}: ${closes} closes, ${ytd.first} -> ${ytd.last}`);
					youngest[t] = Math.max(youngest[t] ?? 0, closes);
				}
			}
		}
		expect(failed).toEqual([]);
		// the most closes a YTD line that does not rise holds, per company (the path's own: whatever the time zone)
		expect(youngest).toEqual({ GS: 44, KO: 12, O: 43 });
	});

	it("stands yesterday's close at today's local midnight on every day of a year: the windows as stamped (rulings N34b / N35c)", () => {
		// RULED, NO CHANGE (review 3, low 2): yesterday's close stands where the 1D range starts, and each earlier close a
		// session before the next. So the daily windows, from their first close to the clock, are a day or less short of the
		// API's 35 / 91 / 365 days: 33.3 to 34.4, 89.8 to 90.9 and 363.5 to 364.6 days (the 25-hour day of the autumn clock
		// change included), and a record is on the daily ranges from the midnight after it
		const q = demoQuote("NVDA")!;
		const spans: Record<string, [number, number]> = {};
		for (let d = 0; d < 366; d++) {
			for (const [hh, mm] of [
				[0, 5],
				[9, 0],
				[23, 55],
			] as const) {
				const now = new Date(2026, 10, 9 + d, hh, mm).getTime();
				const midnight = midnightOf(now);
				for (const range of ["1M", "3M", "1Y"] as const) {
					const h = demoPriceHistory("NVDA", range, q, now)!;
					expect(h.times.at(-1)).toBe(now);
					expect(h.times.at(-2)).toBe(midnight);
					expect(h.times[0]).toBe(Math.round(midnight - (WINDOW_SESSIONS[range] - 1) * SESSION_MS));
					const span = (now - h.times[0]!) / DAY;
					const s = (spans[range] ??= [span, span]);
					s[0] = Math.min(s[0], span);
					s[1] = Math.max(s[1], span);
				}
			}
		}
		const within = (range: string, lo: number, hi: number) => {
			expect(spans[range]![0]).toBeGreaterThanOrEqual(lo);
			expect(spans[range]![1]).toBeLessThanOrEqual(hi);
			// and the whole band is used: a day of clock, no more
			expect(spans[range]![1] - spans[range]![0]).toBeGreaterThan(0.99);
			expect(spans[range]![1] - spans[range]![0]).toBeLessThan(1.05);
		};
		within("1M", 33.3, 34.4);
		within("3M", 89.8, 90.9);
		within("1Y", 363.5, 364.6);
		// a record made in yesterday's last minutes is a daily close of every range from today's first minutes on
		const now = new Date(2026, 10, 10, 0, 5).getTime();
		const made = now - 10 * 60_000;
		for (const range of ["1M", "3M", "YTD", "1Y"] as const) expect(closeAt(demoPriceHistory("NVDA", range, q, now, [{ t: made, price: 119.19 }])!, made)).toBe(119.19);
	});
});

describe("two companies never share a line, and no line is a ramp (N21 point 6)", () => {
	it("draws distinct lines on every range: 95% of the pairs a mean of 0.08 apart, none the same or mirrored within 0.03", () => {
		// measured (2026-11-09): apart 100% / 99.97% / 99.90% / 100% / 100% / 99.90% of the 2,926 pairs (1D ... 1Y); the
		// closest pair of any range 0.074 apart, the closest to a mirror image 0.069
		for (const range of HISTORY_RANGES) {
			const p = pairs(TICKERS.map((t) => unitBox(closesOf(t, range))));
			expect(p.count).toBe(2926);
			expect(p.apartShare).toBeGreaterThanOrEqual(0.95);
			expect(p.same).toBe(0);
			expect(p.mirrored).toBe(0);
			expect(p.closest).toBeGreaterThan(0.03);
			expect(p.closestMirror).toBeGreaterThan(0.03);
		}
	});

	it("leaves the straight segment between its ends on every line of every company (roughness)", () => {
		// measured: the straightest line of all (1D) still leaves its ramp by 0.235 of the box
		for (const range of HISTORY_RANGES) for (const t of TICKERS) expect(offTheRamp(unitBox(closesOf(t, range)))).toBeGreaterThan(0.03);
	});

	it("measures the defect it replaces: the phones' shape scaled per company was one shape or its mirror image", () => {
		// the demo series of before N21 (shapedSeries from the range's opening close to the price), on the same measure
		for (const range of HISTORY_RANGES) {
			const old = TICKERS.map((t) => {
				const q = demoQuote(t)!;
				return unitBox(shapedSeries(t, range, q.price / (1 + demoRangeMove(t, range, q.changePercent) / 100), q.price));
			});
			const p = pairs(old);
			// measured: 82% of the pairs apart on 1D (N9a's nudge), 37-53% on the other ranges
			expect(p.apartShare).toBeLessThan(0.95);
			if (range === "1D") continue;
			// measured: 210 to 306 pairs the same line within 0.03, 123 to 270 its mirror image
			expect(p.same).toBeGreaterThan(200);
			expect(p.mirrored).toBeGreaterThan(100);
		}
	});
});

describe("the path's volatility follows the company's beta (N21 point 1)", () => {
	it("is about 1.1% a day at beta 1, kept inside a band", () => {
		expect(DAILY_VOL).toBe(0.011);
		expect(demoDailyVol("V")).toBeCloseTo(0.011, 12); // beta 1.00
		expect(demoDailyVol("NVDA")).toBeCloseTo(0.011 * 1.7, 12);
		expect(demoDailyVol("NEE")).toBeCloseTo(0.011 * 0.8, 12);
		expect(demoDailyVol("PG")).toBeCloseTo(0.011 * 0.45, 12); // beta 0.40: the band's floor
		expect(demoDailyVol("GME")).toBeCloseTo(0.011 * 2.6, 12); // beta 3.50: the band's ceiling
		expect(demoDailyVol("ZZZZ")).toBe(0.011); // a company the catalog does not know moves like the market
	});

	it("shows in the closes: a utility wiggles less than a chip maker, every company about as much as its beta says", () => {
		const realised = (t: string) => {
			const c = closesOf(t, "1Y").slice(0, -1);
			const r = c.slice(1).map((v, i) => Math.log(v / c[i]!));
			const mean = r.reduce((a, b) => a + b, 0) / r.length;
			return Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length);
		};
		expect(realised("NEE")).toBeLessThan(realised("NVDA"));
		expect(realised("KO")).toBeLessThan(realised("AMD"));
		expect(realised("PG")).toBeLessThan(realised("TSLA") / 3);
		for (const t of TICKERS) {
			const ratio = realised(t) / demoDailyVol(t);
			// measured 0.87 (NEE) to 1.08 (FSLR): the pins bend a walk a little, the cents of a low price add a little
			expect(ratio).toBeGreaterThan(0.75);
			expect(ratio).toBeLessThan(1.25);
		}
	});
});

// ── What the ledger recorded (coordinator ruling N23a, 2026-11-09; the hunt's NUM-02) ────────────────────────────────

type Recorded = { ticker: string; what: string; t: number; price: number };
type Ledgered = Pick<GuestState, "positions" | "saves" | "sold">;
/** Every price a guest state recorded: each pick's buys, each save, each sale and its buy. */
function recordsOf(state: Ledgered): Recorded[] {
	const out: Recorded[] = [];
	for (const p of state.positions) {
		const lots = p.lots ?? [];
		if (lots.length > 0) lots.forEach((l, i) => out.push({ ticker: p.ticker, what: `pick (buy ${i + 1})`, t: l.at, price: l.price }));
		else if (p.priceAtAdd !== null) out.push({ ticker: p.ticker, what: "pick", t: p.addedAt, price: p.priceAtAdd });
	}
	for (const s of state.saves) if (s.priceAtSave !== null) out.push({ ticker: s.ticker, what: "save", t: s.savedAt, price: s.priceAtSave });
	for (const s of state.sold) {
		out.push({ ticker: s.ticker, what: "sale", t: s.soldAt, price: s.price ?? s.proceeds / s.shares });
		if (s.addedAt !== undefined) out.push({ ticker: s.ticker, what: "buy before the sale", t: s.addedAt, price: s.stake / s.shares });
	}
	return out;
}
/** A company's series as the pages draw it for `state`: through the prices that state recorded. */
const drawnFor = (state: Ledgered, t: string, range: HistoryRange, now: number) => demoPriceHistory(t, range, demoQuote(t), now, priceAnchorsOf(t, state))!;
const dayOf = (ms: number) => new Date(ms).toDateString();
const midnightOf = (ms: number) => {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};
/** The point of a series a moment falls on: the one at or before it (closeAt's rule). */
const pointAt = (h: Pick<PriceHistory, "times">, t: number) => {
	let i = h.times.length - 1;
	while (i > 0 && h.times[i]! > t) i--;
	return i;
};
/**
 * Where a record stands on a series (the rule of history.ts pinPlan): the close at or before its moment; on the week's
 * and the day's own bars the NEXT bar when that one is a daily close (every seventh bar of the week, the day's first),
 * which only the daily timeline pins, and yesterday's never.
 */
function standsOn(h: Pick<PriceHistory, "range" | "times" | "closes">, t: number): number {
	const i = pointAt(h, t);
	const dailyClose = (h.range === "1W" && i % SESSION_BARS === 0 && i <= (WINDOW_SESSIONS["1W"] - 1) * SESSION_BARS) || (h.range === "1D" && i === 0);
	return h.closes[dailyClose ? i + 1 : i]!;
}
/** Whether a range's series holds a record made at `t`: its window contains it, and for a daily range it was made before today. */
const holds = (range: HistoryRange, t: number, now: number) => t >= rangeStart(range, now) && t <= now && (range === "1D" || range === "1W" || t < midnightOf(now));

/** The clocks the acceptance runs on: the seed's dates (April 28 to July 8, 2026) fall in different windows on each. */
const CLOCKS = [
	NOW, // the day of the ruling: the YTD and the 1Y windows
	new Date(2026, 6, 20, 12, 0).getTime(), // 3M holds them all, 1M the later ones
	new Date(2026, 6, 10, 15, 0).getTime(), // two days after the newest pick: the week's bars too
	new Date(2026, 8, 15, 8, 5).getTime(), // September: 3M holds the later ones
	new Date(2027, 1, 10, 9, 41).getTime(), // next year: the 1Y window alone
];

describe("the path passes through what the ledger recorded (N23a)", () => {
	it("gathers a state's recorded prices: the picks' buys, the saves, the sales and their buys", () => {
		const seed = seedGuest();
		const tsla = seed.positions.find((p) => p.ticker === "TSLA")!;
		const save = seed.saves.find((s) => s.ticker === "TSLA")!;
		expect(priceAnchorsOf("tsla", seed)).toEqual([
			{ t: save.savedAt, price: save.priceAtSave },
			{ t: tsla.addedAt, price: tsla.priceAtAdd },
		]);
		const shop = seed.sold.find((s) => s.ticker === "SHOP")!;
		expect(priceAnchorsOf("SHOP", seed)).toEqual([
			{ t: shop.addedAt, price: shop.stake / shop.shares },
			{ t: shop.soldAt, price: shop.price ?? shop.proceeds / shop.shares },
		]);
		// a company the state never touched has none, and neither has no state
		expect(priceAnchorsOf("KO", seed)).toEqual([]);
		expect(priceAnchorsOf("NVDA", null)).toEqual([]);
		// every buy of a topped-up pick is its own record; a sale's fill price and a closing sale's buys are read when recorded
		const lots = [
			{ shares: 1, price: 98.5, at: 1000 },
			{ shares: 0.2, price: 122.1, at: 2000 },
		];
		expect(priceAnchorsOf("NVDA", { positions: [{ ticker: "NVDA", shares: 1.2, priceAtAdd: 102.43, addedAt: 1000, lots }] })).toEqual([
			{ t: 1000, price: 98.5 },
			{ t: 2000, price: 122.1 },
		]);
		const closing = { ticker: "NVDA", shares: 1.2, proceeds: 146.52, stake: 122.92, soldAt: 3000, addedAt: 1000, price: 122.1, lots };
		const part = { ticker: "NVDA", shares: 0.3, proceeds: 36.63, stake: 30.73, soldAt: 2500, addedAt: 1000 };
		// the least say first: the part sale's average cost for the first buy's day, then the recorded buys, then the sales
		expect(priceAnchorsOf("NVDA", { sold: [closing, part] })).toEqual([
			{ t: 1000, price: 30.73 / 0.3 },
			{ t: 1000, price: 98.5 },
			{ t: 2000, price: 122.1 },
			{ t: 3000, price: 122.1 },
			{ t: 2500, price: 36.63 / 0.3 },
		]);
	});

	it("holds every seeded pick, save and sale at its recorded price, to the cent, on every range that contains its date", () => {
		const seed = seedGuest();
		const records = recordsOf(seed);
		// six picks, nineteen saves, two sales and their two buys
		expect(records).toHaveLength(6 + 19 + 2 + 2);
		const checked: Record<string, number> = {};
		for (const now of CLOCKS) {
			for (const r of records) {
				for (const range of HISTORY_RANGES) {
					// a range holds the record when its window contains the date (a record made today is today's: below)
					if (!holds(range, r.t, now)) continue;
					const h = drawnFor(seed, r.ticker, range, now);
					// every daily range reads it at its date (closeAt); so does the week, but for a record whose bar there is a
					// daily close: it stands on the next bar (MSFT's pick of July 8 on the clock of July 10, 63 hours old)
					if (range !== "1W") expect(closeAt(h, r.t), `${r.ticker} ${r.what} of ${dayOf(r.t)} on ${range}, clock ${dayOf(now)}`).toBe(round2(r.price));
					expect(standsOn(h, r.t), `${r.ticker} ${r.what} of ${dayOf(r.t)} on ${range}, clock ${dayOf(now)}`).toBe(round2(r.price));
					checked[range] = (checked[range] ?? 0) + 1;
				}
			}
		}
		// every range but the day's was put to the test (no seeded date is today on any of these clocks)
		expect(Object.keys(checked).sort()).toEqual(["1M", "1W", "1Y", "3M", "YTD"]);
		expect(checked["1Y"]).toBe(records.length * CLOCKS.length);
	});

	it("reads every seeded record back on every day of a year, on every range that holds it; each stands on ONE close, and the closes stand still through the day (review 2)", () => {
		// THE CALENDAR SWEEP (coordinator ruling on review 2). The five clocks above miss the days the old grids failed on:
		// each daily range spread its closes over its own window, so on 23 record-days of the next 14 months two records of
		// one company met on one close and one stopped reading back (AMD's save of June 9, $151.40, read $148.02 on the
		// year's line on November 12 to 16; TSLA's on December 13 to 15; JPM's, SHOP's, COIN's and MSFT's on the YTD line in
		// December), and a record was pinned on two neighbouring closes (O: three equal closes in a row)
		const seed = seedGuest();
		const records = recordsOf(seed);
		// the same ledger with every recorded price a few percent higher, each kind of record by its own share (so no
		// stretch of the path is the other ledger's at another scale): a close that carries a record's price in BOTH
		// ledgers is that record's pin, never a close the walk happened to put on the same cent (it does, a dozen times
		// a year: the walk passes its pins' prices again a few closes away)
		const LIFT = { pick: 1.0713, save: 1.0391, sale: 1.0577, "buy before the sale": 1.0829 } as const;
		const liftOf = (r: Recorded) => LIFT[r.what as keyof typeof LIFT];
		const lifted: Ledgered = {
			positions: seed.positions.map((p) => ({ ...p, priceAtAdd: p.priceAtAdd! * LIFT.pick })),
			saves: seed.saves.map((s) => ({ ...s, priceAtSave: s.priceAtSave! * LIFT.save })),
			sold: seed.sold.map((s) => ({ ...s, stake: s.stake * LIFT["buy before the sale"], proceeds: s.proceeds * LIFT.sale })),
		};
		expect(records.every((r) => liftOf(r) > 1)).toBe(true);
		const byTicker = new Map<string, Recorded[]>();
		for (const r of records) byTicker.set(r.ticker, [...(byTicker.get(r.ticker) ?? []), r]);
		const hours = [
			[0, 5],
			[14, 30],
			[23, 55],
		] as const;
		let read = 0;
		const failed: string[] = [];
		const first = new Date(2026, 10, 9, 12).getTime();
		for (let d = 0; d < 366; d++) {
			const day = new Date(first + d * DAY);
			const at = (hh: number, mm: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm).getTime();
			const [hh, mm] = hours[d % hours.length]!;
			const now = at(hh, mm);
			for (const [ticker, recs] of byTicker) {
				// the closes of a company are identical at 09:00 and 21:00 of one day
				const morning = drawnFor(seed, ticker, "1Y", at(9, 0));
				const evening = drawnFor(seed, ticker, "1Y", at(21, 0));
				if (morning.closes.some((c, i) => c !== evening.closes[i])) failed.push(`${ticker} ${dayOf(now)}: the year's closes differ between 09:00 and 21:00`);
				const higher = drawnFor(lifted, ticker, "1Y", at(9, 0));
				for (const r of recs) {
					if (!holds("1Y", r.t, at(9, 0))) continue;
					// it reads back to the cent in the morning and in the evening
					read += 2;
					for (const h of [morning, evening]) if (closeAt(h, r.t) !== round2(r.price)) failed.push(`${ticker} ${r.what} of ${dayOf(r.t)} on 1Y, clock ${dayOf(now)}: reads ${closeAt(h, r.t)}, recorded ${round2(r.price)}`);
					// and it stands on ONE close of the year: the one at or before its date
					const pins = morning.closes.flatMap((c, i) => (c === round2(r.price) && higher.closes[i] === round2(r.price * liftOf(r)) ? [i] : []));
					if (pins.length !== 1 || pins[0] !== pointAt(morning, r.t)) failed.push(`${ticker} ${r.what} ${dayOf(now)}: pinned on closes ${pins.join(", ")} of the year, its date is close ${pointAt(morning, r.t)}`);
				}
				// the shorter daily ranges that hold a record read it back too (at a third hour of the day, in turn); they are
				// tails of the year's line, on the same moments
				for (const range of ["1M", "3M", "YTD"] as const) {
					if (!recs.some((r) => holds(range, r.t, now))) continue;
					const h = drawnFor(seed, ticker, range, now);
					if (h.closes.some((c, i) => c !== morning.closes[morning.closes.length - h.closes.length + i])) failed.push(`${ticker} ${dayOf(now)}: the ${range} line is not the year's tail`);
					for (const r of recs) {
						if (!holds(range, r.t, now)) continue;
						read++;
						if (closeAt(h, r.t) !== round2(r.price)) failed.push(`${ticker} ${r.what} of ${dayOf(r.t)} on ${range}, clock ${dayOf(now)} ${hh}:${mm}: reads ${closeAt(h, r.t)}, recorded ${round2(r.price)}`);
					}
				}
			}
		}
		expect(failed).toEqual([]);
		// 29 records, 366 days: each on the year's line until it is a year old (morning and evening), and on the YTD line
		// through December: 13,825 readings
		expect(read).toBeGreaterThan(13_000);
	}, 180_000);

	it("names the hunt's six records: none lies outside the year its company's chart draws, so no 52-week range excludes a recorded price", () => {
		const seed = seedGuest();
		// NUM-02 (verified): TSLA "Picked May 20 at $210.59" under a year that never went below $248.50, the TSLA save of
		// Jun 15, MSFT "saved at $431.10" under the 52-week low its article card printed, PLTR's save under its low, ENPH's
		// and MRK's saves over their highs. Read from the seed (it is being made exact: the cents may move)
		const named = recordsOf(seed).filter((r) => (r.ticker === "TSLA" && (r.what === "pick" || r.what === "save")) || (["MSFT", "PLTR", "ENPH", "MRK"].includes(r.ticker) && r.what === "save"));
		expect(named.map((r) => `${r.ticker} ${r.what}`).sort()).toEqual(["ENPH save", "MRK save", "MSFT save", "PLTR save", "TSLA pick", "TSLA save"]);
		for (const r of named) {
			// without the ledger's anchors (N21's path alone) the year's line is somewhere else on that day: off the recorded
			// price by more than a percent for each of the six, and TSLA's pick price lies under the whole year
			const before = demoPriceHistory(r.ticker, "1Y", demoQuote(r.ticker), NOW)!;
			expect(Math.abs(closeAt(before, r.t) / r.price - 1), `${r.ticker} ${r.what} against the path without anchors`).toBeGreaterThan(0.01);
			if (r.ticker === "TSLA" && r.what === "pick") expect(before.low).toBeGreaterThan(r.price);
			expect(closeAt(drawnFor(seed, r.ticker, "1Y", NOW), r.t)).toBe(round2(r.price));
		}
		// now: every record of every company, inside the low and the high of the year's line (the article rail's 52-week
		// range) and of the YTD's, whenever the window holds its date
		for (const now of CLOCKS) {
			for (const r of recordsOf(seed)) {
				for (const range of ["YTD", "1Y"] as const) {
					if (r.t < rangeStart(range, now) || r.t > now) continue;
					const h = drawnFor(seed, r.ticker, range, now);
					expect(h.low, `${r.ticker} ${r.what} on ${range}, clock ${dayOf(now)}`).toBeLessThanOrEqual(round2(r.price));
					expect(h.high, `${r.ticker} ${r.what} on ${range}, clock ${dayOf(now)}`).toBeGreaterThanOrEqual(round2(r.price));
				}
			}
		}
	});

	it("lets the pick page's gain since the pick be read off the pick's chart: the close on the pick's day to the last one", () => {
		const seed = seedGuest();
		const seen: string[] = [];
		for (const p of seed.positions) {
			const q = demoQuote(p.ticker)!;
			// what the pick page prints: the position's gain on its cost
			const printed = (q.price / p.priceAtAdd! - 1) * 100;
			for (const now of CLOCKS) {
				for (const range of HISTORY_RANGES) {
					if (!holds(range, p.addedAt, now)) continue;
					const h = drawnFor(seed, p.ticker, range, now);
					const drawn = (h.last / standsOn(h, p.addedAt) - 1) * 100;
					// the line holds the pick-day price in cents, the cost a share is exact (N30.7): a hundredth of a point apart at most
					expect(Math.abs(drawn - printed)).toBeLessThan(0.01);
					expect(signedPct(drawn)).toBe(signedPct(printed));
				}
			}
			seen.push(`${p.ticker} ${signedPct(printed)}`);
		}
		// the frames' own gains (Portfolio 2:743): TSLA's "up 18.0%" is the one the hunt read beside a falling line
		expect(seen).toEqual(["NVDA +24.0%", "TSLA +18.0%", "AMD +11.0%", "AAPL +6.0%", "JPM +2.0%", "MSFT -3.0%"]);
	});

	it("is N21's path without anchors, and a company's anchors move no other company's line", () => {
		const seed = seedGuest();
		for (const range of HISTORY_RANGES) {
			// KO is not in the persona's ledger
			expect(drawnFor(seed, "KO", range, NOW)).toBe(demoPriceHistory("KO", range, demoQuote("KO"), NOW));
			expect(demoPriceHistory("NVDA", range, demoQuote("NVDA"), NOW, [])).toBe(demoPriceHistory("NVDA", range, demoQuote("NVDA"), NOW));
			expect(demoPriceHistory("NVDA", range, demoQuote("NVDA"), NOW, null)).toBe(demoPriceHistory("NVDA", range, demoQuote("NVDA"), NOW));
			// the plain rule takes them too
			expect(priceHistoryFor("TSLA", range, demoQuote("TSLA"), null, NOW, priceAnchorsOf("TSLA", seed))).toBe(drawnFor(seed, "TSLA", range, NOW));
		}
		// a record outside every window (older than the year), or a broken one, changes nothing
		const plain = closesOf("NVDA", "1Y");
		const old: PriceAnchor[] = [
			{ t: NOW - 400 * DAY, price: 50 },
			{ t: Number.NaN, price: 60 },
			{ t: NOW - 30 * DAY, price: 0 },
		];
		expect(demoPriceHistory("NVDA", "1Y", demoQuote("NVDA"), NOW, old)!.closes).toEqual(plain);
	});

	it("keeps N21's rules with anchors: the quote end, the day's move, the windows of one path", () => {
		const seed = seedGuest();
		const held = [...new Set(recordsOf(seed).map((r) => r.ticker))];
		expect(held).toHaveLength(23);
		const back = WINDOW_SESSIONS["1W"];
		for (const now of CLOCKS) {
			for (const t of held) {
				const q = demoQuote(t)!;
				const all = HISTORY_RANGES.map((range) => drawnFor(seed, t, range, now));
				const [d1, week, month, quarter, ytd, year] = all as [(typeof all)[number], (typeof all)[number], (typeof all)[number], (typeof all)[number], (typeof all)[number], (typeof all)[number]];
				for (const h of all) {
					expect(h.closes).toHaveLength(h.range === "YTD" ? windowSessions("YTD", now) + 1 : DEMO_POINTS[h.range]);
					expect(h.last).toBe(q.price);
					for (const c of h.closes) expect(Number.isFinite(c) && c > 0).toBe(true);
				}
				// the day's move is the quote's, to the last digit, and yesterday's close is one figure everywhere
				expect(Math.abs(d1.changePercent - q.changePercent)).toBeLessThan(1e-9);
				expect(d1.change).toBe(q.change);
				expect(week.closes[(back - 1) * SESSION_BARS]).toBe(d1.first);
				expect(month.closes.at(-2)).toBe(d1.first);
				// one path: the YTD, the 3M and the 1M lines are the 1Y line's tail (the YTD as long as the calendar makes it:
				// 30 closes on February 10); the week runs through the daily closes
				expect(ytd.closes).toEqual(year.closes.slice(-ytd.closes.length));
				expect(quarter.closes).toEqual(year.closes.slice(-DEMO_POINTS["3M"]));
				expect(month.closes).toEqual(quarter.closes.slice(-DEMO_POINTS["1M"]));
				const dailyCloses = month.closes.slice(-(back + 1), -1);
				expect(week.first).toBe(dailyCloses[0]);
				for (let s = 1; s < back; s++) expect(week.closes[s * SESSION_BARS]).toBe(dailyCloses[s]);
				week.closes.slice(-SESSION_BARS).forEach((c, j) => expect(c).toBe(d1.closes[Math.round(((d1.closes.length - 1) * (j + 1)) / SESSION_BARS)]));
				// the same closes whenever they are asked for again on that clock
				expect(drawnFor(seed, t, "1Y", now)).toBe(year);
			}
		}
	});

	it("holds a buy made now on every range, and still holds it hours and days later", () => {
		const seed = seedGuest();
		const bought = NOW;
		for (const t of ["NVDA", "HOOD"]) {
			const price = demoQuote(t)!.price;
			// the store's buy: a new lot of the pick (NVDA is a top-up), saved at the fill price when it was not saved yet
			const state: Ledgered = {
				sold: seed.sold,
				positions: seed.positions.some((p) => p.ticker === t)
					? seed.positions.map((p) => (p.ticker === t ? { ...p, lots: [{ shares: p.shares, price: p.priceAtAdd!, at: p.addedAt }, { shares: 0.2, price, at: bought }] } : p))
					: [...seed.positions, { ticker: t, shares: 2, priceAtAdd: price, addedAt: bought }],
				saves: seed.saves.some((s) => s.ticker === t) ? seed.saves : [...seed.saves, { ticker: t, savedAt: bought, priceAtSave: price }],
			};
			// at the moment of the buy the path is the quote already: nothing on screen moves
			for (const range of HISTORY_RANGES) {
				const h = drawnFor(state, t, range, NOW);
				expect(closeAt(h, bought)).toBe(price);
				expect(h.closes).toEqual(drawnFor(seed, t, range, NOW).closes);
				// a page whose clock is the minute before the buy (useHistoryNow) counts it as made at its clock
				expect(drawnFor(state, t, range, NOW - 40_000).closes).toEqual(drawnFor(seed, t, range, NOW - 40_000).closes);
			}
			// later the same day: the day's and the week's bars hold the fill price at the buy's moment (a daily close is
			// yesterday's until today's exists, and yesterday's close never moves: the day's move stands)
			for (const later of [25 * 60_000, 2 * 3_600_000, 6 * 3_600_000]) {
				for (const range of ["1D", "1W"] as const) {
					const h = drawnFor(state, t, range, NOW + later);
					expect(closeAt(h, bought), `${t} on ${range}, ${later / 60_000} min later`).toBe(price);
					expect(h.last).toBe(price);
				}
				const d1 = drawnFor(state, t, "1D", NOW + later);
				expect(Math.abs(d1.changePercent - demoQuote(t)!.changePercent)).toBeLessThan(1e-9);
			}
			// from the next local midnight on every daily range holds it (review 2, low 4: it used to take about 36 hours),
			// and days later every range does
			for (const later of [9.6 * 3_600_000, 15 * 3_600_000, 3 * DAY, 6.5 * DAY, 20 * DAY, 80 * DAY]) {
				for (const range of HISTORY_RANGES) {
					const now = NOW + later;
					if (!holds(range, bought, now)) continue;
					const h = drawnFor(state, t, range, now);
					if (range !== "1D" && range !== "1W") expect(closeAt(h, bought), `${t} on ${range}, ${later / DAY} days later`).toBe(price);
					expect(standsOn(h, bought), `${t} on ${range}, ${later / DAY} days later`).toBe(price);
				}
			}
		}
	});

	it("puts a record of the week on the week's own bar, on the next one when its bar is a daily close: yesterday's close never moves (review 2, low 4)", () => {
		const q = demoQuote("KO")!;
		const yesterday = q.price / (1 + q.changePercent / 100);
		const yesterdayBar = (WINDOW_SESSIONS["1W"] - 1) * SESSION_BARS;
		const bare = demoPriceHistory("KO", "1W", q, NOW)!;
		const seen = new Set<string>();
		// a record of every age the week holds, half an hour apart, at a price the path never sits on
		for (let age = 0.25; age < 168; age += 0.5) {
			const t = NOW - age * 3_600_000;
			const week = demoPriceHistory("KO", "1W", q, NOW, [{ t, price: 61.11 }])!;
			const i = pointAt(week, t);
			// yesterday's close is the day's move, whatever was recorded around it, and the week still opens on a daily close
			expect(week.closes[yesterdayBar]).toBe(bare.closes[yesterdayBar]);
			expect(Math.abs(week.closes[yesterdayBar]! - yesterday)).toBeLessThan(1e-9);
			expect(week.last).toBe(q.price);
			const onDailyClose = i % SESSION_BARS === 0;
			// the record's own bar; the next one when its bar is a daily close of the week's line (a record 28.8 to 33.6 hours
			// old sits on yesterday's close: no range held it before, now today's first bar does)
			expect(week.closes[onDailyClose ? i + 1 : i], `a record ${age} hours old, bar ${i}`).toBe(61.11);
			if (!onDailyClose) expect(closeAt(week, t)).toBe(61.11);
			seen.add(onDailyClose ? (i === yesterdayBar ? "yesterday" : "close") : i > yesterdayBar ? "today" : "hourly");
			// from the midnight after it the daily ranges read it at its moment, on one close
			if (t < midnightOf(NOW)) {
				for (const range of ["1M", "3M", "YTD", "1Y"] as const) {
					const h = demoPriceHistory("KO", range, q, NOW, [{ t, price: 61.11 }])!;
					expect(closeAt(h, t), `a record ${age} hours old on ${range}`).toBe(61.11);
					expect(h.closes.at(-2)).toBe(bare.closes[yesterdayBar]);
				}
			} else {
				// made today: the day's own bar holds it (the next one in the day's first minutes), the daily closes do not move
				const day = demoPriceHistory("KO", "1D", q, NOW, [{ t, price: 61.11 }])!;
				expect(standsOn(day, t)).toBe(61.11);
				expect(day.first).toBe(bare.closes[yesterdayBar]);
				expect(demoPriceHistory("KO", "1Y", q, NOW, [{ t, price: 61.11 }])!.closes).toEqual(demoPriceHistory("KO", "1Y", q, NOW)!.closes);
			}
		}
		expect([...seen].sort()).toEqual(["close", "hourly", "today", "yesterday"]);
	});

	it("keeps the week's opening close on the week's own line: a record on that close is the daily ranges' alone (N35a, follow-up F6)", () => {
		// THE RULING: the week's opening close stands on the week's own line, as yesterday's close stands for the day. Before
		// it a record made 4.3 to 5.8 days before today's midnight took the place of the week's opening pin for a day or two,
		// and the company's "this week" became the move since the record (a plain save of NVDA read "This week $0.00")
		const q = demoQuote("KO")!;
		const back = WINDOW_SESSIONS["1W"];
		let carved = 0;
		for (const now of [NOW, new Date(2026, 10, 9, 0, 5).getTime(), new Date(2026, 10, 9, 23, 55).getTime(), new Date(2027, 2, 14, 12, 0).getTime()]) {
			const bare = demoPriceHistory("KO", "1W", q, now)!;
			const bareMonth = demoPriceHistory("KO", "1M", q, now)!;
			// a record of every age up to nine days, half an hour apart, at a price the path never sits on
			for (let age = 0.25; age < 216; age += 0.5) {
				const t = now - age * 3_600_000;
				const anchors = [{ t, price: 61.11 }];
				const week = demoPriceHistory("KO", "1W", q, now, anchors)!;
				const month = demoPriceHistory("KO", "1M", q, now, anchors)!;
				// the week opens where the 1W move puts it, whatever was recorded: the company's "this week" never moves
				expect(week.first).toBe(bare.first);
				expect(week.change).toBe(bare.change);
				expect(week.changePercent).toBe(bare.changePercent);
				// every later daily close of the week's line is the month's own (the nesting): bars 7, 14, 21 and 28
				const dailyCloses = month.closes.slice(-(back + 1), -1);
				for (let s = 1; s < back; s++) expect(week.closes[s * SESSION_BARS]).toBe(dailyCloses[s]);
				// THE CARVE-OUT of "the week runs through the month's closes": when the record's daily close is the one that
				// opens the week, the month, the quarter and the year hold the record there (N23a) and the week's FIRST bar
				// keeps the seeded close: on those one or two days the two differ
				const onOpening = t < midnightOf(now) && pointAt(month, t) === month.closes.length - 1 - back;
				if (!onOpening) {
					expect(week.closes[0]).toBe(dailyCloses[0]);
					continue;
				}
				carved++;
				expect(dailyCloses[0]).toBe(61.11);
				for (const range of ["1M", "3M", "YTD", "1Y"] as const) expect(closeAt(demoPriceHistory("KO", range, q, now, anchors)!, t)).toBe(61.11);
				expect(week.closes[0]).not.toBe(dailyCloses[0]);
				expect(week.closes[0]).toBe(bareMonth.closes.at(-(back + 1)));
				// the week's line still holds the record: on its own bar, or the next one when that bar is a daily close
				expect(standsOn(week, t)).toBe(61.11);
				const beforeMidnight = (midnightOf(now) - t) / DAY;
				expect(beforeMidnight).toBeGreaterThan(4.3);
				expect(beforeMidnight).toBeLessThan(5.8);
			}
		}
		// one session of ages (1.45 days, 69 or 70 of them half an hour apart) on each of the four clocks
		expect(carved).toBeGreaterThan(4 * 60);
	});

	it("still draws every company its own rough line: no ramp, no flat stretch, no two alike", () => {
		const seed = seedGuest();
		const held = [...new Set(recordsOf(seed).map((r) => r.ticker))];
		for (const now of CLOCKS) {
			for (const range of HISTORY_RANGES) {
				const lines = held.map((t) => drawnFor(seed, t, range, now).closes);
				for (const c of lines) {
					expect(offTheRamp(unitBox(c))).toBeGreaterThan(0.03);
					// no flat stretch: the longest run of closes on one price spans under a twentieth of the line. Two or three
					// equal closes do occur where the walk lands twice on one cent: a calm company's 5-minute bars (PFE and MRK on
					// 1D, with or without anchors). A record no longer makes one: it stands on ONE daily close (the sweep above)
					let run = 1;
					let longest = 1;
					for (let i = 1; i < c.length; i++) {
						run = c[i] === c[i - 1] ? run + 1 : 1;
						longest = Math.max(longest, run);
					}
					expect((longest - 1) / (c.length - 1)).toBeLessThan(0.05);
				}
				const p = pairs(lines.map(unitBox));
				expect(p.same).toBe(0);
				expect(p.mirrored).toBe(0);
			}
		}
	});
});

// ── The off-book holding walks (coordinator ruling N25, 2026-11-09) ──────────────────────────────────────────────────

/** The guest persona's ledger as usePortfolio reads it (demo quotes). */
function personaLedger(): LedgerInput {
	const seed = seedGuest();
	return { cash: seed.cash, positions: seed.positions.map((p) => ({ ...p, price: demoQuote(p.ticker)!.price })), sold: seed.sold, offBook: personaOffBook() };
}
/** The persona's value over a range as its pages draw it: every company's series through the seed's recorded prices. */
function personaValue(range: HistoryRange, now = NOW) {
	const seed = seedGuest();
	const ledger = personaLedger();
	const histories = Object.fromEntries([...ledger.positions.map((p) => p.ticker), ...ledger.sold.map((s) => s.ticker)].map((t) => [t, drawnFor(seed, t, range, now)]));
	return portfolioValueHistory(ledger, range, histories, now);
}

// ── A trade at today's price moves no figure (review of 2026-11-09, follow-up F1) ────────────────────────────────────

type Book = Pick<GuestState, "positions" | "saves" | "sold" | "cash">;
/** The store's own buy (store.ts): a lot of its own, the average cost, the company saved at the fill price. */
function bought(s: Book, ticker: string, dollars: number, at: number): Book {
	const price = demoQuote(ticker)!.price;
	const shares = paperShares(dollars, price);
	const lot = { shares, price, at, bought: shares };
	const held = s.positions.find((p) => p.ticker === ticker);
	const positions: Position[] = held
		? s.positions.map((p) => (p === held ? { ...p, shares: Math.round((p.shares + shares) * 1e8) / 1e8, priceAtAdd: averageCost(p, shares, price), lots: [...positionLots(p, price), lot] } : p))
		: [...s.positions, { ticker, shares, priceAtAdd: price, addedAt: at, lots: [lot] }];
	const saves = s.saves.some((x) => x.ticker === ticker) ? s.saves : [...s.saves, { ticker, savedAt: at, priceAtSave: price }];
	return { ...s, positions, saves, cash: round2(s.cash - dollars) };
}
/** The store's own sale of `part` of a pick: ledger.ts paperSale, saleRecord (which keeps the buys it sold) and lotsAfterSale. */
function sold(s: Book, ticker: string, part: number, at: number, record: (entry: SoldEntry) => SoldEntry = (e) => e): Book {
	const price = demoQuote(ticker)!.price;
	const pos = s.positions.find((p) => p.ticker === ticker)!;
	const sale = paperSale(pos.shares, pos.shares * part, price);
	const positions = sale.remaining > 0 ? s.positions.map((p) => (p === pos ? { ...p, shares: sale.remaining, lots: lotsAfterSale(p, sale.remaining, price) } : p)) : s.positions.filter((p) => p !== pos);
	return { ...s, positions, cash: round2(s.cash + sale.proceeds), sold: [record(saleRecord(pos, sale, price, at)), ...s.sold] };
}
/** A persona ledger's value over a range, as its pages draw it: every company's series through what that ledger recorded. */
function bookValue(s: Book, range: HistoryRange, now = NOW) {
	const ledger: LedgerInput = { cash: s.cash, positions: s.positions.map((p) => ({ ...p, price: demoQuote(p.ticker)!.price })), sold: s.sold, offBook: personaOffBook() };
	const from = rangeStart(range, now) - 60_000;
	const tickers = [...new Set([...s.positions.map((p) => p.ticker), ...s.sold.filter((x) => x.soldAt >= from).map((x) => x.ticker)])];
	return portfolioValueHistory(ledger, range, Object.fromEntries(tickers.map((t) => [t, drawnFor(s, t, range, now)])), now);
}
const FIGURES = ["1D", "1W", "1M", "3M", "YTD", "1Y"] as const;
const figuresOf = (s: Book, now = NOW) => FIGURES.map((range) => bookValue(s, range, now).change);

describe("a trade at today's price moves no figure: every buy is its own lot, of a sale too (F1)", () => {
	it("keeps the day, the week, the month, the quarter and the rank through a top-up and a sale of any part of it", () => {
		const seed = seedGuest();
		// the persona's figures on 2026-11-09 (RE-DERIVED on the one daily timeline: the review's probe read +10.45 /
		// +186.25 / +195.96 / +234.79 on the old grids; the month and the quarter are read between the pins).
		// RE-DERIVED again in round 4 (N35b): the month and the quarter were +191.38 / +231.44. NVDA's week is the frame's
		// +$3.80 now (it was +$3.71), so the off-book holding was worth $608.16 a week ago, nine cents more, and its walk
		// from June reaches that figure: a moment of last month is worth 8 cents more, of last quarter 4 cents more
		const base = figuresOf(seed);
		expect(base).toEqual([10.45, PERSONA_WEEK_GAIN, 191.3, 231.4, 240, 240]);
		// the ledger review's case ($5,000 of TSLA bought and sold at one price: "+$392 (+4.0%) this week · #7") and the
		// follow-up's ($25 of NVDA, then 75% sold: "+$187")
		for (const [ticker, dollars] of [
			["TSLA", 5000],
			["NVDA", 25],
		] as const) {
			const topped = bought(seed, ticker, dollars, NOW - 3 * 60_000);
			expect(figuresOf(topped)).toEqual(base);
			for (const part of [0.25, 0.5, 0.75, 1]) {
				const after = sold(topped, ticker, part, NOW - 2 * 60_000);
				// the sale kept the buys it sold: the seeded pick's and today's
				expect(after.sold[0]!.lots).toHaveLength(2);
				expect(figuresOf(after), `${ticker} +$${dollars}, ${part * 100}% sold`).toEqual(base);
				const week = bookValue(after, "1W");
				expect(week.end).toBe(FRAMES_VALUE);
				expect(signedPct(week.changePercent)).toBe("+1.9%");
				expect(rankOf("week", week.changePercent)).toBe(47);
				// a page whose clock is the minute before the trades (useHistoryNow) reads the same
				expect(figuresOf(after, NOW - 4 * 60_000)).toEqual(figuresOf(seed, NOW - 4 * 60_000));
			}
			// a part sale and then the rest, and a plain sale of the seeded pick: nothing moves either
			expect(figuresOf(sold(sold(topped, ticker, 0.5, NOW - 2 * 60_000), ticker, 1, NOW - 60_000))).toEqual(base);
			expect(figuresOf(sold(seed, ticker, 0.75, NOW - 2 * 60_000))).toEqual(base);
		}
		// a company bought today and sold today, in part or whole
		const fresh = bought(seed, "KO", 100, NOW - 3 * 60_000);
		for (const part of [0.5, 1]) expect(figuresOf(sold(fresh, "KO", part, NOW - 2 * 60_000))).toEqual(base);
	});

	it("measures the defect it replaces, and still reads a sale stored without its buys as one lot", () => {
		const seed = seedGuest();
		const topped = bought(seed, "TSLA", 5000, NOW - 3 * 60_000);
		// a record as the store booked it until the review: the first buy's day alone, no lots. Everything it sold then
		// counts as held since May 20, today's 20 shares with it: the week the ledger's review read as +$392 and #7
		const legacy = sold(topped, "TSLA", 1, NOW - 2 * 60_000, ({ lots: _, ...entry }) => entry);
		const week = bookValue(legacy, "1W");
		expect(week.end).toBe(FRAMES_VALUE);
		expect(Math.round(week.change)).toBe(392);
		expect(signedPct(week.changePercent)).toBe("+4.0%");
		expect(rankOf("week", week.changePercent)).toBe(7);
		// the seed's own closed picks carry no lots either (SHOP, COIN): one buy on `addedAt`, as before, and the year
		// still starts at exactly the budget
		expect(seed.sold.every((x) => x.lots === undefined && x.addedAt !== undefined)).toBe(true);
		expect(bookValue(seed, "1Y").start).toBe(10000);
	});

	it("keeps the persona's week at the frames' on every clock, the capture tools' frame clock included (review 2, low 5)", () => {
		const seed = seedGuest();
		// July 4 to 13, 2026: JPM was picked on July 1 (inside the week) and MSFT on July 8 (after the clock on some days).
		// The anchor took both as held all week and the week read $181.44 to $181.78; it follows the ledger's own rule now
		for (let d = 0; d < 14; d++) {
			for (const [hh, mm] of [
				[0, 5],
				[9, 41],
				[18, 30],
			] as const) {
				const now = new Date(2026, 6, 4 + d, hh, mm).getTime();
				const week = bookValue(seed, "1W", now);
				expect(week.change, `the week on ${dayOf(now)} ${hh}:${mm}`).toBe(PERSONA_WEEK_GAIN);
				expect(week.end).toBe(FRAMES_VALUE);
				expect(signedPct(week.changePercent)).toBe("+1.9%");
			}
		}
		// and on the clocks the anchor tests run on
		for (const now of CLOCKS) expect(bookValue(seed, "1W", now).change).toBe(PERSONA_WEEK_GAIN);
	});

	it("stands still through a calendar day: the persona's figures are the same at 00:05, 09:00 and 21:00", () => {
		const seed = seedGuest();
		const at = (hh: number, mm: number) => new Date(2026, 10, 9, hh, mm).getTime();
		const morning = figuresOf(seed, at(9, 0));
		expect(figuresOf(seed, at(0, 5))).toEqual(morning);
		expect(figuresOf(seed, at(21, 0))).toEqual(morning);
		expect(morning).toEqual(figuresOf(seed));
		// the off-book holding's months before the week are counted from local midnight, as the companies' closes are
		const ob = personaOffBook();
		for (const days of [8, 30, 90, 140]) {
			const t = new Date(2026, 10, 9).getTime() - days * DAY;
			expect(offBookValueAt(ob, t, at(0, 5), FRAMES_VALUE)).toBe(offBookValueAt(ob, t, at(21, 0), FRAMES_VALUE));
		}
		// the trailing week stays the seven days before the clock: the holding was worth $608.16 then at every hour (today's
		// $782.00 less the $173.84 of the frames' +$186.25 the six listed picks do not make: they make $12.41. RE-DERIVED
		// in round 4, N35b: it was $608.07 / $173.93 / $12.32 while NVDA's week was the seeded +$3.71, not the frame's +$3.80)
		for (const now of [at(0, 5), at(9, 0), at(21, 0)]) expect(round2(offBookValueAt(ob, now - 7 * DAY, now, FRAMES_VALUE))).toBe(608.16);
	});

	it("stands still through the days after a clock change too: the long leg ends on the calendar (review 3, low 4; N35d)", () => {
		const seed = seedGuest();
		const ob = personaOffBook();
		// THE FINDING: the off-book holding's long leg ended at midnightOf(now - 7 x 24 h). In the week after a clock change
		// that is another calendar day for one hour a day, so the month and the quarter read differently in that hour: on
		// November 1 to 7, 2026 at 23:55 (1M +189.53 against +187.15 earlier that day; the autumn change is November 1 in
		// the reviewer's and this machine's time zone, America/Chicago) and on March 15, 2027 before 01:00 (the spring
		// change is March 14). The leg now ends at the midnight seven CALENDAR days before today's. In a time zone without
		// clock changes, or with other dates, the days below are ordinary ones and the test holds as on any day
		const day = (y: number, m: number, d: number) => (hh: number, mm: number) => new Date(y, m, d, hh, mm).getTime();
		const nov1 = day(2026, 10, 1);
		const mar15 = day(2027, 2, 15);
		// the brief's two clocks, each against the rest of its day
		expect(figuresOf(seed, nov1(23, 55))).toEqual(figuresOf(seed, nov1(9, 0)));
		expect(figuresOf(seed, mar15(0, 5))).toEqual(figuresOf(seed, mar15(9, 0)));
		// and every day of the fortnight around each change, at the hours that failed and at ordinary ones
		for (const [y, m, d0] of [
			[2026, 9, 30],
			[2027, 2, 12],
		] as const) {
			for (let d = 0; d < 12; d++) {
				const at = day(y, m, d0 + d);
				const morning = figuresOf(seed, at(9, 0));
				for (const [hh, mm] of [
					[0, 5],
					[0, 55],
					[21, 0],
					[23, 5],
					[23, 55],
				] as const)
					expect(figuresOf(seed, at(hh, mm)), `${dayOf(at(hh, mm))} ${hh}:${mm}`).toEqual(morning);
				// the week is the frames' on each of them
				expect(morning[1]).toBe(PERSONA_WEEK_GAIN);
				// a moment of last month, of last quarter: worth the same in the day's first and last minutes
				for (const days of [9, 30, 90]) expect(offBookValueAt(ob, at(0, 0) - days * DAY, at(0, 5), FRAMES_VALUE)).toBe(offBookValueAt(ob, at(0, 0) - days * DAY, at(23, 55), FRAMES_VALUE));
			}
		}
		// the leg's end is a calendar midnight: from it to the week's start the holding rests on its value a week ago
		const now = nov1(23, 55) + 2 * DAY;
		const weekAgo = offBookValueAt(ob, now - 7 * DAY, now, FRAMES_VALUE);
		expect(offBookValueAt(ob, new Date(2026, 9, 27).getTime(), now, FRAMES_VALUE)).toBe(weekAgo);
		expect(offBookValueAt(ob, new Date(2026, 9, 27).getTime() - 3_600_000, now, FRAMES_VALUE)).not.toBe(weekAgo);
		// NOT STILL, and left so (no page draws a YTD value line): on January 2 to 6 the YTD window opens INSIDE the trailing
		// week, whose leg slides with the clock; every other figure of those days stands still
		for (let d = 2; d <= 6; d++) {
			const at = day(2027, 0, d);
			const [d1, w1, m1, q1, , y1] = figuresOf(seed, at(0, 5));
			const [d2, w2, m2, q2, , y2] = figuresOf(seed, at(21, 0));
			expect([d1, w1, m1, q1, y1]).toEqual([d2, w2, m2, q2, y2]);
		}
	});
});

// ── The week's opening close stands (coordinator ruling N35a, 2026-11-09; follow-up F6) ──────────────────────────────

describe("a save, a top-up or a sale of a held pick never moves the week five to six days later (N35a, follow-up F6)", () => {
	/** The store's Save of a company (after an Unsave when it is saved already): today's price recorded at `at`. */
	const saved = (s: Book, ticker: string, at: number): Book => ({ ...s, saves: [...s.saves.filter((x) => x.ticker !== ticker), { ticker, savedAt: at, priceAtSave: demoQuote(ticker)!.price }] });
	/** The pick page's "This week" cell for a pick of `s`: src/app/simulate/figures.ts weekMove over the company's 1W series, as PickDetail calls it. */
	const weekCell = (s: Book, ticker: string, now: number) => weekMove(positionRow(s.positions.find((p) => p.ticker === ticker)!, demoQuote(ticker)), drawnFor(s, ticker, "1W", now), now);
	const HOURS = [
		[0, 5],
		[10, 0],
		[23, 55],
	] as const;

	it("keeps the persona's week at +186.25, '+1.9%' and #47 and each company's own 1W move on each of the next six days, whatever hour of today the record was made", () => {
		// THE FINDING (review 3, medium): the persona who merely SAVED NVDA on November 9 (the deck's first card) read
		// "+$183 (+1.8%) this week" on November 15, 1W +$182.54 on the value line, and "This week $0.00" / "NVDA price, 1W:
		// $0.00 (no change)" on the NVDA pick page; AAPL saved +$184.01, TSLA topped up +$181.39, half of JPM sold +$183.91
		const seed = seedGuest();
		const failed: string[] = [];
		let read = 0;
		for (const pick of seed.positions) {
			const T = pick.ticker;
			for (let hh = 0; hh < 24; hh++) {
				const made = new Date(2026, 10, 9, hh, 27).getTime();
				const cases: [string, Book][] = [
					["a save", saved(seed, T, made)],
					["a $25 top-up", bought(seed, T, 25, made)],
					["a sale of half", sold(seed, T, 0.5, made)],
				];
				for (const [what, book] of cases) {
					for (let d = 1; d <= 6; d++) {
						// one hour of each day in turn, and all three on the fifth and the sixth day: the days the record sits on the
						// close that opens the week
						for (const [h2, m2] of d >= 5 ? HOURS : [HOURS[(hh + d) % HOURS.length]!]) {
							const now = new Date(2026, 10, 9 + d, h2, m2).getTime();
							const label = `${T}, ${what} on Nov 9 at ${hh}:27, read on Nov ${9 + d} at ${h2}:${m2}`;
							read++;
							const week = bookValue(book, "1W", now);
							if (week.change !== PERSONA_WEEK_GAIN || week.end !== FRAMES_VALUE || signedPct(week.changePercent) !== "+1.9%" || rankOf("week", week.changePercent) !== 47)
								failed.push(`${label}: the week ${week.change} (${signedPct(week.changePercent)}) #${rankOf("week", week.changePercent)}`);
							// the company's own week: the 1W series opens and moves as it did before the record
							const before = drawnFor(seed, T, "1W", now);
							const after = drawnFor(book, T, "1W", now);
							if (after.first !== before.first || after.change !== before.change) failed.push(`${label}: the company's 1W opens at ${after.first}, moved ${after.change} (before: ${before.first}, ${before.change})`);
							// the pick page's "This week": the shares held all week earn the company's week (a top-up's own shares, bought
							// inside the week at today's price, nothing; half the shares after the sale of half, to the cent)
							const cell = weekCell(book, T, now)!;
							const seeded = weekCell(seed, T, now)!;
							const want = what === "a sale of half" ? seeded / 2 : seeded;
							if (Math.abs(cell - want) > 0.0051) failed.push(`${label}: This week ${cell}, the seeded pick's ${seeded}`);
						}
					}
				}
			}
		}
		expect(failed).toEqual([]);
		// six picks x 24 hours x three records x (four days at one hour + two days at three)
		expect(read).toBe(6 * 24 * 3 * 10);
	}, 240_000);

	it("lets a top-up's own shares earn their week from the seventh day on, and a sold half stop earning it: the company's week itself still stands", () => {
		const seed = seedGuest();
		const made = new Date(2026, 10, 9, 18, 27).getTime();
		// eight days later every record of November 9 is more than a week old
		const now = new Date(2026, 10, 17, 10, 0).getTime();
		for (const pick of seed.positions) {
			const T = pick.ticker;
			const price = demoQuote(T)!.price;
			const series = drawnFor(seed, T, "1W", now);
			const move = price - series.first;
			expect(bookValue(saved(seed, T, made), "1W", now).change).toBe(PERSONA_WEEK_GAIN);
			// the top-up's shares were held all week: they earn the company's week on top of the frames' (to a cent of rounding)
			const topped = bought(seed, T, 25, made);
			expect(Math.abs(bookValue(topped, "1W", now).change - (PERSONA_WEEK_GAIN + paperShares(25, price) * move))).toBeLessThan(0.011);
			// the half that was sold is cash: it earns nothing this week
			const halved = sold(seed, T, 0.5, made);
			expect(Math.abs(bookValue(halved, "1W", now).change - (PERSONA_WEEK_GAIN - halved.sold[0]!.shares * move))).toBeLessThan(0.011);
			for (const book of [saved(seed, T, made), topped, halved]) expect(drawnFor(book, T, "1W", now).first).toBe(series.first);
		}
	});
});

// ── A frame's weekly figure for a seeded pick carries over (coordinator ruling N35b, 2026-11-09) ─────────────────────

describe("a frame's weekly figure for a seeded pick carries over (N35b; the SIMULATE review's low 8)", () => {
	it("prints the frames' 'This week' on the six pick pages past the showcase, where a frame prints one: NVDA's +$3.80", () => {
		// the frames draw ONE pick page (NVDA, 2:859); its cell 2:899 is the only weekly figure they print for a pick
		// (src/app/simulate/data.ts: read for this test; no frame prints one for TSLA, AMD, AAPL, JPM or MSFT)
		const frameCell = pickDetail.stats[0][0];
		expect(pickDetail.symbol).toBe("NVDA");
		expect(frameCell).toEqual({ label: "This week", value: "+$3.80", up: true });
		expect(SEED_PICKS.filter((p) => p.week !== undefined).map((p) => [p.ticker, p.week])).toEqual([["NVDA", 3.8]]);
		const seed = seedGuest();
		const book: Book = seed;
		// on any day a week or more past the seed's dates (a pick younger than a week shows its gain since the pick)
		for (const now of [NOW, new Date(2026, 10, 15, 10, 0).getTime(), new Date(2026, 8, 15, 8, 5).getTime(), new Date(2027, 1, 10, 9, 41).getTime()]) {
			const cells = Object.fromEntries(seed.positions.map((p) => [p.ticker, weekMove(positionRow(p, demoQuote(p.ticker)), drawnFor(seed, p.ticker, "1W", now), now)]));
			// the cell the page prints is the frame's string
			expect(signedMoney(cells.NVDA!)).toBe(frameCell.value);
			for (const p of SEED_PICKS) if (p.week !== undefined) expect(cells[p.ticker]).toBe(p.week);
			// RE-DERIVED: NVDA read +3.71 after the first action (the seeded draw opened its week at $118.45); the five picks
			// no frame prints a week for keep their seeded draw
			expect(cells).toEqual({ NVDA: 3.8, TSLA: 4.86, AMD: -2.3, AAPL: 2.24, JPM: 2.34, MSFT: 1.47 });
			// the persona's total week stays the frames': the off-book holding carries what the six do not make
			expect(bookValue(book, "1W", now).change).toBe(PERSONA_WEEK_GAIN);
			expect(round2(offBookValueAt(personaOffBook(), now - 7 * DAY, now, FRAMES_VALUE))).toBe(round2(personaOffBook().value - (PERSONA_WEEK_GAIN - 12.41)));
		}
	});

	it("opens NVDA's week on the close that makes the seeded shares earn exactly the frame's dollars, for every visitor", () => {
		const q = demoQuote("NVDA")!;
		const shares = seedGuest().positions.find((p) => p.ticker === "NVDA")!.shares;
		expect(shares).toBe(1.01556102);
		const week = demoPriceHistory("NVDA", "1W", q, NOW)!;
		// $122.10 - $3.80 / 1.01556102 = $118.358 -> $118.36, and 1.01556102 x $3.74 = $3.798 -> $3.80
		expect(week.first).toBe(118.36);
		expect(week.first).toBe(round2(q.price - 3.8 / shares));
		expect(round2(shares * (q.price - week.first))).toBe(3.8);
		// the company's 1W move is that figure: +3.16% (the seeded draw gave +3.08%, $118.45), one rule for the path
		expect(framesWeekMove("NVDA")).toBeCloseTo((122.1 / 118.36 - 1) * 100, 10);
		expect(demoRangeMove("NVDA", "1W", q.changePercent)).toBe(framesWeekMove("nvda"));
		expect(signedPct(week.changePercent)).toBe("+3.2%");
		expect(week.change).toBe(3.74);
		// the month's close of five sessions back is the same close, and the other windows open where they did
		expect(demoPriceHistory("NVDA", "1M", q, NOW)!.closes.at(-(WINDOW_SESSIONS["1W"] + 1))).toBe(118.36);
		expect(demoRangeMove("NVDA", "1Y", q.changePercent)).toBe(32.13);
		// with or without the ledger's records, and at another quote the same move (the path scales)
		expect(demoPriceHistory("NVDA", "1W", q, NOW, priceAnchorsOf("NVDA", seedGuest()))!.first).toBe(118.36);
		expect(demoPriceHistory("NVDA", "1W", { price: 244.2, changePercent: 2.4 }, NOW)!.first).toBe(236.72);
		// no other company's week is a frame's: the seeded draw, a hundredth of a percent
		for (const t of TICKERS) {
			if (t === "NVDA") continue;
			expect(framesWeekMove(t)).toBeNull();
			const m = demoRangeMove(t, "1W", demoQuote(t)!.changePercent);
			expect(Math.round(m * 100) / 100).toBe(m);
		}
		// after a sale of a quarter the shares left earn their part of it: 0.76167077 x $3.74 = $2.85 (the review read
		// "+$2.78" there: $3.65 a share)
		const quarterSold = sold(seedGuest(), "NVDA", 0.25, NOW - 60_000);
		const left = quarterSold.positions.find((p) => p.ticker === "NVDA")!;
		expect(weekMove(positionRow(left, q), drawnFor(quarterSold, "NVDA", "1W", NOW), NOW)).toBe(2.85);
	});
});

describe("the off-book holding walks between its anchors (N25)", () => {
	it("reads a seeded walk at any step, the same for the same key", () => {
		const a = seededWalk("stak|test|walk");
		const b = seededWalk("stak|test|walk");
		const far = a(900);
		expect(a(0)).toBe(0);
		expect(b(900)).toBe(far);
		expect(a(12.5)).toBeCloseTo((a(12) + a(13)) / 2, 12);
		expect(seededWalk("stak|test|other")(900)).not.toBe(far);
		// standard steps: over 2,000 of them the mean square is about one
		let sq = 0;
		for (let i = 1; i <= 2000; i++) sq += (a(i) - a(i - 1)) ** 2;
		expect(sq / 2000).toBeGreaterThan(0.85);
		expect(sq / 2000).toBeLessThan(1.15);
		expect(a(Number.NaN)).toBe(0);
		expect(a(-5)).toBe(0);
	});

	it("keeps the three pins: the stake on its day, the value a week ago that makes the persona's week, today's value", () => {
		const ob = personaOffBook();
		const week = personaValue("1W");
		expect(week.end).toBe(FRAMES_VALUE);
		expect(week.change).toBe(PERSONA_WEEK_GAIN);
		expect(signedPct(week.changePercent)).toBe("+1.9%");
		for (const range of ["YTD", "1Y"] as const) {
			const h = personaValue(range);
			expect(h.start).toBe(10000);
			expect(h.change).toBe(240);
		}
		expect(offBookValueAt(ob, ob.since - 1, NOW)).toBe(ob.stake);
		expect(offBookValueAt(ob, ob.since, NOW)).toBeCloseTo(ob.stake, 9);
		const midnight = new Date(2026, 10, 9).getTime();
		expect(offBookValueAt(ob, midnight, NOW)).toBe(ob.value);
		expect(offBookValueAt(ob, NOW, NOW)).toBe(ob.value);
		// the same value whenever it is asked again, and no jump across a pin
		const t = NOW - 40 * DAY;
		expect(offBookValueAt(ob, t, NOW)).toBe(offBookValueAt(ob, t, NOW));
		expect(offBookValueAt(ob, NOW - 7 * DAY - 1, NOW)).toBeCloseTo(offBookValueAt(ob, NOW - 7 * DAY, NOW), 3);
		expect(offBookValueAt(ob, midnight - 1, NOW)).toBeCloseTo(ob.value, 3);
	});

	it("is never a straight segment: both legs leave the line between their pins, as a basket of six picks moves", () => {
		const ob = personaOffBook();
		const weekStart = NOW - 7 * DAY;
		const midnight = new Date(2026, 10, 9).getTime();
		const offChord = (t0: number, t1: number) => {
			const v0 = offBookValueAt(ob, t0, NOW);
			const v1 = offBookValueAt(ob, t1, NOW);
			let worst = 0;
			for (let i = 1; i < 400; i++) {
				const t = t0 + ((t1 - t0) * i) / 400;
				worst = Math.max(worst, Math.abs(offBookValueAt(ob, t, NOW) - (v0 + ((v1 - v0) * i) / 400)));
			}
			return worst;
		};
		// the five months from its stake to a week ago: a few dollars apart at the ends, the walk wanders tens of dollars between them
		expect(offChord(ob.since, weekStart)).toBeGreaterThan(10);
		// the last week: the frames' figures put most of the +$186 on this holding (N7a); it climbs as a lively week does
		expect(offChord(weekStart, midnight - 1)).toBeGreaterThan(10);
		// the long leg moves like the basket: its session-to-session log returns are about OFF_BOOK_DAILY_VOL
		// six picks like the persona's listed six (their betas average 1.4), moving together a third of the time: 1.04% a day
		expect(OFF_BOOK_DAILY_VOL).toBeCloseTo(0.011 * 1.4 * Math.sqrt(2.75 / 6), 12);
		expect(OFF_BOOK_DAILY_VOL).toBeGreaterThan(0.0104);
		expect(OFF_BOOK_DAILY_VOL).toBeLessThan(0.0105);
		const session = 1.4 * DAY;
		const returns: number[] = [];
		for (let t = ob.since + session; t < weekStart; t += session) returns.push(Math.log(offBookValueAt(ob, t, NOW) / offBookValueAt(ob, t - session, NOW)));
		const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
		const sd = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length);
		expect(returns.length).toBeGreaterThan(90);
		expect(sd / OFF_BOOK_DAILY_VOL).toBeGreaterThan(0.75);
		expect(sd / OFF_BOOK_DAILY_VOL).toBeLessThan(1.25);
		// continuous: a minute moves it by cents
		let prev = offBookValueAt(ob, weekStart, NOW);
		for (let t = weekStart + 60_000; t <= NOW; t += 60_000) {
			const v = offBookValueAt(ob, t, NOW);
			expect(Math.abs(v - prev)).toBeLessThan(0.5);
			prev = v;
		}
	});

	it("draws the persona's month as a line that moves all along: not flat for three weeks and then a step", () => {
		const month = personaValue("1M");
		expect(month.end).toBe(FRAMES_VALUE);
		const v = month.values;
		// before the ruling the first three weeks of the 1M line stayed within a few dollars; now they wander
		const early = v.slice(0, Math.floor(v.length * 0.6));
		expect(Math.max(...early) - Math.min(...early)).toBeGreaterThan(15);
		for (let i = 3; i < v.length; i++) expect(v[i] === v[i - 1] && v[i] === v[i - 2] && v[i] === v[i - 3]).toBe(false);
		// and no single step carries the month: the largest move between two neighbouring points is a part of it
		const steps = v.slice(1).map((x, i) => Math.abs(x - v[i]!));
		expect(Math.max(...steps)).toBeLessThan(0.45 * (Math.max(...v) - Math.min(...v)));
		// the line leaves the straight segment between its ends on every range it is drawn for
		for (const range of ["1W", "1M", "3M", "YTD", "1Y"] as const) expect(offTheRamp(unitBox(personaValue(range).values))).toBeGreaterThan(0.05);
	});
});

// ── A record next to a seeded window opening takes its place (coordinator ruling N38a, 2026-11-10) ────────────────────

/** The largest one-session step of a daily range's closes (today's price left out: a part of a session), in units of the company's daily volatility. */
function largestStep(closes: readonly number[], vol: number): { x: number; at: number } {
	let best = { x: 0, at: -1 };
	for (let i = 1; i < closes.length - 1; i++) {
		const x = Math.abs(Math.log(closes[i]! / closes[i - 1]!)) / vol;
		if (x > best.x) best = { x, at: i };
	}
	return best;
}
/** A moment on the daily close `index` of the year (0: the year's first, 251: yesterday's) at the clock `now`: three hours after that close. */
const onClose = (index: number, now: number) => Math.round(midnightOf(now) - (WINDOW_SESSIONS["1Y"] - 1 - index) * SESSION_MS) + 3 * 3_600_000;
/** Where a range's seeded opening stands on the year's daily closes, and the close the range's move puts there. */
const seededPin = (t: string, range: HistoryRange) => {
	const q = demoQuote(t)!;
	return { at: WINDOW_SESSIONS["1Y"] - WINDOW_SESSIONS[range], close: Math.max(0.01, round2(q.price / (1 + demoRangeMove(t, range, q.changePercent) / 100))) };
};

describe("a record next to a seeded window opening takes its place: no cliff on any daily range (N38a)", () => {
	it("finds no one-session step over 6x the daily volatility on any daily range over the next 400 days: the seed's records, and a save made today of each listed pick and of an unheld company", () => {
		// ROUND 5'S REVIEW (medium): pricePath pinned each window's seeded opening AND every record's daily close, so a record
		// one or two sessions from a seeded opening was bridged to it in one or two sessions: 170 company-days of the seed
		// over 6x on 1Y from Feb 19 to Jul 5, 2027 (LLY 23.9x, MRK 20.4x, MSFT 19.9x: /stocks/MSFT 1Y on May 30, 2027 opened
		// with a vertical drop of 95% of the chart's height), and a save made today gave NVDA's 3M line 8.4x on Feb 5-6, 2027
		const seed = seedGuest();
		const made = new Date(2026, 10, 10, 10, 0).getTime();
		const books: { label: string; ticker: string; state: Ledgered }[] = [];
		for (const t of [...new Set(recordsOf(seed).map((r) => r.ticker))]) books.push({ label: "the seed", ticker: t, state: seed });
		// KO: a company the persona never touched (and a story company: N9b holds for it too, above)
		for (const t of [...SEED_PICKS.map((p) => p.ticker), "KO"]) {
			const price = demoQuote(t)!.price;
			books.push({ label: "a save of Nov 10", ticker: t, state: { ...seed, saves: [...seed.saves.filter((s) => s.ticker !== t), { ticker: t, savedAt: made, priceAtSave: price }] } });
		}
		expect(books).toHaveLength(23 + 7);
		const over: string[] = [];
		let worst = 0;
		let readings = 0;
		for (const { label, ticker, state } of books) {
			const vol = demoDailyVol(ticker);
			const anchors = priceAnchorsOf(ticker, state);
			for (let d = 0; d < 400; d++) {
				const now = new Date(2026, 10, 10 + d, 10, 0).getTime();
				for (const range of ["1M", "3M", "YTD", "1Y"] as const) {
					const h = demoPriceHistory(ticker, range, demoQuote(ticker), now, anchors)!;
					const step = largestStep(h.closes, vol);
					readings++;
					worst = Math.max(worst, step.x);
					if (step.x > 6) over.push(`${ticker} (${label}) ${range} ${dayOf(now)}: ${step.x.toFixed(1)}x, ${h.closes[step.at - 1]} -> ${h.closes[step.at]}`);
				}
			}
		}
		expect(over).toEqual([]);
		expect(readings).toBe(30 * 400 * 4);
		// MEASURED at the ruling: the largest step 4.8x with the seed's records (5.2x for a save of any of the 77 companies)
		expect(worst).toBeLessThan(6);
	}, 180_000);

	it("opens the review's own pages without a cliff: MSFT's and LLY's 1Y lines, NVDA's 3M line after a save made today", () => {
		const seed = seedGuest();
		const firstStep = (t: string, range: HistoryRange, now: number, state: Ledgered) => largestStep(drawnFor(state, t, range, now).closes.slice(0, 3), demoDailyVol(t)).x;
		// /stocks/MSFT 1Y on May 29-30, 2027 stepped $524.92 -> $431.10 in its first session (19.9x); LLY on June 10-11, 23.9x
		for (const day of [29, 30]) expect(firstStep("MSFT", "1Y", new Date(2027, 4, day, 10, 0).getTime(), seed)).toBeLessThan(6);
		for (const day of [9, 10, 11]) expect(firstStep("LLY", "1Y", new Date(2027, 5, day, 10, 0).getTime(), seed)).toBeLessThan(6);
		// the NVDA pick page opens on 3M: after a save of Nov 9, 18:27 its line on Feb 5-6, 2027 stepped $104.38 -> $122.10
		const saved: Ledgered = { ...seed, saves: [...seed.saves.filter((s) => s.ticker !== "NVDA"), { ticker: "NVDA", savedAt: new Date(2026, 10, 9, 18, 27).getTime(), priceAtSave: 122.1 }] };
		for (const day of [5, 6]) expect(largestStep(drawnFor(saved, "NVDA", "3M", new Date(2027, 1, day, 10, 0).getTime()).closes, demoDailyVol("NVDA")).x).toBeLessThan(6);
	});

	it("drops a seeded 1M, 3M, YTD or 1Y opening exactly when a record lies within K = ceil(|ln(record / seeded)| / (3 x vol)) sessions of it, never the week's or yesterday's", () => {
		const q = demoQuote("MSFT")!;
		const vol = demoDailyVol("MSFT");
		const now = new Date(2026, 10, 10, 10, 0).getTime();
		const bare = demoPriceHistory("MSFT", "1Y", q, now)!;
		let dropped = 0;
		let kept = 0;
		for (const range of HISTORY_RANGES) {
			const pin = seededPin("MSFT", range);
			if (range !== "1D") expect(bare.closes[pin.at]).toBe(pin.close);
			// a record 9% above the seeded close: K = ceil(0.0862 / (3 x 0.99%)) = 3 sessions
			const price = round2(pin.close * 1.09);
			const K = recordReach(price, pin.close, vol);
			const yields = (YIELDING_PINS as readonly HistoryRange[]).includes(range);
			if (yields) expect(K).toBe(3);
			for (let d = -8; d <= 8; d++) {
				const index = pin.at + d;
				// a record's close is one of the year's 0 to 250 (yesterday's, 251, is the day's move: never a record's)
				if (index < 0 || index > WINDOW_SESSIONS["1Y"] - 2) continue;
				const t = onClose(index, now);
				const h = demoPriceHistory("MSFT", "1Y", q, now, [{ t, price }])!;
				// the record stands on its own close (N23a), whatever happens to the seeded opening
				expect(pointAt(h, t)).toBe(index);
				expect(closeAt(h, t)).toBe(price);
				if (d === 0) continue;
				if (yields && Math.abs(d) <= K) {
					// dropped: the window opens where the one path is, about the record's price, never a cliff away from it
					dropped++;
					expect(h.closes[pin.at], `${range} opening with a record ${d} sessions away`).not.toBe(pin.close);
					expect(Math.abs(Math.log(h.closes[pin.at]! / price)), `${range} opening with a record ${d} sessions away`).toBeLessThan(4 * vol * Math.sqrt(Math.abs(d)));
				} else {
					// beyond reach, or the week's opening (N35a) and yesterday's close: the seeded figure stands
					kept++;
					expect(h.closes[pin.at], `${range} opening with a record ${d} sessions away`).toBe(range === "1D" ? bare.closes[pin.at] : pin.close);
				}
				if (yields) expect(largestStep(h.closes, vol).x, `${range}, a record ${d} sessions away`).toBeLessThan(6);
			}
		}
		// 1M, 3M and YTD three sessions either side, 1Y three after its opening (nothing is recorded before the year)
		expect(dropped).toBe(3 * 6 + 3);
		expect(kept).toBe(54);
		// the week's own line keeps its seeded opening whatever sits next to it (N35a): the company's week never moves
		for (const d of [-2, -1, 1]) {
			const t = onClose(seededPin("MSFT", "1W").at + d, now);
			expect(demoPriceHistory("MSFT", "1W", q, now, [{ t, price: round2(q.price * 1.09) }])!.first).toBe(demoPriceHistory("MSFT", "1W", q, now)!.first);
		}
	});

	it("lets the year's line run free before a record that took its opening: no unpinned head, no step", () => {
		const q = demoQuote("LLY")!;
		const vol = demoDailyVol("LLY");
		const now = new Date(2026, 10, 10, 10, 0).getTime();
		const pin = seededPin("LLY", "1Y");
		expect(pin.at).toBe(0);
		const price = round2(pin.close * 1.12);
		for (const index of [1, 2, 4, 6]) {
			const anchors = [{ t: onClose(index, now), price }];
			const h = demoPriceHistory("LLY", "1Y", q, now, anchors)!;
			expect(recordReach(price, pin.close, vol)).toBeGreaterThanOrEqual(index);
			expect(h.closes[index]).toBe(price);
			// the closes before it walk with the company's own volatility (never the quote's price nor the seeded opening)
			for (let i = 0; i < index; i++) expect(Math.abs(Math.log(h.closes[i]! / h.closes[i + 1]!))).toBeLessThan(4 * vol);
			expect(h.closes.slice(0, index)).not.toContain(q.price);
			expect(h.closes.slice(0, index)).not.toContain(pin.close);
			// one path: the shorter daily ranges are its tail
			for (const range of ["1M", "3M", "YTD"] as const) {
				const tail = demoPriceHistory("LLY", range, q, now, anchors)!;
				expect(tail.closes).toEqual(h.closes.slice(-tail.closes.length));
			}
		}
	});

	it("reads the move since the record on the days a window opens on or next to it; the company's week never moves (accepted, listed for the user)", () => {
		// THE ACCEPTED CONSEQUENCE (N38a): a range that opens on a record made at the frozen demo quote reads its true move
		// since then: NVDA saved on Nov 9 at $122.10 reads "$0.00 (no change)" on its 1M range on Dec 12, 2026 (the
		// reviewer's p3 page) where the seeded month reads -$5.47; the session before, the path one session from the save
		const seed = seedGuest();
		const save = { ticker: "NVDA", savedAt: new Date(2026, 10, 9, 18, 27).getTime(), priceAtSave: 122.1 };
		const saved: Ledgered = { ...seed, saves: [...seed.saves.filter((s) => s.ticker !== "NVDA"), save] };
		const month = (state: Ledgered, day: number) => drawnFor(state, "NVDA", "1M", new Date(2026, 11, day, 10, 0).getTime());
		expect(month(seed, 12).change).toBe(-5.47);
		expect(month(saved, 12).first).toBe(122.1);
		expect(month(saved, 12).change).toBe(0);
		expect(month(saved, 11).change).not.toBe(-5.47);
		// and the company's week (N35a) does not move on any of the next 400 days, through the save
		for (let d = 0; d < 400; d += 3) {
			const now = new Date(2026, 10, 10 + d, 10, 0).getTime();
			expect(drawnFor(saved, "NVDA", "1W", now).change).toBe(drawnFor(seed, "NVDA", "1W", now).change);
		}
	});
});

// ── The story companies rise for a saving visitor too (coordinator rulings N40a and N41a, 2026-11-10) ────────────────

describe("a story company's windows open under the price for a visitor who saves or buys it at the demo quote (N40a, N41a)", () => {
	/** A day a window opens ON the record's own close: its first close is the record's price and its moment falls on it. */
	const opensOnRecord = (h: PriceHistory, made: number, price: number) => h.first === price && h.times[0]! <= made && made < h.times[1]!;
	/** Yesterday's close of a company: its price before the day's move (exact; every range's second-to-last close). */
	const yesterdayOf = (t: string) => {
		const q = demoQuote(t)!;
		return q.price / Math.max(0.01, 1 + q.changePercent / 100);
	};
	/**
	 * The story pin (N44b, round 7's review): 0.2% under the LOWER end of the day, min(price, yesterday's close). It was
	 * price / 1.002, which stood over yesterday's close on a day the price rose more than 0.2% (all four rise today: MU
	 * +4.2%, GS +1.2%, KO and O +0.2%), so the line fell to yesterday's close and only the day's last step rose.
	 */
	const storyPin = (t: string) => round2(Math.min(demoQuote(t)!.price, yesterdayOf(t)) / (1 + STORY_OPENING_MARGIN));

	it("keeps 3M and 1Y rising on every day of the next 400 but the days a window opens ON the record, and YTD from 45 closes; no step over 6x", () => {
		// ROUND 6'S REVIEW (medium): a save at the frozen demo quote let N38a drop the 3M and 1Y seeded openings near it, and
		// the YTD window opened on a bridge from the save that crossed January 1 above the price: MU 3M/1Y 17-18 readings
		// not rising (worst 1Y -$3.46), GS 18-19 (3M -$17.78, -3.59%, Feb 4-5, 2027), KO 11-12, O 6-8, and YTD from 45
		// closes MU 51-53 days (-$12.94, -9.83% on Jun 10, 2027), KO 56, O 12, GS 2-4 (review6\logs\r7_story.txt, r7c-spans.txt)
		const seed = seedGuest();
		const made = new Date(2026, 10, 10, 10, 0).getTime();
		const failed: string[] = [];
		const onRecord: Record<string, string[]> = {};
		// N44b: on the days a window opens on the story pin, the line rises up to yesterday's close too, not only to the price
		const pinFalls: string[] = [];
		const pinDays: Record<string, number> = {};
		let worst = 0;
		let readings = 0;
		for (const t of Object.keys(STORY_TREND)) {
			const q = demoQuote(t)!;
			const vol = demoDailyVol(t);
			const pin = storyPin(t);
			const saved: Ledgered = { ...seed, saves: [...seed.saves.filter((s) => s.ticker !== t), { ticker: t, savedAt: made, priceAtSave: q.price }] };
			// the store's own $25 buy at the quote: a lot of its own and the company saved at the fill price
			for (const [label, state] of [
				["save", saved],
				["buy", bought(seed, t, 25, made)],
			] as const) {
				const anchors = priceAnchorsOf(t, state);
				expect(anchors.some((a) => a.t === made && a.price === q.price)).toBe(true);
				for (let d = 0; d < 400; d++) {
					const now = new Date(2026, 10, 10 + d, 10, 0).getTime();
					for (const range of ["1M", "3M", "YTD", "1Y"] as const) {
						const h = demoPriceHistory(t, range, q, now, anchors)!;
						worst = Math.max(worst, largestStep(h.closes, vol).x);
						if (range === "1M" || (range === "YTD" && h.closes.length - 1 < 45)) continue;
						readings++;
						if (h.first === pin) {
							pinDays[t] = (pinDays[t] ?? 0) + 1;
							if (!(h.closes.at(-2)! > h.first)) pinFalls.push(`${t} ${label} ${range} ${dayOf(now)}: ${h.first} -> ${h.closes.at(-2)}`);
						}
						if (h.last > h.first) continue;
						if (opensOnRecord(h, made, q.price)) (onRecord[`${t} ${label}`] ??= []).push(`${range} ${dayOf(now)}`);
						else failed.push(`${t} ${label} ${range} ${dayOf(now)}: ${h.first} -> ${h.last}`);
					}
				}
			}
		}
		expect(failed).toEqual([]);
		// the pin days, every company: their lines rise to yesterday's close as well as to the price (N44b)
		expect(pinFalls).toEqual([]);
		expect(Object.keys(pinDays).sort()).toEqual(Object.keys(STORY_TREND).sort());
		// THE EXACT DAYS (N38a's accepted $0.00, listed for the user): a window that opens on the save reads the move since
		// it, nothing, at a frozen quote; for a save or buy made on Nov 10 at 10:00, the same three days for each company
		const days = ["3M Sun Feb 07 2027", "3M Mon Feb 08 2027", "1Y Mon Nov 08 2027"];
		expect(onRecord).toEqual(Object.fromEntries(Object.keys(STORY_TREND).flatMap((t) => [`${t} save`, `${t} buy`].map((k) => [k, days]))));
		expect(readings).toBeGreaterThan(4 * 2 * 400 * 2);
		// MEASURED at the ruling: the largest one-session step 4.2x the daily volatility (KO's 1Y, Sep 14, 2027)
		expect(worst).toBeLessThan(6);
	}, 180_000);

	it("opens the review's worst readings under the price: GS 3M on Feb 4-5, 2027, MU 1Y on Oct 30, 2027 and MU YTD on Jun 10, 2027", () => {
		const seed = seedGuest();
		const made = new Date(2026, 10, 10, 10, 0).getTime();
		const savedOf = (t: string): Ledgered => ({ ...seed, saves: [...seed.saves.filter((s) => s.ticker !== t), { ticker: t, savedAt: made, priceAtSave: demoQuote(t)!.price }] });
		// RE-DERIVED (N44b): the pin is 0.2% under yesterday's close (the lower end of the day: GS $471.49, MU $113.74); it
		// was price / 1.002 (GS $477.15, MU $118.51), over yesterday's close, so the line fell to it and rose on the last step
		expect([storyPin("GS"), storyPin("MU"), storyPin("KO"), storyPin("O")]).toEqual([471.49, 113.74, 62.95, 55.08]);
		for (const [t, range, at] of [
			["GS", "3M", new Date(2027, 1, 4, 10, 0)],
			["GS", "3M", new Date(2027, 1, 5, 10, 0)],
			["MU", "1Y", new Date(2027, 9, 30, 10, 0)],
			["MU", "YTD", new Date(2027, 5, 10, 10, 0)],
		] as const) {
			const h = drawnFor(savedOf(t), t, range, at.getTime());
			// it read GS $495.88 -> $478.10, MU $122.21 -> $118.75 and MU YTD $131.69 -> $118.75: the opening is now the pin
			// a 0.2% step under yesterday's close (STORY_OPENING_MARGIN), the one path through it, and the line rises, to
			// yesterday's close as well as to the price
			expect(h.first, `${t} ${range} ${dayOf(at.getTime())}`).toBe(storyPin(t));
			expect(h.last).toBeGreaterThan(h.first);
			expect(h.closes.at(-2)!).toBeGreaterThan(h.first);
			expect(h.closes.at(-2)!).toBe(yesterdayOf(t)); // the day's move stands
			expect(largestStep(h.closes, demoDailyVol(t)).x).toBeLessThan(6);
			// one path: the shorter daily ranges are its tail
			const year = drawnFor(savedOf(t), t, "1Y", at.getTime());
			expect(year.closes.slice(-h.closes.length)).toEqual(h.closes);
		}
	});

	it("places the pin only where every pin of the path lies K = recordReach(pin, the pin's price) sessions or more from it; a record ON the opening stands", () => {
		// a record ABOVE the price next to KO's 3M opening (a guest cannot make one: its records are at the frozen quote)
		const q = demoQuote("KO")!;
		const vol = demoDailyVol("KO");
		const now = new Date(2026, 10, 10, 10, 0).getTime();
		const opening = WINDOW_SESSIONS["1Y"] - WINDOW_SESSIONS["3M"];
		// RE-DERIVED (N44b): min(price, yesterday's close) / 1.002 = $62.95 (it was price / 1.002, $63.07)
		const target = storyPin("KO");
		const record = round2(q.price * 1.1);
		const K = recordReach(record, target, vol);
		expect(K).toBeGreaterThan(2);
		let placed = 0;
		let refused = 0;
		for (const d of [-(K + 2), -(K + 1), -K, -(K - 1), -1, 1, K - 1, K, K + 1, K + 2]) {
			const anchors = [{ t: onClose(opening + d, now), price: record }];
			const h = demoPriceHistory("KO", "3M", q, now, anchors)!;
			const year = demoPriceHistory("KO", "1Y", q, now, anchors)!;
			expect(closeAt(year, anchors[0]!.t)).toBe(record); // the record reads back (N23a), pinned or not
			expect(largestStep(year.closes, vol).x, `a record ${d} sessions from the opening`).toBeLessThan(6);
			if (Math.abs(d) >= K) {
				// room for the pin: the window opens under the price (on the pin, or below it where the walk already was)
				expect(h.last, `a record ${d} sessions from the opening`).toBeGreaterThan(h.first);
				if (h.first === target) placed++;
			} else {
				// too near the record: no pin (it would be a cliff), the opening is the walk's, about the record's price
				expect(h.first, `a record ${d} sessions from the opening`).not.toBe(target);
				refused++;
			}
		}
		expect(placed).toBeGreaterThan(0);
		expect(refused).toBe(4);
		// a record ON the opening stands: the window opens on it (here over the price; a guest's record at the quote: $0.00)
		const on = demoPriceHistory("KO", "3M", q, now, [{ t: onClose(opening, now), price: record }])!;
		expect(on.first).toBe(record);
		// no records, or another company: N21's path to the last digit (the rule needs a story company and a record)
		expect(demoPriceHistory("KO", "1Y", q, now)!.closes).toEqual(demoPriceHistory("KO", "1Y", q, now, [])!.closes);
		const nvda = demoQuote("NVDA")!;
		const nvdaSave = [{ t: onClose(opening + 1, now), price: nvda.price }];
		expect(demoPriceHistory("NVDA", "3M", nvda, now, nvdaSave)!.first).not.toBe(round2(nvda.price / 1.002));
	});
});

import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { DEMO_QUOTES } from "../demoQuotes";
import { round2, signedPct } from "../format";
import { GUEST_SEED_CASH, type GuestState, LEGACY_SEED_CASH, migrateGuest, sanitize, seedGuest, storeFor } from "../guest";
import {
	ANCHOR_NUDGE,
	apiPriceHistory,
	closeAt,
	DEMO_POINTS,
	demoMarketMoveSince,
	demoPriceHistory,
	demoRangeMove,
	HISTORY_RANGES,
	type HistoryRange,
	priceHistoryFor,
	RANGE_SERIES,
	rangeStart,
	STORY_TREND,
	type PriceHistory,
} from "../history";
import { FRAMES_VALUE, PERSONA_WEEK_GAIN, personaOffBook, personaOffBookLess } from "../ledger";
import { offBookValueAt, portfolioValueHistory, type LedgerInput } from "../portfolioHistory";
import { demoQuote } from "../quotes";
import { boardFor, boardReturns, FIELD_SIZE, LEADERS, rankOf, SHOWCASE_STANDING, standingFrom } from "../rank";
import { pageshowEvent } from "./browserEvents";

const NOW = new Date(2026, 10, 7, 14, 30).getTime();
const DAY = 86_400_000;

// the price path's volatility follows the catalog's betas (history.ts demoDailyVol): the app draws no page before
// the catalog has landed, so neither do these tests
beforeAll(() => loadCatalog());

describe("demoPriceHistory", () => {
	const nvda = demoQuote("NVDA")!;

	it("gives the same closes for the same symbol and range, whatever the clock", () => {
		for (const range of HISTORY_RANGES) {
			const a = demoPriceHistory("NVDA", range, nvda, NOW)!;
			const b = demoPriceHistory("nvda", range, nvda, NOW + 3 * DAY)!;
			// RE-DERIVED (one daily timeline, 2026-11-09). Before: the YTD series held DEMO_POINTS.YTD = 211 closes whatever
			// the day. Now it holds the closes since January 1 (history.ts windowSessions): 217 on November 7, 219 three days
			// later, the same closes with the newer ones behind them
			expect(b.closes.slice(-a.closes.length)).toEqual(a.closes);
			expect([a.closes.length, b.closes.length]).toEqual(range === "YTD" ? [217, 219] : [DEMO_POINTS[range], DEMO_POINTS[range]]);
			expect(a.source).toBe("demo");
		}
	});

	it("ends exactly at the quote, on a time grid from the range's window start to now", () => {
		for (const range of HISTORY_RANGES) {
			const h = demoPriceHistory("TSLA", range, demoQuote("TSLA"), NOW)!;
			expect(h.last).toBe(248.5);
			expect(h.times[0]).toBe(rangeStart(range, NOW));
			expect(h.times[h.times.length - 1]).toBe(NOW);
			for (let i = 1; i < h.times.length; i++) expect(h.times[i]!).toBeGreaterThan(h.times[i - 1]!);
			for (const c of h.closes) expect(Number.isFinite(c) && c > 0).toBe(true);
			expect(h.points[0]).toEqual({ ts: new Date(h.times[0]!).toISOString(), close: h.closes[0] });
		}
	});

	it("starts 1D at the previous close, so it agrees with the day's move", () => {
		for (const t of ["NVDA", "MSFT", "COST", "ENPH", "KO", "GME"]) {
			const q = demoQuote(t)!;
			const h = demoPriceHistory(t, "1D", q, NOW)!;
			expect(h.first).toBeCloseTo(q.price / (1 + q.changePercent / 100), 9);
			expect(Math.abs(h.changePercent - q.changePercent)).toBeLessThan(1e-9);
			expect(Math.sign(h.change)).toBe(Math.sign(q.changePercent));
			// the closes between the first and the last are cents, as the API's are
			for (const c of h.closes.slice(1, -1)) expect(Math.round(c * 100) / 100).toBe(c);
		}
	});

	it("draws a fall as the company's own walk tilted down, no longer the rise upside down (N21; was StakInsights.scaled's mirror)", () => {
		const up = demoPriceHistory("NVDA", "1D", { price: 100, changePercent: 2 }, NOW)!;
		const down = demoPriceHistory("NVDA", "1D", { price: 100, changePercent: -2 }, NOW)!;
		expect(down.last).toBeLessThan(down.first);
		expect([up.last, down.last]).toEqual([100, 100]);
		// RE-DERIVED (N21, 2026-11-09). Before: the two profiles were one shape, a fall its mirror image (every point within
		// 0.02). Now the profiles differ (measured: up to 1.32 of the day's move apart), because the walk's shocks are the
		// company's own whatever the quote: the two days differ only by the straight tilt between their opening prices
		const profile = (h: PriceHistory) => h.closes.map((c) => (c - h.first) / (h.last - h.first));
		const gap = Math.max(...profile(up).map((u, i) => Math.abs(u - profile(down)[i]!)));
		expect(gap).toBeGreaterThan(0.5);
		const tilt = Math.log(up.first / down.first);
		const n = up.closes.length - 1;
		up.closes.forEach((c, i) => expect(Math.abs(Math.log(c / down.closes[i]!) - tilt * (1 - i / n))).toBeLessThan(2e-4));
	});

	it("prints every demo company's own day move on 1D, a low price included (AMC $4.85, -3.9%)", () => {
		const off: string[] = [];
		for (const t of Object.keys(DEMO_QUOTES)) {
			const q = demoQuote(t)!;
			const h = demoPriceHistory(t, "1D", q, NOW)!;
			// the exact previous close, so the series' move IS the quote's (a cent-rounded first close made AMC read -4.0%)
			expect(h.first).toBeCloseTo(q.price / (1 + q.changePercent / 100), 9);
			expect(Math.abs(h.changePercent - q.changePercent)).toBeLessThan(1e-9);
			expect(h.change).toBe(q.change);
			if (signedPct(h.changePercent) !== signedPct(q.changePercent)) off.push(t);
		}
		expect(off).toEqual([]);
		expect(signedPct(demoPriceHistory("AMC", "1D", demoQuote("AMC"), NOW)!.changePercent)).toBe("-3.9%");
	});

	it("wanders through a day that ends where it began (no flat line), and every company has its own line", () => {
		const flat = demoPriceHistory("ZZZ", "1D", { price: 50, changePercent: 0 }, NOW)!;
		// RE-DERIVED (N21, 2026-11-09). Before: a zero move drew 79 closes of exactly $50 (the shape scaled to nothing).
		// Now the day is a walk that comes back to its start: 45 different closes between $49.96 and $50.67 (a company
		// the catalog does not know moves like the market, 1.1% a day), starting and ending on the price
		expect([flat.first, flat.last, flat.change]).toEqual([50, 50, 0]);
		expect(new Set(flat.closes).size).toBe(45);
		expect([flat.low, flat.high]).toEqual([49.96, 50.67]);
		const a = demoPriceHistory("NVDA", "1M", { price: 100, changePercent: 1 }, NOW)!;
		const b = demoPriceHistory("AMD", "1M", { price: 100, changePercent: 1 }, NOW)!;
		expect(a.closes).not.toEqual(b.closes);
	});

	it("gives no series without a quote", () => {
		expect(demoPriceHistory("NVDA", "1D", null, NOW)).toBeNull();
		expect(demoPriceHistory("NVDA", "1D", { price: 0, changePercent: 1 }, NOW)).toBeNull();
		expect(demoPriceHistory("", "1D", { price: 10, changePercent: 1 }, NOW)).toBeNull();
	});

	it("tells two companies' lines apart on EVERY range (N21; N9a did it for 1D alone by nudging the shape), the ends exact", () => {
		// every demo company's line normalised to the News rail's 73 px box (a fall flipped, so shapes are compared), then
		// the mean vertical distance between two companies' lines over every pair (the reviewer's measure, review 2)
		const alike = (range: HistoryRange) => {
			const tickers = Object.keys(DEMO_QUOTES);
			const norm = tickers.map((t) => {
				const h = demoPriceHistory(t, range, demoQuote(t), NOW)!;
				const span = h.high - h.low || 1;
				const up = h.last >= h.first;
				return h.closes.map((c) => ((up ? c - h.low : h.high - c) / span) * 73);
			});
			let sum = 0;
			let pairs = 0;
			let under2 = 0;
			for (let i = 0; i < norm.length; i++) {
				for (let j = i + 1; j < norm.length; j++) {
					let d = 0;
					for (let k = 0; k < norm[i]!.length; k++) d += Math.abs(norm[i]![k]! - norm[j]![k]!);
					d /= norm[i]!.length;
					sum += d;
					pairs++;
					if (d < 2) under2++;
				}
			}
				return { meanPx: sum / pairs, under2, pairs };
		};
		// the superseded N9a's constants are what they were (shapedSeries still reads them)
		expect(ANCHOR_NUDGE["1D"]).toBe(0.3);
		for (const range of ["1W", "1M", "3M", "YTD", "1Y"] as const) expect(ANCHOR_NUDGE[range]).toBe(0.08);
		const day = alike("1D");
		const week = alike("1W");
		expect(day.pairs).toBe(2926);
		expect(day.meanPx).toBeGreaterThan(6);
		expect(day.under2).toBe(0);
		// RE-DERIVED (N21, 2026-11-09). Before (the nudged phone shapes): 1D 7.03 px, 1.8 x the week's, and the other
		// ranges in a 3.3-3.6 px band (as alike as one shape). Now every range is the company's own walk: measured 1D
		// 17.95 px, 1W 18.79, 1M 18.58, 3M 18.80, YTD 17.25, 1Y 16.45, no pair under 2 px on any range (the closest
		// pair of all is 5.04 px apart), and the day no longer stands apart from the week (0.96 of it)
		expect(day.meanPx).toBeGreaterThan(16);
		expect(week.meanPx).toBeGreaterThan(16);
		expect(week.meanPx).toBeLessThan(21);
		expect(day.meanPx / week.meanPx).toBeGreaterThan(0.8);
		expect(day.meanPx / week.meanPx).toBeLessThan(1.25);
		for (const range of ["1M", "3M", "YTD", "1Y"] as const) {
			const r = alike(range);
			expect(r.meanPx).toBeGreaterThan(15);
			expect(r.under2).toBe(0);
		}
		expect(week.under2).toBe(0);
		// the first and the last anchor are never nudged: the end price and the day move stay exact (every ticker)
		for (const t of Object.keys(DEMO_QUOTES)) {
			const q = demoQuote(t)!;
			const h = demoPriceHistory(t, "1D", q, NOW)!;
			expect(h.last).toBe(q.price);
			expect(Math.abs(h.changePercent - q.changePercent)).toBeLessThan(1e-9);
		}
	});

	it("rises over 3M, YTD and 1Y for the companies the site's stories carry as rising (N9b), the others keeping their draws", () => {
		// coordinator ruling N9b (2026-11-08 08:45, confirmed 10:50): MU, GS, KO and O rise; XOM keeps the seeded draw
		expect(Object.keys(STORY_TREND).sort()).toEqual(["GS", "KO", "MU", "O"]);
		for (const t of Object.keys(STORY_TREND)) {
			const day = demoQuote(t)!.changePercent;
			for (const range of ["3M", "YTD", "1Y"] as const) expect(demoRangeMove(t, range, day)).toBeGreaterThan(0);
			// one trend: the longer the window the further
			expect(demoRangeMove(t, "1Y", day)).toBeGreaterThan(demoRangeMove(t, "YTD", day));
			expect(demoRangeMove(t, "YTD", day)).toBeGreaterThan(demoRangeMove(t, "3M", day));
			const year = demoPriceHistory(t, "1Y", demoQuote(t), NOW)!;
			expect(year.last).toBeGreaterThan(year.first);
		}
		// every other company's draw is exactly what it was before the table (review 2's probe of the app bundle)
		expect(demoRangeMove("XOM", "1Y", demoQuote("XOM")!.changePercent)).toBe(11.73);
		expect(demoRangeMove("NVDA", "1Y", demoQuote("NVDA")!.changePercent)).toBe(32.13);
		expect(demoRangeMove("AAPL", "1Y", demoQuote("AAPL")!.changePercent)).toBe(14.09);
		expect(demoRangeMove("MSFT", "3M", demoQuote("MSFT")!.changePercent)).toBe(-9.86);
		expect(demoRangeMove("TSLA", "YTD", demoQuote("TSLA")!.changePercent)).toBe(-12.29);
	});

	it("keeps each range's move in a plausible band, the phones' shapes intact", () => {
		for (const t of ["NVDA", "KO", "GME", "PLTR"]) {
			const day = demoQuote(t)!.changePercent;
			expect(demoRangeMove(t, "1D", day)).toBe(day);
			for (const range of ["1W", "1M", "3M", "YTD", "1Y"] as const) {
				const m = demoRangeMove(t, range, day);
				expect(m).toBe(demoRangeMove(t, range, day));
				expect(Math.abs(m)).toBeLessThanOrEqual(80);
			}
		}
		expect(RANGE_SERIES["1W"]).toEqual([0.3, 0.38, 0.35, 0.5, 0.46, 0.6, 0.72]);
		expect(RANGE_SERIES["3M"]).toHaveLength(15);
	});
});

describe("apiPriceHistory / priceHistoryFor / closeAt", () => {
	const pts = [
		{ ts: "2026-11-06T15:00:00.000Z", close: 101 },
		{ ts: "bad", close: 5 },
		{ ts: "2026-11-06T14:00:00.000Z", close: 100 },
		{ ts: "2026-11-06T16:00:00.000Z", close: Number.NaN },
		{ ts: "2026-11-06T17:00:00.000Z", close: 103 },
	];

	it("keeps the usable closes, oldest first, and needs two of them", () => {
		const h = apiPriceHistory("aapl", "1D", pts)!;
		expect(h.source).toBe("api");
		expect(h.symbol).toBe("AAPL");
		expect(h.closes).toEqual([100, 101, 103]);
		expect(h.change).toBe(3);
		expect(apiPriceHistory("AAPL", "1D", pts.slice(0, 2))).toBeNull();
		expect(apiPriceHistory("AAPL", "1D", null)).toBeNull();
	});

	it("prefers the API's closes and falls back to the demo series", () => {
		expect(priceHistoryFor("AAPL", "1D", demoQuote("AAPL"), pts, NOW)!.source).toBe("api");
		expect(priceHistoryFor("AAPL", "1D", demoQuote("AAPL"), [], NOW)!.source).toBe("demo");
		expect(priceHistoryFor("AAPL", "1D", null, [], NOW)).toBeNull();
	});

	it("reads the close at or before a moment", () => {
		const h = apiPriceHistory("AAPL", "1D", pts)!;
		expect(closeAt(h, 0)).toBe(100);
		expect(closeAt(h, Date.parse("2026-11-06T15:30:00.000Z"))).toBe(101);
		expect(closeAt(h, Date.parse("2026-11-07T00:00:00.000Z"))).toBe(103);
	});
});

describe("the demo market", () => {
	it("rose 3.2% since the frames' picks and is even with a pick made today", () => {
		expect(demoMarketMoveSince(new Date(2026, 4, 8).getTime(), NOW)).toBe(3.2);
		expect(demoMarketMoveSince(new Date(2026, 6, 8).getTime(), NOW)).toBe(3.2);
		expect(demoMarketMoveSince(NOW, NOW)).toBe(0);
		const mid = demoMarketMoveSince(NOW - 30 * DAY, NOW);
		expect(mid).toBeGreaterThan(0);
		expect(mid).toBeLessThan(3.2);
		// NVDA's +24.0% since May 8 is the frame's "+20.8% ahead" (2:902)
		const gain = ((122.1 - 98.5) / 98.5) * 100;
		expect(signedPct(gain - demoMarketMoveSince(new Date(2026, 4, 8).getTime(), NOW))).toBe("+20.8%");
	});
});

/** The guest persona's ledger as usePortfolio reads it (demo quotes). */
function seedLedger(): LedgerInput {
	const seed = seedGuest();
	return {
		cash: seed.cash,
		positions: seed.positions.map((p) => ({ ...p, price: demoQuote(p.ticker)!.price })),
		sold: seed.sold,
		offBook: personaOffBook(),
	};
}
function demoHistories(ledger: LedgerInput, range: (typeof HISTORY_RANGES)[number], now = NOW): Record<string, PriceHistory> {
	const out: Record<string, PriceHistory> = {};
	for (const t of [...ledger.positions.map((p) => p.ticker), ...ledger.sold.map((s) => s.ticker)]) {
		const h = demoPriceHistory(t, range, demoQuote(t), now);
		if (h) out[t] = h;
	}
	return out;
}

describe("the ledger (D5)", () => {
	it("seeds the persona on the frames' figures: $8,800 cash, $10,240 value, +$240 all time", () => {
		const seed = seedGuest();
		expect(seed.cash).toBe(GUEST_SEED_CASH);
		expect(seed.cash).toBe(8800);
		expect(seed.unlisted).toBe(true);
		const ob = personaOffBook();
		// RE-DERIVED (N30.7, the exact seed, 2026-11-09): the six listed picks are worth the frames' $658.00 for $600.00
		// (were $657.99 for $600.04 on four-decimal shares), so the off-book holding is $782.00 on a $604.00 stake (was
		// $782.01 on $603.96): it absorbs the cents and the totals below do not move
		expect(ob).toMatchObject({ value: 782, stake: 604, picks: 6 });
		const ledger = seedLedger();
		const listed = Math.round(ledger.positions.reduce((s, p) => s + Math.round(p.shares * p.price * 100) / 100, 0) * 100) / 100;
		expect(Math.round((ledger.cash + listed + ob.value) * 100) / 100).toBe(FRAMES_VALUE);
	});

	it("moves a stored old-seed persona by the seed's own $604, once", () => {
		const old = { ...seedGuest(), cash: LEGACY_SEED_CASH, sold: seedGuest().sold.map(({ addedAt: _, ...s }) => s) } as Record<string, unknown>;
		delete old.unlisted;
		expect(migrateGuest(old)).toMatchObject({ cash: 8800, unlisted: true, sold: seedGuest().sold });
		// a ledger that grew from the old seed (a $100 buy) keeps what it did
		expect(migrateGuest({ ...old, cash: LEGACY_SEED_CASH - 100 })).toMatchObject({ cash: 8700, unlisted: true });
		// a state that already carries the field is left alone
		const current = { ...seedGuest(), cash: 1234 };
		expect(migrateGuest(current)).toBe(current);
		// a hand-made state (not the persona's sales) keeps its cash and holds no unlisted picks
		expect(migrateGuest({ cash: 10000, positions: [], sold: [] })).toEqual({ cash: 10000, positions: [], sold: [], unlisted: false, seedRev: 2 });
		expect(migrateGuest(null)).toBeNull();
	});

	it("never leaves a heavily spent old persona with negative cash: the shortfall comes out of its unlisted picks", () => {
		// a browser that spent more than $8,800 under the old seed holds less than the $604 the seed moved (review 1, low)
		const old = { ...seedGuest(), cash: 300 } as Record<string, unknown>;
		delete old.unlisted;
		delete old.unlistedCut;
		const m = migrateGuest(old) as GuestState;
		expect(m).toMatchObject({ cash: 0, unlisted: true, unlistedCut: 304 });
		const full = personaOffBook();
		const ob = personaOffBookLess(m.unlistedCut);
		// the ledger totals what every migrated old persona's does: its old cash - the seed's $604 + the unlisted picks
		expect(round2(m.cash + ob.value)).toBe(round2(300 - (LEGACY_SEED_CASH - GUEST_SEED_CASH) + full.value));
		expect(ob.value).toBe(round2(full.value - 304));
		// value and stake in proportion: the same picks, fewer of them
		expect(ob.stake).toBeGreaterThan(0);
		expect(ob.value / ob.stake).toBeCloseTo(full.value / full.stake, 3);
		expect(ob).toMatchObject({ since: full.since, picks: full.picks });
		// nothing to cut when the cash covers the $604, and the persona's own holding for a cut of 0
		expect(migrateGuest({ ...old, cash: 604 })).toMatchObject({ cash: 0, unlistedCut: 0 });
		expect(migrateGuest({ ...old, cash: 0 })).toMatchObject({ cash: 0, unlistedCut: 604 });
		expect(personaOffBookLess(0)).toBe(full);
		expect(personaOffBookLess(604).value).toBeGreaterThan(0);
	});

	it("loads a stored old-seed browser through the migration", () => {
		const key = "stak.test.migrate";
		const old = { ...seedGuest(), cash: LEGACY_SEED_CASH } as Record<string, unknown>;
		delete old.unlisted;
		localStorage.setItem(key, JSON.stringify(old));
		const state = storeFor(key, seedGuest, migrateGuest).read();
		expect(state.cash).toBe(8800);
		expect(state.unlisted).toBe(true);
		localStorage.removeItem(key);
	});
});

describe("portfolioValueHistory", () => {
	it("gives the persona the frames' week: \"+$186 (+1.9%)\", ending at $10,240", () => {
		const ledger = seedLedger();
		const w = portfolioValueHistory(ledger, "1W", demoHistories(ledger, "1W"), NOW);
		expect(w.end).toBe(10240);
		expect(w.change).toBe(PERSONA_WEEK_GAIN);
		expect(w.start).toBe(10240 - PERSONA_WEEK_GAIN);
		expect(Math.round(w.change)).toBe(186);
		expect(signedPct(w.changePercent)).toBe("+1.9%");
		expect(w.source).toBe("demo");
	});

	it("starts the persona's year at its $10,000 budget, so YTD and 1Y read the frames' +$240 all time", () => {
		const ledger = seedLedger();
		for (const range of ["YTD", "1Y"] as const) {
			const h = portfolioValueHistory(ledger, range, demoHistories(ledger, range), NOW);
			expect(h.start).toBe(10000);
			expect(h.change).toBe(240);
		}
	});

	it("ends every range at today's value, oldest first, with no gaps", () => {
		const ledger = seedLedger();
		for (const range of HISTORY_RANGES) {
			const h = portfolioValueHistory(ledger, range, demoHistories(ledger, range), NOW);
			expect(h.end).toBe(10240);
			expect(h.points[h.points.length - 1]!.t).toBe(NOW);
			for (let i = 1; i < h.points.length; i++) expect(h.points[i]!.t).toBeGreaterThan(h.points[i - 1]!.t);
			for (const v of h.values) expect(Number.isFinite(v)).toBe(true);
			expect(h.values.length).toBeGreaterThan(2);
			expect(new Set(h.values).size).toBeGreaterThan(2);
		}
	});

	it("keeps the week and the value through a buy, a top-up and a sale at today's prices", () => {
		const base = seedLedger();
		const buy: LedgerInput = {
			...base,
			cash: base.cash - 100,
			positions: [...base.positions, { ticker: "PLTR", shares: Math.round((100 / 28.4) * 1e4) / 1e4, priceAtAdd: 28.4, addedAt: NOW - 60_000, price: 28.4 }],
		};
		const nvda = base.positions.find((p) => p.ticker === "NVDA")!;
		// RE-DERIVED (N30.7): the top-up as the store books it since N20d (eight decimals: $25.00 of shares); on the exact
		// seed a four-decimal 0.2048 is worth $25.01 and sat on this test's one-cent bound
		const extra = Math.round((25 / 122.1) * 1e8) / 1e8;
		const topUp: LedgerInput = {
			...base,
			cash: base.cash - 25,
			positions: base.positions.map((p) =>
				p.ticker === "NVDA"
					? { ...p, shares: p.shares + extra, priceAtAdd: 125 / (p.shares + extra), lots: [{ shares: nvda.shares, price: nvda.priceAtAdd!, at: nvda.addedAt }, { shares: extra, price: 122.1, at: NOW - 3 * DAY }] }
					: p,
			),
		};
		const msft = base.positions.find((p) => p.ticker === "MSFT")!;
		const sale: LedgerInput = {
			...base,
			cash: base.cash + Math.round(msft.shares * msft.price * 100) / 100,
			positions: base.positions.filter((p) => p.ticker !== "MSFT"),
			sold: [{ ticker: "MSFT", shares: msft.shares, proceeds: Math.round(msft.shares * msft.price * 100) / 100, pnl: 0, stake: msft.shares * 451.75, soldAt: NOW - 120_000, addedAt: msft.addedAt }, ...base.sold],
		};
		for (const ledger of [buy, topUp, sale]) {
			const w = portfolioValueHistory(ledger, "1W", demoHistories(ledger, "1W"), NOW);
			expect(Math.abs(w.end - 10240)).toBeLessThanOrEqual(0.01);
			expect(Math.abs(w.change - PERSONA_WEEK_GAIN)).toBeLessThanOrEqual(0.02);
			expect(Math.round(w.change)).toBe(186);
			expect(signedPct(w.changePercent)).toBe("+1.9%");
		}
	});

	it("counts a trade made after the clock's minute as made at the clock: the week and the rank hold", () => {
		// the hooks' clock is the minute the page mounted (useHistoryNow), so a sale or a buy a few seconds later lands
		// after `now`: it must still count, as a trade at the end of the window (review 1, high)
		const base = seedLedger();
		const saleOf = (p: LedgerInput["positions"][number], soldAt: number) => {
			const proceeds = round2(p.shares * p.price);
			const stake = round2(p.shares * (p.priceAtAdd ?? p.price));
			return { ticker: p.ticker, shares: p.shares, proceeds, pnl: round2(proceeds - stake), stake, soldAt, addedAt: p.addedAt };
		};
		const msft = base.positions.find((p) => p.ticker === "MSFT")!;
		const one: LedgerInput = {
			...base,
			cash: round2(base.cash + round2(msft.shares * msft.price)),
			positions: base.positions.filter((p) => p !== msft),
			sold: [saleOf(msft, NOW + 30_000), ...base.sold],
		};
		const all: LedgerInput = {
			...base,
			cash: round2(base.cash + base.positions.reduce((s, p) => s + round2(p.shares * p.price), 0)),
			positions: [],
			sold: [...base.positions.map((p) => saleOf(p, NOW + 20_000)), ...base.sold],
		};
		const later: LedgerInput = {
			...base,
			cash: base.cash - 100,
			positions: [...base.positions, { ticker: "HOOD", shares: Math.round((100 / 41.9) * 1e4) / 1e4, priceAtAdd: 41.9, addedAt: NOW + 40_000, price: 41.9 }],
		};
		for (const ledger of [one, all, later]) {
			const w = portfolioValueHistory(ledger, "1W", demoHistories(ledger, "1W"), NOW);
			expect(Math.abs(w.end - 10240)).toBeLessThanOrEqual(0.011);
			expect(Math.abs(w.change - PERSONA_WEEK_GAIN)).toBeLessThanOrEqual(0.011);
			expect(signedPct(w.changePercent)).toBe("+1.9%");
			expect(rankOf("week", w.changePercent)).toBe(47);
			// the line itself holds the sold shares to the end of the window: no point jumps
			for (let i = 1; i < w.values.length; i++) expect(Math.abs(w.values[i]! - w.values[i - 1]!)).toBeLessThan(60);
		}
	});

	it("keeps the persona's 1D change at its listed picks' day move, whatever the hour", () => {
		// the off-book picks have no quote, so they hold still over today: the 1D change is the positions' own day move
		// (usePortfolio's `today`), the same at 00:30 as at 23:54, while the week stays the frames' (review 1, medium)
		const ledger = seedLedger();
		const today = round2(seedGuest().positions.reduce((s, p) => s + round2(p.shares * demoQuote(p.ticker)!.change), 0));
		const midnight = new Date(2026, 10, 7).getTime();
		const changes: number[] = [];
		for (const hour of [0.5, 1.5, 9.5, 12, 16, 20, 23.5, 23.9]) {
			const now = midnight + hour * 3_600_000;
			const d = portfolioValueHistory(ledger, "1D", demoHistories(ledger, "1D", now), now);
			const w = portfolioValueHistory(ledger, "1W", demoHistories(ledger, "1W", now), now);
			expect(d.end).toBe(10240);
			expect(Math.abs(d.change - today)).toBeLessThanOrEqual(0.03);
			expect(w.change).toBe(PERSONA_WEEK_GAIN);
			changes.push(d.change);
		}
		expect(Math.max(...changes) - Math.min(...changes)).toBeLessThanOrEqual(0.01);
	});

	it("starts a position bought inside the range at what it cost (no step at the purchase)", () => {
		const bought = NOW - 10 * DAY;
		const ledger: LedgerInput = { cash: 900, positions: [{ ticker: "NVDA", shares: 1, priceAtAdd: 80, addedAt: bought, price: 122.1 }], sold: [], offBook: null };
		const h = portfolioValueHistory(ledger, "1M", demoHistories(ledger, "1M"), NOW);
		const before = h.points.filter((p) => p.t < bought);
		const after = h.points.filter((p) => p.t >= bought);
		expect(before.every((p) => p.value === 980)).toBe(true);
		expect(after[0]).toEqual({ t: bought, value: 980 });
		expect(h.end).toBe(1022.1);
	});

	it("is a flat line at the cash when nothing was held", () => {
		const h = portfolioValueHistory({ cash: 10000, positions: [], sold: [], offBook: null }, "1M", {}, NOW);
		expect(h.source).toBe("cash");
		expect(h.change).toBe(0);
		expect(new Set(h.values)).toEqual(new Set([10000]));
	});

	it("anchors a migrated, heavily spent browser's week to its own ledger: about +1.9% and #47, never #1 (review 2, low 4)", () => {
		// an old-seed browser stored with $300 cash: migrated to $0 cash and a holding cut by $304 (fix round 1); its week
		// used to be the holding's own 27% on a ledger a tenth of the persona's: "+$119 (+11.7%)", #1, beside -$8,864
		const migrated = (oldCash: number) => {
			const old = { ...seedGuest(), cash: oldCash } as Record<string, unknown>;
			delete old.unlisted;
			delete old.unlistedCut;
			delete old.touched;
			const m = sanitize(seedGuest(), migrateGuest(old)) as GuestState;
			const ob = personaOffBookLess(m.unlistedCut);
			const ledger: LedgerInput = { cash: m.cash, positions: m.positions.map((p) => ({ ...p, price: demoQuote(p.ticker)!.price })), sold: m.sold, offBook: ob };
			return { m, ob, ledger, week: portfolioValueHistory(ledger, "1W", demoHistories(ledger, "1W"), NOW) };
		};
		const spent = migrated(300);
		expect(spent.ob.cut).toBe(304);
		expect(spent.week.end).toBe(1136);
		expect(round2(spent.week.end - 10000)).toBe(-8864);
		// the ledger's week is the persona's in proportion to its value against the frames' $10,240
		expect(spent.week.change).toBe(round2((PERSONA_WEEK_GAIN * 1136) / FRAMES_VALUE));
		expect(spent.week.change).toBe(20.66);
		expect(signedPct(spent.week.changePercent)).toBe("+1.9%");
		expect(rankOf("week", spent.week.changePercent)).toBe(47);
		// 1D stays the listed picks' own day move, and no range steps
		const day = portfolioValueHistory(spent.ledger, "1D", demoHistories(spent.ledger, "1D"), NOW);
		// RE-DERIVED (N30.7): the six listed picks' day move on the exact seed's shares is $10.45 (was $10.44 on the
		// four-decimal shares)
		expect(day.change).toBe(10.45);
		for (const range of HISTORY_RANGES) {
			const hs = demoHistories(spent.ledger, range);
			const h = portfolioValueHistory(spent.ledger, range, hs, NOW);
			expect(h.end).toBe(1136);
			// RE-DERIVED (N21, 2026-11-09). Before: no two neighbouring points of any range were $5 apart (the picks' series
			// were smooth shapes). Now the six listed picks walk ($658 of them: up to $22 between two daily closes), so the
			// bound is what it protects: beyond its picks' own moves between two moments, the ledger never steps by $5
			// RE-DERIVED again (N25, 2026-11-09). The off-book holding walks too now (a basket's 1.04% a day on its $478: a
			// few dollars between two daily closes, more on the week's climb; it was a smooth shape), so its own move
			// between the two moments joins the bound: beyond its PARTS' own moves the ledger never steps by $5
			const picksMove = (a: number, b: number) => spent.ledger.positions.reduce((sum, p) => sum + p.shares * Math.abs(closeAt(hs[p.ticker]!, b) - closeAt(hs[p.ticker]!, a)), 0);
			const holdingMove = (a: number, b: number) => Math.abs(offBookValueAt(spent.ob, b, NOW, 1136) - offBookValueAt(spent.ob, a, NOW, 1136));
			for (let i = 1; i < h.points.length; i++) {
				const a = h.points[i - 1]!;
				const b = h.points[i]!;
				expect(Math.abs(b.value - a.value)).toBeLessThan(5 + picksMove(a.t, b.t) + holdingMove(a.t, b.t));
			}
		}
		// the whole holding cut ($0 old cash) and the boundary where the old cash just covered the seed's $604 (no cut,
		// the whole holding on a $1,440 ledger: +14.9% / #1 under a cut-only rule) read the same way
		for (const [oldCash, end] of [
			[0, 836],
			[604, 1440],
		] as const) {
			const m = migrated(oldCash);
			expect(m.week.end).toBe(end);
			expect(signedPct(m.week.changePercent)).toBe("+1.9%");
			expect(rankOf("week", m.week.changePercent)).toBe(47);
		}
		// every real persona ledger is worth the frames' $10,240: the persona's own week is untouched (+$186.25, #47)
		const persona = seedLedger();
		const w = portfolioValueHistory(persona, "1W", demoHistories(persona, "1W"), NOW);
		expect(w.change).toBe(PERSONA_WEEK_GAIN);
		expect(rankOf("week", w.changePercent)).toBe(47);
		expect(personaOffBook().cut).toBeUndefined();
		// a ledger worth more than the frames' keeps the persona's anchored week, never more
		const richer: LedgerInput = { ...persona, cash: persona.cash + 5000 };
		expect(portfolioValueHistory(richer, "1W", demoHistories(richer, "1W"), NOW).change).toBe(PERSONA_WEEK_GAIN);
		// with the ledger's value the holding's own week is at most the ledger's whole anchored week ($20.66: it carries
		// what the listed picks do not); the pure path without it stands in the holding's own proportion (as before)
		const weekAgo = NOW - 7 * DAY;
		const withLedger = offBookValueAt(spent.ob, weekAgo, NOW, 1136);
		expect(withLedger).toBeGreaterThan(spent.ob.value - 20.66);
		expect(withLedger).toBeLessThanOrEqual(spent.ob.value);
		expect(offBookValueAt(spent.ob, weekAgo, NOW)).toBeLessThan(withLedger);
	});

	it("draws the off-book picks as one path from their stake to their value", () => {
		const ob = personaOffBook();
		expect(offBookValueAt(ob, ob.since - 1, NOW)).toBe(ob.stake);
		expect(offBookValueAt(ob, ob.since, NOW)).toBeCloseTo(ob.stake, 6);
		expect(offBookValueAt(ob, NOW, NOW)).toBe(ob.value);
		const weekStart = NOW - 7 * DAY;
		expect(offBookValueAt(ob, weekStart - 1, NOW)).toBeCloseTo(offBookValueAt(ob, weekStart, NOW), 3);
		expect(offBookValueAt(ob, NOW - 1, NOW)).toBeCloseTo(ob.value, 3);
		// flat over today (from local midnight): no quote moves it
		const midnight = new Date(2026, 10, 7).getTime();
		expect(offBookValueAt(ob, midnight, NOW)).toBe(ob.value);
		expect(offBookValueAt(ob, midnight - 1, NOW)).toBeCloseTo(ob.value, 3);
		// continuous: no step between moments a minute apart over the last week
		let prev = offBookValueAt(ob, weekStart, NOW);
		for (let t = weekStart + 60_000; t <= NOW; t += 60_000) {
			const v = offBookValueAt(ob, t, NOW);
			expect(Math.abs(v - prev)).toBeLessThan(0.5);
			prev = v;
		}
	});
});

describe("the board (D4)", () => {
	it("ranks the persona's week, the frames' +1.9%, at #47", () => {
		expect(rankOf("week", (PERSONA_WEEK_GAIN / (10240 - PERSONA_WEEK_GAIN)) * 100)).toBe(47);
		expect(rankOf("week", (186 / 10054) * 100)).toBe(47);
		expect(rankOf("week", 1.9)).toBe(47);
		expect(rankOf("week", 186 / 102.4)).toBe(47);
		expect(rankOf("week", SHOWCASE_STANDING.week.pct)).toBe(SHOWCASE_STANDING.week.rank);
		expect(signedPct(SHOWCASE_STANDING.week.pct)).toBe("+1.9%");
	});

	it("follows the return: better return, better rank, from #1 to the last place", () => {
		expect(rankOf("week", 9.5)).toBe(1);
		expect(rankOf("week", 9.4)).toBe(1);
		expect(rankOf("week", 5.0)).toBe(5);
		expect(rankOf("week", -50)).toBe(FIELD_SIZE + 1);
		let last = 0;
		for (let r = 12; r >= -12; r -= 0.05) {
			const rank = rankOf("week", r);
			expect(rank).toBeGreaterThanOrEqual(last);
			last = rank;
		}
		expect(boardReturns("week")).toHaveLength(FIELD_SIZE);
		expect(boardReturns("allTime")).toHaveLength(FIELD_SIZE);
	});

	it("lists the five leaders, and You among them when You beats one (every rank once)", () => {
		const alone = boardFor("week", null);
		expect(alone.rows.map((r) => [r.rank, r.name, r.returnPct])).toEqual(LEADERS.map((l, i) => [i + 1, l.name, l.week]));
		expect(alone.you).toBeNull();
		const fifth = boardFor("week", { returnPct: 5.0 });
		expect(fifth.youInRows).toBe(true);
		expect(fifth.rows.map((r) => `${r.rank} ${r.name}`)).toEqual(["1 Amara O.", "2 Tunde A.", "3 Zoe K.", "4 Malik R.", "5 You", "6 Ivy C."]);
		const below = boardFor("week", { returnPct: 1.85 });
		expect(below.youInRows).toBe(false);
		expect(below.rows).toHaveLength(5);
		expect(below.you?.rank).toBe(47);
	});

	it("re-ranks the leaders by their all-time return on 'All time'", () => {
		const all = boardFor("allTime", { returnPct: 2.4 });
		expect(all.rows.map((r) => r.name)).toEqual(["Zoe K.", "Amara O.", "Ivy C.", "Tunde A.", "Malik R."]);
		expect(all.you?.rank).toBe(rankOf("allTime", 2.4));
		expect(all.you!.rank).toBeGreaterThan(5);
	});

	it("leaves an account with no trade unranked, and, while the week loads, prints the all-time figure with NO week rank", () => {
		const none = standingFrom({ ranked: false, week: { change: 0, pct: 0 }, allTime: { change: 0, pct: 0 } });
		expect(none.week.rank).toBeNull();
		expect(none.allTime.rank).toBeNull();
		// the week's text falls back to all time (the phones: PaperPortfolio.kt:117-119), but the all-time return is never
		// ranked on the week board (review 2: it read #35 for a second, then #47); the all-time rank is its own
		const loading = standingFrom({ ranked: true, week: null, allTime: { change: 240, pct: 2.4 } });
		expect(loading.week).toEqual({ change: 240, pct: 2.4, rank: null });
		expect(loading.allTime.rank).toBe(rankOf("allTime", 2.4));
		expect(rankOf("week", 2.4)).toBe(35); // what the fallback used to print
	});
});

describe("the store and the browser's storage (review 2, high)", () => {
	it("re-reads a stored state changed behind its back (another document, a back/forward-cache restore) and leaves an unchanged one alone", () => {
		const key = "stak.test.bfcache";
		const store = storeFor(key, () => ({ cash: 1, note: "seed" }));
		let calls = 0;
		store.subscribe(() => calls++);
		expect(store.read().cash).toBe(1);
		// another document of the site wrote the key (a tab, or the document shown before this one came back from the
		// bfcache): the listeners hear it once and the next read is the stored state
		localStorage.setItem(key, JSON.stringify({ cash: 2, note: "another document" }));
		window.dispatchEvent(new StorageEvent("storage", { key }));
		expect(calls).toBe(1);
		expect(store.read()).toEqual({ cash: 2, note: "another document" });
		// the same text again, another key, a plain navigation's pageshow: nothing changed, the same snapshot, no notice
		const snap = store.read();
		window.dispatchEvent(new StorageEvent("storage", { key }));
		window.dispatchEvent(new StorageEvent("storage", { key: "stak.unrelated" }));
		window.dispatchEvent(pageshowEvent(false));
		expect(calls).toBe(1);
		expect(store.read()).toBe(snap);
		// this document restored from the back/forward cache after a later document wrote the key: the stored state wins
		localStorage.setItem(key, JSON.stringify({ cash: 3, note: "a later document" }));
		window.dispatchEvent(pageshowEvent(true));
		expect(calls).toBe(2);
		expect(store.read()).toEqual({ cash: 3, note: "a later document" });
		// the key removed elsewhere (a reset, or storage cleared: key null): back to the seed
		localStorage.removeItem(key);
		window.dispatchEvent(new StorageEvent("storage", { key: null }));
		expect(calls).toBe(3);
		expect(store.read()).toEqual({ cash: 1, note: "seed" });
		// its own writes are not re-read as changes
		store.update({ cash: 5 });
		const own = store.read();
		window.dispatchEvent(new StorageEvent("storage", { key }));
		expect(store.read()).toBe(own);
		expect(calls).toBe(4);
		localStorage.removeItem(key);
	});
});

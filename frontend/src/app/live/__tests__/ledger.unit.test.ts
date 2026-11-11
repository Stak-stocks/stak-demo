/**
 * The ledger's own rules (fix round of 2026-11-09 on the hunt's findings; coordinator rulings N23s, N27b-e, N29d, N30.7,
 * N30.8p-s): the seed made exact, what migrateGuest does for a browser that stored the four-decimal seed, the sale
 * record as its own arithmetic, the lot accessor, the taste's lessons, calendar months, the coin's letter, the sentence
 * about prices, and the inbox rows built from lots and sale records.
 * Round 3 (the reviews' follow-ups F1-F4, F8, F9): a sale records the buys it sold, a stored pick that holds nothing is
 * dropped, the brief's companies live in the live layer, an account's sale is one sum, one display name per company.
 */
import { beforeAll, describe, expect, it } from "vitest";
// a test may read a page area; the live modules may not (N32e): these guard the lists and sums the live layer keeps
import { articleById } from "@/app/news/articles";
import { newsListing } from "@/app/news/data";
import { salePreview } from "@/app/simulate/figures";
import { roundShares } from "@/lib/utils";
import { BRIEF_COMPANIES } from "../brief";
import { companyInitial, companyName, loadCatalog, tickerLine } from "../catalog";
import { defaultTip } from "../deck";
import { DEMO_QUOTES } from "../demoQuotes";
import { ago, calendarMonthsBetween, money, monthYear, round2, round4, round8, shares4 } from "../format";
import { type GuestState, type Lot, type Position, type SoldEntry, FRAMES_CREATED_AT, GUEST_SEED_CASH, migrateGuest, sanitize, SEED_PICKS, SEED_REV, seedGuest } from "../guest";
import {
	accountSale,
	averageCost,
	costOf,
	FRAMES_VALUE,
	heldLots,
	keptLots,
	lotsAfterSale,
	paperSale,
	paperShares,
	PERSONA_BUDGET,
	personaOffBook,
	personaOffBookLess,
	positionLots,
	saleRecord,
	soldLots,
} from "../ledger";
import { briefLine, briefTickers, deriveNotices, movesFrom, NOTICE_COPY } from "../notifications";
import { checkSell } from "../orders";
import { positionRow } from "../portfolio";
import { PRICE_LEAD, pricesOnScreen } from "../prices";
import { demoQuote } from "../quotes";
import { teach } from "../store";

beforeAll(() => loadCatalog());

const on = (month: number, day: number, year = 2026) => new Date(year, month - 1, day).getTime();
const priceOf = (t: string) => DEMO_QUOTES[t]!.price;
const worth = (p: { ticker: string; shares: number }) => round2(p.shares * priceOf(p.ticker));

/** The six listed picks as the seed held them until 2026-11-09 (four-decimal shares, two-decimal pick-day prices). */
const LEGACY: Position[] = [
	{ ticker: "NVDA", shares: 1.0152, priceAtAdd: 98.5, addedAt: on(5, 8) },
	{ ticker: "TSLA", shares: 0.4749, priceAtAdd: 210.59, addedAt: on(5, 20) },
	{ ticker: "AMD", shares: 0.6756, priceAtAdd: 148.02, addedAt: on(6, 2) },
	{ ticker: "AAPL", shares: 0.4622, priceAtAdd: 216.37, addedAt: on(6, 24) },
	{ ticker: "JPM", shares: 0.4932, priceAtAdd: 202.75, addedAt: on(7, 1) },
	{ ticker: "MSFT", shares: 0.2214, priceAtAdd: 451.75, addedAt: on(7, 8) },
];
/** A browser's stored state from before the exact seed: no `seedRev`, the legacy picks, July 1 as its account day. */
function storedBefore(patch: Partial<GuestState> = {}): Record<string, unknown> {
	const { seedRev: _rev, taught: _taught, ...rest } = { ...seedGuest(), createdAt: FRAMES_CREATED_AT, positions: LEGACY.map((p) => ({ ...p })), ...patch };
	return rest;
}
/** A ledger's total as usePortfolio adds it up: cash + each listed pick to the cent + the off-book holding. */
const total = (s: Pick<GuestState, "cash" | "positions" | "unlistedCut">, offBook = personaOffBookLess(s.unlistedCut).value) =>
	round2(s.cash + round2(s.positions.reduce((sum, p) => sum + worth(p), 0)) + offBook);

describe("the seed, made exact (N27b, N23b, N30.7)", () => {
	it("holds each listed pick worth exactly the frame's dollars for exactly the frame's $100.00 stake", () => {
		const seed = seedGuest();
		// Portfolio 2:743 (src/app/simulate/data.ts portfolio.rows): the gain each row prints
		const frames: Record<string, number> = { NVDA: 24, TSLA: 18, AMD: 11, AAPL: 6, JPM: 2, MSFT: -3 };
		expect(seed.positions.map((p) => p.ticker)).toEqual(Object.keys(frames));
		for (const p of seed.positions) {
			const row = positionRow(p, demoQuote(p.ticker));
			expect(row.stake).toBe(100);
			expect(row.value).toBe(100 + frames[p.ticker]!);
			expect(row.gain).toBe(frames[p.ticker]!);
			expect(row.pct).toBeCloseTo(frames[p.ticker]!, 5); // "+24.0%": from the prices, the same figure
			expect(round8(p.shares)).toBe(p.shares); // eight decimals of a share
			expect(p.lots).toBeUndefined(); // one lot, through the accessor
			expect(positionLots(p)).toEqual([{ shares: p.shares, price: p.priceAtAdd, at: p.addedAt }]);
		}
		expect(SEED_PICKS.map((p) => p.worth)).toEqual([124, 118, 111, 106, 102, 97]);
	});

	it("lets the per-share figures follow: NVDA is 1.0156 shares picked at $98.47 (the frame prints 1.0152 and $98.50)", () => {
		const nvda = seedGuest().positions[0]!;
		expect(nvda.shares).toBe(1.01556102);
		expect(shares4(nvda.shares)).toBe("1.0156");
		expect(money(nvda.priceAtAdd!)).toBe("$98.47");
		// the frame's own three figures do not agree to the cent: the dollars win
		expect(round2(1.0152 * 122.1)).toBe(123.96);
		// the other five keep the pick-day prices they always printed
		expect(seedGuest().positions.slice(1).map((p) => money(p.priceAtAdd!))).toEqual(["$210.59", "$148.02", "$216.37", "$202.75", "$451.75"]);
		expect(seedGuest().positions.map((p) => p.shares)).toEqual([1.01556102, 0.47484909, 0.67559343, 0.46217571, 0.49323017, 0.22136011]);
	});

	it("keeps the totals: $10,240.00, +$240.00 all time, 12 picks, the two SOLD rows' dollars; the off-book holding absorbs the cents", () => {
		const seed = seedGuest();
		expect(seed.cash).toBe(GUEST_SEED_CASH);
		expect(round2(seed.positions.reduce((s, p) => s + worth(p), 0))).toBe(658); // was $657.99
		expect(personaOffBook()).toMatchObject({ value: 782, stake: 604, picks: 6 }); // was $782.01 on $603.96
		expect(total(seed)).toBe(FRAMES_VALUE);
		expect(round2(total(seed) - PERSONA_BUDGET)).toBe(240);
		expect(seed.positions.length + personaOffBook().picks).toBe(12);
		expect(seed.sold.map((s) => [s.ticker, s.pnl, s.proceeds, s.stake])).toEqual([
			["SHOP", 12, 112, 100],
			["COIN", -8, 92, 100],
		]);
		// a year ago the ledger was exactly its budget: every stake and the two closed picks' results back in cash
		const stakes = seed.positions.reduce((s, p) => s + costOf(p.shares, p.priceAtAdd), 0);
		const closed = seed.sold.reduce((s, x) => s + (x.stake - x.proceeds), 0);
		expect(round2(seed.cash + stakes + personaOffBook().stake + closed)).toBe(PERSONA_BUDGET);
	});

	it("credits the frame's dollars on the first sale from the showcase: $124.00 for NVDA, +$24.00 (ST-02)", () => {
		const nvda = seedGuest().positions[0]!;
		// the sheet's All asks for the holding as it is shown (four decimals)
		const all = paperSale(nvda.shares, round4(nvda.shares), 122.1);
		expect(all).toEqual({ shares: 1.01556102, remaining: 0, proceeds: 124 });
		expect(saleRecord(nvda, all, 122.1, 1)).toMatchObject({ proceeds: 124, stake: 100, pnl: 24, closed: true, price: 122.1 });
		// the default 50%: the $62.00 the sheet promises (the four-decimal seed credited $61.98)
		const half = paperSale(nvda.shares, nvda.shares * 0.5, 122.1);
		expect(half.proceeds).toBe(62);
		expect(saleRecord(nvda, half, 122.1, 1)).toMatchObject({ proceeds: 62, stake: 50, pnl: 12, closed: false });
		// every listed pick, sold whole: the frame's worth and the frame's gain
		for (const p of seedGuest().positions) {
			const pick = SEED_PICKS.find((x) => x.ticker === p.ticker)!;
			const sale = paperSale(p.shares, round4(p.shares), priceOf(p.ticker));
			expect(saleRecord(p, sale, priceOf(p.ticker), 1)).toMatchObject({ proceeds: pick.worth, stake: pick.stake, pnl: pick.worth - pick.stake, closed: true });
		}
	});

	it("opens the persona's account before its first trade: April 2026 (N23s)", () => {
		const seed = seedGuest();
		const first = Math.min(...seed.positions.map((p) => p.addedAt), ...seed.sold.map((s) => s.addedAt ?? s.soldAt));
		expect(first).toBe(on(4, 28)); // SHOP, bought April 28
		expect(seed.createdAt).toBeLessThan(first);
		expect(monthYear(seed.createdAt)).toBe("April 2026");
		expect(monthYear(FRAMES_CREATED_AT)).toBe("July 2026"); // the frame's line, kept for the untouched showcase (store.ts)
	});
});

describe("migrateGuest: a browser that stored the four-decimal seed does not jump", () => {
	const load = (stored: Record<string, unknown>) => sanitize(seedGuest(), migrateGuest(stored)) as GuestState;
	/** the same ledger's total as the build before the exact seed showed it (the old off-book holding: $782.01) */
	const totalBefore = (s: Record<string, unknown>) => {
		const cut = (s.unlistedCut as number | undefined) ?? 0;
		return total(s as unknown as GuestState, cut > 0 ? round2(Math.max(0, 782.01 - cut)) : 782.01);
	};

	it("an UNTOUCHED old seed becomes the exact seed: still the showcase, and its first sale credits what the sheet promises", () => {
		const old = storedBefore();
		expect(totalBefore(old)).toBe(10240);
		const now = load(old);
		expect(now.positions).toEqual(seedGuest().positions);
		expect(now).toMatchObject({ unlistedCut: 0, seedRev: SEED_REV, touched: false, cash: 8800, createdAt: seedGuest().createdAt });
		expect(total(now)).toBe(10240);
	});

	it("a TOUCHED old seed that still holds all six (the hunt's seed-touched.js) becomes the exact persona, total unchanged", () => {
		const now = load(storedBefore({ touched: true }));
		expect(now.positions).toEqual(seedGuest().positions);
		expect(now.unlistedCut).toBe(0);
		expect(now.touched).toBe(true);
		expect(total(now)).toBe(10240);
		// the rows are the frames' again: NVDA +$24.00 (read +$23.96), JPM +$2.00 (read +$1.99)
		expect(positionRow(now.positions[0]!, demoQuote("NVDA")).gain).toBe(24);
		expect(positionRow(now.positions[4]!, demoQuote("JPM")).gain).toBe(2);
	});

	it("keeps the total to the cent when a seed pick was sold, topped up or part sold under the old seed", () => {
		// NVDA sold whole under the old seed: $123.96 went to cash
		const sold = storedBefore({ touched: true, cash: 8923.96, positions: LEGACY.slice(1) });
		expect(totalBefore(sold)).toBe(10240);
		const a = load(sold);
		expect(a.positions).toEqual(seedGuest().positions.slice(1));
		expect(a.cash).toBe(8923.96);
		expect(a.unlistedCut).toBe(-0.04); // the off-book holding carries the four cents the missing pick would have moved
		expect(personaOffBookLess(a.unlistedCut).value).toBe(782.04);
		expect(total(a)).toBe(10240);

		// TSLA topped up ($25 at $248.50) and JPM part sold under the old seed: both stay exactly as they are
		const tsla: Position = { ticker: "TSLA", shares: round8(0.4749 + paperShares(25, 248.5)), priceAtAdd: 217.3, addedAt: on(5, 20), lots: [{ shares: 0.4749, price: 210.59, at: on(5, 20) }, { shares: paperShares(25, 248.5), price: 248.5, at: on(11, 9) }] };
		const jpm: Position = { ticker: "JPM", shares: 0.2466, priceAtAdd: 202.75, addedAt: on(7, 1) };
		const jpmBack = round2(round2(0.4932 * 206.8) - round2(0.2466 * 206.8));
		const mixed = storedBefore({ touched: true, cash: round2(8800 - 25 + jpmBack), positions: [LEGACY[0]!, tsla, LEGACY[2]!, LEGACY[3]!, jpm, LEGACY[5]!] });
		const before = totalBefore(mixed);
		const b = load(mixed);
		expect(b.positions[1]).toEqual(tsla);
		expect(b.positions[4]).toEqual(jpm);
		expect(b.positions[0]).toEqual(seedGuest().positions[0]);
		expect(total(b)).toBe(before);
		expect(Math.abs(b.unlistedCut)).toBeLessThan(0.05);
	});

	it("keeps an earlier cut (a browser that had spent nearly everything) and runs once", () => {
		const spent = storedBefore({ touched: true, cash: 0, unlistedCut: 304 });
		const before = totalBefore(spent);
		const m = migrateGuest(spent) as Record<string, unknown>;
		expect(m.unlistedCut).toBe(304);
		expect(total(load(spent))).toBe(before);
		// a state that carries the marker is left alone: the same object back
		expect(migrateGuest(m)).toBe(m);
		const current = seedGuest();
		expect(migrateGuest(current)).toBe(current);
		// a state that is not the persona's only takes the marker
		expect(migrateGuest({ unlisted: false, cash: 10000, positions: LEGACY })).toEqual({ unlisted: false, cash: 10000, positions: LEGACY, seedRev: SEED_REV });
	});

	it("drops a stored pick that holds nothing: the cent of COST that bought 0.0000 shares can never be sold (F8)", () => {
		const cost: Position = { ticker: "COST", shares: 0, priceAtAdd: 918.2, addedAt: on(11, 9) };
		const dust: Position = { ticker: "KO", shares: 0.00000004, priceAtAdd: 63.2, addedAt: on(11, 9) };
		// as the build of the morning of 2026-11-09 stored it: already on the exact seed, the cent spent
		const stored = { ...seedGuest(), touched: true, cash: 8799.99, positions: [...seedGuest().positions, cost, dust] };
		const before = total(stored);
		expect(before).toBe(10239.99);
		const now = load(stored as unknown as Record<string, unknown>);
		// the empty pick is gone, dust above zero stays (a closing sale ends it), and nothing else moved
		expect(now.positions.map((p) => p.ticker)).toEqual(["NVDA", "TSLA", "AMD", "AAPL", "JPM", "MSFT", "KO"]);
		expect(now.positions.slice(0, 6)).toEqual(seedGuest().positions);
		expect(now.cash).toBe(8799.99);
		expect(total(now)).toBe(before);
		expect(now.saves).toEqual(stored.saves);
		// a browser still on the four-decimal seed: carried over and cleaned in the same load
		const old = storedBefore({ touched: true, cash: 8799.99, positions: [...LEGACY.map((p) => ({ ...p })), cost] });
		const carried = load(old);
		expect(carried.positions).toEqual(seedGuest().positions);
		expect(total(carried)).toBe(totalBefore(old));
		// shares that are no number above zero hold nothing either
		const broken = [{ ticker: "A", shares: Number.NaN }, { ticker: "B", shares: -1 }, { ticker: "C" }, { ticker: "D", shares: "1" }, null, "x"];
		expect((migrateGuest({ ...seedGuest(), positions: [...seedGuest().positions, ...broken] }) as GuestState).positions).toEqual(seedGuest().positions);
		// nothing to drop: the very same object back (no write, no re-render)
		const clean = { ...seedGuest(), touched: true, positions: [...seedGuest().positions, dust] };
		expect(migrateGuest(clean)).toBe(clean);
	});
});

describe("the sale record is its own arithmetic (N29d) and remembers what happened (N27c)", () => {
	it("states one gain: pnl = proceeds - stake, to the cent, for the old seed's JPM too (receipt +$1.99, SOLD row +$2.00)", () => {
		const jpm = LEGACY[4]!;
		const sale = paperSale(jpm.shares, jpm.shares, 206.8);
		const entry = saleRecord(jpm, sale, 206.8, 5);
		expect(entry).toMatchObject({ ticker: "JPM", shares: 0.4932, proceeds: 101.99, stake: 100, pnl: 1.99, soldAt: 5, addedAt: jpm.addedAt, closed: true, price: 206.8 });
		// before: pnl was rounded apart from the other two
		expect(round2(jpm.shares * (206.8 - 202.75))).toBe(2);
	});

	it("adds part sales up to the whole stake and the whole gain, whatever the portions", () => {
		for (const t of Object.keys(DEMO_QUOTES)) {
			const price = priceOf(t);
			const cost = price * 0.83; // bought lower: a gain to split
			for (const portions of [[0.5, 1], [0.25, 0.5, 1], [0.1, 0.33, 0.9, 1]]) {
				let pos: Position = { ticker: t, shares: paperShares(250, cost), priceAtAdd: cost, addedAt: 1 };
				const bought0 = pos.shares;
				const whole = { stake: costOf(pos.shares, cost), value: round2(pos.shares * price) };
				let stake = 0;
				let proceeds = 0;
				let pnl = 0;
				portions.forEach((portion, i) => {
					const sale = paperSale(pos.shares, portion === 1 ? pos.shares : round4(pos.shares * portion), price);
					const entry = saleRecord(pos, sale, price, i);
					expect(entry.pnl).toBe(round2(entry.proceeds - entry.stake));
					expect(entry.closed).toBe(i === portions.length - 1);
					// every sale, part or closing, records the buy it sold from (F1): here the position's one lot
					expect(entry.lots).toEqual([{ shares: sale.shares, price: cost, at: 1, bought: bought0 }]);
					stake = round2(stake + entry.stake);
					proceeds = round2(proceeds + entry.proceeds);
					pnl = round2(pnl + entry.pnl);
					pos = { ...pos, shares: sale.remaining, lots: lotsAfterSale(pos, sale.remaining) };
				});
				expect(stake).toBe(whole.stake);
				expect(proceeds).toBe(whole.value);
				expect(pnl).toBe(round2(whole.value - whole.stake));
			}
		}
	});
});

describe("a sale records the buys it sold (review of 2026-11-09, follow-up F1)", () => {
	const price = 122.1;
	const bought = new Date(2026, 10, 9, 9, 30).getTime();
	/** the persona's NVDA pick topped up with $25 today, as store.ts buy builds it */
	const toppedUp = (): Position => {
		const nvda = seedGuest().positions[0]!;
		const shares = paperShares(25, price);
		return { ...nvda, shares: round8(nvda.shares + shares), priceAtAdd: averageCost(nvda, shares, price), lots: [...positionLots(nvda, price), { shares, price, at: bought, bought: shares }] };
	};
	const sum = (lots: readonly Lot[]) => round8(lots.reduce((s, l) => s + l.shares, 0));
	const costOfLots = (lots: readonly Lot[]) => lots.reduce((s, l) => s + l.shares * l.price, 0);

	it("lists each buy's part of a 25 / 50 / 75 / 100% sale after a top-up: they add up to the shares and the stake sold", () => {
		const pos = toppedUp();
		expect(pos.lots).toHaveLength(2);
		expect(costOf(pos.shares, pos.priceAtAdd)).toBe(125);
		for (const portion of [0.25, 0.5, 0.75, 1]) {
			const sale = paperSale(pos.shares, portion === 1 ? round4(pos.shares) : pos.shares * portion, price);
			const entry = saleRecord(pos, sale, price, bought + 60_000);
			expect(entry.closed).toBe(portion === 1);
			const lots = entry.lots!;
			expect(lots).toHaveLength(2);
			// each entry IS that buy: its own fill price, its own time, the order's own quantity
			expect(lots.map((l) => [l.price, l.at, l.bought])).toEqual([
				[pos.lots![0]!.price, on(5, 8), 1.01556102],
				[122.1, bought, 0.2047502],
			]);
			// its shares are that buy's part of THIS sale: the same share of every lot
			lots.forEach((l, i) => expect(l.shares / pos.lots![i]!.shares).toBeCloseTo(sale.shares / pos.shares, 6));
			expect(sum(lots)).toBe(sale.shares);
			// the stake is the position's cent-rounded cost drop; the lots' own cost is that, to the cent
			expect(Math.abs(costOfLots(lots) - entry.stake)).toBeLessThan(0.0051);
			expect(entry.stake).toBe(round2(125 * portion));
			expect(soldLots(entry)).toEqual(lots);
		}
		// the 75% sale of the coordinator's flow: 0.7617 of the May pick and 0.1536 of today's top-up
		const threeQuarters = saleRecord(pos, paperSale(pos.shares, pos.shares * 0.75, price), price, bought + 60_000);
		expect(threeQuarters.lots!.map((l) => shares4(l.shares))).toEqual(["0.7617", "0.1536"]);
	});

	it("gives every share of every buy to exactly one sale: 25%, half of the rest, then the close", () => {
		let pos = toppedUp();
		const start = pos.lots!.map((l) => l.shares);
		const sold = [0, 0];
		let stake = 0;
		let shares = 0;
		[0.25, 0.5, 1].forEach((portion, i) => {
			const sale = paperSale(pos.shares, round4(pos.shares * portion), price);
			const entry = saleRecord(pos, sale, price, bought + (i + 1) * 60_000);
			expect(entry.closed).toBe(portion === 1);
			expect(sum(entry.lots!)).toBe(sale.shares);
			entry.lots!.forEach((l, k) => {
				sold[k] = sold[k]! + l.shares;
				expect(l.bought).toBe(start[k]); // the order's own quantity, whatever was sold since
			});
			stake = round2(stake + entry.stake);
			shares = round8(shares + entry.shares);
			pos = { ...pos, shares: sale.remaining, lots: lotsAfterSale(pos, sale.remaining, price) };
		});
		expect(shares).toBe(round8(start[0]! + start[1]!));
		sold.forEach((s, k) => expect(Math.abs(s - start[k]!)).toBeLessThan(1e-7));
		expect(stake).toBe(125);
	});

	it("sells a position without recorded lots from its one lot", () => {
		const nvda = seedGuest().positions[0]!;
		const half = paperSale(nvda.shares, nvda.shares * 0.5, price);
		expect(saleRecord(nvda, half, price, 5).lots).toEqual([{ shares: half.shares, price: nvda.priceAtAdd, at: nvda.addedAt, bought: nvda.shares }]);
		const all = paperSale(nvda.shares, round4(nvda.shares), price);
		expect(saleRecord(nvda, all, price, 5).lots).toEqual([{ shares: nvda.shares, price: nvda.priceAtAdd, at: nvda.addedAt, bought: nvda.shares }]);
	});

	it("reads a stored sale without lots as ONE lot: the seed's two, a part sale stored earlier, a record that knows no buy day", () => {
		const [shop, coin] = seedGuest().sold;
		expect(shop!.lots).toBeUndefined();
		expect(soldLots(shop!)).toEqual([{ shares: 1.5731, price: 100 / 1.5731, at: on(4, 28) }]);
		expect(soldLots(coin!)).toEqual([{ shares: 0.4209, price: 100 / 0.4209, at: on(5, 14) }]);
		// a part sale as the build of 17:27 on 2026-11-09 stored it: closed false, no lots
		const part: SoldEntry = { ticker: "NVDA", shares: 0.30507781, proceeds: 37.25, pnl: 6, stake: 31.25, soldAt: 9, addedAt: on(5, 8), closed: false, price: 122.1 };
		expect(soldLots(part)).toEqual([{ shares: 0.30507781, price: 31.25 / 0.30507781, at: on(5, 8) }]);
		// a record from before the ledger's anchor knows no buy day: held since before any range
		expect(soldLots({ shares: 0.05, stake: 18.1 })).toEqual([{ shares: 0.05, price: 18.1 / 0.05, at: 0 }]);
		// an empty or broken list is not a list, and a record of no shares has no lot
		expect(soldLots({ ...part, lots: [] })).toHaveLength(1);
		expect(soldLots({ ...part, lots: [{ shares: 0, price: 1, at: 1 }] })).toHaveLength(1);
		expect(soldLots({ shares: 0, stake: 0 })).toEqual([]);
	});

	it("lists no buy that gave nothing, never a negative part, and still adds up to the shares sold", () => {
		// a dust lot beside a large one: a part sale takes nothing a share can count from the dust
		const pos: Position = { ticker: "NVDA", shares: 100.00000003, priceAtAdd: 100, addedAt: 1, lots: [{ shares: 100, price: 100, at: 1, bought: 100 }, { shares: 0.00000003, price: 120, at: 2, bought: 0.00000003 }] };
		expect(saleRecord(pos, paperSale(pos.shares, 10, price), price, 3).lots).toEqual([{ shares: 10, price: 100, at: 1, bought: 100 }]);
		// three equal lots: the eighth-decimal residue lands on one part
		const thirds: Position = { ticker: "NVDA", shares: 1, priceAtAdd: 100, addedAt: 1, lots: [1, 2, 3].map((at) => ({ shares: round8(1 / 3), price: 100, at })) };
		const parts = saleRecord(thirds, paperSale(1, 0.5, 100), 100, 9).lots!;
		expect(parts.map((l) => l.shares)).toEqual([0.16666666, 0.16666667, 0.16666667]);
		expect(sum(parts)).toBe(0.5);
		// a state an older build stored (lots still at what was bought, the holding half of it): parts of what is HELD
		const stale: Position = { ticker: "NVDA", shares: 0.75, priceAtAdd: 100, addedAt: 7, lots: [{ shares: 1, price: 90, at: 7 }, { shares: 0.5, price: 120, at: 9 }] };
		expect(saleRecord(stale, paperSale(0.75, 0.75, price), price, 9).lots!.map((l) => l.shares)).toEqual([0.5, 0.25]);
		// a sale of nothing records no buy
		expect(saleRecord(pos, { shares: 0, remaining: pos.shares, proceeds: 0 }, price, 3).lots).toEqual([]);
	});
});

describe("a signed-in account's sale is one sum (follow-up F2)", () => {
	it("sells exactly what the account's document drops: the holding less its three-decimal remainder, for what the position's worth drops by (N41b)", () => {
		// RE-DERIVED (N41b, round 6's review lows 2 and 3). Until then the quantity was `asked` to four decimals and the cash
		// what that quantity was worth: the same figures wherever the document keeps a three-decimal remainder of `asked`
		expect(accountSale(0.405, 0.135, 291.3)).toEqual({ shares: 0.135, remaining: 0.27, proceeds: round2(0.135 * 291.3) });
		expect(accountSale(0.405, 0.405 / 3, 291.3)).toEqual({ shares: 0.135, remaining: 0.27, proceeds: 39.33 });
		expect(accountSale(0.405, 0.405, 291.3)).toEqual({ shares: 0.405, remaining: 0, proceeds: 117.98 });
		expect(accountSale(0.405, 9, 291.3)).toEqual({ shares: 0.405, remaining: 0, proceeds: 117.98 }); // never more than is held
		// a quarter of 0.405 is 0.10125: the document keeps roundShares(0.30375) = 0.304, so the sale is its drop, 0.101 (it
		// read 0.1013 for $29.51), and the cash what the position's worth drops by: $117.98 - $88.56
		expect(accountSale(0.405, 0.405 / 4, 291.3)).toEqual({ shares: 0.101, remaining: 0.304, proceeds: 29.42 });
		expect(accountSale(0.405, 0.405 / 4, 291.3).proceeds).toBe(round2(round2(0.405 * 291.3) - round2(0.304 * 291.3)));
		// a sale of nothing sells nothing
		for (const none of [accountSale(0, 1, 100), accountSale(0.405, 0, 100), accountSale(0.405, -0.1, 100), accountSale(0.405, 0.00004, 100), accountSale(0.405, Number.NaN, 100), accountSale(0.405, 0.2, 0), accountSale(0.405, 0.2, Number.NaN)])
			expect(none).toMatchObject({ shares: 0, proceeds: 0 });
		expect(accountSale(0.405, 0, 100).remaining).toBe(0.405);
		expect(accountSale(-1, 1, 100).remaining).toBe(0);
	});

	it("sells nothing where the document would not shrink the holding, so the store refuses it: the review's repeatable sales (N41b)", () => {
		// round 6's review (low 3): the document keeps roundShares(held - sold); where that is still the whole holding the
		// sale was accepted, credited its proceeds and left the holding as it was, so it could be repeated without end
		for (const [held, asked, price] of [
			[0.001, 0.00025, 438.2], // "Sell 25%" of 0.001 MSFT: credited $0.13 and kept 0.001
			[0.001, 0.0004, 362.1], // credited $0.14 and kept 0.001
			[0.001, 0.0005, 438.2], // half of 0.001 kept 0.001
			[0.002, 0.0005, 438.2], // a $1 buy of a $438 stock holds 0.002; a quarter of it left 0.002
			[0.5, 0.0004, 122.1],
		] as const) {
			expect(roundShares(held - asked), `${asked} of ${held}`).toBe(held);
			expect(accountSale(held, asked, price), `${asked} of ${held}`).toEqual({ shares: 0, remaining: held, proceeds: 0 });
		}
		// a holding the phones stored at four decimals: a sale whose remainder the document would round UP is no sale either
		expect(accountSale(0.2048, 0.0001, 122.1)).toEqual({ shares: 0, remaining: 0.2048, proceeds: 0 });
		// and the whole of a dust holding still closes it (orders.ts: closing is always allowed)
		expect(accountSale(0.001, 0.001, 438.2)).toEqual({ shares: 0.001, remaining: 0, proceeds: 0.44 });
	});

	it("refuses a PART sale worth less than a cent, as checkSell refuses a guest's: 0.0015 of 0.021 AMC at $4.85 (N44c)", () => {
		// round 7's review (low 2): the sheets' pre-check judges the GUEST's quantities, 0.0015 shares for $0.01, and passes
		expect(checkSell(0.0015, 0.021, 4.85)).toEqual({ ok: true });
		expect(paperSale(0.021, 0.0015, 4.85)).toMatchObject({ shares: 0.0015, proceeds: 0.01 });
		// but the account's document drops 0.001 and keeps 0.02, worth the same $0.10: the sale was booked as "0.0010 AMC
		// returned $0.00" (shares sold for nothing). Now it is the none sale, which the store refuses as "too-small"
		expect(roundShares(0.021 - 0.0015)).toBe(0.02);
		expect(round2(0.021 * 4.85)).toBe(round2(0.02 * 4.85));
		expect(accountSale(0.021, 0.0015, 4.85)).toEqual({ shares: 0, remaining: 0.021, proceeds: 0 });
		// and Simulate's sell sheet previews it as nothing (figures.ts salePreview is the same sum)
		expect(salePreview(0.021, 4.85, 0.0015 / 0.021, true)).toEqual({ shares: 0, remaining: 0.021, proceeds: 0 });
		// the review's sweep (AMC $4.85, SOFI $7.45: 925 part sales booked at $0.00), with the dearer quotes beside them:
		// every part sale the account books is worth a cent or more; one refused for it is a drop the document keeps shares
		// of, worth under a cent; a closing sale is always booked, dust included (orders.ts)
		let parts = 0;
		let refused = 0;
		let closing = 0;
		for (const price of [4.85, 7.45, 0.87, 28.4, 122.1])
			for (const held of [0.001, 0.002, 0.009, 0.021, 0.05, 0.137, 0.206, 0.405, 1.234, 3.0004])
				for (let k = 1; k <= 200; k++) {
					const asked = round4((held * k) / 200);
					const sale = accountSale(held, asked, price);
					const left = Math.max(0, roundShares(held - Math.min(asked, held)));
					if (sale.shares > 0 && sale.remaining > 0) {
						parts++;
						expect(sale.proceeds, `${asked} of ${held} at ${price}`).toBeGreaterThanOrEqual(0.01);
					} else if (sale.shares > 0) {
						closing++;
						expect(sale).toEqual({ shares: held, remaining: 0, proceeds: round2(held * price) });
					} else if (left > 0 && left < held) {
						// the document would have dropped something and kept shares: refused only for being worth under a cent
						refused++;
						expect(round2(round2(held * price) - round2(left * price)), `${asked} of ${held} at ${price}`).toBeLessThan(0.01);
					}
				}
		expect(parts).toBeGreaterThan(5000);
		expect(refused).toBeGreaterThan(100);
		expect(closing).toBeGreaterThan(50);
		// a dust holding still closes, for what it is worth: 0.001 AMC for $0.00
		expect(accountSale(0.001, 0.001, 4.85)).toEqual({ shares: 0.001, remaining: 0, proceeds: 0 });
		// a part worth a cent or more is booked as before: half of the 0.021 sells 0.01 for $0.05 and keeps 0.011
		expect(accountSale(0.021, 0.0105, 4.85)).toEqual({ shares: 0.01, remaining: 0.011, proceeds: 0.05 });
	});

	it("books $0.00 for a sale at the price paid, and the cash, the record and the document agree (N41b)", () => {
		// round 6's review (low 2): with a four-decimal quantity the record booked the document's rounding as cents of gain
		// or loss at an unchanged price: 0.069 CRWD half sold at $362.10 +$0.18, 0.205 NVDA less 0.0517 at $122.10 -$0.04
		const doc = (held: number, sold: number) => roundShares(held - sold); // AccountContext.tsx sellFromSandbox: what it keeps
		let sales = 0;
		for (const held of [0.001, 0.002, 0.069, 0.1, 0.137, 0.205, 0.405, 0.7, 1.234, 1.5, 12.345])
			for (const price of [0.87, 4.85, 55.3, 122.1, 362.1, 438.2, 918.2, 4318.55])
				for (let k = 1; k <= 200; k++) {
					const sale = accountSale(held, round4((held * k) / 200), price);
					if (!(sale.shares > 0)) continue;
					sales++;
					// the document keeps what the record keeps, and drops the position exactly when the record closes it
					expect(Math.max(0, doc(held, sale.shares))).toBe(sale.remaining);
					const pos: Position = { ticker: "NVDA", shares: held, priceAtAdd: price, addedAt: 5, lots: [{ shares: held, price, at: 5, bought: held }] };
					const record = saleRecord(pos, sale, price, 9);
					expect(record.pnl, `${sale.shares} of ${held} at ${price}`).toBe(0);
					expect(record.proceeds).toBe(sale.proceeds); // the cash the document is credited
					expect(record.closed).toBe(!(sale.remaining > 0));
					// the cost left plus the stake sold is the cost there was
					expect(round2(costOf(sale.remaining, price) + record.stake)).toBe(costOf(held, price));
				}
		expect(sales).toBeGreaterThan(10_000);
		// the review's own cases now break even
		const crwd: Position = { ticker: "CRWD", shares: 0.069, priceAtAdd: 362.1, addedAt: 5, lots: [{ shares: 0.069, price: 362.1, at: 5, bought: 0.069 }] };
		expect(accountSale(0.069, 0.0345, 362.1)).toEqual({ shares: 0.034, remaining: 0.035, proceeds: 12.31 });
		expect(saleRecord(crwd, accountSale(0.069, 0.0345, 362.1), 362.1, 9)).toMatchObject({ shares: 0.034, proceeds: 12.31, stake: 12.31, pnl: 0, closed: false });
		const nvda: Position = { ticker: "NVDA", shares: 0.205, priceAtAdd: 122.1, addedAt: 5, lots: [{ shares: 0.205, price: 122.1, at: 5, bought: 0.205 }] };
		expect(accountSale(0.205, 0.0517, 122.1)).toEqual({ shares: 0.052, remaining: 0.153, proceeds: 6.35 });
		expect(saleRecord(nvda, accountSale(0.205, 0.0517, 122.1), 122.1, 9).pnl).toBe(0);
		expect(saleRecord(nvda, accountSale(0.205, 0.2044, 122.1), 122.1, 9)).toMatchObject({ shares: 0.204, proceeds: 24.91, stake: 24.91, pnl: 0 });
		// a sale above the price paid still books what the account made: 0.051 NVDA bought at $122.10, sold at $130.00
		const up = accountSale(0.205, 0.0513, 130);
		expect(saleRecord(nvda, up, 130, 9)).toMatchObject({ shares: 0.051, proceeds: round2(round2(0.205 * 130) - round2(0.154 * 130)), stake: 6.23, pnl: 0.4 });
	});

	it("is the sum Simulate's sell sheet previews for an account (src/app/simulate/figures.ts salePreview)", () => {
		for (const held of [0.405, 1, 0.001, 12.345, 0.137])
			for (const quote of [291.3, 122.1, 0.87, 4318.55])
				for (const frac of [0.25, 0.5, 0.75, 1, 1 / 3]) expect(accountSale(held, held * frac, quote)).toEqual(salePreview(held, quote, frac, true));
	});

	it("closes the position exactly when the account's document drops it: under 0.0005 shares left (follow-up SW5)", () => {
		// the document's own rule (src/context/AccountContext.tsx sellFromSandbox): what is left, to its three decimals
		const dropped = (held: number, sold: number) => !(roundShares(held - sold) > 0);
		let closing = 0;
		let open = 0;
		for (const held of [0.001, 0.002, 0.069, 0.1, 0.3, 0.405, 0.7, 1, 1.234, 12.345])
			for (let k = 0; k <= 30; k++) {
				// every quantity from the whole holding down to 0.003 under it, a ten-thousandth at a time
				const asked = round4(held - k * 0.0001);
				const sale = accountSale(held, asked, 122.1);
				if (!(sale.shares > 0)) continue;
				expect(sale.remaining > 0, `${asked} of ${held}`).toBe(!dropped(held, sale.shares));
				// the sale is the document's own drop (N41b): the holding less what the document keeps of the sale asked for
				expect(sale.shares, `${asked} of ${held}`).toBe(round8(held - Math.max(0, roundShares(held - asked))));
				if (sale.remaining > 0) {
					open++;
					// a part sale leaves what the document keeps: its own three-decimal figure (N38c; it was round8(held - shares))
					expect(sale.remaining).toBe(roundShares(held - sale.shares));
				} else {
					closing++;
					// a closing sale sells the whole holding: nothing is dropped unpaid (N41b)
					expect(sale.shares).toBe(held);
				}
				// the cash is what the position's worth drops by (N41b; it was what round4(asked) was worth)
				expect(sale.proceeds).toBe(round2(round2(held * 122.1) - round2(sale.remaining * 122.1)));
			}
		expect(closing).toBeGreaterThan(30);
		expect(open).toBeGreaterThan(200);
		// the edges, decided by the document's own sum on the same figures: 0.0004 left is dropped; "0.0005" is kept as
		// 0.001 where the subtraction gives 0.0005000000000000004 (0.069 - 0.0685) and dropped where it gives
		// 0.0004999999999999449 (0.7 - 0.6995): the record follows the document either way. RE-DERIVED (N41b): a sale the
		// document closes sells the whole holding (0.7 for $85.47; it sold 0.6996 for $85.42 and the document dropped
		// 0.0004 unpaid), and a sale it keeps 0.001 of sells the rest (0.068; it sold 0.0685)
		expect(accountSale(0.7, 0.6996, 122.1)).toEqual({ shares: 0.7, remaining: 0, proceeds: 85.47 });
		expect(accountSale(0.069, 0.0685, 362.1)).toEqual({ shares: 0.068, remaining: 0.001, proceeds: 24.62 });
		expect(accountSale(0.7, 0.6995, 122.1)).toEqual({ shares: 0.7, remaining: 0, proceeds: 85.47 });
		expect([dropped(0.069, 0.0685), dropped(0.7, 0.6995)]).toEqual([false, true]);
		// the record of a sale that leaves 0.0003 is a closing one of the whole holding: the whole position's cost is its
		// stake and, at the price paid, it breaks even (RE-DERIVED, N41b: it sold 0.0687 for $24.88 and booked -$0.10)
		const crwd: Position = { ticker: "CRWD", shares: 0.069, priceAtAdd: 362.1, addedAt: 5, lots: [{ shares: 0.069, price: 362.1, at: 5, bought: 0.069 }] };
		const record = saleRecord(crwd, accountSale(0.069, 0.0687, 362.1), 362.1, 9);
		expect(record).toMatchObject({ ticker: "CRWD", shares: 0.069, proceeds: 24.98, stake: 24.98, pnl: 0, closed: true, lots: [{ shares: 0.069, price: 362.1, at: 5, bought: 0.069 }] });
		// THE GUEST'S RULE IS UNCHANGED: its ledger keeps eight decimals, and 0.0003 left is a holding it shows and can sell
		const guest = paperSale(0.069, 0.0687, 362.1);
		expect(guest).toMatchObject({ shares: 0.0687, remaining: 0.0003 });
		expect(saleRecord(crwd, guest, 362.1, 9).closed).toBe(false);
	});

	it("leaves exactly what the account's document keeps on a part sale: the record's stake, pnl and kept lots follow it (N38c)", () => {
		// round 5's review (low 3): a kept sale recorded round8(held - shares) where the document stores three decimals
		// (AccountContext.tsx sellFromSandbox: roundShares(total - sold)), so the stakes drifted from what the cash did.
		// RE-DERIVED (N41b): the sale is now the document's own drop, so the shares sold are three-decimal too (0.051, it
		// sold 0.0513 for $6.26; 0.068 for 0.0684 / $24.77; 0.375 for 0.3751 / $344.42)
		expect(accountSale(0.205, 0.0513, 122.1)).toEqual({ shares: 0.051, remaining: 0.154, proceeds: 6.23 });
		expect(accountSale(0.069, 0.0684, 362.1)).toEqual({ shares: 0.068, remaining: 0.001, proceeds: 24.62 });
		expect(accountSale(1.5, 0.3751, 918.2)).toEqual({ shares: 0.375, remaining: 1.125, proceeds: 344.32 });
		// the record's stake is the document's own cost drop: what was held less what the document keeps, at the cost a share
		const nvda: Position = { ticker: "NVDA", shares: 0.205, priceAtAdd: 122.1, addedAt: 5, lots: [{ shares: 0.205, price: 122.1, at: 5, bought: 0.205 }] };
		const sale = accountSale(0.205, 0.0513, 122.1);
		const record = saleRecord(nvda, sale, 122.1, 9);
		expect(record).toMatchObject({ shares: 0.051, proceeds: 6.23, stake: round2(costOf(0.205, 122.1) - costOf(0.154, 122.1)), closed: false });
		expect(record.stake).toBe(6.23); // on round8's 0.1537 it read $6.26
		// at the price paid it breaks even (N41b; with 0.0513 sold for $6.26 it booked +$0.03)
		expect(record.pnl).toBe(0);
		// so the account's books add up: the cost left plus the stake sold is the cost there was, to the cent
		expect(round2(costOf(sale.remaining, 122.1) + record.stake)).toBe(costOf(0.205, 122.1));
		// and the lots kept here hold what the document holds
		const kept = lotsAfterSale(nvda, sale.remaining, 122.1);
		expect(kept.reduce((s, l) => s + l.shares, 0)).toBe(0.154);
		// over the sweep: every kept sale leaves a quantity the document can store (three decimals), the drop rule unchanged
		for (const held of [0.205, 0.069, 1.5, 0.405, 12.345])
			for (let k = 1; k < 400; k++) {
				const s = accountSale(held, round4((held * k) / 400), 122.1);
				if (!(s.shares > 0)) continue;
				expect(s.remaining).toBe(roundShares(held - s.shares) > 0 ? roundShares(held - s.shares) : 0);
				expect(roundShares(s.remaining)).toBe(s.remaining);
			}
	});
});

describe("an account's lots, as this browser kept them (follow-up F9)", () => {
	const first = on(11, 1);
	const later = on(11, 5);
	const lots: Lot[] = [{ shares: 0.2, price: 100, at: first, bought: 0.2 }, { shares: 0.1, price: 120, at: later, bought: 0.1 }];
	it("belong to the position while they hold its first buy", () => {
		expect(keptLots(lots, first)).toEqual(lots); // a holding first met here at a top-up: the one lot is dated addedAt
		expect(keptLots(lots, first + 4_000)).toEqual(lots); // opened here: the account stamped the position a moment after the order
		// a phone whose clock runs an hour ahead dated the position after this browser's top-up: its one lot is still there
		const ahead = later + 3_600_000;
		expect(keptLots([{ shares: 0.5, price: 100, at: ahead }, { shares: 0.2, price: 122.1, at: later, bought: 0.2 }], ahead)).toHaveLength(2);
	});
	it("are an earlier position's when none of them is its first buy, and nothing when broken", () => {
		expect(keptLots(lots, on(11, 8))).toBeUndefined(); // closed and bought again where this browser did not see it
		expect(keptLots(lots, first + 11 * 60_000)).toBeUndefined();
		expect(keptLots([lots[1]!], first)).toBeUndefined(); // a later order alone is no position's first buy
		for (const broken of [undefined, null, {}, "x", [], [null], [{ shares: 0, price: 100, at: 1 }], [{ shares: 1, price: 0, at: 1 }], [{ shares: 1, price: 100 }]]) expect(keptLots(broken, 1)).toBeUndefined();
		expect(keptLots(lots, Number.NaN)).toBeUndefined(); // a position the account never dated
	});
});

describe("lots: every buy, through one accessor (N27c)", () => {
	it("reads a position without lots as one lot, and recorded lots as they are", () => {
		const one: Position = { ticker: "NVDA", shares: 1.5, priceAtAdd: 100, addedAt: 7 };
		expect(positionLots(one)).toEqual([{ shares: 1.5, price: 100, at: 7 }]);
		expect(positionLots({ ...one, priceAtAdd: null }, 122.1)).toEqual([{ shares: 1.5, price: 122.1, at: 7 }]);
		const lots = [{ shares: 1, price: 90, at: 7, bought: 1 }, { shares: 0.5, price: 120, at: 9, bought: 0.5 }];
		expect(positionLots({ ...one, lots })).toEqual(lots);
		expect(heldLots({ ...one, lots })).toEqual(lots);
		// an empty or broken list is not a list
		expect(positionLots({ ...one, lots: [] })).toHaveLength(1);
		expect(positionLots({ ...one, lots: [{ shares: 0, price: 1, at: 1 }] })).toHaveLength(1);
	});

	it("sells every lot in proportion on a part sale and keeps each order's own quantity", () => {
		const pos: Position = { ticker: "NVDA", shares: 1.5, priceAtAdd: 100, addedAt: 7, lots: [{ shares: 1, price: 90, at: 7, bought: 1 }, { shares: 0.5, price: 120, at: 9, bought: 0.5 }] };
		const after = lotsAfterSale(pos, 0.75);
		expect(after).toEqual([{ shares: 0.5, price: 90, at: 7, bought: 1 }, { shares: 0.25, price: 120, at: 9, bought: 0.5 }]);
		expect(round8(after.reduce((s, l) => s + l.shares, 0))).toBe(0.75);
		// a position that had no lots gets its one lot, remembering what was held before the sale
		expect(lotsAfterSale({ shares: 2, priceAtAdd: 50, addedAt: 3 }, 0.5)).toEqual([{ shares: 0.5, price: 50, at: 3, bought: 2 }]);
		// a state an older build stored (lots still at what was bought) is scaled to the holding
		expect(heldLots({ shares: 0.75, priceAtAdd: 100, addedAt: 7, lots: [{ shares: 1, price: 90, at: 7 }, { shares: 0.5, price: 120, at: 9 }] }).map((l) => l.shares)).toEqual([0.5, 0.25]);
	});

	it("averages the cost without rounding it, so the stake is the dollars paid", () => {
		// 300 shares of a $3.33 stock, topped up with 150 at $4.85: a two-decimal average ($3.84) made the stake $1,728.00
		const p = { shares: 300, priceAtAdd: 3.33 };
		const avg = averageCost(p, 150, 4.85);
		expect(costOf(450, avg)).toBe(round2(300 * 3.33 + 150 * 4.85));
		expect(costOf(450, round2(avg))).not.toBe(round2(300 * 3.33 + 150 * 4.85));
		expect(averageCost({ shares: 0, priceAtAdd: null }, 2, 10)).toBe(10);
	});
});

describe("taste is symmetric and idempotent (N27d, N29h; ST-07)", () => {
	const seedTaste = () => ({ tagScores: { ...seedGuest().tagScores }, taught: {} as Record<string, number> });

	it("an Unsave takes back what its Save taught: three toggles on NFLX leave the taste where it was", () => {
		let s = seedTaste();
		const start = { ...s.tagScores };
		for (let i = 0; i < 3; i++) {
			s = teach(s, "NFLX", 5);
			expect(s.tagScores).not.toEqual(start);
			expect(s.taught).toEqual({ NFLX: 5 });
			s = teach(s, "NFLX", 0);
			expect(s.tagScores).toEqual(start);
			expect(s.taught).toEqual({});
		}
	});

	it("teaches once however often it is asked: the same lesson again changes nothing", () => {
		const once = teach(seedTaste(), "NFLX", 5);
		const again = teach(once, "NFLX", 5);
		expect(again.tagScores).toBe(once.tagScores);
		expect(again.taught).toBe(once.taught);
		// a pass, then the same pass on a replayed deck
		const passed = teach(seedTaste(), "MU", -1);
		expect(teach(passed, "MU", -1).tagScores).toBe(passed.tagScores);
		// a pass that becomes a save moves by the difference, and the Unsave takes all of it back
		const saved = teach(passed, "MU", 5);
		expect(saved.taught).toEqual({ MU: 5 });
		expect(teach(saved, "MU", 0).tagScores).toEqual(seedGuest().tagScores);
	});

	it("takes nothing back for a company that never taught (the persona's seeded saves)", () => {
		const s = seedTaste();
		const after = teach(s, "MSFT", 0);
		expect(after.tagScores).toBe(s.tagScores);
		// re-saved, it teaches now, once
		const resaved = teach(after, "MSFT", 5);
		expect(resaved.tagScores).not.toEqual(s.tagScores);
		expect(teach(resaved, "MSFT", 0).tagScores).toEqual(s.tagScores);
	});
});

describe("ago: calendar months (N23s; NUM-15)", () => {
	const nov9 = new Date(2026, 10, 9, 15, 0).getTime();
	it("reads two saves a day apart alike unless a month really completes between them", () => {
		expect(ago(on(6, 12), nov9)).toBe("4 months ago"); // 150 days: read "5 months ago"
		expect(ago(on(6, 13), nov9)).toBe("4 months ago"); // 149 days
		expect(ago(on(6, 9), nov9)).toBe("5 months ago"); // the fifth month completed on Nov 9
		expect(ago(on(6, 10), nov9)).toBe("4 months ago");
		expect(ago(on(6, 4), nov9)).toBe("5 months ago");
		expect(calendarMonthsBetween(on(6, 12), nov9)).toBe(4);
		expect(calendarMonthsBetween(on(1, 31), on(3, 1))).toBe(1);
		expect(calendarMonthsBetween(nov9, on(6, 12))).toBe(0);
	});

	it("keeps days and weeks as they were, and counts years from the months", () => {
		expect(ago(nov9, nov9)).toBe("today");
		expect(ago(nov9 - 86_400_000, nov9)).toBe("yesterday");
		expect(ago(on(11, 1), nov9)).toBe("8 days ago");
		expect(ago(on(10, 20), nov9)).toBe("2 weeks ago");
		expect(ago(on(9, 9), nov9)).toBe("8 weeks ago");
		expect(ago(on(9, 5), nov9)).toBe("2 months ago"); // nine weeks: months from here on
		expect(ago(on(12, 1, 2025), nov9)).toBe("11 months ago"); // 343 days
		expect(ago(on(11, 10, 2025), nov9)).toBe("11 months ago"); // 364 days: the year completes tomorrow
		expect(ago(on(11, 9, 2025), nov9)).toBe("1 year ago");
		expect(ago(on(5, 1, 2024), nov9)).toBe("2 years ago");
	});
});

describe("the coin's letter is the ticker's (N30.8r; VIS-06)", () => {
	it("agrees with the ticker beside it, as Figma draws GOOGL and HOOD", () => {
		expect(companyInitial("GOOGL")).toBe("G"); // 2:4830, above "Alphabet"
		expect(companyInitial("HOOD")).toBe("H"); // 2:634, beside "Robinhood Markets"
		expect(companyInitial("O")).toBe("O"); // wore Realty Income's "R"
		expect(["LLY", "NOW", "KO", "XOM", "CRM", "EAT"].map(companyInitial)).toEqual(["L", "N", "K", "X", "C", "E"]);
		expect(companyInitial(" nvda ")).toBe("N");
		// no coin of the frames changes: every company the frames draw has a name that starts with its ticker's letter
		for (const t of ["NVDA", "PLTR", "COST", "TSLA", "AMD", "AAPL", "JPM", "MSFT", "SNOW", "CRWD"]) expect(companyInitial(t)).toBe(t.charAt(0));
	});
});

describe("one display name per company (N30.8f, follow-up F3; C-10)", () => {
	it("names Alphabet and Advanced Micro Devices as the frames and the phones do", () => {
		expect(companyName("GOOGL")).toBe("Alphabet"); // the catalog's entry says "Google" (Figma 2:4830, 2:3151: Alphabet)
		expect(companyName("GOOG")).toBe("Alphabet");
		expect(companyName("AMD")).toBe("Advanced Micro Devices"); // the catalog's entry repeats the ticker
		expect(companyName(" amd ")).toBe("Advanced Micro Devices");
		// every other company keeps the catalog's name; an unknown ticker is its own name
		expect(["NVDA", "AAPL", "MSFT", "O", "KO", "META"].map(companyName)).toEqual(["NVIDIA", "Apple", "Microsoft", "Realty Income", "Coca-Cola", "Meta"]);
		expect(companyName("zzzz")).toBe("ZZZZ");
	});

	it("prints the ticker once when the name is the ticker", () => {
		expect(tickerLine("AMD")).toBe("AMD · Advanced Micro Devices"); // read "AMD · AMD"
		expect(tickerLine("GOOGL")).toBe("GOOGL · Alphabet"); // read "GOOGL · Google"
		expect(tickerLine("NVDA")).toBe("NVDA · NVIDIA");
		expect(["IBM", "UPS", "SAP", "KKR"].map(tickerLine)).toEqual(["IBM", "UPS", "SAP", "KKR"]); // read "IBM · IBM"
		expect(tickerLine("META")).toBe("META · Meta"); // a name of its own
		expect(tickerLine("zzzz")).toBe("ZZZZ");
		// the coin keeps the ticker's letter whatever the name (N30.8r)
		expect([companyInitial("GOOGL"), companyInitial("AMD")]).toEqual(["G", "A"]);
	});
});

describe("which prices are on screen (N30.8g / N30.8s; C-02)", () => {
	it("knows the three cases Help & support states and gives each its sentence", () => {
		const out = pricesOnScreen({ signedIn: false, healthy: true });
		expect(out).toMatchObject({ case: "signedOut", live: false, showcase: false, real: false, lead: PRICE_LEAD.demo });
		expect(out.sentence).toBe("Signed out, STAK shows demo prices. Every number on screen is illustrative.");
		const live = pricesOnScreen({ signedIn: true, healthy: true });
		expect(live).toMatchObject({ case: "live", live: true, real: true, lead: "Prices are real." });
		expect(live.sentence).toContain("market feed");
		const offline = pricesOnScreen({ signedIn: true, healthy: false });
		expect(offline).toMatchObject({ case: "offline", live: false, real: false, lead: "These are demo prices." });
		expect(offline.sentence).toContain("unreachable");
	});

	it("leaves the frame's sentence to the untouched showcase only", () => {
		expect(pricesOnScreen({ signedIn: false, healthy: false, showcase: true })).toMatchObject({ case: "signedOut", live: false, showcase: true, real: true, lead: "Prices are real." });
		expect(pricesOnScreen({ signedIn: true, healthy: false, showcase: true })).toMatchObject({ showcase: false, real: false });
		// the deck's default tip follows it
		expect(defaultTip()).toBe("Prices are real. Small stakes make the swings easier to learn from.");
		expect(defaultTip(PRICE_LEAD.demo)).toBe("These are demo prices. Small stakes make the swings easier to learn from.");
	});
});

describe("the inbox rows come from lots and sale records (NUM-04, ST-06, C-07, C-11a)", () => {
	const now = new Date(2026, 10, 9, 14, 0).getTime();
	const today = (h: number, m = 0) => new Date(2026, 10, 9, h, m).getTime();
	const settings = { priceAlerts: false, priceThreshold: 2, dailyDeck: false, marketNews: false };
	const ctx = { moves: [], settings, now, firstName: "Hamza" };
	const base = { positions: [] as Position[], sold: [] as SoldEntry[], deck: null, completedDecks: 0, passed: [], lastBriefDate: null, saves: [], signedIn: false, offBook: personaOffBook(), createdAt: on(4, 27) };
	const rows = (live: typeof base) => deriveNotices(live, ctx).map((n) => `${n.title} · ${n.body}`);

	it("raises a top-up's own row with the order's shares and price (the frame's row is such an order)", () => {
		const nvda: Position = { ticker: "NVDA", shares: 1.22031122, priceAtAdd: 125 / 1.22031122, addedAt: on(5, 8), lots: [{ shares: 1.01556102, price: 98.47, at: on(5, 8) }, { shares: 0.2047502, price: 122.1, at: today(9, 30), bought: 0.2047502 }] };
		expect(rows({ ...base, positions: [nvda] })).toEqual(["Practice order filled · 0.2048 NVDA at $122.10 · paper"]);
		// a pick bought months ago and never topped up raises nothing
		expect(rows({ ...base, positions: seedGuest().positions })).toEqual([]);
	});

	it("never rewrites a row after later trades: buy, sell 25%, sell all, buy again (ST-06)", () => {
		const price = 362.1;
		const bought = paperShares(25, price);
		let pos: Position = { ticker: "CRWD", shares: bought, priceAtAdd: price, addedAt: today(9), lots: [{ shares: bought, price, at: today(9), bought }] };
		const order = "Practice order filled · 0.0690 CRWD at $362.10 · paper";
		expect(rows({ ...base, positions: [pos] })).toEqual([order]);
		// 25% sold
		const part = paperSale(pos.shares, round4(pos.shares * 0.25), price);
		const partEntry = saleRecord(pos, part, price, today(10));
		pos = { ...pos, shares: part.remaining, lots: lotsAfterSale(pos, part.remaining) };
		const partRow = `Sold part of CRWD · ${shares4(part.shares)} CRWD returned ${money(part.proceeds)} to your cash · paper`;
		expect(rows({ ...base, positions: [pos], sold: [partEntry] })).toEqual([order, partRow]);
		// the rest sold: the position is gone, the order row and the part sale's title stay
		const rest = paperSale(pos.shares, round4(pos.shares), price);
		const restEntry = saleRecord(pos, rest, price, today(11));
		const closeRow = `Position closed · ${shares4(rest.shares)} CRWD returned ${money(rest.proceeds)} to your cash · paper`;
		expect(rows({ ...base, positions: [], sold: [restEntry, partEntry] })).toEqual([order, closeRow, partRow]);
		// bought again: a new order row; nothing above changes
		const again = paperShares(10, price);
		const pos2: Position = { ticker: "CRWD", shares: again, priceAtAdd: price, addedAt: today(12), lots: [{ shares: again, price, at: today(12), bought: again }] };
		expect(rows({ ...base, positions: [pos2], sold: [restEntry, partEntry] })).toEqual(["Practice order filled · 0.0276 CRWD at $362.10 · paper", order, closeRow, partRow]);
		// the order of a pick that is gone opens the Portfolio, where its SOLD row is
		expect(deriveNotices({ ...base, positions: [], sold: [restEntry, partEntry] }, ctx).find((n) => n.title === "Practice order filled")!.href).toBe("/simulate/portfolio");
		expect(deriveNotices({ ...base, positions: [pos2], sold: [] }, ctx)[0]!.href).toBe("/simulate/picks/CRWD");
	});

	it("raises each order once through buy, top-up, sell 25%, sell all, buy again: a part sale's lots double no row (F1, ST-06)", () => {
		const price = 362.1;
		const first = paperShares(25, price);
		const more = paperShares(40, price);
		const list = (live: typeof base) => deriveNotices(live, ctx).map((n) => `${n.id} | ${n.title} · ${n.body}`).sort();
		let pos: Position = { ticker: "CRWD", shares: first, priceAtAdd: price, addedAt: today(9), lots: [{ shares: first, price, at: today(9), bought: first }] };
		const order = `order-CRWD-${today(9)} | Practice order filled · 0.0690 CRWD at $362.10 · paper`;
		expect(list({ ...base, positions: [pos] })).toEqual([order]);
		// topped up: its own row
		pos = { ...pos, shares: round8(pos.shares + more), priceAtAdd: averageCost(pos, more, price), lots: [...positionLots(pos, price), { shares: more, price, at: today(9, 30), bought: more }] };
		const topUp = `order-CRWD-${today(9, 30)} | Practice order filled · 0.1105 CRWD at $362.10 · paper`;
		expect(list({ ...base, positions: [pos] })).toEqual([order, topUp].sort());
		// 25% sold: the sale records both buys it sold from, and raises one row of its own, no second order row
		const part = paperSale(pos.shares, round4(pos.shares * 0.25), price);
		const partEntry = saleRecord(pos, part, price, today(10));
		expect(partEntry.lots).toHaveLength(2);
		expect(partEntry.closed).toBe(false);
		pos = { ...pos, shares: part.remaining, lots: lotsAfterSale(pos, part.remaining, price) };
		const partRow = `sold-CRWD-${today(10)} | Sold part of CRWD · ${shares4(part.shares)} CRWD returned ${money(part.proceeds)} to your cash · paper`;
		expect(list({ ...base, positions: [pos], sold: [partEntry] })).toEqual([order, topUp, partRow].sort());
		// all sold: the two orders are now read from the closing sale's lots, under the same ids and words
		const rest = paperSale(pos.shares, round4(pos.shares), price);
		const restEntry = saleRecord(pos, rest, price, today(11));
		expect(restEntry.closed).toBe(true);
		expect(restEntry.lots!.map((l) => l.bought)).toEqual([first, more]);
		const closeRow = `sold-CRWD-${today(11)} | Position closed · ${shares4(rest.shares)} CRWD returned ${money(rest.proceeds)} to your cash · paper`;
		expect(list({ ...base, positions: [], sold: [restEntry, partEntry] })).toEqual([order, topUp, partRow, closeRow].sort());
		// bought again: one new row, nothing above changes, no id twice
		const again = paperShares(10, price);
		const pos2: Position = { ticker: "CRWD", shares: again, priceAtAdd: price, addedAt: today(12), lots: [{ shares: again, price, at: today(12), bought: again }] };
		const all = list({ ...base, positions: [pos2], sold: [restEntry, partEntry] });
		expect(all).toEqual([order, topUp, partRow, closeRow, `order-CRWD-${today(12)} | Practice order filled · 0.0276 CRWD at $362.10 · paper`].sort());
		expect(new Set(all.map((r) => r.split(" | ")[0])).size).toBe(all.length);
		// a sale that carries lots but no `closed` mark (a hand-made record) raises no order row either
		const { closed: _closed, ...unmarked } = partEntry;
		expect(list({ ...base, positions: [], sold: [unmarked] }).filter((r) => r.startsWith("order-"))).toEqual([]);
	});

	it("reads a sale record from before the ruling as it was read then", () => {
		const old: SoldEntry = { ticker: "CRWD", shares: 0.05, proceeds: 18.1, pnl: 0, stake: 18.1, soldAt: today(10) };
		expect(rows({ ...base, sold: [old] })[0]).toContain("Position closed");
		expect(rows({ ...base, positions: [{ ticker: "CRWD", shares: 0.01, priceAtAdd: 362.1, addedAt: on(11, 1) }], sold: [old] })[0]).toContain("Sold part of CRWD");
	});

	it("keeps the brief's companies in the live layer, in step with the News data it no longer imports (N32e, F4)", () => {
		// News' Today's brief (src/app/news/data.ts newsListing.briefs) and each story's own company (articles.ts)
		expect(BRIEF_COMPANIES).toEqual(newsListing.briefs.map((b) => ({ story: b.id, ticker: articleById(b.id)!.ticker.symbol })));
		expect(briefTickers()).toEqual(BRIEF_COMPANIES.map((b) => b.ticker));
		// no module of the live layer reads a News file: the bell on every page would carry the stories' text
		const sources = import.meta.glob("../*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
		expect(Object.keys(sources).length).toBeGreaterThan(15);
		const offenders = Object.entries(sources).filter(([, code]) => /from\s+["'](?:@\/app\/news|\.\.\/news)/.test(code));
		expect(offenders.map(([file]) => file)).toEqual([]);
	});

	it("counts the brief's stories that touch the person's saves (C-07)", () => {
		expect(briefTickers()).toEqual(["GS", "JPM", "O"]);
		const brief = briefTickers();
		const saves = (...t: string[]) => t.map((ticker) => ({ ticker }));
		expect(briefLine(saves(), brief)).toBe("Three stories to know this morning.");
		expect(briefLine(saves("NVDA"), brief)).toBe("Three stories to know this morning."); // none of the three is NVIDIA's
		expect(briefLine(saves("NVDA", "jpm"), brief)).toBe("One story matters for your STAK this morning.");
		expect(briefLine(seedGuest().saves, brief)).toBe("Two stories matter for your STAK this morning."); // the persona saved JPM and O
		expect(briefLine(saves("GS", "JPM", "O"), brief)).toBe("Three stories matter for your STAK this morning."); // the frame's sentence
		// a caller that does not know the brief keeps the frame's sentence
		expect(briefLine(saves("NVDA"), undefined)).toBe("Three stories matter for your STAK this morning.");
		const withNews = { ...ctx, settings: { ...settings, marketNews: true }, briefTickers: brief };
		expect(deriveNotices({ ...base, saves: seedGuest().saves }, withNews).find((n) => n.id.startsWith("brief-"))!.body).toBe("Two stories matter for your STAK this morning.");
	});

	it("promises what a save powers, and never calls a 0.0% move a move", () => {
		expect(NOTICE_COPY.firstSave.body).toBe("Saved stocks power My STAK and Simulate’s Saved staks.");
		const candidates = [{ ticker: "KO", saved: true }, { ticker: "NVDA", saved: false }];
		expect(movesFrom(candidates, (t) => (t === "KO" ? 0.04 : 2.4), 0).map((m) => m.ticker)).toEqual(["NVDA"]);
		expect(movesFrom(candidates, (t) => (t === "KO" ? -0.06 : 2.4), 0).map((m) => m.ticker)).toEqual(["NVDA", "KO"]);
	});
});

describe("a return comes from the prices (N29g)", () => {
	it("reads a dust position's return as its prices give it, not as its cents do", () => {
		const dust: Position = { ticker: "NVDA", shares: 0.0004, priceAtAdd: 98.5, addedAt: 1 };
		const row = positionRow(dust, demoQuote("NVDA"));
		expect(row).toMatchObject({ value: 0.05, stake: 0.04, gain: 0.01 });
		expect(row.pct).toBeCloseTo(((122.1 - 98.5) / 98.5) * 100, 9); // +24.0%, not the cents' +25.0%
		expect(positionRow({ ...dust, priceAtAdd: null }, null).pct).toBe(0);
	});
});

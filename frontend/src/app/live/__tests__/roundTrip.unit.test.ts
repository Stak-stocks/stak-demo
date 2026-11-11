/**
 * The ledger's cent (coordinator ruling N20d / N21 point 5, 2026-11-09). The user's cash read $8,799.99 after buying
 * and selling at one price: the guest ledger kept shares to four decimals, so $100 of COST at $918.20 was 0.1089
 * shares, worth $99.99. It keeps eight now (shown at four), and a sale returns what the position's worth drops by.
 */
import { describe, expect, it } from "vitest";
import { DEMO_QUOTES } from "../demoQuotes";
import { round2, round4, round8, shares4 } from "../format";
import { seedGuest } from "../guest";
import { paperSale, paperShares, SHARE_SHOWN_HALF_STEP } from "../ledger";

const TICKERS = Object.keys(DEMO_QUOTES);
/** The tickets' chips, and custom stakes: a cent, odd cents, a large one, everything the persona has. */
const STAKES = [10, 25, 100, 1000];
const CUSTOM = [0.01, 1, 7.77, 33.33, 49.99, 250.5, 1234.56, 8800];

describe("the round trip: buy, then sell at the same price", () => {
	it("lost a cent at four decimals, and does not at eight: $100 of COST at $918.20", () => {
		// the ledger of before 2026-11-09
		expect(round4(100 / 918.2)).toBe(0.1089);
		expect(round2(round4(100 / 918.2) * 918.2)).toBe(99.99);
		// now
		const shares = paperShares(100, 918.2);
		expect(shares).toBe(0.10890873);
		expect(shares4(shares)).toBe("0.1089"); // the figure on show is the same
		expect(paperSale(shares, shares, 918.2)).toEqual({ shares: 0.10890873, remaining: 0, proceeds: 100 });
		// the sheets ask for the holding as they show it (four decimals): still every share, still $100.00
		expect(paperSale(shares, round4(shares), 918.2)).toEqual({ shares: 0.10890873, remaining: 0, proceeds: 100 });
	});

	it("returns exactly the cost on a full sale, for all 77 quoted companies and $10 / $25 / $100 / $1,000 / custom stakes", () => {
		expect(TICKERS).toHaveLength(77);
		let trips = 0;
		let lostBefore = 0;
		for (const t of TICKERS) {
			const price = DEMO_QUOTES[t]!.price;
			for (const stake of [...STAKES, ...CUSTOM]) {
				const shares = paperShares(stake, price);
				expect(shares).toBeGreaterThan(0);
				expect(round8(shares)).toBe(shares);
				for (const asked of [shares, round4(shares), shares * 1]) {
					const sale = paperSale(shares, asked, price);
					expect(sale.shares).toBe(shares);
					expect(sale.remaining).toBe(0);
					expect(sale.proceeds).toBe(stake);
				}
				trips++;
				if (round2(round4(stake / price) * price) !== stake) lostBefore++;
			}
		}
		expect(trips).toBe(77 * 12);
		// at four decimals 351 of these 924 round trips ended off their stake (measured on the old rule)
		expect(lostBefore).toBeGreaterThan(300);
	});

	it("adds partial sales up to the cost exactly, whatever the portions, so they never end a cent off", () => {
		for (const t of TICKERS) {
			const price = DEMO_QUOTES[t]!.price;
			for (const stake of [10, 25, 100, 1000, 33.33]) {
				// as the sheets ask today (portions of the holding at four decimals) and as an exact portion
				for (const quantise of [round4, (n: number) => n]) {
					for (const portions of [[0.25, 0.5, 1], [0.5, 1], [0.75, 0.25, 0.1, 1], [0.1, 0.1, 0.1, 0.1, 0.1, 1]]) {
						let held = paperShares(stake, price);
						let back = 0;
						for (const portion of portions) {
							const sale = paperSale(held, quantise(held * portion), price);
							// each sale returns its shares at the price, to the cent the position's value is kept at
							expect(Math.abs(sale.proceeds - sale.shares * price)).toBeLessThanOrEqual(0.0100001);
							expect(round8(sale.shares + sale.remaining)).toBe(held);
							back = round2(back + sale.proceeds);
							held = sale.remaining;
						}
						expect(held).toBe(0);
						expect(back).toBe(stake);
					}
				}
			}
		}
	});

	it("never moves a position's worth by selling part of it: what is left and what came back are what was there", () => {
		// the persona's six listed picks at today's demo prices (the exact seed's eight-decimal shares)
		for (const p of seedGuest().positions) {
			const price = DEMO_QUOTES[p.ticker]!.price;
			const worth = round2(p.shares * price);
			for (const portion of [0.1, 0.25, 0.5, 0.75, 0.9]) {
				for (const asked of [round4(p.shares * portion), p.shares * portion]) {
					const sale = paperSale(p.shares, asked, price);
					expect(round2(sale.proceeds + round2(sale.remaining * price))).toBe(worth);
				}
			}
		}
		// the case that showed: half of the persona's AAPL as the seed held it then (0.4622 shares, $106.01; the exact seed
		// of N30.7 holds 0.46217571, worth the frame's $106.00) used to return $53.00 and leave $53.00
		const held = 0.4622;
		const half = round4(held * 0.5);
		expect(round2(held * 229.35)).toBe(106.01);
		expect(round2(round2(half * 229.35) + round2(round4(held - half) * 229.35))).toBe(106); // before: a cent gone
		expect(paperSale(held, half, 229.35)).toEqual({ shares: 0.2311, remaining: 0.2311, proceeds: 53.01 });
	});

	it("keeps top-ups at one price worth what was paid for them", () => {
		for (const t of TICKERS) {
			const price = DEMO_QUOTES[t]!.price;
			const held = round8(paperShares(100, price) + paperShares(25, price) + paperShares(7.77, price));
			expect(paperSale(held, held, price).proceeds).toBe(132.77);
		}
	});

	it("sells the whole holding when asked for it as the screens show it, and nothing for a quantity that is not one", () => {
		expect(SHARE_SHOWN_HALF_STEP).toBe(0.00005);
		// more than is held, and anything within half of the last digit on show: every share
		expect(paperSale(1.23456789, 5, 10)).toEqual({ shares: 1.23456789, remaining: 0, proceeds: 12.35 });
		expect(paperSale(1.23456789, 1.2346, 10).remaining).toBe(0);
		expect(paperSale(1.23456789, 1.23452, 10).remaining).toBe(0);
		// less than that: the quantity asked for, to eight decimals, the rest still held
		expect(paperSale(1.23456789, 1.2345, 10)).toEqual({ shares: 1.2345, remaining: 0.00006789, proceeds: 12.35 });
		expect(paperSale(1, 0.123456789, 10)).toEqual({ shares: 0.12345679, remaining: 0.87654321, proceeds: 1.23 });
		// not a quantity (or none of a holding that shows): nothing is sold, nothing returned
		for (const asked of [0, 0.000000001, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(paperSale(2, asked, 10)).toEqual({ shares: 0, remaining: 2, proceeds: 0 });
		// a holding too small to show ("0.0000 shares": a cent of COST) is sold whole, whatever four-decimal figure is asked
		expect(paperSale(0.00001089, 0, 918.2)).toEqual({ shares: 0.00001089, remaining: 0, proceeds: 0.01 });
		expect(paperSale(0, 1, 10)).toEqual({ shares: 0, remaining: 0, proceeds: 0 });
		expect(paperSale(2, 1, 0)).toEqual({ shares: 0, remaining: 2, proceeds: 0 });
		expect(paperShares(0, 10)).toBe(0);
		expect(paperShares(10, 0)).toBe(0);
		// a cent of the dearest company still buys something (at four decimals it bought 0.0000 shares)
		expect(paperShares(0.01, 918.2)).toBe(0.00001089);
		expect(round4(0.01 / 918.2)).toBe(0);
	});
});

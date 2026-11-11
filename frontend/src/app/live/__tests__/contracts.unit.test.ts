/**
 * The shared contracts of 2026-11-09 (BUILD-PLAN N30): the order rule (orders.ts), the clock (clock.ts, a mirror of the
 * phones' StakClock) and the zero-neutral forms (format.ts).
 */
import { describe, expect, it } from "vitest";
import { byline, daysAhead, daysAheadLong, daysSince, FRAME_NOW, monthDay, monthDayLong, monthYearNow, savedLabel, storyAgeDays, todayLong } from "../clock";
import { arrowOrNone, changeLineOrFlat, changeShortOrFlat, signedMoneyOrZero, signedPctOrZero, toneOf } from "../format";
import { paperShares, SHARE_SHOWN_HALF_STEP } from "../ledger";
import { checkBuy, checkSell, hasPrice, MIN_BUY, minBuy, OrderRefused, refusalLine, refusalOf } from "../orders";

describe("orders: an order of nothing is refused, with its reason", () => {
	it("a company without a price cannot be bought or sold", () => {
		for (const price of [null, undefined, 0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(checkBuy(25, 8800, price)).toEqual({ ok: false, reason: "no-price" });
			expect(checkSell(1, 1, price)).toEqual({ ok: false, reason: "no-price" });
			expect(hasPrice(price)).toBe(false);
		}
	});

	it("the smallest buy is a dollar: a cent, zero, a negative and a non-number are too small (ST-01)", () => {
		for (const dollars of [0.01, 0.99, 0.994, 0, -5, Number.NaN]) expect(checkBuy(dollars, 8800, 918.2)).toEqual({ ok: false, reason: "too-small" });
		expect(checkBuy(MIN_BUY, 8800, 918.2)).toEqual({ ok: true });
		expect(checkBuy(0.995, 8800, 918.2)).toEqual({ ok: true }); // rounds to the dollar it is charged as
	});

	it("a buy never shows 0.0000 shares: a very dear share raises the minimum", () => {
		const dear = 700_000;
		expect(minBuy(dear)).toBe(35);
		expect(checkBuy(34.99, 8800, dear)).toEqual({ ok: false, reason: "too-small" });
		expect(checkBuy(35, 8800, dear)).toEqual({ ok: true });
		expect(paperShares(35, dear)).toBeGreaterThanOrEqual(SHARE_SHOWN_HALF_STEP);
		expect(minBuy(122.1)).toBe(MIN_BUY);
	});

	it("more than the cash is refused as insufficient, to the store's own half-cent tolerance", () => {
		expect(checkBuy(100, 99.99, 50)).toEqual({ ok: false, reason: "insufficient" });
		expect(checkBuy(100, 100, 50)).toEqual({ ok: true });
		expect(checkBuy(25, 0, 50)).toEqual({ ok: false, reason: "insufficient" });
	});

	it("a sale: nothing held, a part that rounds to nothing, and the close that is always allowed (ST-05, ST-13)", () => {
		expect(checkSell(1, 0, 100)).toEqual({ ok: false, reason: "nothing-held" });
		expect(checkSell(0, 1.0152, 122.1)).toEqual({ ok: false, reason: "too-small" });
		expect(checkSell(-1, 1.0152, 122.1)).toEqual({ ok: false, reason: "too-small" });
		expect(checkSell(0.00001, 1.0152, 122.1)).toEqual({ ok: false, reason: "too-small" }); // would file "0.0000 shares"
		expect(checkSell(0.0001, 1.0152, 5)).toEqual({ ok: false, reason: "too-small" }); // would file "$0.00"
		expect(checkSell(0.5076, 1.0152, 122.1)).toEqual({ ok: true });
		expect(checkSell(1.0152, 1.0152, 122.1)).toEqual({ ok: true });
		expect(checkSell(99, 1.0152, 122.1)).toEqual({ ok: true }); // more than held closes the holding
		expect(checkSell(0.00001, 0.00001, 5)).toEqual({ ok: true }); // dust can still be closed
	});

	it("the store's refusal carries its reason, and its message is the same word", () => {
		const e = new OrderRefused("insufficient");
		expect(e).toBeInstanceOf(Error);
		expect(e.message).toBe("insufficient");
		expect(refusalOf(e)).toBe("insufficient");
		expect(refusalOf(new Error("insufficient"))).toBeNull();
		expect(refusalOf("nope")).toBeNull();
	});

	it("every reason has a sentence a ticket can print", () => {
		expect(refusalLine("insufficient", { ticker: "NVDA", side: "buy", cash: 0 })).toBe("Only $0.00 of paper cash left");
		expect(refusalLine("insufficient", { ticker: "NVDA", side: "buy", cash: 12.5 })).toBe("Only $12.50 of paper cash left");
		expect(refusalLine("too-small", { ticker: "NVDA", side: "buy", price: 122.1 })).toBe("The smallest practice buy is $1.00");
		expect(refusalLine("too-small", { ticker: "BRK.A", side: "buy", price: 700_000 })).toBe("The smallest practice buy is $35.00");
		expect(refusalLine("too-small", { ticker: "NVDA", side: "sell" })).toBe("That sale rounds to nothing");
		expect(refusalLine("no-price", { ticker: "RBLX", side: "buy" })).toBe("RBLX has no price right now, so it cannot be bought");
		expect(refusalLine("no-price", { ticker: "RBLX", side: "sell" })).toBe("RBLX has no price right now, so it cannot be sold");
		expect(refusalLine("nothing-held", { ticker: "NVDA", side: "sell" })).toBe("You hold no NVDA to sell");
	});
});

describe("clock: the phones' StakClock, on the real calendar", () => {
	it("at the frames' morning every function returns the string Figma prints", () => {
		expect(todayLong(FRAME_NOW)).toBe("Saturday, July 4");
		expect(monthDay(2, FRAME_NOW)).toBe("Jul 2");
		expect(byline("2d", "3 min read", FRAME_NOW)).toBe("· Jul 2 · 3 min read");
		expect(daysAheadLong(26, FRAME_NOW)).toBe("July 30");
		expect(daysAhead(26, FRAME_NOW)).toBe("Jul 30");
		expect(monthYearNow(FRAME_NOW)).toBe("July 2026");
		expect(savedLabel(0, FRAME_NOW)).toBe("Saved today");
		expect(savedLabel(2, FRAME_NOW)).toBe("Saved Jul 2");
	});

	it("moves with the day: the same story two days old on November 9", () => {
		const nov9 = new Date(2026, 10, 9, 16, 45).getTime();
		expect(todayLong(nov9)).toBe("Monday, November 9");
		expect(byline("2d", "3 min read", nov9)).toBe("· Nov 7 · 3 min read");
		expect(byline("5h", "4 min read", nov9)).toBe("· Nov 9 · 4 min read");
		expect(monthYearNow(nov9)).toBe("November 2026");
	});

	it("crosses months and years by the calendar", () => {
		expect(monthDay(4, FRAME_NOW)).toBe("Jun 30");
		expect(monthDayLong(4, FRAME_NOW)).toBe("June 30");
		const jan1 = new Date(2027, 0, 1, 0, 5).getTime();
		expect(monthDay(1, jan1)).toBe("Dec 31");
		expect(daysAhead(31, jan1)).toBe("Feb 1");
		expect(todayLong(jan1)).toBe("Friday, January 1");
	});

	it("an hour age is dated from its hours, so a card's '10h' and the article's date agree at any hour", () => {
		expect(byline("10h", "3 min read", FRAME_NOW)).toBe("· Jul 3 · 3 min read"); // 09:41 less ten hours is the day before
		expect(byline("2h", "3 min read", FRAME_NOW)).toBe("· Jul 4 · 3 min read");
		const evening = new Date(2026, 10, 9, 18, 12).getTime();
		expect(byline("10h", "3 min read", evening)).toBe("· Nov 9 · 3 min read");
		const small = new Date(2026, 10, 9, 0, 20).getTime();
		expect(byline("2h", "3 min read", small)).toBe("· Nov 8 · 3 min read");
		expect(byline("40m", "3 min read", small)).toBe("· Nov 8 · 3 min read");
		expect(byline("10m", "3 min read", small)).toBe("· Nov 9 · 3 min read");
		expect(byline("1d", "3 min read", small)).toBe("· Nov 8 · 3 min read");
	});

	it("a story's age in days: only whole days count", () => {
		expect(storyAgeDays("2d")).toBe(2);
		expect(storyAgeDays("12d")).toBe(12);
		expect(storyAgeDays("5h")).toBe(0);
		expect(storyAgeDays("40m")).toBe(0);
		expect(storyAgeDays("")).toBe(0);
	});

	it("daysSince counts calendar days, whatever the hour, and never goes negative", () => {
		const late = new Date(2026, 6, 3, 23, 59).getTime();
		const early = new Date(2026, 6, 4, 0, 1).getTime();
		expect(daysSince(late, early)).toBe(1);
		expect(daysSince(early, FRAME_NOW)).toBe(0);
		expect(daysSince(new Date(2026, 4, 8).getTime(), FRAME_NOW)).toBe(57);
		expect(daysSince(FRAME_NOW, late)).toBe(0);
		// across the autumn clock change (the first Sunday of November in the US): still whole days
		expect(daysSince(new Date(2026, 9, 30, 12).getTime(), new Date(2026, 10, 9, 12).getTime())).toBe(10);
	});
});

describe("format: zero is neutral", () => {
	it("the tone is read at the precision the figure is printed at", () => {
		expect(toneOf(24)).toBe("up");
		expect(toneOf(-3)).toBe("down");
		expect(toneOf(0)).toBe("flat");
		expect(toneOf(-0)).toBe("flat");
		expect(toneOf(0.004)).toBe("flat"); // prints $0.00
		expect(toneOf(-0.004)).toBe("flat");
		expect(toneOf(0.006)).toBe("up"); // prints $0.01
		expect(toneOf(0.04, 1)).toBe("flat"); // prints 0.0%
		expect(toneOf(-0.04, 1)).toBe("flat");
		expect(toneOf(0.06, 1)).toBe("up"); // prints 0.1%
		expect(toneOf(Number.NaN)).toBe("flat");
	});

	it("a printed zero carries no sign and no arrow; everything else is unchanged", () => {
		expect(signedMoneyOrZero(24)).toBe("+$24.00");
		expect(signedMoneyOrZero(-3)).toBe("-$3.00");
		expect(signedMoneyOrZero(0)).toBe("$0.00");
		expect(signedMoneyOrZero(-0.004)).toBe("$0.00");
		expect(signedPctOrZero(24)).toBe("+24.0%");
		expect(signedPctOrZero(-3)).toBe("-3.0%");
		expect(signedPctOrZero(0.04)).toBe("0.0%");
		expect(signedPctOrZero(-0.04)).toBe("0.0%");
		expect(arrowOrNone(1.2)).toBe("▲");
		expect(arrowOrNone(-0.4)).toBe("▼");
		expect(arrowOrNone(0.04)).toBe("");
		expect(arrowOrNone(0.004, 2)).toBe("");
		expect(changeShortOrFlat(1.2)).toBe("▲ 1.2%");
		expect(changeShortOrFlat(-0.4)).toBe("▼ 0.4%");
		expect(changeShortOrFlat(0)).toBe("0.0%");
		expect(changeLineOrFlat(1.2)).toBe("▲ 1.2% today");
		expect(changeLineOrFlat(-0.04)).toBe("0.0% today");
		expect(changeLineOrFlat(-2.3, " this week")).toBe("▼ 2.3% this week");
	});
});

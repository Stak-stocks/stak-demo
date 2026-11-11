/**
 * The hunt's findings on the Simulate pages' own arithmetic and words (fix round of 2026-11-09; coordinator rulings
 * N23e-i, N27i-l, N28d, N29g, N29i, N30.8h-l): each rule here is the pure function a page calls.
 */
import { describe, expect, it } from "vitest";
import { cardsLeft, PICKS_DONE } from "@/app/home/copy";
import { checkSell, money, OrderRefused, paperSale, PRICE_LEAD, pricesOnScreen, shares4 } from "@/app/live";
import { sheets, simulateEmpty, simulateHome } from "../data";
import {
	blendedCost,
	deckStateOf,
	firstPrice,
	FLAT,
	heroCaption,
	marketOverBuys,
	pickReturn,
	priceCopy,
	refusalFrom,
	rowTone,
	salePreview,
	savedEmptyLine,
	soldWords,
	stakeAndGain,
	stakeText,
	toneColor,
	versusMarket,
	weekLine,
	weekTone,
} from "../figures";

const MAY8 = new Date(2026, 4, 8).getTime();
const NOW = new Date(2026, 10, 9, 15, 0).getTime();
/** the persona's NVDA after a $25 top-up at today's $122.10 (the hunt's NUM-03: stored 1.22 sh at $102.46, two lots) */
const first = { shares: 1.0152, price: 98.5, at: MAY8 };
const topUp = { shares: 0.2047502, price: 122.1, at: NOW };
const toppedUp = { shares: 1.2199502, priceAtAdd: 102.46, addedAt: MAY8, price: 122.1, lots: [first, topUp] };
const once = { shares: 1.0152, priceAtAdd: 98.5, addedAt: MAY8, price: 122.1 };

describe("zero is neutral (N23h, the hunt's NUM-10 / ST-15)", () => {
	it("prints a week that did not move without an arrow or a plus sign", () => {
		expect(weekLine(0, 0)).toBe("$0 (0.0%) this week");
		expect(weekTone(0, 0)).toBe("flat");
		// a move that prints "$0 (0.0%)" is flat whatever its sign
		expect(weekLine(0.3, 0.003)).toBe("$0 (0.0%) this week");
		expect(weekLine(-0.3, -0.003)).toBe("$0 (0.0%) this week");
		expect(weekTone(-0.3, -0.003)).toBe("flat");
	});

	it("keeps the frame's line for a real move, with the arrow of its direction", () => {
		expect(weekLine(186.25, 1.8525)).toBe("▲ +$186 (+1.9%) this week");
		expect(weekTone(186.25, 1.8525)).toBe("up");
		expect(weekLine(-12.4, -0.12)).toBe("▼ -$12 (-0.1%) this week");
		expect(weekTone(-12.4, -0.12)).toBe("down");
	});

	it("colours a row by the figures it prints: the label grey when both print zero", () => {
		expect(rowTone(0, 0)).toBe("flat");
		expect(rowTone(0.004, 0.004)).toBe("flat");
		expect(rowTone(24, 24)).toBe("up");
		expect(rowTone(-3, -3)).toBe("down");
		// a cent on a large stake prints "+$0.01" beside "0.0%": the dollars decide
		expect(rowTone(0.01, 0.0001)).toBe("up");
		expect(toneColor("flat", { up: "#2fd08a", down: "#ff5a6a" })).toBe(FLAT);
		expect(toneColor("down", { up: "#2fd08a", down: "#ff5a6a" })).toBe("#ff5a6a");
		expect(FLAT).toBe("#819abb");
	});

	it("files a sale at what was paid as neither profit nor loss", () => {
		expect(soldWords(12)).toBe("profit banked");
		expect(soldWords(-8)).toBe("loss realized");
		expect(soldWords(0)).toBe("broke even");
		expect(soldWords(0.004)).toBe("broke even");
	});

	it("says a pick that has not moved has not moved", () => {
		expect(heroCaption(24, 24, 100)).toBe("That is up 24.0% on a $100 paper stake");
		expect(heroCaption(-3, -3, 100)).toBe("That is down 3.0% on a $100 paper stake");
		expect(heroCaption(0, 0, 100)).toBe("No move yet on a $100 paper stake");
		// a cent on $1,000 is a gain too small to print a tenth of a percent: never "up 0.0%"
		expect(heroCaption(0.001, 0.01, 1000)).toBe("That is up less than 0.1% on a $1,000 paper stake");
	});
});

describe("vs the market (N23g, N28d / N29i, N30.8h)", () => {
	it("lets the word carry the direction: no minus sign beside 'behind', the frame's form when ahead", () => {
		expect(versusMarket(23.96, 3.2)).toEqual({ text: "+20.8% ahead", tone: "up" });
		expect(versusMarket(2.0, 3.2)).toEqual({ text: "1.2% behind", tone: "down" });
		expect(versusMarket(-3.0, 3.2)).toEqual({ text: "6.2% behind", tone: "down" });
		expect(versusMarket(0.03, 0)).toEqual({ text: "Even with the market", tone: "flat" });
	});

	it("weighs each buy against the market since ITS day", () => {
		// the demo market: +3.2% since May 8, 0% since a buy made now
		const market = (at: number) => (at <= MAY8 ? 3.2 : 0);
		expect(marketOverBuys(once, market)).toBeCloseTo(3.2, 9);
		const cost1 = 1.0152 * 98.5;
		const cost2 = 0.2047502 * 122.1;
		expect(marketOverBuys(toppedUp, market)).toBeCloseTo((cost1 * 3.2) / (cost1 + cost2), 9);
		// before the top-up: +20.8% ahead. After it the May 8 buy is still +20.8% ahead of ITS market and the $25 is even
		// with its own: +16.6% over the $125, where charging the whole position with the market since May 8 printed +16.0%
		expect(versusMarket(pickReturn(once), marketOverBuys(once, market)).text).toBe("+20.8% ahead");
		expect(versusMarket(pickReturn(toppedUp), marketOverBuys(toppedUp, market)).text).toBe("+16.6% ahead");
		expect(versusMarket(pickReturn(toppedUp), 3.2).text).toBe("+16.0% ahead");
	});
});

describe("a pick's return comes from prices and exact shares (N29g)", () => {
	it("reads a dust position as its prices say, not as its rounded cents do", () => {
		// 0.0004 NVDA left at $98.50, worth $0.05 against a $0.04 stake: the cents say +25.0%
		const dust = { shares: 0.0004, priceAtAdd: 98.5, addedAt: MAY8, price: 122.1 };
		expect(pickReturn(dust)).toBeCloseTo((122.1 / 98.5 - 1) * 100, 9);
		expect(pickReturn(dust).toFixed(1)).toBe("24.0");
		expect((((0.05 - 0.04) / 0.04) * 100).toFixed(1)).toBe("25.0");
	});

	it("reads a topped-up pick over what its buys cost, and nothing for a pick without a cost", () => {
		const cost = 1.0152 * 98.5 + 0.2047502 * 122.1;
		expect(pickReturn(toppedUp)).toBeCloseTo(((1.2199502 * 122.1) / cost - 1) * 100, 9);
		expect(pickReturn({ shares: 0, priceAtAdd: null, addedAt: MAY8, price: 0 })).toBe(0);
	});
});

describe("the pick-day price after a top-up (N23f, the hunt's NUM-03 / ST-11)", () => {
	it("stays the first buy's, and the blended figure is an average cost", () => {
		expect(firstPrice(once)).toBe(98.5);
		expect(blendedCost(once)).toBeNull();
		expect(firstPrice(toppedUp)).toBe(98.5);
		expect(money(blendedCost(toppedUp)!)).toBe("$102.46");
		// the lots in any order: the first buy is the earliest
		expect(firstPrice({ ...toppedUp, lots: [topUp, first] })).toBe(98.5);
	});

	it("names no average for a top-up at the price the pick was made at", () => {
		const same = { shares: 2, priceAtAdd: 50, addedAt: MAY8, price: 60, lots: [{ shares: 1, price: 50, at: MAY8 }, { shares: 1, price: 50, at: NOW }] };
		expect(firstPrice(same)).toBe(50);
		expect(blendedCost(same)).toBeNull();
	});
});

describe("stake, gain and worth add up as printed (N23i / N27l, the hunt's NUM-11 / ST-16)", () => {
	it("names a stake in whole dollars only when it is whole, as the phones' stakeLabel does", () => {
		expect(stakeText(100)).toBe("$100");
		expect(stakeText(1234)).toBe("$1,234");
		expect(stakeText(33.5)).toBe("$33.50");
		expect(stakeText(100.01)).toBe("$100.01");
		// never "$0 stake": under a dollar it is its cents, under a cent it says so
		expect(stakeText(0.04)).toBe("$0.04");
		expect(stakeText(0.003)).toBe("under $0.01");
		expect(stakeText(0)).toBe("$0");
	});

	it("explains what a sale returns with amounts that add up", () => {
		expect(stakeAndGain(100, 24)).toBe("the $100 stake plus the $24 gain, locked in for good");
		// after a 75% sale: $37.51 + $5.98 = the $43.49 the card says ("the $38 stake plus the $6 gain" did not)
		expect(stakeAndGain(37.51, 5.98)).toBe("the $37.51 stake plus the $5.98 gain, locked in for good");
		expect(stakeAndGain(100, -3)).toBe("the $100 stake minus the $3 loss, locked in for good");
		expect(stakeAndGain(100, 0)).toBe("the $100 stake back, with no gain or loss");
	});
});

describe("the sell sheet's preview is the ledger's own sale (N23e / N28e, the hunt's NUM-01 / ST-04)", () => {
	it("previews what paperSale books, to the cent and the ten-thousandth of a share", () => {
		for (const held of [0.4749, 0.47485215, 1.0152, 1.2199502, 0.10890873, 0.0692]) {
			for (const price of [248.5, 122.1, 918.2, 361.4, 28.4]) {
				for (const frac of [0.25, 0.5, 0.75, 0.333, 0.999, 1]) {
					const preview = salePreview(held, price, frac);
					const booked = paperSale(held, held * frac, price);
					expect(preview).toEqual(booked);
					expect(shares4(preview.shares)).toBe(shares4(booked.shares));
				}
			}
		}
	});

	it("differs from the position's value times the portion, which is what the sheet used to print", () => {
		// the persona's TSLA as the hunt met it: 0.4749 shares worth $118.01; half of it
		const value = Math.round(0.4749 * 248.5 * 100) / 100;
		expect(value).toBe(118.01);
		const preview = salePreview(0.4749, 248.5, 0.5);
		// the ledger returns what the position's worth drops by: $118.01 less the $59.01 left
		expect(preview.proceeds).toBe(59);
		expect(preview.proceeds + Math.round(preview.remaining * 248.5 * 100) / 100).toBeCloseTo(value, 9);
	});

	it("previews a signed-in account's sale in the account's own quantities (store.ts sell)", () => {
		// an account holds three decimals: 0.405 shares at $291.30; a third of it is booked as round4(0.135) shares
		const third = salePreview(0.405, 291.3, 1 / 3, true);
		expect(third.shares).toBe(0.135);
		expect(third.proceeds).toBe(Math.round(0.135 * 291.3 * 100) / 100);
		expect(third.remaining).toBe(0.27);
		// All never asks for more than is held
		expect(salePreview(0.405, 291.3, 1, true)).toEqual({ shares: 0.405, remaining: 0, proceeds: Math.round(0.405 * 291.3 * 100) / 100 });
		expect(salePreview(0.405, 0, 0.5, true).proceeds).toBe(0);
	});

	it("sells everything on All and nothing on a portion that rounds to no share", () => {
		expect(salePreview(1.2199502, 122.1, 1)).toMatchObject({ shares: 1.2199502, remaining: 0 });
		expect(checkSell(1.0152 * 0.00001, 1.0152, 122.1)).toEqual({ ok: false, reason: "too-small" });
		expect(checkSell(1.0152 * 0.5, 1.0152, 122.1)).toEqual({ ok: true });
	});
});

describe("a refusal is not a failure (N27i / N30.3a, the hunt's ST-13)", () => {
	it("reads the store's typed refusal and the words it threw before it", () => {
		expect(refusalFrom(new OrderRefused("too-small"))).toBe("too-small");
		expect(refusalFrom(new OrderRefused("insufficient"))).toBe("insufficient");
		expect(refusalFrom(new Error("insufficient"))).toBe("insufficient");
		expect(refusalFrom(new Error("invalid"))).toBe("too-small");
		expect(refusalFrom(new Error("no position"))).toBe("nothing-held");
	});

	it("leaves a real failure a failure", () => {
		expect(refusalFrom(new Error("timeout"))).toBeNull();
		expect(refusalFrom(new Error("A trade is already being placed. Please wait."))).toBeNull();
		expect(refusalFrom("insufficient")).toBeNull();
		expect(refusalFrom(undefined)).toBeNull();
	});
});

describe("the Saved staks card's empty line is true for its reader (N30.8i, the hunt's C-11b)", () => {
	it("invites a person with no saves, and never one who has a save", () => {
		const invite = "Save a company from today’s deck and it shows up here, ready to buy.";
		expect(savedEmptyLine(0, 0)).toBe(invite);
		expect(savedEmptyLine(1, 0)).toBe("The company you saved is already one of your picks. Save another from today’s deck and it shows up here, ready to buy.");
		expect(savedEmptyLine(4, 0)).toBe("Every company you saved is already one of your picks. Save another from today’s deck and it shows up here, ready to buy.");
		expect(savedEmptyLine(1, 1)).toBe("Your saved company has no price right now, so it cannot be bought here yet.");
		expect(savedEmptyLine(3, 2)).toBe("None of your saved companies has a price right now, so none can be bought here yet.");
		for (const line of [savedEmptyLine(1, 0), savedEmptyLine(4, 0), savedEmptyLine(1, 1), savedEmptyLine(3, 2)]) expect(line).not.toContain("Save a company");
	});
});

describe("today's deck, read from the ledger (N30.8l, the hunt's C-06)", () => {
	const order = Array.from({ length: 12 }, (_, i) => `T${i}`);
	const deck = (over: Partial<{ date: string; index: number; saved: string[]; passed: string[]; bought: string[] }>) => ({ date: "2026-11-09", order, index: 0, saved: [], passed: [], bought: [], ...over });

	it("knows a finished deck, so the never-traded page offers no way into it", () => {
		const done = deckStateOf(deck({ index: 12, passed: order }), "2026-11-09");
		expect(done).toEqual({ total: 12, index: 12, decided: 12, done: true });
		expect(cardsLeft(done!)).toBe(0);
		// the sentence itself is Home's (home/copy.ts: one sentence for a finished deck); Simulate only repeats it
		expect(PICKS_DONE).toMatch(/deck/i);
	});

	it("reads an open deck, another day's deck and no deck as not finished", () => {
		const open = deckStateOf(deck({ index: 3, passed: ["T0", "T1"], saved: ["T2"] }), "2026-11-09");
		expect(open).toEqual({ total: 12, index: 3, decided: 3, done: false });
		expect(cardsLeft(open!)).toBe(9);
		expect(deckStateOf(deck({ index: 12 }), "2026-11-10")).toBeNull();
		expect(deckStateOf(null, "2026-11-09")).toBeNull();
	});
});

describe("the sentences about prices are true for the visitor (N30.8g, the hunt's C-02)", () => {
	it("keeps the frames' own sentences in the untouched showcase and with live quotes", () => {
		for (const prices of [pricesOnScreen({ signedIn: false, healthy: false, showcase: true }), pricesOnScreen({ signedIn: true, healthy: true })]) {
			expect(prices.real).toBe(true);
			expect(priceCopy(prices)).toEqual({ how: simulateHome.how.lines[1], emptyBody: simulateEmpty.body, ticket: sheets.addConfirm.description });
		}
		expect(simulateHome.how.lines[1]).toBe("Prices are real. Nothing is smoothed for comfort.");
	});

	it("says the prices are demo prices to a signed-out visitor past the showcase, and when the feed is unreachable", () => {
		for (const prices of [pricesOnScreen({ signedIn: false, healthy: false }), pricesOnScreen({ signedIn: false, healthy: true }), pricesOnScreen({ signedIn: true, healthy: false })]) {
			expect(prices.real).toBe(false);
			const copy = priceCopy(prices);
			expect(copy.how).toBe(`${PRICE_LEAD.demo} Nothing is smoothed for comfort.`);
			expect(copy.emptyBody).toBe("Pick a saved company and buy with paper money at demo prices. Nothing here is real until you decide it is.");
			expect(copy.ticket).toBe("Your paper stake starts at today’s demo price and tracks its move, in either direction.");
			for (const line of Object.values(copy)) expect(line).not.toMatch(/Prices are real|real prices|real move/);
		}
	});
});

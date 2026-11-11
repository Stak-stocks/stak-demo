/**
 * The polish round after the independent review of 2026-11-09 (review r2's lows and the coordinator's follow-ups S1-S3):
 * the rules behind the six fixes, as the pure functions the pages call.
 *  - a left receipt's entry is never a receipt again (back.ts receiptLedger / drawsClosedReceipt: follow-up S1);
 *  - the empty Saved staks card beside a finished deck (figures.ts savedEmptyLine: follow-up S2);
 *  - the page under a reloaded "Position closed" (figures.ts closedPick / marketCell: review low 5);
 *  - what a Custom field writes to the address (figures.ts typedForAddress / startPortion: review low 6).
 * The sheets' side of the last one and of follow-up S3 is in sheetOrders.unit.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { PICKS_DONE } from "@/app/home/copy";
import { money, paperSale, type Position, saleRecord, type SoldEntry } from "@/app/live";
import { drawsClosedReceipt, receiptLedger } from "../back";
import { blendedCost, closedPick, firstPrice, marketCell, NO_FIGURE, pickReturn, round6, savedEmptyLine, startPortion, typedForAddress, versusMarket } from "../figures";

const MAY8 = new Date(2026, 4, 8).getTime();
const NOW = new Date(2026, 10, 9, 15, 0).getTime();

describe("a receipt the app has left is not drawn again (follow-up S1: Forward after a closed pick's exit)", () => {
	const LIST = "stak.sim.receiptsLeft";
	const tab = () => {
		const map = new Map<string, string>();
		return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
	};

	it("lists a receipt's entry once the app has left it, for the whole tab", () => {
		const store = tab();
		const receipts = receiptLedger(store);
		expect(receipts.wasLeft("k1")).toBe(false);
		receipts.left("k1");
		expect(receipts.wasLeft("k1")).toBe(true);
		expect(receipts.wasLeft("k2")).toBe(false);
		// another load of the tab reads the same list: a reload of some other page in between does not forget the entry
		expect(receiptLedger(store).wasLeft("k1")).toBe(true);
		// leaving it twice lists it once
		receipts.left("k1");
		expect(JSON.parse(store.map.get(LIST)!)).toEqual(["k1"]);
	});

	it("takes an entry off the list while its receipt is on screen (React's development double mount: cleanup, then setup)", () => {
		const store = tab();
		const receipts = receiptLedger(store);
		receipts.shown("k1");
		expect(store.map.has(LIST)).toBe(false);
		receipts.left("k1");
		receipts.shown("k1");
		expect(receipts.wasLeft("k1")).toBe(false);
		expect(receiptLedger(store).wasLeft("k1")).toBe(false);
	});

	it("needs a key: an entry without one is never listed", () => {
		const receipts = receiptLedger(tab());
		receipts.left(undefined);
		receipts.left("");
		receipts.shown(undefined);
		expect(receipts.wasLeft(undefined)).toBe(false);
		expect(receipts.wasLeft("")).toBe(false);
	});

	it("keeps the last forty entries", () => {
		const store = tab();
		const receipts = receiptLedger(store);
		for (let i = 0; i < 50; i++) receipts.left(`k${i}`);
		expect(receipts.wasLeft("k9")).toBe(false);
		expect(receipts.wasLeft("k10")).toBe(true);
		expect(receipts.wasLeft("k49")).toBe(true);
		expect(JSON.parse(store.map.get(LIST)!)).toHaveLength(40);
	});

	it("lives in memory where the tab's storage cannot be used, and reads a damaged list as empty", () => {
		const denied = {
			getItem: (): string | null => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("denied");
			},
		};
		const a = receiptLedger(denied);
		a.left("x");
		expect(a.wasLeft("x")).toBe(true);
		const b = receiptLedger(null);
		b.left("y");
		expect(b.wasLeft("y")).toBe(true);
		const store = tab();
		store.map.set(LIST, "{not json");
		expect(receiptLedger(store).wasLeft("x")).toBe(false);
		store.map.set(LIST, JSON.stringify({ k: 1 }));
		expect(receiptLedger(store).wasLeft("k")).toBe(false);
		store.map.set(LIST, JSON.stringify(["k", 7, null]));
		expect(receiptLedger(store).wasLeft("k")).toBe(true);
	});

	it("draws Position closed from the sale record only where the receipt's address was loaded", () => {
		// a reload on the receipt, or its address pasted: the pick is gone, the record is there, the entry was never left
		expect(drawsClosedReceipt({ held: false, modal: "sell-success", sold: true, left: false })).toBe(true);
		// the browser's Forward onto the entry a receipt's exit left behind: no receipt (the Portfolio takes its place)
		expect(drawsClosedReceipt({ held: false, modal: "sell-success", sold: true, left: true })).toBe(false);
		// a pick still held draws its own page, a pick never sold has no record, another sheet state is not a receipt
		expect(drawsClosedReceipt({ held: true, modal: "sell-success", sold: true, left: false })).toBe(false);
		expect(drawsClosedReceipt({ held: false, modal: "sell-success", sold: false, left: false })).toBe(false);
		expect(drawsClosedReceipt({ held: false, modal: "sell-confirm", sold: true, left: false })).toBe(false);
		expect(drawsClosedReceipt({ held: false, modal: undefined, sold: true, left: false })).toBe(false);
	});
});

describe("the empty Saved staks card beside a finished deck (follow-up S2)", () => {
	it("names no deck once today's deck is done", () => {
		expect(savedEmptyLine(0, 0, true)).toBe("Save a company and it shows up here, ready to buy.");
		expect(savedEmptyLine(1, 0, true)).toBe("The company you saved is already one of your picks. Save another and it shows up here, ready to buy.");
		expect(savedEmptyLine(4, 0, true)).toBe("Every company you saved is already one of your picks. Save another and it shows up here, ready to buy.");
		for (const line of [savedEmptyLine(0, 0, true), savedEmptyLine(1, 0, true), savedEmptyLine(4, 0, true)]) expect(line).not.toMatch(/deck/i);
		// the sentence that stands where the link to Discover was is the site's one sentence for a finished deck
		expect(PICKS_DONE).toBe("Today’s deck is done. Fresh picks tomorrow.");
	});

	it("keeps the lines the card printed while the deck is open, and the lines that never named it", () => {
		expect(savedEmptyLine(0, 0, false)).toBe("Save a company from today’s deck and it shows up here, ready to buy.");
		expect(savedEmptyLine(0, 0)).toBe(savedEmptyLine(0, 0, false));
		expect(savedEmptyLine(1, 0)).toContain("Save another from today’s deck");
		expect(savedEmptyLine(1, 1, true)).toBe(savedEmptyLine(1, 1));
		expect(savedEmptyLine(3, 2, true)).toBe(savedEmptyLine(3, 2));
	});
});

describe("the page under a reloaded Position closed (review low 5)", () => {
	// the persona's NVDA topped up with $25 at today's $122.10, then sold out: the ledger's own record of that sale
	const first = { shares: 1.0152, price: 98.5, at: MAY8 };
	const topUp = { shares: 0.2047502, price: 122.1, at: NOW };
	const held = first.shares + topUp.shares;
	const toppedUp: Position = { ticker: "NVDA", shares: held, priceAtAdd: (first.shares * first.price + topUp.shares * topUp.price) / held, addedAt: MAY8, lots: [first, topUp] };
	const closing = saleRecord(toppedUp, paperSale(held, held, 122.1), 122.1, NOW + 60_000);

	it("keeps the first buy's price as the pick-day price, and names the blended figure an average cost", () => {
		expect(closing.lots).toHaveLength(2);
		const view = closedPick(closing);
		expect(firstPrice(view)).toBe(98.5);
		// the blended cost (what the closed view printed as "Picked May 8 at"): $102.46, now only as an average
		expect(money(closing.stake / closing.shares)).toBe("$102.46");
		expect(money(blendedCost(view)!)).toBe("$102.46");
		expect(view.addedAt).toBe(MAY8);
	});

	it("shows what the closing sale sold, cost and returned", () => {
		const view = closedPick(closing);
		expect(view.ticker).toBe("NVDA");
		expect(view.shares).toBe(closing.shares);
		expect(view.stake).toBe(closing.stake);
		expect(view.value).toBe(closing.proceeds);
		expect(view.gain).toBe(closing.pnl);
		expect(view.today).toBe(0);
		expect(pickReturn(view)).toBeCloseTo((closing.proceeds / closing.stake - 1) * 100, 1);
	});

	it("reads the first buy from a part sale's record too (every sale lists the buys it sold)", () => {
		const part = saleRecord(toppedUp, paperSale(held, held / 2, 122.1), 122.1, NOW);
		expect(firstPrice(closedPick(part))).toBe(98.5);
	});

	it("reads a record without lots as one buy at its stake a share (the seed's sales, older records)", () => {
		const shop: SoldEntry = { ticker: "SHOP", shares: 1.5731, proceeds: 112, pnl: 12, stake: 100, soldAt: NOW, addedAt: MAY8 };
		const view = closedPick(shop);
		expect(firstPrice(view)).toBeCloseTo(100 / 1.5731, 10);
		expect(blendedCost(view)).toBeNull();
		expect(view.addedAt).toBe(MAY8);
		// a record that does not know its buy day is dated by its sale; a record of nothing has no price
		expect(closedPick({ ...shop, addedAt: undefined }).addedAt).toBe(NOW);
		expect(closedPick({ ...shop, shares: 0 }).priceAtAdd).toBeNull();
		expect(closedPick({ ...shop, shares: 0 }).price).toBe(0);
	});

	it("prints a dash in 'vs the market': a pick that was sold out has nothing to compare", () => {
		// the review met "+24.0% ahead" here: the pick's whole return against a market that read as zero
		expect(versusMarket(24, 0).text).toBe("+24.0% ahead");
		expect(marketCell(true, 24, 0)).toEqual({ text: "—", tone: null });
		expect(marketCell(true, -3, 3.2)).toEqual({ text: NO_FIGURE, tone: null });
		// a pick still held keeps its comparison
		expect(marketCell(false, 24, 3.2)).toEqual({ text: "+20.8% ahead", tone: "up" });
		expect(marketCell(false, -3, 3.2)).toEqual(versusMarket(-3, 3.2));
	});
});

describe("what a Custom field writes to the address (review low 6)", () => {
	it("writes a typed value only when the ticket's own check passes, else the chip the field replaced", () => {
		expect(typedForAddress(37.5, true, 25)).toBe(37.5);
		expect(typedForAddress(0.5, false, 25)).toBe(25);
		expect(typedForAddress(9000, false, 50)).toBe(50);
		expect(typedForAddress(0.00001, false, 0.5)).toBe(0.5);
		// an emptied field, and anything that is not an amount, stand for the chip as well
		expect(typedForAddress(null, true, 25)).toBe(25);
		expect(typedForAddress(Number.NaN, true, 25)).toBe(25);
		expect(typedForAddress(0, true, 25)).toBe(25);
		expect(typedForAddress(-5, true, 25)).toBe(25);
	});

	it("rounds to six decimals, so no float noise lands in the address", () => {
		expect(99.999 / 100).not.toBe(0.99999);
		expect(String(99.999 / 100)).toBe("0.9999899999999999");
		expect(typedForAddress(99.999 / 100, true, 0.5)).toBe(0.99999);
		expect(typedForAddress(12.3456789, true, 25)).toBe(12.345679);
		expect(round6(1 / 3)).toBe(0.333333);
	});

	it("opens the sheet again on the share that was typed, whatever its size", () => {
		const portions = [0.25, 0.5, 0.75, 1];
		for (const typed of ["33.33", "12.5", "99.999", "66.6667", "0.004"]) {
			const written = typedForAddress(Number(typed) / 100, true, 0.5);
			expect(startPortion(portions, written, 0.5), typed).toEqual({ chip: 0.5, custom: typed });
		}
		// the address the review met ("?portion=0.00001") no longer opens a field holding "0"
		expect(startPortion(portions, 0.00001, 0.5)).toEqual({ chip: 0.5, custom: "0.001" });
		// an address that still carries the old float opens on the share it stood for
		expect(startPortion(portions, 0.9999899999999999, 0.5)).toEqual({ chip: 0.5, custom: "99.999" });
	});
});

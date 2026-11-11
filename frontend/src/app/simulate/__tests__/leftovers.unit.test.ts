/**
 * The LEFTOVERS round's Simulate rules (coordinator rulings N36.3b and N36.3c, 2026-11-10):
 * - a receipt entry the app has LEFT is never drawn again by the browser's Forward: a part sale's receipt over a pick that
 *   is still held, and Simulate home's buy receipt after Keep exploring, give their place to the page under them
 *   (back.ts replacesLeftReceipt over the tab's list, receiptLedger); a reload on a receipt still shows it;
 * - both sell sheets draw no sale line while they say why the sale cannot be placed (figures.ts saleLine).
 */
import { describe, expect, it } from "vitest";
import { receiptLedger, replacesLeftReceipt } from "../back";
import { saleLine } from "../figures";

const memoryStore = () => {
	const data = new Map<string, string>();
	return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe("a receipt the app has left gives its place to the page (N36.3b)", () => {
	it("replaces only a receipt entry that was left, and never while its own exit is under way", () => {
		expect(replacesLeftReceipt({ receipt: true, left: true })).toBe(true);
		expect(replacesLeftReceipt({ receipt: true, left: true, leaving: false })).toBe(true);
		// the receipt the person is looking at (just bought, just sold, or reloaded on it): drawn
		expect(replacesLeftReceipt({ receipt: true, left: false })).toBe(false);
		// the receipt's own way out stepping back onto its entry keeps it on screen through the step
		expect(replacesLeftReceipt({ receipt: true, left: true, leaving: true })).toBe(false);
		// an entry that draws no receipt (the pick page itself, a sheet that is not a receipt): nothing to replace
		expect(replacesLeftReceipt({ receipt: false, left: true })).toBe(false);
	});

	it("follows a part sale's receipt and a buy receipt through the tab's list, as the pick page and Simulate home use it", () => {
		const tab = receiptLedger(memoryStore());
		const partSale = "k-part"; // /simulate/picks/AMD?modal=sell-success&portion=0.25, AMD still held
		const buy = "k-buy"; // /simulate?modal=add-success&symbol=CRWD&amount=100
		// on screen: the pages list them as shown (a development double mount lists and unlists them at once)
		for (const key of [partSale, buy]) {
			tab.shown(key);
			tab.left(key);
			tab.shown(key);
			expect(replacesLeftReceipt({ receipt: true, left: tab.wasLeft(key) })).toBe(false);
		}
		// View portfolio steps back two entries (the Portfolio was below the pick), Keep exploring steps back one: both are
		// navigations off the receipt, so both entries are listed as left
		tab.left(partSale);
		tab.left(buy);
		// the browser's Forward lands on each entry again: the page under it takes its place
		expect(replacesLeftReceipt({ receipt: true, left: tab.wasLeft(partSale) })).toBe(true);
		expect(replacesLeftReceipt({ receipt: true, left: tab.wasLeft(buy) })).toBe(true);
		// a reload on a receipt lists nothing: another receipt the app never left is drawn
		expect(replacesLeftReceipt({ receipt: true, left: tab.wasLeft("k-reloaded") })).toBe(false);
	});

	it("keeps the list across a reload of the tab (sessionStorage), so a Forward after a reload still finds it", () => {
		const store = memoryStore();
		receiptLedger(store).left("k-buy");
		expect(receiptLedger(store).wasLeft("k-buy")).toBe(true);
		expect(receiptLedger(store).wasLeft(undefined)).toBe(false);
	});
});

describe("the sell sheets' sale line under a reason (N36.3c)", () => {
	it("is drawn only while the sheet says nothing against the sale", () => {
		expect(saleLine(false, null)).toBe(true);
		expect(saleLine(false, "too-small")).toBe(false);
		expect(saleLine(false, "nothing-held")).toBe(false);
		expect(saleLine(false, "no-price")).toBe(false);
		// a typed share above 100% has its own line, alone
		expect(saleLine(true, null)).toBe(false);
	});
});

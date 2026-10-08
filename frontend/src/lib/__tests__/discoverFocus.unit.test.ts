import { describe, expect, it } from "vitest";
import type { BrandSummary } from "@stak/shared";
import { DISCOVER_FOCUS, withFocus } from "@/lib/discoverFocus";

const brand = (ticker: string, dividendYield = "0%") =>
	({ id: ticker.toLowerCase(), ticker, name: ticker, financials: { dividendYield: { value: dividendYield } } }) as unknown as BrandSummary;

// KO pays a dividend; NVDA is Chips (tech); PFE is Pharma (health).
const deck = [brand("KO", "3.1%"), brand("NVDA", "0.03%"), brand("PFE", "5.9%")];

describe("withFocus", () => {
	it("leaves the recommended order alone without a focus (or an unknown one)", () => {
		expect(withFocus(deck, null)).toBe(deck);
		expect(withFocus(deck, "nope")).toBe(deck);
	});

	it("moves the chosen category's companies to the front, each group keeping its order", () => {
		expect(withFocus(deck, "tech").map((b) => b.ticker)).toEqual(["NVDA", "KO", "PFE"]);
		expect(withFocus(deck, "health").map((b) => b.ticker)).toEqual(["PFE", "KO", "NVDA"]);
		expect(withFocus(deck, "dividends").map((b) => b.ticker)).toEqual(["KO", "PFE", "NVDA"]);
	});

	it("offers the design's five categories", () => {
		expect(DISCOVER_FOCUS.map((f) => f.label)).toEqual(["Tech", "Healthcare", "Clean Energy", "AI", "Dividends"]);
	});
});

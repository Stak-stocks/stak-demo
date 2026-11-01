import { describe, expect, it } from "vitest";
import type { BrandSummary } from "@stak/shared";
import { buildActivity } from "@/components/mystak/desktop/MyStakPanels";

const brand = (id: string, ticker: string, name: string) => ({ id, ticker, name }) as BrandSummary;
const brands = new Map([["nvda", brand("nvda", "NVDA", "NVIDIA")], ["ko", brand("ko", "KO", "Coca-Cola")]]);

describe("buildActivity", () => {
	it("merges saves and searches newest first, naming each save's collection", () => {
		const items = buildActivity(
			{ nvda: { savedAt: 3000, priceAtSave: 100 }, ko: { savedAt: 1000, priceAtSave: 60 } },
			[{ query: "chips", at: 2000 }],
			brands,
			(t) => (t === "NVDA" ? "Chips" : "Drinks"),
		);
		expect(items.map((i) => i.title)).toEqual(["Added NVIDIA to Chips", 'Searched for "chips"', "Added Coca-Cola to Drinks"]);
		expect(items[0]!.ticker).toBe("NVDA");
		expect(items[1]!.ticker).toBeUndefined();
	});

	it("skips saves of companies it can't name, and keeps the six newest", () => {
		const searches = Array.from({ length: 8 }, (_, i) => ({ query: `q${i}`, at: i + 1 }));
		const items = buildActivity({ gone: { savedAt: 99, priceAtSave: null } }, searches, brands, () => "Other");
		expect(items).toHaveLength(6);
		expect(items[0]!.title).toBe('Searched for "q7"');
		expect(items.some((i) => i.title.includes("gone"))).toBe(false);
	});
});

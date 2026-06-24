import { describe, expect, it } from "vitest";
import { brands } from "@stak/shared";

// Snapshot of every distinct interestCategories value in use today (43/333 brands
// populate this optional, organically-grown field -- see shared/src/stockTags.ts's
// header comment on the four inconsistent taxonomies in this codebase). Not a
// canonical taxonomy, just a known-values list: this test exists to catch a
// genuinely NEW, unreviewed value sneaking in (most likely from the brand-generation
// tool hallucinating a category that doesn't fit any of these), not to enforce a
// "correct" vocabulary that doesn't exist yet.
const KNOWN_INTEREST_CATEGORIES = new Set([
	"automotive", "education", "entertainment", "fashion", "fitness", "food",
	"food_drink", "gaming", "investing", "lifestyle", "media", "music", "pets",
	"science", "shopping", "social", "sustainability", "tech", "travel",
]);

describe("brands catalog shape invariants", () => {
	it("has at least one entry", () => {
		expect(brands.length).toBeGreaterThan(0);
	});

	it("every brand has exactly 3 vibes", () => {
		const offenders = brands.filter((b) => b.vibes.length !== 3).map((b) => b.ticker);
		expect(offenders).toEqual([]);
	});

	it("every ticker is uppercase", () => {
		const offenders = brands.filter((b) => b.ticker !== b.ticker.toUpperCase()).map((b) => b.ticker);
		expect(offenders).toEqual([]);
	});

	it("every ticker is unique", () => {
		const seen = new Set<string>();
		const dupes: string[] = [];
		for (const b of brands) {
			if (seen.has(b.ticker)) dupes.push(b.ticker);
			seen.add(b.ticker);
		}
		expect(dupes).toEqual([]);
	});

	it("every populated interestCategories value is a known one", () => {
		const offenders: { ticker: string; category: string }[] = [];
		for (const b of brands) {
			for (const c of b.interestCategories ?? []) {
				if (!KNOWN_INTEREST_CATEGORIES.has(c)) offenders.push({ ticker: b.ticker, category: c });
			}
		}
		expect(offenders).toEqual([]);
	});

	it("every brand has a non-empty id, name, and bio", () => {
		const offenders = brands.filter((b) => !b.id || !b.name || !b.bio).map((b) => b.ticker);
		expect(offenders).toEqual([]);
	});
});

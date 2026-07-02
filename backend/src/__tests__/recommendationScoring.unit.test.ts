import { describe, expect, it } from "vitest";
import { computeRecommendationScore, type RecommendationFreshness, type ScorableStock } from "@stak/shared";

function emptyFreshness(): RecommendationFreshness {
	return {
		earningsTickers: new Set(),
		majorNewsTickers: new Set(),
		unusualMovers: new Set(),
		analystUpdatedTickers: new Set(),
	};
}

describe("computeRecommendationScore -- AI-generated output landing outside the closed vocabularies", () => {
	// The realistic failure mode for the brand-generation tool: it produces a
	// primaryCategory or learningTag that isn't a key anywhere in THEME_TAG_MAP
	// (shared/src/recommendationScoring.ts) or TAG_TO_DISPLAY_BUCKETS
	// (shared/src/displayCategories.ts). Per shared/src/stockTags.ts's documented
	// contract, this must degrade gracefully (lose theme-boost credit) rather than
	// throw, NaN out, or otherwise break scoring for that stock.

	it("scores a stock with an unrecognized primaryCategory and an unrecognized tag without crashing, and applies zero theme boost", () => {
		const stock: ScorableStock = {
			ticker: "ZZZQ",
			primaryCategory: "extraterrestrial_mining", // not in any THEME_TAG_MAP categories list
			learningTags: [{ tag: "zero_gravity_synergy", weight: 5 }], // not in any THEME_TAG_MAP tags list
		};

		const result = computeRecommendationScore(
			"ZZZQ",
			stock,
			{ zero_gravity_synergy: 10 }, // user has a taste score for the tag, just not theme-mapped
			emptyFreshness(),
			["high_growth", "momentum"], // today's themes -- neither should match this stock
			[],
		);

		expect(Number.isFinite(result.finalScore)).toBe(true);
		expect(result.scoreBreakdown.dailyBriefThemeBoost).toBe(0);
		// tasteMatchScore still works off raw tag weight -- unmapped tags aren't excluded
		// from matching the USER's own taste profile, only from the theme-boost bonus.
		expect(result.scoreBreakdown.tasteMatchScore).toBeGreaterThan(0);
		expect(result.matchedUserTags).toEqual(["zero_gravity_synergy"]);
	});

	it("still applies the diversity penalty for an unrecognized primaryCategory (that mechanism doesn't require a known category)", () => {
		const stock: ScorableStock = {
			ticker: "ZZZQ",
			primaryCategory: "extraterrestrial_mining",
			learningTags: [],
		};

		const result = computeRecommendationScore(
			"ZZZQ",
			stock,
			{},
			emptyFreshness(),
			[],
			["extraterrestrial_mining", "extraterrestrial_mining", "extraterrestrial_mining", "bank"],
		);

		expect(result.scoreBreakdown.diversityAdjustment).toBe(-0.10);
	});

	it("baseline sanity check: a recognized category/tag pair does earn theme boost, for contrast", () => {
		const stock: ScorableStock = {
			ticker: "AAPL",
			primaryCategory: "mega_cap_tech", // is in high_growth's categories
			learningTags: [{ tag: "ai", weight: 1 }], // is in high_growth's tags
		};

		const result = computeRecommendationScore("AAPL", stock, {}, emptyFreshness(), ["high_growth"], []);

		expect(result.scoreBreakdown.dailyBriefThemeBoost).toBeGreaterThan(0);
	});
});

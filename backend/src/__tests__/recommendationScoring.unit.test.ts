import { describe, expect, it } from "vitest";
import { computeRecommendationScore, STAK_WEIGHTED_STOCK_TAGS, TAG_SCORE_MAX, TAG_SCORE_MIN, type RecommendationFreshness, type ScorableStock, type StakStockTagConfig } from "@stak/shared";

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

describe("computeRecommendationScore -- taste match keeps stocks apart", () => {
	const catalog = STAK_WEIGHTED_STOCK_TAGS as unknown as StakStockTagConfig[];
	const byTicker = new Map(catalog.map((s) => [s.ticker, s]));
	/** tasteProfileService's right swipe: +5 x weight on each of the stock's tags, clamped like the database. */
	function swipeRight(scores: Record<string, number>, ticker: string) {
		for (const lt of byTicker.get(ticker)!.learningTags) {
			scores[lt.tag] = Math.min(TAG_SCORE_MAX, Math.max(TAG_SCORE_MIN, (scores[lt.tag] ?? 0) + 5 * lt.weight));
		}
	}
	const profile = (s: StakStockTagConfig) => s.learningTags.map((lt) => `${lt.tag}:${lt.weight}`).sort().join(",");
	/** The distinct tag profiles tied at the top score (stocks with identical tags can only tie). */
	const topProfiles = (scores: Record<string, number>) => {
		const scored = catalog.map((s) => ({ s, f: computeRecommendationScore(s.ticker, s, scores, emptyFreshness(), []).finalScore }));
		const best = Math.max(...scored.map((x) => x.f));
		return new Set(scored.filter((x) => x.f === best).map((x) => profile(x.s))).size;
	};

	it("a tech fan's swipes don't tie different stocks at the top (61 did after 4 swipes, 119 after 22)", () => {
		const tech = ["NVDA", "AMD", "MSFT", "AAPL", "GOOGL", "META", "AVGO", "CRM", "ORCL", "ADBE", "SNOW", "NET", "DDOG", "CRWD", "PLTR", "QCOM", "INTC", "AMZN", "SHOP", "PANW", "TSLA", "NFLX"];
		const scores: Record<string, number> = {};
		tech.slice(0, 4).forEach((t) => swipeRight(scores, t));
		expect(topProfiles(scores)).toBe(1);
		tech.slice(4).forEach((t) => swipeRight(scores, t));
		expect(topProfiles(scores)).toBe(1);
		// Tied stocks share their tags exactly; news or earnings now lifts one above the rest (the old cap at 1 swallowed it).
		const nvda = byTicker.get("NVDA")!;
		const amd = byTicker.get("AMD")!;
		const fresh = { ...emptyFreshness(), earningsTickers: new Set(["AMD"]) };
		expect(computeRecommendationScore("AMD", amd, scores, fresh, []).finalScore)
			.toBeGreaterThan(computeRecommendationScore("NVDA", nvda, scores, fresh, []).finalScore);
	});

	it("measures against the user's strongest interest: a full match scores 1, a partial one less", () => {
		const stock: ScorableStock = { ticker: "X", primaryCategory: "x", learningTags: [{ tag: "a", weight: 1 }, { tag: "b", weight: 1 }] };
		expect(computeRecommendationScore("X", stock, { a: 20, b: 20 }, emptyFreshness(), []).scoreBreakdown.tasteMatchScore).toBe(1);
		expect(computeRecommendationScore("X", stock, { a: 20, b: 0 }, emptyFreshness(), []).scoreBreakdown.tasteMatchScore).toBe(0.5);
	});

	it("caps runaway scores: a tag at 65 counts as 30", () => {
		const stock: ScorableStock = { ticker: "X", primaryCategory: "x", learningTags: [{ tag: "a", weight: 1 }, { tag: "b", weight: 1 }] };
		const capped = computeRecommendationScore("X", stock, { a: 65, b: 15 }, emptyFreshness(), []);
		expect(capped.scoreBreakdown.tasteMatchScore).toBe(0.75);
	});

	it("one small signal isn't a perfect match, and passed tags sink below neutral", () => {
		const stock: ScorableStock = { ticker: "X", primaryCategory: "x", learningTags: [{ tag: "a", weight: 1 }] };
		expect(computeRecommendationScore("X", stock, { a: 3 }, emptyFreshness(), []).scoreBreakdown.tasteMatchScore).toBe(0.6);
		expect(computeRecommendationScore("X", stock, { a: -10, b: 20 }, emptyFreshness(), []).scoreBreakdown.tasteMatchScore).toBe(-0.5);
	});
});

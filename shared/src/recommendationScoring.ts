// Single source of truth for the recommendation-scoring formula used by both the
// live Discover/swipe deck (frontend) and the /api/recommendations/debug endpoint
// (backend). Keep this file as the only place the formula is implemented —
// changing it here changes it everywhere.

export interface LearningTagLike {
	tag: string;
	weight: number;
}

export interface ScorableStock {
	ticker: string;
	primaryCategory: string;
	learningTags: LearningTagLike[];
}

export interface RecommendationFreshness {
	earningsTickers: Set<string>;
	majorNewsTickers: Set<string>;
	unusualMovers: Set<string>;
	analystUpdatedTickers: Set<string>;
}

export interface ScoreBreakdown {
	tasteMatchScore: number;
	freshnessBoost: number;
	freshnessDetail: { earnings: number; majorNews: number; unusualMove: number; analystUpdate: number };
	dailyBriefThemeBoost: number;
	diversityAdjustment: number;
}

export interface RecommendationScoreResult {
	finalScore: number;
	scoreBreakdown: ScoreBreakdown;
	matchedUserTags: string[];
}

// Maps Daily Brief deck theme IDs → stock tags / primaryCategories that qualify for the boost
export const THEME_TAG_MAP: Record<string, { tags: string[]; categories: string[] }> = {
	high_growth:  { tags: ["high_growth", "innovation", "cloud", "saas", "ai", "ai_supply_chain", "semiconductor"], categories: ["mega_cap_tech", "consumer_tech", "enterprise_software", "semiconductor", "semiconductor_equipment", "automation_ai", "database_data"] },
	consumer_tech:{ tags: ["technology", "consumer_brand", "consumer_platform", "hardware", "software", "gaming", "streaming"], categories: ["consumer_tech", "mega_cap_tech", "streaming_media", "social_media", "gaming"] },
	defensive:    { tags: ["defensive", "consumer_staples", "dividend_income", "everyday_spending", "familiar_brand", "utilities"], categories: ["consumer_staples", "utilities", "health_insurance", "insurance", "telecom"] },
	dividend:     { tags: ["dividend_income", "income", "reit"], categories: ["reit", "utilities", "telecom", "insurance"] },
	value:        { tags: ["familiar_brand", "consumer_staples", "financials", "banking"], categories: ["bank", "insurance", "retail", "consumer_staples", "industrial"] },
	quality:      { tags: ["mega_cap", "recurring_revenue", "network_effects", "high_growth", "saas"], categories: ["mega_cap_tech", "payment_network", "enterprise_software", "consumer_tech"] },
	momentum:     { tags: ["high_growth", "speculative", "meme_stock"], categories: ["meme_stock", "space_airmobility"] },
	explore:      { tags: [], categories: [] },
	diversified:  { tags: [], categories: [] },
};

/**
 * finalScore = tasteMatchScore + freshnessBoost + dailyBriefThemeBoost + diversityAdjustment
 * clamped to [0, 1] at the top only — negative scores are intentional: stocks in a
 * category the user has repeatedly passed should sink below neutral stocks, not tie
 * with them at 0. (This is a no-op floor-wise wherever diversityAdjustment is 0, e.g.
 * server-side calls that don't pass recentlyShownCats.)
 *
 * `ticker` is taken separately from `stock` because freshness signals (earnings/news/
 * unusual move/analyst update) should still apply even if the stock isn't in the
 * tag-weighted dataset.
 */
export function computeRecommendationScore(
	ticker: string,
	stock: ScorableStock | null | undefined,
	tagScores: Record<string, number>,
	freshness: RecommendationFreshness,
	todayThemes: string[],
	recentlyShownCats: string[] = [],
): RecommendationScoreResult {
	const upperTicker = ticker.toUpperCase();

	// 1. tasteMatchScore (0–1): weighted sum of user's tag scores for this stock's learning tags
	const matchedUserTags: string[] = [];
	const weightedSum = stock
		? stock.learningTags.reduce((sum, lt) => {
			const score = tagScores[lt.tag] ?? 0;
			if (score > 0) matchedUserTags.push(lt.tag);
			return sum + score * lt.weight;
		}, 0)
		: 0;
	const tasteMatchScore = Math.min(1, weightedSum / 10);

	// 2. freshnessBoost (0–0.20): boost stocks with imminent activity
	const earningsBoost    = freshness.earningsTickers.has(upperTicker)       ? 0.08 : 0;
	const newsBoost        = freshness.majorNewsTickers.has(upperTicker)      ? 0.06 : 0;
	const unusualMoveBoost = freshness.unusualMovers.has(upperTicker)         ? 0.06 : 0;
	const analystBoost     = freshness.analystUpdatedTickers.has(upperTicker) ? 0.04 : 0;
	const freshnessBoost = Math.min(0.20, earningsBoost + newsBoost + unusualMoveBoost + analystBoost);

	// 3. dailyBriefThemeBoost: +0.03 per Daily Brief theme the stock matches (max 0.12)
	const stockTags = new Set(stock?.learningTags.map((lt) => lt.tag) ?? []);
	const stockCat = stock?.primaryCategory ?? "";
	const themeMatchCount = todayThemes.reduce((sum, themeId) => {
		const mapping = THEME_TAG_MAP[themeId];
		if (!mapping) return sum;
		return sum + (mapping.tags.some((t) => stockTags.has(t)) || mapping.categories.includes(stockCat) ? 1 : 0);
	}, 0);
	const dailyBriefThemeBoost = Math.min(0.12, themeMatchCount * 0.03);

	// 4. diversityAdjustment: penalise if same primaryCategory appears 3+ times in last 5 shown
	const catCountInRecent = recentlyShownCats.slice(0, 5).filter((c) => c === stockCat).length;
	const diversityAdjustment = stockCat && catCountInRecent >= 3 ? -0.10 : 0;

	// Not rounded — the frontend sorts the live deck on this value, and rounding to
	// 3dp could tie stocks that should stay strictly ordered. Breakdown fields below
	// are rounded since they're only ever surfaced for human-readable debug output.
	const finalScore = Math.min(1, tasteMatchScore + freshnessBoost + dailyBriefThemeBoost + diversityAdjustment);

	return {
		finalScore,
		scoreBreakdown: {
			tasteMatchScore: Math.round(tasteMatchScore * 1000) / 1000,
			freshnessBoost: Math.round(freshnessBoost * 1000) / 1000,
			freshnessDetail: { earnings: earningsBoost, majorNews: newsBoost, unusualMove: unusualMoveBoost, analystUpdate: analystBoost },
			dailyBriefThemeBoost: Math.round(dailyBriefThemeBoost * 1000) / 1000,
			diversityAdjustment,
		},
		matchedUserTags,
	};
}

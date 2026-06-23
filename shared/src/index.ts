export { TIER_XP, TIER_THRESHOLDS, xpToTier, ACTIVITY_TYPES } from "./tierConfig";
export type { TierNumber, ActivityType } from "./tierConfig";

export { computeRecommendationScore, THEME_TAG_MAP } from "./recommendationScoring";
export type {
	LearningTagLike,
	ScorableStock,
	RecommendationFreshness,
	ScoreBreakdown,
	RecommendationScoreResult,
} from "./recommendationScoring";

export { marketSessionBucket } from "./marketSession";

export {
	TAG_TO_DISPLAY_BUCKETS,
	DISPLAY_CATEGORY_LABELS,
	DISPLAY_CATEGORY_TOP_LABELS,
	computeDisplayCategoryScores,
	computeDisplayCategoryPercentages,
	computeTopDisplayCategory,
} from "./displayCategories";
export type { DisplayCategoryKey } from "./displayCategories";

export { getNYSEHolidays } from "./nyseHolidays";

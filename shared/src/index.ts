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

export { getMarketDayKey } from "./marketDayKey";

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

export { DAILY_SWIPE_LIMIT } from "./swipeLimit";

export { brands, getBrandLogoUrl, getBrandFallbackLogoUrl, getBrandUltimateFallbackUrl, getBrandHeroUrl } from "./brands/index";
export type { BrandProfile, BrandSummary, BrandIdentity, VibeMetric, FinancialMetric, NewsArticle } from "./brands/index";

export { STAK_WEIGHTED_STOCK_TAGS, ACTION_POINTS } from "./stockTags";
export type { StakStockTagConfig, WeightedLearningTag } from "./stockTags";

export { getPeerTickers, buildPeerLookupIndex, MANUAL_PEER_OVERRIDES } from "./peerGroups";
export type { PeerLookupIndex } from "./peerGroups";

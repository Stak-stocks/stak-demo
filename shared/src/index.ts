export { TIER_XP, TIER_THRESHOLDS, xpToTier, ACTIVITY_TYPES, SANDBOX_BUDGETS, ACTIVITY_XP_CAP } from "./tierConfig";
export type { TierNumber, ActivityType } from "./tierConfig";

export { computeRecommendationScore, THEME_TAG_MAP } from "./recommendationScoring";
export type {
	LearningTagLike,
	ScorableStock,
	RecommendationFreshness,
	ScoreBreakdown,
	RecommendationScoreResult,
} from "./recommendationScoring";

export { marketSessionBucket, getEasternDateKey } from "./marketSession";

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

export { STAK_CAPACITY } from "./stakCapacity";

// The actual `brands` array (~1MB) is intentionally NOT re-exported here.
// shared/src/brands/index.ts builds it and also re-exports logoHelpers from
// the same module -- bundlers treat a module as one inseparable unit, so
// re-exporting `brands` here would drag the whole catalog into every
// frontend importer's chunk even if they only wanted a logo-URL helper.
// Callers that genuinely need the full array (frontend: none anymore, all
// use useBrandsList()/useBrandDetail(); backend: import directly) use the
// deep import `@stak/shared/brands` instead (see shared/package.json's
// "exports" map).
export { getBrandLogoUrl, getBrandFallbackLogoUrl, getBrandUltimateFallbackUrl, getBrandHeroUrl } from "./brands/logoHelpers";
export type { BrandProfile, BrandSummary, BrandIdentity, VibeMetric, FinancialMetric, NewsArticle } from "./brands/types";

export { STAK_WEIGHTED_STOCK_TAGS, ACTION_POINTS } from "./stockTags";
export type { StakStockTagConfig, WeightedLearningTag, StakTicker } from "./stockTags";

export { CATEGORY_NAMES, categoryName, categoryNameOf, categoryGroupId, categoryFamily } from "./stakCategories";
export type { CategoryFamily } from "./stakCategories";

export { getPeerTickers, buildPeerLookupIndex, MANUAL_PEER_OVERRIDES } from "./peerGroups";
export type { PeerLookupIndex } from "./peerGroups";

export { formatMarketCap, calcPercentChange } from "./financialFormat";

export {
	SANDBOX_STARTING_BALANCES,
	SANDBOX_DEFAULT_STARTING_BALANCE,
	SANDBOX_STRATEGIES,
	SANDBOX_MAX_OPEN_ORDERS,
	SANDBOX_MIN_SHARES,
	SANDBOX_NAME_MAX_LENGTH,
} from "./sandboxConfig";
export type { SandboxStartingBalance, SandboxStrategy } from "./sandboxConfig";

export { PRICE_THRESHOLDS, DEFAULT_PRICE_THRESHOLD, isPriceThreshold } from "./notificationConfig";
export { TERMS_VERSION, PRIVACY_VERSION, TERMS_URL, PRIVACY_URL, ELIGIBILITY_ENFORCED_FROM } from "./eligibility";
export type { PriceThreshold } from "./notificationConfig";

export { STAK_AI_WINDOW_LIMIT, STAK_AI_WINDOW_HOURS, STAK_AI_VIA } from "./stakAi";
export type { StakAiContext, StakAiUsage, StakAiAnswerKind, StakAiSource, StakAiChatReply, StakAiErrorCode, StakAiStoredMessage, StakAiVia, StakAiEntry } from "./stakAi";
export * from "./earlyAccess.js";

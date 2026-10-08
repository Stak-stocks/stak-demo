/** The price-move thresholds (percent) the notification settings offer, and the one a device that never chose
 *  gets - single source of truth for backend validation and push-run, and web. Mirrored by hand in Android's
 *  UserProfile.PRICE_THRESHOLDS and iOS's UserProfile.priceThresholds; Kotlin and Swift can't import this. */
export const PRICE_THRESHOLDS = [1, 3, 5, 10] as const;
export type PriceThreshold = (typeof PRICE_THRESHOLDS)[number];
export const DEFAULT_PRICE_THRESHOLD: PriceThreshold = 3;

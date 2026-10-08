/** The price-move thresholds (percent) the notification settings offer -- single source of truth for backend
 *  validation, push-run and web. Mirrored by hand in Android's UserProfile.PRICE_THRESHOLDS (data/UserProfile.kt),
 *  iOS's UserProfile.priceThresholds (UserProfile.swift) and the check in migration
 *  20261008010000_push_devices_price_threshold.sql; Kotlin, Swift and SQL can't import this. */
export const PRICE_THRESHOLDS = [1, 3, 5, 10] as const;
export type PriceThreshold = (typeof PRICE_THRESHOLDS)[number];
/** The threshold a device or account that never chose one gets. Mirrored by hand in Android and iOS (UserProfile,
 *  Session) and the migration's column default, like the list. */
export const DEFAULT_PRICE_THRESHOLD: PriceThreshold = 3;

/** One of the offered thresholds. */
export function isPriceThreshold(n: unknown): n is PriceThreshold {
	return typeof n === "number" && (PRICE_THRESHOLDS as readonly number[]).includes(n);
}

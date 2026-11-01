// Web notification preferences - stored in the account's `preferences.web_notifications` (PUT /api/me
// keeps every other key). Android keeps its own copy on the phone; these are the web's.

import { DEFAULT_PRICE_THRESHOLD, isPriceThreshold, type PriceThreshold } from "@stak/shared";

export interface NotificationPrefs {
	priceAlerts: boolean;
	dailyDeck: boolean;
	marketNews: boolean;
	/** A saved stock must move at least this many percent to be flagged. */
	priceThreshold: PriceThreshold;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
	priceAlerts: true,
	dailyDeck: true,
	marketNews: false,
	priceThreshold: DEFAULT_PRICE_THRESHOLD,
};

export function readNotificationPrefs(preferences: unknown): NotificationPrefs {
	const raw = (preferences as { web_notifications?: Partial<NotificationPrefs> } | null | undefined)?.web_notifications;
	const threshold = raw?.priceThreshold;
	return {
		priceAlerts: typeof raw?.priceAlerts === "boolean" ? raw.priceAlerts : DEFAULT_NOTIFICATION_PREFS.priceAlerts,
		dailyDeck: typeof raw?.dailyDeck === "boolean" ? raw.dailyDeck : DEFAULT_NOTIFICATION_PREFS.dailyDeck,
		marketNews: typeof raw?.marketNews === "boolean" ? raw.marketNews : DEFAULT_NOTIFICATION_PREFS.marketNews,
		priceThreshold: isPriceThreshold(threshold) ? threshold : DEFAULT_NOTIFICATION_PREFS.priceThreshold,
	};
}

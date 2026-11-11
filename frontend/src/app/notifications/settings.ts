/**
 * The notification settings behind Profile › Notifications (/profile/notifications), kept in this browser per account
 * (the guest persona has its own key), as both phones keep them on the device: android ui/UserProfile.kt:37-42
 * (priceAlerts, dailyDeck, marketNews, priceThreshold, read and written by ui/Session.kt:87-90 / 209-212), ios
 * UserProfile.swift:33-37 + Session.swift:70-73. They decide what the bell's inbox derives (live/notifications.ts):
 * - priceAlerts / priceThreshold: the "<T> is up X% today" rows, for every saved or held company that moved at least
 *   the threshold today (the phones' copy: "a saved or bought stock moves more than 3%", SettingsScreens.kt:160);
 * - dailyDeck: the deck rows ("Your daily deck is ready" each morning, "Deck complete" once today's deck is done);
 * - marketNews: the daily brief row ("Your daily brief is ready").
 * Defaults: the phones' (priceAlerts on, threshold 3 %, dailyDeck on), except marketNews, which the phones default to
 * off (Session.kt:89) while their toggle drives nothing: on the web it decides the brief row, and the frames' inbox
 * (2:2728) and every inbox the web has derived so far carry that row, so the web's default is on.
 */
import { useCallback, useMemo } from "react";
import { storeFor, useStore } from "@/app/live/guest";
import { useLive } from "@/app/live/store";

export type NotificationSettings = {
	/** "Price moves on your picks" */
	priceAlerts: boolean;
	/** "Price threshold": the smallest daily move, in %, that earns a row (one of PRICE_THRESHOLDS) */
	priceThreshold: number;
	/** "Daily deck" */
	dailyDeck: boolean;
	/** "Market news" */
	marketNews: boolean;
};

/** The phones' threshold chips (SettingsScreens.kt:169, SettingsViews.swift:160): 1 % / 3 % / 5 % / 10 %. */
export const PRICE_THRESHOLDS = [1, 3, 5, 10] as const;

export const DEFAULT_SETTINGS: Readonly<NotificationSettings> = { priceAlerts: true, priceThreshold: 3, dailyDeck: true, marketNews: true };

export const settingsKey = (uid: string | null) => `stak.notify.${uid ?? "guest"}.v1`;

const seed = (): NotificationSettings => ({ ...DEFAULT_SETTINGS });

/** The settings store of an account (`uid`) or of the signed-out guest (`null`). */
export const settingsStore = (uid: string | null) => storeFor<NotificationSettings>(settingsKey(uid), seed);

/** A stored threshold the chips do not offer (a hand-edited value) reads as the default. */
export function normalizeSettings(s: NotificationSettings): NotificationSettings {
	return (PRICE_THRESHOLDS as readonly number[]).includes(s.priceThreshold) ? s : { ...s, priceThreshold: DEFAULT_SETTINGS.priceThreshold };
}

/** The current person's settings and the setter that keeps a change in this browser at once. */
export function useNotificationSettings(): [NotificationSettings, (patch: Partial<NotificationSettings>) => void] {
	const uid = useLive().uid;
	const store = settingsStore(uid);
	const raw = useStore(store);
	const settings = useMemo(() => normalizeSettings(raw), [raw]);
	const update = useCallback((patch: Partial<NotificationSettings>) => store.update(patch), [store]);
	return [settings, update];
}

/** Back to the defaults (the guest persona's Log out / Delete account start the demo over). */
export const resetNotificationSettings = (uid: string | null) => settingsStore(uid).reset();

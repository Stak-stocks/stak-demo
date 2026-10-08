import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DAILY_SWIPE_LIMIT } from "@stak/shared";
import { getDeviceState, getProfile, putDeviceState, type DeviceState } from "@/lib/api";
import { getLastCloseRef, getTodayKey } from "@/lib/utils";
import { sessionDay } from "@/components/discover/discoverTheme";
import { buildNotifications, unreadIds, type NotificationItem } from "@/lib/notifications";
import { readNotificationPrefs } from "@/lib/notificationPrefs";
import { syncWebPushPrefsOnLoad } from "@/lib/webPush";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useAuth } from "@/context/AuthContext";

const DEVICE_STATE_KEY = ["device-state"];

/**
 * The inbox: items derived from data the app already has (saved stocks' moves, cards left in
 * today's deck, account age) plus the server's set of read ids, shared with Android. Reads are
 * marked all at once when the inbox is opened, like Android's markAllRead().
 */
export function useNotifications() {
	const { appUser } = useAuth();
	const queryClient = useQueryClient();
	const { swipedBrands, batchQuotes, account } = useMyStakData();

	const { data: profile } = useQuery({
		queryKey: ["profile"],
		queryFn: getProfile,
		staleTime: 10 * 60 * 1000,
		retry: 0,
		enabled: !!appUser,
	});

	const { data: deviceState } = useQuery({
		queryKey: DEVICE_STATE_KEY,
		queryFn: getDeviceState,
		staleTime: 60 * 1000,
		retry: 1,
		enabled: !!appUser,
	});

	const firstName = appUser?.displayName?.split(" ")[0] ?? undefined;
	const prefs = readNotificationPrefs(account?.preferences);
	// The bell is on every page: the first account read re-sends this browser's push settings once.
	useEffect(() => { if (account) syncWebPushPrefsOnLoad(prefs); }, [account, prefs]);
	const swipeState = account?.dailySwipeState;
	const usedToday = swipeState?.date === getTodayKey() ? swipeState.count : 0;

	const items: NotificationItem[] = useMemo(() => buildNotifications({
		held: swipedBrands.map((b) => ({ ticker: b.ticker, name: b.name, changePercent: batchQuotes[b.ticker]?.changePercent ?? null })),
		closeRef: getLastCloseRef(),
		// The session the move belongs to, not the calendar day (the apps): Friday's move stays read through Monday's open.
		marketDay: sessionDay(),
		deckCardsLeft: Math.max(0, DAILY_SWIPE_LIMIT - usedToday),
		deckDay: getTodayKey(),
		createdAt: profile?.createdAt,
		firstName,
		threshold: prefs.priceThreshold,
		priceAlerts: prefs.priceAlerts,
		dailyDeck: prefs.dailyDeck,
	 
	}), [swipedBrands, batchQuotes, usedToday, profile?.createdAt, firstName, prefs.priceThreshold, prefs.priceAlerts, prefs.dailyDeck]);

	const readIds = useMemo(() => new Set(deviceState?.notifRead ?? []), [deviceState]);
	const unread = useMemo(() => unreadIds(items, readIds), [items, readIds]);
	// Until the read ids arrive nothing can honestly be called unread (or read).
	const loaded = deviceState !== undefined;

	const markAllReadMutation = useMutation({
		mutationFn: async (ids: string[]) => {
			await putDeviceState({ notifRead: ids });
		},
		onMutate: async (ids: string[]) => {
			const previous = queryClient.getQueryData<DeviceState>(DEVICE_STATE_KEY);
			if (previous) queryClient.setQueryData<DeviceState>(DEVICE_STATE_KEY, { ...previous, notifRead: ids });
			return { previous };
		},
		onError: (_e, _ids, context) => {
			if (context?.previous) queryClient.setQueryData(DEVICE_STATE_KEY, context.previous);
		},
	});

	/** Union with what the server already holds so ids Android wrote are never dropped. */
	const markAllRead = useCallback(() => {
		if (!loaded || unread.length === 0) return;
		markAllReadMutation.mutate([...new Set([...(deviceState?.notifRead ?? []), ...items.map((i) => i.id)])]);
	}, [loaded, unread.length, items, deviceState, markAllReadMutation]);

	return { items, unread, unreadCount: loaded ? unread.length : 0, loaded, markAllRead };
}

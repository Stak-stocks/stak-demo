/**
 * useSwipeLimit — daily swipe counter derived from AccountContext.
 *
 * For logged-in users: reads from account.dailySwipeState (real-time Firestore).
 * For guests: localStorage only.
 *
 * Writes for logged-in users go through AccountContext.incrementSwipeCount()
 * which writes directly to Firestore — no separate API call needed.
 */

import { useState, useCallback } from "react";
import { useAccount } from "@/context/AccountContext";
// Re-exported, not a local copy — see @/lib/utils for the 9 AM-reset implementation.
// NOTE: if a `vi.mock("@/hooks/useSwipeLimit", ...)` factory is ever added elsewhere
// without including getTodayKey, any code importing it from this path would get
// `undefined` at test time with no compile-time signal — stub it in the mock too.
import { getTodayKey } from "@/lib/utils";

export { getTodayKey };
export const DAILY_SWIPE_LIMIT = 20;

// ── localStorage helpers (guest path only) ────────────────────────────────────

function localStorageKey(uid: string) {
	return `daily-swipe-state:${uid}`;
}

function readLocalCount(uid: string): number {
	try {
		const raw = localStorage.getItem(localStorageKey(uid));
		if (!raw) return 0;
		const parsed: { count: number; date: string } = JSON.parse(raw);
		return parsed.date === getTodayKey() ? parsed.count : 0;
	} catch {
		return 0;
	}
}

function writeLocalCount(uid: string, count: number): void {
	localStorage.setItem(
		localStorageKey(uid),
		JSON.stringify({ count, date: getTodayKey() }),
	);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface SwipeLimitResult {
	count: number;
	remaining: number;
	hasReachedLimit: boolean;
	/** Call once per swipe (card deck or search add). */
	increment: () => void;
	/** True once account data is loaded. */
	loaded: boolean;
}

export function useSwipeLimit(uid: string, isLoggedIn: boolean): SwipeLimitResult {
	const { account, accountLoading, incrementSwipeCount } = useAccount();
	const todayKey = getTodayKey();

	// Guest-only local counter
	const [guestCount, setGuestCount] = useState<number>(() =>
		isLoggedIn ? 0 : readLocalCount(uid),
	);

	let count: number;
	if (!isLoggedIn) {
		count = guestCount;
	} else if (account?.dailySwipeState?.date === todayKey) {
		count = account.dailySwipeState.count ?? 0;
	} else {
		count = 0;
	}

	const bonusSwipes = (isLoggedIn ? account?.bonusSwipes : 0) ?? 0;
	const effectiveLimit = DAILY_SWIPE_LIMIT + bonusSwipes;

	const loaded = isLoggedIn ? !accountLoading : true;

	const increment = useCallback(() => {
		if (isLoggedIn) {
			incrementSwipeCount().catch(() => {});
		} else {
			setGuestCount((prev) => {
				const next = prev + 1;
				writeLocalCount(uid, next);
				return next;
			});
		}
	}, [isLoggedIn, incrementSwipeCount, uid]);

	return {
		count,
		remaining: Math.max(0, effectiveLimit - count),
		hasReachedLimit: count >= effectiveLimit,
		increment,
		loaded,
	};
}

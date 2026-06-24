/**
 * useSwipeLimit — daily swipe counter derived from AccountContext.
 *
 * For logged-in users: reads from account.dailySwipeState (real-time Firestore),
 * topped up with a local optimistic bump so the limit gate is accurate the instant
 * a swipe happens, without waiting on the Firestore listener's round-trip latency.
 * The backend (backend/src/routes/swipe.ts, backend/src/routes/me.ts) is the actual
 * source of truth — this hook's job is just to make the UI feel instant and correct
 * while that confirmation is in flight.
 *
 * For guests: localStorage only.
 */

import { useState, useCallback } from "react";
import { useAccount } from "@/context/AccountContext";
import { DAILY_SWIPE_LIMIT } from "@stak/shared";
// Re-exported, not a local copy — see @/lib/utils for the 9 AM-reset implementation.
// NOTE: if a `vi.mock("@/hooks/useSwipeLimit", ...)` factory is ever added elsewhere
// without including getTodayKey, any code importing it from this path would get
// `undefined` at test time with no compile-time signal — stub it in the mock too.
import { getTodayKey } from "@/lib/utils";

export { getTodayKey, DAILY_SWIPE_LIMIT };

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
	/** Network call + optimistic bump + reconcile. For call sites that don't already
	 *  hit the backend per action (search add, global add-to-stak). */
	increment: () => Promise<boolean>;
	/** Instant, synchronous, no network call. For the swipe-stack, which gets its
	 *  server confirmation from recordSwipe()'s own response instead (see
	 *  reportSwipeResult) — calling both per swipe would race two transactions on
	 *  the same Firestore doc. */
	bumpOptimistic: () => void;
	/** Reconciles the optimistic count against the backend's authoritative response,
	 *  once recordSwipe() resolves. Called by the swipe-stack path. */
	reportSwipeResult: (accepted: boolean, count: number, limit: number) => void;
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

	let serverCount: number;
	if (!isLoggedIn) {
		serverCount = guestCount;
	} else if (account?.dailySwipeState?.date === todayKey) {
		serverCount = account.dailySwipeState.count ?? 0;
	} else {
		serverCount = 0;
	}

	// Logged-in-only optimistic value (absolute count, not a delta) — reset whenever
	// the day rolls over, mirroring the guest path's date check above. Without the
	// date guard, a long-lived tab open across the reset boundary would carry
	// yesterday's value into today and never clear.
	const [optimistic, setOptimistic] = useState<{ date: string; value: number }>({
		date: todayKey,
		value: 0,
	});
	const optimisticValue = optimistic.date === todayKey ? optimistic.value : 0;

	const count = isLoggedIn ? Math.max(serverCount, optimisticValue) : serverCount;

	const bonusSwipes = (isLoggedIn ? account?.bonusSwipes : 0) ?? 0;
	const effectiveLimit = DAILY_SWIPE_LIMIT + bonusSwipes;

	const loaded = isLoggedIn ? !accountLoading : true;

	const bumpOptimistic = useCallback(() => {
		// Chain off whichever's higher right now (server-confirmed or our own running
		// optimistic value) — a bare local increment from 0 would undercount once the
		// server count is already ahead of it.
		setOptimistic((prev) => {
			const base = Math.max(prev.date === todayKey ? prev.value : 0, serverCount);
			return { date: todayKey, value: base + 1 };
		});
	}, [todayKey, serverCount]);

	const reportSwipeResult = useCallback((accepted: boolean, serverConfirmedCount: number, limit: number) => {
		// Server disagreed with our optimistic guess (rejection, or a second tab/device
		// raced ahead) — snap to its authoritative value so the gate can't drift wrong.
		if (!accepted) {
			setOptimistic({ date: todayKey, value: limit });
		} else {
			setOptimistic((prev) => ({
				date: todayKey,
				value: Math.max(prev.date === todayKey ? prev.value : 0, serverConfirmedCount),
			}));
		}
	}, [todayKey]);

	const increment = useCallback(async (): Promise<boolean> => {
		if (isLoggedIn) {
			bumpOptimistic();
			try {
				const result = await incrementSwipeCount();
				reportSwipeResult(result.accepted, result.count, result.limit);
				return result.accepted;
			} catch {
				return true; // network error — don't falsely block on our own failure
			}
		}
		setGuestCount((prev) => {
			const next = prev + 1;
			writeLocalCount(uid, next);
			return next;
		});
		return true;
	}, [isLoggedIn, incrementSwipeCount, uid, bumpOptimistic, reportSwipeResult]);

	return {
		count,
		remaining: Math.max(0, effectiveLimit - count),
		hasReachedLimit: count >= effectiveLimit,
		increment,
		bumpOptimistic,
		reportSwipeResult,
		loaded,
	};
}

/**
 * useSwipeLimit — single source of truth for the daily swipe counter.
 *
 * - On mount: fetches Firestore count (account-based, cross-device).
 *   Takes the higher of Firestore vs localStorage so offline swipes
 *   are never lost, then syncs whichever side is behind.
 * - increment(): updates state + localStorage + Firestore atomically.
 * - For guests (not logged in): localStorage only.
 */

import { useState, useCallback, useEffect } from "react";
import { getDailySwipeCount, saveDailySwipeCount } from "@/lib/api";

export const DAILY_SWIPE_LIMIT = 20;
const RESET_HOUR = 9; // 9 AM local time

// ── Date key (resets at 9 AM, same logic as before) ──────────────────────────

export function getSwipeTodayKey(): string {
	const now = new Date();
	if (now.getHours() < RESET_HOUR) {
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		return yesterday.toISOString().split("T")[0];
	}
	return now.toISOString().split("T")[0];
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function localStorageKey(uid: string) {
	return `daily-swipe-state:${uid}`;
}

function readLocalCount(uid: string): number {
	try {
		const raw = localStorage.getItem(localStorageKey(uid));
		if (!raw) return 0;
		const parsed: { count: number; date: string } = JSON.parse(raw);
		return parsed.date === getSwipeTodayKey() ? parsed.count : 0;
	} catch {
		return 0;
	}
}

function writeLocalCount(uid: string, count: number): void {
	localStorage.setItem(
		localStorageKey(uid),
		JSON.stringify({ count, date: getSwipeTodayKey() }),
	);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface SwipeLimitResult {
	count: number;
	remaining: number;
	hasReachedLimit: boolean;
	/** Call once per swipe (card deck or search add). Writes to localStorage + Firestore. */
	increment: () => void;
	/** True once the Firestore fetch has resolved (or failed). */
	loaded: boolean;
}

export function useSwipeLimit(uid: string, isLoggedIn: boolean): SwipeLimitResult {
	const todayKey = getSwipeTodayKey();
	const [count, setCount] = useState<number>(() => readLocalCount(uid));
	const [loaded, setLoaded] = useState(!isLoggedIn); // guests are immediately "loaded"

	// On mount (or on login), fetch Firestore and reconcile with localStorage
	useEffect(() => {
		if (!isLoggedIn) {
			setCount(readLocalCount(uid));
			setLoaded(true);
			return;
		}

		setLoaded(false);
		getDailySwipeCount()
			.then((data) => {
				const firestoreCount = data?.date === todayKey ? (data.count ?? 0) : 0;
				const localCount = readLocalCount(uid);
				// Use the higher — protects against offline swipes being lost
				const resolved = Math.max(firestoreCount, localCount);
				setCount(resolved);
				writeLocalCount(uid, resolved);
				// Sync whichever side is behind
				if (localCount > firestoreCount) {
					saveDailySwipeCount(todayKey, resolved).catch(() => {});
				}
			})
			.catch(() => {
				// Offline / error — fall back to localStorage
				setCount(readLocalCount(uid));
			})
			.finally(() => setLoaded(true));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uid, isLoggedIn]);

	// Reset counter when the day rolls over (checked every minute)
	useEffect(() => {
		const interval = setInterval(() => {
			const currentKey = getSwipeTodayKey();
			if (currentKey !== todayKey) {
				setCount(0);
				writeLocalCount(uid, 0);
			}
		}, 60_000);
		return () => clearInterval(interval);
	}, [uid, todayKey]);

	const increment = useCallback(() => {
		setCount((prev) => {
			const next = prev + 1;
			writeLocalCount(uid, next);
			if (isLoggedIn) {
				saveDailySwipeCount(getSwipeTodayKey(), next).catch(() => {});
			}
			return next;
		});
	}, [uid, isLoggedIn]);

	return {
		count,
		remaining: Math.max(0, DAILY_SWIPE_LIMIT - count),
		hasReachedLimit: count >= DAILY_SWIPE_LIMIT,
		increment,
		loaded,
	};
}

import { adminDb } from "../firebaseAdmin.js";
import { DAILY_SWIPE_LIMIT, getEasternDateKey } from "@stak/shared";
import { sanitizeClientDateKey } from "../lib/clientDateKey.js";

export interface SwipeLimitResult {
	accepted: boolean;
	count: number;
	limit: number;
}

/** Trusts the client's local-time todayKey (frontend/src/lib/utils.ts's getTodayKey)
 *  when present and plausible, since the daily swipe limit is a per-user concept that
 *  should follow the user's own day, not the market's. Falls back to ET (a reasonable
 *  single default for this US-focused app, far better than raw UTC, which rolls over
 *  hours before any US user's day actually ends) only if the client didn't send one. */
function sanitizeTodayKey(clientTodayKey: unknown): string {
	return sanitizeClientDateKey(clientTodayKey, getEasternDateKey());
}

/**
 * Atomically checks and increments a user's daily swipe count against
 * DAILY_SWIPE_LIMIT. Returns accepted:false (no write) once the limit's
 * reached — the only server-side authority for this limit; never trust a
 * client-reported count.
 *
 * Streak bonus swipes are temporarily disabled (not applied to the limit) --
 * streakService.ts still awards/accumulates bonusSwipes and the streak_bonus_*
 * badges as before, this just stops adding that value on top of the flat
 * daily cap. Re-enable by restoring `DAILY_SWIPE_LIMIT + bonusSwipes` below.
 */
export async function checkAndIncrementSwipeLimit(uid: string, clientTodayKey: unknown): Promise<SwipeLimitResult> {
	const todayKey = sanitizeTodayKey(clientTodayKey);
	const userRef = adminDb.collection("users").doc(uid);

	return adminDb.runTransaction(async (tx) => {
		const snap = await tx.get(userRef);
		const data = snap.data() ?? {};
		const saved = data.dailySwipeState as { date?: string; count?: number } | undefined;
		const currentCount = saved?.date === todayKey ? (saved.count ?? 0) : 0;
		const limit = DAILY_SWIPE_LIMIT;

		if (currentCount >= limit) {
			return { accepted: false, count: currentCount, limit };
		}

		const count = currentCount + 1;
		tx.set(userRef, { dailySwipeState: { date: todayKey, count } }, { merge: true });
		return { accepted: true, count, limit };
	});
}

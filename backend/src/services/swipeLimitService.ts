import { adminDb } from "../firebaseAdmin.js";
import { DAILY_SWIPE_LIMIT } from "@stak/shared";

export interface SwipeLimitResult {
	accepted: boolean;
	count: number;
	limit: number;
}

/** Clamps a client-supplied "today" date string to within 1 day of the server's own
 *  UTC date — wide enough to cover any legitimate timezone plus the frontend's 9am
 *  local-reset boundary, narrow enough that a client can't repeatedly claim a new day
 *  to reset their count back to 0. */
function sanitizeTodayKey(clientTodayKey: unknown): string {
	const now = new Date();
	const candidates = [-1, 0, 1].map((offsetDays) => {
		const d = new Date(now);
		d.setUTCDate(d.getUTCDate() + offsetDays);
		return d.toISOString().split("T")[0];
	});
	if (typeof clientTodayKey === "string" && candidates.includes(clientTodayKey)) {
		return clientTodayKey;
	}
	return candidates[1]!; // server's actual UTC today
}

/**
 * Atomically checks and increments a user's daily swipe count against
 * DAILY_SWIPE_LIMIT + bonusSwipes. Returns accepted:false (no write) once the
 * limit's reached — the only server-side authority for this limit; never trust a
 * client-reported count.
 */
export async function checkAndIncrementSwipeLimit(uid: string, clientTodayKey: unknown): Promise<SwipeLimitResult> {
	const todayKey = sanitizeTodayKey(clientTodayKey);
	const userRef = adminDb.collection("users").doc(uid);

	return adminDb.runTransaction(async (tx) => {
		const snap = await tx.get(userRef);
		const data = snap.data() ?? {};
		const saved = data.dailySwipeState as { date?: string; count?: number } | undefined;
		const currentCount = saved?.date === todayKey ? (saved.count ?? 0) : 0;
		const bonusSwipes = (data.bonusSwipes as number | undefined) ?? 0;
		const limit = DAILY_SWIPE_LIMIT + bonusSwipes;

		if (currentCount >= limit) {
			return { accepted: false, count: currentCount, limit };
		}

		const count = currentCount + 1;
		tx.set(userRef, { dailySwipeState: { date: todayKey, count } }, { merge: true });
		return { accepted: true, count, limit };
	});
}

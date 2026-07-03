import { DAILY_SWIPE_LIMIT, getEasternDateKey } from "@stak/shared";
import { sanitizeClientDateKey } from "../lib/clientDateKey.js";
import { pgQuery } from "../lib/postgres.js";

export interface SwipeLimitResult {
	accepted: boolean;
	count: number;
	limit: number;
}

/** Trusts the client's local-time todayKey when present and plausible; falls back to ET. */
function sanitizeTodayKey(clientTodayKey: unknown): string {
	return sanitizeClientDateKey(clientTodayKey, getEasternDateKey());
}

/**
 * Atomically checks and increments a user's daily swipe count against
 * DAILY_SWIPE_LIMIT via the check_and_increment_swipe_limit Postgres RPC.
 */
export async function checkAndIncrementSwipeLimit(uid: string, clientTodayKey: unknown): Promise<SwipeLimitResult> {
	const todayKey = sanitizeTodayKey(clientTodayKey);
	const result = await pgQuery<{ accepted: boolean; swipe_count: number; swipe_limit: number }>(
		`select accepted, swipe_count, swipe_limit from check_and_increment_swipe_limit($1, $2, $3)`,
		[uid, todayKey, DAILY_SWIPE_LIMIT],
	);
	const row = result.rows[0]!;
	return { accepted: row.accepted, count: row.swipe_count, limit: row.swipe_limit };
}

import { getEasternDateKey } from "@stak/shared";
import { sanitizeClientDateKey } from "../lib/clientDateKey.js";
import { pgQuery } from "../lib/postgres.js";

// ── Badge definitions ─────────────────────────────────────────────────────────
export interface BadgeInfo {
	id: string;
	name: string;
	description: string;
}

export const BADGES: Record<string, BadgeInfo> = {
	first_move:          { id: "first_move",          name: "First Move",          description: "You've started — most people never do." },
	explorer:            { id: "explorer",             name: "Explorer",            description: "Made your first swipe." },
	curious_mind:        { id: "curious_mind",         name: "Curious Mind",        description: "10 swipes in. You're getting curious." },
	consistent_learner:  { id: "consistent_learner",   name: "Consistent Learner",  description: "5-day streak. Your investor mindset is forming." },
	market_explorer:     { id: "market_explorer",      name: "Market Explorer",     description: "7-day streak. You're building real momentum." },
	pattern_recognizer:  { id: "pattern_recognizer",   name: "Pattern Recognizer",  description: "Viewed 15 intel cards. You're seeing the patterns." },
	trend_reader:        { id: "trend_reader",         name: "Trend Reader",        description: "14-day streak. You now see insights before others." },
	market_insider:      { id: "market_insider",       name: "STAK Insider",        description: "30-day streak. You're in the top % of users." },
};

// ── ISO week helper (passed to the RPC as p_current_week) ────────────────────
// UTC-explicit throughout; callers anchor `date` at noon UTC of the calendar day.
export function getISOWeek(date: Date): string {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${d.getUTCFullYear()}-W${week}`;
}

// ── Result returned to the caller (used for response / toast) ─────────────────
export interface StreakResult {
	streak: number;
	newBadges: BadgeInfo[];
	bonusSwipesAdded: number;
}

/**
 * Record a qualifying activity for the given user via the record_activity Postgres RPC.
 * Safe to call fire-and-forget — never throws to the caller.
 */
export async function recordActivity(
	uid: string,
	activityType: "swipe" | "intel_view" | "brand_tap",
	clientTodayKey?: unknown,
): Promise<StreakResult | null> {
	try {
		const today = sanitizeClientDateKey(clientTodayKey, getEasternDateKey());
		const currentWeek = getISOWeek(new Date(today + "T12:00:00Z"));

		const result = await pgQuery<{
			is_new_day: boolean;
			out_streak_count: number;
			new_badge_ids: string[];
			bonus_swipes_added: number;
		}>(
			`select is_new_day, out_streak_count, new_badge_ids, bonus_swipes_added
			 from record_activity($1, $2, $3, $4)`,
			[uid, activityType, today, currentWeek],
		);

		const row = result.rows[0]!;
		if (!row.is_new_day) return null;

		const newBadges = (row.new_badge_ids ?? [])
			.filter((id) => id in BADGES)
			.map((id) => BADGES[id]);

		return { streak: row.out_streak_count, newBadges, bonusSwipesAdded: row.bonus_swipes_added };
	} catch (err) {
		console.error("streakService error:", err);
		return null;
	}
}

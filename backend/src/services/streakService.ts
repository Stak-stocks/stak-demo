import { adminDb } from "../firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";

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

// ── ISO week helper (for grace day weekly reset) ──────────────────────────────
function getISOWeek(date: Date): string {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${d.getUTCFullYear()}-W${week}`;
}

function daysBetween(from: string, to: string): number {
	if (!from) return Infinity;
	const ms = new Date(to).getTime() - new Date(from).getTime();
	return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ── Result returned to the caller (used for response / toast) ─────────────────
export interface StreakResult {
	streak: number;
	newBadges: BadgeInfo[];
	bonusSwipesAdded: number;
}

/**
 * Record a qualifying activity for the given user.
 * Updates streak, badges, and bonus swipes atomically in a Firestore transaction.
 * Safe to call fire-and-forget — never throws to the caller.
 */
export async function recordActivity(
	uid: string,
	activityType: "swipe" | "intel_view" | "brand_tap",
): Promise<StreakResult> {
	try {
		const userRef = adminDb.collection("users").doc(uid);
		const today = new Date().toISOString().split("T")[0];
		const currentWeek = getISOWeek(new Date());

		return await adminDb.runTransaction(async (tx) => {
			const snap = await tx.get(userRef);
			const data = snap.data() ?? {};

			// ── Counters ────────────────────────────────────────────────────────
			const totalSwipeCount  = (data.totalSwipeCount  ?? 0) + (activityType === "swipe"       ? 1 : 0);
			const totalIntelViews  = (data.totalIntelViews  ?? 0) + (activityType === "intel_view"  ? 1 : 0);

			// ── Already active today — only update counters, skip streak ────────
			const lastStreakDate: string = data.lastStreakDate ?? "";
			if (lastStreakDate === today) {
				tx.set(userRef, {
					...(activityType === "swipe"      && { totalSwipeCount }),
					...(activityType === "intel_view" && { totalIntelViews }),
				}, { merge: true });
				return { streak: data.streakCount ?? 0, newBadges: [], bonusSwipesAdded: 0 };
			}

			// ── Streak calculation ───────────────────────────────────────────────
			let streakCount: number = data.streakCount ?? 0;
			let graceUsed: boolean  = data.graceUsed   ?? false;
			const graceWeek: string = data.graceWeek   ?? "";
			const diff = daysBetween(lastStreakDate, today);

			// Reset grace if it's a new week
			if (graceWeek !== currentWeek) graceUsed = false;

			if (lastStreakDate === "") {
				// First ever activity
				streakCount = 1;
			} else if (diff === 1) {
				// Consecutive day
				streakCount++;
			} else if (diff === 2 && !graceUsed) {
				// Missed one day — use grace
				streakCount++;
				graceUsed = true;
			} else {
				// Streak broken
				streakCount = 1;
				graceUsed = false;
			}

			// ── Badge checks ─────────────────────────────────────────────────────
			const existingBadges = new Set<string>(data.badges ?? []);
			const newBadgeIds: string[] = [];
			let bonusSwipesAdded = 0;

			const awardBadge = (id: string) => {
				if (!existingBadges.has(id)) { newBadgeIds.push(id); existingBadges.add(id); }
			};

			// Streak-based
			if (streakCount >= 1)  awardBadge("first_move");
			if (streakCount >= 5)  awardBadge("consistent_learner");
			if (streakCount >= 7)  awardBadge("market_explorer");
			if (streakCount >= 14) awardBadge("trend_reader");
			if (streakCount >= 30) awardBadge("market_insider");

			// Streak bonus swipes (one-time, tracked via badges)
			if (streakCount >= 3  && !existingBadges.has("streak_bonus_3"))  { newBadgeIds.push("streak_bonus_3");  existingBadges.add("streak_bonus_3");  bonusSwipesAdded += 3;  }
			if (streakCount >= 5  && !existingBadges.has("streak_bonus_5"))  { newBadgeIds.push("streak_bonus_5");  existingBadges.add("streak_bonus_5");  bonusSwipesAdded += 5;  }
			if (streakCount >= 7  && !existingBadges.has("streak_bonus_7"))  { newBadgeIds.push("streak_bonus_7");  existingBadges.add("streak_bonus_7");  bonusSwipesAdded += 14; }

			// Swipe-based
			if (totalSwipeCount >= 1  && activityType === "swipe") awardBadge("explorer");
			if (totalSwipeCount >= 10 && activityType === "swipe") awardBadge("curious_mind");

			// Intel-based
			if (totalIntelViews >= 15) awardBadge("pattern_recognizer");

			const currentBonusSwipes = data.bonusSwipes ?? 0;

			// ── Write ─────────────────────────────────────────────────────────────
			tx.set(userRef, {
				streakCount,
				lastStreakDate: today,
				graceUsed,
				graceWeek: currentWeek,
				badges: [...existingBadges],
				bonusSwipes: currentBonusSwipes + bonusSwipesAdded,
				totalSwipeCount,
				totalIntelViews,
				updatedAt: new Date().toISOString(),
			}, { merge: true });

			const newBadges = newBadgeIds
				.filter((id) => id in BADGES)
				.map((id) => BADGES[id]);

			return { streak: streakCount, newBadges, bonusSwipesAdded };
		});
	} catch (err) {
		console.error("streakService error:", err);
		return { streak: 0, newBadges: [], bonusSwipesAdded: 0 };
	}
}

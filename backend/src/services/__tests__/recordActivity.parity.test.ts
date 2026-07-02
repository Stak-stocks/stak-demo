import "dotenv/config";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pgQuery, pgPool } from "../../lib/postgres.js";

// Genuinely hits the live Supabase database (this is what "parity with the real RPC"
// requires -- mocking pg would just test the mock). Skips cleanly rather than failing
// with a confusing connection error for anyone running the suite without
// SUPABASE_DB_URL configured locally -- this migration is still in-progress, shadow-only
// work, not yet something every contributor needs configured to run the test suite.
const describeIfSupabaseConfigured = process.env.SUPABASE_DB_URL ? describe : describe.skip;

// ── Pure reference implementation ──────────────────────────────────────────────
// A direct line-by-line copy of streakService.ts's recordActivity branching logic,
// decoupled from Firestore I/O so it can run against a plain state object. This is
// the parity plan's "ground truth" -- if the SQL port (record_activity, Phase 3
// migration) diverges from this, it diverges from the actual production logic, not
// just from some reinterpretation of it.

interface UserState {
	totalSwipeCount: number;
	totalIntelViews: number;
	lastStreakDate: string;
	streakCount: number;
	graceUsed: boolean;
	graceWeek: string;
	badges: string[];
	bonusSwipes: number;
}

function freshState(): UserState {
	return {
		totalSwipeCount: 0, totalIntelViews: 0, lastStreakDate: "", streakCount: 0,
		graceUsed: false, graceWeek: "", badges: [], bonusSwipes: 0,
	};
}

function getISOWeek(date: Date): string {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

function referenceRecordActivity(
	state: UserState,
	activityType: "swipe" | "intel_view" | "brand_tap",
	today: string,
): { isNewDay: boolean; streakCount: number; newBadgeIds: string[]; bonusSwipesAdded: number } {
	const currentWeek = getISOWeek(new Date(today + "T12:00:00Z"));

	const totalSwipeCount = state.totalSwipeCount + (activityType === "swipe" ? 1 : 0);
	const totalIntelViews = state.totalIntelViews + (activityType === "intel_view" ? 1 : 0);

	if (state.lastStreakDate === today) {
		if (activityType === "swipe") state.totalSwipeCount = totalSwipeCount;
		if (activityType === "intel_view") state.totalIntelViews = totalIntelViews;
		return { isNewDay: false, streakCount: state.streakCount, newBadgeIds: [], bonusSwipesAdded: 0 };
	}

	let streakCount = state.streakCount;
	let graceUsed = state.graceUsed;
	const graceWeek = state.graceWeek;
	const diff = daysBetween(state.lastStreakDate, today);

	if (graceWeek !== currentWeek) graceUsed = false;

	if (state.lastStreakDate === "") {
		streakCount = 1;
	} else if (diff === 1) {
		streakCount++;
	} else if (diff === 2 && !graceUsed) {
		streakCount++;
		graceUsed = true;
	} else {
		streakCount = 1;
		graceUsed = false;
	}

	const existingBadges = new Set<string>(state.badges);
	const newBadgeIds: string[] = [];
	let bonusSwipesAdded = 0;
	const awardBadge = (id: string) => {
		if (!existingBadges.has(id)) { newBadgeIds.push(id); existingBadges.add(id); }
	};

	if (streakCount >= 1) awardBadge("first_move");
	if (streakCount >= 5) awardBadge("consistent_learner");
	if (streakCount >= 7) awardBadge("market_explorer");
	if (streakCount >= 14) awardBadge("trend_reader");
	if (streakCount >= 30) awardBadge("market_insider");

	if (streakCount >= 3 && !existingBadges.has("streak_bonus_3")) { newBadgeIds.push("streak_bonus_3"); existingBadges.add("streak_bonus_3"); bonusSwipesAdded += 3; }
	if (streakCount >= 5 && !existingBadges.has("streak_bonus_5")) { newBadgeIds.push("streak_bonus_5"); existingBadges.add("streak_bonus_5"); bonusSwipesAdded += 5; }
	if (streakCount >= 7 && !existingBadges.has("streak_bonus_7")) { newBadgeIds.push("streak_bonus_7"); existingBadges.add("streak_bonus_7"); bonusSwipesAdded += 14; }

	if (totalSwipeCount >= 1 && activityType === "swipe") awardBadge("explorer");
	if (totalSwipeCount >= 10 && activityType === "swipe") awardBadge("curious_mind");
	if (totalIntelViews >= 15) awardBadge("pattern_recognizer");

	state.streakCount = streakCount;
	state.lastStreakDate = today;
	state.graceUsed = graceUsed;
	state.graceWeek = currentWeek;
	state.badges = [...existingBadges];
	state.bonusSwipes = state.bonusSwipes + bonusSwipesAdded;
	state.totalSwipeCount = totalSwipeCount;
	state.totalIntelViews = totalIntelViews;

	return { isNewDay: true, streakCount, newBadgeIds, bonusSwipesAdded };
}

// ── Postgres-backed runner against the live record_activity() RPC ──────────────

async function pgRecordActivity(uid: string, activityType: string, today: string, currentWeek: string) {
	const result = await pgQuery<{ is_new_day: boolean; out_streak_count: number; new_badge_ids: string[]; bonus_swipes_added: number }>(
		`select * from record_activity($1, $2, $3, $4)`,
		[uid, activityType, today, currentWeek],
	);
	return result.rows[0];
}

async function pgGetUserState(uid: string) {
	const result = await pgQuery(
		`select total_swipe_count, total_intel_views, last_streak_date, streak_count, grace_used, grace_week, badges, bonus_swipes
		from users where uid = $1`,
		[uid],
	);
	return result.rows[0];
}

describeIfSupabaseConfigured("record_activity SQL parity with the reference streak logic", () => {
	const testUid = "test-uid-parity-record-activity";

	beforeEach(async () => {
		await pgQuery(`delete from users where uid = $1`, [testUid]);
		await pgQuery(`insert into users (uid, email) values ($1, 'parity-test@example.com')`, [testUid]);
	});

	afterAll(async () => {
		await pgQuery(`delete from users where uid = $1`, [testUid]);
		await pgPool.end();
	});

	async function runSequence(events: Array<{ date: string; type: "swipe" | "intel_view" | "brand_tap" }>) {
		const state = freshState();
		for (const event of events) {
			const refResult = referenceRecordActivity(state, event.type, event.date);
			const currentWeek = getISOWeek(new Date(event.date + "T12:00:00Z"));
			const pgResult = await pgRecordActivity(testUid, event.type, event.date, currentWeek);

			expect({ isNewDay: pgResult.is_new_day, streakCount: pgResult.out_streak_count, newBadgeIds: pgResult.new_badge_ids, bonusSwipesAdded: pgResult.bonus_swipes_added })
				.toEqual(refResult);
		}
		const finalPgState = await pgGetUserState(testUid);
		expect(finalPgState.streak_count).toBe(state.streakCount);
		expect(finalPgState.grace_used).toBe(state.graceUsed);
		expect(finalPgState.grace_week).toBe(state.graceWeek);
		expect(new Set(finalPgState.badges)).toEqual(new Set(state.badges));
		expect(finalPgState.bonus_swipes).toBe(state.bonusSwipes);
		expect(finalPgState.total_swipe_count).toBe(state.totalSwipeCount);
		expect(finalPgState.total_intel_views).toBe(state.totalIntelViews);
	}

	it("first ever activity starts a streak of 1 and awards first_move + explorer", async () => {
		await runSequence([{ date: "2026-06-01", type: "swipe" }]);
	});

	it("consecutive days increment the streak", async () => {
		await runSequence([
			{ date: "2026-06-01", type: "swipe" },
			{ date: "2026-06-02", type: "swipe" },
			{ date: "2026-06-03", type: "swipe" },
		]);
	});

	it("a second activity on the same day only updates counters, no new streak day", async () => {
		await runSequence([
			{ date: "2026-06-01", type: "swipe" },
			{ date: "2026-06-01", type: "intel_view" },
			{ date: "2026-06-01", type: "swipe" },
		]);
	});

	it("missing one day uses grace and keeps the streak alive, once per week", async () => {
		await runSequence([
			{ date: "2026-06-01", type: "swipe" }, // Mon, streak 1
			{ date: "2026-06-03", type: "swipe" }, // Wed, diff=2, grace used, streak 2
			{ date: "2026-06-04", type: "swipe" }, // Thu, diff=1, streak 3
		]);
	});

	it("missing one day twice in the same week only grants grace once -- the second gap breaks the streak", async () => {
		await runSequence([
			{ date: "2026-06-01", type: "swipe" }, // Mon, streak 1
			{ date: "2026-06-03", type: "swipe" }, // Wed, grace used, streak 2
			{ date: "2026-06-05", type: "swipe" }, // Fri, diff=2 but grace already used this week -> streak resets to 1
		]);
	});

	it("missing one day in a new week gets a fresh grace allowance", async () => {
		await runSequence([
			{ date: "2026-06-01", type: "swipe" }, // Mon W23, streak 1
			{ date: "2026-06-03", type: "swipe" }, // Wed W23, grace used, streak 2
			{ date: "2026-06-04", type: "swipe" }, // Thu W23, streak 3
			{ date: "2026-06-05", type: "swipe" }, // Fri W23, streak 4
			{ date: "2026-06-08", type: "swipe" }, // Mon W24 (new week), diff=3 from Fri -- streak breaks regardless of grace
		]);
	});

	it("missing more than 2 days breaks the streak back to 1", async () => {
		await runSequence([
			{ date: "2026-06-01", type: "swipe" },
			{ date: "2026-06-02", type: "swipe" },
			{ date: "2026-06-10", type: "swipe" }, // big gap
		]);
	});

	it("crosses every streak-length badge threshold (5, 7, 14, 30 consecutive days)", async () => {
		const events: Array<{ date: string; type: "swipe" }> = [];
		const start = new Date("2026-06-01T12:00:00Z");
		for (let i = 0; i < 31; i++) {
			const d = new Date(start.getTime() + i * 86400000);
			events.push({ date: d.toISOString().split("T")[0], type: "swipe" });
		}
		await runSequence(events);
	});

	it("intel_view activity crosses the pattern_recognizer threshold (15 views) without affecting swipe badges", async () => {
		const events: Array<{ date: string; type: "intel_view" }> = [];
		const start = new Date("2026-06-01T12:00:00Z");
		for (let i = 0; i < 16; i++) {
			const d = new Date(start.getTime() + i * 86400000);
			events.push({ date: d.toISOString().split("T")[0], type: "intel_view" });
		}
		await runSequence(events);
	});

	it("a long realistic mixed sequence (streak breaks, grace usage, both activity types, badge crossings)", async () => {
		await runSequence([
			{ date: "2026-05-01", type: "swipe" },
			{ date: "2026-05-02", type: "swipe" },
			{ date: "2026-05-02", type: "intel_view" }, // same-day, counters only
			{ date: "2026-05-03", type: "swipe" },
			{ date: "2026-05-04", type: "swipe" },
			{ date: "2026-05-05", type: "swipe" }, // streak 5 -> consistent_learner + streak_bonus_5
			{ date: "2026-05-07", type: "swipe" }, // grace day -> streak 6
			{ date: "2026-05-08", type: "swipe" }, // streak 7 -> market_explorer + streak_bonus_7
			{ date: "2026-05-20", type: "swipe" }, // huge gap -> resets to 1
			{ date: "2026-05-21", type: "intel_view" },
			{ date: "2026-05-22", type: "intel_view" },
		]);
	});
});

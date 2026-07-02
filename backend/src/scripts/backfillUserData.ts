/**
 * One-time Firestore → Postgres data backfill for migrated users (migration plan,
 * Phase 6: tingly-conjuring-lake.md). Reads each user's Firestore document and
 * populates the corresponding Postgres tables so their historical data (saved stocks,
 * streaks, XP, sandbox, etc.) is available when they sign in via the Supabase path.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE where appropriate, safe to
 * re-run. Only touches users who are already in auth_identity_map (provisioned users).
 *
 * Run:
 *   npx tsx src/scripts/backfillUserData.ts          # backfill ALL provisioned users
 *   npx tsx src/scripts/backfillUserData.ts <email>  # backfill ONE user
 */
import "dotenv/config";
import { adminDb } from "../firebaseAdmin.js";
import { pgQuery, pgPool } from "../lib/postgres.js";

const targetEmail = process.argv[2]?.toLowerCase().trim() ?? null;

async function backfillUser(uid: string, email: string): Promise<{ uid: string; status: "ok" | "no_firestore_doc" | "error"; detail?: string }> {
	const snap = await adminDb.collection("users").doc(uid).get();
	if (!snap.exists) return { uid, status: "no_firestore_doc" };

	const d = snap.data()!;

	try {
		// ── users row (core fields + streak/swipe counters) ──────────────────────────
		await pgQuery(`
			update users set
				display_name   = coalesce($2, display_name),
				phone          = coalesce($3, phone),
				preferences    = coalesce($4::jsonb, preferences),
				onboarding_completed = coalesce($5, onboarding_completed),
				deck_order     = coalesce($6, deck_order),
				tag_scores     = coalesce($7::jsonb, tag_scores),
				last_brief_date = coalesce($8, last_brief_date),
				streak_count   = coalesce($9, streak_count),
				last_streak_date = coalesce($10, last_streak_date),
				grace_used     = coalesce($11, grace_used),
				badges         = coalesce($12, badges),
				bonus_swipes   = coalesce($13, bonus_swipes),
				total_swipe_count = coalesce($14, total_swipe_count),
				total_intel_views = coalesce($15, total_intel_views),
				daily_swipe_date  = coalesce($16, daily_swipe_date),
				daily_swipe_count = coalesce($17, daily_swipe_count)
			where uid = $1
		`, [
			uid,
			d.displayName ?? null,
			d.phone ?? null,
			d.preferences ? JSON.stringify(d.preferences) : null,
			d.onboardingCompleted ?? null,
			d.deckOrder?.length ? d.deckOrder : null,
			d.tagScores && Object.keys(d.tagScores).length ? JSON.stringify(d.tagScores) : null,
			d.lastBriefDate ?? null,
			d.streakCount ?? null,
			d.lastStreakDate ?? null,
			d.graceUsed ?? null,
			d.badges?.length ? d.badges : null,
			d.bonusSwipes ?? null,
			d.totalSwipeCount ?? null,
			d.totalIntelViews ?? null,
			d.dailySwipeState?.date ?? null,
			d.dailySwipeState?.count ?? null,
		]);

		// ── stak_brands ───────────────────────────────────────────────────────────────
		if (d.stakBrandIds?.length) {
			for (const brandId of d.stakBrandIds as string[]) {
				const entry = d.stakSavedAt?.[brandId];
				await pgQuery(`
					insert into stak_brands (uid, brand_id, saved_at, price_at_save)
					values ($1, $2, $3, $4)
					on conflict (uid, brand_id) do nothing
				`, [uid, brandId,
					entry?.savedAt ? new Date(entry.savedAt).toISOString() : new Date().toISOString(),
					entry?.priceAtSave ?? null,
				]);
			}
		}

		// ── passed_brands ─────────────────────────────────────────────────────────────
		if (d.passedBrands?.length) {
			for (const entry of d.passedBrands as { id: string; at: number; count: number }[]) {
				await pgQuery(`
					insert into passed_brands (uid, brand_id, last_passed_at, pass_count)
					values ($1, $2, $3, $4)
					on conflict (uid, brand_id) do update
						set last_passed_at = excluded.last_passed_at,
						    pass_count = excluded.pass_count
				`, [uid, entry.id, new Date(entry.at).toISOString(), entry.count]);
			}
		}

		// ── search_history ────────────────────────────────────────────────────────────
		if (d.searchHistory?.length) {
			for (const entry of d.searchHistory as { query: string; at: number }[]) {
				await pgQuery(`
					insert into search_history (uid, query, at)
					values ($1, $2, $3)
					on conflict (uid, query) do update set at = excluded.at
				`, [uid, entry.query, new Date(entry.at).toISOString()]);
			}
		}

		// ── intel_card_state ──────────────────────────────────────────────────────────
		if (d.intelCardState) {
			const ics = d.intelCardState as { lastDate?: string; queue?: string[]; readIds?: string[] };
			await pgQuery(`
				insert into intel_card_state (uid, last_date, queue, read_ids)
				values ($1, $2, $3, $4)
				on conflict (uid) do update
					set last_date = excluded.last_date,
					    queue = excluded.queue,
					    read_ids = excluded.read_ids
			`, [uid, ics.lastDate ?? "", ics.queue ?? [], ics.readIds ?? []]);
		}

		// ── playground_state ──────────────────────────────────────────────────────────
		await pgQuery(`
			insert into playground_state (
				uid, total_xp, sandbox_cash, sandbox_tier, sandbox_milestones,
				daily_progress, all_time_completed_activity_ids,
				playground_onboarded, generated_lesson_history, daily_challenge_state
			) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			on conflict (uid) do update set
				total_xp = excluded.total_xp,
				sandbox_cash = excluded.sandbox_cash,
				sandbox_tier = excluded.sandbox_tier,
				sandbox_milestones = excluded.sandbox_milestones,
				daily_progress = excluded.daily_progress,
				all_time_completed_activity_ids = excluded.all_time_completed_activity_ids,
				playground_onboarded = excluded.playground_onboarded,
				generated_lesson_history = excluded.generated_lesson_history,
				daily_challenge_state = excluded.daily_challenge_state
		`, [
			uid,
			d.totalXp ?? 0,
			d.sandboxCash ?? null,
			d.sandboxTier ?? null,
			d.sandboxMilestones ?? [],
			d.dailyProgress ? JSON.stringify(d.dailyProgress) : "{}",
			d.allTimeCompletedActivityIds ?? [],
			d.playgroundOnboarded ?? false,
			d.generatedLessonHistory ? JSON.stringify(d.generatedLessonHistory) : "[]",
			d.dailyChallengeState ? JSON.stringify(d.dailyChallengeState) : "{}",
		]);

		// ── sandbox_portfolio ─────────────────────────────────────────────────────────
		if (d.sandboxPortfolio && Object.keys(d.sandboxPortfolio).length) {
			for (const [ticker, entry] of Object.entries(d.sandboxPortfolio as Record<string, { addedAt: number; priceAtAdd: number | null; shares: number; thesis?: string }>)) {
				await pgQuery(`
					insert into sandbox_portfolio (uid, ticker, shares, price_at_add, added_at, thesis)
					values ($1, $2, $3, $4, $5, $6)
					on conflict (uid, ticker) do update
						set shares = excluded.shares,
						    price_at_add = excluded.price_at_add,
						    thesis = excluded.thesis
				`, [uid, ticker, entry.shares, entry.priceAtAdd, new Date(entry.addedAt).toISOString(), entry.thesis ?? null]);
			}
		}

		// ── activity_progress (lessons, earnings, battles, risk, mood) ────────────────
		const kinds = [
			["lesson", d.lessonProgress],
			["earnings", d.earningsProgress],
			["battle", d.battlesProgress],
			["risk", d.riskProgress],
			["mood", d.moodProgress],
		] as [string, Record<string, { completed: boolean; completedAt: number; xpEarned?: number }> | undefined][];

		for (const [kind, progress] of kinds) {
			if (!progress) continue;
			for (const [itemId, entry] of Object.entries(progress)) {
				if (!entry.completed) continue;
				await pgQuery(`
					insert into activity_progress (uid, kind, item_id, completed, completed_at, xp_earned)
					values ($1, $2, $3, $4, $5, $6)
					on conflict (uid, kind, item_id) do update
						set completed = excluded.completed,
						    completed_at = excluded.completed_at,
						    xp_earned = excluded.xp_earned
				`, [uid, kind, itemId, true, new Date(entry.completedAt).toISOString(), entry.xpEarned ?? 0]);
			}
		}

		// ── practice_skills ───────────────────────────────────────────────────────────
		if (d.practiceSkills && Object.keys(d.practiceSkills).length) {
			for (const [skill, xp] of Object.entries(d.practiceSkills as Record<string, number>)) {
				await pgQuery(`
					insert into practice_skills (uid, skill, xp)
					values ($1, $2, $3)
					on conflict (uid, skill) do update set xp = excluded.xp
				`, [uid, skill, xp]);
			}
		}

		return { uid, status: "ok" };
	} catch (err) {
		return { uid, status: "error", detail: (err as Error).message };
	}
}

// ── main ──────────────────────────────────────────────────────────────────────

const rows = await pgQuery<{ firebase_uid: string; email: string }>(
	targetEmail
		? `select m.firebase_uid, u.email from auth_identity_map m join users u on u.uid = m.firebase_uid where lower(u.email) = $1`
		: `select m.firebase_uid, u.email from auth_identity_map m join users u on u.uid = m.firebase_uid`,
	targetEmail ? [targetEmail] : [],
);

if (rows.rows.length === 0) {
	console.log(targetEmail ? `No provisioned user found for ${targetEmail}` : "No provisioned users found.");
	await pgPool.end();
	process.exit(0);
}

console.log(`Backfilling Firestore → Postgres for ${rows.rows.length} user(s)...\n`);
let ok = 0, noDoc = 0, errors = 0;

for (const { firebase_uid, email } of rows.rows) {
	const result = await backfillUser(firebase_uid, email);
	if (result.status === "ok") { ok++; console.log(`  ✓ ${email}`); }
	else if (result.status === "no_firestore_doc") { noDoc++; console.log(`  - ${email} (no Firestore doc)`); }
	else { errors++; console.error(`  ✗ ${email}: ${result.detail}`); }
}

console.log(`\nDone. ok=${ok}, no_doc=${noDoc}, errors=${errors}`);
await pgPool.end();

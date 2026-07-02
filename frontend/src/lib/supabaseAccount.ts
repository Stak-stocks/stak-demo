/**
 * Supabase-backed equivalent of AccountContext.tsx's Firestore onSnapshot subscription
 * (migration plan, Phase 5). Assembles the same UserDoc shape from the 7 Postgres
 * tables a user's account data is split across, so AccountContext's consumers never
 * need to know which provider is actually backing the data.
 *
 * Deliberately does NOT filter any query by uid. The frontend only has
 * supabaseUserId (the Supabase auth.users UUID) -- it never resolves the actual
 * `uid` column value (Firebase-UID-format text) these tables are keyed on, and
 * shouldn't need to. RLS (current_firebase_uid(), see the rls_policies_and_realtime
 * migration) already restricts every one of these queries -- and every Realtime
 * event -- to the caller's own rows unconditionally. An unfiltered select here reads
 * "all rows I'm allowed to see," which is exactly "my own rows," enforced by Postgres
 * itself rather than trusted client-side filtering.
 *
 * On any change to any of the 7 tables, refetches all 7 and reassembles -- simple and
 * correct over maximally efficient, which is the right tradeoff at one user's data
 * volume (a handful of rows per table, not a bulk dataset).
 */
import { supabase } from "./supabase";
import type {
	UserDoc, PassedEntry, SearchEntry, StakSaveEntry, SandboxEntry,
	LessonProgress, EarningsProgress, ActivityProgress, IntelCardState,
} from "../context/AccountContext";

const REALTIME_TABLES = [
	"users", "stak_brands", "passed_brands", "search_history",
	"intel_card_state", "sandbox_portfolio", "activity_progress", "playground_state",
	"practice_skills",
] as const;

export async function fetchSupabaseAccount(): Promise<UserDoc | null> {
	const [usersRes, stakRes, passedRes, searchRes, intelRes, sandboxRes, activityRes, playgroundRes, practiceRes] = await Promise.all([
		supabase.from("users").select("*").maybeSingle(),
		supabase.from("stak_brands").select("*"),
		supabase.from("passed_brands").select("*"),
		supabase.from("search_history").select("*"),
		supabase.from("intel_card_state").select("*").maybeSingle(),
		supabase.from("sandbox_portfolio").select("*"),
		supabase.from("activity_progress").select("*"),
		supabase.from("playground_state").select("*").maybeSingle(),
		supabase.from("practice_skills").select("*"),
	]);

	const u = usersRes.data;
	if (!u) return null;

	const stakBrandIds: string[] = (stakRes.data ?? []).map((r) => r.brand_id);
	const stakSavedAt: Record<string, StakSaveEntry> = {};
	for (const r of stakRes.data ?? []) {
		stakSavedAt[r.brand_id] = { savedAt: new Date(r.saved_at).getTime(), priceAtSave: r.price_at_save };
	}

	const passedBrands: PassedEntry[] = (passedRes.data ?? []).map((r) => ({
		id: r.brand_id, at: new Date(r.last_passed_at).getTime(), count: r.pass_count,
	}));

	const searchHistory: SearchEntry[] = (searchRes.data ?? [])
		.map((r) => ({ query: r.query, at: new Date(r.at).getTime() }))
		.sort((a, b) => b.at - a.at);

	const intel = intelRes.data;
	const intelCardState: IntelCardState | undefined = intel
		? { lastDate: intel.last_date ?? "", queue: intel.queue ?? [], readIds: intel.read_ids ?? [] }
		: undefined;

	const sandboxPortfolio: Record<string, SandboxEntry> = {};
	for (const r of sandboxRes.data ?? []) {
		sandboxPortfolio[r.ticker] = {
			addedAt: new Date(r.added_at).getTime(), priceAtAdd: r.price_at_add, shares: Number(r.shares),
			...(r.thesis ? { thesis: r.thesis } : {}),
		};
	}

	const lessonProgress: Record<string, LessonProgress> = {};
	const earningsProgress: Record<string, EarningsProgress> = {};
	const battlesProgress: Record<string, ActivityProgress> = {};
	const riskProgress: Record<string, ActivityProgress> = {};
	const moodProgress: Record<string, ActivityProgress> = {};
	const progressByKind: Record<string, Record<string, unknown>> = {
		lesson: lessonProgress, earnings: earningsProgress, battle: battlesProgress, risk: riskProgress, mood: moodProgress,
	};
	for (const r of activityRes.data ?? []) {
		const bucket = progressByKind[r.kind];
		if (!bucket) continue;
		bucket[r.item_id] = r.kind === "lesson"
			? { completed: r.completed, completedAt: new Date(r.completed_at).getTime(), xpEarned: r.xp_earned }
			: { completed: r.completed, completedAt: new Date(r.completed_at).getTime() };
	}

	const pg = playgroundRes.data;

	return {
		uid: u.uid,
		email: u.email ?? undefined,
		displayName: u.display_name ?? undefined,
		phone: u.phone ?? undefined,
		preferences: u.preferences ?? undefined,
		onboardingCompleted: u.onboarding_completed,
		stakBrandIds,
		stakSavedAt,
		passedBrands,
		intelCardState,
		dailySwipeState: u.daily_swipe_date ? { date: u.daily_swipe_date, count: u.daily_swipe_count } : undefined,
		streakCount: u.streak_count,
		lastStreakDate: u.last_streak_date ?? undefined,
		graceUsed: u.grace_used,
		badges: u.badges ?? [],
		bonusSwipes: u.bonus_swipes,
		totalSwipeCount: u.total_swipe_count,
		totalIntelViews: u.total_intel_views,
		deckOrder: u.deck_order ?? [],
		searchHistory,
		tagScores: u.tag_scores ?? {},
		lastBriefDate: u.last_brief_date ?? undefined,
		totalXp: pg?.total_xp,
		lessonProgress,
		earningsProgress,
		battlesProgress,
		riskProgress,
		moodProgress,
		dailyChallengeState: pg?.daily_challenge_state?.date
			? { date: pg.daily_challenge_state.date, completedIds: pg.daily_challenge_state.completedIds ?? [] }
			: undefined,
		sandboxPortfolio,
		sandboxCash: pg?.sandbox_cash != null ? Number(pg.sandbox_cash) : undefined,
		sandboxTier: pg?.sandbox_tier,
		dailyProgress: pg?.daily_progress,
		allTimeCompletedActivityIds: pg?.all_time_completed_activity_ids ?? [],
		sandboxMilestones: pg?.sandbox_milestones ?? [],
		practiceSkills: Object.fromEntries((practiceRes.data ?? []).map((r) => [r.skill, r.xp])),
		playgroundOnboarded: pg?.playground_onboarded,
		generatedLessonHistory: pg?.generated_lesson_history ?? [],
	};
}

// sessionKey is only used to namespace the Realtime channel / as a React effect
// dependency to know when to resubscribe (e.g. supabaseUserId) -- it is never used
// to filter a query. See the module comment above for why.
export function subscribeSupabaseAccount(sessionKey: string, onChange: (doc: UserDoc | null) => void): () => void {
	let cancelled = false;

	const refetch = () => {
		fetchSupabaseAccount().then((doc) => {
			if (!cancelled) onChange(doc);
		});
	};

	refetch();

	const channel = supabase.channel(`account-${sessionKey}`);
	for (const table of REALTIME_TABLES) {
		channel.on(
			"postgres_changes",
			{ event: "*", schema: "public", table },
			refetch,
		);
	}
	channel.subscribe();

	// Supabase JWTs expire every hour. The client auto-refreshes the token and Supabase
	// Realtime v2 re-authorizes channels internally on TOKEN_REFRESHED. As a defensive
	// measure, we also trigger a data refetch at that point to ensure account state is
	// current even if the Realtime channel missed any events during the token transition.
	const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
		if (event === "TOKEN_REFRESHED" && !cancelled) {
			refetch();
		}
	});

	return () => {
		cancelled = true;
		authListener.subscription.unsubscribe();
		supabase.removeChannel(channel);
	};
}

// ── Writes ───────────────────────────────────────────────────────────────────
// Mirrors AccountContext.tsx's Firestore write functions, one-to-one, for a
// Supabase-only session. Never pass `uid` explicitly -- every per-row-owned table's
// uid column defaults to current_firebase_uid() on insert/upsert (see the
// uid_column_defaults migration), and RLS scopes everything else. No callsite here
// ever needs to know its own canonical Firebase UID.

// Every caller of updateStak in the app passes the full desired ID list purely to
// signal removals -- additions always go through a separate saveToStak call (verified
// against every real callsite, not assumed). So this only ever needs to delete rows
// that fell out of the list; it must never insert for an ID that's present, since
// that would create a stak_brands row with no saved_at/price_at_save history.
export async function updateStakSupabase(brandIds: string[]): Promise<void> {
	const { data: existing } = await supabase.from("stak_brands").select("brand_id");
	const toRemove = (existing ?? []).map((r) => r.brand_id).filter((id) => !brandIds.includes(id));
	if (toRemove.length > 0) {
		await supabase.from("stak_brands").delete().in("brand_id", toRemove);
	}
}

export async function saveToStakSupabase(brandId: string, priceAtSave?: number | null): Promise<void> {
	// ignoreDuplicates matches the Firestore version's explicit "already saved? do
	// nothing" check -- a repeat save must not overwrite the original saved_at/price.
	await supabase.from("stak_brands").upsert(
		{ brand_id: brandId, saved_at: new Date().toISOString(), price_at_save: priceAtSave ?? null },
		{ onConflict: "uid,brand_id", ignoreDuplicates: true },
	);
}

export async function updatePassedBrandsSupabase(entries: PassedEntry[]): Promise<void> {
	if (entries.length === 0) return;
	await supabase.from("passed_brands").upsert(
		entries.map((e) => ({ brand_id: e.id, last_passed_at: new Date(e.at).toISOString(), pass_count: e.count })),
		{ onConflict: "uid,brand_id" },
	);
}

// PostgREST hard-rejects a bare .update()/.delete() with no filter at all ("UPDATE
// requires a WHERE clause") -- a syntactic check, separate from and in addition to
// RLS. .not("uid", "is", null) below isn't a real filter (uid is the PK, never
// null -- it matches every row the caller could ever see) -- it exists purely to
// satisfy that syntax requirement. RLS alone determines which row is actually
// affected. Verified directly: a two-user test confirmed only the calling user's own
// row is ever touched, never the other user's, despite this condition matching both
// rows' WHERE clause in isolation.
export async function updateDeckOrderSupabase(order: string[]): Promise<void> {
	await supabase.from("users").update({ deck_order: order }).not("uid", "is", null);
}

export async function updatePreferencesSupabase(prefs: UserDoc["preferences"]): Promise<void> {
	await supabase.from("users").update({ preferences: prefs ?? {} }).not("uid", "is", null);
}

export async function updateLastBriefDateSupabase(date: string): Promise<void> {
	await supabase.from("users").update({ last_brief_date: date }).not("uid", "is", null);
}

// Must match AccountContext.tsx's MAX_SEARCH_HISTORY -- duplicated rather than
// imported to avoid a circular import (AccountContext.tsx already imports from this
// module for the read-side subscription).
const MAX_SEARCH_HISTORY = 20;

export async function addSearchHistorySupabase(query: string): Promise<void> {
	const trimmed = query.trim();
	if (!trimmed) return;
	const lower = trimmed.toLowerCase();

	// Firestore's version dedupes case-insensitively, but (uid, query) is an exact-match
	// PK here -- "Apple" and "apple" would otherwise coexist as two rows. Remove any
	// case-insensitive match before inserting the new exact-case entry.
	const { data: existing } = await supabase.from("search_history").select("query, at");
	const toRemove = (existing ?? []).filter((e) => e.query.toLowerCase() === lower).map((e) => e.query);
	if (toRemove.length > 0) {
		await supabase.from("search_history").delete().in("query", toRemove);
	}

	await supabase.from("search_history").insert({ query: trimmed, at: new Date().toISOString() });

	// Enforce the same MAX_SEARCH_HISTORY cap Firestore's .slice(0, MAX) applied --
	// trim anything beyond the most recent N.
	const { data: all } = await supabase.from("search_history").select("query, at").order("at", { ascending: false });
	const overflow = (all ?? []).slice(MAX_SEARCH_HISTORY).map((e) => e.query);
	if (overflow.length > 0) {
		await supabase.from("search_history").delete().in("query", overflow);
	}
}

export async function removeSearchHistoryEntrySupabase(query: string): Promise<void> {
	const lower = query.toLowerCase();
	const { data: existing } = await supabase.from("search_history").select("query");
	const toRemove = (existing ?? []).filter((e) => e.query.toLowerCase() === lower).map((e) => e.query);
	if (toRemove.length > 0) {
		await supabase.from("search_history").delete().in("query", toRemove);
	}
}

export async function clearSearchHistorySupabase(): Promise<void> {
	await supabase.from("search_history").delete().not("uid", "is", null);
}

// completeLesson/completeEarningsScenario/completeBattle/completeRiskScenario/
// completeMoodScenario all route through this one RPC (kind differs, only lessons
// pass xp) -- see the activity_completion_rpcs migration for why this needs to be an
// RPC rather than a direct write (atomicity around the already-completed check).
export async function completeActivitySupabase(kind: "lesson" | "earnings" | "battle" | "risk" | "mood", itemId: string, xp = 0): Promise<void> {
	await supabase.rpc("complete_activity", { p_kind: kind, p_item_id: itemId, p_xp: xp });
}

export async function addXpSupabase(xp: number): Promise<void> {
	await supabase.rpc("add_xp", { p_amount: xp });
}

export async function initSandboxCashSupabase(): Promise<void> {
	await supabase.rpc("init_sandbox_cash");
}

export async function addToSandboxSupabase(ticker: string, priceAtAdd: number | null, shares: number, thesis?: string): Promise<void> {
	await supabase.rpc("add_to_sandbox", { p_ticker: ticker, p_price_at_add: priceAtAdd, p_shares: shares, p_thesis: thesis ?? null });
}

export async function sellFromSandboxSupabase(ticker: string, currentValue: number, sharesToSell?: number): Promise<void> {
	await supabase.rpc("sell_from_sandbox", { p_ticker: ticker, p_current_value: currentValue, ...(sharesToSell != null ? { p_shares_to_sell: sharesToSell } : {}) });
}

export async function resetSandboxSupabase(): Promise<void> {
	await supabase.rpc("reset_sandbox");
}

export async function checkAndApplySandboxTierUpgradeSupabase(): Promise<void> {
	await supabase.rpc("check_and_apply_sandbox_tier_upgrade");
}

export async function markSandboxMilestoneSupabase(value: number): Promise<void> {
	await supabase.rpc("mark_sandbox_milestone", { p_value: value });
}

export async function markPlaygroundOnboardedSupabase(): Promise<void> {
	await supabase.rpc("mark_playground_onboarded");
}

export async function saveGeneratedLessonHistorySupabase(entry: { topic: string; title: string; angle: string }): Promise<void> {
	await supabase.rpc("save_generated_lesson_history", { p_topic: entry.topic, p_title: entry.title, p_angle: entry.angle });
}

export async function completeDailyActivitySupabase(dayKey: string, activityId: string, xp: number, activityType?: string): Promise<void> {
	await supabase.rpc("complete_daily_activity", { p_day_key: dayKey, p_activity_id: activityId, p_xp: xp, p_activity_type: activityType ?? null });
}

export async function completeChallengeSupabase(challengeId: string, xp: number, today: string): Promise<void> {
	await supabase.rpc("complete_challenge", { p_challenge_id: challengeId, p_xp: xp, p_today: today });
}

export async function addPracticeSkillXpSupabase(skill: string, xp: number): Promise<void> {
	await supabase.rpc("add_practice_skill_xp", { p_skill: skill, p_xp: xp });
}

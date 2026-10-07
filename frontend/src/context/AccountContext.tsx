/**
 * AccountContext — single source of truth for all user account data.
 *
 * Subscribes to the users table (and related tables) via Supabase Realtime so
 * all devices and tabs stay in sync without polling.
 *
 * Write methods call Supabase RPC functions or direct table writes via RLS.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import {
	incrementSwipeCountServer, type SwipeLimitIncrementResponse,
	sandboxBuy, sandboxSell, sandboxReset, sandboxMilestone,
	sandboxSetup, sandboxPlaceOrder, sandboxCancelOrder, type SandboxOrderResult,
	completeActivity, completeDailyActivityApi, addSkillXp,
	addSearchHistoryEntry, removeSearchHistoryEntry as removeSearchHistoryEntryApi, clearSearchHistoryApi,
} from "../lib/api";
import {
	fetchSupabaseAccount, subscribeSupabaseAccount, updateStakSupabase, saveToStakSupabase,
	removeFromStakSupabase, deletePassedBrandSupabase,
	updatePassedBrandsSupabase, updateDeckOrderSupabase, updatePreferencesSupabase,
	updateLastBriefDateSupabase,
	markPlaygroundOnboardedSupabase, saveGeneratedLessonHistorySupabase,
} from "../lib/supabaseAccount";
import { useAuth } from "./AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PassedEntry {
	id: string;
	at: number;
	count: number; // total times swiped left; >= 5 = permanently hidden
}

export interface SearchEntry {
	query: string;
	at: number;
}

export interface IntelCardState {
	lastDate: string;
	queue: string[];
	readIds: string[];
}

export interface DailySwipeState {
	date: string;
	count: number;
}

export interface StakSaveEntry {
	savedAt: number;
	priceAtSave: number | null;
}

export interface LessonProgress {
	completed: boolean;
	completedAt: number;
	xpEarned: number;
}

export interface EarningsProgress {
	completed: boolean;
	completedAt: number;
}

export interface ActivityProgress {
	completed: boolean;
	completedAt: number;
}

export interface DailyChallengeState {
	date: string;
	completedIds: string[];
}

export interface SandboxEntry {
	addedAt: number;
	priceAtAdd: number | null;
	shares: number;
	thesis?: string;
}

export type SandboxCashSource = "tier" | "free_choice";
export type SandboxStrategyId = "cautious" | "balanced" | "bold";

/** A pending buy-limit order, filled server-side by /api/sandbox/fill-orders when the
 *  live price drops to or below limitPrice. */
export interface SandboxOrder {
	id: number;
	ticker: string;
	amount: number;
	limitPrice: number;
	createdAt: string;
}


export interface UserDoc {
	uid?: string;
	email?: string;
	displayName?: string;
	phone?: string;
	// interests/familiarity/onboardingSwipes are legacy-only going forward — the
	// web onboarding rebuild (2026-09) writes `taste` (android_taste) instead,
	// matching Android's quiz. Kept here since old accounts may still carry them.
	preferences?: { interests?: string[]; familiarity?: string; onboardingSwipes?: string[]; theme?: "light" | "dark" };
	onboardingCompleted?: boolean;
	stakBrandIds: string[];
	stakSavedAt?: Record<string, StakSaveEntry>;
	passedBrands: PassedEntry[];
	intelCardState?: IntelCardState;
	dailySwipeState?: DailySwipeState;
	streak?: { date: string; count: number };
	streakCount?: number;
	lastStreakDate?: string;
	graceUsed?: boolean;
	badges?: string[];
	bonusSwipes?: number;
	totalSwipeCount?: number;
	totalIntelViews?: number;
	deckOrder?: string[];
	searchHistory?: SearchEntry[];
	tagScores?: Record<string, number>;
	lastBriefDate?: string;
	// Playground
	totalXp?: number;
	lessonProgress?: Record<string, LessonProgress>;
	earningsProgress?: Record<string, EarningsProgress>;
	battlesProgress?: Record<string, ActivityProgress>;
	riskProgress?: Record<string, ActivityProgress>;
	moodProgress?: Record<string, ActivityProgress>;
	dailyChallengeState?: DailyChallengeState;
	sandboxPortfolio?: Record<string, SandboxEntry>;
	sandboxCash?: number;
	sandboxTier?: number;
	// Free-choice setup fields (Android's model) — undefined for pre-unification tier
	// portfolios until they reset and pick their own balance/name/strategy.
	sandboxName?: string;
	sandboxStrategy?: SandboxStrategyId;
	sandboxStart?: number;
	sandboxCashSource?: SandboxCashSource;
	sandboxOpenOrders?: SandboxOrder[];
	dailyProgress?: { dayKey: string; completedIds: string[]; completedTypes?: string[]; xpEarned: number };
	allTimeCompletedActivityIds?: string[];

	sandboxMilestones?: number[];          // portfolio values already celebrated (e.g. [11000, 12000])
	practiceSkills?: Record<string, number>; // skill slug → cumulative XP, e.g. { valuation: 250, growth: 180 }
	playgroundOnboarded?: boolean;         // true after user has completed playground onboarding
	generatedLessonHistory?: Array<{ topic: string; title: string; angle: string; completedAt: number }>;
}

interface AccountContextType {
	account: UserDoc | null;
	accountLoading: boolean;
	/** Re-reads the account now instead of waiting for the Realtime refetch - for the moment a flow flips a flag (onboardingCompleted) and the very next navigation depends on seeing it. */
	refreshAccount: () => Promise<void>;
	updateStak: (brandIds: string[]) => Promise<void>;
	saveToStak: (brandId: string, priceAtSave?: number | null) => Promise<void>;
	/** Removes only this brand from the STAK (updateStak removes everything missing from its list). */
	removeFromStak: (brandId: string) => Promise<void>;
	/** Forgets a pass entirely (updatePassedBrands can only add or change entries). */
	removePassedBrand: (brandId: string) => Promise<void>;
	updatePassedBrands: (entries: PassedEntry[]) => Promise<void>;
	incrementSwipeCount: () => Promise<SwipeLimitIncrementResponse>;
	updateDeckOrder: (order: string[]) => Promise<void>;
	updatePreferences: (prefs: UserDoc["preferences"]) => Promise<void>;
	addSearchHistory: (query: string) => Promise<void>;
	removeSearchHistoryEntry: (query: string) => Promise<void>;
	clearSearchHistory: () => Promise<void>;
	updateLastBriefDate: (date: string) => Promise<void>;
	completeLesson: (lessonId: string, xp: number) => Promise<void>;
	completeEarningsScenario: (scenarioId: string, xp: number) => Promise<void>;
	completeBattle: (battleId: string, xp: number) => Promise<void>;
	completeRiskScenario: (scenarioId: string, xp: number) => Promise<void>;
	completeMoodScenario: (scenarioId: string, xp: number) => Promise<void>;
	addToSandbox: (ticker: string, shares: number, thesis?: string) => Promise<void>;
	sellFromSandbox: (ticker: string, sharesToSell?: number) => Promise<{ sellValue: number; price: number; sharesToSell: number; remaining: number }>;
	resetSandbox: () => Promise<void>;
	markSandboxMilestone: (value: number) => Promise<void>;
	setupSandbox: (startingBalance: number, name: string, strategy: SandboxStrategyId) => Promise<void>;
	placeSandboxOrder: (ticker: string, amount: number, limitPrice: number) => Promise<SandboxOrderResult>;
	cancelSandboxOrder: (id: number) => Promise<void>;
	completeDailyActivity: (dayKey: string, activityId: string, xp: number, activityType?: string) => Promise<void>;
	addPracticeSkillXp: (skill: string, xp: number) => Promise<{ xp: number; xpToday: number }>;
	markPlaygroundOnboarded: () => Promise<void>;
	saveGeneratedLessonHistory: (entry: { topic: string; title: string; angle: string }) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AccountProvider({ children }: { children: ReactNode }) {
	const { supabaseUserId, loading: authLoading } = useAuth();
	const [account, setAccount] = useState<UserDoc | null>(null);
	const [accountLoading, setAccountLoading] = useState(true);

	useEffect(() => {
		if (authLoading) return;

		if (supabaseUserId) {
			setAccountLoading(true);
			const unsubscribe = subscribeSupabaseAccount(supabaseUserId, (supabaseAccount) => {
				setAccount(supabaseAccount);
				setAccountLoading(false);
			});
			return unsubscribe;
		}

		setAccount(null);
		setAccountLoading(false);
	}, [supabaseUserId, authLoading]);

	const refreshAccount = useCallback(async () => {
		const fresh = await fetchSupabaseAccount();
		// A failed read comes back null; wiping the account for it would look like "not onboarded" and bounce the user.
		if (fresh) setAccount(fresh);
	}, []);

	const updateStak = useCallback(async (brandIds: string[]) => {
		await updateStakSupabase(brandIds);
	}, []);

	const saveToStak = useCallback(
		// No "already saved?" check against the account snapshot: it can be out of date (STAK -> Undo -> STAK sees the
		// first save but not its undo, and skipped the second save). The upsert ignores a true duplicate anyway.
		async (brandId: string, priceAtSave?: number | null) => {
			await saveToStakSupabase(brandId, priceAtSave);
		},
		[],
	);

	const removeFromStak = useCallback(async (brandId: string) => {
		await removeFromStakSupabase(brandId);
	}, []);

	const removePassedBrand = useCallback(async (brandId: string) => {
		await deletePassedBrandSupabase(brandId);
	}, []);

	const updatePassedBrands = useCallback(async (entries: PassedEntry[]) => {
		await updatePassedBrandsSupabase(entries);
	}, []);

	// Server-authoritative — the daily limit can't be enforced by trusting a direct
	// client write (that's the bug this replaced: nothing capped the count).
	const incrementSwipeCount = useCallback(async (): Promise<SwipeLimitIncrementResponse> => {
		if (!supabaseUserId) return { accepted: false, count: 0, limit: 0 };
		return incrementSwipeCountServer();
	}, [supabaseUserId]);

	const updateDeckOrder = useCallback(async (order: string[]) => {
		await updateDeckOrderSupabase(order);
	}, []);

	const addSearchHistory = useCallback(async (query: string) => {
		await addSearchHistoryEntry(query);
	}, []);

	const removeSearchHistoryEntry = useCallback(async (query: string) => {
		await removeSearchHistoryEntryApi(query);
	}, []);

	const clearSearchHistory = useCallback(async () => {
		await clearSearchHistoryApi();
	}, []);

	const updatePreferences = useCallback(async (prefs: UserDoc["preferences"]) => {
		await updatePreferencesSupabase(prefs);
	}, []);

	const updateLastBriefDate = useCallback(async (date: string) => {
		await updateLastBriefDateSupabase(date);
	}, []);

	const completeLesson = useCallback(async (lessonId: string, xp: number) => {
		await completeActivity("lesson", lessonId, xp);
	}, []);

	const completeEarningsScenario = useCallback(async (scenarioId: string, xp: number) => {
		await completeActivity("earnings", scenarioId, xp);
	}, []);

	const completeBattle = useCallback(async (battleId: string, xp: number) => {
		await completeActivity("battle", battleId, xp);
	}, []);

	const completeRiskScenario = useCallback(async (scenarioId: string, xp: number) => {
		await completeActivity("risk", scenarioId, xp);
	}, []);

	const completeMoodScenario = useCallback(async (scenarioId: string, xp: number) => {
		await completeActivity("mood", scenarioId, xp);
	}, []);

	const addToSandbox = useCallback(async (ticker: string, shares: number, thesis?: string) => {
		await sandboxBuy(ticker, shares, thesis);
	}, []);

	const sellFromSandbox = useCallback(async (ticker: string, sharesToSell?: number) => {
		return sandboxSell(ticker, sharesToSell);
	}, []);

	const resetSandbox = useCallback(async () => {
		await sandboxReset();
	}, []);

	const completeDailyActivity = useCallback(async (dayKey: string, activityId: string, xp: number, activityType?: string) => {
		await completeDailyActivityApi(dayKey, activityId, xp, activityType);
	}, []);

	const markPlaygroundOnboarded = useCallback(async () => {
		await markPlaygroundOnboardedSupabase();
	}, []);

	const saveGeneratedLessonHistory = useCallback(async (entry: { topic: string; title: string; angle: string }) => {
		await saveGeneratedLessonHistorySupabase(entry);
	}, []);

	const addPracticeSkillXp = useCallback(async (skill: string, xp: number): Promise<{ xp: number; xpToday: number }> => {
		if (xp <= 0) return { xp: 0, xpToday: 0 };
		const result = await addSkillXp(skill, xp);
		return { xp: result.xp, xpToday: result.xpToday ?? 0 };
	}, []);

	const markSandboxMilestone = useCallback(async (value: number) => {
		await sandboxMilestone(value);
	}, []);

	const setupSandbox = useCallback(async (startingBalance: number, name: string, strategy: SandboxStrategyId) => {
		await sandboxSetup(startingBalance, name, strategy);
	}, []);

	const placeSandboxOrder = useCallback(async (ticker: string, amount: number, limitPrice: number) => {
		return sandboxPlaceOrder(ticker, amount, limitPrice);
	}, []);

	const cancelSandboxOrder = useCallback(async (id: number) => {
		await sandboxCancelOrder(id);
	}, []);

	return (
		<AccountContext.Provider
			value={{
				account,
				accountLoading,
				refreshAccount,
				updateStak,
				saveToStak,
				removeFromStak,
				removePassedBrand,
				updatePassedBrands,
				incrementSwipeCount,
				updateDeckOrder,
				updatePreferences,
				completeLesson,
				completeEarningsScenario,
				completeBattle,
				completeRiskScenario,
				completeMoodScenario,
				addToSandbox,
				sellFromSandbox,
				resetSandbox,
				markSandboxMilestone,
				setupSandbox,
				placeSandboxOrder,
				cancelSandboxOrder,
				completeDailyActivity,
				addPracticeSkillXp,
				markPlaygroundOnboarded,
				saveGeneratedLessonHistory,
				addSearchHistory,
				removeSearchHistoryEntry,
				clearSearchHistory,
				updateLastBriefDate,
			}}
		>
			{children}
		</AccountContext.Provider>
	);
}

export function useAccount() {
	const context = useContext(AccountContext);
	if (!context) throw new Error("useAccount must be used within an AccountProvider");
	return context;
}

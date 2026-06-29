/**
 * AccountContext — single source of truth for all user account data.
 *
 * Subscribes to users/{uid} via Firestore onSnapshot so all devices
 * and tabs stay in sync in real time without polling.
 *
 * Write methods use updateDoc directly — no backend round-trip needed.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { arrayUnion, doc, increment, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getProfile, incrementSwipeCountServer, type SwipeLimitIncrementResponse } from "../lib/api";
import { subscribeSupabaseAccount } from "../lib/supabaseAccount";
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


export interface UserDoc {
	uid?: string;
	email?: string;
	displayName?: string;
	phone?: string;
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
	updateStak: (brandIds: string[]) => Promise<void>;
	saveToStak: (brandId: string, priceAtSave?: number | null) => Promise<void>;
	updatePassedBrands: (entries: PassedEntry[]) => Promise<void>;
	incrementSwipeCount: () => Promise<SwipeLimitIncrementResponse>;
	updateDeckOrder: (order: string[]) => Promise<void>;
	updatePreferences: (prefs: UserDoc["preferences"]) => Promise<void>;
	addSearchHistory: (query: string) => Promise<void>;
	removeSearchHistoryEntry: (query: string) => Promise<void>;
	clearSearchHistory: () => Promise<void>;
	updateLastBriefDate: (date: string) => Promise<void>;
	completeLesson: (lessonId: string, xp: number) => Promise<void>;
	completeEarningsScenario: (scenarioId: string) => Promise<void>;
	completeBattle: (battleId: string) => Promise<void>;
	completeRiskScenario: (scenarioId: string) => Promise<void>;
	completeMoodScenario: (scenarioId: string) => Promise<void>;
	completeChallenge: (challengeId: string, xp: number) => Promise<void>;
	addXp: (xp: number) => Promise<void>;
	addToSandbox: (ticker: string, priceAtAdd: number | null, shares: number, thesis?: string) => Promise<void>;
	sellFromSandbox: (ticker: string, currentValue: number, currentPrice: number | null, sharesToSell?: number) => Promise<void>;
	initSandboxCash: () => Promise<void>;
	resetSandbox: () => Promise<void>;
	markSandboxMilestone: (value: number) => Promise<void>;
	completeDailyActivity: (dayKey: string, activityId: string, xp: number, activityType?: string) => Promise<void>;
	addPracticeSkillXp: (skill: string, xp: number) => Promise<void>;
	markPlaygroundOnboarded: () => Promise<void>;
	saveGeneratedLessonHistory: (entry: { topic: string; title: string; angle: string }) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | null>(null);

const MAX_SEARCH_HISTORY = 20;

// ── Provider ──────────────────────────────────────────────────────────────────

export function AccountProvider({ children }: { children: ReactNode }) {
	const { user, supabaseUserId, loading: authLoading, onboardingCompleted: claimsOnboardingCompleted, refreshClaims } = useAuth();
	const [account, setAccount] = useState<UserDoc | null>(null);
	const [accountLoading, setAccountLoading] = useState(true);

	// Wait for Firebase auth to fully resolve before acting.
	// This prevents the race where user=User but accountLoading=false
	// (stale from the logged-out state) causes a false redirect to /onboarding.
	useEffect(() => {
		if (authLoading) return;

		if (user) {
			setAccountLoading(true);
			const userRef = doc(db, "users", user.uid);

			const unsubscribe = onSnapshot(
				userRef,
				(snapshot) => {
					setAccount(snapshot.exists() ? (snapshot.data() as UserDoc) : null);
					setAccountLoading(false);
				},
				() => {
					// Offline or permission error — keep last known data, unblock UI
					setAccountLoading(false);
				},
			);

			return unsubscribe;
		}

		// Migration plan, Phase 5: a Supabase-only cohort session has no Firebase
		// `user` -- this is the same onSnapshot-replacement, backed by Realtime instead.
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
	}, [user, supabaseUserId, authLoading]);

	// Backfill: existing users have onboardingCompleted=true in Firestore but no
	// JWT custom claim yet. Calling GET /api/me triggers the backend to set the
	// claim, then refreshClaims() force-refreshes the token to pick it up.
	useEffect(() => {
		if (accountLoading || authLoading) return;
		if (!account || !user) return;
		if (account.onboardingCompleted === true && !claimsOnboardingCompleted) {
			getProfile()
				.then(() => refreshClaims())
				.catch(() => {});
		}
	}, [account, accountLoading, authLoading, user, claimsOnboardingCompleted, refreshClaims]);

	const updateStak = useCallback(
		async (brandIds: string[]) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { stakBrandIds: brandIds });
		},
		[user],
	);

	const saveToStak = useCallback(
		async (brandId: string, priceAtSave?: number | null) => {
			if (!user) return;
			// Optimistic duplicate check against local state (fast path)
			if ((account?.stakBrandIds ?? []).includes(brandId)) return;
			const entry: StakSaveEntry = { savedAt: Date.now(), priceAtSave: priceAtSave ?? null };
			// arrayUnion is atomic — safe against rapid double-tap race conditions
			await updateDoc(doc(db, "users", user.uid), {
				stakBrandIds: arrayUnion(brandId),
				[`stakSavedAt.${brandId}`]: entry,
			});
		},
		[user, account],
	);

	const updatePassedBrands = useCallback(
		async (entries: PassedEntry[]) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { passedBrands: entries });
		},
		[user],
	);

	// Server-authoritative — the daily limit can't be enforced by trusting a direct
	// client→Firestore write (that's the bug this replaced: nothing capped the count).
	const incrementSwipeCount = useCallback(async (): Promise<SwipeLimitIncrementResponse> => {
		if (!user) return { accepted: false, count: 0, limit: 0 };
		return incrementSwipeCountServer();
	}, [user]);

	const updateDeckOrder = useCallback(
		async (order: string[]) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { deckOrder: order });
		},
		[user],
	);


	const addSearchHistory = useCallback(
		async (query: string) => {
			if (!user) return;
			const trimmed = query.trim();
			if (!trimmed) return;
			const existing = account?.searchHistory ?? [];
			const deduped = existing.filter(
				(e) => e.query.toLowerCase() !== trimmed.toLowerCase(),
			);
			const updated = [{ query: trimmed, at: Date.now() }, ...deduped].slice(
				0,
				MAX_SEARCH_HISTORY,
			);
			await updateDoc(doc(db, "users", user.uid), { searchHistory: updated });
		},
		[user, account],
	);

	const removeSearchHistoryEntry = useCallback(
		async (query: string) => {
			if (!user) return;
			const existing = account?.searchHistory ?? [];
			const updated = existing.filter(
				(e) => e.query.toLowerCase() !== query.toLowerCase(),
			);
			await updateDoc(doc(db, "users", user.uid), { searchHistory: updated });
		},
		[user, account],
	);

	const clearSearchHistory = useCallback(async () => {
		if (!user) return;
		await updateDoc(doc(db, "users", user.uid), { searchHistory: [] });
	}, [user]);


	const updatePreferences = useCallback(
		async (prefs: UserDoc["preferences"]) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { preferences: prefs });
		},
		[user],
	);

	const updateLastBriefDate = useCallback(
		async (date: string) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { lastBriefDate: date });
		},
		[user],
	);

	const completeLesson = useCallback(
		async (lessonId: string, xp: number) => {
			if (!user) return;
			const existing = account?.lessonProgress ?? {};
			if (existing[lessonId]?.completed) return;
			const entry: LessonProgress = { completed: true, completedAt: Date.now(), xpEarned: xp };
			// Use increment() to avoid stale-read race on totalXp
			await updateDoc(doc(db, "users", user.uid), {
				[`lessonProgress.${lessonId}`]: entry,
				totalXp: increment(xp),
			});
		},
		[user, account],
	);

	const completeEarningsScenario = useCallback(
		async (scenarioId: string) => {
			if (!user) return;
			if (account?.earningsProgress?.[scenarioId]?.completed) return;
			await updateDoc(doc(db, "users", user.uid), {
				[`earningsProgress.${scenarioId}`]: { completed: true, completedAt: Date.now() },
			});
		},
		[user, account],
	);

	const completeBattle = useCallback(
		async (battleId: string) => {
			if (!user) return;
			if (account?.battlesProgress?.[battleId]?.completed) return;
			await updateDoc(doc(db, "users", user.uid), {
				[`battlesProgress.${battleId}`]: { completed: true, completedAt: Date.now() },
			});
		},
		[user, account],
	);

	const completeRiskScenario = useCallback(
		async (scenarioId: string) => {
			if (!user) return;
			if (account?.riskProgress?.[scenarioId]?.completed) return;
			await updateDoc(doc(db, "users", user.uid), {
				[`riskProgress.${scenarioId}`]: { completed: true, completedAt: Date.now() },
			});
		},
		[user, account],
	);

	const completeMoodScenario = useCallback(
		async (scenarioId: string) => {
			if (!user) return;
			if (account?.moodProgress?.[scenarioId]?.completed) return;
			await updateDoc(doc(db, "users", user.uid), {
				[`moodProgress.${scenarioId}`]: { completed: true, completedAt: Date.now() },
			});
		},
		[user, account],
	);

	const completeChallenge = useCallback(
		async (challengeId: string, xp: number) => {
			if (!user) return;
			// Use local time to match playground todayKey (not UTC which rolls over at 7pm ET)
			const d = new Date();
			const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
			const current = account?.dailyChallengeState;
			const completedIds = current?.date === today ? [...(current.completedIds ?? []), challengeId] : [challengeId];
			await updateDoc(doc(db, "users", user.uid), {
				dailyChallengeState: { date: today, completedIds },
				totalXp: increment(xp),
			});
		},
		[user, account],
	);

	const addXp = useCallback(
		async (xp: number) => {
			if (!user) return;
			// Use Firestore atomic increment — safe against concurrent XP awards
			await updateDoc(doc(db, "users", user.uid), { totalXp: increment(xp) });
		},
		[user],
	);

	const SANDBOX_BUDGET_BY_TIER: Record<number, number> = { 1: 1000, 2: 3000, 3: 5000, 4: 10000, 5: 25000 };
	const xpToSandboxTier = (xp: number) => xp >= 7500 ? 5 : xp >= 3500 ? 4 : xp >= 1500 ? 3 : xp >= 500 ? 2 : 1;

	const initSandboxCash = useCallback(async () => {
		if (!user) return;
		if (account?.sandboxCash !== undefined) return;
		const tier = xpToSandboxTier(account?.totalXp ?? 0);
		await updateDoc(doc(db, "users", user.uid), { sandboxCash: SANDBOX_BUDGET_BY_TIER[tier], sandboxTier: tier });
	}, [user, account]);

	const addToSandbox = useCallback(
		async (ticker: string, priceAtAdd: number | null, shares: number, thesis?: string) => {
			if (!user) return;
			const cost = priceAtAdd != null ? Math.round(priceAtAdd * shares * 100) / 100 : 0;
			if (cost <= 0) return;
			const userRef = doc(db, "users", user.uid);
			await runTransaction(db, async (tx) => {
				const snap = await tx.get(userRef);
				const data = snap.data() as { sandboxCash?: number; sandboxPortfolio?: Record<string, SandboxEntry> } | undefined;
				const liveCash = data?.sandboxCash ?? SANDBOX_BUDGET_BY_TIER[1]!;
				if (liveCash < cost) return;
				const existing = data?.sandboxPortfolio?.[ticker];
				const existingShares = existing?.shares ?? 0;
				const existingPrice = existing?.priceAtAdd ?? null;
				// Accumulate shares and compute weighted average cost basis
				const newShares = Math.round((existingShares + shares) * 1000) / 1000;
				const newPriceAtAdd = existingShares > 0 && existingPrice !== null && priceAtAdd !== null
					? Math.round(((existingPrice * existingShares + priceAtAdd * shares) / newShares) * 100) / 100
					: priceAtAdd;
				const entry: SandboxEntry = {
					addedAt: existing?.addedAt ?? Date.now(),
					priceAtAdd: newPriceAtAdd,
					shares: newShares,
					...(thesis ? { thesis } : existing?.thesis ? { thesis: existing.thesis } : {}),
				};
				tx.update(userRef, {
					[`sandboxPortfolio.${ticker}`]: entry,
					sandboxCash: Math.round((liveCash - cost) * 100) / 100,
				});
			});
		},
		[user],
	);

	const sellFromSandbox = useCallback(
		async (ticker: string, currentValue: number, currentPrice: number | null, sharesToSell?: number) => {
			if (!user) return;
			const entry = account?.sandboxPortfolio?.[ticker];
			const totalShares = entry?.shares ?? 0;
			const qty = sharesToSell ?? totalShares; // default: sell everything
			const costBasis = entry?.priceAtAdd != null ? entry.priceAtAdd * qty : 0;
			const pnl = Math.round((currentValue - costBasis) * 100) / 100;
			const remainingShares = Math.round((totalShares - qty) * 1000) / 1000;
			const updated = { ...(account?.sandboxPortfolio ?? {}) };
			if (remainingShares <= 0) {
				delete updated[ticker]; // fully sold
			} else {
				updated[ticker] = { ...entry!, shares: remainingShares };
			}
			const currentCash = account?.sandboxCash ?? 0;
			await updateDoc(doc(db, "users", user.uid), {
				sandboxPortfolio: updated,
				sandboxCash: Math.round((currentCash + currentValue) * 100) / 100,
			});
		},
		[user, account],
	);

	const resetSandbox = useCallback(async () => {
		if (!user) return;
		const tier = xpToSandboxTier(account?.totalXp ?? 0);
		await updateDoc(doc(db, "users", user.uid), {
			sandboxPortfolio: {},
			sandboxCash: SANDBOX_BUDGET_BY_TIER[tier],
			sandboxMilestones: [],
			sandboxTier: tier,
		});
	}, [user, account]);

	// When XP crosses a tier boundary, top up sandboxCash by the budget difference.
	// Existing users without sandboxTier get migrated silently (no cash change).
	useEffect(() => {
		if (!user || account?.sandboxCash === undefined) return;
		const currentTier = xpToSandboxTier(account.totalXp ?? 0);
		const storedTier = account.sandboxTier;
		if (storedTier === undefined) {
			// Migration: stamp current tier without changing cash
			updateDoc(doc(db, "users", user.uid), { sandboxTier: currentTier }).catch(() => {});
			return;
		}
		if (currentTier <= storedTier) return;
		const userRef = doc(db, "users", user.uid);
		runTransaction(db, async (tx) => {
			const snap = await tx.get(userRef);
			const data = snap.data() as { sandboxCash?: number; sandboxTier?: number; totalXp?: number } | undefined;
			const liveTier = data?.sandboxTier ?? storedTier;
			const liveCurrentTier = xpToSandboxTier(data?.totalXp ?? 0);
			if (liveCurrentTier <= liveTier) return;
			const increase = SANDBOX_BUDGET_BY_TIER[liveCurrentTier]! - SANDBOX_BUDGET_BY_TIER[liveTier]!;
			tx.update(userRef, {
				sandboxCash: Math.round(((data?.sandboxCash ?? 0) + increase) * 100) / 100,
				sandboxTier: liveCurrentTier,
			});
		}).catch(() => {});
	}, [user, account?.totalXp, account?.sandboxCash, account?.sandboxTier]);

	const completeDailyActivity = useCallback(async (dayKey: string, activityId: string, xp: number, activityType?: string) => {
		if (!user) return;
		const current = account?.dailyProgress;
		const isSameDay = current?.dayKey === dayKey;
		const alreadyDone = isSameDay && (current?.completedIds ?? []).includes(activityId);
		if (alreadyDone) return;
		const alreadySeen = new Set(account?.allTimeCompletedActivityIds ?? []);
		const allTimeUpdate = alreadySeen.has(activityId) ? {} : { allTimeCompletedActivityIds: arrayUnion(activityId) };
		const typeUpdate = activityType ? { "dailyProgress.completedTypes": arrayUnion(activityType) } : {};
		if (isSameDay) {
			await updateDoc(doc(db, "users", user.uid), {
				"dailyProgress.completedIds": arrayUnion(activityId),
				"dailyProgress.xpEarned": increment(xp),
				"dailyProgress.dayKey": dayKey,
				totalXp: increment(xp),
				...typeUpdate,
				...allTimeUpdate,
			});
		} else {
			// New day: reset the whole dailyProgress object
			await updateDoc(doc(db, "users", user.uid), {
				dailyProgress: { dayKey, completedIds: [activityId], completedTypes: activityType ? [activityType] : [], xpEarned: xp },
				totalXp: increment(xp),
				...allTimeUpdate,
			});
		}
	}, [user, account]);

	const markPlaygroundOnboarded = useCallback(async () => {
		if (!user) return;
		await updateDoc(doc(db, "users", user.uid), { playgroundOnboarded: true });
	}, [user]);

	const saveGeneratedLessonHistory = useCallback(async (entry: { topic: string; title: string; angle: string }) => {
		if (!user) return;
		const record = { ...entry, completedAt: Date.now() };
		await updateDoc(doc(db, "users", user.uid), {
			generatedLessonHistory: arrayUnion(record),
		});
	}, [user]);

	const addPracticeSkillXp = useCallback(async (skill: string, xp: number) => {
		if (!user || xp <= 0) return;
		await updateDoc(doc(db, "users", user.uid), {
			[`practiceSkills.${skill}`]: increment(xp),
			totalXp: increment(xp),
		});
	}, [user]);

	const markSandboxMilestone = useCallback(async (value: number) => {
		if (!user) return;
		const existing = account?.sandboxMilestones ?? [];
		if (existing.includes(value)) return;
		await updateDoc(doc(db, "users", user.uid), { sandboxMilestones: [...existing, value] });
	}, [user, account]);

	return (
		<AccountContext.Provider
			value={{
				account,
				accountLoading,
				updateStak,
				saveToStak,
				updatePassedBrands,
				incrementSwipeCount,
				updateDeckOrder,
	
				updatePreferences,
				completeLesson,
				completeEarningsScenario,
			completeBattle,
			completeRiskScenario,
			completeMoodScenario,
				completeChallenge,
				addXp,
				addToSandbox,
				sellFromSandbox,
				initSandboxCash,
				resetSandbox,
				markSandboxMilestone,
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

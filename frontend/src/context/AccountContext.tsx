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
import { doc, increment, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getProfile } from "../lib/api";
import { useAuth } from "./AuthContext";
import { getTodayKey } from "../lib/utils";

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

export interface DailyChallengeState {
	date: string;
	completedIds: string[];
}

export interface SandboxEntry {
	addedAt: number;
	priceAtAdd: number | null;
	shares?: number;           // number of shares purchased (new model); absent = legacy $1k model
	thesis?: string;
}

export interface SandboxTrade {
	ticker: string;
	action: "buy" | "sell";
	priceAtAction: number | null;
	value: number;          // 1000 for buy, currentValue for sell
	pnl: number | null;     // null for buy, dollar gain/loss for sell
	pnlPct: number | null;
	timestamp: number;
	thesis?: string;
}

export interface UserDoc {
	uid?: string;
	email?: string;
	displayName?: string;
	phone?: string;
	preferences?: { interests?: string[]; familiarity?: string; onboardingSwipes?: string[] };
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
	dailyChallengeState?: DailyChallengeState;
	sandboxPortfolio?: Record<string, SandboxEntry>;
	sandboxCash?: number;
	weeklyProgress?: { weekKey: string; completedIds: string[]; xpEarned: number };
	sandboxTradeHistory?: SandboxTrade[];  // last 30 trades
	sandboxMilestones?: number[];          // portfolio values already celebrated (e.g. [11000, 12000])
}

interface AccountContextType {
	account: UserDoc | null;
	accountLoading: boolean;
	updateStak: (brandIds: string[]) => Promise<void>;
	saveToStak: (brandId: string, priceAtSave?: number | null) => Promise<void>;
	updatePassedBrands: (entries: PassedEntry[]) => Promise<void>;
	incrementSwipeCount: () => Promise<void>;
	updateDeckOrder: (order: string[]) => Promise<void>;
	updateIntelState: (state: IntelCardState) => Promise<void>;
	updateStreak: (streak: { date: string; count: number }) => Promise<void>;
	updatePreferences: (prefs: UserDoc["preferences"]) => Promise<void>;
	addSearchHistory: (query: string) => Promise<void>;
	removeSearchHistoryEntry: (query: string) => Promise<void>;
	clearSearchHistory: () => Promise<void>;
	updateLastBriefDate: (date: string) => Promise<void>;
	completeLesson: (lessonId: string, xp: number) => Promise<void>;
	completeChallenge: (challengeId: string, xp: number) => Promise<void>;
	addXp: (xp: number) => Promise<void>;
	addToSandbox: (ticker: string, priceAtAdd: number | null, shares: number, thesis?: string) => Promise<void>;
	sellFromSandbox: (ticker: string, currentValue: number, currentPrice: number | null) => Promise<void>;
	removeFromSandbox: (ticker: string) => Promise<void>;
	initSandboxCash: () => Promise<void>;
	resetSandbox: () => Promise<void>;
	markSandboxMilestone: (value: number) => Promise<void>;
	completeWeeklyActivity: (weekKey: string, activityId: string, xp: number) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | null>(null);

const MAX_SEARCH_HISTORY = 20;

// ── Provider ──────────────────────────────────────────────────────────────────

export function AccountProvider({ children }: { children: ReactNode }) {
	const { user, loading: authLoading, onboardingCompleted: claimsOnboardingCompleted, refreshClaims } = useAuth();
	const [account, setAccount] = useState<UserDoc | null>(null);
	const [accountLoading, setAccountLoading] = useState(true);

	// Wait for Firebase auth to fully resolve before acting.
	// This prevents the race where user=User but accountLoading=false
	// (stale from the logged-out state) causes a false redirect to /onboarding.
	useEffect(() => {
		if (authLoading) return;

		if (!user) {
			setAccount(null);
			setAccountLoading(false);
			return;
		}

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
	}, [user, authLoading]);

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
			const existing = account?.stakBrandIds ?? [];
			if (existing.includes(brandId)) return;
			const entry: StakSaveEntry = { savedAt: Date.now(), priceAtSave: priceAtSave ?? null };
			const savedAtMap = { ...(account?.stakSavedAt ?? {}), [brandId]: entry };
			await updateDoc(doc(db, "users", user.uid), {
				stakBrandIds: [...existing, brandId],
				stakSavedAt: savedAtMap,
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

	const incrementSwipeCount = useCallback(async () => {
		if (!user) return;
		const today = getTodayKey();
		const userRef = doc(db, "users", user.uid);
		await runTransaction(db, async (tx) => {
			const snap = await tx.get(userRef);
			const cur = snap.data()?.dailySwipeState;
			const currentCount = cur?.date === today ? (cur.count ?? 0) : 0;
			tx.update(userRef, { dailySwipeState: { date: today, count: currentCount + 1 } });
		});
	}, [user]);

	const updateDeckOrder = useCallback(
		async (order: string[]) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { deckOrder: order });
		},
		[user],
	);

	const updateIntelState = useCallback(
		async (state: IntelCardState) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { intelCardState: state });
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

	const updateStreak = useCallback(
		async (streak: { date: string; count: number }) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { streak });
		},
		[user],
	);

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
			const totalXp = (account?.totalXp ?? 0) + xp;
			await updateDoc(doc(db, "users", user.uid), {
				[`lessonProgress.${lessonId}`]: entry,
				totalXp,
			});
		},
		[user, account],
	);

	const completeChallenge = useCallback(
		async (challengeId: string, xp: number) => {
			if (!user) return;
			const today = new Date().toISOString().split("T")[0];
			const current = account?.dailyChallengeState;
			const completedIds = current?.date === today ? [...(current.completedIds ?? []), challengeId] : [challengeId];
			const totalXp = (account?.totalXp ?? 0) + xp;
			await updateDoc(doc(db, "users", user.uid), {
				dailyChallengeState: { date: today, completedIds },
				totalXp,
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

	const SANDBOX_STARTING_CASH = 10000;
	const SANDBOX_POSITION_COST = 1000;

	const initSandboxCash = useCallback(async () => {
		if (!user) return;
		if (account?.sandboxCash !== undefined) return; // already initialised
		// Legacy users: estimate spent cash from old $1k-per-position model
		const existingPositions = Object.values(account?.sandboxPortfolio ?? {});
		const legacyCost = existingPositions.filter(e => !e.shares).length * SANDBOX_POSITION_COST;
		const newModelCost = existingPositions
			.filter(e => e.shares && e.priceAtAdd)
			.reduce((sum, e) => sum + (e.priceAtAdd! * e.shares!), 0);
		const initialCash = Math.max(0, SANDBOX_STARTING_CASH - legacyCost - newModelCost);
		await updateDoc(doc(db, "users", user.uid), { sandboxCash: Math.round(initialCash * 100) / 100 });
	}, [user, account]);

	const addToSandbox = useCallback(
		async (ticker: string, priceAtAdd: number | null, shares: number, thesis?: string) => {
			if (!user) return;
			const currentCash = account?.sandboxCash ?? SANDBOX_STARTING_CASH;
			const cost = priceAtAdd != null ? Math.round(priceAtAdd * shares * 100) / 100 : SANDBOX_POSITION_COST;
			if (currentCash < cost) return;
			const entry: SandboxEntry = { addedAt: Date.now(), priceAtAdd, shares, ...(thesis ? { thesis } : {}) };
			const trade: SandboxTrade = { ticker, action: "buy", priceAtAction: priceAtAdd, value: cost, pnl: null, pnlPct: null, timestamp: Date.now(), ...(thesis ? { thesis } : {}) };
			const history = [...(account?.sandboxTradeHistory ?? []), trade].slice(-30);
			await updateDoc(doc(db, "users", user.uid), {
				[`sandboxPortfolio.${ticker}`]: entry,
				sandboxCash: Math.round((currentCash - cost) * 100) / 100,
				sandboxTradeHistory: history,
			});
		},
		[user, account],
	);

	const sellFromSandbox = useCallback(
		async (ticker: string, currentValue: number, currentPrice: number | null) => {
			if (!user) return;
			const entry = account?.sandboxPortfolio?.[ticker];
			const shares = entry?.shares ?? 1;
			const costBasis = entry?.priceAtAdd != null ? entry.priceAtAdd * shares : SANDBOX_POSITION_COST;
			const pnl = Math.round((currentValue - costBasis) * 100) / 100;
			const pnlPct = entry?.priceAtAdd && currentPrice
				? Math.round(((currentPrice - entry.priceAtAdd) / entry.priceAtAdd) * 1000) / 10
				: null;
			const trade: SandboxTrade = { ticker, action: "sell", priceAtAction: currentPrice, value: Math.round(currentValue * 100) / 100, pnl, pnlPct, timestamp: Date.now(), ...(entry?.thesis ? { thesis: entry.thesis } : {}) };
			const history = [...(account?.sandboxTradeHistory ?? []), trade].slice(-30);
			const updated = { ...(account?.sandboxPortfolio ?? {}) };
			delete updated[ticker];
			const currentCash = account?.sandboxCash ?? 0;
			await updateDoc(doc(db, "users", user.uid), {
				sandboxPortfolio: updated,
				sandboxCash: Math.round((currentCash + currentValue) * 100) / 100,
				sandboxTradeHistory: history,
			});
		},
		[user, account],
	);

	const removeFromSandbox = useCallback(
		async (ticker: string) => {
			if (!user) return;
			const updated = { ...(account?.sandboxPortfolio ?? {}) };
			delete updated[ticker];
			await updateDoc(doc(db, "users", user.uid), { sandboxPortfolio: updated });
		},
		[user, account],
	);

	const resetSandbox = useCallback(async () => {
		if (!user) return;
		await updateDoc(doc(db, "users", user.uid), {
			sandboxPortfolio: {},
			sandboxCash: SANDBOX_STARTING_CASH,
			sandboxTradeHistory: [],
			sandboxMilestones: [],
		});
	}, [user]);

	const completeWeeklyActivity = useCallback(async (weekKey: string, activityId: string, xp: number) => {
		if (!user) return;
		const current = account?.weeklyProgress;
		const isSameWeek = current?.weekKey === weekKey;
		const alreadyDone = isSameWeek && (current?.completedIds ?? []).includes(activityId);
		if (alreadyDone) return;
		const completedIds = isSameWeek ? [...(current!.completedIds), activityId] : [activityId];
		const xpEarned = (isSameWeek ? (current!.xpEarned ?? 0) : 0) + xp;
		await updateDoc(doc(db, "users", user.uid), {
			weeklyProgress: { weekKey, completedIds, xpEarned },
			totalXp: increment(xp),
		});
	}, [user, account]);

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
				updateIntelState,
				updateStreak,
				updatePreferences,
				completeLesson,
				completeChallenge,
				addXp,
				addToSandbox,
				sellFromSandbox,
				removeFromSandbox,
				initSandboxCash,
				resetSandbox,
				markSandboxMilestone,
				completeWeeklyActivity,
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

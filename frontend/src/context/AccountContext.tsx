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
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
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

export interface UserDoc {
	uid?: string;
	email?: string;
	displayName?: string;
	phone?: string;
	preferences?: { interests?: string[]; familiarity?: string; onboardingSwipes?: string[] };
	onboardingCompleted?: boolean;
	stakBrandIds: string[];
	passedBrands: PassedEntry[];
	intelCardState?: IntelCardState;
	dailySwipeState?: DailySwipeState;
	streak?: { date: string; count: number };
	deckOrder?: string[];
	searchHistory?: SearchEntry[];
	categoryScores?: Record<string, number>;
}

interface AccountContextType {
	account: UserDoc | null;
	accountLoading: boolean;
	updateStak: (brandIds: string[]) => Promise<void>;
	updatePassedBrands: (entries: PassedEntry[]) => Promise<void>;
	incrementSwipeCount: () => Promise<void>;
	updateDeckOrder: (order: string[]) => Promise<void>;
	updateIntelState: (state: IntelCardState) => Promise<void>;
	updateStreak: (streak: { date: string; count: number }) => Promise<void>;
	updatePreferences: (prefs: UserDoc["preferences"]) => Promise<void>;
	addSearchHistory: (query: string) => Promise<void>;
	removeSearchHistoryEntry: (query: string) => Promise<void>;
	clearSearchHistory: () => Promise<void>;
	updateCategoryScores: (delta: Record<string, number>) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today's date key (resets at 9 AM, same logic as useSwipeLimit). */
function getTodayKey(): string {
	const now = new Date();
	if (now.getHours() < 9) {
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		return yesterday.toISOString().split("T")[0];
	}
	return now.toISOString().split("T")[0];
}

const MAX_SEARCH_HISTORY = 20;

// ── Provider ──────────────────────────────────────────────────────────────────

export function AccountProvider({ children }: { children: ReactNode }) {
	const { user, loading: authLoading } = useAuth();
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

	const updateStak = useCallback(
		async (brandIds: string[]) => {
			if (!user) return;
			await updateDoc(doc(db, "users", user.uid), { stakBrandIds: brandIds });
		},
		[user],
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
		const cur = account?.dailySwipeState;
		const currentCount = cur?.date === today ? (cur.count ?? 0) : 0;
		await updateDoc(doc(db, "users", user.uid), {
			dailySwipeState: { date: today, count: currentCount + 1 },
		});
	}, [user, account]);

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

	const updateCategoryScores = useCallback(
		async (delta: Record<string, number>) => {
			if (!user) return;
			const current = account?.categoryScores ?? {};
			const merged: Record<string, number> = { ...current };
			for (const [cat, score] of Object.entries(delta)) {
				merged[cat] = (merged[cat] ?? 0) + score;
			}
			await updateDoc(doc(db, "users", user.uid), { categoryScores: merged });
		},
		[user, account],
	);

	return (
		<AccountContext.Provider
			value={{
				account,
				accountLoading,
				updateStak,
				updatePassedBrands,
				incrementSwipeCount,
				updateDeckOrder,
				updateIntelState,
				updateStreak,
				updatePreferences,
				addSearchHistory,
				removeSearchHistoryEntry,
				clearSearchHistory,
				updateCategoryScores,
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

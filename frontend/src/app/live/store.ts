/**
 * One hook for everything a screen needs to be alive: who is here, what they saved, passed,
 * hold and sold, how far through today's deck they are, what they have read, how they answered
 * onboarding — and the actions that change it. Signed in, it is the account's Firestore document
 * (AccountContext) plus a per-uid local store; signed out, the guest persona in localStorage.
 * Screens never branch on the backend; they read `live` and call `live.actions`.
 */
import { ACTION_POINTS, xpToTier } from "@stak/shared";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo } from "react";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";
import { db } from "@/lib/firebase";
import { roundShares } from "@/lib/utils";
import { brandIdOfTicker, normalizeTicker, tagsOf, tickerOfBrandId } from "./catalog";
import { round2, round4 } from "./format";
import {
	type DeckProgress,
	type LocalState,
	type Position,
	type Preferences,
	type SaveEntry,
	type SoldEntry,
	guestStore,
	localStore,
	useStore,
} from "./guest";

/** Paper budget by XP tier — the same table AccountContext uses to initialise sandboxCash. */
const BUDGET_BY_TIER: Record<number, number> = { 1: 1000, 2: 3000, 3: 5000, 4: 10000, 5: 25000 };

const points = ACTION_POINTS as unknown as Record<string, number>;
const SAVE_POINTS = points.save ?? 3;
const PASS_POINTS = points.pass ?? -1;

/** Guests learn taste locally the way the backend does for accounts: tag weights × action points. */
function bumpTags(scores: Record<string, number>, ticker: string, pts: number): Record<string, number> {
	const tags = tagsOf(ticker)?.learningTags ?? [];
	if (tags.length === 0) return scores;
	const next = { ...scores };
	for (const t of tags) next[t.tag] = round2((next[t.tag] ?? 0) + t.weight * pts);
	return next;
}

export type LiveState = {
	/** false while Firebase auth / the account document are still loading */
	ready: boolean;
	signedIn: boolean;
	uid: string | null;
	displayName: string;
	createdAt: number | null;
	saves: SaveEntry[];
	savedTickers: Set<string>;
	passed: string[];
	cash: number;
	positions: Position[];
	sold: SoldEntry[];
	deck: DeckProgress | null;
	completedDecks: number;
	read: string[];
	dismissed: string[];
	lastBriefDate: string | null;
	preferences: Preferences;
	tagScores: Record<string, number>;
};

export type LiveActions = {
	save: (ticker: string, priceAtSave?: number | null) => Promise<void>;
	unsave: (ticker: string) => Promise<void>;
	pass: (ticker: string) => Promise<void>;
	/** Spend `dollars` of paper cash on `ticker` at `price`; throws "insufficient" when cash is short. */
	buy: (ticker: string, dollars: number, price: number) => Promise<Position>;
	/** Sell `shares` of `ticker` at `price`; the proceeds return to cash and the sale is logged. */
	sell: (ticker: string, shares: number, price: number) => Promise<SoldEntry>;
	setDeck: (progress: DeckProgress | null | ((prev: DeckProgress | null) => DeckProgress | null)) => void;
	completeDeck: () => void;
	markRead: (ids: string[]) => void;
	dismiss: (id: string) => void;
	setLastBriefDate: (date: string) => void;
	setDisplayName: (name: string) => Promise<void>;
	setPreferences: (prefs: Partial<Preferences>) => Promise<void>;
	/** Wipe the guest persona back to the seed (used by Log out when no account is signed in). */
	resetGuest: () => void;
};

export type Live = LiveState & { actions: LiveActions };

export function useLive(): Live {
	const { user, loading: authLoading } = useAuth();
	const acct = useAccount();
	const account = acct.account;
	const guest = useStore(guestStore());
	const uid = user?.uid ?? null;
	const local = useStore(localStore(uid ?? "guest"));
	const signedIn = !!user;
	const sandboxCash = account?.sandboxCash;

	// A signed-in account starts with the paper budget of its tier (the context does this lazily).
	useEffect(() => {
		if (signedIn && account && sandboxCash === undefined) acct.initSandboxCash().catch(() => {});
	}, [signedIn, account, sandboxCash, acct.initSandboxCash]);

	const state = useMemo<LiveState>(() => {
		if (!signedIn) {
			return {
				ready: true,
				signedIn: false,
				uid: null,
				displayName: guest.displayName,
				createdAt: guest.createdAt,
				saves: guest.saves,
				savedTickers: new Set(guest.saves.map((s) => s.ticker)),
				passed: guest.passed,
				cash: guest.cash,
				positions: guest.positions,
				sold: guest.sold,
				deck: guest.deck,
				completedDecks: guest.completedDecks,
				read: guest.read,
				dismissed: guest.dismissed,
				lastBriefDate: guest.lastBriefDate,
				preferences: guest.preferences,
				tagScores: guest.tagScores,
			};
		}
		const ids = account?.stakBrandIds ?? [];
		const saves: SaveEntry[] = ids.map((id) => {
			const e = account?.stakSavedAt?.[id];
			return { ticker: tickerOfBrandId(id), savedAt: e?.savedAt ?? 0, priceAtSave: e?.priceAtSave ?? null };
		});
		const positions: Position[] = Object.entries(account?.sandboxPortfolio ?? {}).map(([ticker, p]) => ({
			ticker: normalizeTicker(ticker),
			shares: p.shares,
			priceAtAdd: p.priceAtAdd,
			addedAt: p.addedAt,
		}));
		const created = user?.metadata?.creationTime ? Date.parse(user.metadata.creationTime) : Number.NaN;
		return {
			ready: !authLoading && !acct.accountLoading,
			signedIn: true,
			uid,
			displayName: (account?.displayName || user?.displayName || "").trim(),
			createdAt: Number.isNaN(created) ? null : created,
			saves,
			savedTickers: new Set(saves.map((s) => s.ticker)),
			passed: (account?.passedBrands ?? []).map((e) => tickerOfBrandId(e.id)),
			cash: sandboxCash ?? BUDGET_BY_TIER[xpToTier(account?.totalXp ?? 0)] ?? 1000,
			positions,
			sold: local.sold,
			deck: local.deck,
			completedDecks: local.completedDecks,
			read: local.read,
			dismissed: local.dismissed,
			lastBriefDate: account?.lastBriefDate ?? local.lastBriefDate,
			preferences: (account?.preferences ?? {}) as Preferences,
			tagScores: account?.tagScores ?? {},
		};
	}, [signedIn, guest, account, local, uid, user, authLoading, acct.accountLoading, sandboxCash]);

	const actions = useMemo<LiveActions>(() => {
		const updateLocal = (patch: (s: LocalState) => Partial<LocalState>) => {
			if (signedIn && uid) localStore(uid).update(patch);
			else guestStore().update((s) => patch(s));
		};
		return {
			save: async (ticker, priceAtSave = null) => {
				const T = normalizeTicker(ticker);
				if (!signedIn) {
					guestStore().update((s) => ({
						saves: s.saves.some((x) => x.ticker === T) ? s.saves : [...s.saves, { ticker: T, savedAt: Date.now(), priceAtSave }],
						passed: s.passed.filter((p) => p !== T),
						tagScores: s.saves.some((x) => x.ticker === T) ? s.tagScores : bumpTags(s.tagScores, T, SAVE_POINTS),
					}));
					return;
				}
				const id = brandIdOfTicker(T);
				await acct.saveToStak(id, priceAtSave);
				const passed = account?.passedBrands ?? [];
				if (passed.some((e) => e.id === id)) await acct.updatePassedBrands(passed.filter((e) => e.id !== id));
			},
			unsave: async (ticker) => {
				const T = normalizeTicker(ticker);
				if (!signedIn) {
					guestStore().update((s) => ({ saves: s.saves.filter((x) => x.ticker !== T) }));
					return;
				}
				const id = brandIdOfTicker(T);
				await acct.updateStak((account?.stakBrandIds ?? []).filter((x) => x !== id));
			},
			pass: async (ticker) => {
				const T = normalizeTicker(ticker);
				if (!signedIn) {
					guestStore().update((s) => ({
						passed: s.passed.includes(T) ? s.passed : [...s.passed, T],
						tagScores: bumpTags(s.tagScores, T, PASS_POINTS),
					}));
					return;
				}
				const id = brandIdOfTicker(T);
				const passed = account?.passedBrands ?? [];
				const existing = passed.find((e) => e.id === id);
				await acct.updatePassedBrands([...passed.filter((e) => e.id !== id), { id, at: Date.now(), count: (existing?.count ?? 0) + 1 }]);
			},
			buy: async (ticker, dollars, price) => {
				const T = normalizeTicker(ticker);
				const amount = round2(dollars);
				if (!(amount > 0) || !(price > 0)) throw new Error("invalid");
				if (amount > state.cash + 0.005) throw new Error("insufficient");
				const shares = round4(amount / price);
				const now = Date.now();
				if (!signedIn) {
					guestStore().update((s) => {
						const existing = s.positions.find((p) => p.ticker === T);
						const positions = existing
							? s.positions.map((p) =>
									p.ticker === T
										? {
												...p,
												shares: round4(p.shares + shares),
												priceAtAdd: round2(((p.priceAtAdd ?? price) * p.shares + price * shares) / (p.shares + shares)),
											}
										: p,
								)
							: [...s.positions, { ticker: T, shares, priceAtAdd: price, addedAt: now }];
						return { positions, cash: round2(s.cash - amount) };
					});
					return { ticker: T, shares, priceAtAdd: price, addedAt: now };
				}
				const qty = roundShares(shares);
				await acct.addToSandbox(T, price, qty);
				return { ticker: T, shares: qty, priceAtAdd: price, addedAt: now };
			},
			sell: async (ticker, shares, price) => {
				const T = normalizeTicker(ticker);
				const pos = state.positions.find((p) => p.ticker === T);
				if (!pos) throw new Error("no position");
				const qty = Math.min(round4(shares), pos.shares);
				const proceeds = round2(qty * price);
				const basis = pos.priceAtAdd ?? price;
				const entry: SoldEntry = { ticker: T, shares: qty, proceeds, pnl: round2(qty * (price - basis)), stake: round2(qty * basis), soldAt: Date.now() };
				if (!signedIn) {
					guestStore().update((s) => {
						const remaining = round4(pos.shares - qty);
						return {
							positions:
								remaining > 0.00005 ? s.positions.map((p) => (p.ticker === T ? { ...p, shares: remaining } : p)) : s.positions.filter((p) => p.ticker !== T),
							cash: round2(s.cash + proceeds),
							sold: [entry, ...s.sold],
						};
					});
					return entry;
				}
				await acct.sellFromSandbox(T, proceeds, price, qty);
				updateLocal((s) => ({ sold: [entry, ...s.sold] }));
				return entry;
			},
			setDeck: (progress) => updateLocal((s) => ({ deck: typeof progress === "function" ? progress(s.deck) : progress })),
			completeDeck: () => updateLocal((s) => ({ completedDecks: s.completedDecks + 1 })),
			markRead: (ids) => updateLocal((s) => ({ read: [...new Set([...s.read, ...ids])] })),
			dismiss: (id) => updateLocal((s) => ({ dismissed: [...new Set([...s.dismissed, id])] })),
			setLastBriefDate: (date) => {
				updateLocal(() => ({ lastBriefDate: date }));
				if (signedIn) acct.updateLastBriefDate(date).catch(() => {});
			},
			setDisplayName: async (name) => {
				const n = name.trim();
				if (!n) return;
				if (!signedIn || !uid) {
					guestStore().update({ displayName: n });
					return;
				}
				try {
					await updateProfile({ displayName: n });
				} catch {
					await updateDoc(doc(db, "users", uid), { displayName: n });
				}
			},
			setPreferences: async (prefs) => {
				if (!signedIn) {
					guestStore().update((s) => ({ preferences: { ...s.preferences, ...prefs } }));
					return;
				}
				await acct.updatePreferences({ ...(account?.preferences ?? {}), ...prefs });
			},
			resetGuest: () => guestStore().reset(),
		};
	}, [signedIn, uid, account, acct, state.cash, state.positions]);

	return useMemo(() => ({ ...state, actions }), [state, actions]);
}

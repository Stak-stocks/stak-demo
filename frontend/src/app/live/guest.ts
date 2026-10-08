/**
 * Browser-side state. Signed-out visitors get the Figma persona ("Hamza") as a guest: their
 * saves, paper trades, deck progress and read notifications live in localStorage so the product
 * works end to end before an account exists. Signed-in users keep the parts Firestore does not
 * model (sold log, deck progress, read state) in a per-uid local store.
 */
import { useSyncExternalStore } from "react";

export type SaveEntry = { ticker: string; savedAt: number; priceAtSave: number | null };
export type Position = { ticker: string; shares: number; priceAtAdd: number | null; addedAt: number };
export type SoldEntry = { ticker: string; shares: number; proceeds: number; pnl: number; stake: number; soldAt: number };
export type DeckProgress = {
	date: string;
	theme: string;
	order: string[];
	index: number;
	saved: string[];
	passed: string[];
	bought: string[];
	completed?: boolean;
};
export type Preferences = { interests?: string[]; familiarity?: string; onboardingSwipes?: string[]; goal?: string; theme?: "light" | "dark" };

/** What lives in the browser for guests and accounts alike. */
export type LocalState = {
	sold: SoldEntry[];
	deck: DeckProgress | null;
	completedDecks: number;
	read: string[];
	dismissed: string[];
	lastBriefDate: string | null;
};

export type GuestState = LocalState & {
	createdAt: number;
	displayName: string;
	saves: SaveEntry[];
	passed: string[];
	cash: number;
	positions: Position[];
	preferences: Preferences;
	tagScores: Record<string, number>;
};

const on = (month: number, day: number, year = 2026) => new Date(year, month - 1, day).getTime();

export const emptyLocal = (): LocalState => ({ sold: [], deck: null, completedDecks: 0, read: [], dismissed: [], lastBriefDate: null });

/**
 * The persona of the frames, reconstructed so every derived number is consistent: a $10,000
 * paper budget, six open $100 stakes (the portfolio rows), two closed ones (SHOP +12, COIN −8)
 * and nineteen saves spread over the six collections (5 · 3 · 3 · 2 · 4 · 2).
 */
export function seedGuest(): GuestState {
	const saves: [string, number, number][] = [
		// AI & Tech
		["MSFT", on(6, 2), 431.1],
		["AMD", on(6, 9), 151.4],
		["SNOW", on(6, 16), 139.8],
		["PLTR", on(6, 23), 24.6],
		["CRWD", on(6, 30), 336.2],
		// Finance
		["JPM", on(6, 4), 198.3],
		["V", on(6, 11), 274.9],
		["BAC", on(6, 18), 39.4],
		// Green Energy
		["ENPH", on(6, 5), 121.7],
		["FSLR", on(6, 12), 214.3],
		["NEE", on(6, 19), 70.2],
		// Real Estate
		["O", on(6, 6), 54.1],
		["PLD", on(6, 13), 121.9],
		// Healthcare
		["PFE", on(6, 7), 27.1],
		["LLY", on(6, 14), 842.6],
		["ABBV", on(6, 21), 166.4],
		["MRK", on(6, 28), 131.2],
		// Consumer
		["COST", on(6, 8), 897.5],
		["TSLA", on(6, 15), 226.8],
	];
	const stake = (ticker: string, month: number, day: number, priceAtAdd: number): Position => ({
		ticker,
		priceAtAdd,
		shares: Math.round((100 / priceAtAdd) * 10000) / 10000,
		addedAt: on(month, day),
	});
	return {
		...emptyLocal(),
		createdAt: on(7, 1),
		displayName: "Hamza",
		saves: saves.map(([ticker, savedAt, priceAtSave]) => ({ ticker, savedAt, priceAtSave })),
		passed: [],
		// $10,000 budget − 8 × $100 stakes + the two sales that came back (112 + 92)
		cash: 9404,
		positions: [
			{ ticker: "NVDA", priceAtAdd: 98.5, shares: 1.0152, addedAt: on(5, 8) },
			stake("TSLA", 5, 20, 210.59),
			stake("AMD", 6, 2, 148.02),
			stake("AAPL", 6, 24, 216.37),
			stake("JPM", 7, 1, 202.75),
			stake("MSFT", 7, 8, 451.75),
		],
		sold: [
			{ ticker: "SHOP", shares: 1.5731, stake: 100, proceeds: 112, pnl: 12, soldAt: on(5, 30) },
			{ ticker: "COIN", shares: 0.4209, stake: 100, proceeds: 92, pnl: -8, soldAt: on(6, 15) },
		],
		preferences: { familiarity: "buy", goal: "grow", interests: [], onboardingSwipes: ["apple", "nvidia", "tesla"] },
		tagScores: { semiconductor: 4, ai: 3, enterprise_software: 2, consumer_brand: 2, high_growth: 2, retail: 1, ecommerce: 1 },
	};
}

// ── A tiny external store per localStorage key ────────────────────────────────────────────────

export type Store<T> = {
	read: () => T;
	update: (patch: Partial<T> | ((s: T) => Partial<T>)) => void;
	reset: () => void;
	subscribe: (listener: () => void) => () => void;
};

const stores = new Map<string, Store<unknown>>();

function createStore<T extends object>(key: string, seed: () => T): Store<T> {
	let cache: T | null = null;
	const listeners = new Set<() => void>();
	const load = (): T => {
		if (cache) return cache;
		try {
			const raw = localStorage.getItem(key);
			if (raw) {
				cache = { ...seed(), ...(JSON.parse(raw) as Partial<T>) };
				return cache;
			}
		} catch {
			/* storage unavailable or corrupt: start from the seed */
		}
		cache = seed();
		return cache;
	};
	const persist = (next: T) => {
		cache = next;
		try {
			localStorage.setItem(key, JSON.stringify(next));
		} catch {
			/* private mode etc. — the state still lives for this session */
		}
		for (const l of listeners) l();
	};
	return {
		read: load,
		update: (patch) => {
			const prev = load();
			persist({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) });
		},
		reset: () => {
			try {
				localStorage.removeItem(key);
			} catch {
				/* ignore */
			}
			persist(seed());
		},
		subscribe: (l) => {
			listeners.add(l);
			return () => listeners.delete(l);
		},
	};
}

export function storeFor<T extends object>(key: string, seed: () => T): Store<T> {
	let s = stores.get(key) as Store<T> | undefined;
	if (!s) {
		s = createStore(key, seed);
		stores.set(key, s as Store<unknown>);
	}
	return s;
}

export const GUEST_KEY = "stak.guest.v1";
export const localKey = (uid: string) => `stak.local.${uid}.v1`;

export const guestStore = () => storeFor<GuestState>(GUEST_KEY, seedGuest);
export const localStore = (uid: string) => storeFor<LocalState>(localKey(uid), emptyLocal);

export function useStore<T extends object>(store: Store<T>): T {
	return useSyncExternalStore(store.subscribe, store.read, store.read);
}

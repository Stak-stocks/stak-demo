/**
 * Browser-side state. Signed-out visitors get the Figma persona ("Hamza") as a guest: their
 * saves, paper trades, deck progress and read notifications live in localStorage so the product
 * works end to end before an account exists. Signed-in users keep the parts Firestore does not
 * model (sold log, deck progress, read state, what each company taught, the lots of their orders) in
 * a per-uid local store.
 */
import { useSyncExternalStore } from "react";
import { DEMO_QUOTES } from "./demoQuotes";

export type SaveEntry = { ticker: string; savedAt: number; priceAtSave: number | null };
/**
 * One buy of a position: the shares of it still held, the price it filled at, when. A part sale sells every lot in
 * proportion (store.ts sell), so the lots of a position always add up to its shares; `bought` keeps the order's own
 * quantity (absent: `shares`), which is what the inbox row of that order prints whatever was sold since (N27c).
 */
export type Lot = { shares: number; price: number; at: number; bought?: number };
/**
 * `priceAtAdd` is the average cost of the shares held (not rounded to cents: shares x priceAtAdd is what they cost, to
 * the cent), `addedAt` the first buy. `lots` lists every buy (a guest's, since 2026-11-09 from the first buy on), so
 * the value history knows when each share was bought; without it the position is ONE lot (ledger.ts positionLots, the
 * one accessor: never read `lots` directly).
 */
export type Position = { ticker: string; shares: number; priceAtAdd: number | null; addedAt: number; lots?: Lot[] };
/**
 * One sale, as its own arithmetic (N29d): `proceeds` is the cash it returned, `stake` what the shares sold had cost,
 * `pnl` = proceeds - stake, to the cent, so the SOLD row, the receipt, the cash and the inbox state ONE gain.
 * Since 2026-11-09 a sale also records what happened (N27c; absent on older records): `closed` whether it ended the
 * position, `price` the price it filled at, and `lots`: THE BUYS IT SOLD, on every sale, part or closing (ledger.ts
 * saleRecord): one entry per buy the sale took shares from, its `shares` the part of that buy sold in THIS sale, its
 * `price` and `at` that buy's own fill price and time, its `bought` that order's own quantity. They add up to `shares`,
 * and their cost to `stake` within a cent. The value history values each from its own day (a share bought today and
 * sold today was never held last week), and the inbox still knows today's orders of a pick a closing sale ended. A
 * record without `lots` (the seed's, a part sale stored before the evening of 2026-11-09) is ONE lot bought on
 * `addedAt` at the stake a share: read through ledger.ts soldLots, never directly.
 */
export type SoldEntry = {
	ticker: string;
	shares: number;
	proceeds: number;
	pnl: number;
	stake: number;
	soldAt: number;
	addedAt?: number;
	closed?: boolean;
	price?: number;
	lots?: Lot[];
};
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

/** What lives in the browser for guests and accounts alike (an account keeps a little more: AccountLocal below). */
export type LocalState = {
	sold: SoldEntry[];
	deck: DeckProgress | null;
	completedDecks: number;
	read: string[];
	dismissed: string[];
	lastBriefDate: string | null;
	/**
	 * What each company has taught the taste so far, in action points (store.ts teach): a save's points while it is
	 * saved, a pass's once it was passed, nothing after an Unsave. The tag scores move by the DIFFERENCE, so an Unsave
	 * takes back what its Save taught and a company teaches once however often it is toggled or replayed (N27d, N29h).
	 * A company absent from the map has taught nothing this ledger knows of (the persona's seeded saves, older states).
	 */
	taught: Record<string, number>;
};

/**
 * What a signed-in account keeps in this browser (key stak.local.<uid>.v1): LocalState, and the buys of its paper
 * positions as this browser saw them (review of 2026-11-09, follow-up F9). The account's own ledger (Firestore, shared
 * with the phones) holds one quantity, one average cost and the first buy's day per company, so until then the inbox
 * built an account's "Practice order filled" row from the whole holding: a top-up raised no row and a part sale changed
 * the row. `lots` keeps, per ticker, what the guest keeps on its positions (Position.lots): every order placed here,
 * with its own shares, price and time; a holding first met here at a top-up or a part sale is recorded as the ONE lot
 * it was until then. store.ts hands them to the account's positions (ledger.ts keptLots decides whether they still
 * belong to the position held), so every reader goes through positionLots as for a guest. Nothing is written to
 * Firestore, and an order placed on a phone is not known here: readers scale by the shares held (heldLots).
 */
export type AccountLocal = LocalState & { lots: Record<string, Lot[]> };

export type GuestState = LocalState & {
	createdAt: number;
	displayName: string;
	saves: SaveEntry[];
	passed: string[];
	cash: number;
	positions: Position[];
	preferences: Preferences;
	tagScores: Record<string, number>;
	/**
	 * This ledger holds the frames' six unlisted picks (the persona's "12 picks", six listed: live/ledger.ts
	 * personaOffBook). True for the persona and every ledger that grew from it, false for any other guest state.
	 */
	unlisted: boolean;
	/**
	 * Dollars of the unlisted picks' value this ledger does not hold (live/ledger.ts personaOffBookLess): 0, except for a
	 * browser migrated from the old seed whose cash was under the $604 the seed moved, and the few cents (either way) a
	 * browser carried over from the four-decimal seed keeps so its total does not move (migrateGuest).
	 */
	unlistedCut: number;
	/**
	 * The showcase has ended for good (D7 refined, 2026-11-07): the guest's first save, unsave, pass, buy or sale sets
	 * it and reversing the action does not clear it (Save then Unsave keeps the computed figures). Only Delete account's
	 * reset to the seed clears it (store.ts resetGuest; since N29b Log out erases nothing, as on the phones).
	 * live/showcase.ts reads it before comparing the ledger with the seed.
	 */
	touched: boolean;
	/**
	 * The seed this ledger grew from: SEED_REV (2: the exact seed of 2026-11-09, N30.7). A stored state without it grew
	 * from the four-decimal seed and is carried over once by migrateGuest.
	 */
	seedRev: number;
};

/** The exact seed (2026-11-09): eight-decimal shares worth the frames' dollars, the account opened before its first pick. */
export const SEED_REV = 2;

/** The frames' paper cash (Simulate 2:664 / every ticket "Cash available $8,800.00"): the persona's seed cash. */
export const GUEST_SEED_CASH = 8800;
/**
 * The seed cash before the ledger was anchored on the frames (2026-11-07): $10,000 - 8 x $100 stakes + the two sales
 * that came back (112 + 92). A browser that stored the persona then still holds a ledger grown from it.
 */
export const LEGACY_SEED_CASH = 9404;

const on = (month: number, day: number, year = 2026) => new Date(year, month - 1, day).getTime();

export const emptyLocal = (): LocalState => ({ sold: [], deck: null, completedDecks: 0, read: [], dismissed: [], lastBriefDate: null, taught: {} });
/** A signed-in account's local state before anything happened in this browser. */
export const emptyAccountLocal = (): AccountLocal => ({ ...emptyLocal(), lots: {} });

/** Eight decimals of a share: the ledger's precision (format.ts round8; kept here so the seed needs nothing else). */
const shares8 = (n: number) => Math.round(n * 1e8) / 1e8;

/**
 * The frames' six listed picks (Portfolio 2:743, its rows in src/app/simulate/data.ts `portfolio.rows`; the NVDA pick
 * page 2:859): the day each was picked, its $100.00 stake and the dollars the frame says it is worth today (stake +
 * the row's gain: NVDA +$24.00, TSLA +$18.00, AMD +$11.00, AAPL +$6.00, JPM +$2.00, MSFT -$3.00).
 * `week`: the dollars a frame says the pick made THIS WEEK, where a frame prints it: only the NVDA pick page does
 * (2:899 "This week +$3.80"; src/app/simulate/data.ts pickDetail.stats). The company's week-opening close follows from
 * it (coordinator ruling N35b: ledger.ts framesWeekMove), so the cell still reads +$3.80 past the showcase.
 */
export const SEED_PICKS: readonly { ticker: string; month: number; day: number; stake: number; worth: number; week?: number }[] = [
	{ ticker: "NVDA", month: 5, day: 8, stake: 100, worth: 124, week: 3.8 },
	{ ticker: "TSLA", month: 5, day: 20, stake: 100, worth: 118 },
	{ ticker: "AMD", month: 6, day: 2, stake: 100, worth: 111 },
	{ ticker: "AAPL", month: 6, day: 24, stake: 100, worth: 106 },
	{ ticker: "JPM", month: 7, day: 1, stake: 100, worth: 102 },
	{ ticker: "MSFT", month: 7, day: 8, stake: 100, worth: 97 },
];

/**
 * A seeded pick, DOLLARS EXACT (coordinator ruling N30.7): eight-decimal shares worth exactly the frame's dollars at the
 * demo quote, bought for exactly the frame's stake. The per-share figures follow: the pick-day price is stake / shares
 * (NVDA $98.47 where the frame prints $98.50) and the shares print 1.0156 where the frame prints 1.0152; both frame
 * strings stay verbatim in the untouched showcase only. The frame's own three figures do not agree to the cent ($98.50
 * x 1.0152 at $122.10 is $123.96), and the dollars are what moves the cash: the first sale credits the $124.00 the
 * showcase's sheet promised (ST-02) and no listed gain moves by cents at the first action (ST-08).
 */
function seedPick(pick: (typeof SEED_PICKS)[number]): Position {
	const shares = shares8(pick.worth / DEMO_QUOTES[pick.ticker]!.price);
	return { ticker: pick.ticker, shares, priceAtAdd: pick.stake / shares, addedAt: on(pick.month, pick.day) };
}

/**
 * The six listed picks as the seed held them until 2026-11-09: four-decimal shares of a $100 stake at a two-decimal
 * pick-day price (NVDA the frame's 1.0152 at $98.50). At the demo quotes they were worth $657.99, not the frames'
 * $658.00, and cost $600.04. migrateGuest recognises a stored pick that is still exactly one of these.
 */
const LEGACY_PICKS: readonly Position[] = [
	{ ticker: "NVDA", shares: 1.0152, priceAtAdd: 98.5, addedAt: on(5, 8) },
	{ ticker: "TSLA", shares: 0.4749, priceAtAdd: 210.59, addedAt: on(5, 20) },
	{ ticker: "AMD", shares: 0.6756, priceAtAdd: 148.02, addedAt: on(6, 2) },
	{ ticker: "AAPL", shares: 0.4622, priceAtAdd: 216.37, addedAt: on(6, 24) },
	{ ticker: "JPM", shares: 0.4932, priceAtAdd: 202.75, addedAt: on(7, 1) },
	{ ticker: "MSFT", shares: 0.2214, priceAtAdd: 451.75, addedAt: on(7, 8) },
];
/** The account day of the seed until 2026-11-09 (the frame's "Paper investor since July 2026", Profile 2:2476). */
export const FRAMES_CREATED_AT = on(7, 1);

/**
 * The persona of the frames, reconstructed so every derived number is the frames' own: a $10,000 paper budget, the
 * frames' $8,800.00 of cash, six listed $100 stakes (the portfolio rows), six more the frames count but never list
 * (the off-book holding, `unlisted`: live/ledger.ts), two closed ones (SHOP +12, COIN −8) and nineteen saves spread
 * over the six collections (5 · 3 · 3 · 2 · 4 · 2). At the demo quotes that is the frames' $10,240.00 and +$240.00.
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
	return {
		...emptyLocal(),
		// before its first trade (SHOP, bought April 28): "Paper investor since April 2026" once the showcase is over
		// (N23s; the untouched showcase keeps the frame's "July 2026": store.ts useLive, FRAMES_CREATED_AT)
		createdAt: on(4, 27),
		displayName: "Hamza",
		saves: saves.map(([ticker, savedAt, priceAtSave]) => ({ ticker, savedAt, priceAtSave })),
		passed: [],
		// the frames' cash: $10,000 budget − the listed and the unlisted stakes − the two closed ones + their proceeds
		cash: GUEST_SEED_CASH,
		unlisted: true,
		unlistedCut: 0,
		touched: false,
		seedRev: SEED_REV,
		positions: SEED_PICKS.map(seedPick),
		// each closed pick with the day it was bought (a month before its sale), so the ledger's history knows its $100
		// was still cash before then: a year ago the persona's ledger is exactly its $10,000 budget
		sold: [
			{ ticker: "SHOP", shares: 1.5731, stake: 100, proceeds: 112, pnl: 12, soldAt: on(5, 30), addedAt: on(4, 28) },
			{ ticker: "COIN", shares: 0.4209, stake: 100, proceeds: 92, pnl: -8, soldAt: on(6, 15), addedAt: on(5, 14) },
		],
		// Figma 2:2728: the two newest rows are unread (blue dot), the order, the recap and the deck row are read
		read: ["seed-order", "seed-recap", "seed-deck"],
		preferences: { familiarity: "buy", goal: "grow", interests: [], onboardingSwipes: ["apple", "nvidia", "tesla"] },
		tagScores: { semiconductor: 4, ai: 3, enterprise_software: 2, consumer_brand: 2, high_growth: 1, retail: 1, ecommerce: 1 }, // Tech Curious > High Growth > Consumer Brands, as the frames rank them
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

const validDeck = (v: unknown): boolean => {
	if (v === null) return true;
	if (!v || typeof v !== "object") return false;
	const d = v as Record<string, unknown>;
	return (
		typeof d.date === "string" &&
		typeof d.theme === "string" &&
		typeof d.index === "number" &&
		[d.order, d.saved, d.passed, d.bought].every((a) => Array.isArray(a) && a.every((x) => typeof x === "string"))
	);
};

/**
 * Merge a stored snapshot over the seed, keeping only the fields whose shape matches the seed's, so a
 * corrupt or hand-edited value in localStorage falls back to the seed instead of crashing every screen.
 */
export function sanitize<T extends object>(base: T, stored: unknown): T {
	if (!stored || typeof stored !== "object" || Array.isArray(stored)) return base;
	const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
	for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
		if (!(k in base)) continue;
		const b = (base as Record<string, unknown>)[k];
		if (k === "deck") {
			if (validDeck(v)) out[k] = v;
		} else if (Array.isArray(b)) {
			if (Array.isArray(v)) out[k] = v;
		} else if (b === null) {
			if (v === null || typeof v === "string") out[k] = v; // nullable scalars (lastBriefDate)
		} else if (typeof v === typeof b && (typeof v !== "number" || Number.isFinite(v))) {
			out[k] = v;
		}
	}
	return out as T;
}

function createStore<T extends object>(key: string, seed: () => T, migrate?: (stored: unknown) => unknown): Store<T> {
	let cache: T | null = null;
	/** the stored text `cache` was read from or written as (null: nothing stored), to tell a real change from an echo */
	let raw: string | null = null;
	const listeners = new Set<() => void>();
	const notify = () => {
		for (const l of listeners) l();
	};
	const load = (): T => {
		if (cache) return cache;
		try {
			raw = localStorage.getItem(key);
			if (raw) {
				const stored: unknown = JSON.parse(raw);
				cache = sanitize(seed(), migrate ? migrate(stored) : stored);
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
			raw = JSON.stringify(next);
			localStorage.setItem(key, raw);
		} catch {
			/* private mode etc. — the state still lives for this session */
		}
		notify();
	};
	/**
	 * Re-read what the browser stores when it may have changed behind this document's back: another document of this
	 * site wrote it (the `storage` event: another tab, or the document shown before this one came back from the
	 * back/forward cache), or this document was itself restored from that cache (`pageshow` with `persisted`) after a
	 * later document traded. Without this a restored document kept the state it had been shown with: Simulate read the
	 * showcase's $8,800 after a sale made on a pick page reached by a typed URL, and a buy placed on it wrote that stale
	 * state back, undoing the sale (review 2, 2026-11-08). An unchanged text changes nothing: every screen keeps its
	 * snapshot (no re-render).
	 */
	const refresh = () => {
		let stored: string | null;
		try {
			stored = localStorage.getItem(key);
		} catch {
			return;
		}
		if (stored === raw) return;
		cache = null; // the next read parses (migrates, sanitizes) the current text
		notify();
	};
	if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
		window.addEventListener("storage", (e) => {
			if (e.key === null || e.key === key) refresh();
		});
		window.addEventListener("pageshow", (e) => {
			if (e.persisted) refresh();
		});
	}
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

/** `migrate` (optional) rewrites what the browser stored before it is merged over the seed (first load only). */
export function storeFor<T extends object>(key: string, seed: () => T, migrate?: (stored: unknown) => unknown): Store<T> {
	let s = stores.get(key) as Store<T> | undefined;
	if (!s) {
		s = createStore(key, seed, migrate);
		stores.set(key, s as Store<unknown>);
	}
	return s;
}

/** v2 (2026-10-10): the seed follows the frames' read state; bumping the key re-seeds demo browsers */
export const GUEST_KEY = "stak.guest.v2";
export const localKey = (uid: string) => `stak.local.${uid}.v1`;

const isSeedSale = (stored: unknown, seed: SoldEntry) => {
	if (!stored || typeof stored !== "object") return false;
	const s = stored as Partial<SoldEntry>;
	return s.ticker === seed.ticker && s.soldAt === seed.soldAt && s.proceeds === seed.proceeds;
};

/**
 * Two carry-overs for a guest state an older build stored, each applied once (the next write stores its marker).
 *
 * 1. THE LEDGER ANCHOR (2026-11-07). A state stored before it has no `unlisted` field. When it grew from the persona
 * (its sold log still holds the seed's SHOP and COIN sales: sales are only ever added in front) it is the persona's
 * ledger on the old $9,404 seed: its cash moves by the same $604 the seed did (every buy and sale since stays in it),
 * it holds the off-book picks, and the seed's two closed picks take their purchase days. Any other stored state (a
 * hand-made one) keeps its cash and has no off-book picks.
 * Cash never goes below $0: a browser that spent more than $8,800 under the old seed holds less than the $604, so its
 * cash stops at $0 and the rest comes out of the unlisted picks (`unlistedCut`, live/ledger.ts personaOffBookLess):
 * its ledger then totals what every migrated ledger does (the old value + the unlisted picks' gain).
 *
 * 2. THE EXACT SEED (2026-11-09, N30.7). A state without `seedRev` grew from the four-decimal seed (LEGACY_PICKS).
 * It must not jump, untouched or touched, so:
 * - every stored pick that is still exactly a seed pick (never topped up, never part sold) becomes the exact seed's
 *   pick: worth the frame's dollars again (NVDA $123.96 -> $124.00, JPM $101.99 -> $102.00: the figures the showcase
 *   showed), for exactly $100.00. An untouched browser therefore stays the showcase, and its first sale credits what
 *   the sheet promises;
 * - every other position (bought, topped up or part sold by the visitor) and the cash stay as they are;
 * - THE TOTAL DOES NOT MOVE, to the cent: the persona's off-book holding is worth a cent less under the exact seed
 *   ($782.00, was $782.01, because the six listed picks are worth a cent more), so for each seed pick this ledger no
 *   longer holds as the seed had it, the cents that pick would have moved go into `unlistedCut` (a few cents, either
 *   way). A ledger that still holds all six: a cut of 0, the persona's own holding;
 * - the persona's account day moves with the seed (July 1 -> April 27, 2026: before its first pick, N23s).
 * A state that is not the persona's (`unlisted` false) only takes the marker.
 *
 * 3. A PICK THAT HOLDS NOTHING GOES (review of 2026-11-09, follow-up F8), on every load, with no marker (there is
 * nothing to carry over twice). Until the minimum order of that day (orders.ts) $0.01 of COST bought "0.0000 shares" at
 * four decimals: a stored position with shares 0, which no sale can close ("nothing-held") and nothing removed, so the
 * pick stayed on the Portfolio for ever. A stored position whose shares are not a number above zero holds nothing: it is
 * dropped, and no total moves (it was worth $0.00; the cent it cost was spent then). Dust that IS above zero (0.00000004
 * shares) stays: a closing sale ends it.
 */
export function migrateGuest(stored: unknown): unknown {
	if (!stored || typeof stored !== "object" || Array.isArray(stored)) return stored;
	return dropEmptyPicks(exactSeed(ledgerAnchor(stored as Record<string, unknown>)));
}

/** Whether a stored position holds a share at all (anything else can be neither shown nor sold). */
const holdsShares = (p: unknown): boolean => !!p && typeof p === "object" && typeof (p as Partial<Position>).shares === "number" && (p as Position).shares > 0;

function dropEmptyPicks(s: Record<string, unknown>): Record<string, unknown> {
	if (!Array.isArray(s.positions) || (s.positions as unknown[]).every(holdsShares)) return s;
	return { ...s, positions: (s.positions as unknown[]).filter(holdsShares) };
}

function ledgerAnchor(s: Record<string, unknown>): Record<string, unknown> {
	if ("unlisted" in s) return s;
	const seedSales = seedGuest().sold;
	const persona = Array.isArray(s.sold) && seedSales.every((seed) => (s.sold as unknown[]).some((x) => isSeedSale(x, seed)));
	if (!persona) return { ...s, unlisted: false };
	const shift = LEGACY_SEED_CASH - GUEST_SEED_CASH;
	const cash =
		typeof s.cash === "number" && Number.isFinite(s.cash)
			? { cash: Math.max(0, Math.round((s.cash - shift) * 100) / 100), unlistedCut: Math.max(0, Math.round((shift - s.cash) * 100) / 100) }
			: {};
	// the seed's closed picks gained their purchase days with the anchor
	const sold = (s.sold as unknown[]).map((x) => {
		const seed = seedSales.find((y) => isSeedSale(x, y));
		return seed && (x as Partial<SoldEntry>).addedAt === undefined ? { ...(x as SoldEntry), addedAt: seed.addedAt } : x;
	});
	return { ...s, ...cash, sold, unlisted: true };
}

const cents = (n: number) => Math.round(n * 100) / 100;
const isLegacyPick = (stored: unknown, legacy: Position) => {
	if (!stored || typeof stored !== "object") return false;
	const p = stored as Partial<Position>;
	return p.ticker === legacy.ticker && p.shares === legacy.shares && p.priceAtAdd === legacy.priceAtAdd && p.addedAt === legacy.addedAt && p.lots === undefined;
};

function exactSeed(s: Record<string, unknown>): Record<string, unknown> {
	if ("seedRev" in s) return s;
	if (s.unlisted !== true) return { ...s, seedRev: SEED_REV };
	const stored = Array.isArray(s.positions) ? (s.positions as unknown[]) : [];
	const worth = (p: Position) => cents(p.shares * DEMO_QUOTES[p.ticker]!.price);
	let cut = typeof s.unlistedCut === "number" && Number.isFinite(s.unlistedCut) ? s.unlistedCut : 0;
	const exact = SEED_PICKS.map(seedPick);
	const positions = [...stored];
	LEGACY_PICKS.forEach((legacy, i) => {
		const at = stored.findIndex((x) => isLegacyPick(x, legacy));
		if (at >= 0) positions[at] = exact[i]!;
		// a seed pick this ledger no longer holds as the seed had it: the off-book holding keeps the cents it would have moved
		else cut = cents(cut - (worth(exact[i]!) - worth(legacy)));
	});
	const createdAt = s.createdAt === FRAMES_CREATED_AT ? { createdAt: seedGuest().createdAt } : {};
	return { ...s, ...createdAt, positions, unlistedCut: cut, seedRev: SEED_REV };
}

export const guestStore = () => storeFor<GuestState>(GUEST_KEY, seedGuest, migrateGuest);
export const localStore = (uid: string) => storeFor<AccountLocal>(localKey(uid), emptyAccountLocal);

export function useStore<T extends object>(store: Store<T>): T {
	return useSyncExternalStore(store.subscribe, store.read, store.read);
}

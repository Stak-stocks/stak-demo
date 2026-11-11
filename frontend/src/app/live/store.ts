/**
 * One hook for everything a screen needs to be alive: who is here, what they saved, passed,
 * hold and sold, how far through today's deck they are, what they have read, how they answered
 * onboarding — and the actions that change it. Signed in, it is the account's Firestore document
 * (AccountContext) plus a per-uid local store; signed out, the guest persona in localStorage.
 * Screens never branch on the backend; they read `live` and call `live.actions`.
 */
import { xpToTier } from "@stak/shared/tierConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";
import { db } from "@/lib/firebase";
import { roundShares } from "@/lib/utils";
import { actionPoints, brandIdOfTicker, normalizeTicker, tagsOf, tickerOfBrandId } from "./catalog";
import { round2, round8 } from "./format";
import {
	type DeckProgress,
	FRAMES_CREATED_AT,
	type GuestState,
	type LocalState,
	type Lot,
	type Position,
	type Preferences,
	type SaveEntry,
	type SoldEntry,
	guestStore,
	localStore,
	seedGuest,
	useStore,
} from "./guest";
import { accountSale, averageCost, keptLots, lotsAfterSale, type OffBook, paperSale, paperShares, personaOffBookLess, positionLots, saleRecord } from "./ledger";
import { checkBuy, checkSell, OrderRefused } from "./orders";

/** Paper budget by XP tier — the same table AccountContext uses to initialise sandboxCash. */
const BUDGET_BY_TIER: Record<number, number> = { 1: 1000, 2: 3000, 3: 5000, 4: 10000, 5: 25000 };
/** The guest persona's budget (the empty Simulate frame says $10,000). */
const GUEST_BUDGET = 10000;


/** Guests learn taste locally the way the backend does for accounts: tag weights × action points. */
function bumpTags(scores: Record<string, number>, ticker: string, pts: number): Record<string, number> {
	const tags = tagsOf(ticker)?.learningTags ?? [];
	if (tags.length === 0 || pts === 0) return scores;
	const next = { ...scores };
	for (const t of tags) {
		const v = round2((next[t.tag] ?? 0) + t.weight * pts);
		// a lesson taken back leaves no trace: a tag the company alone had raised goes, it does not stay at 0
		if (v === 0 && pts < 0) delete next[t.tag];
		else next[t.tag] = v;
	}
	return next;
}

/**
 * TASTE IS SYMMETRIC AND IDEMPOTENT (coordinator rulings N27d, N29h; the hunt's ST-07). A company's lesson is a STATE,
 * not an event: `want` action points (a save's while it is saved, a pass's once it was passed, 0 after an Unsave). The
 * tag scores move by the difference from what the company has already taught (`taught`, guest.ts LocalState), which is
 * then remembered. So an Unsave takes back exactly what its Save taught, three Save / Unsave toggles leave the taste
 * where it was, and replaying today's deck teaches no pass a second time. A company the map does not know (the
 * persona's seeded saves, a state an older build stored) has taught nothing: unsaving it takes nothing back.
 */
export function teach(
	s: { tagScores: Record<string, number>; taught?: Record<string, number> },
	ticker: string,
	want: number,
): { tagScores: Record<string, number>; taught: Record<string, number> } {
	const taught = s.taught ?? {};
	const had = taught[ticker] ?? 0;
	if (had === want) return { tagScores: s.tagScores, taught };
	const next = { ...taught };
	if (want === 0) delete next[ticker];
	else next[ticker] = want;
	return { tagScores: bumpTags(s.tagScores, ticker, want - had), taught: next };
}

/** The untouched signed-out persona (showcase.ts isShowcase, for the store's own use: no trade, no save, no deck decision). */
let seedMark: string | null = null;
const markOf = (s: Pick<GuestState, "cash" | "positions" | "sold" | "saves">) =>
	[s.cash.toFixed(2), s.positions.map((p) => `${p.ticker}:${p.shares}`).join(","), s.sold.map((x) => `${x.ticker}:${x.proceeds}`).join(","), s.saves.map((x) => x.ticker).sort().join(",")].join("|");
function untouchedSeed(s: GuestState): boolean {
	if (s.touched) return false;
	if (s.deck && s.deck.saved.length + s.deck.passed.length + s.deck.bought.length > 0) return false;
	seedMark ??= markOf(seedGuest());
	return markOf(s) === seedMark;
}

export type LiveState = {
	/** false while Firebase auth / the account document are still loading */
	ready: boolean;
	signedIn: boolean;
	uid: string | null;
	/** the paper starting budget: $10,000 for the guest persona, the XP-tier budget for accounts */
	budget: number;
	displayName: string;
	createdAt: number | null;
	saves: SaveEntry[];
	savedTickers: Set<string>;
	passed: string[];
	cash: number;
	positions: Position[];
	sold: SoldEntry[];
	/**
	 * The frames' six unlisted picks, held as one amount by the guest persona's ledger (live/ledger.ts); null for
	 * accounts and any other guest. usePortfolio adds its value to the portfolio's (D5: one continuous ledger).
	 */
	offBook?: OffBook | null;
	/**
	 * The showcase has ended for good (D7 refined): set by the guest's first save, unsave, pass, buy or sale and kept
	 * across reversals (guest.ts `touched`); true for accounts. live/showcase.ts reads it before the seed comparison.
	 */
	touched?: boolean;
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
	/**
	 * Spend `dollars` of paper cash on `ticker` at `price`. An order of nothing is refused BEFORE anything is written
	 * (orders.ts checkBuy): it rejects with OrderRefused ("no-price" | "too-small" | "insufficient"; `refusalOf(error)`
	 * reads the reason, and the message is the same word).
	 */
	buy: (ticker: string, dollars: number, price: number) => Promise<Fill>;
	/**
	 * Sell `shares` of `ticker` at `price`; the proceeds return to cash and the sale is logged (ledger.ts saleRecord:
	 * pnl = proceeds - stake). A sale of nothing is refused before anything is written (orders.ts checkSell):
	 * OrderRefused "nothing-held" | "no-price" | "too-small". Closing a whole holding is always allowed, dust included.
	 */
	sell: (ticker: string, shares: number, price: number) => Promise<SoldEntry>;
	setDeck: (progress: DeckProgress | null | ((prev: DeckProgress | null) => DeckProgress | null)) => void;
	completeDeck: () => void;
	markRead: (ids: string[]) => void;
	dismiss: (id: string) => void;
	setLastBriefDate: (date: string) => void;
	setDisplayName: (name: string) => Promise<void>;
	setPreferences: (prefs: Partial<Preferences>) => Promise<void>;
	/**
	 * Wipe the guest persona back to the seed. Delete account is its only caller (src/routes/_app.profile.tsx, for a
	 * signed-out visitor): since N29b Log out erases nothing, as on the phones.
	 */
	resetGuest: () => void;
};

export type Live = LiveState & { actions: LiveActions };

/**
 * What a practice order actually did: the order's own shares and price (the Position fields), the exact dollars
 * charged, the cash left, and `holding`: the shares of that company held after the fill (the shares held before plus
 * this order), the figure both phones print in "You now hold" (android ui/discover/DiscoverScreen.kt:1556-1559).
 */
export type Fill = Position & { cost: number; cashAfter: number; holding: number };

/** One paper-budget initialisation per account per page load, however many useLive() instances mount. */
const sandboxInitRequested = new Set<string>();

// One pending trade per account survives route changes and prevents a reopened ticket from placing the order twice.
const pendingTrades = new Set<string>();
async function withTradeLock<T>(key: string, run: () => Promise<T>): Promise<T> {
	if (pendingTrades.has(key)) throw new Error("A trade is already being placed. Please wait.");
	pendingTrades.add(key);
	try { return await run(); } finally { pendingTrades.delete(key); }
}

/**
 * Whether this browser had a signed-in session the last time auth settled. Only then is it worth
 * holding the screens while Firebase restores it; a browser that never signed in shows the guest at once.
 */
const SESSION_FLAG = "stak.session.v1";
const hadSession = () => {
	try {
		return localStorage.getItem(SESSION_FLAG) === "1";
	} catch {
		return false;
	}
};
const rememberSession = (signedIn: boolean) => {
	try {
		if (signedIn) localStorage.setItem(SESSION_FLAG, "1");
		else localStorage.removeItem(SESSION_FLAG);
	} catch {
		/* storage unavailable: the gate simply never holds */
	}
};

/** A ceiling on the wait for Firebase: after 3 s the guest shows rather than a skeleton forever. */
const grace = { over: false, started: false, listeners: new Set<() => void>() };
function useAuthGraceOver(): boolean {
	return useSyncExternalStore(
		(listener) => {
			grace.listeners.add(listener);
			if (!grace.started) {
				grace.started = true;
				setTimeout(() => {
					grace.over = true;
					for (const l of grace.listeners) l();
				}, 3000);
			}
			return () => grace.listeners.delete(listener);
		},
		() => grace.over,
		() => true,
	);
}

/**
 * Accounts learn taste the way the guest does (`teach`: the difference from what the company already taught, which this
 * browser remembers per account, guest.ts localStore `taught`); the scores land on the user document the mobile apps read.
 */
function learnTaste(uid: string | null, scores: Record<string, number> | undefined, ticker: string, want: number) {
	if (!uid) return;
	const local = localStore(uid);
	const before = { tagScores: scores ?? {}, taught: local.read().taught ?? {} };
	const next = teach(before, ticker, want);
	if (next.taught === before.taught) return; // nothing new to teach, nothing to take back
	local.update({ taught: next.taught });
	updateDoc(doc(db, "users", uid), { tagScores: next.tagScores }).catch(() => {});
}

export function useLive(): Live {
	const { user, loading: authLoading } = useAuth();
	const acct = useAccount();
	const account = acct.account;
	const guest = useStore(guestStore());
	const uid = user?.uid ?? null;
	const local = useStore(localStore(uid ?? "guest"));
	const signedIn = !!user;
	const sandboxCash = account?.sandboxCash;
	const sessionExpected = useMemo(hadSession, []);
	const graceOver = useAuthGraceOver();
	const guestReady = !authLoading || !sessionExpected || graceOver;

	useEffect(() => {
		if (!authLoading) rememberSession(signedIn);
	}, [authLoading, signedIn]);

	// A signed-in account starts with the paper budget of its tier (the context does this lazily).
	useEffect(() => {
		if (!signedIn || !uid || !account || sandboxCash !== undefined || sandboxInitRequested.has(uid)) return;
		sandboxInitRequested.add(uid);
		acct.initSandboxCash().catch(() => sandboxInitRequested.delete(uid));
	}, [signedIn, uid, account, sandboxCash, acct.initSandboxCash]);

	const state = useMemo<LiveState>(() => {
		if (!signedIn) {
			return {
				ready: guestReady,
				signedIn: false,
				uid: null,
				budget: GUEST_BUDGET,
				displayName: guest.displayName,
				// the untouched showcase is the design itself: its account month is the frame's ("Paper investor since July
				// 2026", Profile 2:2476); the persona's own day (April 27, before its first pick: N23s) shows from the first action
				createdAt: guest.unlisted && untouchedSeed(guest) ? FRAMES_CREATED_AT : guest.createdAt,
				saves: guest.saves,
				savedTickers: new Set(guest.saves.map((s) => s.ticker)),
				passed: guest.passed,
				cash: guest.cash,
				positions: guest.positions,
				sold: guest.sold,
				offBook: guest.unlisted ? personaOffBookLess(guest.unlistedCut) : null,
				touched: guest.touched,
				deck: guest.deck,
				completedDecks: guest.completedDecks,
				read: guest.read,
				dismissed: guest.dismissed,
				lastBriefDate: guest.lastBriefDate,
				preferences: guest.preferences,
				tagScores: guest.tagScores,
			};
		}
		const created = user?.metadata?.creationTime ? Date.parse(user.metadata.creationTime) : Number.NaN;
		// a save the mobile app recorded without a timestamp is at least as old as the account, never "56 years ago"
		const fallbackSavedAt = Number.isNaN(created) ? Date.now() : created;
		const ids = account?.stakBrandIds ?? [];
		const saves: SaveEntry[] = ids.map((id) => {
			const e = account?.stakSavedAt?.[id];
			return { ticker: tickerOfBrandId(id), savedAt: e?.savedAt ?? fallbackSavedAt, priceAtSave: e?.priceAtSave ?? null };
		});
		// the account's own ledger holds one quantity, one average cost and the first buy's day per company; the buys this
		// browser saw are kept beside its sold log (guest.ts AccountLocal.lots, follow-up F9) and handed to the position
		// while they are still its own (ledger.ts keptLots), so every reader walks them through positionLots as a guest's
		const positions: Position[] = Object.entries(account?.sandboxPortfolio ?? {}).map(([ticker, p]) => {
			const T = normalizeTicker(ticker);
			const lots = keptLots(local.lots?.[T], p.addedAt);
			return { ticker: T, shares: p.shares, priceAtAdd: p.priceAtAdd, addedAt: p.addedAt, ...(lots ? { lots } : {}) };
		});
		return {
			ready: !authLoading && !acct.accountLoading,
			signedIn: true,
			uid,
			budget: BUDGET_BY_TIER[xpToTier(account?.totalXp ?? 0)] ?? 1000,
			displayName: (account?.displayName || user?.displayName || "").trim(),
			createdAt: Number.isNaN(created) ? null : created,
			saves,
			savedTickers: new Set(saves.map((s) => s.ticker)),
			passed: (account?.passedBrands ?? []).map((e) => tickerOfBrandId(e.id)),
			cash: sandboxCash ?? BUDGET_BY_TIER[xpToTier(account?.totalXp ?? 0)] ?? 1000,
			positions,
			sold: local.sold,
			offBook: null,
			touched: true,
			deck: local.deck,
			completedDecks: local.completedDecks,
			read: local.read,
			dismissed: local.dismissed,
			lastBriefDate: account?.lastBriefDate ?? local.lastBriefDate,
			preferences: (account?.preferences ?? {}) as Preferences,
			tagScores: account?.tagScores ?? {},
		};
	}, [signedIn, guest, account, local, uid, user, authLoading, guestReady, acct.accountLoading, sandboxCash]);

	const actions = useMemo<LiveActions>(() => {
		const updateLocal = (patch: (s: LocalState) => Partial<LocalState>) => {
			if (signedIn && uid) localStore(uid).update(patch);
			else guestStore().update((s) => patch(s));
		};
		const handlers: LiveActions = {
			save: async (ticker, priceAtSave = null) => {
				const T = normalizeTicker(ticker);
				if (!signedIn) {
					guestStore().update((s) => {
						const had = s.saves.some((x) => x.ticker === T);
						return {
							touched: true, // the first action ends the showcase for good (D7 refined)
							saves: had ? s.saves : [...s.saves, { ticker: T, savedAt: Date.now(), priceAtSave }],
							passed: s.passed.filter((p) => p !== T),
							...(had ? {} : teach(s, T, actionPoints("save"))),
						};
					});
					return;
				}
				const id = brandIdOfTicker(T);
				const fresh = !(account?.stakBrandIds ?? []).includes(id);
				await acct.saveToStak(id, priceAtSave);
				if (fresh) learnTaste(uid, account?.tagScores, T, actionPoints("save"));
				const passed = account?.passedBrands ?? [];
				if (passed.some((e) => e.id === id)) await acct.updatePassedBrands(passed.filter((e) => e.id !== id));
			},
			unsave: async (ticker) => {
				const T = normalizeTicker(ticker);
				if (!signedIn) {
					guestStore().update((s) => {
						const had = s.saves.some((x) => x.ticker === T);
						return {
							touched: true,
							saves: s.saves.filter((x) => x.ticker !== T),
							// ONE UNSAVE RULE (N27e, ST-09): the company's saved mark in today's deck goes too, whoever unsaves it
							// (the article's Unsave left the deck counting the card)
							deck: unsaveInDeck(s.deck, T),
							// the Unsave takes back what its Save taught (N27d); a pass made before stays what the company teaches
							...(had ? teach(s, T, s.passed.includes(T) ? actionPoints("pass") : 0) : {}),
						};
					});
					return;
				}
				const id = brandIdOfTicker(T);
				const had = (account?.stakBrandIds ?? []).includes(id);
				await acct.updateStak((account?.stakBrandIds ?? []).filter((x) => x !== id));
				if (uid) localStore(uid).update((s) => ({ deck: unsaveInDeck(s.deck, T) }));
				if (had) learnTaste(uid, account?.tagScores, T, (account?.passedBrands ?? []).some((e) => e.id === id) ? actionPoints("pass") : 0);
			},
			pass: async (ticker) => {
				const T = normalizeTicker(ticker);
				if (!signedIn) {
					guestStore().update((s) => {
						const was = s.passed.includes(T);
						return {
							touched: true,
							passed: was ? s.passed : [...s.passed, T],
							// a company teaches its pass once: a card passed again (today's deck replayed) changes nothing, and a
							// saved company keeps teaching its save (N27d, N29h)
							...(was || s.saves.some((x) => x.ticker === T) ? {} : teach(s, T, actionPoints("pass"))),
						};
					});
					return;
				}
				const id = brandIdOfTicker(T);
				const passed = account?.passedBrands ?? [];
				const existing = passed.find((e) => e.id === id);
				await acct.updatePassedBrands([...passed.filter((e) => e.id !== id), { id, at: Date.now(), count: (existing?.count ?? 0) + 1 }]);
				// once per company, and never over a save's lesson (the guest's rule above)
				if (!existing && !(account?.stakBrandIds ?? []).includes(id)) learnTaste(uid, account?.tagScores, T, actionPoints("pass"));
			},
			buy: async (ticker, dollars, price) => {
				const T = normalizeTicker(ticker);
				const amount = round2(dollars);
				const now = Date.now();
				if (!signedIn) {
					// AN ORDER OF NOTHING IS REFUSED (N27a; ST-01, ST-13), against the ledger as it is stored now and before
					// anything is written: no price, under the minimum (a dollar; more for a share dear enough that a dollar
					// of it would show "0.0000 shares"), or more than the cash
					const check = checkBuy(dollars, guestStore().read().cash, price);
					if (!check.ok) throw new OrderRefused(check.reason);
					// eight decimals of a share (shown at four), so the shares are worth what was paid for them (N20d: at four,
					// $100 of COST bought $99.99 of shares and a sale at the same price lost the cent)
					const shares = paperShares(amount, price);
					// every buy is a lot (N27c): the order's own shares, price and time, which the inbox and the value history read
					const lot: Lot = { shares, price, at: now, bought: shares };
					let holding = shares;
					let cashAfter = 0;
					guestStore().update((s) => {
						const existing = s.positions.find((p) => p.ticker === T);
						holding = existing ? round8(existing.shares + shares) : shares;
						cashAfter = round2(s.cash - amount);
						// a top-up keeps the first buy's date and averages the cost (unrounded: shares x the average is the dollars
						// paid, to the cent); its lots remember each buy
						const positions = existing
							? s.positions.map((p) =>
									p.ticker === T ? { ...p, shares: holding, priceAtAdd: averageCost(p, shares, price), lots: [...positionLots(p, price), lot] } : p,
								)
							: [...s.positions, { ticker: T, shares, priceAtAdd: price, addedAt: now, lots: [lot] }];
						// A bought company is in My STAK (D5), as the phones' buy() puts it there ("View in My STAK" lands on a
						// page that lists it): saved now, at the price it was bought, when it was not saved yet. One write
						// with the order, so no screen ever sees the position without the save (android
						// ui/simulate/PaperPortfolio.kt:318-322, ios Simulate/PaperPortfolio.swift:258-262).
						const saved = s.saves.some((x) => x.ticker === T);
						const save = saved
							? {}
							: {
									saves: [...s.saves, { ticker: T, savedAt: now, priceAtSave: price }],
									passed: s.passed.filter((p) => p !== T),
									...teach(s, T, actionPoints("save")),
								};
						return { touched: true, positions, cash: cashAfter, ...save };
					});
					return { ticker: T, shares, priceAtAdd: price, addedAt: now, cost: amount, cashAfter, holding };
				}
				// the same rule for an account, against its own cash...
				const check = checkBuy(dollars, state.cash, price);
				if (!check.ok) throw new OrderRefused(check.reason);
				// ...and its own 3-dp quantities: quantise first, then charge exactly what that quantity costs
				const qty = roundShares(amount / price);
				const cost = round2(qty * price);
				if (!(qty > 0)) throw new OrderRefused("too-small");
				if (cost > state.cash + 0.005) throw new OrderRefused("insufficient");
				const before = account?.sandboxPortfolio?.[T]?.shares ?? 0;
				await acct.addToSandbox(T, price, qty);
				// the account context declines silently when the live balance is short: read the position back before saying "filled"
				if (uid) {
					const snap = await getDoc(doc(db, "users", uid));
					const after = (snap.data() as { sandboxPortfolio?: Record<string, { shares?: number }> } | undefined)?.sandboxPortfolio?.[T]?.shares ?? 0;
					if (!(after > before + 1e-9)) throw new OrderRefused("insufficient");
				}
				// every order is a lot here too (follow-up F9): this browser keeps the order's own shares, price and time
				// beside the account's sold log, after what the position already was (its kept lots, or the one lot the
				// account's own figures make of it), so the inbox row of this order never changes and a top-up raises its own.
				// Nothing else in what an account order does: the account's ledger is written above, as before.
				if (uid) {
					const held = state.positions.find((p) => p.ticker === T);
					const lot: Lot = { shares: qty, price, at: now, bought: qty };
					localStore(uid).update((s) => ({ lots: { ...(s.lots ?? {}), [T]: [...(held ? positionLots(held, price) : []), lot] } }));
				}
				// a bought company is in My STAK (D5, the phones' buy()): saved when it was not; the order stands either way,
				// and the receipt does not wait for the save's server round trip (Firestore applies it locally at once)
				if (!(account?.stakBrandIds ?? []).includes(brandIdOfTicker(T))) handlers.save(T, price).catch(() => {});
				return { ticker: T, shares: qty, priceAtAdd: price, addedAt: now, cost, cashAfter: round2(state.cash - cost), holding: roundShares(before + qty) };
			},
			sell: async (ticker, shares, price) => {
				const T = normalizeTicker(ticker);
				if (!signedIn) {
					// A SALE OF NOTHING IS REFUSED (N27a; ST-05), against the ledger as it is stored now and before anything is
					// written: nothing held, no price, or a part that would file "0.0000 shares" or "$0.00". Closing the whole
					// holding is always allowed, dust included.
					const pos = guestStore().read().positions.find((p) => p.ticker === T);
					const check = checkSell(shares, pos?.shares ?? 0, price);
					if (!pos || !check.ok) throw new OrderRefused(check.ok ? "nothing-held" : check.reason);
					// the guest ledger's sale (ledger.ts paperSale, N20d): a request for the whole holding as the sheets show it
					// (four decimals) sells every share, and the cash returned is what the position's worth drops by, so a full
					// sale at the buy price returns exactly what was paid and partial sales add up to the same cent
					const sale = paperSale(pos.shares, shares, price);
					// the record is its own arithmetic (N29d: pnl = proceeds - the stake sold) and says what happened (N27c)
					const entry = saleRecord(pos, sale, price, Date.now());
					guestStore().update((s) => ({
						touched: true,
						positions:
							sale.remaining > 0
								? s.positions.map((p) => (p.ticker === T ? { ...p, shares: sale.remaining, lots: lotsAfterSale(p, sale.remaining, price) } : p))
								: s.positions.filter((p) => p.ticker !== T),
						cash: round2(s.cash + sale.proceeds),
						sold: [entry, ...s.sold],
					}));
					return entry;
				}
				const pos = state.positions.find((p) => p.ticker === T);
				// the same rule for an account, against its own quantities
				const check = checkSell(shares, pos?.shares ?? 0, price);
				if (!pos || !check.ok) throw new OrderRefused(check.ok ? "nothing-held" : check.reason);
				// the account's sale in its own quantities (ledger.ts accountSale: the one sum, which the sell sheet previews):
				// EXACTLY WHAT THE DOCUMENT DROPS (N41b): the holding less the document's own three-decimal remainder, so the
				// document keeps the record's `remaining`, credits the record's proceeds, and a sale at the price paid books
				// $0.00. A remainder under the document's three decimals is no share: the document drops the position and the
				// record below is a closing one, the lots kept here ending with it (follow-up SW5). A sale the document would
				// not shrink (its remainder is the whole holding) sells nothing and is refused here, before anything is
				// written; until N41b it credited its proceeds and the holding stayed, so it could be repeated without end.
				// So does a PART sale worth less than a cent (N44c: accountSale's none sale, as checkSell refuses a guest's;
				// 0.0015 of 0.021 AMC at $4.85 dropped 0.001 for $0.00), refused here as "too-small"
				const sale = accountSale(pos.shares, shares, price);
				if (!(sale.shares > 0)) throw new OrderRefused("too-small");
				const entry = saleRecord(pos, sale, price, Date.now());
				await acct.sellFromSandbox(T, sale.proceeds, price, sale.shares);
				// the sale is logged, and the lots this browser keeps for the position follow it as a guest's do: every lot
				// sold in proportion, each order's own quantity kept; a closing sale ends them (its record keeps the buys)
				if (uid)
					localStore(uid).update((s) => {
						const lots = { ...(s.lots ?? {}) };
						if (sale.remaining > 0) lots[T] = lotsAfterSale(pos, sale.remaining, price);
						else delete lots[T];
						return { sold: [entry, ...s.sold], lots };
					});
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
		return {
			...handlers,
			buy: (ticker, dollars, price) => withTradeLock(uid ?? "guest", () => handlers.buy(ticker, dollars, price)),
			sell: (ticker, shares, price) => withTradeLock(uid ?? "guest", () => handlers.sell(ticker, shares, price)),
		};
	}, [signedIn, uid, account, acct, state.cash, state.positions]);

	return useMemo(() => ({ ...state, actions }), [state, actions]);
}

/** A deck progress without `ticker` among its saves (the same object when it was not there). */
function unsaveInDeck(deck: DeckProgress | null, ticker: string): DeckProgress | null {
	return deck && deck.saved.includes(ticker) ? { ...deck, saved: deck.saved.filter((x) => x !== ticker) } : deck;
}

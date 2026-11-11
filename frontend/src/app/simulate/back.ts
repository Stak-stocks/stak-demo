/**
 * Where the Simulate pages' Back goes (coordinator decision D2, 2026-11-07: "Back returns to where the person came from:
 * history back when the previous entry is one of the app's pages; otherwise the page's natural parent"), as both phones
 * wire these screens:
 * - the Portfolio and the Leaderboard pop back to the page below them (android navigation/StakNavHost.kt:599 and 657,
 *   `onBack = { navController.popBackStack() }`): Simulate home when opened from it, the Profile hub or the inbox when
 *   opened from there; with no page of the app before them (a new tab, a pasted link) they go to Simulate home;
 * - a pick's Back lands on the Portfolio (B17, StakNavHost.kt:619-631: "both Back buttons land on the Portfolio, Instant -
 *   even from Simulate home. If the Portfolio is not below, replace the pick with it so its own Back still returns" to
 *   where the pick was opened from): a step back when the Portfolio is the page below, else the Portfolio in the pick's
 *   place.
 * An entry that is a sheet over a page (`?modal=`, e.g. a receipt the Portfolio was opened from) is not a page to return
 * to: Back then goes to the natural parent instead of reopening the sheet. Nor is an entry outside the app's own pages
 * (the landing page, Sign in / Sign up and the recovery pages, onboarding, the splash, a 404: D2 says "one of the app's
 * pages"): a Portfolio opened right after /login steps back to Simulate home, not to the login page. Every way back is
 * Instant (the prototype's Back edges carry no transition; the browser's own Back / Forward are instant too,
 * src/main.tsx).
 * The sell receipt's two ways out (receiptExit) leave the pick and its receipt behind as the phones do, so the browser's
 * Back never reopens a receipt either.
 */
import { type NavigateOptions, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * The pick page a receipt's View portfolio left right below the Portfolio (receiptExit's replace), carried on the
 * Portfolio's own history entry so that its Back steps over it (popBackOver).
 */
declare module "@tanstack/history" {
	interface HistoryState {
		simOver?: string;
	}
}

type NavigationEntryLike = { url: string | null; index: number };
type NavigationLike = { currentEntry: NavigationEntryLike | null; entries: () => NavigationEntryLike[] };

const navigationApi = (): NavigationLike | undefined =>
	typeof window === "undefined" ? undefined : (window as unknown as { navigation?: NavigationLike }).navigation;

const trimSlash = (path: string) => path.replace(/\/$/, "") || "/";

/**
 * The app's own pages (the shell's routes). Everything else on this origin (the landing page "/", /welcome, /login,
 * /signup, /forgot-password, /check-email, /reset-password, /onboarding, /splash, a 404) is not a page Back returns to.
 */
const APP_PAGES = ["/home", "/news", "/discover", "/my-stak", "/simulate", "/stocks", "/profile"] as const;
export function isAppPage(url: URL): boolean {
	const path = trimSlash(url.pathname);
	return APP_PAGES.some((page) => path === page || path.startsWith(`${page}/`));
}

/** A history entry Back may return to: one of the app's pages, not a sheet over one (`?modal=`). */
const isPageEntry = (url: URL) => isAppPage(url) && !url.searchParams.has("modal");

/**
 * The history entries before the current one on this site (same origin), the nearest first, as URLs; empty when there
 * is none (the first page of the visit, a browser without the Navigation API). The list stops at the first entry that
 * is not this site's (another site before it, or an entry whose URL the browser withholds).
 */
export function previousEntries(nav: NavigationLike | undefined = navigationApi(), origin: string = typeof window === "undefined" ? "" : window.location.origin): URL[] {
	const current = nav?.currentEntry;
	if (!nav || !current || typeof nav.entries !== "function" || current.index <= 0) return [];
	const byIndex = new Map(nav.entries().map((e) => [e.index, e] as const));
	const out: URL[] = [];
	for (let i = current.index - 1; i >= 0; i--) {
		const raw = byIndex.get(i)?.url;
		if (!raw) break;
		try {
			const url = new URL(raw);
			if (url.origin !== origin) break;
			out.push(url);
		} catch {
			break;
		}
	}
	return out;
}

/**
 * The history entry before the current one when it is one of this site's pages (same origin), as a URL; null when there
 * is none (the first page of the visit, another site before it, a browser without the Navigation API).
 */
export function previousEntry(nav: NavigationLike | undefined = navigationApi(), origin: string = typeof window === "undefined" ? "" : window.location.origin): URL | null {
	return previousEntries(nav, origin)[0] ?? null;
}

/**
 * What Back does: step back through the history (`steps` entries, one when absent), or go to a page (replacing the
 * current entry or not; `over`: the page left behind right below it, for that page's Back to step over; `below`: the
 * page takes the place of the entry BELOW the current one, a step back and then a replace, so that entry is gone).
 */
export type BackMove = { kind: "history"; steps?: number } | { kind: "page"; to: string; replace: boolean; over?: string; below?: boolean };

/**
 * The Back of a page whose phones' Back pops (the Portfolio, the Leaderboard): a step back to the app page before it,
 * else its natural parent. A sheet entry before it, or an entry outside the app's pages (/login, /welcome ...), is not
 * returned to. `over` (the Portfolio: the pick page a receipt's View portfolio left right below it, from the entry's
 * state) names entries that are stepped over first: the phones' popUpTo leaves no pick under the Portfolio, so Back
 * lands where that pick was opened from.
 */
export function popBackOver(entries: readonly URL[], parent: string, over?: string): BackMove {
	let skip = 0;
	if (over) while (skip < entries.length && trimSlash(entries[skip]!.pathname) === trimSlash(over)) skip++;
	const prev = entries[skip];
	return prev && isPageEntry(prev) ? { kind: "history", steps: skip + 1 } : { kind: "page", to: parent, replace: false };
}

/** popBackOver for a page with nothing to step over (the Leaderboard). */
export function popBack(prev: URL | null, parent: string): BackMove {
	const move = popBackOver(prev ? [prev] : [], parent);
	return move.kind === "history" ? { kind: "history" } : move;
}

/**
 * A pick's Back (B17): a step back when the page before is the Portfolio itself (not a sheet over it), else the
 * Portfolio in the pick's place, so the Portfolio's own Back still returns to where the pick was opened from.
 */
export function pickBack(prev: URL | null, portfolio = "/simulate/portfolio"): BackMove {
	return prev && trimSlash(prev.pathname) === trimSlash(portfolio) && !prev.searchParams.has("modal") ? { kind: "history" } : { kind: "page", to: portfolio, replace: true };
}

/**
 * The sell receipt's two ways out (2:1730 "View portfolio" / "Back to Simulate"; the phones' B19): the page leaves the
 * pick AND its receipt behind, as both phones do. Android pops to the Portfolio when it is below the pick and replaces
 * the pick with it otherwise (navigation/StakNavHost.kt:638-647: popBackStack, else navigate with popUpTo(SIM_PICK)
 * inclusive), and Back to Simulate pops the whole stack to the shell's Simulate tab (popToShell). Here: when `to` sits
 * below the pick in the history with only Simulate pages between (the pick's own entries and its sheets, the Portfolio,
 * the Leaderboard), the history steps back to it; otherwise `to` takes the receipt's own entry (replace: the pick page
 * the receipt was over stays below it, the receipt does not, and `over` names it so the Portfolio's Back steps over it,
 * popBackOver). Either way the browser's Back never reopens the receipt. A sheet over `to` (`?modal=`) is not stepped
 * back to.
 * A position sold IN FULL (`closed`) leaves no pick page to keep: its own entry right below the receipt would only send
 * the browser's Back on to the Portfolio again, a press that looked dead on the Portfolio (the hunt's I-07 / ST-22;
 * coordinator ruling N27m: "replace the closed pick's entry instead of leaving it to redirect"). `to` then takes the
 * place of THAT entry (`below`: a step back onto it, then the replace), as the phones' popUpTo(SIM_PICK) inclusive
 * leaves no pick under the Portfolio (android navigation/StakNavHost.kt:638-647), and the browser's Back leaves `to`
 * in one press. A part sale keeps the pick's page below (it is still a page to return to).
 * `entries`: the entries before the current one, the nearest first (previousEntries()); `pick` the pick page's path.
 */
export function receiptExit(entries: readonly URL[], pick: string, to: string, closed = false): BackMove {
	const target = trimSlash(to);
	const below = entries[0];
	const overPick: BackMove =
		closed && below && trimSlash(below.pathname) === trimSlash(pick) && !below.searchParams.has("modal")
			? { kind: "page", to, replace: true, below: true }
			: { kind: "page", to, replace: true, over: pick };
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i]!;
		const path = trimSlash(entry.pathname);
		if (path === target) return entry.searchParams.has("modal") ? overPick : { kind: "history", steps: i + 1 };
		// the pick's own entries and the other Simulate pages are what the phones' popUpTo / popToShell leave behind
		if (path !== trimSlash(pick) && !path.startsWith("/simulate/")) break;
	}
	return overPick;
}

// ── A receipt is shown once (review of 2026-11-09, follow-up S1) ───────────────────────────────────────────────────

/**
 * The sell receipt's history entries the app has already LEFT, by each entry's own key (the router gives every entry it
 * writes one and keeps it in the entry's state, `history.state.__TSR_key`, so it is the same after a reload).
 * A receipt's ways out step back through the history (receiptExit) and the browser's own Back leaves it too, so its entry
 * stays in the tab's forward list: Forward landed on "/simulate/picks/MSFT?modal=sell-success&portion=1" again and the
 * pick page drew "Position closed" a second time from the sale record, for a sale made minutes before (one dead press on
 * the stale pick entry, then the receipt: review r2). An entry listed here is never drawn as the receipt of a closed
 * pick again: the pick page puts the Portfolio in its place (PickDetail.tsx). Since N36.3b the list also holds a PART
 * sale's receipt (the pick page puts itself in its place) and Simulate home's buy receipt (?modal=add-success: Simulate
 * home puts itself in its place): replacesLeftReceipt.
 * A RELOAD on a receipt still shows it: the page was never left, and nothing is recorded when a document unloads. So
 * does its address opened in another tab (another entry, another key).
 * The list is the tab's (sessionStorage), so a reload of another page in between does not forget an entry; where that
 * storage cannot be used it lives in memory. It keeps the last RECEIPTS_KEPT keys: a tab's forward list is never longer.
 */
const RECEIPTS_LEFT = "stak.sim.receiptsLeft";
const RECEIPTS_KEPT = 40;

type KeyStore = Pick<Storage, "getItem" | "setItem">;

const tabStore = (): KeyStore | null => {
	try {
		return typeof window === "undefined" ? null : window.sessionStorage;
	} catch {
		return null;
	}
};

/** The list over a store (the tab's by default; a test hands its own): what the three functions below work on. */
export function receiptLedger(store: KeyStore | null = tabStore()) {
	let memory: string[] | null = null;
	const read = (): string[] => {
		if (memory) return memory;
		try {
			const stored: unknown = JSON.parse(store?.getItem(RECEIPTS_LEFT) ?? "[]");
			memory = Array.isArray(stored) ? stored.filter((k): k is string => typeof k === "string") : [];
		} catch {
			memory = [];
		}
		return memory;
	};
	const write = (keys: string[]) => {
		memory = keys.slice(-RECEIPTS_KEPT);
		try {
			store?.setItem(RECEIPTS_LEFT, JSON.stringify(memory));
		} catch {
			/* the list stays in memory */
		}
	};
	return {
		/** The app is leaving the receipt drawn on the entry `key` (a step through the history, or any other navigation). */
		left: (key: string | undefined) => {
			if (key && !read().includes(key)) write([...read(), key]);
		},
		/** The receipt of the entry `key` is on screen: it is not a left one (a remount in place; React's development double mount). */
		shown: (key: string | undefined) => {
			if (key && read().includes(key)) write(read().filter((k) => k !== key));
		},
		/** Whether the receipt of the entry `key` was on screen once and the app has left it since. */
		wasLeft: (key: string | undefined): boolean => !!key && read().includes(key),
	};
}

let receipts: ReturnType<typeof receiptLedger> | null = null;
/** The tab's own list (made on first use: no storage is touched while the module loads). */
export const tabReceipts = () => (receipts ??= receiptLedger());

/**
 * Whether the pick page draws "Position closed" from the sale record for a pick that is no longer held: yes for its
 * address as loaded (a reload on the receipt, a pasted link), no once the app has left that entry (`left`: a history
 * step brought the person back onto it: the Portfolio takes its place).
 */
export const drawsClosedReceipt = (o: { held: boolean; modal: string | undefined; sold: boolean; left: boolean }): boolean => !o.held && o.modal === "sell-success" && o.sold && !o.left;

/**
 * Whether a receipt entry the app has LEFT gives its place to the page under it (coordinator ruling N36.3b: "an entry the
 * app has left is never drawn again by the browser's Forward", follow-up S1 extended to the receipts that still have a
 * page to stand on). `receipt`: the entry's address draws such a receipt: a PART sale's "Order filled" over a pick that
 * is still held (the pick page), or the buy receipt over Simulate home (?modal=add-success). `left`: the tab's list says
 * the app has left that entry (tabReceipts; a receipt is listed when the app moves off it by any navigation, a reload
 * lists nothing). `leaving`: the receipt's own way out is under way on this very entry, and the receipt stays on screen
 * through it. Such an entry is REPLACED with the page itself (no sheet), at once: the SIMULATE polish round's open issues
 * 1 and 2, where Forward drew "Order filled · Sold 0.1689 shares ..." again over the pick (from its address alone, after
 * a minute, a preview of a sale that did not happen) and the buy receipt again after Keep exploring. As for the closed
 * pick (drawsClosedReceipt), the rule is the ENTRY's, whichever history step lands on it: the browser's Back onto a receipt
 * the app left by another way (a rail link, say) lands on the page too, for the same reason (its address alone would print
 * that preview); a receipt is shown once (S1). The receipt's own ways out and the pages' Back buttons are unchanged.
 */
export const replacesLeftReceipt = (o: { receipt: boolean; left: boolean; leaving?: boolean }): boolean => o.receipt && o.left && !o.leaving;

/** The pick page a receipt's exit is leaving through its own entry right now (useReceiptExit's `below` move). */
let leavingPick: string | null = null;

/**
 * True while a receipt's way out is stepping back onto the closed pick's own entry to put its target there
 * (receiptExit's `below`). The pick page reads it for the moment it is rendered on that entry: the receipt and the page
 * under it stay as they were, and the page does not send itself to the Portfolio, until the target has replaced it.
 */
export const isLeavingPick = (pick: string): boolean => leavingPick === pick;

const stepBack = (router: ReturnType<typeof useRouter>, move: { steps?: number }) => (move.steps && move.steps > 1 ? router.history.go(-move.steps) : router.history.back());

/** The Back action of a Simulate page: `decide` picks the move from the entry before this one (and all those before it). */
export function useSimulateBack(decide: (prev: URL | null, entries: readonly URL[]) => BackMove): () => void {
	const router = useRouter();
	return useCallback(() => {
		const entries = previousEntries();
		const move = decide(entries[0] ?? null, entries);
		if (move.kind === "history") stepBack(router, move);
		else void router.navigate({ to: move.to, replace: move.replace, viewTransition: false });
	}, [router, decide]);
}

/**
 * The receipt's way out of the pick page `pick` (receiptExit): `leave(to, viewTransition, closed)` steps back to `to` or
 * puts it in the receipt's place, with the prototype's transition for that edge (the sheet's withMotion carries it over
 * a history step too: src/main.tsx keeps a pop's motion while <html data-stak-motion> is set). `closed`: the sale ended
 * the position, so `to` takes the place of the pick's own entry when that is right below (receiptExit's `below`): the
 * history steps back onto it and the target replaces it as soon as the step has landed.
 */
export function useReceiptExit(pick: string): (to: string, viewTransition: NavigateOptions["viewTransition"], closed?: boolean) => void {
	const router = useRouter();
	return useCallback(
		(to: string, viewTransition: NavigateOptions["viewTransition"], closed = false) => {
			const move = receiptExit(previousEntries(), pick, to, closed);
			if (move.kind === "history") return stepBack(router, move);
			if (!move.below) return void router.navigate({ to: move.to, replace: true, viewTransition, state: (prev) => ({ ...prev, simOver: move.over }) });
			leavingPick = pick;
			// The step back is not the exit's transition: it is made Instant (src/main.tsx reads <html data-stak-motion> when
			// the step lands), and the motion the sheet chose for this exit is put back for the replace that follows, which
			// carries the prototype's transition. One transition, not two: a second one starting over the first left an
			// unhandled "Transition was skipped" rejection in the console.
			const root = document.documentElement;
			const motion = root.dataset.stakMotion;
			root.dataset.stakMotion = "instant";
			const restoreMotion = () => {
				if (motion) root.dataset.stakMotion = motion;
				else delete root.dataset.stakMotion;
			};
			let done = false;
			const release = () => {
				if (done) return;
				done = true;
				window.removeEventListener("popstate", landed);
				clearTimeout(timer);
				if (root.dataset.stakMotion === "instant") restoreMotion();
				if (leavingPick === pick) leavingPick = null;
			};
			// the step back has landed on the pick's own entry (the router has read it: its listener was added first)
			const landed = () => {
				window.removeEventListener("popstate", landed);
				clearTimeout(timer);
				restoreMotion();
				void router.navigate({ to: move.to, replace: true, viewTransition }).finally(release);
			};
			// no step came (nothing was below after all): hand the page back to itself
			const timer = setTimeout(release, 2000);
			window.addEventListener("popstate", landed);
			router.history.back();
		},
		[router, pick],
	);
}

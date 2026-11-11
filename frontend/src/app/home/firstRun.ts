import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

/**
 * Home's first run (2:532: the onboarding hand-off, Home without the "See Todays Pick" block) is a person's visit before
 * they have done anything, and it ends for good at their first hop, as on the phones:
 * - the phones keep a "first run pending" flag in their Session, set for a new account and persisted, so a relaunch in
 *   the middle of the first run keeps it and any relaunch after it lands on Home Main (android ui/Session.kt:57-66 and
 *   151-155, ios Session.swift:38-45 and 134-138);
 * - every hop from the first-run Home ends it: the pick, the Market Mood card (News), Why this matters (My STAK) and the
 *   deck banner (Discover) each call endFirstRun before they switch tabs, "so 1:958 Market Mood -> News -> Home must
 *   land on Main, never back on the scrim" (android navigation/StakNavHost.kt:916-930, ios MainTabsView.swift:183-195
 *   and 422-425); only the avatar's Profile push (1:1003, its BACK) and the bell's inbox return to it.
 * The web keeps the same flag per browser and account (`firstRunKey`), and ends it at the person's first hop to one of
 * the app's tab pages (News and its articles, Discover, a stock, My STAK, Simulate: `endsFirstRun`) made while first run
 * lasts, from Home or from a page Home opened that keeps it (the Profile pages, the phones' Profile push; the bell's
 * panel is part of Home). Leaving the app (a reload, a sign-in or onboarding page) keeps it, as a relaunch does. Only a
 * hop sets the flag, as only a hop calls the phones' endFirstRun; first run also needs a person who has done nothing
 * (`hasActed`: no save, holding, sale, pass, finished deck or decision today: the website's data, the audit's "let the
 * data decide"), so the demo persona never sees it. `?firstRun=1` (the capture switch) still draws 2:532 whatever the
 * flag says.
 */

/** The flag's localStorage key; the guest (signed out) has its own. */
export const FIRST_RUN_KEY = "stak.home.firstRunDone.v1";
export const firstRunKey = (uid: string | null): string => `${FIRST_RUN_KEY}.${uid ?? "guest"}`;

/** What the person has done so far (the live store's history and today's deck). */
export type Activity = {
	readonly saves: number;
	readonly positions: number;
	readonly sold: number;
	readonly passed: number;
	readonly completedDecks: number;
	readonly decidedToday: number;
};

/** Whether the person has acted at all: first run is only ever a visit before any of it. */
export const hasActed = (a: Activity): boolean => a.saves + a.positions + a.sold + a.passed + a.completedDecks + a.decidedToday > 0;

/** The app's tab pages (the rail's News, Discover, My STAK and Simulate, with their articles, stocks and sub-pages). */
const TAB_PAGES = /^\/(?:news|discover|stocks|my-stak|simulate)(?:\/|$)/;

/** A hop to this page ends first run (Home itself, the Profile pages and the pages outside the app do not). */
export const endsFirstRun = (pathname: string): boolean => TAB_PAGES.test(pathname);

/** The flags this tab could not store (private mode, storage full): it still remembers them while it is open. */
const unstored = new Set<string>();

export function isFirstRunDone(key: string): boolean {
	try {
		if (localStorage.getItem(key) === "1") return true;
	} catch {
		/* storage unavailable: the tab's own record below */
	}
	return unstored.has(key);
}

/** The phones' completeFirstRun (called at the first hop): a returning user from here on, on this browser, for this account. */
export function endFirstRun(key: string): void {
	if (watch?.key === key) unwatch();
	if (isFirstRunDone(key)) return;
	try {
		localStorage.setItem(key, "1");
	} catch {
		unstored.add(key);
	}
}

/** Where the person goes next: calls `onPath` with each navigation's pathname, returns the unsubscribe. */
export type NavigationSource = (onPath: (pathname: string) => void) => () => void;

/**
 * One watch at a time, kept at module level so it outlives Home: a hop made from a page Home opened that keeps first run
 * (the Profile pages) ends it too. It stops at the first hop that ends first run, or when another account's first run
 * takes over.
 */
let watch: { readonly key: string; readonly stop: () => void } | null = null;

function unwatch(): void {
	const w = watch;
	watch = null;
	w?.stop();
}

/** Ends the first run of `key` at the first navigation `endsFirstRun` accepts. */
export function watchFirstRunHops(source: NavigationSource, key: string): void {
	if (watch?.key === key) return;
	unwatch();
	const stop = source((pathname) => {
		if (endsFirstRun(pathname)) endFirstRun(key);
	});
	watch = { key, stop };
}

/** Whether a first-run watch is running (for the tests). */
export const watchingFirstRun = (): string | null => watch?.key ?? null;

/**
 * Whether Home draws its first run: the capture switch (`forced`), or a person who has not acted on this account and
 * whose first run has not ended on this browser; while it shows, the watch waits for the hop that ends it. The flag is
 * read when Home opens (per account), not while it shows: the hop that ends first run leaves Home at once, and Home must
 * not redraw its Main layout on the way out.
 */
export function useFirstRun({ forced, acted, ready, uid }: { forced: boolean; acted: boolean; ready: boolean; uid: string | null }): boolean {
	const key = firstRunKey(uid);
	const done = useMemo(() => isFirstRunDone(key), [key]);
	const router = useRouter();
	const pending = ready && !acted && !done; // an account still loading has not told us what it did
	useEffect(() => {
		if (pending) watchFirstRunHops((onPath) => router.subscribe("onBeforeNavigate", (e) => onPath(e.toLocation.pathname)), key);
	}, [pending, key, router]);
	return forced || (!acted && !done);
}

import { useCanGoBack, useLocation, useRouter } from "@tanstack/react-router";
import type { MouseEvent } from "react";

/**
 * The article's Back arrow returns to where the person came from, as the phones' Back pops their own back stack
 * (android StakNavHost.kt:755-766 `onBack = navController.popBackStack()`, READ NEXT pushing a new article; iOS
 * MainTabsView.swift:294-305 `pop(.instant)`): the coordinator's decision D2 of 2026-11-07, which widens ruling (1) of
 * 2026-11-06 (written when only the listing opened articles):
 * - whenever the entry before this one is one of the app's own pages (useCanGoBack: the router numbers every entry it
 *   pushes, a direct landing is entry 0), Back steps back to it: the listing as the person left it (open or closed, its
 *   text), the previous article after Read next, Home's Market Mood card, a stock page, the notifications panel's page.
 *   No new entry; the browser's Back does the same. Its name says where it goes: "Back to News" when the listing opened
 *   the article (a card, the Mini story, the brief's Read › carry FROM_LISTING on the entry they push), "Back" otherwise;
 * - a direct landing (a new tab, a pasted link, a reload of the visit's first page) has nowhere to step back to: Back
 *   goes to /news with the listing's last search, what the listing held when the person last left it (kept for the
 *   tab's session; none: the plain listing), named "Back to News".
 * The phones' listing keeps its query in rememberSaveable / @State while an article is open (NewsScreen.kt lines 77-78,
 * NewsView.swift lines 37-40): the web keeps it in the listing's URL, so stepping back finds it there.
 */
declare module "@tanstack/history" {
	interface HistoryState {
		/** set on an article's entry the News listing pushed: the entry before it is the listing */
		newsFromListing?: boolean;
	}
}

/** The history state the listing's links give the article entry they push. */
export const FROM_LISTING = { newsFromListing: true } as const;

const KEY = "stak.news.search";
let last: string | undefined;
let known = false;

/** The listing reports its search as it changes: the text while open (empty too), `undefined` once closed. */
export function rememberListingSearch(q: string | undefined): void {
	last = q;
	known = true;
	try {
		if (q === undefined) window.sessionStorage.removeItem(KEY);
		else window.sessionStorage.setItem(KEY, q);
	} catch {
		// storage blocked (a private window, a sandbox): the page's own memory still holds it until a reload
	}
}

/** The listing's last search as `/news` search params: `{ q }` when it was open, `{}` (the plain listing) otherwise. */
export function listingSearch(): { q?: string } {
	if (!known) {
		try {
			const stored = window.sessionStorage.getItem(KEY);
			last = stored ?? undefined;
		} catch {
			last = undefined;
		}
		known = true;
	}
	return last === undefined ? {} : { q: last };
}

/** The Back arrow's names: to the listing (it opened the article, or a direct landing goes there), or back elsewhere. */
export const BACK_TO_NEWS = "Back to News";
export const BACK = "Back";

/**
 * The Back arrow's behaviour: `search` for its link (where a plain navigation, a direct landing or a new tab lands: the
 * listing with its last search), `onClick`, which steps back through the history instead whenever an app page came
 * before this article, and `label`, its accessible name. A click with a modifier (a new tab or window) keeps the link's
 * own behaviour.
 */
export function useBackToListing() {
	const router = useRouter();
	const canGoBack = useCanGoBack();
	const fromListing = useLocation({ select: (l) => l.state.newsFromListing === true });
	const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
		if (!canGoBack || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		router.history.back();
	};
	return { search: listingSearch(), onClick, label: backLabel(canGoBack, fromListing) };
}

/** "Back to News" when Back leads to the listing (the listing opened the article, or nothing came before it), else "Back". */
export const backLabel = (canGoBack: boolean, fromListing: boolean): string => (canGoBack && !fromListing ? BACK : BACK_TO_NEWS);

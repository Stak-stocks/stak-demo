import { isShellPath } from "@/app/paths";

/**
 * Where a collection page was opened from (coordinator decision D2: Back returns to where the person came from). The
 * overview's collection cards mark the entry they push, so the collection's Back knows the entry before it is the
 * overview, in every browser.
 */
declare module "@tanstack/history" {
	interface HistoryState {
		/** set on a collection's entry the My STAK overview pushed: the entry before it is the overview */
		mystakFromOverview?: boolean;
	}
}

/** The history state the overview's collection cards give the entry they push. */
export const FROM_OVERVIEW = { mystakFromOverview: true } as const;

/** What the collection page's Back does: step back through the history, or go to the overview (the link's own push). */
export type CollectionBack = {
	/** step back to the entry before (no new entry); false: go to the overview, the page's natural parent */
	step: boolean;
	/** Back leads to the overview (its name says so: "Back to My STAK"); false: to another app page ("Back") */
	toOverview: boolean;
};

const STOCK_PAGE = /^\/stocks(\/|$)/;
const OVERVIEW = /^\/my-stak\/?$/;

/**
 * The collection page's Back (D2). The phones pop their stack, and a collection is only ever pushed by the overview, so
 * its Back always lands on the overview (android navigation/StakNavHost.kt:496 pushes it, :554 `onBack = popBackStack`;
 * iOS MainTabsView.swift:335 `onBack: { pop(.instant) }`, "Back -> Overview", prototype 1:3333). `fromOverview`: this
 * entry carries the overview's mark (FROM_OVERVIEW);
 * `previous`: the path of the entry before this one when the browser lists it (src/app/stocks/origin.ts
 * previousAppPath: the Navigation API), else null.
 * - The overview pushed this entry: step back to it (its range tab and scroll as the person left them).
 * - Another of the app's pages is before it: step back there, except a stock page. The only way a stock page comes before
 *   a collection is the stock page's own Back with nothing to go back to (a stock opened in a new tab): it pushes its
 *   collection, so the stock is the page the person has just left by pressing Back. Stepping back to it would send the
 *   two pages back and forth for ever (review 1, D2 loop); Back goes on to the overview instead, as on the phones.
 * - Nothing before it (a new tab, a pasted link), another site, a standalone page (sign-in ...), or a browser that cannot
 *   tell (no Navigation API) and no mark: the overview, the natural parent. So no browser can loop.
 */
export function collectionBack(fromOverview: boolean, previous: string | null): CollectionBack {
	if (fromOverview) return { step: true, toOverview: true };
	if (previous === null || STOCK_PAGE.test(previous) || !isShellPath(previous)) return { step: false, toOverview: true };
	return { step: true, toOverview: OVERVIEW.test(previous) };
}

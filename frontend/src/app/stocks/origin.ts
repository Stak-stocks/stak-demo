import { useCanGoBack, useLocation, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { isAppPage } from "@/app/simulate/back";

/**
 * Where a page was opened from (coordinator decision D2, discover-stock #11): Back returns there by stepping back
 * through the history when the entry before this one is one of the app's own pages, and goes to the page's natural
 * parent only when there is none (a new tab, a pasted link, the first page of a visit). The phones pop their own back
 * stack the same way (android navigation/StakNavHost.kt:528-529, 570-571 `onBack = popBackStack`; a notification row
 * pushes the stock over the inbox so Back returns there, 710-718).
 *
 * The entry before this one is read from the browser's own history list (the Navigation API: this tab's same-origin
 * entries). "One of the app's pages" is the rule of src/app/simulate/back.ts (`isAppPage`: the shell's pages; the hunt's
 * I-04, coordinator ruling N27q): the landing page, Sign in / Sign up and the recovery pages, onboarding, the splash and
 * a 404 are on this origin too, and Back must not return to them (a stock page opened right after /welcome or /login
 * stepped back onto the marketing page or the sign-in form): it goes to the page's natural parent instead. Nor is a
 * sheet over a page (`?modal=`, a receipt) a page to return to. Where the browser has no Navigation API the router's own
 * history decides (TanStack's `useCanGoBack`: an earlier entry this router pushed), and the crumb keeps the page's natural
 * parent.
 */

/** An app section a page can be opened from: its name as the rail names it, and its own page. */
export type CrumbParent = { label: string; to: "/home" | "/news" | "/discover" | "/my-stak" | "/simulate" | "/profile" };

/** The app's sections a page can be opened from, by the first segment of their path. */
const SECTIONS: readonly (readonly [RegExp, CrumbParent])[] = [
	[/^\/home(\/|$)/, { label: "Home", to: "/home" }],
	[/^\/news(\/|$)/, { label: "News", to: "/news" }],
	[/^\/discover(\/|$)/, { label: "Discover", to: "/discover" }],
	[/^\/my-stak(\/|$)/, { label: "My STAK", to: "/my-stak" }],
	[/^\/simulate(\/|$)/, { label: "Simulate", to: "/simulate" }],
	[/^\/profile(\/|$)/, { label: "Profile", to: "/profile" }],
];

/** The section a path belongs to (its rail name and its own page), or null for any other page (a stock page, auth ...). */
export function sectionOf(pathname: string): CrumbParent | null {
	for (const [re, section] of SECTIONS) if (re.test(pathname)) return section;
	return null;
}

type NavigationEntryLike = { url: string | null; index: number };
type NavigationLike = { currentEntry: NavigationEntryLike | null; entries: () => NavigationEntryLike[] };

/**
 * The path of the history entry before the current one when that entry is one of the APP's pages (same origin, a shell
 * page by simulate/back.ts `isAppPage`, not a sheet over one), or null: no entry before, one from another site, the
 * landing page / Sign in / onboarding / a 404, or a browser without the Navigation API. `basepath` is the router's.
 */
export function previousAppPath(basepath = "/", nav: NavigationLike | undefined = navigationApi(), origin: string = currentOrigin()): string | null {
	try {
		const current = nav?.currentEntry;
		if (!nav || !current || typeof nav.entries !== "function" || current.index <= 0) return null;
		const prev = nav.entries().find((e) => e.index === current.index - 1);
		if (!prev?.url) return null;
		const url = new URL(prev.url);
		if (url.origin !== origin) return null;
		const base = basepath.replace(/\/$/, "");
		const path = base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) || "/" : url.pathname;
		// only a page of the app, and never a sheet over one, is a place Back returns to (D2)
		if (!isAppPage(new URL(path, url.origin)) || url.searchParams.has("modal")) return null;
		return path;
	} catch {
		return null;
	}
}

/** The browser lists its history (the Navigation API): the entry before a page can be read, so it alone decides. */
export const readsHistory = (nav: NavigationLike | undefined = navigationApi()): boolean => !!nav?.currentEntry && typeof nav.entries === "function";

function navigationApi(): NavigationLike | undefined {
	return typeof window === "undefined" ? undefined : (window as unknown as { navigation?: NavigationLike }).navigation;
}
function currentOrigin(): string {
	return typeof window === "undefined" ? "" : window.location.origin;
}

export type PageOrigin = {
	/** history back reaches one of the app's pages */
	canGoBack: boolean;
	/** the app section the entry before this one belongs to, when the browser can tell */
	section: CrumbParent | null;
};

/**
 * Where the page was opened from. Read once per page (per pathname): the entry before a page does not change while it
 * shows, and the stock page's own preview flags replace its entry rather than push one.
 */
export function usePageOrigin(): PageOrigin {
	const router = useRouter();
	const routerCanGoBack = useCanGoBack();
	const pathname = useLocation({ select: (l) => l.pathname });
	const basepath = router.options.basepath ?? "/";
	// read again only when the page's path changes (another stock on the same route): the entry before a page is fixed
	const path = useMemo(() => (pathname ? previousAppPath(basepath) : null), [basepath, pathname]);
	// where the browser lists its history the entry before decides alone: the router's own count would step back onto the
	// landing page or Sign in, which it pushed too (I-04); without the list (no Navigation API) the router's count stands
	const listed = useMemo(() => (pathname ? readsHistory() : false), [pathname]);
	return { canGoBack: listed ? path !== null : routerCanGoBack, section: path ? sectionOf(path) : null };
}

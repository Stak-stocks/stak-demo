import { useEffect, useSyncExternalStore } from "react";
import { COLLECTION_NAMES, catalogStatus, isKnownTicker, subscribeCatalog } from "./live/catalog";
import { isDesktopAppPath } from "./paths";

/** The marketing page keeps the title index.html ships; the app sets its own per screen. */
const BASE_TITLE = typeof document !== "undefined" ? document.title : "STAK";

/** The tab of a page the app cannot name: a path it does not know, its 404, a page it has not verified yet. */
export const APP_TITLE = "STAK";

/** What the root knows about a page beyond its path. */
export type TitleFacts = {
	/** the app's 404 is on screen: the router matched no route (src/routes/__root.tsx reads it from the matches) */
	notFound?: boolean;
	/** whether a symbol is one of the catalog's companies; the catalog's own answer when absent (false until it has loaded) */
	knownStock?: (symbol: string) => boolean;
};

/** A path segment as the person typed it; a malformed escape stays as written instead of throwing in the root's effect. */
function segment(raw: string): string {
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

/**
 * A screen's name from its path, or null where the path alone cannot name it (the tab then reads "STAK").
 *
 * The root never titles a page it has not verified (coordinator ruling N11c): a path with a name in it is only titled
 * by that name once the name is known to be real, so a 404 never wears a page's title, not even for the moment a lazy
 * route takes to load.
 * - /stocks/<symbol>: the symbol when the catalog lists it ("AAPL · STAK"); an unknown symbol is the app's 404, and so
 *   is every symbol until the catalog chunk has arrived (the page shows its loading frame meanwhile).
 * - /news/<id>: null. Which ids are stories is the article page's knowledge (src/app/news/articles.ts, its own chunk):
 *   the page sets "<headline> · News · STAK" itself once it shows a story, and an id no story has is the 404. It used to
 *   read "Article · News · STAK" until the page's own timer corrected it (about 140 ms on a cold load).
 * - /my-stak/<collection>: the collection's own name ("AI & Tech · My STAK"; the hunt's C-17, ruling N30.8n), "Collection"
 *   for a slug that names none (the page sends that one back to the overview).
 * - /simulate/picks/<symbol>: the symbol only when the catalog lists it, as a stock page; any other is sent on to the
 *   Portfolio (it read "NOSUCH · Simulate · STAK" for about 130 ms before the redirect: review r2's low 7).
 */
const TITLES: [RegExp, (m: RegExpMatchArray, facts: TitleFacts) => string | null][] = [
	[/^\/home\/?$/, () => "Home"],
	[/^\/news\/?$/, () => "News"],
	[/^\/news\/[^/]+$/, () => null],
	[/^\/discover\/end\/?$/, () => "Deck complete · Discover"],
	[/^\/discover\/?$/, () => "Discover"],
	[/^\/stocks\/([^/]+)$/, (m, facts) => knownSymbol(m[1]!, facts)],
	[/^\/my-stak\/?$/, () => "My STAK"],
	[/^\/my-stak\/([^/]+)$/, (m) => `${collectionName(segment(m[1]!))} · My STAK`],
	[/^\/simulate\/?$/, () => "Simulate"],
	[/^\/simulate\/portfolio\/?$/, () => "Portfolio · Simulate"],
	[/^\/simulate\/leaderboard\/?$/, () => "Leaderboard · Simulate"],
	[
		/^\/simulate\/picks\/([^/]+)$/,
		(m, facts) => {
			const symbol = knownSymbol(m[1]!, facts);
			return symbol ? `${symbol} · Simulate` : null;
		},
	],
	[/^\/profile\/?$/, () => "Profile"],
	[/^\/profile\/edit\/?$/, () => "Edit profile"],
	[/^\/profile\/taste-risk\/?$/, () => "Taste & risk"],
	[/^\/profile\/notifications\/?$/, () => "Notification settings"],
	[/^\/profile\/help\/?$/, () => "Help & support"],
	[/^\/login\/?$/, () => "Sign in"],
	[/^\/signup\/?$/, () => "Sign up"],
	[/^\/forgot-password\/?$/, () => "Forgot password"],
	[/^\/check-email\/?$/, () => "Check your email"],
	[/^\/reset-password\/?$/, () => "Set a new password"],
	[/^\/onboarding\/?$/, () => "Welcome"],
	[/^\/splash\/?$/, () => null],
];

/** A path's symbol, upper-cased, when the catalog lists it (false for every symbol until the catalog has loaded); else null. */
function knownSymbol(raw: string, facts: TitleFacts): string | null {
	const symbol = segment(raw).trim().toUpperCase();
	return (facts.knownStock ?? isKnownTicker)(symbol) ? symbol : null;
}

/** "AI & Tech" for /my-stak/ai-tech (the seven collections of src/app/live/catalog.ts), "Collection" for any other slug. */
function collectionName(slug: string): string {
	return Object.hasOwn(COLLECTION_NAMES, slug) ? COLLECTION_NAMES[slug as keyof typeof COLLECTION_NAMES] : "Collection";
}

/**
 * The document title of a path: "<screen> · STAK", "STAK" for the app's 404 and for a path of the app it cannot name,
 * null for the marketing page and for "/" (they keep the title index.html ships).
 */
export function titleFor(pathname: string, facts: TitleFacts = {}): string | null {
	// the 404 is the app's own page wherever it is drawn: inside the shell, standalone, or for a path outside the app
	// (/no-such-page used to keep the landing page's title)
	if (facts.notFound) return APP_TITLE;
	// "/" only sends the person on (src/routes/index.tsx: the landing page, or Home once signed in): it keeps the document's
	// title, so the tab does not read "STAK" for the moment between index.html's title and the landing page's (review r2)
	if (pathname === "/") return null;
	if (!isDesktopAppPath(pathname)) return null;
	for (const [re, name] of TITLES) {
		const m = pathname.match(re);
		if (!m) continue;
		const screen = name(m, facts);
		return screen ? `${screen} · ${APP_TITLE}` : APP_TITLE;
	}
	return APP_TITLE;
}

/**
 * Keeps document.title in step with the screen (the root route calls it). A page with a title of its own content (an
 * article's headline, an onboarding step) writes it after this has run: the title is rewritten here only when the path
 * or what the root knows about it changes (the 404, the catalog arriving for a stock page), never while such a page shows.
 */
export function useDocumentTitle(pathname: string, notFound = false) {
	// a stock page's symbol is verified against the catalog, which arrives after the first paint of a cold load: the
	// subscription renders the root again when it does (it never asks for the catalog: the landing page must not load it)
	useSyncExternalStore(subscribeCatalog, catalogStatus, catalogStatus);
	const title = titleFor(pathname, { notFound });
	useEffect(() => {
		document.title = title ?? BASE_TITLE;
	}, [title, pathname]);
}

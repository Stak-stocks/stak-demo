/**
 * A fresh visit starts at the top (coordinator ruling N5; the CORE review r2's low 4). src/main.tsx imports this module
 * FIRST, before anything that loads the router: the router reads its scroll record (sessionStorage, below) once, when its
 * own module is evaluated, and puts back every place saved for the entry it opens on, the window's and each scrolling
 * element's (the landing page scrolls its own `.landing-scroll`).
 *
 * Browsers restore a page's place on a reload and on a step through the history, never on a fresh navigation. Chrome
 * keeps an entry's state when its own address is entered again (measured: the same __TSR_key under navigation type
 * "navigate"), so the router found the place saved for that entry and went there, like a reload: /welcome wheeled to 900
 * and entered again came back at 900. For a document reached by a fresh navigation this forgets what was saved for its
 * first entry, every element's place with the window's, before the router reads it. A reload and a step back onto the
 * entry (also from another document) keep it.
 */

/** The router's scroll record in sessionStorage (@tanstack/router-core scroll-restoration `storageKey`). */
export const ROUTER_SCROLL_RECORD = "tsr-scroll-restoration-v1_3";

/** The navigation types of a fresh visit: an address entered (or entered again), a link from elsewhere, a prerender shown. */
const FRESH = new Set(["navigate", "prerender"]);

/**
 * The key the router files an entry's places under: its history state's `__TSR_key`, else its href (path, search and
 * hash), as the router's defaultGetScrollRestorationKey reads it.
 */
export function entryKeyOf(state: unknown, href: string): string {
	const key = state && typeof state === "object" ? (state as { __TSR_key?: unknown }).__TSR_key : undefined;
	return typeof key === "string" && key ? key : href;
}

/**
 * Removes the places saved for `key` from the router's record when `navigationType` is a fresh visit. Returns whether
 * anything was removed. Never throws (a blocked or full storage leaves the record as it is).
 */
export function forgetFreshEntry(navigationType: string | undefined, key: string, storage: Pick<Storage, "getItem" | "setItem"> | undefined): boolean {
	if (!navigationType || !FRESH.has(navigationType) || !key || !storage) return false;
	try {
		const raw = storage.getItem(ROUTER_SCROLL_RECORD);
		if (!raw) return false;
		const record: unknown = JSON.parse(raw);
		if (!record || typeof record !== "object" || !Object.hasOwn(record, key)) return false;
		delete (record as Record<string, unknown>)[key];
		storage.setItem(ROUTER_SCROLL_RECORD, JSON.stringify(record));
		return true;
	} catch {
		return false;
	}
}

if (typeof window !== "undefined") {
	let type: string | undefined;
	try {
		// "prerender" (a page loaded ahead and then shown) is fresh too; older type libraries do not list it
		type = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
	} catch {
		type = undefined;
	}
	let storage: Storage | undefined;
	try {
		storage = window.sessionStorage;
	} catch {
		storage = undefined;
	}
	const { pathname, search, hash } = window.location;
	forgetFreshEntry(type, entryKeyOf(window.history.state, `${pathname}${search}${hash}`), storage);
}

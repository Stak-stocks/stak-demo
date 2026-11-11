import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { normalizeTicker } from "@/app/live/catalog";

/**
 * THE ANALYST VIEW STAYS AS IT WAS LEFT WHEN THE PERSON COMES BACK (the every-stock interface review's low 4: the card was
 * left open above the News card at 390 x 844, a story card pressed, then browser Back: the card came back folded, because
 * its open state lived in the route's useState and the page unmounts on the way to the article). The phones keep it:
 * android ui/discover/StockDetailScreen.kt:121 `var analystOpen by rememberSaveable { mutableStateOf(false) }` (and the
 * Compare card's, :784), so a screen popped back to shows the card as it was.
 *
 * Here the state is kept PER HISTORY ENTRY (the router's `__TSR_key`, the key it files the entry's scroll place under) in
 * sessionStorage, and read in the page's FIRST render: the card is drawn as it was left before the router puts the window
 * back where it was (src/main.tsx scrollRestoration, the root's onRendered restore), so the window lands on the same
 * content (with the card folded, the News row stood 434 px higher than it was left at 390 x 844).
 * - A step back or forward onto the entry, and a reload, draw the card as it was left on that entry.
 * - Another company's page starts folded (a new entry): the fund card's links (N43a) open other stock pages on the same
 *   route, whose component stays mounted, so the state follows the company and the entry, not the component.
 * - The same page under a new key (a replace: the router gives a replaced entry a new key, src/routes/_app.stocks.$symbol.tsx
 *   `update` clears preview flags that way) keeps the card as it is.
 * - A fresh visit starts folded, as it starts at the top (src/app/freshEntry.ts): Chrome keeps an entry's state when its
 *   own address is entered again, so the record of the entry a fresh document opens on is forgotten when this module loads.
 *
 * COMPARE AND LEARN IS KEPT THE SAME WAY (the every-stock final review's low: Compare opened, a story card pressed, then
 * Back, and the table came back folded, while the phones keep it: android StockDetailScreen.kt:784 `rememberSaveable`).
 * Each disclosure has its own record (`ANALYST_OPEN_RECORD`, `COMPARE_OPEN_RECORD`) under the same entry keys, the same
 * rules (another company folded, a replace keeps it, a fresh visit forgets both) and the same first-render read, so the
 * router puts the window back onto the layout it was left on (below 1024 the open table stands above the CTA card).
 */

/** The sessionStorage record of the Analyst view: { [entry key]: open }. */
export const ANALYST_OPEN_RECORD = "stak-analyst-open-v1";
/** The sessionStorage record of Compare and learn: { [entry key]: open }. */
export const COMPARE_OPEN_RECORD = "stak-compare-open-v1";
/** The disclosures kept per history entry, by their records. */
const RECORDS = [ANALYST_OPEN_RECORD, COMPARE_OPEN_RECORD] as const;
export type OpenRecord = (typeof RECORDS)[number];
/** The entries remembered at most (the oldest go first): a tab's history is short, and the record must stay small. */
export const MAX_ENTRIES = 50;

type Store = Pick<Storage, "getItem" | "setItem">;

function storage(): Store | undefined {
	try {
		return typeof window === "undefined" ? undefined : window.sessionStorage;
	} catch {
		return undefined;
	}
}

function readRecord(store: Store | undefined, name: OpenRecord): Record<string, boolean> {
	if (!store) return {};
	try {
		const parsed: unknown = JSON.parse(store.getItem(name) ?? "{}");
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, boolean>) : {};
	} catch {
		return {};
	}
}

function writeRecord(store: Store | undefined, name: OpenRecord, record: Record<string, boolean>) {
	if (!store) return;
	try {
		store.setItem(name, JSON.stringify(record));
	} catch {
		// a blocked or full storage: the card simply is not remembered
	}
}

/** The open state a disclosure's record remembers for a history entry: true / false, or null where none is. */
export function recallOpen(name: OpenRecord, key: string, store: Store | undefined = storage()): boolean | null {
	if (!key) return null;
	const v = readRecord(store, name)[key];
	return typeof v === "boolean" ? v : null;
}

/** Remembers a disclosure's open state for a history entry (null forgets it); keeps the newest `MAX_ENTRIES`. */
export function rememberOpen(name: OpenRecord, key: string, open: boolean | null, store: Store | undefined = storage()) {
	if (!key || !store) return;
	const record = readRecord(store, name);
	if (open === null ? !(key in record) : record[key] === open) return;
	delete record[key];
	if (open !== null) record[key] = open;
	const keys = Object.keys(record);
	for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete record[old];
	writeRecord(store, name, record);
}

/** The Analyst view's open state remembered for a history entry: true / false, or null where none is. */
export const recallAnalystOpen = (key: string, store: Store | undefined = storage()): boolean | null => recallOpen(ANALYST_OPEN_RECORD, key, store);
/** Remembers the Analyst view's open state for a history entry (null forgets it). */
export const rememberAnalystOpen = (key: string, open: boolean | null, store: Store | undefined = storage()) => rememberOpen(ANALYST_OPEN_RECORD, key, open, store);
/** Compare and learn's open state remembered for a history entry: true / false, or null where none is. */
export const recallCompareOpen = (key: string, store: Store | undefined = storage()): boolean | null => recallOpen(COMPARE_OPEN_RECORD, key, store);
/** Remembers Compare and learn's open state for a history entry (null forgets it). */
export const rememberCompareOpen = (key: string, open: boolean | null, store: Store | undefined = storage()) => rememberOpen(COMPARE_OPEN_RECORD, key, open, store);

/** The key the router files a history entry under (its state's `__TSR_key`), or "" where it has none. */
export const entryKey = (state: unknown): string => {
	const key = state && typeof state === "object" ? (state as { __TSR_key?: unknown }).__TSR_key : undefined;
	return typeof key === "string" ? key : "";
};

/** A fresh visit (an address entered, a link from elsewhere, a prerender shown) forgets its first entry's cards (both). */
export function forgetOnFreshVisit(navigationType: string | undefined, state: unknown, store: Store | undefined = storage()): boolean {
	if (navigationType !== "navigate" && navigationType !== "prerender") return false;
	const key = entryKey(state);
	if (!key) return false;
	let forgot = false;
	for (const name of RECORDS) {
		if (recallOpen(name, key, store) === null) continue;
		rememberOpen(name, key, null, store);
		forgot = true;
	}
	return forgot;
}

if (typeof window !== "undefined") {
	let type: string | undefined;
	try {
		type = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
	} catch {
		type = undefined;
	}
	forgetOnFreshVisit(type, window.history.state);
}

/** The card's state on a page: the company and the history entry it belongs to. */
export type EntryOpen = { symbol: string; key: string; open: boolean | null };

/**
 * The state for the page now drawn (`symbol` under the entry `key`): another company restores its entry's record (none:
 * folded); another entry of the same company restores its record where it has one (a step through the history) and
 * otherwise keeps the card as it is (the same page under a replaced key). Returns `state` itself when nothing changes.
 */
export function nextEntryOpen(state: EntryOpen, symbol: string, key: string, recall: (key: string) => boolean | null = recallAnalystOpen): EntryOpen {
	if (state.symbol !== symbol) return { symbol, key, open: recall(key) };
	if (state.key !== key) return { symbol, key, open: recall(key) ?? state.open };
	return state;
}

/** The path of a company's page is the location now drawn (not one the router is still on its way to, or leaving for). */
const isPageOf = (pathname: string, symbol: string) => {
	let path = pathname;
	try {
		path = decodeURIComponent(pathname);
	} catch {
		// a malformed escape: compare as it is
	}
	return normalizeTicker(path.replace(/^\/stocks\//i, "").replace(/\/$/, "")) === symbol && /^\/stocks\//i.test(path);
};

/**
 * A disclosure's open state on the stock page `symbol` (null: never toggled on this entry), kept per history entry in
 * the record `name` (see the header), and its setter.
 */
function useEntryOpen(name: OpenRecord, symbol: string): [boolean | null, (open: boolean) => void] {
	const T = normalizeTicker(symbol);
	const key = useRouterState({ select: (s) => entryKey(s.location.state) });
	// while the router is on its way to another page (an article, another company), the page keeps its card as it is
	const here = useRouterState({ select: (s) => isPageOf(s.location.pathname, T) });
	const recall = (k: string) => recallOpen(name, k);
	const [state, setState] = useState<EntryOpen>(() => ({ symbol: T, key, open: here ? recall(key) : null }));
	let current = state;
	if (here) {
		const next = nextEntryOpen(state, T, key, recall);
		if (next !== state) {
			current = next;
			setState(next);
		}
	}
	useEffect(() => {
		if (here && current.symbol === T && current.key === key) rememberOpen(name, key, current.open);
	}, [name, here, T, key, current.symbol, current.key, current.open]);
	const set = useCallback((open: boolean) => setState((s) => ({ ...s, open })), []);
	return [current.symbol === T ? current.open : null, set];
}

/**
 * The Analyst view's open state of the stock page `symbol` (null: never toggled on this entry, the URL's ?open=1 preview
 * decides), kept per history entry (see the header), and its setter.
 */
export function useAnalystOpen(symbol: string): [boolean | null, (open: boolean) => void] {
	return useEntryOpen(ANALYST_OPEN_RECORD, symbol);
}

/**
 * Compare and learn's open state of the stock page `symbol` (folded where it was never opened on this entry), kept per
 * history entry like the Analyst view's, and its setter. The page's route holds it, so it also survives the reflow at
 * 1024 that rebuilds the rail cards.
 */
export function useCompareOpen(symbol: string): [boolean, (open: boolean) => void] {
	const [open, set] = useEntryOpen(COMPARE_OPEN_RECORD, symbol);
	return [open === true, set];
}

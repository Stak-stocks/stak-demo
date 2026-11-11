import { useRouter } from "@tanstack/react-router";
import { useLayoutEffect } from "react";

/**
 * Back puts the keyboard back where the person left a page, as it puts the page back (the CORE review r2's low 5, WCAG
 * 2.4.3; BUILD-PLAN N5 restores the place). Before: after an article's Back the News listing was back at 600 px with focus
 * on the document's body, so the first Tab went to the top of the page. Now the control that opened the page being left
 * (a story card, a row, a rail item) has focus again once its page is drawn, so the next Tab continues from it.
 *
 * How (the root runs useFocusReturn once):
 * - When a page pushes a new history entry, the control it came from is remembered for the entry being left: the control
 *   of the last click (a mouse click, or Enter / Space on a link or a button, which the browser turns into a click) or,
 *   after a key, the focused one. It is remembered by what finds it again on a page drawn anew: a link by its address
 *   (and which of the links to that address), any other control by its place in the page and its text. A control inside
 *   a panel that a button opens (aria-controls: the compact menu, the notifications panel) also remembers that button:
 *   when the panel is closed on the way back, the button gets the focus (never another link to the same address). A
 *   control inside another dialog (a sheet) is gone when the person comes back: the last control used outside it (the
 *   sheet's opener) is remembered instead.
 * - When a step back through the history (the browser's Back, the pages' own Back arrows, history.go(-n)) lands on an
 *   entry with a remembered control, that control is focused without scrolling (the router has put the place back) as
 *   soon as the router has drawn the entry and the control is there: at most WAIT_MS, never after the person's own key or
 *   press, and never when something else already has focus (a sheet that opened, a page that moved focus itself).
 * - The focus ring follows the browser's own rule for a focus moved by the page: shown after keys, not after a mouse
 *   click (measured in Chrome: a mouse-clicked card focused again reads :focus-visible false, a keyboard-opened one true).
 * Forward and a reload move no focus (no control on the page being returned to opened the page left). The memory is the
 * tab's document only: Back from another site restores the place (the router's record), the focus only from the
 * back/forward cache.
 */

/** How long a return waits for its page (a list may still be loading), as the root's scroll restore waits. */
export const WAIT_MS = 4000;
/** A click this recent named the control a navigation came from. */
const CLICK_MS = 1500;
/** The person's own input that ends a pending return: they are already doing something else. */
const TAKES_OVER = ["keydown", "pointerdown"] as const;

/** Controls that can open a page: links, buttons and what the pages make act like them. */
export const ACTIONABLE =
	'a[href], button, summary, input[type="button"], input[type="submit"], [role="link"], [role="button"], [role="tab"], [role="menuitem"], [role="option"], [tabindex]:not([tabindex="-1"])';

/** What finds a control again on its page drawn anew. */
export type OpenerMark = {
	/** its tag name */
	tag: string;
	/** a link's own address: the surest name a list item has */
	href: string | null;
	/** which of the page's links to that address (in document order, drawn ones only): a story listed twice */
	nth: number;
	/** its place in the page (tag:nth-child chain from <body>, the router's own selector form) */
	path: string;
	/** what it says (its aria-label, else its text), to make sure a control found again is the same one */
	label: string;
	/** the id of the panel it sat in, which `scopeOpener` opens (aria-controls) */
	scope?: string;
	/** the control that opens that panel: it takes the focus when the panel is closed on the way back */
	scopeOpener?: OpenerMark;
};

const one = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
/** A control's name as the page wrote it (no layout read). */
export const labelOf = (el: Element) => one(el.getAttribute("aria-label") || el.textContent);

/** The control's place: `body:nth-child(2) > div:nth-child(1) > ... > a:nth-child(3)`. */
export function pathOf(el: Element): string {
	const parts: string[] = [];
	let node: Element | null = el;
	while (node?.parentElement) {
		let index = 1;
		for (let s = node.previousElementSibling; s; s = s.previousElementSibling) index++;
		parts.unshift(`${node.localName}:nth-child(${index})`);
		node = node.parentElement;
	}
	return parts.join(" > ");
}

/** An attribute value inside double quotes in a selector. */
const quoted = (value: string) => `"${value.replace(/["\\]/g, "\\$&")}"`;

/** Drawn and reachable: laid out, not inside an inert region or a closed dialog. */
const drawn = (el: Element) => el.getClientRects().length > 0;
const reachable = (el: Element, isDrawn: (el: Element) => boolean) => el instanceof HTMLElement && !el.closest("[inert], dialog:not([open])") && isDrawn(el);

/** The panel a control sits in that another control opens (aria-controls), and that control; null when there is none. */
function scopeOf(el: Element, isDrawn: (el: Element) => boolean): { scope: Element; opener: Element } | null {
	for (let node = el.parentElement; node; node = node.parentElement) {
		if (!node.id) continue;
		const opener = [...document.querySelectorAll(`[aria-controls=${quoted(node.id)}]`)].find((e) => !node.contains(e) && reachable(e, isDrawn));
		if (opener) return { scope: node, opener };
	}
	return null;
}

/** The mark of a control, read on its page as it stands. */
export function markOf(el: Element, isDrawn: (el: Element) => boolean = drawn): OpenerMark {
	const href = el.localName === "a" ? el.getAttribute("href") : null;
	const nth = href === null ? 0 : Math.max(0, [...document.querySelectorAll(`a[href=${quoted(href)}]`)].filter((e) => reachable(e, isDrawn)).indexOf(el));
	const mark: OpenerMark = { tag: el.localName, href, nth, path: pathOf(el), label: labelOf(el) };
	const scoped = scopeOf(el, isDrawn);
	if (scoped) {
		mark.scope = scoped.scope.id;
		mark.scopeOpener = markOf(scoped.opener, isDrawn);
	}
	return mark;
}

/**
 * The control a mark names on the page as it stands now, or null. A link: the same of the links to its address when its
 * text agrees, else one with the same text, else the same of them (every link to an address goes to the same page).
 * Another control: the one at its place when it is the same kind and says the same, else one of that kind saying the
 * same, else the one of that kind at its place (the list changed: the control that took its place, as phones move focus
 * to the next row of a list).
 */
export function findOpener(mark: OpenerMark, isDrawn: (el: Element) => boolean = drawn): HTMLElement | null {
	const ok = (el: Element | null | undefined): el is HTMLElement => !!el && reachable(el, isDrawn);
	// its panel is closed (the menu, the notifications panel): the control that opens it
	if (mark.scope !== undefined) {
		const scope = document.getElementById(mark.scope);
		if (!scope || !reachable(scope, isDrawn)) return mark.scopeOpener ? findOpener(mark.scopeOpener, isDrawn) : null;
	}
	if (mark.href !== null) {
		const links = [...document.querySelectorAll(`a[href=${quoted(mark.href)}]`)].filter(ok);
		const same = links[mark.nth];
		if (same && labelOf(same) === mark.label) return same;
		return links.find((e) => labelOf(e) === mark.label) ?? same ?? links[0] ?? null;
	}
	let at: Element | null = null;
	try {
		at = mark.path ? document.querySelector(mark.path) : null;
	} catch {
		at = null;
	}
	const kind = (el: Element | null): el is HTMLElement => !!el && el.localName === mark.tag && el.matches(ACTIONABLE) && ok(el);
	if (kind(at) && labelOf(at) === mark.label) return at;
	const sameText = [...document.querySelectorAll(mark.tag)].find((e) => kind(e) && labelOf(e) === mark.label);
	if (sameText instanceof HTMLElement) return sameText;
	return kind(at) ? at : null;
}

/** Nothing on the page has focus (the body, or nothing at all). */
const nothingFocused = () => {
	const a = document.activeElement;
	return !a || a === document.body || a === document.documentElement;
};

type Entry = { key: string; index: number; path: string };
type HistoryLike = {
	location: { pathname: string; state: Record<string, unknown> };
	subscribe: (cb: (e: { location: { pathname: string; state: Record<string, unknown> }; action: { type: string } }) => void) => () => void;
};
type RouterLike = { history: HistoryLike; state: { status: string; resolvedLocation?: { state: Record<string, unknown> } } };

/** The remembered controls, by history entry key (the tab's document only). */
const openers = new Map<string, OpenerMark>();
/** The last click, the last key and the last control used outside a dialog. */
let lastClick: { el: Element; at: number } | null = null;
let lastKeyAt = -1;
let lastOutside: Element | null = null;

const entryOf = (location: HistoryLike["location"]): Entry => ({
	key: typeof location.state.__TSR_key === "string" ? location.state.__TSR_key : "",
	index: typeof location.state.__TSR_index === "number" ? location.state.__TSR_index : 0,
	path: location.pathname,
});

/** The control a navigation that starts now came from, or null. */
function openerNow(isDrawn: (el: Element) => boolean): Element | null {
	const now = performance.now();
	const clicked = lastClick && now - lastClick.at < CLICK_MS && lastClick.at >= lastKeyAt && lastClick.el.isConnected ? lastClick.el : null;
	const active = nothingFocused() ? null : document.activeElement;
	const el = (clicked ?? active)?.closest(ACTIONABLE) ?? null;
	if (!el) return null;
	const dialog = el.closest("dialog");
	// outside any dialog, or in one a control opens (the compact menu: markOf remembers that control with it)
	if (!dialog || scopeOf(el, isDrawn)) return el;
	// inside another dialog (a sheet): the last control used outside it, the sheet's opener
	return lastOutside?.isConnected ? lastOutside : null;
}

/**
 * Installs the focus return on a router (the root calls it once); returns the way to take it off. Exported for tests
 * (`isDrawn` stands in for the layout jsdom does not do).
 */
export function installFocusReturn(router: RouterLike, isDrawn: (el: Element) => boolean = drawn): () => void {
	// a press as well as a click: a card that tells a click from a long press opens its page on the pointer's release,
	// before the click event
	const onPress = (e: Event) => {
		const el = e.target instanceof Element ? e.target.closest(ACTIONABLE) : null;
		if (!el) return;
		lastClick = { el, at: performance.now() };
		if (!el.closest("dialog")) lastOutside = el;
	};
	const onKey = () => {
		lastKeyAt = performance.now();
	};
	const onFocus = (e: FocusEvent) => {
		if (e.target instanceof Element && e.target.matches(ACTIONABLE) && !e.target.closest("dialog")) lastOutside = e.target;
	};
	window.addEventListener("pointerdown", onPress, true);
	window.addEventListener("click", onPress, true);
	window.addEventListener("keydown", onKey, true);
	window.addEventListener("focusin", onFocus, true);

	let current = entryOf(router.history.location);
	let pending = () => {};
	const unsubscribe = router.history.subscribe(({ location, action }) => {
		const next = entryOf(location);
		const from = current;
		current = next;
		if (action.type === "PUSH") {
			pending();
			const el = openerNow(isDrawn);
			if (el && from.key) openers.set(from.key, markOf(el, isDrawn));
			return;
		}
		if (action.type === "REPLACE") {
			// the same page under a new key (a search change, a sheet swapped): it keeps what it remembered
			const kept = openers.get(from.key);
			if (kept && from.path === next.path && next.key) openers.set(next.key, kept);
			return;
		}
		pending();
		// a step through the history: back onto an entry left by a push, its control comes back; forward moves nothing
		const mark = next.index < from.index ? openers.get(next.key) : undefined;
		if (mark) pending = returnFocus(router, next.key, mark, isDrawn);
	});
	return () => {
		unsubscribe();
		pending();
		window.removeEventListener("pointerdown", onPress, true);
		window.removeEventListener("click", onPress, true);
		window.removeEventListener("keydown", onKey, true);
		window.removeEventListener("focusin", onFocus, true);
	};
}

/** Focuses a mark's control once the router has drawn `key` and the control is there; returns the way to call it off. */
function returnFocus(router: RouterLike, key: string, mark: OpenerMark, isDrawn: (el: Element) => boolean): () => void {
	const started = performance.now();
	let frame = 0;
	let done = false;
	const stop = () => {
		if (done) return;
		done = true;
		cancelAnimationFrame(frame);
		for (const type of TAKES_OVER) window.removeEventListener(type, stop, true);
	};
	const tick = () => {
		if (done) return;
		const { status, resolvedLocation } = router.state;
		if (status === "idle" && resolvedLocation?.state.__TSR_key === key) {
			// something else took focus (a sheet, the page itself): it stays there
			if (!nothingFocused()) return stop();
			const el = findOpener(mark, isDrawn);
			if (el) {
				el.focus({ preventScroll: true });
				if (document.activeElement === el) return stop();
			}
		}
		if (performance.now() - started > WAIT_MS) return stop();
		frame = requestAnimationFrame(tick);
	};
	for (const type of TAKES_OVER) window.addEventListener(type, stop, { capture: true, passive: true });
	frame = requestAnimationFrame(tick);
	return stop;
}

/** The root's hook: installs the focus return for the app's router. */
export function useFocusReturn() {
	const router = useRouter();
	useLayoutEffect(() => installFocusReturn(router as unknown as RouterLike), [router]);
}

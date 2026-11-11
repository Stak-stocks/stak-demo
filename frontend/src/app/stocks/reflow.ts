import { type RefCallback, type RefObject, useCallback, useLayoutEffect, useRef } from "react";

/**
 * What a person did on the stock pages survives the window crossing 1024 (SPEC R10; a tablet rotated 1180 x 820 <->
 * 820 x 1180 does it). The content column keeps its cards mounted across that reflow (keyed siblings of one parent),
 * but the rail's cards (CTA, Analyst view, Compare) move between the rail column and the content column, and React
 * can only rebuild an element in another parent: the control a keyboard user is on would be removed and focus would
 * fall to <body>. And the headlines row's sideways offset is clamped by the browser while the layout passes through a
 * one-frame state (the window's new media queries with the canvas's previous --stak-vw: measured 120 -> 25 at
 * 1100 -> 800 and -> 0 at 1100 -> 390). Neither changes a pixel of a page at rest.
 */

/** The controls a card can hold focus on, in the card's tree order (the same in both columns). */
const CONTROLS = "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";

/**
 * Focus a moved card held as React removed it: the card's name -> which of its controls, and whether it showed the
 * keyboard ring. Kept only until the end of the commit that removed it, which is the commit that rebuilds the card in
 * the other column; a card that simply leaves (a route change) drops it.
 */
const held = new Map<string, { index: number; ring: boolean }>();

/**
 * A card that the 1024 reflow rebuilds in the other column keeps the focus a person held in it. React runs a removed
 * component's layout-effect cleanup BEFORE it detaches the DOM (react-dom 19 commitDeletionEffectsOnFiber: the
 * subtree's cleanups, then removeChild), so the cleanup still sees the focused control; the rebuilt card's layout
 * effect runs in the same commit and focuses the same control in its new place, without scrolling (the content
 * column's controls keep focus in place the same way). `name` undefined: the card never moves, nothing is done.
 */
export function useReflowFocus<T extends HTMLElement>(name: string | undefined): RefObject<T | null> {
	const ref = useRef<T>(null);
	useLayoutEffect(() => {
		const card = ref.current;
		if (!name || !card) return;
		const was = held.get(name);
		if (was) {
			held.delete(name);
			const now = document.activeElement;
			// only into a page whose focus was lost with the old card (never over a control focused meanwhile)
			if (!now || now === document.body || now === document.documentElement) {
				const control = card.querySelectorAll<HTMLElement>(CONTROLS)[was.index];
				// focusVisible keeps the ring as it was (browsers without the option use their own rule: a script focus
				// after a key press shows it, after a pointer press not)
				control?.focus({ preventScroll: true, focusVisible: was.ring } as FocusOptions);
			}
		}
		return () => {
			const focused = document.activeElement;
			if (!(focused instanceof HTMLElement) || !card.contains(focused)) return;
			const index = Array.prototype.indexOf.call(card.querySelectorAll(CONTROLS), focused);
			if (index < 0) return;
			held.set(name, { index, ring: focused.matches(":focus-visible") });
			// the rebuilt card mounts in this same commit (synchronous): once it is over, nothing may take this focus
			queueMicrotask(() => held.delete(name));
		};
	}, [name]);
	return ref;
}

/** How long after the row's width changed a scroll is the browser's doing (a clamp, or the restore below), not a person's. */
const SETTLE_MS = 400;

/**
 * A sideways scroller (the headlines row) keeps the offset the person gave it through a reflow. While the layout
 * passes through the one-frame state the browser clamps the offset to that frame's narrower range; this puts the
 * person's offset back once the row has its new width (clamped only by the range the new layout really has). Scrolls
 * in the moments after a width change are the browser's clamps or this restore, so they never replace the kept offset.
 * Only the row's width counts: a height change (headlines arriving and wrapping anew) moves nothing sideways.
 * A callback ref (React 19: it returns its cleanup), so it follows the element it is attached to.
 */
export function useKeptScrollLeft<T extends HTMLElement>(): RefCallback<T> {
	return useCallback((row: T | null) => {
		if (!row || typeof ResizeObserver === "undefined") return;
		let kept = row.scrollLeft;
		let width = -1;
		let resizedAt = Number.NEGATIVE_INFINITY;
		const restore = () => {
			if (Math.abs(row.scrollLeft - kept) >= 1) row.scrollLeft = kept;
		};
		const onScroll = () => {
			if (performance.now() - resizedAt < SETTLE_MS) restore();
			else kept = row.scrollLeft;
		};
		const observer = new ResizeObserver((entries) => {
			const next = entries[entries.length - 1].contentRect.width;
			if (next === width) return;
			const first = width < 0;
			width = next;
			// the row's first measure is no reflow: a place given before or just after it (the router putting the row back on
			// a history step, by its data-scroll-restoration-id) is the row's own, not a browser clamp to undo (CORE polish,
			// 2026-11-10: the first measure armed the settle window and the router's restore to 300 was reverted to 0)
			if (first) {
				kept = row.scrollLeft;
				return;
			}
			resizedAt = performance.now();
			restore();
		});
		row.addEventListener("scroll", onScroll, { passive: true });
		observer.observe(row);
		return () => {
			row.removeEventListener("scroll", onScroll);
			observer.disconnect();
		};
	}, []);
}

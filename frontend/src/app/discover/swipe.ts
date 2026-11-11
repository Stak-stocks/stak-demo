import { type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type RefObject, useRef } from "react";

/**
 * A swipe on the deck's front card (discover-stock #15). The phones' deck moves on with a drag of the front card
 * (android ui/discover/DiscoverScreen.kt:502-538: a commit at 110 units of travel, or a fling; ios
 * Discover/DiscoverView.swift:463-488). On the website the deck's arrows are ‹ and › and its keys ← and →, so a finger
 * swipes the same way: to the left is Pass (›, the next card), to the right is Previous (‹). Only a finger (pointer type
 * "touch"): a mouse keeps the arrows, the keys and a click on the card, which opens its stock page. Vertical drags stay
 * the page's scrolling (the card is `touch-action: pan-y`).
 */
export type SwipeDecision = "pass" | "previous" | null;

/** The travel that commits a swipe, in CSS px (the phones' 110 units). */
export const SWIPE_COMMIT = 110;
/** A quicker flick commits with less travel: at least this far ... */
export const FLING_MIN = 40;
/** ... at this speed or faster (px per ms). */
export const FLING_SPEED = 0.6;
/** Movement under this is a tap, not a drag (the card's click opens its stock page). */
export const TAP_SLOP = 10;

/** What a finger's travel (dx, dy in px over dt ms) decides: a mostly sideways move past the commit distance or a fling. */
export function swipeDecision(dx: number, dy: number, dt: number): SwipeDecision {
	const ax = Math.abs(dx);
	if (ax < TAP_SLOP || ax < 1.5 * Math.abs(dy)) return null;
	const fling = ax >= FLING_MIN && dt > 0 && ax / dt >= FLING_SPEED;
	if (ax < SWIPE_COMMIT && !fling) return null;
	return dx < 0 ? "pass" : "previous";
}

type Handlers = {
	onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
	onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
	onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
	onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
	onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void;
};

/**
 * The handlers for the front card's box. While a finger drags sideways the card follows it (a direct manipulation, no
 * animation: it is back in place the moment the finger lifts, and the deck changes cards at once, as › changes them);
 * a committed swipe calls `onPass` / `onPrevious`, and the click a swipe would end with is swallowed so it does not open
 * the stock page.
 */
export function useCardSwipe(box: RefObject<HTMLElement | null>, onPass: () => void, onPrevious: () => void): Handlers {
	const start = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
	const dragged = useRef(false);
	const reset = () => {
		start.current = null;
		if (box.current) box.current.style.transform = "";
	};
	return {
		onPointerDown: (e) => {
			// every press starts afresh (a mouse click after a finger's drag is a click)
			dragged.current = false;
			if (e.pointerType !== "touch" || !e.isPrimary) return;
			start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
		},
		onPointerMove: (e) => {
			const s = start.current;
			if (!s || e.pointerId !== s.id) return;
			const dx = e.clientX - s.x;
			const dy = e.clientY - s.y;
			if (Math.abs(dx) >= TAP_SLOP && Math.abs(dx) >= 1.5 * Math.abs(dy)) {
				dragged.current = true;
				if (box.current) box.current.style.transform = `translateX(${dx}px)`;
			}
		},
		onPointerUp: (e) => {
			const s = start.current;
			if (!s || e.pointerId !== s.id) return;
			const decision = swipeDecision(e.clientX - s.x, e.clientY - s.y, e.timeStamp - s.t);
			reset();
			if (decision === "pass") onPass();
			else if (decision === "previous") onPrevious();
		},
		onPointerCancel: () => reset(),
		onClickCapture: (e) => {
			if (!dragged.current) return;
			dragged.current = false;
			e.preventDefault();
			e.stopPropagation();
		},
	};
}

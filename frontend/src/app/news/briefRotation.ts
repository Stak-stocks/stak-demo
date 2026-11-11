import { type FocusEvent, type MouseEvent, type PointerEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";

/**
 * The listing's rotating cards: the Today's brief (BriefCard, every 25 s) and, since the user's ruling of 2026-11-11
 * (N62), the Mini card's hot stories (MiniCard, every 30 s: src/app/news/hot.ts). Both share what follows: the hold
 * (useRotationHold), the cross-fade of their text (FADE, shown) and the pointer that already rests on a card as it
 * mounts (useRestingPointer). The brief's own clock, swipe and dots stay below.
 */

/** The Today's brief card shows the next brief every 25 seconds (the user's ruling of 2026-11-01). */
export const BRIEF_INTERVAL_MS = 25_000;

/**
 * The change of item on a rotating card: the app's 300 ms dissolve (styles.css stak-dissolve, ease-out) as a
 * cross-fade, the leaving item turning invisible once it has faded (so it leaves the accessibility tree); instant under
 * reduced motion. The items share one grid cell, as tall as the tallest, so the card never changes height as it turns.
 */
export const FADE = "transition-[opacity,visibility] duration-300 ease-[cubic-bezier(0,0,0.58,1)] motion-reduce:transition-none";
export const FADE_OPACITY = "transition-opacity duration-300 ease-[cubic-bezier(0,0,0.58,1)] motion-reduce:transition-none";
export const shown = (on: boolean) => (on ? "" : "invisible opacity-0");

/** The handlers a rotating card spreads on itself: hover and keyboard focus hold its rotation, leaving resumes it. */
export type RotationBind = {
	onPointerEnter: () => void;
	onPointerLeave: () => void;
	onFocus: (e: FocusEvent<HTMLElement>) => void;
	onBlur: (e: FocusEvent<HTMLElement>) => void;
};

export type BriefRotation = {
	/** the brief on show (0 at load: the frame's own Dow brief; the one the person left on a return, `start`) */
	index: number;
	/** true while the pointer rests on the card or a control inside it has keyboard focus: the rotation holds */
	paused: boolean;
	/** show brief `i` now (a dot) and give it a full interval before the next one */
	go: (i: number) => void;
	/** the card's handlers: hover and keyboard focus pause the rotation, leaving resumes it */
	bind: RotationBind;
};

/**
 * The hold of every rotating card (WCAG 2.2.2): `paused` while the pointer is over the card, or while the card or a
 * control inside it has keyboard focus, so nothing moves under a reader. A mouse click focuses a control without a focus
 * ring (:focus-visible false), so after a click the pointer alone decides; keyboard focus (a ring) holds until the focus
 * leaves the card.
 */
export function useRotationHold(): { paused: boolean; bind: RotationBind } {
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const bind = {
		onPointerEnter: useCallback(() => setHovered(true), []),
		onPointerLeave: useCallback(() => setHovered(false), []),
		onFocus: useCallback((e: FocusEvent<HTMLElement>) => {
			if (e.target instanceof Element && keyboardFocus(e.target)) setFocused(true);
		}, []),
		onBlur: useCallback((e: FocusEvent<HTMLElement>) => {
			const next = e.relatedTarget;
			if (!(next instanceof Node) || !e.currentTarget.contains(next)) setFocused(false);
		}, []),
	};
	return { paused: hovered || focused, bind };
}

/**
 * The carousel's clock (WCAG 2.2.2): one brief every `intervalMs`, the last wrapping to the first. It holds while the
 * pointer is over the card or a control inside it has keyboard focus (useRotationHold), and starts a fresh interval once
 * both have left, so nothing moves under a reader. After a mouse click on a dot the clock restarts once the pointer
 * leaves the card; keyboard focus holds it until the focus leaves the card.
 * `start` is the brief the card opens on (the one the person left when they step back to the listing:
 * src/app/news/briefMemory.ts); it is read once, as the card mounts, and anything that is not one of the card's briefs
 * is the first. The clock gives it a full interval, like a jump.
 */
export function useBriefRotation(count: number, intervalMs = BRIEF_INTERVAL_MS, start = 0): BriefRotation {
	const [index, setIndex] = useState(() => (Number.isInteger(start) && start >= 0 && start < count ? start : 0));
	const { paused, bind } = useRotationHold();
	// bumped by a jump, so the clock restarts even when the dot of the brief on show is pressed again
	const [epoch, setEpoch] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `index` and `epoch` restart the interval on purpose
	useEffect(() => {
		if (paused || count < 2) return;
		const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), intervalMs);
		return () => window.clearTimeout(t);
	}, [paused, count, intervalMs, index, epoch]);
	const go = useCallback(
		(i: number) => {
			setIndex(((i % count) + count) % count);
			setEpoch((n) => n + 1);
		},
		[count],
	);
	return { index, paused, go, bind };
}

/** A focus that shows its ring (the keyboard's); an engine that cannot tell is treated as one, so the rotation holds. */
function keyboardFocus(el: Element): boolean {
	try {
		return el.matches(":focus-visible");
	} catch {
		return true;
	}
}

/**
 * A pointer already resting on a rotating card as it mounts holds the rotation, as one that moves onto it does (the
 * coordinator's ruling of 2026-11-06, 21:05: read :hover on mount). A query that changes the hits remounts the card
 * under a still pointer, and React then reports no pointerenter: at its next frame Chrome moves :hover to the new card
 * and sends it a pointerover from the old card's parent but no pointerout, and React derives its enter events from the
 * pointerout. So the card reads :hover itself, as it mounts and again at its first frame; moving off it resumes the
 * rotation as usual. Only a pointer that can hover counts (any-hover): a finger leaves :hover behind after a tap
 * without resting anywhere.
 */
export function useRestingPointer(card: RefObject<HTMLElement | null>, onRest: () => void) {
	useEffect(() => {
		const el = card.current;
		if (!el || !pointerCanHover()) return;
		const read = () => {
			if (el.matches(":hover")) onRest();
		};
		read();
		const frame = window.requestAnimationFrame(read);
		return () => window.cancelAnimationFrame(frame);
	}, [card, onRest]);
}

/** A mouse, trackpad or pen that hovers; an engine that cannot tell is treated as having one. */
function pointerCanHover(): boolean {
	return typeof window.matchMedia !== "function" || window.matchMedia("(any-hover: hover)").matches;
}

/** How far a finger must travel sideways for a swipe (a tap that wobbles a few px is still a tap). */
export const SWIPE_MIN_PX = 40;

/**
 * The page a touch gesture turns: a mostly sideways move of SWIPE_MIN_PX or more. Finger left (dx < 0) shows the next
 * brief, finger right the previous one, the pager convention of both phones (android NewsDetailScreen.kt:136-144 "finger
 * LEFT -> NEXT story, finger RIGHT -> PREVIOUS", the brief's HorizontalPager NewsScreen.kt:254-268; iOS NewsView.swift
 * :180-200 `.scrollTargetBehavior(.paging)`). A move that is not clearly sideways (|dx| up to 1.2 x |dy|) is the
 * page's scroll, never a page turn.
 */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
	if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
	if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy) * 1.2) return 0;
	return dx < 0 ? 1 : -1;
}

/**
 * The brief a swipe lands on, or null at the ends: the phones' pagers stop at the first and the last page (android
 * NewsScreen.kt:257-266, a HorizontalPager with no wrap; iOS NewsView.swift:199 `.scrollTargetBehavior(.paging)`), so a
 * swipe past either end turns nothing. Only the 25 s clock wraps (useBriefRotation).
 */
export function swipeTarget(index: number, step: 1 | -1, count: number): number | null {
	const next = index + step;
	return Number.isInteger(next) && next >= 0 && next < count ? next : null;
}

export type BriefSwipe = {
	onPointerDown: (e: PointerEvent<HTMLElement>) => void;
	onPointerUp: (e: PointerEvent<HTMLElement>) => void;
	onPointerCancel: () => void;
	/** a swipe that ends on the card's stretched Read link is a page turn, not a click on the link */
	onClickCapture: (e: MouseEvent<HTMLElement>) => void;
};

/**
 * Touch paging for the brief (the audit's news #10, the coordinator's D9: "the brief pages on a touch swipe"): a finger
 * or a pen swiping across the card turns to the next or previous brief through `turn`, which restarts the 25 s clock
 * (useBriefRotation's go). A mouse keeps the dots, as the desktop frames draw it. The card carries
 * `touch-action: pan-y pinch-zoom`, so the page still scrolls under a vertical move (the browser then cancels the
 * pointer) and only a sideways move reaches here. A tap keeps opening the brief's article; the click a swipe may leave
 * behind on the card's link is swallowed.
 */
export function useBriefSwipe(turn: (step: 1 | -1) => void): BriefSwipe {
	const start = useRef<{ id: number; x: number; y: number } | null>(null);
	const swiped = useRef(0);
	const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
		if (e.pointerType === "mouse" || !e.isPrimary) return;
		start.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
		swiped.current = 0;
	}, []);
	const onPointerUp = useCallback(
		(e: PointerEvent<HTMLElement>) => {
			const s = start.current;
			start.current = null;
			if (!s || s.id !== e.pointerId) return;
			const step = swipeStep(e.clientX - s.x, e.clientY - s.y);
			if (step === 0) return;
			swiped.current = Date.now();
			turn(step);
		},
		[turn],
	);
	const onPointerCancel = useCallback(() => {
		start.current = null;
	}, []);
	const onClickCapture = useCallback((e: MouseEvent<HTMLElement>) => {
		// only the click that follows the swipe's own release (the browser sends it at once)
		if (!swiped.current || Date.now() - swiped.current > 600) return;
		swiped.current = 0;
		e.preventDefault();
		e.stopPropagation();
	}, []);
	return { onPointerDown, onPointerUp, onPointerCancel, onClickCapture };
}

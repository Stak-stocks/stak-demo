import { type KeyboardEvent, type MouseEvent, type PointerEvent, useEffect, useRef } from "react";

/** How long a press must hold: Compose's long-press timeout (android ViewConfiguration, 400-500 ms), SwiftUI's 0.5 s. */
export const HOLD_MS = 500;
/** How far a finger may drift before the press counts as a scroll instead (Android's touch slop is about 8 dp). */
export const SLOP = 10;
/** How long after a press ends its release's click is still expected (a touch's comes a little later, or never). */
export const CLICK_WINDOW_MS = 400;

/** The keys that ask a focused card for its named action (the phones' long-press accessibility action). */
export const isActionKey = (key: string) => key === "Delete" || key === "Backspace";

/**
 * A long press on a link-like control, as the phones' combinedClickable(onLongClick) / LongPressGesture: hold the primary
 * pointer (finger, pen or mouse button) still for HOLD_MS and `onLongPress` runs; the click that the release would send
 * afterwards is swallowed, so the control's own action (opening the stock) does not follow. The phones treat a mouse
 * button the same way (Compose's long-press timeout applies to every pointer), so a mouse click held past HOLD_MS is a
 * long press too.
 *
 * A drift past SLOP ends the press without it: for a finger that is a scroll (the browser takes the touch over and sends
 * no click); for a mouse or a pen it is a drag, so its release opens nothing either. The control's native link drag is
 * held back while the press is pending or has become ours: Chrome starts one about 5 px into a mouse press and cancels
 * the pointer, so a hand that drifts a few pixels while holding would otherwise lose the press (review 1). The cost: a
 * card cannot be dragged out as a link (a middle click or the keyboard opens it in a new tab).
 *
 * On touch screens the browser's own long-press menu (the link's context menu, iOS's link preview: see the card's
 * -webkit-touch-callout) is held back while the press is ours. The Delete key on the focused control is the same action
 * without a pointer (its description announces it). Spread the returned handlers on the element.
 */
export function useLongPress(onLongPress: () => void) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const start = useRef<{ x: number; y: number; id: number; touch: boolean } | null>(null);
	/** the press became a long press or a drag: the click its release sends must not act */
	const swallow = useRef(false);
	const forget = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latest = useRef(onLongPress);
	latest.current = onLongPress;
	const stop = () => {
		if (timer.current !== null) clearTimeout(timer.current);
		timer.current = null;
		start.current = null;
	};
	const settle = () => {
		if (forget.current !== null) clearTimeout(forget.current);
		forget.current = null;
	};
	// the press is over: the release's click comes right after (a touch's a little later, or never), so swallow that one only
	const ended = () => {
		stop();
		if (!swallow.current) return;
		settle();
		forget.current = setTimeout(() => {
			forget.current = null;
			swallow.current = false;
		}, CLICK_WINDOW_MS);
	};
	useEffect(
		() => () => {
			stop();
			settle();
		},
		[],
	);
	return {
		onPointerDown: (e: PointerEvent<HTMLElement>) => {
			if (e.button !== 0 || !e.isPrimary) return;
			stop();
			settle();
			swallow.current = false;
			start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === "touch" };
			// the press keeps its release on this control even when what it opens moves the page under a still mouse (a
			// touch is captured already), so the click it sends is the one swallowed below
			try {
				e.currentTarget.setPointerCapture?.(e.pointerId);
			} catch {
				/* a pointer the browser no longer knows: nothing to keep */
			}
			timer.current = setTimeout(() => {
				timer.current = null;
				start.current = null;
				swallow.current = true;
				latest.current();
			}, HOLD_MS);
		},
		onPointerMove: (e: PointerEvent<HTMLElement>) => {
			const s = start.current;
			if (!s || e.pointerId !== s.id || Math.hypot(e.clientX - s.x, e.clientY - s.y) <= SLOP) return;
			stop();
			// a mouse or a pen that moves on is dragging: its release opens nothing, as the native drag it replaces would
			if (!s.touch) swallow.current = true;
		},
		onPointerUp: ended,
		onPointerCancel: ended,
		onPointerLeave: ended,
		// a touch's compatibility mousedown arrives after the press: it must not pull focus back from the confirm row
		onMouseDown: (e: MouseEvent<HTMLElement>) => {
			if (swallow.current) e.preventDefault();
		},
		onClick: (e: MouseEvent<HTMLElement>) => {
			if (!swallow.current) return;
			swallow.current = false;
			settle();
			e.preventDefault();
			e.stopPropagation();
		},
		onContextMenu: (e: MouseEvent<HTMLElement>) => {
			// a touch's long press opens the browser's link menu at about the same moment: the press is ours
			if (timer.current !== null || swallow.current) e.preventDefault();
		},
		// the link's native drag would cancel the pointer a few pixels into the press (see above)
		onDragStart: (e: MouseEvent<HTMLElement>) => {
			if (timer.current !== null || swallow.current) e.preventDefault();
		},
		onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
			if (!isActionKey(e.key) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
			e.preventDefault();
			latest.current();
		},
	};
}

import {
	type FocusEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactElement,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import "./home/ink.css";

/**
 * The rail's labels (the user's ruling of 2026-11-06: "in the navigation section why is it when my mouse hover on the
 * icon nothing happens?", then "both, and the account row too"). Figma's sidebar sets (2:6692 / 2:7404, the account row
 * 2:7362 / 2:8070) hold no hover variant; the ruling overrides the match-Figma rule for the rail's interactive states
 * only. On the CLOSED rail (72: 1024+ with the navigation closed, and the tablet rail at 640-1023) each icon shows its
 * name in a small label beside it, and the open rail's icon-only Hide shows "Hide navigation" the same way:
 * - after the pointer RESTS on the control about 150 ms (a pointer passing over the rail flashes nothing; every move
 *   restarts the wait), at once on keyboard focus (:focus-visible after a key press: a focus that follows a pointer
 *   press, such as a phone's tap opening the menu, never shows one, whatever that browser's :focus-visible says);
 * - one label at a time, and keyboard focus wins over a resting pointer (the coordinator's ruling of 2026-11-06 20:00):
 *   while a control of the rail has keyboard focus, its label is the one shown; the pointer's shows when none has (the
 *   pointer still resting on a control when focus leaves the rail brings that control's label back);
 * - it stays while the pointer is on the control or on the label itself (WCAG 1.4.13 hoverable: an invisible bridge,
 *   the control's height, spans the gap from the control to the label, so the pointer can cross it), and goes when the
 *   pointer leaves both, on blur, on Escape (dismissible: it stays dismissed until the pointer leaves and comes back, or
 *   focus moves), and when the rail opens (the closed rail's texts go null) or its menu covers it;
 * - touch never shows one (pointerType "touch" is ignored for the pointer's label, and a tap is a pointer press);
 * - visual only: aria-hidden, each control already carries its accessible name.
 * The label is never inside the <aside> or RailPin (both clip): the Sidebar renders it beside its <aside>, inside the
 * zoomed canvas (so it scales with the rail at every regime), position fixed (the rail is pinned to the window, so the
 * label stays on its control while the page scrolls), z-40 over the page and the rail's own z-30. Nothing of it exists
 * at rest: it mounts only while shown.
 *
 * ONE STATE MACHINE, ONE OWNER AT A TIME (the final review of 2026-11-06). Two sides feed the one label: the POINTER
 * side (the labelled control the pointer is on, or that control's label once it has crossed onto it; rested or not,
 * dismissed or not) and the FOCUS side (the control with keyboard focus; dismissed or not). The label shown is the
 * focus side's control's (not dismissed), else the pointer side's (rested, not dismissed), else none; a control the
 * rail's current state gives no text shows none. Every entry and exit (the pointer entering or leaving a control, the
 * strip or the label, focus and blur, Escape, the rail opening or closing, a page change re-creating a control) changes
 * a side, then `settle` renders what the two sides now say, after one rule: THE POINTER IS ON A LABEL ONLY WHILE THAT
 * LABEL SHOWS AS ITS OWN. A label taken from under the pointer (keyboard focus took over with another control, Escape,
 * the rail's new state) leaves the pointer on neither its control nor its label: its side ends there, so nothing of it
 * can come back later with the pointer elsewhere, and its next arrival on the control is a new rest. The browser does
 * not report a pointer leaving an element that was removed from under it, so the rule cannot wait for an event; and a
 * pointer the browser reports over anything but the pointer side's control or label (an exit nothing reported: a
 * control that moved from under a still pointer) ends that side too.
 */
export const RAIL_LABEL_REST_MS = 150;
/** The label sits this far right of the rail's edge (layout px, scaled with the canvas). */
export const RAIL_LABEL_GAP = 8;
/** The label's 1px border (its padding box starts 1px in: the bridge is placed against it). */
const BORDER = 1;
/** Frames the placement keeps checking after the last movement (the rail's and the menu's 280 ms motions end inside). */
const SETTLE_FRAMES = 12;

/**
 * Whether the last input was the keyboard (a key press without Ctrl / Alt / Meta, which are shortcuts) rather than a
 * pointer press. A focus label needs both this and :focus-visible: browsers differ on :focus-visible for a focus a
 * script moves after a tap (iOS Safari does not focus a tapped button, so the menu's showModal() focusing Hide may count
 * as visible there); a pointer press always comes first, so a tap or a click never leaves a label behind.
 */
let keyboardInput = false;
if (typeof document !== "undefined") {
	document.addEventListener(
		"keydown",
		(e) => {
			if (!e.ctrlKey && !e.altKey && !e.metaKey) keyboardInput = true;
		},
		true,
	);
	document.addEventListener(
		"pointerdown",
		() => {
			keyboardInput = false;
		},
		true,
	);
}

/** One text per control id; null: that control shows no label in the rail's current state. */
export type RailLabelTexts = Readonly<Record<string, string | null | undefined>>;

export type RailLabelHandlers = {
	onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => void;
	onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
	onPointerLeave: (e: ReactPointerEvent<HTMLElement>) => void;
	onFocus: (e: FocusEvent<HTMLElement>) => void;
	onBlur: (e: FocusEvent<HTMLElement>) => void;
};

type Anchor = { id: string; el: HTMLElement };

/**
 * The pointer side: the control the pointer is on, or that control's label (or the strip to it) once it has crossed
 * onto it (`onLabel`). `rested`: it has rested on the control RAIL_LABEL_REST_MS, so its label may show; `dismissed`:
 * Escape, no label until the pointer has left the control and its label and comes back.
 */
type PointerSide = { anchor: Anchor; rested: boolean; dismissed: boolean; onLabel: boolean };
/** The focus side: the control with keyboard focus; `dismissed`: Escape, no label until focus moves on. */
type FocusSide = { anchor: Anchor; dismissed: boolean };

/** What the render shows from: the pointer side's control once rested (not dismissed), the focus side's (not dismissed). */
type View = { pointer: Anchor | null; focus: Anchor | null };

/**
 * The one label shown, or null: the focused control's (keyboard focus wins), else the resting pointer's; a control the
 * rail's current state gives no text shows none. `hoverable`: it is the label of the control the pointer rests on, which
 * the pointer may cross onto (WCAG 1.4.13); shown for keyboard focus alone, it lets the pointer through to the page.
 */
function shownLabel(view: View, texts: RailLabelTexts): { anchor: Anchor; hoverable: boolean } | null {
	const focus = view.focus && texts[view.focus.id] ? view.focus : null;
	const pointer = view.pointer && texts[view.pointer.id] ? view.pointer : null;
	const anchor = focus ?? pointer;
	return anchor ? { anchor, hoverable: pointer?.el === anchor.el } : null;
}

/** Keyboard focus shows a label, a pointer's focus (a click) does not: the same test as the app's focus ring. */
function focusVisible(el: Element): boolean {
	try {
		return el.matches(":focus-visible");
	} catch {
		return true;
	}
}

/**
 * The labels of one rail (the 1024+ / tablet rail, or the compact menu's open sidebar): `props(id)` goes on each
 * control, `layer` (the label shown, or null) is rendered beside the rail's <aside>.
 */
export function useRailLabels(rail: RefObject<HTMLElement | null>, texts: RailLabelTexts): {
	props: (id: string) => RailLabelHandlers;
	layer: ReactElement | null;
} {
	const s = useRef({
		pointer: null as PointerSide | null,
		focus: null as FocusSide | null,
		/** the pointer side's rest timer */
		rest: 0,
		/** a settle deferred by a blur toward another control of the rail */
		pending: 0,
	}).current;
	const [view, setView] = useState<View>({ pointer: null, focus: null });
	const textsRef = useRef(texts);
	textsRef.current = texts;
	/** The label while it is the pointer's (the pointer may cross onto it from its control); null otherwise. */
	const hoverLabelRef = useRef<HTMLDivElement | null>(null);

	const viewOf = (): View => {
		const p = s.pointer;
		const f = s.focus;
		return { pointer: p?.rested && !p.dismissed ? p.anchor : null, focus: f && !f.dismissed ? f.anchor : null };
	};
	const stopRest = () => {
		if (s.rest) window.clearTimeout(s.rest);
		s.rest = 0;
	};
	/** The pointer is on none of the rail's labelled controls, nor on a label of one. */
	const dropPointer = () => {
		stopRest();
		s.pointer = null;
	};
	/**
	 * Every transition ends here: the pointer is on a label only while that label shows as its own (a label taken from
	 * under it ends its side, see the comment at the top), then the render shows what the two sides say.
	 */
	const settle = () => {
		if (s.pending) window.clearTimeout(s.pending);
		s.pending = 0;
		if (s.pointer?.onLabel && !shownLabel(viewOf(), textsRef.current)?.hoverable) dropPointer();
		const next = viewOf();
		setView((v) => (v.pointer === next.pointer && v.focus === next.focus ? v : next));
	};
	const waitForRest = (p: PointerSide) => {
		stopRest();
		s.rest = window.setTimeout(() => {
			s.rest = 0;
			if (s.pointer !== p || p.dismissed) return;
			p.rested = true;
			settle();
		}, RAIL_LABEL_REST_MS);
	};
	/** The pointer arrives on a control: a new pointer side, its label after a rest. */
	const arrive = (id: string, el: HTMLElement) => {
		dropPointer();
		const p: PointerSide = { anchor: { id, el }, rested: false, dismissed: false, onLabel: false };
		s.pointer = p;
		settle();
		waitForRest(p);
	};

	const props = (id: string): RailLabelHandlers => ({
		onPointerEnter: (e) => {
			if (e.pointerType === "touch" || !textsRef.current[id]) return;
			const p = s.pointer;
			// back from its own label: the same hover, on its control again
			if (p && p.anchor.el === e.currentTarget) {
				p.onLabel = false;
				return;
			}
			arrive(id, e.currentTarget);
		},
		onPointerMove: (e) => {
			if (e.pointerType === "touch" || !textsRef.current[id]) return;
			const p = s.pointer;
			// the rail changed under a pointer that never left (it closed around it): its first move here is an arrival
			if (!p || p.anchor.el !== e.currentTarget) return arrive(id, e.currentTarget);
			p.onLabel = false;
			// still moving over the control: the label waits for the pointer to rest
			if (!p.rested && !p.dismissed) waitForRest(p);
		},
		onPointerLeave: (e) => {
			const p = s.pointer;
			if (!p || p.anchor.el !== e.currentTarget) return;
			const to = e.relatedTarget;
			// onto its label (or the strip to it) while that shows as its own: the label stays while the pointer is on it
			if (p.rested && !p.dismissed && to instanceof Node && hoverLabelRef.current?.contains(to)) {
				p.onLabel = true;
				return;
			}
			dropPointer();
			settle();
		},
		onFocus: (e) => {
			// recorded even while this control shows no label: focus can land before the rail's new state renders (the
			// menu's close returns focus to Show while the menu still counts as open); the render decides what shows
			if (keyboardInput && focusVisible(e.currentTarget)) s.focus = { anchor: { id, el: e.currentTarget }, dismissed: false };
			settle();
		},
		onBlur: (e) => {
			if (s.focus?.anchor.el !== e.currentTarget) return;
			s.focus = null;
			// focus going straight to another control of this rail (Tab): that control's focus handler settles what shows,
			// so the resting pointer's label is not rendered for the moment in between; the timeout settles it if no focus
			// handler runs after all
			const to = e.relatedTarget;
			if (to instanceof Node && rail.current?.contains(to)) {
				if (!s.pending) s.pending = window.setTimeout(settle, 0);
				return;
			}
			settle();
		},
	});

	// the pointer's own label (shown while it rests on that label's control): crossing onto it keeps the hover, leaving it
	// for anything but its control ends it
	const onLabelEnter = () => {
		const p = s.pointer;
		if (p?.rested && !p.dismissed) p.onLabel = true;
	};
	const onLabelLeave = (e: ReactPointerEvent<HTMLElement>) => {
		const p = s.pointer;
		if (!p) return;
		const to = e.relatedTarget;
		// back onto its control
		if (to instanceof Node && p.anchor.el.contains(to)) {
			p.onLabel = false;
			return;
		}
		dropPointer();
		settle();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: the state lives in a ref; one set of listeners for the rail's life
	useEffect(() => {
		// Escape dismisses the label without moving the pointer or focus (WCAG 1.4.13): it stays dismissed until the pointer
		// leaves and comes back, or focus moves. With the pointer on the label, the label goes from under it: its side ends
		// (settle), so the pointer's next arrival on the control shows it again. The key still does whatever else it does
		// (a menu or a sheet closing).
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || (!s.pointer && !s.focus)) return;
			if (s.pointer) {
				s.pointer.dismissed = true;
				stopRest();
			}
			if (s.focus) s.focus.dismissed = true;
			settle();
		};
		// the pointer side follows the real pointer: a pointer the browser reports over anything but that side's control or
		// its own label is on neither (an exit no leave reported), and the side ends; a finger leaves a resting mouse alone
		const onOver = (e: PointerEvent) => {
			const p = s.pointer;
			if (!p || e.pointerType === "touch") return;
			const to = e.target;
			if (to instanceof Node && (p.anchor.el.contains(to) || hoverLabelRef.current?.contains(to))) return;
			dropPointer();
			settle();
		};
		document.addEventListener("keydown", onKey, true);
		document.addEventListener("pointerover", onOver, true);
		return () => {
			document.removeEventListener("keydown", onKey, true);
			document.removeEventListener("pointerover", onOver, true);
			stopRest();
			if (s.pending) window.clearTimeout(s.pending);
			s.pending = 0;
		};
	}, []);

	// after every render: a control the rail's new state gives no text (the rail opened, its menu covers it) or that is gone
	// (a page re-created it) ends the pointer side, so nothing comes back on its own when the rail closes again (the next
	// move over the control is an arrival); the focus side ends once its control no longer has focus (its blur normally
	// says so first); and a label the new state took from under the pointer ends the pointer side (settle)
	useEffect(() => {
		let changed = false;
		const p = s.pointer;
		if (p && (!texts[p.anchor.id] || !p.anchor.el.isConnected)) {
			dropPointer();
			changed = true;
		}
		const f = s.focus;
		if (f && (!f.anchor.el.isConnected || document.activeElement !== f.anchor.el)) {
			s.focus = null;
			changed = true;
		}
		if (changed || (s.pointer?.onLabel && !shownLabel(viewOf(), texts)?.hoverable)) settle();
	});

	const shown = shownLabel(view, texts);
	const layer = shown ? (
		<RailLabel
			key={shown.anchor.id}
			anchor={shown.anchor}
			text={texts[shown.anchor.id] as string}
			rail={rail}
			labelRef={shown.hoverable ? hoverLabelRef : undefined}
			onPointerEnter={shown.hoverable ? onLabelEnter : undefined}
			onPointerLeave={shown.hoverable ? onLabelLeave : undefined}
		/>
	) : null;
	return { props, layer };
}

/**
 * Places the label: its left edge RAIL_LABEL_GAP right of the rail's edge (kept inside the window, never over its
 * control), vertically centred on its control (kept inside the window too), on whole device pixels (crisp text at every
 * zoom). The label is position: fixed inside the zoomed canvas, so its left / top are layout px x the canvas zoom from
 * its containing block (the window; the menu's panel while that slides in): each pass measures where it is and moves it
 * by the difference, whatever that containing block is. The bridge spans from the control's right edge to the label over
 * the control's height. Returns whether the label moved.
 */
function place(label: HTMLElement, bridge: HTMLElement, rail: HTMLElement, target: HTMLElement): boolean {
	if (!target.isConnected || !rail.isConnected) return false;
	const t = target.getBoundingClientRect();
	const r = rail.getBoundingClientRect();
	const b = label.getBoundingClientRect();
	const zoom = (label as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom || (label.offsetWidth ? b.width / label.offsetWidth : 1) || 1;
	const dpr = window.devicePixelRatio || 1;
	const snap = (v: number) => Math.round(v * dpr) / dpr;
	const gap = RAIL_LABEL_GAP * zoom;
	// the part of the control the rail shows: while the rail opens, its Hide slides in clipped by the rail's edge, and the
	// label rides that edge instead of standing out over the page beside a control not drawn yet
	const right = Math.min(t.right, r.right);
	// a window too narrow for the label beside the rail (the phone menu's Hide on a 320 window: 216 + 8 + 116) slides it
	// back over the rail's blank side to stay inside the window, never over its own control
	const room = (document.documentElement.clientWidth || window.innerWidth) - gap - b.width;
	const x = snap(Math.max(Math.min(r.right + gap, room), right + gap));
	// a window shorter than the rail's 448 lets the rail scroll inside itself, so a control can sit partly below (or above)
	// the window (the account row of an 844 x 390 tablet rail at 373-421): its label moves up (or down) into the window,
	// beside the part of the control the window shows; still right of the rail's edge (x above), so never over it. A
	// control wholly out of the window takes its label with it (no label left at the edge naming nothing there).
	const height = document.documentElement.clientHeight || window.innerHeight;
	let y = snap(t.top + (t.height - b.height) / 2);
	if (t.bottom > 0 && t.top < height) y = Math.max(0, Math.min(y, Math.floor((height - b.height) * dpr) / dpr));
	const dx = (x - b.left) / zoom;
	const dy = (y - b.top) / zoom;
	const moved = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;
	if (moved) {
		label.style.left = `${(Number.parseFloat(label.style.left) || 0) + dx}px`;
		label.style.top = `${(Number.parseFloat(label.style.top) || 0) + dy}px`;
	}
	const span = Math.max(0, (x - right) / zoom);
	bridge.style.left = `${-span - BORDER}px`;
	bridge.style.width = `${span}px`;
	bridge.style.top = `${(t.top - y) / zoom - BORDER}px`;
	bridge.style.height = `${t.height / zoom}px`;
	return moved;
}

/**
 * The label (app tokens only, no new colour): the #181f30 card fill (News cards, the notification rows, the auth fields),
 * a 1px #242f4b border (the account row's active ring), radius 8, padding 6 / 10, Geist Medium 13 / 17 in the rail's
 * label ink #d9d9d9 (drawn as the rail draws its labels: .stak-ink), the notifications panel's drop shadow
 * (2:2728 / 2:2936: 0 16 40 -8 #000 45%), no arrow, one line. Chrome draws the border one device pixel wide at every
 * zoom (accepted: the coordinator's ruling of 2026-11-06 20:00). `labelRef` / `onPointerEnter` / `onPointerLeave`: only
 * while it is the pointer's label, which the pointer may move onto (WCAG 1.4.13); shown for keyboard focus alone, it
 * lets the pointer through to the page.
 */
function RailLabel({
	anchor,
	text,
	rail,
	labelRef,
	onPointerEnter,
	onPointerLeave,
}: {
	anchor: Anchor;
	text: string;
	rail: RefObject<HTMLElement | null>;
	labelRef?: RefObject<HTMLDivElement | null>;
	onPointerEnter?: () => void;
	onPointerLeave?: (e: ReactPointerEvent<HTMLElement>) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const bridgeRef = useRef<HTMLSpanElement>(null);
	const target = anchor.el;
	// the hook knows the pointer's label (leaving the control onto it keeps the hover) only while this label is that one
	useLayoutEffect(() => {
		if (!labelRef) return;
		const el = ref.current;
		labelRef.current = el;
		return () => {
			if (labelRef.current === el) labelRef.current = null;
		};
	}, [labelRef]);
	useLayoutEffect(() => {
		const label = ref.current;
		const bridge = bridgeRef.current;
		const railEl = rail.current;
		if (!label || !bridge || !railEl) return;
		// placed before the first paint, then followed while anything around it moves: the rail opening or closing and the
		// menu sliding in (transitions), the window resizing, the rail scrolling inside itself on a very short window
		let raf = 0;
		let still = 0;
		const tick = () => {
			raf = 0;
			still = place(label, bridge, railEl, target) ? 0 : still + 1;
			if (still < SETTLE_FRAMES) raf = window.requestAnimationFrame(tick);
		};
		const follow = () => {
			still = 0;
			if (!raf) raf = window.requestAnimationFrame(tick);
		};
		place(label, bridge, railEl, target);
		follow();
		window.addEventListener("resize", follow);
		document.addEventListener("scroll", follow, { capture: true, passive: true });
		document.addEventListener("transitionrun", follow, true);
		return () => {
			if (raf) window.cancelAnimationFrame(raf);
			window.removeEventListener("resize", follow);
			document.removeEventListener("scroll", follow, true);
			document.removeEventListener("transitionrun", follow, true);
		};
	}, [target, rail]);
	return (
		<div
			ref={ref}
			aria-hidden="true"
			data-rail-label={anchor.id}
			onPointerEnter={onPointerEnter}
			onPointerLeave={onPointerLeave}
			className={[
				"fixed left-0 top-0 z-40 block w-max cursor-default select-none whitespace-nowrap rounded-[8px] border border-solid border-[#242f4b] bg-[#181f30] px-[10px] py-[6px] font-geist text-[13px] font-medium leading-[17px] shadow-[0px_16px_40px_-8px_rgba(0,0,0,0.45)]",
				onPointerLeave ? "" : "pointer-events-none",
			].join(" ")}
		>
			<span ref={bridgeRef} data-rail-label-bridge="" className="absolute" />
			<span className="stak-ink block text-[#d9d9d9] [--ink:#d9d9d9]">{text}</span>
		</div>
	);
}

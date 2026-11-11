import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

// ── Where a page's pill stands (coordinator ruling N36.3a; the NEWS polish round's NW5) ──────────────────────────────

/**
 * A transient pill may not cover a control the person may press next. The app's toaster puts every toast in one place
 * (src/routes/__root.tsx, styles.css .stak-toast: top-centre 24 from the top; on a phone's shell pages 80 from the top,
 * under the pinned 64 top bar), and the page scrolls under that place: measured on 2026-11-10 (leftovers r1,
 * probes/toast_cover.js), the "Saved to My STAK" pill stood over the article hero's Unsave control at 390 x 844 (scrolled
 * 104 to 176 px; a press there landed on the pill) and at 1440 x 1024 (176 to 248), over its play button at every size,
 * over "View <SYMBOL> in My STAK" at 390 and 820, and over the stock page's range tabs at 390.
 *
 * The phones never stand a pill over a control: their article confirms a save in the hero's own chip and their stock
 * page in a success sheet (android ui/news/NewsDetailScreen.kt:590-618 and ui/discover/StockDetailScreen.kt:290-320;
 * ios News/NewsDetailView.swift:380-400 and Discover/StockDetailView.swift:745-760), and their one pill, the deck's
 * "Saved to My STAK", stands at the top of the screen under the status bar, over the deck's own header, not over a
 * control (android ui/discover/DiscoverScreen.kt:713-727; ios Discover/DiscoverView.swift:527-552). The web's pill
 * follows that and the shell's pinned bars:
 * - a PHONE's shell page has a pinned top bar (AppShell PhoneTopBar, header[data-top-bar], pinned by the ruling of
 *   2026-10-30), the one strip of the window no page content ever scrolls under: the pill stands IN it, centred on the
 *   bar's middle line as the menu button and the logo are, at the bar's right gutter (16, the menu button's mirror). It
 *   is as wide as its message, which stays on one line as Figma's pill (2:3234) does: right of the logo where the bar
 *   leaves the room (390 and up: 222 px for the 160 / 192 px of "Saved to" / "Removed from My STAK"), and on the
 *   narrowest phones over the logo mark, which is not a control (aria-hidden, no pointer events), never nearer than 8 to
 *   the menu button (at 320 the room right of the logo is 152 px and the pill wrapped onto two lines: the LEFTOVERS review
 *   r2). It covers no control, whatever the scroll;
 * - elsewhere (tablets, laptops, desktops, big screens: no top bar) it stands where the toaster puts it while no control
 *   lies under it; when one does, at the same distance from the window's bottom; when a control lies under both, it is
 *   out of sight (it still speaks: the toaster's live region has announced it) and never takes a press.
 * While it stands, a control that comes under it (the person scrolls) makes it leave: it has said what it had to say,
 * and the press goes to the control. The pill keeps its own behaviour (the toaster's hover pause, swipe away, any
 * button of its own): a pill on show still takes pointer input as before; only the out-of-sight one lets presses through.
 */
export type PillBox = { x: number; y: number; w: number; h: number };
export type PillPlace =
	| { kind: "bar"; middle: number; right: number; maxWidth: number }
	| { kind: "top" }
	| { kind: "bottom"; y: number }
	| { kind: "hidden" };

/** The phone top bar's right gutter (the menu button's 16 on the left) and the room kept clear of its menu button. */
export const BAR_GUTTER = 16;
export const BAR_CLEAR = 8;

/**
 * The rule above as a pure function. `pill`: the pill's box where the toaster put it (window px, at rest); `bar`: the
 * pinned top bar's middle line and the right edge of its controls (the menu button; null where there is no bar);
 * `covered`: whether a control the person can press lies under a box. In the bar the pill is as wide as its message up to
 * `maxWidth`, its right edge at `right`.
 */
export function pillPlace(o: { win: { w: number; h: number }; pill: PillBox; bar: { middle: number; controlsRight: number } | null; covered: (box: PillBox) => boolean }): PillPlace {
	if (o.bar) {
		const right = o.win.w - BAR_GUTTER;
		return { kind: "bar", middle: o.bar.middle, right, maxWidth: Math.max(0, right - (o.bar.controlsRight + BAR_CLEAR)) };
	}
	if (!o.covered(o.pill)) return { kind: "top" };
	// mirrored: as far from the window's bottom as the toaster keeps it from the top
	const y = o.win.h - o.pill.y - o.pill.h;
	if (y > o.pill.y && !o.covered({ ...o.pill, y })) return { kind: "bottom", y };
	return { kind: "hidden" };
}

/** What a person can press (a disabled control cannot). */
const CONTROLS =
	"a[href], button:not(:disabled), [role=button], [role=link], [role=tab], [role=switch], [role=checkbox], input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex='-1'])";

const inToaster = (el: Element) => !!el.closest("[data-sonner-toaster]");
const transitionRunning = () => {
	try {
		return document.documentElement.matches(":active-view-transition");
	} catch {
		return false;
	}
};
const modalOpen = () => {
	try {
		return !!document.querySelector("dialog:modal");
	} catch {
		return !!document.querySelector("dialog[open]");
	}
};

/** Whether a control the person can press lies under `box` (window px). */
export function controlUnder(box: PillBox): boolean {
	if (typeof document === "undefined") return false;
	// a modal sheet (or the menu) is in the top layer above every toast, and the page under it takes no press
	if (modalOpen()) return false;
	// while a view transition runs the page answers no hit-test (its layer covers the window): the boxes alone decide
	const boxesOnly = transitionRunning();
	for (const el of document.querySelectorAll<HTMLElement>(CONTROLS)) {
		if (inToaster(el)) continue;
		const r = el.getBoundingClientRect();
		const ix = Math.min(r.right, box.x + box.w) - Math.max(r.left, box.x);
		const iy = Math.min(r.bottom, box.y + box.h) - Math.max(r.top, box.y);
		if (ix <= 0.5 || iy <= 0.5) continue;
		if (boxesOnly || typeof document.elementsFromPoint !== "function") return true;
		// the control is what a press there would reach: on top at the overlap's middle (not clipped away, not under a layer)
		const hit = document.elementsFromPoint(Math.max(r.left, box.x) + ix / 2, Math.max(r.top, box.y) + iy / 2).find((e) => !inToaster(e));
		if (hit && (hit === el || el.contains(hit))) return true;
	}
	return false;
}

/** The pinned phone top bar, when this page has one on screen: its middle line and where its controls end. */
function pinnedBar(): { middle: number; controlsRight: number } | null {
	const bar = document.querySelector<HTMLElement>("header[data-top-bar]");
	if (!bar) return null;
	const r = bar.getBoundingClientRect();
	// pinned at the window's top (sticky, the ruling of 2026-10-30) and drawn
	if (r.height <= 0 || r.width <= 0 || Math.abs(r.top) > 1) return null;
	// what a press in the bar can reach (the menu button): the logo mark is a picture, not one of them
	const controls = [...bar.querySelectorAll<HTMLElement>(CONTROLS)].map((e) => e.getBoundingClientRect()).filter((p) => p.width > 0 && p.height > 0);
	const menu = bar.querySelector<HTMLElement>("button")?.getBoundingClientRect();
	const middle = menu && menu.height > 0 ? menu.top + menu.height / 2 : r.bottom - 32;
	return { middle, controlsRight: controls.length ? Math.max(...controls.map((p) => p.right)) : r.left };
}

/** The pill's box at rest (the toaster's enter motion moves it with a transform, which the offsets leave out). */
function restingBox(li: HTMLElement): PillBox | null {
	const list = li.offsetParent ?? li.parentElement;
	if (!list) return null;
	const o = list.getBoundingClientRect();
	return { x: o.left + li.offsetLeft, y: o.top + li.offsetTop, w: li.offsetWidth, h: li.offsetHeight };
}

const nextFrame = (fn: () => void) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : setTimeout(fn, 16));
let raised = 0;

/**
 * Puts the toast `id` (its element `[data-testid=testId]`) where pillPlace says, once the toaster has drawn it, and
 * makes it leave when a control comes under it while it stands.
 */
function keepClear(id: string | number, testId: string) {
	if (typeof document === "undefined" || typeof window === "undefined") return;
	let tries = 0;
	const find = () => {
		const li = document.querySelector<HTMLElement>(`[data-sonner-toast][data-testid="${testId}"]`);
		if (!li || li.offsetHeight === 0) {
			if (++tries < 30) nextFrame(find);
			return;
		}
		const list = (li.offsetParent ?? li.parentElement) as HTMLElement | null;
		const pill = restingBox(li);
		if (!list || !pill) return;
		const place = pillPlace({ win: { w: window.innerWidth, h: window.innerHeight }, pill, bar: pinnedBar(), covered: controlUnder });
		const o = list.getBoundingClientRect();
		if (place.kind === "bar") {
			// centred on the bar's middle line whatever its height (only a message wider than the bar's room wraps), its right
			// edge at the bar's gutter
			li.style.top = `${place.middle - o.top}px`;
			li.style.translate = "0 -50%";
			li.style.marginLeft = "auto";
			li.style.marginRight = `${o.right - place.right}px`;
			li.style.maxWidth = `${place.maxWidth}px`;
			// in the bar the pill can reach over the logo on the narrowest phones (320-351 px): its 48% translucent fill
			// (styles.css .stak-toast) would show the logo through it, so it takes the colour that fill has over the bar's
			// #080d1a (0.48 x (36,43,61) + 0.52 x (8,13,26)): identical wherever it covers nothing (leftovers review r3)
			li.style.background = "rgb(21, 27, 43)";
		} else if (place.kind === "bottom") {
			li.style.top = `${place.y - o.top}px`;
		} else if (place.kind === "hidden") {
			li.style.opacity = "0";
			li.style.pointerEvents = "none";
			return;
		}
		// while it stands: a control that comes under it makes it leave (the press is the control's)
		let queued = false;
		const stop = () => {
			window.removeEventListener("scroll", check, true);
			window.removeEventListener("resize", check);
		};
		const look = () => {
			queued = false;
			if (!li.isConnected || li.dataset.removed === "true") return stop();
			const now = restingBox(li);
			const barGone = place.kind === "bar" && !pinnedBar();
			if (barGone || (place.kind !== "bar" && now && controlUnder(now))) {
				stop();
				toast.dismiss(id);
			}
		};
		function check() {
			if (queued) return;
			queued = true;
			nextFrame(look);
		}
		window.addEventListener("scroll", check, { capture: true, passive: true });
		window.addEventListener("resize", check, { passive: true });
		setTimeout(stop, 20_000);
	};
	nextFrame(find);
}

/**
 * Raises a page's pill (Figma's toast 2:3234 through the app's toaster) where it covers no control (pillPlace). Returns
 * the toaster's id, for the page to dismiss or replace it.
 */
export function raisePill(message: string, options?: { icon?: ReactNode }): string | number {
	const testId = `stak-pill-${++raised}`;
	const id = toast(message, options?.icon === undefined ? { testId } : { icon: options.icon, testId });
	keepClear(id, testId);
	return id;
}

/**
 * The stock page's Save / Unsave confirmation ("Saved to My STAK", "Removed from My STAK": Figma's toast 2:3234). Figma
 * draws one toast at a time, so the next one replaces the one on screen; and the confirmation belongs to the page it rose
 * on, so it leaves with that page (Back, a link, another stock), as the deck's own toast leaves with its card
 * (src/routes/_app.discover.tsx, the toast effect) and as the phones' confirmation is part of the detail page (android
 * ui/discover/StockDetailScreen.kt:300-335, DetailSavedSheet). Before this it outlived Back and sat over the deck's title
 * on a phone for its last seconds (discover-stock review 1, coordinator ruling N17c).
 *
 * `page` names the page the toasts belong to (the stock's symbol): when it changes, or the page unmounts, the
 * confirmation on screen is dismissed. An action takes a `ticket()` when it starts and hands it back with its
 * confirmation: a write that answers after the person has left (a slow account save) confirms nothing on the next page.
 * A failure is always said and stays its own time wherever the person is by then (the save did not happen); on the page
 * it is replaced like any toast.
 */
export function usePageToast(page: string) {
	const confirmation = useRef<string | number | null>(null);
	const failure = useRef<string | number | null>(null);
	// counts the pages this hook has left: a ticket taken on an earlier page no longer matches
	const visit = useRef(0);
	useEffect(
		() => () => {
			visit.current++;
			if (confirmation.current !== null) toast.dismiss(confirmation.current);
			confirmation.current = null;
			// the failure stays on screen; the next page's toasts no longer replace it
			failure.current = null;
		},
		[page],
	);
	return useMemo(() => {
		const clear = () => {
			if (confirmation.current !== null) toast.dismiss(confirmation.current);
			if (failure.current !== null) toast.dismiss(failure.current);
			confirmation.current = null;
			failure.current = null;
		};
		return {
			/** Taken when an action starts; `confirm` shows nothing once the page it was taken on has gone. */
			ticket: () => visit.current,
			/** The action's confirmation, in place of the toast on screen. */
			confirm: (ticket: number, message: string, icon?: ReactNode) => {
				if (ticket !== visit.current) return;
				clear();
				// where it covers no control (raisePill, N36.3a)
				confirmation.current = raisePill(message, icon === undefined ? undefined : { icon });
			},
			/** The action failed: said in place of the toast on screen, or on the page the person has gone to. */
			fail: (ticket: number, message: string) => {
				if (ticket === visit.current) clear();
				const id = raisePill(message);
				if (ticket === visit.current) failure.current = id;
			},
		};
	}, []);
}

import { flushSync } from "react-dom";
import "./transitions.css";

/**
 * The prototype's transitions for state changes on the stock detail page (see transitions.css):
 * - `dissolve`: the ticket's Back and Order filled's "Keep exploring" (DISSOLVE 300 ms, ease-out);
 * - `smart`: Confirm practice buy -> Order filled (SMART_ANIMATE 350 ms, ease-out), a cross-fade of the sheet;
 * - `save`: Save / Unsave (SMART_ANIMATE 350 ms, ease-out): the page's cards keep their identity and glide to
 *   their new place and size while their content cross-fades, as Smart Animate matches same-named layers.
 */
export type StockMotion = "dissolve" | "smart" | "save";

/** The view-transition type of the push to My STAK (transitions.css). */
const PUSH_TYPE = "stak-stock-push";

/** The router's options for "View in My STAK" (1:4245: PUSH left, 300 ms, ease-out). */
export const PUSH_FORWARD = { types: [PUSH_TYPE] };

/** The class that marks a sheet panel whose dialog skips its own fade-in (transitions.css). */
export const SHEET_STILL = "stak-stock-sheet-still";

/**
 * The cards Smart Animate carries across Save / Unsave, by the Figma layer they stand for. Each class gets its own
 * view-transition-name only while a `save` transition runs (transitions.css), so no other transition lifts a card
 * out of the page (a lifted card would paint above an open sheet).
 */
export const MORPH = {
	back: "stak-vt-back",
	chart: "stak-vt-chart",
	intro: "stak-vt-intro",
	risk: "stak-vt-risk",
	numbers: "stak-vt-numbers",
	news: "stak-vt-news",
	cta: "stak-vt-cta",
	analyst: "stak-vt-analyst",
	compare: "stak-vt-compare",
} as const;

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void>; skipTransition?: () => void };
type Update = () => Promise<void>;
type StartViewTransition = (arg: Update | { update: Update; types: string[] }) => ViewTransitionLike;

/** How long after a touch's (or a pen's) release its click may still come (the tap's gesture is recognised first). */
const TAP_CLICK_MS = 500;

/**
 * A press during a motion of these pages is not lost: the Save morph since DISCOVER-STOCK's round 3 (the independent
 * review r2b, low 4: Back pressed within about 0.4 s of Save or Unsave did nothing, seen at 390 x 844 and reproduced at
 * 1440 x 1024, discover-stock/fix3/logs), and since the LEFTOVERS round every other one (coordinator ruling N36.3d): the
 * ticket's dissolve (its Back, Esc, the scrim, Order filled's Keep exploring: 300 ms), the Confirm morph into Order
 * filled or the failed sheet and Try again's way back (350 ms), and the push to My STAK (300 ms, the router's own
 * transition: watchPush below), on the stock page and on the deck alike. While a document's view transition runs, its
 * layer covers the window and the page under it does not answer hit-testing: 200 ms after Save the only element under
 * the pointer at Back's centre was <html>, so the press went nowhere. CSS cannot open the layer while the root takes part
 * (transitions.css), so the first press CUTS the motion instead: the page is already in its new state (the update ran
 * before the motion started), `skipTransition` drops the layer at once, and the press is handed to the control that
 * stands under the pointer.
 *
 * Handing it over: the press was aimed at the layer, so for a mouse the browser sends the click to what the press and
 * the release have in common, which is <html>, and no control hears it. When that click arrives and the pointer is
 * still on the element it stood on when the morph was cut, that element is clicked (a disabled button stays inert, a
 * link follows its own click). A touch's click is aimed at the release and reaches the control by itself; a press that
 * is dragged away, cancelled, or made with another button hands nothing over. The keyboard never met the layer.
 *
 * A DOUBLE-CLICK is one press, not two (the LEFTOVERS review r2): its second press comes while the motion its first press
 * started is still running, at the same spot, and what stands there now is the next state's control: "View in My STAK"
 * where "Confirm practice buy" stood (a double-click on Confirm left for My STAK before the receipt was ever seen), the
 * page's stat tile under the ticket's Back, Practice buy where Save stood (the Save morph moves it up: a double-click on
 * Save opened the ticket). So a click the browser counts as the second
 * (or third) of a series (`detail` above 1: the system's double-click time and distance; a double tap's tap count) cuts
 * the motion like any press and reaches nothing, as the motion's layer had it before N36.3d: handed to nobody on a mouse,
 * and held back from the control a touch's click found by itself. The first press of a new series (`detail` 1) is still
 * handed over, however soon it follows.
 */
function pressCutsMorph(t: ViewTransitionLike) {
	if (typeof t.skipTransition !== "function") return;
	const onDown = (down: PointerEvent) => {
		if (!down.isPrimary || down.button !== 0) return;
		window.removeEventListener("pointerdown", onDown, true);
		t.skipTransition?.();
		const pressed = document.elementFromPoint(down.clientX, down.clientY);
		if (!pressed || pressed === document.documentElement || pressed === document.body) return;
		const done = () => {
			window.removeEventListener("click", onClick, true);
			window.removeEventListener("pointerup", onUp, true);
			window.removeEventListener("pointercancel", done, true);
		};
		const onClick = (click: MouseEvent) => {
			if (!click.isTrusted) return;
			done();
			const onLayer = click.target === document.documentElement || click.target === document.body;
			// the second click of a double-click (a double tap) belongs to the first press: it reaches nothing (see above)
			if (click.detail > 1) {
				if (!onLayer) {
					click.preventDefault();
					click.stopImmediatePropagation();
				}
				return;
			}
			// a click that found its own target (a touch) needs no help; one the layer's <html> caught is handed over
			if (!onLayer) return;
			if (document.elementFromPoint(click.clientX, click.clientY) !== pressed) return;
			if (pressed instanceof HTMLElement) pressed.click();
			else pressed.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, view: window, clientX: click.clientX, clientY: click.clientY }));
		};
		// the click, when there is one, follows a mouse's release in the same turn; a tap's comes once the gesture is
		// recognised, a moment later (it is waited for, so the second tap of a double tap can be held back)
		const onUp = () => setTimeout(done, down.pointerType === "mouse" ? 0 : TAP_CLICK_MS);
		window.addEventListener("click", onClick, true);
		window.addEventListener("pointerup", onUp, true);
		window.addEventListener("pointercancel", done, true);
	};
	window.addEventListener("pointerdown", onDown, true);
	const off = () => window.removeEventListener("pointerdown", onDown, true);
	t.finished.then(off, off);
}

/**
 * Runs a state change as one of the prototype's transitions: a typed view transition whose old and new states are
 * the page before and after `change` (sheets included, they sit in the top layer of the same document). `change`
 * may return a promise (a URL update the new state waits for). Without the View Transitions API, or with reduced
 * motion, the change simply happens.
 */
export function runTransition(motion: StockMotion, change: () => void | Promise<unknown>) {
	const doc = document as Document & { startViewTransition?: StartViewTransition };
	const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (typeof doc.startViewTransition !== "function" || reduced) {
		void change();
		return;
	}
	// the new state is captured once React has committed it and run its effects (a new sheet opens in one)
	const update: Update = async () => {
		let pending: void | Promise<unknown> = undefined;
		flushSync(() => {
			pending = change();
		});
		await pending;
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
	};
	let t: ViewTransitionLike;
	try {
		t = doc.startViewTransition({ update, types: [`stak-stock-${motion}`] });
	} catch {
		// browsers before view-transition types: the same change with the default dissolve
		t = doc.startViewTransition(update);
	}
	// a transition cut short by the next one rejects these; the change itself has already happened
	t.ready.catch(() => {});
	t.finished.catch(() => {});
	t.updateCallbackDone.catch(() => {});
	// every motion leaves the person on a page they go on using (the page, its next sheet): none swallows their next press
	pressCutsMorph(t);
}

/**
 * The push to My STAK ("View in My STAK" on Order filled, from a stock page or the deck: `navigate({ viewTransition:
 * PUSH_FORWARD })`) is the ROUTER's view transition: TanStack Router starts it inside its own navigation and keeps the
 * ViewTransition to itself (router-core router.js `startViewTransition`). The document's `startViewTransition` is
 * watched once, and a transition of this push's type gets the same treatment as the page's own motions: the first press
 * on My STAK cuts the push and reaches the control under the pointer. Nothing else is touched: every other transition
 * passes through unchanged (the page's own motions get the treatment in runTransition; the other areas' router motions
 * are theirs). Installed when this module loads (a page that can push imports it); a no-op without the API (tests, older
 * browsers). The flag lives on the document, so a hot reload of this module does not watch twice.
 */
const WATCHED = Symbol.for("stak.stocks.pressCutsPush");
export function watchPush() {
	if (typeof document === "undefined" || typeof document.startViewTransition !== "function") return;
	const flags = document as unknown as Record<symbol, true | undefined>;
	if (flags[WATCHED]) return;
	flags[WATCHED] = true;
	const start = document.startViewTransition.bind(document);
	document.startViewTransition = ((arg?: Parameters<typeof start>[0]) => {
		const t = start(arg);
		const types = typeof arg === "object" && arg !== null ? (arg as { types?: unknown }).types : undefined;
		if (Array.isArray(types) && types.includes(PUSH_TYPE)) pressCutsMorph(t);
		return t;
	}) as typeof document.startViewTransition;
}
watchPush();

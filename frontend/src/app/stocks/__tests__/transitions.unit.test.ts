/**
 * Every motion of the stock pages lets the first press through (coordinator ruling N36.3d, 2026-11-10): the Save morph
 * since DISCOVER-STOCK's round 3, and now the ticket's dissolve, the Confirm morph and the router's push to My STAK. The
 * document's view-transition API is stubbed (jsdom has none): a primary press while a motion runs skips it at once, the
 * next press finds nothing left to cut; a press with another button cuts nothing. The hand-over of the click to the
 * control under the pointer needs a trusted click (a real mouse) and is checked with real input in the browser.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type FakeTransition = { types: string[]; skipTransition: ReturnType<typeof vi.fn>; ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void>; finish: () => void };
const started: FakeTransition[] = [];

function fakeStart(arg?: unknown): FakeTransition {
	let finish = () => {};
	const finished = new Promise<void>((resolve) => {
		finish = resolve;
	});
	const types = typeof arg === "object" && arg !== null && Array.isArray((arg as { types?: unknown }).types) ? ((arg as { types: string[] }).types) : [];
	const update = typeof arg === "function" ? arg : typeof arg === "object" && arg !== null ? (arg as { update?: () => unknown }).update : undefined;
	void Promise.resolve().then(() => update?.());
	const t: FakeTransition = { types, skipTransition: vi.fn(() => finish()), ready: Promise.resolve(), finished, updateCallbackDone: Promise.resolve(), finish };
	started.push(t);
	return t;
}

const press = (button = 0, isPrimary = true, pointerType = "mouse") => {
	const Ctor = (window as unknown as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
	const event = new Ctor("pointerdown", { button, bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
	Object.defineProperty(event, "isPrimary", { value: isPrimary });
	Object.defineProperty(event, "pointerType", { value: pointerType });
	window.dispatchEvent(event);
};

/**
 * A click the BROWSER sends (isTrusted, as a real mouse's or a tap's), with its click count (`detail`: 2 for the second
 * click of a double-click). A page's own dispatchEvent always makes an untrusted event, so this fires it the way jsdom
 * fires its own events (the event's implementation, dispatched by the target's).
 */
const implOf = (wrapper: object) => {
	const key = Object.getOwnPropertySymbols(wrapper).find((s) => s.description === "impl");
	if (!key) throw new Error("the test environment is not jsdom: no trusted events");
	return (wrapper as Record<symbol, { isTrusted: boolean; _dispatch: (event: unknown) => boolean }>)[key]!;
};
const trustedClick = (target: Element, detail: number) => {
	const event = new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, detail, clientX: 10, clientY: 10 });
	const impl = implOf(event);
	impl.isTrusted = true;
	implOf(target)._dispatch(impl);
	return event;
};

let mod: typeof import("../transitions");

beforeAll(async () => {
	// the API the browser gives; installed before the module loads, as in the app (the module watches it on load)
	(document as unknown as { startViewTransition: unknown }).startViewTransition = fakeStart;
	(document as unknown as { elementFromPoint: unknown }).elementFromPoint = () => null;
	vi.resetModules();
	mod = await import("../transitions");
});
afterAll(() => {
	delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
});
beforeEach(() => {
	started.length = 0;
});
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the stock pages' motions let the first press through (N36.3d)", () => {
	for (const motion of ["dissolve", "smart", "save"] as const) {
		it(`the ${motion} motion is cut by the first primary press, once`, async () => {
			const change = vi.fn();
			mod.runTransition(motion, change);
			expect(started).toHaveLength(1);
			expect(started[0]!.types).toEqual([`stak-stock-${motion}`]);
			await settle();
			expect(change).toHaveBeenCalledTimes(1);
			press();
			expect(started[0]!.skipTransition).toHaveBeenCalledTimes(1);
			// the next press meets no motion: nothing more is cut
			press();
			expect(started[0]!.skipTransition).toHaveBeenCalledTimes(1);
		});
	}

	it("a press with another button (or not the primary pointer) cuts nothing", async () => {
		mod.runTransition("dissolve", () => undefined);
		await settle();
		press(2);
		press(0, false);
		expect(started[0]!.skipTransition).not.toHaveBeenCalled();
		press();
		expect(started[0]!.skipTransition).toHaveBeenCalledTimes(1);
	});

	it("a motion that ended on its own leaves no listener behind", async () => {
		mod.runTransition("smart", () => undefined);
		await settle();
		started[0]!.finish();
		await settle();
		press();
		expect(started[0]!.skipTransition).not.toHaveBeenCalled();
	});

	it("the router's push to My STAK (its own transition, typed PUSH_FORWARD) is cut by the first press too", async () => {
		// what TanStack Router does for navigate({ viewTransition: PUSH_FORWARD }) (router-core router.js startViewTransition)
		document.startViewTransition({ update: async () => undefined, types: mod.PUSH_FORWARD.types });
		expect(started).toHaveLength(1);
		press();
		expect(started[0]!.skipTransition).toHaveBeenCalledTimes(1);
	});

	it("leaves every other router transition as it is (the other areas' motions are theirs)", async () => {
		document.startViewTransition({ update: async () => undefined, types: ["stak-news-push"] });
		document.startViewTransition(async () => undefined);
		press();
		expect(started.map((t) => t.skipTransition.mock.calls.length)).toEqual([0, 0]);
	});

	it("watches the document once, however often the module asks", () => {
		const watched = document.startViewTransition;
		mod.watchPush();
		mod.watchPush();
		expect(document.startViewTransition).toBe(watched);
	});
});

describe("the press that cuts a motion: handed over once, a double-click's second click never (LEFTOVERS review r2)", () => {
	// the control the next state puts under the pointer ("View in My STAK" where "Confirm practice buy" stood)
	let control: HTMLButtonElement;
	let heard: ReturnType<typeof vi.fn<(event: Event) => void>>;
	beforeEach(() => {
		control = document.createElement("button");
		control.textContent = "View in My STAK";
		document.body.append(control);
		heard = vi.fn<(event: Event) => void>();
		control.addEventListener("click", heard);
		(document as unknown as { elementFromPoint: unknown }).elementFromPoint = () => control;
	});
	afterEach(() => {
		control.remove();
		(document as unknown as { elementFromPoint: unknown }).elementFromPoint = () => null;
	});

	it("a single click the motion's layer caught (it reached <html>) is handed to the control under the pointer", async () => {
		mod.runTransition("smart", () => undefined);
		await settle();
		press();
		trustedClick(document.documentElement, 1);
		expect(heard).toHaveBeenCalledTimes(1);
	});

	it("the second click of a double-click (detail 2) cuts the motion and clicks nothing: the person stays on Order filled", async () => {
		mod.runTransition("smart", () => undefined);
		await settle();
		press();
		expect(started[0]!.skipTransition).toHaveBeenCalledTimes(1);
		trustedClick(document.documentElement, 2);
		expect(heard).not.toHaveBeenCalled();
		// and nothing is left waiting to hand a later click over
		trustedClick(document.documentElement, 1);
		expect(heard).not.toHaveBeenCalled();
	});

	it("a triple-click's clicks reach nothing either; the ticket's dissolve and the push behave the same", async () => {
		mod.runTransition("dissolve", () => undefined);
		await settle();
		press();
		trustedClick(document.documentElement, 3);
		document.startViewTransition({ update: async () => undefined, types: mod.PUSH_FORWARD.types });
		press();
		trustedClick(document.documentElement, 2);
		expect(heard).not.toHaveBeenCalled();
	});

	it("a double tap's second click, which found the control by itself once the layer was gone, is held back from it", async () => {
		mod.runTransition("smart", () => undefined);
		await settle();
		press(0, true, "touch");
		const second = trustedClick(control, 2);
		expect(heard).not.toHaveBeenCalled();
		expect(second.defaultPrevented).toBe(true);
	});

	it("a single tap's click, which found the control by itself, goes to it untouched (once)", async () => {
		mod.runTransition("dissolve", () => undefined);
		await settle();
		press(0, true, "touch");
		const tap = trustedClick(control, 1);
		expect(heard).toHaveBeenCalledTimes(1);
		expect(tap.defaultPrevented).toBe(false);
	});

	it("an untrusted click (a page's own) is neither handed over nor held back", async () => {
		mod.runTransition("smart", () => undefined);
		await settle();
		press();
		document.documentElement.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
		expect(heard).not.toHaveBeenCalled();
		control.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 2 }));
		expect(heard).toHaveBeenCalledTimes(1);
		// the press is cancelled: nothing is left waiting
		window.dispatchEvent(new Event("pointercancel"));
		trustedClick(document.documentElement, 1);
		expect(heard).toHaveBeenCalledTimes(1);
	});
});

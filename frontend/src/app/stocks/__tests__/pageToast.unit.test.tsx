import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sonner = vi.hoisted(() => {
	let next = 0;
	const toast = Object.assign(
		vi.fn((_message: string, _options?: unknown) => ++next),
		{ dismiss: vi.fn((_id?: string | number) => undefined) },
	);
	return {
		toast,
		reset: () => {
			next = 0;
			toast.mockClear();
			toast.dismiss.mockClear();
		},
	};
});
vi.mock("sonner", () => ({ toast: sonner.toast }));

import { BAR_CLEAR, BAR_GUTTER, type PillBox, pillPlace, usePageToast } from "../pageToast";

beforeEach(() => sonner.reset());
afterEach(() => cleanup());

const shown = () => sonner.toast.mock.calls.map((c) => c[0]);
const dismissed = () => sonner.toast.dismiss.mock.calls.map((c) => c[0]);

describe("the stock page's Save / Unsave toast (N17c)", () => {
	it("shows one confirmation at a time: the next replaces the one on screen", () => {
		const { result } = renderHook(() => usePageToast("NVDA"));
		const t = result.current.ticket();
		result.current.confirm(t, "Saved to My STAK", "icon");
		// raised through raisePill (N36.3a): the toaster gets the icon and a test id it finds the pill by
		expect(sonner.toast).toHaveBeenLastCalledWith("Saved to My STAK", expect.objectContaining({ icon: "icon", testId: expect.stringMatching(/^stak-pill-\d+$/) }));
		expect(dismissed()).toEqual([]);
		result.current.confirm(t, "Removed from My STAK");
		expect(dismissed()).toEqual([1]);
		expect(shown()).toEqual(["Saved to My STAK", "Removed from My STAK"]);
	});

	it("leaves with the page: Back (an unmount) dismisses the confirmation on screen", () => {
		const { result, unmount } = renderHook(() => usePageToast("NVDA"));
		result.current.confirm(result.current.ticket(), "Saved to My STAK");
		expect(dismissed()).toEqual([]);
		unmount();
		expect(dismissed()).toEqual([1]);
	});

	it("leaves when the route shows another stock", () => {
		const { result, rerender } = renderHook(({ page }) => usePageToast(page), { initialProps: { page: "NVDA" } });
		result.current.confirm(result.current.ticket(), "Saved to My STAK");
		rerender({ page: "NVDA" });
		expect(dismissed()).toEqual([]);
		rerender({ page: "AAPL" });
		expect(dismissed()).toEqual([1]);
		// the new page's own confirmation shows as usual
		result.current.confirm(result.current.ticket(), "Saved to My STAK");
		expect(shown()).toHaveLength(2);
	});

	it("confirms nothing on the next page when the write answers after the person has left", () => {
		const { result, unmount } = renderHook(() => usePageToast("NVDA"));
		const t = result.current.ticket();
		unmount();
		result.current.confirm(t, "Saved to My STAK");
		expect(shown()).toEqual([]);
	});

	it("always says a failure, and does not take it away with the page", () => {
		const { result, unmount } = renderHook(() => usePageToast("NVDA"));
		const t = result.current.ticket();
		result.current.confirm(t, "Saved to My STAK");
		result.current.fail(t, "Could not update My STAK. Try again.");
		// on the page it replaces the confirmation
		expect(dismissed()).toEqual([1]);
		unmount();
		// the failure (toast 2) stays up; a failure that answers after the page has gone is still said
		expect(dismissed()).toEqual([1]);
		result.current.fail(t, "Could not update My STAK. Try again.");
		expect(shown()).toEqual(["Saved to My STAK", "Could not update My STAK. Try again.", "Could not update My STAK. Try again."]);
	});

	it("replaces a failure on screen with the next confirmation", () => {
		const { result } = renderHook(() => usePageToast("NVDA"));
		const t = result.current.ticket();
		result.current.fail(t, "Could not update My STAK. Try again.");
		result.current.confirm(t, "Saved to My STAK");
		expect(dismissed()).toEqual([1]);
	});
});

describe("where a page's pill stands: never over a control (N36.3a, NW5)", () => {
	const pill: PillBox = { x: 115, y: 80, w: 160, h: 39 };
	const nothing = () => false;

	it("on a phone's shell page it stands in the pinned top bar, at its right gutter, 8 clear of the menu button", () => {
		// 390 x 844: the menu button (16..44) and its middle line at 32; the logo mark (56..144) is not a control
		const place = pillPlace({ win: { w: 390, h: 844 }, pill, bar: { middle: 32, controlsRight: 44 }, covered: () => true });
		expect(place).toEqual({ kind: "bar", middle: 32, right: 390 - BAR_GUTTER, maxWidth: 390 - BAR_GUTTER - (44 + BAR_CLEAR) });
		// as wide as its message: "Saved to My STAK" (160) and "Removed from My STAK" (192) stand right of the logo (144 + 8)
		for (const message of [160, 192]) expect(place.kind === "bar" && place.right - message).toBeGreaterThanOrEqual(144 + 8);
		// 320 x 568 (the LEFTOVERS review r2: the pill wrapped onto two lines in the 152 px right of the logo): both messages
		// stay on one line, over the logo mark where they need it, never nearer than 8 to the menu button
		const small = pillPlace({ win: { w: 320, h: 568 }, pill, bar: { middle: 32, controlsRight: 44 }, covered: () => true });
		expect(small).toMatchObject({ kind: "bar", right: 304, maxWidth: 252 });
		for (const message of [160, 192]) expect(small.kind === "bar" && small.maxWidth >= message && small.right - message >= 44 + BAR_CLEAR).toBe(true);
		// a notch's inset moves the bar's middle line down with it
		expect(pillPlace({ win: { w: 390, h: 844 }, pill, bar: { middle: 79, controlsRight: 44 }, covered: nothing })).toMatchObject({ kind: "bar", middle: 79 });
	});

	it("elsewhere it keeps the toaster's place while no control lies under it", () => {
		expect(pillPlace({ win: { w: 1440, h: 1024 }, pill: { x: 640, y: 24, w: 160, h: 39 }, bar: null, covered: nothing })).toEqual({ kind: "top" });
	});

	it("goes to the same distance from the window's bottom when a control lies under its place (the article's Unsave at 1440 scrolled 200)", () => {
		const top: PillBox = { x: 640, y: 24, w: 160, h: 39 };
		const covered = (b: PillBox) => b.y === 24;
		expect(pillPlace({ win: { w: 1440, h: 1024 }, pill: top, bar: null, covered })).toEqual({ kind: "bottom", y: 1024 - 24 - 39 });
		expect(pillPlace({ win: { w: 820, h: 1180 }, pill: { x: 330, y: 24, w: 160, h: 39 }, bar: null, covered })).toEqual({ kind: "bottom", y: 1180 - 24 - 39 });
	});

	it("is out of sight (it has spoken) when a control lies under both places", () => {
		expect(pillPlace({ win: { w: 1440, h: 1024 }, pill: { x: 640, y: 24, w: 160, h: 39 }, bar: null, covered: () => true })).toEqual({ kind: "hidden" });
		// a window too short to mirror it below its own place
		expect(pillPlace({ win: { w: 700, h: 80 }, pill: { x: 270, y: 24, w: 160, h: 39 }, bar: null, covered: (b) => b.y === 24 })).toEqual({ kind: "hidden" });
	});
});

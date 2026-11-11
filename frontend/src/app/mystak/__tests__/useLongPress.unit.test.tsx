import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOLD_MS, SLOP, useLongPress } from "../useLongPress";

const pointer = (x = 10, y = 10, extra: Partial<{ button: number; isPrimary: boolean; pointerId: number; pointerType: string }> = {}) =>
	({ button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y, ...extra }) as unknown as PointerEvent<HTMLElement>;
const mouse = () => {
	const e = { defaultPrevented: false, propagationStopped: false } as { defaultPrevented: boolean; propagationStopped: boolean };
	return Object.assign(e, {
		preventDefault: () => {
			e.defaultPrevented = true;
		},
		stopPropagation: () => {
			e.propagationStopped = true;
		},
	}) as unknown as MouseEvent<HTMLElement> & { defaultPrevented: boolean; propagationStopped: boolean };
};
const key = (k: string, mods: Partial<{ shiftKey: boolean; ctrlKey: boolean }> = {}) => {
	const e = { key: k, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...mods, defaultPrevented: false } as { key: string; defaultPrevented: boolean };
	return Object.assign(e, {
		preventDefault: () => {
			e.defaultPrevented = true;
		},
	}) as unknown as KeyboardEvent<HTMLElement> & { defaultPrevented: boolean };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useLongPress (the collection's Remove, mystak item 9)", () => {
	it("runs after a held press and swallows the click its release sends, but not the next one", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		act(() => result.current.onPointerDown(pointer()));
		act(() => vi.advanceTimersByTime(HOLD_MS - 1));
		expect(fn).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(1));
		expect(fn).toHaveBeenCalledTimes(1);
		// a touch's compatibility mousedown keeps focus where the confirm row put it
		const down = mouse();
		result.current.onMouseDown(down);
		expect(down.defaultPrevented).toBe(true);
		act(() => result.current.onPointerUp());
		const click = mouse();
		result.current.onClick(click);
		expect(click.defaultPrevented).toBe(true);
		expect(click.propagationStopped).toBe(true);
		const next = mouse();
		result.current.onClick(next);
		expect(next.defaultPrevented).toBe(false);
	});
	it("forgets a press whose click never comes", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		act(() => result.current.onPointerDown(pointer()));
		act(() => vi.advanceTimersByTime(HOLD_MS));
		act(() => result.current.onPointerUp());
		act(() => vi.advanceTimersByTime(400));
		const later = mouse();
		result.current.onClick(later);
		expect(later.defaultPrevented).toBe(false);
	});
	it("lets a short press be a click", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		act(() => result.current.onPointerDown(pointer()));
		act(() => vi.advanceTimersByTime(120));
		act(() => result.current.onPointerUp());
		act(() => vi.advanceTimersByTime(HOLD_MS));
		expect(fn).not.toHaveBeenCalled();
		const click = mouse();
		result.current.onClick(click);
		expect(click.defaultPrevented).toBe(false);
	});
	it("gives way to a scroll: a drift past the slop cancels it, a small one does not", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		act(() => result.current.onPointerDown(pointer(10, 10)));
		act(() => result.current.onPointerMove(pointer(10, 10 + SLOP - 2)));
		act(() => vi.advanceTimersByTime(HOLD_MS));
		expect(fn).toHaveBeenCalledTimes(1);
		act(() => result.current.onPointerDown(pointer(10, 10)));
		act(() => result.current.onPointerMove(pointer(10, 10 + SLOP + 1)));
		act(() => vi.advanceTimersByTime(HOLD_MS));
		expect(fn).toHaveBeenCalledTimes(1);
	});
	it("ignores a secondary button, a second finger and a cancelled press", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		act(() => result.current.onPointerDown(pointer(10, 10, { button: 2 })));
		act(() => result.current.onPointerDown(pointer(10, 10, { isPrimary: false })));
		act(() => vi.advanceTimersByTime(HOLD_MS));
		act(() => result.current.onPointerDown(pointer()));
		act(() => result.current.onPointerCancel());
		act(() => vi.advanceTimersByTime(HOLD_MS));
		expect(fn).not.toHaveBeenCalled();
	});
	it("holds the browser's long-press menu back only while the press is its own", () => {
		const { result } = renderHook(() => useLongPress(() => {}));
		const plain = mouse();
		result.current.onContextMenu(plain);
		expect(plain.defaultPrevented).toBe(false);
		act(() => result.current.onPointerDown(pointer()));
		const during = mouse();
		result.current.onContextMenu(during);
		expect(during.defaultPrevented).toBe(true);
	});
	it("is the Delete (or Backspace) key on the focused control, the phones' named action", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		const del = key("Delete");
		result.current.onKeyDown(del);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(del.defaultPrevented).toBe(true);
		result.current.onKeyDown(key("Backspace"));
		expect(fn).toHaveBeenCalledTimes(2);
		result.current.onKeyDown(key("Enter"));
		result.current.onKeyDown(key("Delete", { shiftKey: true }));
		expect(fn).toHaveBeenCalledTimes(2);
	});
	it("holds the link's native drag back while the press is pending or its own, so a hand that drifts a few pixels keeps the press (review 1)", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		const idle = mouse();
		result.current.onDragStart(idle);
		expect(idle.defaultPrevented).toBe(false);
		act(() => result.current.onPointerDown(pointer(10, 10, { pointerType: "mouse" })));
		const pendingPress = mouse();
		result.current.onDragStart(pendingPress);
		expect(pendingPress.defaultPrevented).toBe(true);
		// Chrome would start the link's drag about 5 px in; held back, the drift stays inside the slop and the press runs
		act(() => result.current.onPointerMove(pointer(14, 13, { pointerType: "mouse" })));
		act(() => vi.advanceTimersByTime(HOLD_MS));
		expect(fn).toHaveBeenCalledTimes(1);
		const fired = mouse();
		result.current.onDragStart(fired);
		expect(fired.defaultPrevented).toBe(true);
		act(() => result.current.onPointerUp());
		act(() => vi.advanceTimersByTime(HOLD_MS));
		const later = mouse();
		result.current.onDragStart(later);
		expect(later.defaultPrevented).toBe(false);
	});
	it("treats a mouse that moves past the slop as a drag whose release opens nothing, and leaves a finger's scroll to the browser", () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useLongPress(fn));
		act(() => result.current.onPointerDown(pointer(10, 10, { pointerType: "mouse" })));
		act(() => result.current.onPointerMove(pointer(40, 10, { pointerType: "mouse" })));
		act(() => vi.advanceTimersByTime(HOLD_MS));
		expect(fn).not.toHaveBeenCalled();
		act(() => result.current.onPointerUp());
		const dragRelease = mouse();
		result.current.onClick(dragRelease);
		expect(dragRelease.defaultPrevented).toBe(true);
		act(() => result.current.onPointerDown(pointer(10, 10, { pointerType: "touch" })));
		act(() => result.current.onPointerMove(pointer(10, 40, { pointerType: "touch" })));
		act(() => vi.advanceTimersByTime(HOLD_MS));
		expect(fn).not.toHaveBeenCalled();
		act(() => result.current.onPointerUp());
		const scrollRelease = mouse();
		result.current.onClick(scrollRelease);
		expect(scrollRelease.defaultPrevented).toBe(false);
	});
});

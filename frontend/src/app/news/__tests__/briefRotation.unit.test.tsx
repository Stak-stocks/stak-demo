import { act, renderHook } from "@testing-library/react";
import type { FocusEvent, MouseEvent, PointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRIEF_INTERVAL_MS, SWIPE_MIN_PX, swipeStep, swipeTarget, useBriefRotation, useBriefSwipe } from "../briefRotation";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** a focus event as React hands it to the card: the control that took focus, and where focus came from / goes */
const focusEvent = (target: Element, currentTarget: Element, relatedTarget: Element | null = null) =>
	({ target, currentTarget, relatedTarget }) as unknown as FocusEvent<HTMLElement>;

describe("the Today's brief rotation", () => {
	it("shows the first brief at load and the next one every 25 seconds, the last wrapping to the first", () => {
		const { result } = renderHook(() => useBriefRotation(3));
		expect(BRIEF_INTERVAL_MS).toBe(25_000);
		expect(result.current.index).toBe(0);
		advance(24_999);
		expect(result.current.index).toBe(0);
		advance(1);
		expect(result.current.index).toBe(1);
		advance(25_000);
		expect(result.current.index).toBe(2);
		advance(25_000);
		expect(result.current.index).toBe(0);
	});

	it("holds while the pointer rests on the card and starts a full interval once it leaves", () => {
		const { result } = renderHook(() => useBriefRotation(3));
		advance(20_000);
		act(() => result.current.bind.onPointerEnter());
		expect(result.current.paused).toBe(true);
		advance(60_000);
		expect(result.current.index).toBe(0);
		act(() => result.current.bind.onPointerLeave());
		advance(24_000);
		expect(result.current.index).toBe(0);
		advance(1_000);
		expect(result.current.index).toBe(1);
	});

	it("holds while a control inside has keyboard focus, until the focus leaves the card", () => {
		const card = document.createElement("div");
		const dot = document.createElement("button");
		const outside = document.createElement("a");
		card.append(dot);
		document.body.append(card, outside);
		dot.matches = ((sel: string) => sel === ":focus-visible") as unknown as typeof dot.matches; // a keyboard focus (its ring shows)
		const { result } = renderHook(() => useBriefRotation(3));
		act(() => result.current.bind.onFocus(focusEvent(dot, card)));
		expect(result.current.paused).toBe(true);
		advance(50_000);
		expect(result.current.index).toBe(0);
		// focus moving inside the card keeps it held
		act(() => result.current.bind.onBlur(focusEvent(dot, card, dot)));
		expect(result.current.paused).toBe(true);
		act(() => result.current.bind.onBlur(focusEvent(dot, card, outside)));
		expect(result.current.paused).toBe(false);
		advance(25_000);
		expect(result.current.index).toBe(1);
		card.remove();
		outside.remove();
	});

	it("does not hold for a mouse click's focus (no ring): the pointer alone decides", () => {
		const card = document.createElement("div");
		const dot = document.createElement("button");
		card.append(dot);
		dot.matches = (() => false) as unknown as typeof dot.matches;
		const { result } = renderHook(() => useBriefRotation(3));
		act(() => result.current.bind.onFocus(focusEvent(dot, card)));
		expect(result.current.paused).toBe(false);
	});

	it("jumps to a dot's brief and gives it a full interval, also when it is already on show", () => {
		const { result } = renderHook(() => useBriefRotation(3));
		advance(10_000);
		act(() => result.current.go(2));
		expect(result.current.index).toBe(2);
		advance(24_000);
		expect(result.current.index).toBe(2);
		act(() => result.current.go(2));
		advance(24_000);
		expect(result.current.index).toBe(2);
		advance(1_000);
		expect(result.current.index).toBe(0);
	});

	it("never moves with a single brief", () => {
		const { result } = renderHook(() => useBriefRotation(1));
		advance(100_000);
		expect(result.current.index).toBe(0);
	});

	it("opens on the brief the person left (a return to the listing) and gives it a full interval", () => {
		const { result } = renderHook(() => useBriefRotation(3, BRIEF_INTERVAL_MS, 1));
		expect(result.current.index).toBe(1);
		advance(24_999);
		expect(result.current.index).toBe(1);
		advance(1);
		expect(result.current.index).toBe(2);
		advance(25_000);
		expect(result.current.index).toBe(0);
	});

	it("reads the start once, as the card mounts, and opens on the first brief for one the card does not have", () => {
		const { result, rerender } = renderHook(({ start }: { start: number }) => useBriefRotation(3, BRIEF_INTERVAL_MS, start), { initialProps: { start: 2 } });
		expect(result.current.index).toBe(2);
		// the listing reports the brief back as it shows: a new `start` never moves a card already on show
		rerender({ start: 0 });
		expect(result.current.index).toBe(2);
		for (const off of [3, -1, 1.5, Number.NaN]) {
			const { result: r } = renderHook(() => useBriefRotation(3, BRIEF_INTERVAL_MS, off));
			expect(r.current.index, String(off)).toBe(0);
		}
		// a search's two hits: the third brief's index is not theirs
		expect(renderHook(() => useBriefRotation(2, BRIEF_INTERVAL_MS, 2)).result.current.index).toBe(0);
	});
});

describe("the brief pages on a touch swipe (news #10, D9)", () => {
	const pointer = (type: string, x: number, y: number, pointerType = "touch", pointerId = 1) =>
		({ pointerType, pointerId, isPrimary: true, clientX: x, clientY: y, type }) as unknown as PointerEvent<HTMLElement>;
	const click = () => {
		const e = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
		return e as unknown as MouseEvent<HTMLElement> & { preventDefault: ReturnType<typeof vi.fn> };
	};

	it("turns on a clearly sideways move of at least 40 px: finger left = next, right = previous (the phones' pager)", () => {
		expect(SWIPE_MIN_PX).toBe(40);
		expect(swipeStep(-60, 5)).toBe(1);
		expect(swipeStep(60, -5)).toBe(-1);
		expect(swipeStep(-39, 0)).toBe(0); // a wobbly tap
		expect(swipeStep(-60, 55)).toBe(0); // mostly the page's scroll
		expect(swipeStep(Number.NaN, 0)).toBe(0);
	});

	it("a finger swipe turns the brief through the rotation's go (restarting the 25 s clock); a mouse drag does not", () => {
		const { result } = renderHook(() => {
			const rotation = useBriefRotation(3);
			const swipe = useBriefSwipe((step) => rotation.go(rotation.index + step));
			return { rotation, swipe };
		});
		advance(20_000);
		act(() => {
			result.current.swipe.onPointerDown(pointer("pointerdown", 300, 100));
			result.current.swipe.onPointerUp(pointer("pointerup", 200, 110));
		});
		expect(result.current.rotation.index).toBe(1);
		// the clock restarted: the next brief comes a full 25 s after the swipe, not 5 s later
		advance(24_000);
		expect(result.current.rotation.index).toBe(1);
		advance(1_000);
		expect(result.current.rotation.index).toBe(2);
		// a swipe to the right goes back, wrapping like the rotation
		act(() => {
			result.current.swipe.onPointerDown(pointer("pointerdown", 100, 100));
			result.current.swipe.onPointerUp(pointer("pointerup", 220, 100));
		});
		expect(result.current.rotation.index).toBe(1);
		act(() => {
			result.current.swipe.onPointerDown(pointer("pointerdown", 300, 100, "mouse"));
			result.current.swipe.onPointerUp(pointer("pointerup", 100, 100, "mouse"));
		});
		expect(result.current.rotation.index).toBe(1);
	});

	it("a vertical scroll (the browser cancels the pointer) and a tap turn nothing; a tap's click goes through", () => {
		const turn = vi.fn();
		const { result } = renderHook(() => useBriefSwipe(turn));
		act(() => {
			result.current.onPointerDown(pointer("pointerdown", 100, 100));
			result.current.onPointerCancel();
			result.current.onPointerUp(pointer("pointerup", 0, 100));
		});
		act(() => {
			result.current.onPointerDown(pointer("pointerdown", 100, 100));
			result.current.onPointerUp(pointer("pointerup", 104, 102));
		});
		expect(turn).not.toHaveBeenCalled();
		const tap = click();
		result.current.onClickCapture(tap);
		expect(tap.preventDefault).not.toHaveBeenCalled();
	});

	it("swallows the click a swipe leaves on the card's stretched link (a page turn is not a visit to the article)", () => {
		const turn = vi.fn();
		const { result } = renderHook(() => useBriefSwipe(turn));
		act(() => {
			result.current.onPointerDown(pointer("pointerdown", 300, 100));
			result.current.onPointerUp(pointer("pointerup", 150, 100));
		});
		expect(turn).toHaveBeenCalledWith(1);
		const after = click();
		result.current.onClickCapture(after);
		expect(after.preventDefault).toHaveBeenCalled();
		// only that one click: the next tap opens the article again
		const next = click();
		result.current.onClickCapture(next);
		expect(next.preventDefault).not.toHaveBeenCalled();
	});
});

describe("a swipe stops at the ends, as the phones' pagers do (android NewsScreen.kt:257-266, iOS NewsView.swift:199)", () => {
	it("turns to the neighbour inside the briefs and to nothing past the first or the last", () => {
		expect(swipeTarget(0, 1, 3)).toBe(1);
		expect(swipeTarget(1, 1, 3)).toBe(2);
		expect(swipeTarget(2, 1, 3)).toBeNull();
		expect(swipeTarget(0, -1, 3)).toBeNull();
		expect(swipeTarget(2, -1, 3)).toBe(1);
		expect(swipeTarget(1, -1, 3)).toBe(0);
		// a search's single brief: nowhere to turn
		expect(swipeTarget(0, 1, 1)).toBeNull();
		expect(swipeTarget(0, -1, 1)).toBeNull();
	});
});

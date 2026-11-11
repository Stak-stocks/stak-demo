import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTradeRequest } from "../useTradeRequest";

afterEach(cleanup);

describe("pending trade lifetime", () => {
	it("prevents another order while a dismissed ticket's request is pending", () => {
		const { result, rerender } = renderHook(({ scope }) => useTradeRequest(scope), { initialProps: { scope: "NVDA:buy" } });
		let request!: NonNullable<ReturnType<typeof result.current.begin>>;
		act(() => { request = result.current.begin()!; });
		expect(result.current.pending).toBe(true);
		rerender({ scope: "NVDA:page" });
		rerender({ scope: "NVDA:buy-again" });
		expect(request.isCurrent()).toBe(false);
		expect(result.current.begin()).toBeNull();
		act(() => request.finish());
		expect(result.current.pending).toBe(false);
		act(() => { request = result.current.begin()!; });
		expect(request.isCurrent()).toBe(true);
		act(() => request.finish());
	});

	it("ignores results after navigating to another stock or account", () => {
		const { result, rerender } = renderHook(({ scope }) => useTradeRequest(scope), { initialProps: { scope: "alice:NVDA:buy" } });
		let request!: NonNullable<ReturnType<typeof result.current.begin>>;
		act(() => { request = result.current.begin()!; });
		rerender({ scope: "bob:AAPL:buy" });
		expect(request.isCurrent()).toBe(false);
		act(() => request.finish());
	});

	it("does not reopen a result after unmount", () => {
		const { result, unmount } = renderHook(() => useTradeRequest("sell"));
		let request!: NonNullable<ReturnType<typeof result.current.begin>>;
		act(() => { request = result.current.begin()!; });
		unmount();
		expect(request.isCurrent()).toBe(false);
		expect(() => request.finish()).not.toThrow();
	});

	it("finishes each request only once", () => {
		const { result } = renderHook(() => useTradeRequest("sell"));
		let first!: NonNullable<ReturnType<typeof result.current.begin>>;
		let second!: NonNullable<ReturnType<typeof result.current.begin>>;
		act(() => { first = result.current.begin()!; });
		act(() => first.finish());
		act(() => { second = result.current.begin()!; });
		act(() => first.finish());
		expect(result.current.pending).toBe(true);
		act(() => second.finish());
	});
});

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_SWIPE_LIMIT, getTodayKey, useSwipeLimit } from "../useSwipeLimit";
import { useAccount } from "@/context/AccountContext";

vi.mock("@/context/AccountContext", () => ({
	useAccount: vi.fn(),
}));

const mockedUseAccount = vi.mocked(useAccount);

describe("useSwipeLimit", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-02T10:00:00.000Z"));
		mockedUseAccount.mockReturnValue({
			account: null,
			accountLoading: false,
			incrementSwipeCount: vi.fn().mockResolvedValue(undefined),
		} as any);
	});

	it("getTodayKey returns previous day before 9 AM", () => {
		vi.setSystemTime(new Date("2026-03-02T08:59:00.000Z"));
		expect(getTodayKey()).toBe("2026-03-01");
	});

	it("guest increment updates localStorage and count", () => {
		const { result } = renderHook(() => useSwipeLimit("guest1", false));

		expect(result.current.count).toBe(0);
		act(() => result.current.increment());

		expect(result.current.count).toBe(1);
		const raw = localStorage.getItem("daily-swipe-state:guest1");
		expect(raw).toContain('"count":1');
	});

	it("logged-in increment calls incrementSwipeCount", () => {
		const incrementSwipeCount = vi.fn().mockResolvedValue(undefined);
		mockedUseAccount.mockReturnValue({
			account: { dailySwipeState: { date: "2026-03-02", count: 3 } },
			accountLoading: false,
			incrementSwipeCount,
		} as any);

		const { result } = renderHook(() => useSwipeLimit("u1", true));

		act(() => result.current.increment());
		expect(incrementSwipeCount).toHaveBeenCalledTimes(1);
	});

	it("reports hasReachedLimit at DAILY_SWIPE_LIMIT", () => {
		// Derive the key the same way the hook does so timezone/fake-timer
		// interactions don't cause a mismatch.
		const today = getTodayKey();
		mockedUseAccount.mockReturnValue({
			account: { dailySwipeState: { date: today, count: DAILY_SWIPE_LIMIT } },
			accountLoading: false,
			incrementSwipeCount: vi.fn(),
		} as any);

		const { result } = renderHook(() => useSwipeLimit("u1", true));
		expect(result.current.hasReachedLimit).toBe(true);
		expect(result.current.remaining).toBe(0);
	});
});

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
			incrementSwipeCount: vi.fn().mockResolvedValue({ accepted: true, count: 1, limit: 20 }),
		} as any);
	});

	it("getTodayKey returns previous day before 9 AM", () => {
		vi.setSystemTime(new Date("2026-03-02T08:59:00.000Z"));
		expect(getTodayKey()).toBe("2026-03-01");
	});

	it("guest increment updates localStorage and count", async () => {
		const { result } = renderHook(() => useSwipeLimit("guest1", false));

		expect(result.current.count).toBe(0);
		await act(async () => { await result.current.increment(); });

		expect(result.current.count).toBe(1);
		const raw = localStorage.getItem("daily-swipe-state:guest1");
		expect(raw).toContain('"count":1');
	});

	it("logged-in increment calls incrementSwipeCount and returns its accepted flag", async () => {
		const incrementSwipeCount = vi.fn().mockResolvedValue({ accepted: true, count: 4, limit: 20 });
		mockedUseAccount.mockReturnValue({
			account: { dailySwipeState: { date: "2026-03-02", count: 3 } },
			accountLoading: false,
			incrementSwipeCount,
		} as any);

		const { result } = renderHook(() => useSwipeLimit("u1", true));

		let accepted: boolean | undefined;
		await act(async () => { accepted = await result.current.increment(); });
		expect(incrementSwipeCount).toHaveBeenCalledTimes(1);
		expect(accepted).toBe(true);
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

	it("bumpOptimistic makes hasReachedLimit accurate instantly, without waiting on the server", () => {
		const today = getTodayKey();
		mockedUseAccount.mockReturnValue({
			account: { dailySwipeState: { date: today, count: DAILY_SWIPE_LIMIT - 1 } },
			accountLoading: false,
			incrementSwipeCount: vi.fn(),
		} as any);

		const { result } = renderHook(() => useSwipeLimit("u1", true));
		expect(result.current.hasReachedLimit).toBe(false);

		act(() => result.current.bumpOptimistic());
		expect(result.current.hasReachedLimit).toBe(true);
	});

	it("reportSwipeResult(false, ...) snaps the optimistic count to the server's limit on rejection", () => {
		const today = getTodayKey();
		mockedUseAccount.mockReturnValue({
			account: { dailySwipeState: { date: today, count: 0 } },
			accountLoading: false,
			incrementSwipeCount: vi.fn(),
		} as any);

		const { result } = renderHook(() => useSwipeLimit("u1", true));
		act(() => result.current.reportSwipeResult(false, 20, 20));
		expect(result.current.hasReachedLimit).toBe(true);
	});

	it("optimistic bump resets when the day rolls over, instead of carrying over forever", () => {
		const day1 = getTodayKey();
		mockedUseAccount.mockReturnValue({
			account: { dailySwipeState: { date: day1, count: 5 } },
			accountLoading: false,
			incrementSwipeCount: vi.fn(),
		} as any);

		const { result, rerender } = renderHook(() => useSwipeLimit("u1", true));
		act(() => result.current.bumpOptimistic());
		expect(result.current.count).toBe(6); // max(5 server, 6 optimistic)

		// Roll the clock forward a full day (clearly past any 9am-boundary ambiguity)
		// and re-derive today's key the same way the hook does, rather than hand-
		// picking a UTC timestamp and guessing how it maps through the local 9am
		// reset offset.
		vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
		const day2 = getTodayKey();
		mockedUseAccount.mockReturnValue({
			account: { dailySwipeState: { date: day1, count: 5 } }, // stale, yesterday's
			accountLoading: false,
			incrementSwipeCount: vi.fn(),
		} as any);
		rerender();

		expect(day2).not.toBe(day1);
		// Server count resets to 0 (stored date no longer matches today), and the
		// stale optimistic bump from yesterday must not carry over either.
		expect(result.current.count).toBe(0);
	});
});

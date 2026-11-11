import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// the store as the hook sees it: ready, who is here, the day the brief was last read, and its action
const setLastBriefDate = vi.fn();
let live = { ready: true, uid: null as string | null, lastBriefDate: null as string | null, actions: { setLastBriefDate } };
vi.mock("@/app/live/store", () => ({ useLive: () => live }));

import { getLocalDateKey } from "@/lib/utils";
import { BRIEF_STORY_IDS, briefUnread, useBriefRead } from "../briefRead";

beforeEach(() => {
	setLastBriefDate.mockClear();
	live = { ready: true, uid: null, lastBriefDate: null, actions: { setLastBriefDate } };
});

describe("reading the brief clears 'Your daily brief is ready' (news #12)", () => {
	it("the brief's stories are the carousel's three: the Dow, the Fed minutes, the June jobs story", () => {
		expect([...BRIEF_STORY_IDS]).toEqual(["dow-record-chips", "fed-minutes", "june-jobs-miss"]);
		expect(BRIEF_STORY_IDS.has("nvidia-chip-rally")).toBe(false);
	});

	it("records today once the brief is shown, with the store's own action", () => {
		renderHook(() => useBriefRead(true));
		expect(setLastBriefDate).toHaveBeenCalledTimes(1);
		expect(setLastBriefDate).toHaveBeenCalledWith(getLocalDateKey());
	});

	it("writes nothing when the brief is not shown (a search that hides it), already read today, or the store not ready", () => {
		renderHook(() => useBriefRead(false));
		live = { ...live, lastBriefDate: getLocalDateKey() };
		renderHook(() => useBriefRead(true));
		live = { ...live, lastBriefDate: null, ready: false };
		renderHook(() => useBriefRead(true));
		expect(setLastBriefDate).not.toHaveBeenCalled();
	});

	it("writes once per person and day, even while an account's document has not caught up", () => {
		const { rerender } = renderHook(() => useBriefRead(true));
		live = { ...live, actions: { setLastBriefDate } };
		rerender();
		rerender();
		expect(setLastBriefDate).toHaveBeenCalledTimes(1);
		expect(briefUnread(null, "2026-11-07")).toBe(true);
		expect(briefUnread("2026-11-06", "2026-11-07")).toBe(true);
		expect(briefUnread("2026-11-07", "2026-11-07")).toBe(false);
	});
});

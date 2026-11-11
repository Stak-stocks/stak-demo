import { describe, expect, it } from "vitest";
import type { DeckProgress } from "@/app/live";
import { canReplayDeck, recordKept } from "../run";
import { FLING_MIN, SWIPE_COMMIT, swipeDecision, TAP_SLOP } from "../swipe";

const run = (over: Partial<DeckProgress> = {}): DeckProgress => ({
	date: "2026-11-07",
	theme: "ai-chips",
	order: ["NVDA", "AAPL", "GOOGL"],
	index: 1,
	saved: [],
	passed: [],
	bought: [],
	...over,
});

describe("a kept card counts as the run's save (discover-stock #7)", () => {
	it("records a card the person moves past while it shows Saved", () => {
		expect(recordKept(run(), "AAPL", "2026-11-07", "ai-chips")?.saved).toEqual(["AAPL"]);
	});
	it("turns an earlier pass of that card into the save", () => {
		const next = recordKept(run({ passed: ["AAPL"] }), "AAPL", "2026-11-07", "ai-chips")!;
		expect(next.saved).toEqual(["AAPL"]);
		expect(next.passed).toEqual([]);
	});
	it("leaves a card already saved or bought in this run as it is", () => {
		const saved = run({ saved: ["AAPL"] });
		expect(recordKept(saved, "AAPL", "2026-11-07", "ai-chips")).toBe(saved);
		const bought = run({ bought: ["AAPL"] });
		expect(recordKept(bought, "AAPL", "2026-11-07", "ai-chips")).toBe(bought);
	});
	it("never writes into another day's or another theme's deck", () => {
		const old = run({ date: "2026-11-06" });
		expect(recordKept(old, "AAPL", "2026-11-07", "ai-chips")).toBe(old);
		expect(recordKept(run(), "AAPL", "2026-11-07", "brands")?.saved).toEqual([]);
		expect(recordKept(null, "AAPL", "2026-11-07", "ai-chips")).toBeNull();
	});
	it("offers the replay only while a card of the deck is not saved", () => {
		expect(canReplayDeck(["NVDA", "AAPL"], new Set(["NVDA"]))).toBe(true);
		expect(canReplayDeck(["NVDA", "AAPL"], new Set(["NVDA", "AAPL", "MSFT"]))).toBe(false);
		expect(canReplayDeck([], new Set())).toBe(true);
	});
});

describe("a finger's swipe on the front card (discover-stock #15)", () => {
	it("passes on a long swipe to the left and goes back on one to the right", () => {
		expect(swipeDecision(-SWIPE_COMMIT, 10, 600)).toBe("pass");
		expect(swipeDecision(SWIPE_COMMIT + 5, -8, 600)).toBe("previous");
	});
	it("commits a quick flick with less travel", () => {
		expect(swipeDecision(-FLING_MIN, 0, 50)).toBe("pass");
		expect(swipeDecision(-FLING_MIN, 0, 400)).toBeNull();
	});
	it("leaves taps, short drags and vertical scrolls alone", () => {
		expect(swipeDecision(-(TAP_SLOP - 1), 0, 10)).toBeNull();
		expect(swipeDecision(-60, 0, 500)).toBeNull();
		expect(swipeDecision(-150, 140, 300)).toBeNull();
		expect(swipeDecision(0, 300, 200)).toBeNull();
	});
});

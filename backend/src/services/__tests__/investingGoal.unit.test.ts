import { describe, expect, it } from "vitest";
import {
	CHECK_IN_AGAIN_DAYS, GOAL_EXPLORE, GOAL_FIRST_STOCKS, GOAL_GROW, GOAL_LEARN,
	briefGoalRule, chatGoalLine, checkInDue, goalOf, knownTerms, termsIn,
} from "../investingGoal.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-03T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

describe("investing goal", () => {
	it("reads the quiz goal from preferences, -1 without one", () => {
		expect(goalOf({ android_taste: { goal: 1, risk: 0, riskStyle: "", picks: [] } })).toBe(1);
		expect(goalOf({ android_taste: { goal: "1" } })).toBe(-1);
		expect(goalOf({})).toBe(-1);
		expect(goalOf(null)).toBe(-1);
	});

	it("has a line for learning and growing; first stocks, exploring or no answer leave the prompts alone", () => {
		expect(chatGoalLine(GOAL_LEARN)).toMatch(/Define each investing term the first time/);
		// A learner asking only about terms they already know gets no line for that question; anything new keeps it.
		expect(chatGoalLine(GOAL_LEARN, ["P/E ratio", "beta"], "What's Tesla's P/E?")).toBe("Learning how investing works, and already knows P/E ratio: use it without explaining what it means.");
		// Asking what one means still gets the explanation.
		expect(chatGoalLine(GOAL_LEARN, ["P/E ratio"], "What does P/E mean?")).toMatch(/Define each investing term/);
		expect(chatGoalLine(GOAL_LEARN, ["P/E ratio"], "what's a P/E?")).toMatch(/Define each investing term/);
		expect(chatGoalLine(GOAL_LEARN, ["P/E ratio"], "Tesla's P/E and market cap?")).toMatch(/Define each investing term/);
		expect(chatGoalLine(GOAL_LEARN, ["P/E ratio"], "Why is Nvidia up?")).toMatch(/Define each investing term/);
		expect(chatGoalLine(GOAL_GROW, ["P/E ratio"], "What's Tesla's P/E?")).toMatch(/longer record/);
		expect(chatGoalLine(GOAL_GROW)).toMatch(/longer record/);
		expect(chatGoalLine(GOAL_FIRST_STOCKS)).toBeNull();
		expect(chatGoalLine(GOAL_EXPLORE)).toBeNull();
		expect(chatGoalLine(-1)).toBeNull();
		expect(briefGoalRule(GOAL_LEARN)).toMatch(/plain words/);
		expect(briefGoalRule(GOAL_FIRST_STOCKS)).toBeNull();
		expect(briefGoalRule(-1)).toBeNull();
	});

	it("spots the terms an answer used", () => {
		expect(termsIn("Tesla's P/E is 180, so investors pay $180 for each $1 of yearly profit. Its market cap is $1.2T.")).toEqual(["P/E ratio", "market cap"]);
		expect(termsIn("It beat analysts' estimates on earnings per share.")).toEqual(["EPS (earnings per share)", "analyst estimates"]);
		expect(termsIn("Its operating margin widened, and Jefferies upgraded it to Buy.")).toEqual(["analyst upgrades and downgrades", "profit margins"]);
		expect(termsIn("A beta of 1.8 means it swings more than the market.")).toEqual(["beta"]);
		expect(termsIn("Hi! What would you like to know?")).toEqual([]);
	});

	it("doesn't take everyday words for the terms", () => {
		expect(termsIn("The iPhone upgrade cycle helped. The company estimates demand stayed strong.")).toEqual([]);
		expect(termsIn("It won by a narrow margin, and the iOS beta added features.")).toEqual([]);
		expect(termsIn("Apple's beta version shipped, and the consensus view is mixed.")).toEqual([]);
	});

	it("takes a term as known after two answers used it", () => {
		expect(knownTerms({ "P/E ratio": 2, "market cap": 1, beta: 5 })).toEqual(["P/E ratio", "beta"]);
		expect(knownTerms({ "not a term": 9 })).toEqual([]);
		expect(knownTerms(null)).toEqual([]);
	});

	describe("Home's check-in", () => {
		it("is for a learner whose account is a month old", () => {
			expect(checkInDue(GOAL_LEARN, ago(30), null, NOW)).toEqual({ reason: "months", count: 1 });
			expect(checkInDue(GOAL_LEARN, ago(29), null, NOW)).toBeNull();
			expect(checkInDue(GOAL_LEARN, ago(95), null, NOW)).toEqual({ reason: "months", count: 3 });
			expect(checkInDue(GOAL_GROW, ago(400), null, NOW)).toBeNull();
			expect(checkInDue(-1, ago(400), null, NOW)).toBeNull();
			expect(checkInDue(GOAL_LEARN, null, null, NOW)).toBeNull();
		});

		it("after 'Keep the basics', comes back once, two months later", () => {
			const keptAt = (days: number) => ({ asks: 1, lastAskedAt: ago(days), last: "keep" as const });
			expect(checkInDue(GOAL_LEARN, ago(89), keptAt(CHECK_IN_AGAIN_DAYS - 1), NOW)).toBeNull();
			expect(checkInDue(GOAL_LEARN, ago(90), keptAt(CHECK_IN_AGAIN_DAYS), NOW)).toEqual({ reason: "months", count: 3 });
			expect(checkInDue(GOAL_LEARN, ago(400), { asks: 2, lastAskedAt: ago(300), last: "keep" }, NOW)).toBeNull();
			// A bad date never brings it back.
			expect(checkInDue(GOAL_LEARN, ago(400), { asks: 1, lastAskedAt: "nonsense", last: "keep" }, NOW)).toBeNull();
		});
	});
});

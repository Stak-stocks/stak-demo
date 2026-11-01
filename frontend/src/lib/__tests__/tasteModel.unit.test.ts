import { describe, expect, it } from "vitest";
import { scores, riskStyle, bars, chips, BRAND_PICK_NAMES, toSharedPickNames, GOAL_GROW, GOAL_EXPLORE, RISK_BUY_MORE, RISK_HOLD, RISK_SELL_SOME } from "@/lib/tasteModel";

describe("tasteModel", () => {
	it("no picks + neutral goal/risk yields all-zero group shares", () => {
		// GOAL_EXPLORE (nudges nothing) and RISK_HOLD (nudges nothing) are
		// the only truly neutral combination, since every other goal/risk index adds some nudge.
		const [tech, growth, consumer, income] = scores(new Set(), GOAL_EXPLORE, RISK_HOLD);
		expect(tech).toBe(0);
		expect(growth).toBe(0);
		expect(consumer).toBe(0);
		expect(income).toBe(0);
	});

	it("growth goal + buy-more risk both nudge the growth score up", () => {
		const [, growthBase] = scores(new Set(["Tesla", "Nike"]), 0, 0);
		const [, growthNudged] = scores(new Set(["Tesla", "Nike"]), GOAL_GROW, RISK_BUY_MORE);
		expect(growthNudged).toBeGreaterThan(growthBase);
	});

	it("sell-some risk lowers growth and raises income", () => {
		const [, growthNeutral, , incomeNeutral] = scores(new Set(["Tesla"]), 0, 0);
		const [, growthSell, , incomeSell] = scores(new Set(["Tesla"]), 0, RISK_SELL_SOME);
		expect(growthSell).toBeLessThan(growthNeutral);
		expect(incomeSell).toBeGreaterThan(incomeNeutral);
	});

	it("scores never leave the 0..1 range", () => {
		const all = scores(new Set(["Tesla", "NVIDIA", "Coinbase", "Uber"]), GOAL_GROW, RISK_BUY_MORE);
		for (const s of all) {
			expect(s).toBeGreaterThanOrEqual(0);
			expect(s).toBeLessThanOrEqual(1);
		}
	});

	it("riskStyle maps every index to the exact backend-expected string", () => {
		expect(riskStyle(0)).toBe("Growth-Oriented");
		expect(riskStyle(1)).toBe("Balanced");
		expect(riskStyle(2)).toBe("Conservative");
		expect(riskStyle(3)).toBe("Cautious");
	});

	it("bars never go fully empty even at a zero score", () => {
		const result = bars(new Set(), 0, 0);
		expect(result).toHaveLength(4);
		for (const bar of result) expect(bar.fraction).toBeGreaterThanOrEqual(0.2);
	});

	it("chips falls back to Just Exploring when nothing clears a threshold", () => {
		expect(chips(new Set(), GOAL_EXPLORE, RISK_HOLD)).toEqual(["Just Exploring"]);
	});
});

describe("brand pick tiles", () => {
	it("every tile name exists in the real brand catalog (a missing one silently drops its tile)", async () => {
		const { brands } = await import("@stak/shared/brands");
		const names = new Set(brands.map((b: { name: string }) => b.name));
		const missing = BRAND_PICK_NAMES.filter((n) => !names.has(n));
		expect(missing).toEqual([]);
	});

	it("saves Sony as Android's PlayStation and leaves other picks alone", () => {
		expect(toSharedPickNames(["Apple", "Sony Group Corp"])).toEqual(["Apple", "PlayStation"]);
	});
});

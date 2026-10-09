import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/postgres.js", () => ({ pgQuery: vi.fn() }));
vi.mock("../../lib/cache.js", () => ({ cacheDelete: vi.fn() }));

const { tasteFromPicks } = await import("../tasteProfileService.js");

describe("tasteFromPicks - onboarding's brand picks as a starting taste", () => {
	it("counts each pick as a right swipe on its brand (+5 x each tag's weight)", () => {
		const scores = tasteFromPicks(["Tesla"]);
		expect(scores).toMatchObject({ electric_vehicles: 5, auto: 5, consumer_brand: 5, high_growth: 3.75, speculative: 3.75 });
	});

	it("reads every app's names: Sony is \"PlayStation\" on the apps and \"Sony Group Corp\" on the web", () => {
		expect(tasteFromPicks(["PlayStation"])).toEqual(tasteFromPicks(["Sony Group Corp"]));
		expect(Object.keys(tasteFromPicks(["PlayStation"])).length).toBeGreaterThan(0);
	});

	it("adds up shared tags across picks, once per brand, and ignores names it doesn't know", () => {
		const one = tasteFromPicks(["Apple"]);
		const two = tasteFromPicks(["Apple", "Microsoft", "apple", "Not A Brand"]);
		expect(two.technology).toBe(one.technology! * 2);
		expect(tasteFromPicks(["Not A Brand"])).toEqual({});
	});
});

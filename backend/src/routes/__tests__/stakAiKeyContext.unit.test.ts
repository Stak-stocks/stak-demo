import { describe, expect, it, vi } from "vitest";

// stakAi.ts reads the database and Gemini helpers at import; keyContext needs neither.
vi.mock("../../lib/postgres.js", () => ({ pgQuery: vi.fn(), pgPool: { connect: vi.fn() } }));

describe("STAK AI key context", () => {
	it("says the facts that matter for nearly any question: a big year, a price at its year's low, revenue vs the stock", async () => {
		const { keyContext } = await import("../stakAi.js");
		// Roblox in the test set: revenue up, the stock down 62% and near its low - left out of an answer two runs in three.
		expect(keyContext({ price: 51, week52Low: 50, week52High: 150, yearReturn: -62, revenueGrowthQuarterYoy: 28, epsGrowthQuarterYoy: null }))
			.toEqual([
				"the stock is down 62.0% over the past year",
				"the price is close to the lowest it's been in the past year",
				"revenue grew in the latest quarter while the stock fell over the past year",
			]);
		expect(keyContext({ price: 340, week52Low: 243, week52High: 345, yearReturn: 32.5, revenueGrowthQuarterYoy: 16.4 }))
			.toEqual(["the price is close to the highest it's been in the past year"]);
		expect(keyContext({ price: 600, yearReturn: 161, revenueGrowthQuarterYoy: -3 }))
			.toEqual(["the stock is up 161.0% over the past year", "the stock rose over the past year while revenue shrank in the latest quarter"]);
	});

	it("doesn't call a business growing when only EPS grew and revenue shrank", async () => {
		const { keyContext } = await import("../stakAi.js");
		expect(keyContext({ price: 100, yearReturn: -30, revenueGrowthQuarterYoy: -8, epsGrowthQuarterYoy: 12 })).toEqual(["the stock is down 30.0% over the past year"]);
		// No revenue figure: EPS stands in.
		expect(keyContext({ price: 100, yearReturn: -30, epsGrowthQuarterYoy: 12 }))
			.toEqual(["the stock is down 30.0% over the past year", "earnings per share grew in the latest quarter while the stock fell over the past year"]);
	});

	it("reads the year's range carefully: too narrow says nothing, past it says so", async () => {
		const { keyContext } = await import("../stakAi.js");
		// 100-104: at 103.9 it's at the high, not the low - and the range is too narrow to mean anything.
		expect(keyContext({ price: 103.9, week52Low: 100, week52High: 104, yearReturn: 3 })).toEqual([]);
		expect(keyContext({ price: 45, week52Low: 50, week52High: 150, yearReturn: -10 })).toEqual(["the price is below its lowest of the past year"]);
		expect(keyContext({ price: 160, week52Low: 50, week52High: 150, yearReturn: 10 })).toEqual(["the price is above its highest of the past year"]);
	});

	it("says nothing when nothing stands out", async () => {
		const { keyContext } = await import("../stakAi.js");
		expect(keyContext({ price: 100, week52Low: 60, week52High: 140, yearReturn: 8, revenueGrowthQuarterYoy: 4 })).toEqual([]);
	});
});

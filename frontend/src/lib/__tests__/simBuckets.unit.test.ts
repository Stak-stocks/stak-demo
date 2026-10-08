import { describe, expect, it } from "vitest";
import { buckets, simInsight } from "../simBuckets";
import { allPreMarket, chartFractions, dailyCloses } from "../chartSeries";
import { ApiError } from "../api";
import { paperErrorMessage } from "../paperErrors";

describe("buckets", () => {
	it("groups by collection, biggest first, unknown tickers last as Other", () => {
		const b = buckets(["NVDA", "AAPL", "JPM", "ZZZZ", "AMD"]);
		expect(b.map((x) => x.id)).toEqual(["aitech", "finance", "other"]);
		expect(b[0]).toMatchObject({ name: "Tech & AI", count: 3, share: 0.6 });
	});
	it("is empty for no picks", () => expect(buckets([])).toEqual([]));
});

describe("simInsight", () => {
	it("reads one pick, a shared theme, and a scattered mix like Android", () => {
		expect(simInsight(["PLTR"])).toBe("PLTR is your first pick. Insights start once it has a week of moves.");
		expect(simInsight(["NVDA", "AAPL", "JPM"])).toBe("Two of your 3 picks are tech and AI names. Your taste has a type.");
		expect(simInsight(["NVDA", "JPM", "ENPH"])).toBe("Your 3 picks span 3 industries. STAK reads a pattern once a few of them share one.");
	});
});

describe("chart series", () => {
	it("keeps an 8% margin and centres a flat line", () => {
		expect(chartFractions([1, 2, 3]).map((v) => Math.round(v * 100) / 100)).toEqual([0.08, 0.5, 0.92]);
		expect(chartFractions([5, 5])).toEqual([0.5, 0.5]);
	});
	it("keeps one close per New York day, the last, dropping non-positive closes", () => {
		const out = dailyCloses([
			{ ts: "2026-09-21T14:00:00Z", close: 10 },
			{ ts: "2026-09-21T19:00:00Z", close: 11 },
			{ ts: "2026-09-21T20:00:00Z", close: 0 },
			{ ts: "2026-09-22T19:00:00Z", close: 12 },
		]);
		expect(out.map((p) => p.close)).toEqual([11, 12]);
	});
	it("spots a day that is still all pre-market", () => {
		expect(allPreMarket([{ session: "pre" }, { session: "pre" }])).toBe(true);
		expect(allPreMarket([{ session: "pre" }, { session: "regular" }])).toBe(false);
		expect(allPreMarket([])).toBe(false);
	});
});

describe("paperErrorMessage", () => {
	it("shows the server's reason for a refused order and a generic line for anything else", () => {
		expect(paperErrorMessage(new ApiError("Insufficient buying power", 422))).toBe("Insufficient buying power");
		expect(paperErrorMessage(new ApiError("boom", 500))).toBe("That didn't go through — try again");
		expect(paperErrorMessage(new Error("network"))).toBe("That didn't go through — try again");
	});
});

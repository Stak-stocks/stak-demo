import { describe, expect, it } from "vitest";
import type { StockChartPoint } from "@/lib/api";
import { linePath, PAD, VIEW_H, VIEW_W } from "../ChartLine";
import { downsample, drawsBestWorst, equalWeightIndex, extremes, figuresFromSeries, MAX_POINTS, seriesReturn, showsBestWorst } from "../performance";

const day = (d: number, close: number): StockChartPoint => ({ ts: new Date(Date.UTC(2026, 6, d)).toISOString(), close });

describe("seriesReturn", () => {
	it("is the move from the first close to the last, in %", () => {
		expect(seriesReturn([day(1, 100), day(2, 90), day(3, 110)])).toBeCloseTo(10);
	});
	it("orders by time, whatever order the API answers in", () => {
		expect(seriesReturn([day(3, 110), day(1, 100)])).toBeCloseTo(10);
	});
	it("needs two usable points", () => {
		expect(seriesReturn([])).toBeNull();
		expect(seriesReturn([day(1, 100)])).toBeNull();
		expect(seriesReturn([day(1, 0), day(2, 5)])).toBeNull();
	});
});

describe("equalWeightIndex", () => {
	it("averages each ticker normalised to its first close", () => {
		const a = [day(1, 100), day(2, 110)];
		const b = [day(1, 50), day(2, 45)];
		expect(equalWeightIndex([a, b])).toEqual([100, 100]);
	});
	it("carries a ticker forward between its own points", () => {
		const a = [day(1, 100), day(2, 120), day(3, 120)];
		const b = [day(1, 10), day(3, 20)];
		const out = equalWeightIndex([a, b])!;
		expect(out).toHaveLength(3);
		expect(out[1]).toBeCloseTo((1.2 + 1) * 50);
		expect(out[2]).toBeCloseTo((1.2 + 2) * 50);
	});
	it("lines up feeds a few seconds apart instead of stair-stepping between them", () => {
		const at = (d: number, s: number, close: number): StockChartPoint => ({ ts: new Date(Date.UTC(2026, 6, d, 0, 0, s)).toISOString(), close });
		const a = [at(1, 0, 100), at(2, 0, 110), at(3, 0, 121)];
		const b = [at(1, 3, 10), at(2, 3, 11), at(3, 3, 12.1)];
		const out = equalWeightIndex([a, b])!;
		expect(out).toHaveLength(3);
		expect(out[1]).toBeCloseTo(110);
		expect(out[2]).toBeCloseTo(121);
	});
	it("is null without a usable series", () => {
		expect(equalWeightIndex([])).toBeNull();
		expect(equalWeightIndex([[day(1, 5)]])).toBeNull();
	});
});

describe("figuresFromSeries", () => {
	it("averages the saves' moves and names the best and the worst", () => {
		const f = figuresFromSeries([
			{ ticker: "AAA", prices: [day(1, 100), day(2, 110)] },
			{ ticker: "BBB", prices: [day(1, 100), day(2, 95)] },
			{ ticker: "CCC", prices: [] },
		]);
		expect(f.status).toBe("ready");
		expect(f.count).toBe(2);
		expect(f.value).toBeCloseTo(2.5);
		expect(f.best?.ticker).toBe("AAA");
		expect(f.worst?.ticker).toBe("BBB");
		expect(f.series).toHaveLength(2);
	});
	it("reports no data rather than a number when nothing came back", () => {
		const f = figuresFromSeries([{ ticker: "AAA", prices: [] }]);
		expect(f).toMatchObject({ status: "none", value: null, best: null, worst: null, series: null });
	});
});

describe("extremes / downsample", () => {
	it("picks the extremes", () => {
		expect(extremes([])).toEqual({ best: null, worst: null });
		const e = extremes([
			{ ticker: "A", changePercent: 1 },
			{ ticker: "B", changePercent: -2 },
			{ ticker: "C", changePercent: 3 },
		]);
		expect(e.best?.ticker).toBe("C");
		expect(e.worst?.ticker).toBe("B");
	});
	it("keeps the ends and caps the count", () => {
		const v = Array.from({ length: 1000 }, (_, i) => i);
		const d = downsample(v);
		expect(d).toHaveLength(MAX_POINTS);
		expect(d[0]).toBe(0);
		expect(d[d.length - 1]).toBe(999);
		expect(downsample([1, 2, 3])).toEqual([1, 2, 3]);
	});
});

describe("linePath", () => {
	it("spans the frame's line box: first point at the left edge, highest close at the top", () => {
		const r = (v: number) => Math.round(v * 1000) / 1000;
		const d = linePath([1, 3, 2])!;
		expect(d.startsWith(`M${r(PAD)} ${r(VIEW_H - PAD)}`)).toBe(true);
		expect(d).toContain(`L${r(VIEW_W / 2)} ${r(PAD)}`);
		expect(d.endsWith(`L${r(VIEW_W - PAD)} ${r(PAD + (VIEW_H - 2 * PAD) / 2)}`)).toBe(true);
	});
	it("draws nothing from fewer than two points", () => {
		expect(linePath([5])).toBeNull();
	});
});

describe("showsBestWorst / drawsBestWorst (mystak item 8; review 1: the card's height while a range loads)", () => {
	const pair = { best: { ticker: "A", changePercent: 1 }, worst: { ticker: "B", changePercent: -1 } };
	it("names best and worst once two saves have figures", () => {
		expect(showsBestWorst({ count: 2, ...pair })).toBe(true);
		expect(showsBestWorst({ count: 1, best: pair.best, worst: pair.best })).toBe(false);
		expect(showsBestWorst({ count: 2, best: null, worst: null })).toBe(false);
	});
	it("keeps the row (reading a dash) while the closes of two or more saves load, so the card never shrinks and grows back", () => {
		const loading = { status: "loading" as const, count: 0, best: null, worst: null };
		expect(drawsBestWorst(loading, 2)).toBe(true);
		expect(drawsBestWorst(loading, 19)).toBe(true);
		expect(drawsBestWorst(loading, 1)).toBe(false);
		expect(drawsBestWorst({ ...loading, status: "none" }, 5)).toBe(false);
		expect(drawsBestWorst({ status: "ready", count: 2, ...pair }, 2)).toBe(true);
		expect(drawsBestWorst({ status: "ready", count: 1, best: pair.best, worst: pair.best }, 1)).toBe(false);
	});
});

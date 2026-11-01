import { describe, expect, it } from "vitest";
import { classifyMarketCap, parseFinancialValue } from "../financial";

describe("parseFinancialValue", () => {
	it("parses trillions correctly (live MU/TSLA-vs-Ford bug)", () => {
		expect(parseFinancialValue("$1.55T")).toBe(1.55e12);
	});

	it("parses billions correctly", () => {
		expect(parseFinancialValue("$55.9B")).toBe(55.9e9);
	});

	it("ranks a trillion-dollar company above a billion-dollar one", () => {
		const tsla = parseFinancialValue("$1.55T")!;
		const ford = parseFinancialValue("$55.9B")!;
		expect(tsla).toBeGreaterThan(ford);
	});

	it("parses millions correctly", () => {
		expect(parseFinancialValue("$900M")).toBe(900e6);
	});

	it("parses thousands correctly", () => {
		expect(parseFinancialValue("$500K")).toBe(500e3);
	});

	it("parses plain percentages with no suffix", () => {
		expect(parseFinancialValue("23.4%")).toBe(23.4);
	});

	it("parses negative percentages", () => {
		expect(parseFinancialValue("-3.1%")).toBe(-3.1);
	});

	it("parses multiples (P/E ratio)", () => {
		expect(parseFinancialValue("45.2x")).toBe(45.2);
	});

	it("parses comma-separated numbers", () => {
		expect(parseFinancialValue("1,234.5")).toBe(1234.5);
	});

	it("is case-insensitive on suffixes", () => {
		expect(parseFinancialValue("$1.2b")).toBe(1.2e9);
		expect(parseFinancialValue("$1.2t")).toBe(1.2e12);
	});

	it("returns the number as-is when given a number", () => {
		expect(parseFinancialValue(42)).toBe(42);
	});

	it("returns null for null/undefined/empty/N-A/em-dash", () => {
		expect(parseFinancialValue(null)).toBeNull();
		expect(parseFinancialValue(undefined)).toBeNull();
		expect(parseFinancialValue("")).toBeNull();
		expect(parseFinancialValue("N/A")).toBeNull();
		expect(parseFinancialValue("—")).toBeNull();
	});

	it("returns null for unparseable garbage", () => {
		expect(parseFinancialValue("abc")).toBeNull();
	});
});

describe("classifyMarketCap", () => {
	it("classifies a trillion-dollar company as Mega Cap", () => {
		expect(classifyMarketCap("$1.55T")).toEqual({ tier: "mega_cap", label: "Mega Cap" });
	});

	it("classifies a $55.9B company as Large Cap, not Mega Cap (live Ford bug)", () => {
		expect(classifyMarketCap("$55.9B")).toEqual({ tier: "large_cap", label: "Large Cap" });
	});

	it("classifies a sub-billion company as Small Cap, not Mega Cap (live my-stak.tsx/StockCard.tsx bug)", () => {
		expect(classifyMarketCap("$900M")).toEqual({ tier: "small_cap", label: "Small Cap" });
	});

	it("classifies a tiny company as Small Cap, not Large Cap", () => {
		expect(classifyMarketCap("$50M")).toEqual({ tier: "small_cap", label: "Small Cap" });
	});

	it("classifies a $5B company as Mid Cap", () => {
		expect(classifyMarketCap("$5B")).toEqual({ tier: "mid_cap", label: "Mid Cap" });
	});

	it("returns null for unparseable input", () => {
		expect(classifyMarketCap(null)).toBeNull();
		expect(classifyMarketCap("N/A")).toBeNull();
	});
});

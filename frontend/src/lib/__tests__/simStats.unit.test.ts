import { describe, expect, it } from "vitest";
import { computeRealized } from "@/lib/realized";
import { signedUsd, signedWhole, stakeLabel, countWord } from "@/lib/simFormat";
import type { SandboxTrade } from "@/lib/api";

const t = (id: number, side: "buy" | "sell", ticker: string, shares: number, price: number, at: string): SandboxTrade => ({
	id, side, ticker, shares, price, amount: shares * price, source: "market", executedAt: at,
});

describe("computeRealized", () => {
	it("banks a same-day buy-then-sell against the buy's price, not zero", () => {
		// API order: newest first. 9am buy 10 @ 100, 2pm sell 5 @ 110.
		const sales = computeRealized([
			t(2, "sell", "AAPL", 5, 110, "2026-09-26T18:00:00Z"),
			t(1, "buy", "AAPL", 10, 100, "2026-09-26T13:00:00Z"),
		]);
		expect(sales).toHaveLength(1);
		expect(sales[0]!.gain).toBeCloseTo(50);
	});

	it("uses the weighted-average cost after a top-up", () => {
		const sales = computeRealized([
			t(3, "sell", "TSLA", 10, 150, "2026-09-26T18:00:00Z"),
			t(2, "buy", "TSLA", 5, 200, "2026-09-25T18:00:00Z"),
			t(1, "buy", "TSLA", 5, 100, "2026-09-24T18:00:00Z"),
		]);
		// avg cost = 150, sold at 150 -> break even
		expect(sales[0]!.gain).toBeCloseTo(0);
	});

	it("returns newest sale first and tracks tickers independently", () => {
		const sales = computeRealized([
			t(4, "sell", "MSFT", 1, 90, "2026-09-26T18:00:00Z"),
			t(3, "sell", "AAPL", 1, 120, "2026-09-25T18:00:00Z"),
			t(2, "buy", "MSFT", 1, 100, "2026-09-24T18:00:00Z"),
			t(1, "buy", "AAPL", 1, 100, "2026-09-24T17:00:00Z"),
		]);
		expect(sales.map((s) => [s.ticker, Math.round(s.gain)])).toEqual([["MSFT", -10], ["AAPL", 20]]);
	});
});

describe("simFormat", () => {
	it("matches Android's money formats", () => {
		expect(signedUsd(24)).toBe("+$24.00");
		expect(signedUsd(-3)).toBe("-$3.00");
		expect(signedWhole(1234.6)).toBe("+$1,235");
		expect(stakeLabel(25)).toBe("$25");
		expect(stakeLabel(25.5)).toBe("$25.50");
		expect(countWord(3)).toBe("Three");
	});
});

import { describe, expect, it } from "vitest";
import { buildLedgerSeries } from "@/lib/ledgerChart";
import type { SandboxTrade } from "@/lib/api";

const trade = (id: number, side: "buy" | "sell", ticker: string, shares: number, price: number, at: string): SandboxTrade => ({
	id, side, ticker, shares, price, amount: shares * price, source: "market", executedAt: at,
});
const day = (d: number) => `2026-09-${String(d).padStart(2, "0")}T20:00:00.000Z`;

describe("buildLedgerSeries", () => {
	it("values cash plus shares held at each close, starting at the first trade", () => {
		const pts = buildLedgerSeries(
			[trade(1, "buy", "AAPL", 10, 100, day(2))],
			10000,
			{ AAPL: [{ ts: day(1), close: 90 }, { ts: day(2), close: 100 }, { ts: day(3), close: 110 }] },
		)!;
		expect(pts.map((p) => p.ts)).toEqual([day(2), day(3)]);
		expect(pts[0]!.value).toBe(10000); // 9000 cash + 10 x 100
		expect(pts[1]!.value).toBe(10100); // 9000 cash + 10 x 110
		expect(pts[1]!.pnl).toBe(100);
	});

	it("keeps a sold position's history: cash rises, the stock leaves the value", () => {
		const pts = buildLedgerSeries(
			[trade(1, "buy", "AAPL", 10, 100, day(2)), trade(2, "sell", "AAPL", 10, 120, day(4))],
			10000,
			{ AAPL: [{ ts: day(2), close: 100 }, { ts: day(3), close: 110 }, { ts: day(4), close: 120 }, { ts: day(5), close: 500 }] },
		)!;
		expect(pts.map((p) => p.value)).toEqual([10000, 10100, 10200, 10200]);
	});

	it("returns null with no trades or fewer than two priced moments", () => {
		expect(buildLedgerSeries([], 10000, {})).toBeNull();
		expect(buildLedgerSeries([trade(1, "buy", "AAPL", 1, 100, day(2))], 10000, { AAPL: [{ ts: day(2), close: 100 }] })).toBeNull();
	});

	it("orders same-time trades by id so a buy is applied before its sell", () => {
		const at = day(2);
		const pts = buildLedgerSeries(
			[trade(2, "sell", "AAPL", 5, 110, at), trade(1, "buy", "AAPL", 5, 100, at)],
			1000,
			{ AAPL: [{ ts: at, close: 105 }, { ts: day(3), close: 105 }] },
		)!;
		expect(pts[0]!.value).toBe(1050); // 1000 - 500 + 550, nothing left held
	});
});

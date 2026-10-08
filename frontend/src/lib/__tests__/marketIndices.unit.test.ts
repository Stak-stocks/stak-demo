import { describe, expect, it } from "vitest";
import { previousClose, readIndex } from "@/hooks/useMarketIndices";

const bar = (ts: string, close: number, session: "pre" | "regular" | "post" = "regular") => ({ ts, close, session });

// Friday 2026-09-25 intraday (UTC times = 9:30am-4pm ET) and the month of daily closes up to that Friday.
const intraday = [bar("2026-09-25T13:30:00Z", 7700), bar("2026-09-25T16:00:00Z", 7720), bar("2026-09-25T20:00:00Z", 7743.41), bar("2026-09-25T20:35:00Z", 7743.41, "post")];
const daily = [bar("2026-09-23T13:30:00Z", 7650), bar("2026-09-24T13:30:00Z", 7680), bar("2026-09-25T13:30:00Z", 7743.41)];

describe("market indices", () => {
	it("takes the previous close from the last daily bar before the intraday session's day", () => {
		expect(previousClose(intraday, daily)).toBe(7680);
	});

	it("reads level, day change and a regular-session line", () => {
		const r = readIndex(intraday, daily);
		expect(r.value).toBe(7743.41);
		expect(r.changePct).toBeCloseTo(((7743.41 - 7680) / 7680) * 100, 6);
		expect(r.line).toEqual([7700, 7720, 7743.41]);
	});

	it("has no change without an earlier daily close, and nothing at all without data", () => {
		expect(readIndex(intraday, [daily[2]!]).changePct).toBeNull();
		expect(readIndex(undefined, undefined)).toEqual({ value: null, changePct: null, line: [] });
	});
});

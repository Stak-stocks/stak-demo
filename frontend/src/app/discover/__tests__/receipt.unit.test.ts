import { describe, expect, it } from "vitest";
import type { DeckProgress } from "@/app/live";
import { END_WITHOUT_SAVES, savedInRun } from "../run";

const run = (over: Partial<DeckProgress> = {}): DeckProgress => ({
	date: "2026-11-09",
	theme: "ai-chips",
	order: ["NVDA", "AAPL", "GOOGL", "MSFT"],
	index: 4,
	saved: [],
	passed: [],
	bought: [],
	...over,
});

describe("the receipt's Saved tile agrees with the cards and with My STAK (ST-19, N27p)", () => {
	it("counts a card bought in the deck as saved, once", () => {
		// the hunt's run: Save NVDA, Practice buy AAPL (a buy saves the company: its card read Saved), pass the rest
		const mine = new Set(["NVDA", "AAPL", "MSFT"]);
		expect(savedInRun(run({ saved: ["NVDA"], bought: ["AAPL"], passed: ["GOOGL", "MSFT"] }), mine)).toBe(2);
		// a card saved AND bought is one card
		expect(savedInRun(run({ saved: ["NVDA"], bought: ["NVDA"] }), mine)).toBe(1);
		expect(savedInRun(run({ saved: ["NVDA", "AAPL"], bought: ["AAPL"] }), mine)).toBe(2);
	});

	it("leaves out a card the person has since removed from My STAK (its chip reads Save again)", () => {
		expect(savedInRun(run({ saved: ["NVDA"], bought: ["AAPL"] }), new Set(["NVDA"]))).toBe(1);
		expect(savedInRun(run({ saved: ["NVDA"], bought: ["AAPL"] }), new Set())).toBe(0);
	});

	it("is zero for a run with no saves and for no run at all", () => {
		expect(savedInRun(run({ passed: ["NVDA", "AAPL", "GOOGL", "MSFT"] }), new Set(["KO"]))).toBe(0);
		expect(savedInRun(null, new Set(["NVDA"]))).toBe(0);
		expect(savedInRun(undefined, new Set())).toBe(0);
	});

	it("has labels that are true for nobody's saves (C-05, N30.8b)", () => {
		expect(END_WITHOUT_SAVES).toEqual({ primary: "Start practice trading", secondary: "Open My STAK" });
		for (const label of Object.values(END_WITHOUT_SAVES)) expect(label).not.toMatch(/saves?\b/i);
	});
});

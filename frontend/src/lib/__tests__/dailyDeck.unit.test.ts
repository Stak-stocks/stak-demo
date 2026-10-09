import { afterEach, describe, expect, it } from "vitest";
import type { BrandSummary } from "@stak/shared";
import type { PassedEntry } from "@/context/AccountContext";
import { chooseDailyDeck, eligibleInOrder, MAX_PER_CATEGORY, PASS_HIDE_COUNT, passKeepsOut, pinDailyDeck, readPinnedDeck, withCategoryCap } from "../dailyDeck";

/** Today's picks, as the page takes them. */
const pickDailyDeck = (brands: BrandSummary[], ranked: string[], held: Set<string>, passed: PassedEntry[], limit: number, now: number) =>
	withCategoryCap(eligibleInOrder(brands, ranked, held, passed, now), limit);

const brand = (ticker: string): BrandSummary => ({ id: ticker.toLowerCase(), ticker, name: ticker } as BrandSummary);
const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;
// Chips (semiconductor) and two other categories in the shared catalog.
const CHIPS = ["NVDA", "AMD", "INTC", "QCOM", "AVGO"].map(brand);
const OTHER = ["WMT", "JPM"].map(brand);
const ALL = [...CHIPS, ...OTHER];

describe("daily deck - the apps' rules on the web", () => {
	it("follows the server's ranking, capped at the daily limit", () => {
		const picks = pickDailyDeck(ALL, ["JPM", "NVDA", "WMT"], new Set(), [], 3, NOW);
		expect(picks.map((b) => b.ticker)).toEqual(["JPM", "NVDA", "WMT"]);
	});

	it("takes at most three from one category; capped-out ones fill in only when the rest run out", () => {
		const ranked = ["NVDA", "AMD", "INTC", "QCOM", "AVGO", "WMT", "JPM"];
		expect(MAX_PER_CATEGORY).toBe(3);
		expect(withCategoryCap(ranked.map(brand), 5).map((b) => b.ticker)).toEqual(["NVDA", "AMD", "INTC", "WMT", "JPM"]);
		expect(withCategoryCap(ranked.map(brand), 6).map((b) => b.ticker)).toEqual(["NVDA", "AMD", "INTC", "WMT", "JPM", "QCOM"]);
	});

	it("leaves out My STAK, a pass from the last day, and anything passed five times", () => {
		const passed = [
			{ id: "nvda", at: NOW - HOUR, count: 1 },
			{ id: "amd", at: NOW - 30 * 24 * HOUR, count: PASS_HIDE_COUNT },
		];
		const picks = pickDailyDeck(ALL, ALL.map((b) => b.ticker), new Set(["wmt"]), passed, 10, NOW);
		expect(picks.map((b) => b.ticker)).toEqual(["INTC", "QCOM", "AVGO", "JPM"]);
	});

	it("brings an older pass back, after the stocks never passed", () => {
		const passed = [{ id: "nvda", at: NOW - 25 * HOUR, count: 2 }];
		const picks = pickDailyDeck([brand("NVDA"), ...OTHER], ["NVDA", "WMT", "JPM"], new Set(), passed, 10, NOW);
		expect(picks.map((b) => b.ticker)).toEqual(["WMT", "JPM", "NVDA"]);
		expect(passKeepsOut({ id: "x", at: NOW - 25 * HOUR, count: 4 }, NOW)).toBe(false);
		expect(passKeepsOut({ id: "x", at: NOW - 25 * HOUR, count: 5 }, NOW)).toBe(true);
	});

	describe("one deck a day across devices", () => {
		const base = { pinned: null, ranked: true, pick: () => ["NVDA"], offer: async (t: string[]) => t };

		it("shows the deck another device already picked", async () => {
			expect(await chooseDailyDeck({ ...base, shared: ["AMD"] })).toEqual(["AMD"]);
		});

		it("offers a new deck and shows the one the server keeps (another device may have got there first)", async () => {
			expect(await chooseDailyDeck({ ...base, shared: [], offer: async () => ["AMD"] })).toEqual(["AMD"]);
			expect(await chooseDailyDeck({ ...base, shared: [], offer: async () => { throw new Error("offline"); } })).toEqual(["NVDA"]);
		});

		it("shares this device's earlier pin before picking again", async () => {
			const offered: string[][] = [];
			const deck = await chooseDailyDeck({ ...base, shared: [], pinned: ["WMT"], offer: async (t) => { offered.push(t); return t; } });
			expect(deck).toEqual(["WMT"]);
			expect(offered).toEqual([["WMT"]]);
		});

		it("server unreachable: this device's pin, or its own pick; no ranking at all: an unshared deck", async () => {
			expect(await chooseDailyDeck({ ...base, shared: null, pinned: ["WMT"] })).toEqual(["WMT"]);
			expect(await chooseDailyDeck({ ...base, shared: null })).toEqual(["NVDA"]);
			expect(await chooseDailyDeck({ ...base, shared: [], ranked: false })).toBeNull();
		});
	});

	describe("pinned for the day", () => {
		afterEach(() => localStorage.clear());

		it("returns the day's deck, and nothing for another day or account", () => {
			pinDailyDeck("u1", "2026-10-09", ["nvda", "wmt"]);
			expect(readPinnedDeck("u1", "2026-10-09")).toEqual(["nvda", "wmt"]);
			expect(readPinnedDeck("u1", "2026-10-10")).toBeNull();
			expect(readPinnedDeck("u2", "2026-10-09")).toBeNull();
		});

		it("ignores a broken pin", () => {
			localStorage.setItem("stak.dailyDeck.u1", "{not json");
			expect(readPinnedDeck("u1", "2026-10-09")).toBeNull();
		});
	});
});

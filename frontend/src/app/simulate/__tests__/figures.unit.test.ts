import { describe, expect, it } from "vitest";
import { boardFor, demoPriceHistory, demoQuote, rangeStart } from "@/app/live";
import {
	allTimeLine,
	cardRows,
	newestPicks,
	newestSaves,
	pageRows,
	pickCount,
	splitAllTime,
	startPortion,
	versusMarket,
	weekLine,
	weekMove,
	wholeMove,
} from "../figures";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 7, 14, 30).getTime();

describe("newest first (D6)", () => {
	it("puts the latest first buy first, a top-up keeping its place", () => {
		const positions = [
			{ ticker: "NVDA", addedAt: new Date(2026, 4, 8).getTime() },
			{ ticker: "MSFT", addedAt: new Date(2026, 6, 8).getTime() },
			{ ticker: "PLTR", addedAt: NOW },
			{ ticker: "AAPL", addedAt: new Date(2026, 5, 24).getTime() },
			{ ticker: "AMD", addedAt: new Date(2026, 5, 24).getTime() },
		];
		expect(newestPicks(positions).map((p) => p.ticker)).toEqual(["PLTR", "MSFT", "AAPL", "AMD", "NVDA"]);
		// the input is not reordered
		expect(positions[0]!.ticker).toBe("NVDA");
	});

	it("lists the newest save first, then by symbol, leaving out what is held", () => {
		const saves = [
			{ ticker: "PLTR", savedAt: 3 },
			{ ticker: "COST", savedAt: 1 },
			{ ticker: "GOOGL", savedAt: 9 },
			{ ticker: "CRWD", savedAt: 5 },
			{ ticker: "BAC", savedAt: 5 },
			{ ticker: "NVDA", savedAt: 10 },
		];
		expect(newestSaves(saves, new Set(["NVDA"])).map((s) => s.ticker)).toEqual(["GOOGL", "BAC", "CRWD", "PLTR", "COST"]);
		expect(newestSaves(saves).map((s) => s.ticker)[0]).toBe("NVDA");
	});
});

describe("the hero's lines (D4)", () => {
	it("prints the week as the frame does, and a fall with its own arrow", () => {
		// the persona's computed week (live/ledger.ts PERSONA_WEEK_GAIN on $10,053.75) prints the frame's own line
		expect(weekLine(186.25, 1.8525)).toBe("▲ +$186 (+1.9%) this week");
		expect(weekLine(-12.4, -0.12)).toBe("▼ -$12 (-0.1%) this week");
		// zero is neutral (coordinator ruling N23h, 2026-11-09; was "▲ +$0 (+0.0%) this week"): no arrow, no plus sign
		expect(weekLine(0, 0)).toBe("$0 (0.0%) this week");
		expect(wholeMove(1234.5)).toBe("+$1,235");
	});

	it("splits the all-time line where the rank begins", () => {
		expect(splitAllTime("+$240.00 all time · #47 on the leaderboard")).toEqual({ lead: "+$240.00 all time · ", rank: "#47 on the leaderboard" });
		expect(allTimeLine("+$240.00", 47)).toEqual(splitAllTime("+$240.00 all time · #47 on the leaderboard"));
		expect(allTimeLine("-$12.00", null)).toEqual({ lead: "-$12.00 all time · ", rank: "Unranked" });
	});
});

describe("the board's rows", () => {
	it("keeps the card's three leaders and moves them down a place for every one You passes", () => {
		const below = cardRows(boardFor("week", { returnPct: 1.85 }));
		expect(below.map((r) => `#${r.rank} ${r.short}`)).toEqual(["#1 Amara", "#2 Tunde", "#3 Zoe"]);
		const second = cardRows(boardFor("week", { returnPct: 8.0 }));
		expect(second.map((r) => `#${r.rank} ${r.short}`)).toEqual(["#1 Amara", "#3 Tunde", "#4 Zoe"]);
		expect(second.some((r) => r.you)).toBe(false);
	});

	it("puts You in the page's list at its place when it beats a leader, apart under the rule otherwise", () => {
		const fifth = pageRows(boardFor("week", { returnPct: 5.0 }));
		expect(fifth.apart).toBeNull();
		expect(fifth.rows.map((r) => `#${r.rank} ${r.you ? "You" : r.name}`)).toEqual(["#1 Amara O.", "#2 Tunde A.", "#3 Zoe K.", "#4 Malik R.", "#5 You", "#6 Ivy C."]);
		const apart = pageRows(boardFor("week", { returnPct: 1.85 }));
		expect(apart.rows).toHaveLength(5);
		expect(apart.apart).toMatchObject({ rank: 47, you: true });
		// unranked: the leaders alone, no You row from the board (the page draws its own "—" row)
		expect(pageRows(boardFor("week", null))).toMatchObject({ apart: null });
	});

	it("ranks the All time view by all-time return", () => {
		const all = pageRows(boardFor("allTime", { returnPct: 2.4 }));
		expect(all.rows.map((r) => r.name)).toEqual(["Zoe K.", "Amara O.", "Ivy C.", "Tunde A.", "Malik R."]);
		expect(all.apart?.rank).toBe(123);
	});
});

describe("a pick's week (2:897)", () => {
	const nvda = demoPriceHistory("NVDA", "1W", demoQuote("NVDA"), NOW)!;
	const price = 122.1;

	it("moves an older pick by its shares from the week's first close", () => {
		const pick = { shares: 1.0152, priceAtAdd: 98.5, addedAt: new Date(2026, 4, 8).getTime(), price };
		// the 1W series starts exactly at the week's start, so its first close is the one the week reads
		expect(nvda.times[0]).toBe(rangeStart("1W", NOW));
		expect(weekMove(pick, nvda, NOW)).toBe(Math.round(1.0152 * (price - nvda.first) * 100) / 100);
	});

	it("moves a pick younger than a week by its gain since the pick, with or without a history", () => {
		const pick = { shares: 2, priceAtAdd: 120, addedAt: NOW - 2 * DAY, price };
		expect(weekMove(pick, nvda, NOW)).toBe(4.2);
		expect(weekMove(pick, null, NOW)).toBe(4.2);
	});

	it("counts each buy from when it was made (a top-up this week moves from its own price)", () => {
		const old = { shares: 1, price: 98.5, at: new Date(2026, 4, 8).getTime() };
		const topUp = { shares: 0.5, price: 121, at: NOW - DAY };
		const pick = { shares: 1.5, priceAtAdd: 106, addedAt: old.at, price, lots: [old, topUp] };
		const expected = Math.round((1 * (price - nvda.first) + 0.5 * (price - 121)) * 100) / 100;
		expect(weekMove(pick, nvda, NOW)).toBe(expected);
		// after a partial sale every buy is sold in proportion; the figure is rounded once, from the unrounded sum, as the
		// page prints it (halving the already rounded whole rounds twice: with NVDA's week opening at the frame's $118.36,
		// BUILD-PLAN N35b, that put a half-cent edge on 2.145 against the page's 2.14)
		const half = { ...pick, shares: 0.75 };
		expect(weekMove(half, nvda, NOW)).toBe(Math.round((0.5 * (price - nvda.first) + 0.25 * (price - 121)) * 100) / 100);
	});

	it("has nothing to show for an older share without the week's closes", () => {
		expect(weekMove({ shares: 1, priceAtAdd: 98.5, addedAt: new Date(2026, 4, 8).getTime(), price }, null, NOW)).toBeNull();
	});
});

describe("vs the market (2:900)", () => {
	it("compares the pick's return with the market's over the same days", () => {
		expect(versusMarket(23.96, 3.2)).toEqual({ text: "+20.8% ahead", tone: "up" });
		expect(versusMarket(18.0, 3.2)).toEqual({ text: "+14.8% ahead", tone: "up" });
		// the word carries the direction (coordinator ruling N30.8h, 2026-11-09; were "-1.2% behind" / "-6.2% behind")
		expect(versusMarket(2.0, 3.2)).toEqual({ text: "1.2% behind", tone: "down" });
		expect(versusMarket(-3.0, 3.2)).toEqual({ text: "6.2% behind", tone: "down" });
	});

	it("reads a pick made today as even with the market", () => {
		// even is neither ahead nor behind: the flat tone (N23h; was `up: true`, drawn green)
		expect(versusMarket(0, 0)).toEqual({ text: "Even with the market", tone: "flat" });
		expect(versusMarket(0.03, 0)).toEqual({ text: "Even with the market", tone: "flat" });
	});
});

describe("the portfolio's pick count", () => {
	it("counts the persona's unlisted picks with the listed ones", () => {
		expect(pickCount(6, 6)).toBe("12 picks");
		expect(pickCount(7, 6)).toBe("13 picks");
		expect(pickCount(1, null)).toBe("1 pick");
		expect(pickCount(0, undefined)).toBe("0 picks");
	});
});

describe("a sell sheet opened again after a failed sale", () => {
	it("opens on the portion that was chosen", () => {
		expect(startPortion([0.25, 0.5, 0.75, 1], 0.75, 0.5)).toEqual({ chip: 0.75, custom: null });
		expect(startPortion([1, 0.5], 0.5, 1)).toEqual({ chip: 0.5, custom: null });
		// a typed portion comes back in the Custom field, as a percentage
		expect(startPortion([0.25, 0.5, 0.75, 1], 0.33, 0.5)).toEqual({ chip: 0.5, custom: "33" });
		expect(startPortion([1, 0.5], 0.125, 1)).toEqual({ chip: 1, custom: "12.5" });
	});

	it("opens on the sheet's own default otherwise", () => {
		expect(startPortion([0.25, 0.5, 0.75, 1], undefined, 0.5)).toEqual({ chip: 0.5, custom: null });
		expect(startPortion([1, 0.5], Number.NaN, 1)).toEqual({ chip: 1, custom: null });
		expect(startPortion([1, 0.5], 0, 1)).toEqual({ chip: 1, custom: null });
	});
});

describe("the hero chart's line (D3)", () => {
	it("draws the value history, the flat baseline for a value that did not move, and keeps the last line while loading", async () => {
		const { lineFor } = await import("../history");
		expect(lineFor({ status: "ready", values: [10000, 10120.5, 10240] })).toEqual({ kind: "series", values: [10000, 10120.5, 10240] });
		expect(lineFor({ status: "ready", values: [10146.5, 10146.5] })).toEqual({ kind: "flat" });
		expect(lineFor({ status: "ready", values: [10000] })).toEqual({ kind: "flat" });
		expect(lineFor({ status: "loading", values: [] })).toEqual({ kind: "pending" });
	});
});

import { beforeAll, describe, expect, it } from "vitest";
import { allTickers, betaOf, collectionOf, loadCatalog, primaryCategoryOf } from "@/app/live/catalog";
import { FRAME_NOW } from "@/app/live/clock";
import { demoQuote } from "@/app/live/quotes";
import { AAPL_COVERAGE, AAPL_STATS, PHONE_COVERAGE } from "../coverage";
import { stockDetails } from "../data";
import { generatedCoverage } from "../demoCoverage";
import { fundamentalsOf, NO_FIGURE } from "../fundamentals";
import {
	analystFrom,
	authoredStats,
	benchmarkFigures,
	benchmarksFor,
	CHART_BOX,
	chartPoints,
	compareFor,
	compareSub,
	compareTableFor,
	demoCoverage,
	designEarningsLine,
	earningsLine,
	frameSaveIntro,
	growthTone,
	type Measure,
	nextEarningsLine,
	peersFor,
	SECTOR_MIN,
	sectorPeers,
	siteNews,
	sinceSaved,
	statFor,
	tilesFor,
	upsideLine,
	WITH_THE_MARKET,
} from "../live";
import { storiesFor } from "../news";
import { previousAppPath, readsHistory, sectionOf } from "../origin";
import { type Box, HEADER_CLEAR, HEADER_GUTTER, LINE_STROKE, type Plot, plotBand, plotHeight } from "../plot";
import { SIGN_TEXT, signText, signTone } from "../tone";

beforeAll(() => loadCatalog());

describe("the phones' analyst coverage (D8, discover-stock #6)", () => {
	it("covers the eighteen companies the phones author besides AAPL, each with five recent actions", () => {
		expect(Object.keys(PHONE_COVERAGE).sort()).toEqual(
			["AMD", "COST", "ENPH", "FSLR", "GOOGL", "GS", "JNJ", "JPM", "LLY", "MSFT", "NEE", "NKE", "NVDA", "O", "PFE", "PLD", "UNH", "V"].sort(),
		);
		for (const c of Object.values(PHONE_COVERAGE)) {
			expect(c.actions).toHaveLength(5);
			expect(c.low).toBeLessThan(c.avg);
			expect(c.avg).toBeLessThan(c.high);
		}
	});

	it("reads NVDA exactly as the phones print it (the same price on both)", () => {
		const demo = demoCoverage("NVDA")!;
		const view = analystFrom(demo.data, demo.actions, 122.1)!;
		expect(view.upside).toBe("↑ 17.9% upside");
		expect(view.low).toEqual(["Low", "$100"]);
		expect(view.avg).toEqual(["Avg", "$144"]);
		expect(view.high).toEqual(["High", "$200"]);
		expect(view.consensusLabel).toBe("WALL ST. CONSENSUS · 63 ANALYSTS");
		expect(view.counts).toEqual(["● Buy 55", "Hold 7", "Sell 1"]);
		expect(view.actions.map((a) => `${a.firm} ${a.rating} ${a.target}`)).toEqual([
			"Morgan Stanley Buy $152",
			"BofA Buy $150",
			"Goldman Sachs Buy $145",
			"Citi Buy $150",
			"HSBC Hold $120",
		]);
		// the price marker sits where the price is in the range, the fill reaches the average target
		expect(view.rangeMarker).toBe(Math.round(((122.1 - 100) / 100) * (328 - 14)));
		expect(view.rangeFill).toBe(Math.round(((144 - 100) / 100) * 328));
	});

	it("rebases a company the website prices differently on its demo price, the upside computed from the printed target", () => {
		// GS: the phones author $612.40 with an average target of $650; the website's demo price is $478.10, so the target
		// prints as $507 and the upside is $507 on $478.10 (the unrounded rebased target read 6.1%)
		const demo = demoCoverage("GS")!;
		const view = analystFrom(demo.data, demo.actions, 478.1)!;
		expect(view.avg[1]).toBe("$507");
		expect(view.upside).toBe(`↑ ${(((507 - 478.1) / 478.1) * 100).toFixed(1)}% upside`);
		// a target under the price reads as downside (the phones' COST)
		const cost = demoCoverage("COST")!;
		expect(analystFrom(cost.data, cost.actions, 918.2)!.upside).toMatch(/^↓ \d\.\d% downside$/);
		// thousands keep their separator
		const lly = demoCoverage("LLY")!;
		expect(analystFrom(lly.data, lly.actions, 886.4)!.high[1]).toMatch(/^\$1,\d{3}$/);
	});

	it("computes every covered company's upside, bar and dot from the targets as printed and its price (NUM-08 / NUM-12, N23k)", () => {
		const dollars = (s: string) => Number(s.replace(/[$,]/g, ""));
		for (const T of [...Object.keys(PHONE_COVERAGE), "AAPL"]) {
			const price = demoQuote(T)!.price;
			const demo = demoCoverage(T)!;
			const view = analystFrom(demo.data, demo.actions, price)!;
			const [low, avg, high] = [dollars(view.low[1]), dollars(view.avg[1]), dollars(view.high[1])];
			// the percent a reader gets from the two figures on the card
			expect([T, view.upside]).toEqual([T, upsideLine(((avg - price) / price) * 100)]);
			// the bar ends at the average's share of Low..High, the dot stands at the price's, "Avg" under the bar's end
			expect([T, view.rangeFill]).toEqual([T, Math.round(((avg - low) / (high - low)) * 328)]);
			expect([T, view.rangeMarker]).toEqual([T, Math.round(Math.min(1, Math.max(0, (price - low) / (high - low))) * (328 - 14))]);
			expect(view.avgAt).toBeCloseTo((avg - low) / (high - low), 10);
			const [buy, hold, sell] = view.counts.map((c) => Number(c.replace(/\D/g, "")));
			expect(view.consensusFill).toBe(Math.round((buy! / (buy! + hold! + sell!)) * 328));
		}
	});

	it("computes AAPL's card from Figma's own numbers once the showcase is over (N30.8d, CH-02)", () => {
		// a company the phones do not author has its own generated coverage (N39a, demoCoverage.ts); an unknown ticker none
		expect(demoCoverage("TSLA")).toEqual(generatedCoverage("TSLA", demoQuote("TSLA")!.price));
		expect(demoCoverage("NOSUCH")).toBeNull();
		const demo = demoCoverage("AAPL")!;
		const view = analystFrom(demo.data, demo.actions, 229.35)!;
		// the frame's literal stays on the design's own card; computed, $248 on $229.35 is 8.1 %
		expect(stockDetails.AAPL.analyst?.upside).toBe("↑ 6.7% upside");
		expect(view.upside).toBe("↑ 8.1% upside");
		expect([view.low[1], view.avg[1], view.high[1]]).toEqual(["$180", "$248", "$300"]);
		expect(view.consensusLabel).toBe(stockDetails.AAPL.analyst?.consensusLabel);
		expect(view.counts).toEqual(stockDetails.AAPL.analyst?.counts);
		expect(view.actions.map((a) => [a.firm, a.rating, a.target])).toEqual(stockDetails.AAPL.analyst?.actions.map((a) => [a.firm, a.rating, a.target]));
		// the dot marks the price (41.1 % of $180..$300), not the average (the frame's 173 px put it on the bar's end)
		expect(view.rangeMarker).toBe(Math.round(((229.35 - 180) / 120) * (328 - 14)));
		expect(view.rangeFill).toBe(Math.round((68 / 120) * 328));
		expect(AAPL_COVERAGE.at).toBe(229.35);
	});

	it("prints a target level with the price as neither upside nor downside (N23c)", () => {
		expect(upsideLine(0.04)).toBe("0.0% upside");
		expect(upsideLine(-0.04)).toBe("0.0% upside");
		expect(upsideLine(8.13)).toBe("↑ 8.1% upside");
		expect(upsideLine(-2.34)).toBe("↓ 2.3% downside");
	});
});

describe("Compare and learn's peer table (D8)", () => {
	it("compares with the phones' pair where they author the table, the catalog's otherwise", () => {
		expect(peersFor("AAPL")).toEqual(["MSFT", "GOOGL"]);
		expect(peersFor("NVDA")).toEqual(["AMD", "TSM"]);
		// the phones' rows are written for their pair, so it stays even where the catalog lacks a peer (SEDG)
		expect(peersFor("ENPH")).toEqual(["SEDG", "FSLR"]);
		expect(peersFor("TSLA")).toEqual(["RIVN", "F"]);
		expect(compareSub(peersFor("NVDA"))).toBe("vs AMD · TSM");
		// nobody to compare with: said plainly (the card then draws no caret), never an opener that opens nothing
		expect(compareSub([])).toBe("No peers to compare yet");
	});

	it("fills the pair from the stock's own sector where the catalog names fewer than two peers (review 1, N17e)", () => {
		// L'Oréal: no catalog peers under LRLCY, but the tag table lists it as "OR" (its brand id): beauty, nearest in size first
		expect(sectorPeers("LRLCY").slice(0, 2)).toEqual(["NKE", "EL"]);
		expect(peersFor("LRLCY")).toEqual(["NKE", "EL"]);
		const loreal = compareFor("LRLCY");
		expect(loreal.sub).toBe("vs NKE · EL");
		expect(loreal.table?.columns).toEqual(["LRLCY", "NKE", "EL"]);
		expect(loreal.table?.rows[0]!.cells[0]!.text).toBe("33.4");
		// Virgin Galactic: in no tag at all, so the companies that share both of its catalog interests (tech, travel)
		expect(peersFor("SPCE").slice().sort()).toEqual(["ACHR", "JOBY"]);
		const spce = compareFor("SPCE");
		expect(spce.table?.columns).toHaveLength(3);
		expect(spce.table?.rows[1]!.cells[0]).toEqual({ text: "-76%", tone: "down" });
		// a company with its own catalog peers keeps them (the sector only fills a short list)
		expect(peersFor("TSLA")).toEqual(["RIVN", "F"]);
		expect(sectorPeers("NOSUCH")).toEqual([]);
	});

	it("gives every one of the catalog's companies a table to open", () => {
		const all = allTickers();
		expect(all.length).toBeGreaterThan(300);
		const short = all.filter((T) => {
			const c = compareFor(T);
			return c.table?.columns.length !== 3 || c.table.rows.length !== 4 || !/^vs \S+ · \S+$/.test(c.sub) || c.table.columns[0] !== T || new Set(c.table.columns).size !== 3;
		});
		expect(short).toEqual([]);
	});

	it("colours a growth figure by its sign (N14b), one that prints as zero in the label grey (N28c)", () => {
		expect(growthTone("+62%")).toBe("up");
		expect(growthTone("6.1%")).toBe("up");
		expect(growthTone("-14%")).toBe("down");
		expect(growthTone("\u22122%")).toBe("down");
		expect(growthTone("0%")).toBe("flat");
		expect(growthTone("+0.0%")).toBe("flat");
		// a cell that states no figure carries no tone (the plain figure colour)
		expect(growthTone("n/m")).toBeUndefined();
		expect(growthTone("\u2014")).toBeUndefined();
	});

	it("builds every column from the one accessor: the stock's own column its tiles, each peer's column that peer's own tiles (N23j)", () => {
		const t = compareFor("NVDA").table!;
		expect(t.columns).toEqual(["NVDA", "AMD", "TSM"]);
		expect(t.rows.map((r) => r.label)).toEqual(["P/E ratio", "Rev growth", "Profit margin", "Market cap"]);
		// NVDA and AMD as the phones author THEM (AMD's own page says 45.6 and $302B: the phones' NVDA table said "110x" and
		// "$0.2T"); TSM, which the phones do not author, as the catalog states it
		const tsm = fundamentalsOf("TSM")!;
		expect(tsm.source).toBe("catalog");
		expect(t.rows.map((r) => r.cells.map((c) => c.text))).toEqual([
			["52.8", "45.6", tsm.text.pe],
			["+62%", "+18%", `+${tsm.text.growth}`],
			["48.9%", "6.4%", tsm.text.margin],
			["$3.0T", "$302B", tsm.text.cap],
		]);
		expect(t.rows.map((r) => r.cells.every((c) => c.tone === "up"))).toEqual([false, true, false, false]);
		// a falling figure reads red (the phones draw the whole row green: a phone bug, not copied); SEDG is in no catalog:
		// the phones' own cells are the only figures there are for it, "n/m" printing as the one missing-figure dash
		const enph = compareFor("ENPH");
		expect(enph.sub).toBe("vs SEDG · FSLR");
		expect(enph.table!.rows.map((r) => r.cells.map((c) => c.text))).toEqual([
			["38.6", NO_FIGURE, "17.8"],
			["+22%", "-14%", "+26%"],
			["9.5%", NO_FIGURE, "31%"],
			["$10.3B", "$1.2B", "$24.5B"],
		]);
		expect(enph.table!.rows[1]!.cells.map((c) => c.tone)).toEqual(["up", "down", "up"]);
		// only the growth row is coloured
		expect(enph.table!.rows.filter((r) => r.cells.some((c) => c.tone)).map((r) => r.label)).toEqual(["Rev growth"]);
	});

	it("prints one figure per company on every page: no peer cell differs from that peer's own page (NUM-05: 97 cells did)", () => {
		const known = new Set(allTickers());
		const own = (T: string) => {
			const tiles = tilesFor(T);
			const f = fundamentalsOf(T);
			const growth = f?.growth ?? null;
			return [tiles[0]!.value, growth === null ? NO_FIGURE : `${growth > 0 ? "+" : ""}${tiles[1]!.value}`, tiles[2]!.value, f?.text.cap ?? NO_FIGURE];
		};
		const differing: string[] = [];
		for (const T of known) {
			const table = compareFor(T).table!;
			table.columns.forEach((col, i) => {
				// a peer the catalog does not carry has no page of its own to agree with (SEDG, ELV, DECK)
				if (!known.has(col)) return;
				const cells = table.rows.map((r) => r.cells[i]!.text);
				if (JSON.stringify(cells) !== JSON.stringify(own(col))) differing.push(`${T}'s ${col} column ${cells.join(" / ")} vs its page ${own(col).join(" / ")}`);
			});
		}
		expect(differing).toEqual([]);
	});

	it("uses one format per measure in every column and one dash for a missing figure (N23m)", () => {
		const rows = allTickers().flatMap((T) => compareFor(T).table!.rows.map((r) => [r.label, ...r.cells.map((c) => c.text)]));
		const odd = rows.filter(([label, ...texts]) =>
			texts.some((t) => {
				if (t === NO_FIGURE) return false;
				if (label === "P/E ratio") return !/^-?\d[\d,]*\.\d$/.test(t);
				if (label === "Rev growth") return !/^[+-]?\d[\d,]*(\.\d)?%$/.test(t) || /\.0%$/.test(t);
				if (label === "Profit margin") return !/^-?\d[\d,]*(\.\d)?%$/.test(t) || /\.0%$/.test(t);
				// the cap as its source writes it, dollared (the catalog's own "$500B AUM" and "$100B+" for two fund managers)
				return !/^\$[\d.]+\s?[TBM]/.test(t);
			}),
		);
		expect(odd).toEqual([]);
		// a falling catalog figure is red, a missing one a plain dash
		expect(compareFor("TSLA").table?.rows[1]!.cells[0]).toEqual({ text: "-3.1%", tone: "down" });
		expect(compareFor("SPCE").table?.rows[1]!.cells.slice(1).every((c) => c.text === NO_FIGURE && c.tone === undefined)).toBe(true);
		expect(compareTableFor("SNAP", []).rows[0]!.cells[0]!.text).toBe(NO_FIGURE);
		expect(compareTableFor("TSLA", []).rows[3]!.cells[0]!.text).toBe("$1.38T");
	});

	it("builds AAPL's table past the showcase from the accessor too: its own column Figma's tiles, MSFT and GOOGL as their own pages", () => {
		const t = compareFor("AAPL").table!;
		expect(t.columns).toEqual(["AAPL", "MSFT", "GOOGL"]);
		expect(t.rows.map((r) => r.cells.map((c) => c.text))).toEqual([
			["31.2", "37.5", "24.1"],
			["+6.1%", "+15%", "+12%"],
			["24.3%", "36%", "29.5%"],
			["$3.5T", "$3.8T", "$2.3T"],
		]);
		expect(t.rows[0]!.cells[0]!.text).toBe(stockDetails.AAPL.numbers.stats[0]!.value);
		expect(t.rows[2]!.cells[0]!.text).toBe(stockDetails.AAPL.numbers.stats[2]!.value);
	});

	it("means the same two companies by 'peers' in the Benchmarks line as in the Compare card (N23m)", () => {
		const mid = (a: number, b: number) => ((a + b) / 2).toFixed(1);
		for (const T of ["NVDA", "TSLA", "JNJ", "COIN"]) {
			const [a, b] = peersFor(T).map((t) => fundamentalsOf(t)!);
			const line = benchmarksFor(T)!;
			if (a!.growth !== null && b!.growth !== null) expect([T, line.includes(`peers ${mid(a!.growth, b!.growth)}%`)]).toEqual([T, true]);
			if (a!.margin !== null && b!.margin !== null) expect([T, line.includes(`peers ${mid(a!.margin, b!.margin)}%.`)]).toEqual([T, true]);
		}
		// the frame's sentence shape (2:3516): one decimal, an x on a P/E
		expect(benchmarksFor("NVDA")).toMatch(/^Benchmarks: P\/E sector [\d.]+x · peers [\d.]+x\. Growth sector -?[\d.]+% · peers -?[\d.]+%\. Margin sector -?[\d.]+% · peers -?[\d.]+%\.$/);
	});
});

describe("Numbers that matter: one page, one figure (N14a, N23j)", () => {
	it("takes the phones' tiles for the companies they author", () => {
		expect(authoredStats("NVDA")).toEqual([
			{ label: "P/E ratio", value: "52.8", note: "Rich", good: false, outlined: false },
			{ label: "Revenue growth", value: "62%", note: "Explosive", good: true, outlined: true },
			{ label: "Profit margin", value: "48.9%", note: "Strong", good: false, outlined: false },
		]);
		expect(authoredStats("cost")!.map((s) => `${s.value} ${s.note}`)).toEqual(["52.1 Rich", "8.1% Reliable", "2.9% Thin"]);
		expect(tilesFor("NVDA")).toEqual(authoredStats("NVDA"));
		// every other company keeps the catalog
		expect(authoredStats("TSLA")).toBeNull();
		expect(authoredStats("SNAP")).toBeNull();
	});

	it("reads the same figures in the tiles, the accessor and the table's own column, for all nineteen", () => {
		const authored = [...Object.keys(PHONE_COVERAGE), "AAPL"];
		expect(authored).toHaveLength(19);
		for (const T of authored) {
			const tiles = authoredStats(T)!;
			const f = fundamentalsOf(T)!;
			// the accessor prints each authored tile's figure exactly as the phones wrote it (one format per measure)
			expect([T, f.source, f.text.pe, f.text.growth, f.text.margin]).toEqual([T, "phones", tiles[0]!.value, tiles[1]!.value, tiles[2]!.value]);
			const own = compareFor(T).table!.rows.map((r) => r.cells[0]!.text);
			expect([T, tiles[0]!.value, `+${tiles[1]!.value}`, tiles[2]!.value, f.text.cap]).toEqual([T, own[0], own[1], own[2], own[3]]);
			// one tile leads: its verdict green, the tile outlined
			expect(tiles.filter((s) => s.good && s.outlined)).toHaveLength(1);
			expect(tiles.filter((s) => s.good !== s.outlined)).toHaveLength(0);
		}
	});

	it("has the phones' AAPL tiles equal Figma's, so AAPL reads the same after the showcase", () => {
		expect(authoredStats("AAPL")).toEqual(stockDetails.AAPL.numbers.stats);
		expect(AAPL_STATS.map((s) => s[1])).toEqual(["31.2", "6.1%", "24.3%"]);
		expect(fundamentalsOf("AAPL")).toMatchObject({ source: "phones", pe: 31.2, growth: 6.1, margin: 24.3, cap: 3.5e12, text: { pe: "31.2", growth: "6.1%", margin: "24.3%", cap: "$3.5T" } });
	});

	it("speaks the phones' vocabulary for every other company: the band's word, a green word always with its outline (N30.8a)", () => {
		const word = (v: number, kind: "pe" | "growth" | "margin") => statFor("x", v, kind).note;
		// each authored tile whose word is its band's reads the same from the rule (the phones' story words apart)
		const story = new Set(["Cheaper", "Accelerating", "Rebounding", "Reliable", "Turning", "Excellent", "Exceptional"]);
		const kinds = ["pe", "growth", "margin"] as const;
		for (const [T, c] of [...Object.entries(PHONE_COVERAGE), ["AAPL", AAPL_COVERAGE] as const]) {
			c.stats.forEach(([, value, verdict], i) => {
				if (story.has(verdict)) return;
				expect([T, value, word(Number.parseFloat(value), kinds[i]!)]).toEqual([T, value, verdict]);
			});
		}
		// the cuts between the bands
		expect([15.9, 16, 33, 33.1, -3, 0].map((v) => word(v, "pe"))).toEqual(["Cheap", "In line", "In line", "Rich", "Loss-making", "Loss-making"]);
		expect([-1, 0, 3.4, 3.5, 6.9, 7, 9.9, 10, 16.4, 16.5, 31.9, 32].map((v) => word(v, "growth"))).toEqual(["Shrinking", "Flat", "Flat", "Slower", "Slower", "Steady", "Steady", "Healthy", "Healthy", "Fast", "Fast", "Explosive"]);
		expect([-0.1, 0, 9.9, 10, 19.9, 20, 55].map((v) => word(v, "margin"))).toEqual(["Loss-making", "Thin", "Thin", "Modest", "Modest", "Strong", "Strong"]);
		// no word names two measures' bands, but the one the phones use so ("Loss-making": a loss, by P/E or by margin)
		const words = (kind: "pe" | "growth" | "margin", vs: number[]) => new Set(vs.map((v) => word(v, kind)));
		const [pe, growth, margin] = [words("pe", [-1, 10, 20, 40]), words("growth", [-1, 1, 5, 8, 12, 20, 40]), words("margin", [-1, 5, 15, 30])];
		expect([...pe].filter((w) => growth.has(w))).toEqual([]);
		expect([...growth].filter((w) => margin.has(w))).toEqual([]);
		expect([...pe].filter((w) => margin.has(w))).toEqual(["Loss-making"]);
		// across the catalog: green and the outline always together, never on a figure under zero, one number format
		const tiles = allTickers().filter((T) => !authoredStats(T)).flatMap((T) => tilesFor(T).map((s) => [T, s] as const));
		expect(tiles.filter(([, s]) => s.good !== s.outlined).map(([T]) => T)).toEqual([]);
		expect(tiles.filter(([, s]) => s.good && !["Cheap", "Explosive"].includes(s.note)).map(([T]) => T)).toEqual([]);
		expect(tiles.filter(([, s]) => s.value !== NO_FIGURE && (s.label === "P/E ratio" ? !/^-?\d[\d,]*\.\d$/.test(s.value) : !/^-?\d[\d,]*(\.\d)?%$/.test(s.value) || /\.0%$/.test(s.value))).map(([T, s]) => `${T} ${s.value}`)).toEqual([]);
	});
});

describe("the chart's live series clears the header (N20b)", () => {
	// the product card at 1440 (2:3461): the vector's box 692 x 122 at (13, 60); the header's texts as Chrome draws NVDA's
	// (the ticker line 12/16 at y 20, the price 34/43 at y 40, the day's move 13/17 at y 87, all from x 40)
	const plot: Plot = { left: 13, top: 60, width: 692, height: 122 };
	const header: Box[] = [
		{ left: 40, top: 20, right: 141, bottom: 36 },
		{ left: 40, top: 40, right: 181, bottom: 83 },
		{ left: 40, top: 87, right: 128, bottom: 104 },
	];
	/** How far under each text the line's ink stays where it passes by it (px; the smallest over the texts it reaches). */
	const clearance = (closes: number[], p: Plot, texts: readonly Box[], height: number) => {
		const pts = chartPoints(closes, p.width, height, p.height - height)
			.split(" ")
			.map((s) => s.split(",").map(Number) as [number, number]);
		let least = Number.POSITIVE_INFINITY;
		for (const t of texts) {
			// the line all along the text's reach (8 px to its left and right; from the plot's own left edge for a text in
			// the card's inset), every half px
			for (let x = t.left - p.left <= HEADER_GUTTER ? 0 : t.left - HEADER_CLEAR - p.left; x <= t.right + HEADER_CLEAR - p.left; x += 0.5) {
				if (x < 0 || x > p.width) continue;
				const next = pts.findIndex((q) => q[0] > x);
				const k = next < 0 ? pts.length - 2 : Math.max(0, next - 1);
				const [x0, y0] = pts[k]!;
				const [x1, y1] = pts[k + 1]!;
				const y = p.top + y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
				least = Math.min(least, y - LINE_STROKE / 2 - t.bottom);
			}
		}
		return least;
	};
	const ramp = (n: number, from: number, to: number) => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

	it("keeps Figma's whole box for a line that passes under the header (a rising line)", () => {
		const rising = ramp(25, 100, 130);
		expect(plotHeight(rising, plot, header)).toBe(CHART_BOX.height);
		// and for any line when there is nothing to clear (not measured yet, or a card with no header)
		expect(plotHeight(ramp(25, 130, 100), plot, [])).toBe(CHART_BOX.height);
		expect(clearance(rising, plot, header, CHART_BOX.height)).toBeGreaterThanOrEqual(HEADER_CLEAR);
	});

	it("lowers the plot's top just enough for a line that starts at its high: 8 px under the day's move, no more", () => {
		const falling = ramp(25, 130, 100);
		const h = plotHeight(falling, plot, header);
		// under the header (the day's move ends at y 104), not a fixed band: the line still reaches the box's bottom edge
		expect(h).toBeLessThan(CHART_BOX.height);
		expect(h).toBeGreaterThan(60);
		const least = clearance(falling, plot, header, h);
		expect(least).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
		expect(least).toBeLessThan(HEADER_CLEAR + 0.6);
		// the same line drawn in the whole box ran through the price and the day's move
		expect(clearance(falling, plot, header, CHART_BOX.height)).toBeLessThan(0);
		const ys = chartPoints(falling, plot.width, h, plot.height - h)
			.split(" ")
			.map((s) => Number(s.split(",")[1]));
		expect(Math.max(...ys)).toBe(CHART_BOX.height);
		expect(Math.min(...ys)).toBeCloseTo(CHART_BOX.height - h, 1);
		// the first close is the high: it starts under the header (the day's move ends at y 104), not beside it in the
		// card's inset
		expect(plot.top + ys[0]! - LINE_STROKE / 2).toBeCloseTo(104 + HEADER_CLEAR, 1);
	});

	it("starts a line under the header even when its first close alone is high (no climbing up the card's inset)", () => {
		// a first close far above the rest: the first segment falls away before the texts begin (x 40), at 25 and at 253 points
		for (const n of [25, 79, 253]) {
			const drop = [130, ...Array.from({ length: n - 1 }, (_, i) => 100 + (i % 3))];
			const h = plotHeight(drop, plot, header);
			const first = Number(chartPoints(drop, plot.width, h, plot.height - h).split(" ")[0]!.split(",")[1]);
			expect(plot.top + first - LINE_STROKE / 2).toBeGreaterThanOrEqual(104 + HEADER_CLEAR - 0.05);
		}
	});

	it("asks only as much as the line's height beside the texts: a peak past the header keeps the whole box", () => {
		// low under the header, a peak past it (x 460 of 692), then down: nothing to clear
		const peakLater = [100, 101, 102, 101, 103, 110, 120, 128, 130, 126, 118, 110, 104];
		expect(plotHeight(peakLater, plot, header)).toBe(CHART_BOX.height);
		// a high first close that falls away under the price: lowered, but no more than a line that stays high there
		const spike = [130, 112, 104, 101, 100, 100, 101, 102, 103, 104, 105, 106, 107];
		const plateau = [130, 130, 130, 129, 128, 120, 110, 105, 103, 102, 101, 100, 100];
		const hs = plotHeight(spike, plot, header);
		const hp = plotHeight(plateau, plot, header);
		expect(hs).toBeLessThan(CHART_BOX.height);
		expect(clearance(spike, plot, header, hs)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
		expect(clearance(plateau, plot, header, hp)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
		expect(hs).toBeGreaterThanOrEqual(hp);
	});

	it("holds on a phone's narrow card, where the price spans half the plot, and for a wide price", () => {
		// 390 x 844: the card is 358 wide, the plot 306
		const phone: Plot = { left: 13, top: 60, width: 306, height: 122 };
		const wide: Box[] = [header[0]!, { left: 40, top: 40, right: 236, bottom: 83 }, header[2]!];
		for (const closes of [ramp(79, 130, 100), ramp(79, 100, 130), [100, 130, 100, 130, 100, 130, 100], [130, 100, 130, 100, 130, 100, 130], [5, 5, 5]]) {
			for (const [p, texts] of [[phone, header], [phone, wide], [plot, wide]] as const) {
				const h = plotHeight(closes, p, texts);
				expect(h).toBeGreaterThan(0);
				expect(h).toBeLessThanOrEqual(CHART_BOX.height);
				expect(clearance(closes, p, texts, h)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
			}
		}
	});

	it("spans its box: the first close on the left, the last on the right, the high on top, the low at the bottom", () => {
		expect(chartPoints([3, 1, 2])).toBe("0,0 346,122 692,61");
		// a lowered plot keeps the box's bottom edge
		expect(chartPoints([3, 1, 2], CHART_BOX.width, 76, CHART_BOX.height - 76)).toBe("0,46 346,122 692,84");
		// a flat series sits on the middle; fewer than two closes draw nothing
		expect(chartPoints([5, 5], CHART_BOX.width, 76)).toBe("0,38 692,38");
		expect(chartPoints([5])).toBe("");
	});
});

describe("the chart's live series keeps the header's 8 px over the range tabs too (review r2b low 3, follow-up D1, N33h)", () => {
	// the product card at 1440 (2:3461): the vector's box 692 x 122 at (13, 60), so its bottom edge is y 182; the range row
	// "Frame" 2:3463 starts ON that edge (566, 182, 159 x 22: four buttons 33 + 36 + 35 + 31 and three gaps of 8), its
	// labels 4 px lower
	const plot: Plot = { left: 13, top: 60, width: 692, height: 122 };
	const header: Box[] = [
		{ left: 40, top: 20, right: 141, bottom: 36 },
		{ left: 40, top: 40, right: 181, bottom: 83 },
		{ left: 40, top: 87, right: 128, bottom: 104 },
	];
	const row: Box = { left: 566, top: 182, right: 725, bottom: 204 };
	const ramp = (n: number, from: number, to: number) => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
	const drawn = (closes: readonly number[], p: Plot, above: readonly Box[], below: readonly Box[]) => {
		const band = plotBand(closes, p, above, below);
		const pts = chartPoints(closes, p.width, band.height, band.top)
			.split(" ")
			.map((s) => s.split(",").map(Number) as [number, number]);
		// the line's y in the card at x px along the plot
		const yAt = (x: number) => {
			const next = pts.findIndex((q) => q[0] > x);
			const k = next < 0 ? pts.length - 2 : Math.max(0, next - 1);
			const [x0, y0] = pts[k]!;
			const [x1, y1] = pts[k + 1]!;
			return p.top + y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
		};
		/** How far the line's ink stays above a box under the plot, all along its reach (the smallest, px). */
		const over = (t: Box) => {
			let least = Number.POSITIVE_INFINITY;
			for (let x = Math.max(0, t.left - HEADER_CLEAR - p.left); x <= Math.min(p.width, t.right + HEADER_CLEAR - p.left); x += 0.5) least = Math.min(least, t.top - (yAt(x) + LINE_STROKE / 2));
			return least;
		};
		/** How far it stays under a header text (as the describe above measures it). */
		const under = (t: Box) => {
			let least = Number.POSITIVE_INFINITY;
			for (let x = t.left - p.left <= HEADER_GUTTER ? 0 : Math.max(0, t.left - HEADER_CLEAR - p.left); x <= Math.min(p.width, t.right + HEADER_CLEAR - p.left); x += 0.5) least = Math.min(least, yAt(x) - LINE_STROKE / 2 - t.bottom);
			return least;
		};
		return { band, ys: pts.map((q) => q[1]), over, under };
	};

	it("raises the plot's bottom just enough for a line that ends at its low: 8 px over the row, no more", () => {
		// ENPH's month on the user's page: it falls, and its last stretch ran 2.7 px above the "1M" and "1Y" labels
		const falling = ramp(25, 130, 100);
		const whole = drawn(falling, plot, header, []);
		// before: the low sat on the box's bottom edge, its ink 1.25 px INTO the row's own box
		expect(whole.band.top + whole.band.height).toBeCloseTo(CHART_BOX.height, 1);
		expect(whole.over(row)).toBeLessThan(0);
		const d = drawn(falling, plot, header, [row]);
		expect(d.over(row)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
		expect(d.over(row)).toBeLessThan(HEADER_CLEAR + 0.6);
		// which is 12 px over the labels (they start 4 px under the row's top edge)
		expect(d.over({ ...row, top: row.top + 4 })).toBeGreaterThanOrEqual(HEADER_CLEAR + 4 - 0.05);
		// the top rule is solved with it: still 8 px under the day's move, the band between the two
		expect(d.under(header[2]!)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
		expect(d.under(header[2]!)).toBeLessThan(HEADER_CLEAR + 0.6);
		expect(d.band.top + d.band.height).toBeCloseTo(CHART_BOX.height - (HEADER_CLEAR + LINE_STROKE / 2), 1);
		expect(d.band.height).toBeCloseTo(182 - 104 - 2 * (HEADER_CLEAR + LINE_STROKE / 2), 1);
	});

	it("leaves a line that passes high over the tabs on the box's bottom edge, at Figma's full height", () => {
		// a rising line: low on the left (under the header, clear of it), high on the right (far over the row)
		const rising = ramp(25, 100, 130);
		expect(plotBand(rising, plot, header, [row])).toEqual({ top: 0, height: CHART_BOX.height });
		// nothing under the plot (the EXAMPLE's chart, or before the row is measured): the old rule, band on the bottom edge
		const falling = ramp(25, 130, 100);
		const old = plotBand(falling, plot, header);
		expect(old.height).toBe(plotHeight(falling, plot, header));
		expect(old.top + old.height).toBeCloseTo(CHART_BOX.height, 1);
		// a row the plot never reaches asks for nothing: far under the box, or past its right edge
		expect(plotBand(falling, plot, header, [{ ...row, top: 182 + 12, bottom: 216 }])).toEqual(old);
		expect(plotBand(falling, plot, header, [{ left: 800, top: 182, right: 900, bottom: 204 }])).toEqual(old);
	});

	it("lifts only as much as the line's low over the tabs needs", () => {
		// the low is in the middle of the card (x 346), far left of the row: the line is half-way up again over the tabs
		const dip = [130, 120, 110, 100, 108, 114, 118];
		const d = drawn(dip, plot, [], [row]);
		expect(d.band).toEqual({ top: 0, height: CHART_BOX.height });
		expect(d.over(row)).toBeGreaterThan(HEADER_CLEAR);
		// the series' low is on the left, and over the tabs the line dips to 8 px over the floor (2 of the 30 it spans): the
		// bottom rises by the little that is missing, not by the whole 9.25
		const shallow = [100, 126, 130, 128, 124, 120, 110, 102, 106];
		const s = drawn(shallow, plot, [], [row]);
		expect(s.over(row)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
		expect(s.over(row)).toBeLessThan(HEADER_CLEAR + 0.6);
		expect(CHART_BOX.height - (s.band.top + s.band.height)).toBeGreaterThan(0);
		expect(CHART_BOX.height - (s.band.top + s.band.height)).toBeLessThan(HEADER_CLEAR + LINE_STROKE / 2);
		// and the series still spans its band: the high on the band's top edge, the low on its bottom
		expect(Math.min(...s.ys)).toBeCloseTo(s.band.top, 1);
		expect(Math.max(...s.ys)).toBeCloseTo(s.band.top + s.band.height, 1);
	});

	it("holds with the header at every width: the phone's card, where the row spans half the plot, and the wide one", () => {
		// 390 x 844: the card is 358 wide, the plot 306, the row starts at 180; 1912 x 928: the card 1062, the row at 884
		const phone: Plot = { left: 13, top: 60, width: 306, height: 122 };
		const phoneRow: Box = { left: 180, top: 182, right: 339, bottom: 204 };
		const wide: Plot = { left: 13, top: 60, width: 1010, height: 122 };
		const wideRow: Box = { left: 884, top: 182, right: 1043, bottom: 204 };
		const widePrice: Box[] = [header[0]!, { left: 40, top: 40, right: 236, bottom: 83 }, header[2]!];
		const zigzag = (n: number) => Array.from({ length: n }, (_, i) => 100 + ((i * 37) % 31) - (i % 2 ? 9 : 0));
		for (const closes of [ramp(79, 130, 100), ramp(79, 100, 130), [100, 130, 100, 130, 100, 130, 100], [130, 100, 130, 100, 130, 100, 130], zigzag(25), zigzag(79), zigzag(253), [5, 5, 5]]) {
			for (const [p, texts, r] of [[plot, header, row], [phone, header, phoneRow], [phone, widePrice, phoneRow], [wide, widePrice, wideRow]] as const) {
				const d = drawn(closes, p, texts, [r]);
				expect(d.band.height).toBeGreaterThan(0);
				expect(d.band.top).toBeGreaterThanOrEqual(0);
				expect(d.band.top + d.band.height).toBeLessThanOrEqual(CHART_BOX.height + 0.01);
				expect(d.over(r)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
				for (const t of texts) if (t.bottom + HEADER_CLEAR > p.top) expect(d.under(t)).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
			}
		}
	});
});

describe("the Benchmarks' sector figure is a sector's (review r2b medium 2; the third clause of C-04)", () => {
	const MEASURES: Measure[] = ["pe", "growth", "margin"];

	it("states no sector figure from fewer than three companies, anywhere in the catalog", () => {
		expect(SECTOR_MIN).toBe(3);
		let sectors = 0;
		let fellBack = 0;
		for (const T of allTickers()) {
			const figures = benchmarkFigures(T);
			for (const m of MEASURES) {
				const { sector, peers } = figures[m];
				if (sector) {
					sectors++;
					expect([T, m, sector.from.length >= SECTOR_MIN]).toEqual([T, m, true]);
					// the companies behind it are the OTHER companies of its tag category, or of its collection when the
					// category is too small; never the company itself, never the catch-all "Other"
					expect(sector.from).not.toContain(T);
					expect(new Set(sector.from).size).toBe(sector.from.length);
					if (sector.group === "category") expect(sector.from.every((t) => primaryCategoryOf(t) === primaryCategoryOf(T))).toBe(true);
					else {
						fellBack++;
						expect(collectionOf(T)).not.toBe("other");
						expect(sector.from.every((t) => collectionOf(t) === collectionOf(T))).toBe(true);
					}
				}
				// "peers" is the Compare pair (N23m), and never the same companies as the sector figure beside it
				if (peers) {
					expect(peers.from.every((t) => peersFor(T).includes(t))).toBe(true);
					if (sector) expect([...peers.from].sort()).not.toEqual([...sector.from].sort());
				}
			}
		}
		// the rule is used (otherwise this test proves nothing): sector figures exist, and some come from a collection
		expect(sectors).toBeGreaterThan(300);
		expect(fellBack).toBeGreaterThan(0);
	});

	it("prints exactly those figures, and leaves out what nobody states", () => {
		for (const T of allTickers()) {
			const figures = benchmarkFigures(T);
			const want = (
				[
					["P/E", "pe", "x"],
					["Growth", "growth", "%"],
					["Margin", "margin", "%"],
				] as const
			)
				.map(([label, m, unit]) => {
					const { sector, peers } = figures[m];
					const parts = [sector ? `sector ${sector.value.toFixed(1)}${unit}` : null, peers ? `peers ${peers.value.toFixed(1)}${unit}` : null].filter(Boolean);
					return parts.length ? `${label} ${parts.join(" · ")}.` : null;
				})
				.filter(Boolean);
			expect([T, benchmarksFor(T)]).toEqual([T, want.length ? `Benchmarks: ${want.join(" ")}` : undefined]);
		}
	});

	it("reads AAPL past the showcase against its collection, not against Peloton and Duolingo", () => {
		// its tag category (consumer_tech) holds two other companies: "P/E sector 115.0x ... Margin sector -13.5%" stood
		// under a tile reading "31.2 In line"
		expect(allTickers().filter((t) => t !== "AAPL" && primaryCategoryOf(t) === primaryCategoryOf("AAPL")).length).toBeLessThan(SECTOR_MIN);
		const figures = benchmarkFigures("AAPL");
		for (const m of MEASURES) {
			expect(figures[m].sector?.group).toBe("collection");
			expect(figures[m].sector!.from.length).toBeGreaterThanOrEqual(SECTOR_MIN);
			expect(figures[m].sector!.from.every((t) => collectionOf(t) === "ai-tech")).toBe(true);
			// its peers are the Compare card's pair, both of which state every measure
			expect(figures[m].peers?.from).toEqual(["MSFT", "GOOGL"]);
		}
		const line = benchmarksFor("AAPL")!;
		expect(line).not.toContain("115.0x");
		expect(line).not.toContain("-13.5%");
		// the pair's medians: MSFT 37.5 / 15% / 36% and GOOGL 24.1 / 12% / 29.5% (their own pages' tiles)
		expect(line).toMatch(/^Benchmarks: P\/E sector \d+\.\dx · peers 30\.8x\. Growth sector -?\d+\.\d% · peers 13\.5%\. Margin sector -?\d+\.\d% · peers 32\.8%\.$/);
		// a sector P/E a reader can hold against "31.2 In line": the collection's median, not one outlier
		expect(figures.pe.sector!.value).toBeGreaterThan(15);
		expect(figures.pe.sector!.value).toBeLessThan(60);
		expect(figures.margin.sector!.value).toBeGreaterThan(0);
		// as the catalog stands today: the AI & Tech collection's medians beside the pair's
		expect(line).toBe("Benchmarks: P/E sector 35.0x · peers 30.8x. Growth sector 16.0% · peers 13.5%. Margin sector 19.0% · peers 32.8%.");
	});

	it("no longer calls one company a sector: MSFT (GOOGL alone), RIVN (TSLA alone)", () => {
		for (const T of ["MSFT", "GOOGL", "RIVN", "SNOW", "GME"]) {
			for (const m of MEASURES) {
				const sector = benchmarkFigures(T)[m].sector;
				if (sector) expect([T, m, sector.from.length >= SECTOR_MIN]).toEqual([T, m, true]);
			}
		}
		// RIVN's own category states one positive P/E (TSLA's 391.3): its P/E sector is the collection's median now, and
		// Tesla alone is not "peers" either (only one of the Compare card's pair states a P/E), so 391.3x is gone from the line
		expect(benchmarksFor("RIVN") ?? "").not.toMatch(/391\.3x/);
		expect(benchmarkFigures("RIVN").pe.sector?.group).toBe("collection");
		expect(benchmarkFigures("RIVN").pe.peers).toBeNull();
		expect(benchmarksFor("MSFT") ?? "").not.toMatch(/sector 24\.1x/);
		expect(benchmarksFor("GOOGL") ?? "").not.toMatch(/sector 37\.5x/);
	});

	it("means ONE group by 'sector' in a line, and every Compare company by 'peers' (coordinator, 2026-11-09)", () => {
		let twoGroups = 0;
		let partialPeers = 0;
		for (const T of allTickers()) {
			const figures = benchmarkFigures(T);
			// with a fallback per measure RIVN took its P/E from the Consumer collection and its margin from the EV makers
			const groups = new Set(MEASURES.map((m) => figures[m].sector?.group).filter(Boolean));
			if (groups.size > 1) twoGroups++;
			for (const m of MEASURES) {
				const peers = figures[m].peers;
				// RIVN's "peers 391.3x" was Tesla alone: a peers figure is the whole Compare list or it is not printed
				if (peers && peers.from.length !== peersFor(T).length) partialPeers++;
			}
		}
		expect(twoGroups).toBe(0);
		expect(partialPeers).toBe(0);
		// the group is the one that states more of the three measures; RIVN's whole line is its collection's
		const rivn = benchmarkFigures("RIVN");
		expect(new Set(MEASURES.map((m) => rivn[m].sector?.group).filter(Boolean))).toEqual(new Set(["collection"]));
	});

	it("keeps Figma's own line on the design's AAPL (2:3516)", () => {
		expect(stockDetails.AAPL.numbers.benchmarks).toBe("Benchmarks: P/E sector 28.0x · peers 33.5x. Growth sector 9.0% · peers 7.4%. Margin sector 11.0% · peers 21.2%.");
	});
});

describe("the untouched showcase's AAPL table is the phone frame's (ruling N33a: D7 over N23j)", () => {
	it("holds the frame's cells verbatim (1:2804), the Rev growth row green", () => {
		const table = stockDetails.AAPL.compare.table!;
		expect(table.columns).toEqual(["AAPL", "MSFT", "GOOGL"]);
		expect(table.rows.map((r) => [r.label, ...r.cells.map((c) => c.text)])).toEqual([
			["P/E ratio", "31.2", "36x", "24x"],
			["Rev growth", "+6.1%", "+15%", "+12%"],
			["Profit margin", "24.3%", "36%", "29%"],
			["Market cap", "$3.5T", "$3.4T", "$2.3T"],
		]);
		// the same cells as the phones' own AAPL record (coverage.ts, ported from both apps), the pair the teaser names
		expect(table.rows.map((r) => [r.label, ...r.cells.map((c) => c.text)])).toEqual(AAPL_COVERAGE.rows.map((r) => [...r]));
		expect(stockDetails.AAPL.compare.sub).toBe(compareSub(table.columns.slice(1)));
		expect(table.rows.map((r) => r.cells.map((c) => c.tone))).toEqual([
			[undefined, undefined, undefined],
			["up", "up", "up"],
			[undefined, undefined, undefined],
			[undefined, undefined, undefined],
		]);
	});

	it("differs from the accessor's table only in the frame's rounded peer cells; AAPL's own column is the same", () => {
		const frame = stockDetails.AAPL.compare.table!;
		const built = compareFor("AAPL").table!;
		expect(built.columns).toEqual(frame.columns);
		// AAPL's own column: one figure before and after the first action
		expect(built.rows.map((r) => r.cells[0]!.text)).toEqual(frame.rows.map((r) => r.cells[0]!.text));
		// past the showcase the peers read as their own pages do (N23j)
		expect(built.rows.map((r) => r.cells.slice(1).map((c) => c.text))).toEqual([
			["37.5", "24.1"],
			["+15%", "+12%"],
			["36%", "29.5%"],
			["$3.8T", "$2.3T"],
		]);
	});
});

describe("a signed figure takes its colour from its sign (N20c)", () => {
	it("reads the sign of the figure as printed", () => {
		for (const t of ["▲ 2.4% today", "▲ 2.4%", "+4.6%", "↑ 17.9% upside", "▲ +0.8% at yesterday’s close", "6.1%", "+$24.00"]) expect([t, signTone(t)]).toEqual([t, "up"]);
		for (const t of ["▼ 2.3% today", "▼ 2.3%", "-7.6%", "\u22127.6%", "↓ 2.3% downside", "▼ -2.3% today", "-$3.00"]) expect([t, signTone(t)]).toEqual([t, "down"]);
		// a figure that prints as zero is neither, and a text with no figure has no sign
		for (const t of ["▲ 0.0% today", "+0.0%", "-0.0%", "▼ 0.0%", "↑ 0.0% upside", "\u2014", "", "Target range published", "n/m"]) expect([t, signTone(t)]).toEqual([t, "flat"]);
	});

	it("draws a gain in Figma's green, a loss in the header's red, zero in the label grey", () => {
		expect(SIGN_TEXT).toEqual({ up: "text-[#2fd08a]", down: "text-[#e5484d]", flat: "text-[#819abb]" });
		// the user's report: "SINCE YOU SAVED -7.6%" on ENPH was green
		expect(signText("-7.6%")).toBe("text-[#e5484d]");
		expect(signText("+4.6%")).toBe("text-[#2fd08a]");
		expect(signText("+0.0%")).toBe("text-[#819abb]");
	});

	it("never gives a figure a verdict that contradicts it", () => {
		// a negative P/E is a loss, not a bargain (the rule read -44.6 as under 20: "Cheap", in green)
		expect(statFor("P/E ratio", -44.6, "pe")).toEqual({ label: "P/E ratio", value: "-44.6", note: "Loss-making", good: false, outlined: false });
		expect(statFor("P/E ratio", 12.3, "pe")).toMatchObject({ value: "12.3", note: "Cheap", good: true, outlined: true });
		expect(statFor("Revenue growth", -3.1, "growth")).toMatchObject({ value: "-3.1%", note: "Shrinking", good: false, outlined: false });
		expect(statFor("Revenue growth", 2.6, "growth")).toMatchObject({ value: "2.6%", note: "Flat", good: false });
		expect(statFor("Revenue growth", 36, "growth")).toMatchObject({ value: "36%", note: "Explosive", good: true, outlined: true });
		expect(statFor("Profit margin", -1.8, "margin")).toMatchObject({ value: "-1.8%", note: "Loss-making", good: false, outlined: false });
		expect(statFor("Profit margin", 5.4, "margin")).toMatchObject({ note: "Thin", good: false });
		expect(statFor("Profit margin", null, "margin")).toMatchObject({ value: "\u2014", note: "No data" });
	});

	it("holds across the whole catalog: no green on a figure under zero, in the tiles or the tables", () => {
		const bad = allTickers().filter((T) => {
			const table = compareFor(T).table;
			const tiles = tilesFor(T);
			return tiles.some((s) => s.good && /^[-\u2212]/.test(s.value)) || !!table?.rows.some((r) => r.cells.some((c) => (c.tone === "up" && /^[-\u2212]/.test(c.text)) || (c.tone === "down" && !/^[-\u2212]/.test(c.text))));
		});
		expect(bad).toEqual([]);
	});
});

describe("News signal: the site's own stories (D1, discover-stock #3 / #4)", () => {
	it("lists each company's stories by their related company, with the line the site lists them under", () => {
		expect(storiesFor("NVDA").map((s) => [s.id, s.source, s.tone])).toEqual([["nvidia-chip-rally", "Reuters · 2d", "Neutral"]]);
		expect(storiesFor("aapl").map((s) => s.id)).toEqual(["apple-foldable"]);
		expect(storiesFor("TSLA")[0]!.tone).toBe("Negative");
		// Home's two Market Mood stories, dated as their Read next cards
		expect(storiesFor("KO").map((s) => [s.id, s.source])).toEqual([["fear-gauge-32", "CNN Business · 1d"]]);
		expect(storiesFor("MSFT").map((s) => [s.id, s.source])).toEqual([["openai-ipo-delayed", "Bloomberg · 1d"]]);
		expect(storiesFor("GOOGL")).toEqual([]);
	});

	it("fills the card: the move, the story's first point and the earnings line, its own story's card first (N39c)", () => {
		const news = siteNews("NVDA", "▲ +2.4% today", FRAME_NOW);
		expect(news.move).toBe("▲ +2.4% today");
		expect(news.lines).toEqual(["Nvidia rose about 9% in the first half, the chip index about 31%.", "Next earnings land Aug 27."]);
		expect(news.articles[0]).toEqual({ source: "Reuters · 2d", tone: "Neutral", text: "Nvidia lags the chip rally it kicked off", story: "nvidia-chip-rally" });
		// a company the site has no story about still has its row and its two lines (no "No fresh headlines today.")
		const goog = siteNews("GOOGL", "", FRAME_NOW);
		expect(goog.lines[0]).toBe("Steady growth from ads.");
		expect(goog.articles.length).toBeGreaterThanOrEqual(2);
	});

	it("opens Apple's article from every one of Figma's four AAPL cards", () => {
		expect(stockDetails.AAPL.news.articles.map((a) => a.story)).toEqual(Array(4).fill("apple-foldable"));
	});

	it("states the API's earnings signal as the phones do", () => {
		expect(earningsLine({ status: "upcoming", date: "2026-07-30" })).toBe("Next earnings land Jul 30.");
		expect(earningsLine({ status: "beat", date: "2026-04-28T00:00:00Z" })).toBe("Earnings beat estimates on Apr 28.");
		expect(earningsLine({ status: "none", date: null })).toBeNull();
		expect(earningsLine(undefined)).toBeNull();
	});

	it("dates the next-earnings line from the clock (N23n, N30.3b): the frame's own date on the frames' day", () => {
		// Saturday, July 4, 2026: Figma 2:3522 prints "Q3 earnings land July 30."
		expect(designEarningsLine(FRAME_NOW)).toBe("Q3 earnings land July 30.");
		expect(designEarningsLine(new Date(2026, 10, 9, 9, 41).getTime())).toBe("Q3 earnings land December 5.");
		// the phones' line for the companies they author (android StockDetailScreen.kt:1099, 1140: StakClock.daysAhead)
		expect(nextEarningsLine("AAPL", FRAME_NOW)).toBe("Next earnings land Jul 30.");
		expect(nextEarningsLine("nvda", FRAME_NOW)).toBe("Next earnings land Aug 27.");
		expect(nextEarningsLine("NVDA", new Date(2026, 10, 9, 9, 41).getTime())).toBe("Next earnings land Jan 2.");
		// every other company has its own day too (N39c: signal.ts earningsInFor), the same on every call; a fund has none
		expect(nextEarningsLine("TSLA", FRAME_NOW)).toMatch(/^Next earnings land [A-Z][a-z]{2} \d{1,2}\.$/);
		expect(nextEarningsLine("TSLA", FRAME_NOW)).toBe(nextEarningsLine("tsla", FRAME_NOW));
		expect(nextEarningsLine("SPY", FRAME_NOW)).toBeNull();
		// every authored company has a day ahead of today
		for (const c of [...Object.values(PHONE_COVERAGE), AAPL_COVERAGE]) expect(c.earningsIn).toBeGreaterThan(0);
	});
});

describe("SINCE YOU SAVED (discover-stock #12)", () => {
	const now = new Date(2026, 6, 4, 12).getTime();
	it("says a save that has not moved has not moved, as the phones do, with no sign on the zero (N23c)", () => {
		expect(sinceSaved("NVDA", { savedAt: now - 60_000, priceAtSave: 122.1 }, 122.1, now)).toEqual({
			delta: "0.0%",
			body: "Saved today. NVDA hasn\u2019t moved since you saved it; check back after a few sessions.",
		});
	});
	it("reports a real move, its pace decided against the market's own move over the same days (NUM-13, N23l)", () => {
		const entry = { savedAt: now - 3 * 86_400_000, priceAtSave: 200 };
		// +5.0 % while the market did +3.2 %: 1.8 points apart, roughly with it (decided by the stock alone it "ran ahead")
		expect(sinceSaved("AAPL", entry, 210, now, 3.2)).toEqual({ delta: "+5.0%", body: "Saved 3 days ago. AAPL is up 5.0% since, moving roughly with the market." });
		expect(sinceSaved("AAPL", entry, 212, now, 3.2).body).toBe("Saved 3 days ago. AAPL is up 6.0% since, running ahead of the market.");
		// the hunt's MRK: down 2.2 % beside a market up 3.2 % is not "roughly with the market"
		expect(sinceSaved("MRK", { savedAt: now - 30 * 86_400_000, priceAtSave: 100 }, 97.8, now, 3.2)).toEqual({ delta: "-2.2%", body: "Saved 4 weeks ago. MRK is down 2.2% since, lagging the market." });
		// the frame's own sentence stays true by the rule: +4.6 % beside the demo market's +3.2 %
		expect(Math.abs(4.6 - 3.2)).toBeLessThan(WITH_THE_MARKET);
		// with no market figure the stock is set against a flat market
		expect(sinceSaved("AAPL", entry, 210, now).body).toBe("Saved 3 days ago. AAPL is up 5.0% since, running ahead of the market.");
	});
	it("starts tracking a save made without a price, once there is one (N30.8c)", () => {
		expect(sinceSaved("SNAP", { savedAt: now, priceAtSave: null }, null, now).body).toBe("Saved today. SNAP starts tracking once it has a price.");
		expect(sinceSaved("SNAP", { savedAt: now, priceAtSave: null }, 12.5, now).body).toBe("Saved today. SNAP started tracking from today\u2019s price.");
	});
	it("gives a frame-only save the phones' demo line with the stock's symbol while the showcase lasts (review 1, N17e)", () => {
		// the closing remark is written for a steady company: NVDA (beta over 1) reads the line without it (N28a)
		expect(betaOf("NVDA")).toBeGreaterThan(1);
		expect(frameSaveIntro("NVDA", true)).toEqual({ delta: "+4.6%", body: "Saved 5 weeks ago. NVDA is up 4.6% since, moving roughly with the market." });
		for (const T of allTickers()) {
			const beta = betaOf(T);
			expect([T, frameSaveIntro(T, true).body.endsWith(" Steady giants tend to.")]).toEqual([T, beta !== null && beta < 1]);
		}
		// after the showcase: the phones' line for a save with no recorded day
		expect(frameSaveIntro("GOOGL", false)).toEqual({ delta: "0.0%", body: "Saved recently. GOOGL hasn\u2019t moved since you saved it; check back after a few sessions." });
	});
});

describe("where a page was opened from (D2, discover-stock #11)", () => {
	const nav = (urls: string[], index: number) => ({
		currentEntry: { url: urls[index]!, index },
		entries: () => urls.map((url, i) => ({ url, index: i })),
	});
	it("names the app section of the entry before this one", () => {
		expect(sectionOf("/home")).toEqual({ label: "Home", to: "/home" });
		expect(sectionOf("/news/fed-minutes")).toEqual({ label: "News", to: "/news" });
		expect(sectionOf("/my-stak/ai-tech")).toEqual({ label: "My STAK", to: "/my-stak" });
		expect(sectionOf("/simulate/picks/NVDA")?.label).toBe("Simulate");
		expect(sectionOf("/stocks/AAPL")).toBeNull();
	});
	it("reads the previous entry only when it is a page of this site", () => {
		const origin = "http://localhost:3100";
		expect(previousAppPath("/", nav([`${origin}/home`, `${origin}/stocks/NVDA`], 1), origin)).toBe("/home");
		expect(previousAppPath("/", nav(["https://example.com/", `${origin}/stocks/NVDA`], 1), origin)).toBeNull();
		expect(previousAppPath("/", nav([`${origin}/stocks/NVDA`], 0), origin)).toBeNull();
		expect(previousAppPath("/", undefined, origin)).toBeNull();
		expect(previousAppPath("/tenant/", nav([`${origin}/tenant/discover`, `${origin}/tenant/stocks/NVDA`], 1), origin)).toBe("/discover");
	});
	it("never counts the landing page, sign-in, onboarding or a sheet as a page to go back to (I-04, N27q)", () => {
		const origin = "http://localhost:3100";
		for (const before of ["/", "/welcome", "/login", "/signup", "/forgot-password", "/onboarding?step=2", "/splash", "/no-such-page", "/simulate?modal=add-success&symbol=NVDA"]) {
			expect([before, previousAppPath("/", nav([`${origin}${before}`, `${origin}/stocks/ENPH?saved=1&from=my-stak`], 1), origin)]).toEqual([before, null]);
		}
		// every page of the shell is one
		for (const before of ["/home", "/news/apple-foldable", "/discover", "/discover/end", "/my-stak/green-energy", "/simulate/picks/NVDA", "/stocks/NVDA", "/profile/edit"]) {
			expect(previousAppPath("/", nav([`${origin}${before}`, `${origin}/stocks/ENPH`], 1), origin)).toBe(before);
		}
		// the browser lists its history: the entry before decides alone; without the list the router's own count stands
		expect(readsHistory(nav([`${origin}/welcome`, `${origin}/stocks/ENPH`], 1))).toBe(true);
		expect(readsHistory(undefined)).toBe(false);
	});
});

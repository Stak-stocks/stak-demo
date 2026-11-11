import { beforeAll, describe, expect, it } from "vitest";
import { financialsOf, loadCatalog } from "@/app/live/catalog";
import { demoPriceHistory } from "@/app/live/history";
import { demoQuote } from "@/app/live/quotes";
import { fundamentalsOf, NO_FIGURE } from "@/app/stocks/fundamentals";
import { ARTICLES, articleById, HOME_ARTICLES } from "../articles";
import { changeToday, changeTone, formatCap, formatPe, formatRange, formatYield, NO_DATA, railStats } from "../rail";
import { LINE_COLOR, LINE_DOWN, LINE_FLAT, LINE_UP, tickerLinePath } from "../TickerLine";

const n = (v: string) => Number(v.replace(/[$,]/g, ""));
const range = (v: string) => v.split("–").map(n) as [number, number];

beforeAll(() => loadCatalog());

describe("the rail follows the quote (news #4, #5; D9)", () => {

	it("prints today's move in the template's format", () => {
		expect(changeToday(4.84)).toBe("+4.84% today");
		expect(changeToday(-7.04)).toBe("-7.04% today");
		expect(changeToday(2.4)).toBe("+2.40% today");
		expect(changeToday(0.2)).toBe("+0.20% today");
		expect(changeToday(-0.4)).toBe("-0.40% today");
	});

	it("a move that prints zero is neutral: no sign, and neither up nor down (zero is neutral: N23c, N28c, N30.3c)", () => {
		// exactly flat: it read "+0.00% today", green
		expect(changeToday(0)).toBe("0.00% today");
		expect(changeToday(-0)).toBe("0.00% today");
		expect(changeTone(0)).toBe("flat");
		// a rounding's worth below zero: it read "-0.00% today", red
		expect(changeToday(-0.004)).toBe("0.00% today");
		expect(changeTone(-0.004)).toBe("flat");
		expect(changeToday(0.004)).toBe("0.00% today");
		expect(changeTone(0.004)).toBe("flat");
		// a figure that is not a number prints the same neutral zero, never "NaN"
		expect(changeToday(Number.NaN)).toBe("0.00% today");
		expect(changeTone(Number.NaN)).toBe("flat");
		// the smallest moves the card can print keep their sign and their tone
		expect(changeToday(0.006)).toBe("+0.01% today");
		expect(changeTone(0.006)).toBe("up");
		expect(changeToday(-0.006)).toBe("-0.01% today");
		expect(changeTone(-0.006)).toBe("down");
		// the tone is read at the card's two decimals, not at the one decimal other pages print
		expect(changeTone(0.04)).toBe("up");
		expect(changeToday(0.04)).toBe("+0.04% today");
		expect(changeTone(-0.04)).toBe("down");
		// the text and the tone can never disagree: whatever prints "0.00" is flat, whatever is flat prints no sign
		for (const pct of [-7.04, -0.0051, -0.005, -0.0049, -0.004, 0, 0.0049, 0.005, 0.0051, 0.2, 4.84]) {
			const text = changeToday(pct);
			const tone = changeTone(pct);
			expect(/^0\.00% today$/.test(text), String(pct)).toBe(tone === "flat");
			expect(text.startsWith("+"), String(pct)).toBe(tone === "up");
			expect(text.startsWith("-"), String(pct)).toBe(tone === "down");
		}
	});

	it("the line takes the same tone: green up, the app's red down, the label grey flat", () => {
		expect(LINE_COLOR).toEqual({ up: LINE_UP, down: LINE_DOWN, flat: LINE_FLAT });
		expect(LINE_FLAT).toBe("#819ABB");
		expect(LINE_COLOR[changeTone(0)]).toBe("#819ABB");
		expect(LINE_COLOR[changeTone(-0.004)]).toBe("#819ABB");
		expect(LINE_COLOR[changeTone(-0.4)]).toBe("#FF5A6A");
		expect(LINE_COLOR[changeTone(1.2)]).toBe("#2FD08A");
	});

	it("none of today's ten demo quotes prints zero (the neutral state needs a live quote), so every card keeps its sign", () => {
		for (const a of [...ARTICLES, ...HOME_ARTICLES]) {
			const q = demoQuote(a.ticker.symbol)!;
			expect(changeTone(q.changePercent), a.ticker.symbol).not.toBe("flat");
			expect(changeToday(q.changePercent), a.ticker.symbol).toMatch(/^[+-]\d+\.\d\d% today$/);
		}
	});

	it("formats the catalog's snapshot like the frame's rows", () => {
		expect(formatCap("$4.65T")).toBe("$4.65T");
		expect(formatCap("580B")).toBe("$580B");
		expect(formatCap("$612B AUM")).toBe("$612B");
		expect(formatPe("49.62")).toBe("49.6");
		expect(formatPe(34)).toBe("34.0");
		expect(formatPe("—")).toBe("—");
		expect(formatYield("0.5%")).toBe("0.50%");
		expect(formatYield("—")).toBe("—");
		expect(formatRange(301.2, 309.8)).toBe("$301.20–$309.80");
	});

	it("with the API down, every article's ranges hold the company's demo price (never the authored figures around another price)", () => {
		for (const a of [...ARTICLES, ...HOME_ARTICLES]) {
			const q = demoQuote(a.ticker.symbol)!;
			expect(q, a.ticker.symbol).not.toBeNull();
			const day = demoPriceHistory(a.ticker.symbol, "1D", q)!;
			const year = demoPriceHistory(a.ticker.symbol, "1Y", q)!;
			const rows = railStats(a.keyStats.rows, { api: null, catalog: financialsOf(a.ticker.symbol) ?? null, day, year });
			const [lo, hi] = range(rows[1]![0]!.value);
			const [wlo, whi] = range(rows[2]![0]!.value);
			expect(q.price, a.id).toBeGreaterThanOrEqual(lo);
			expect(q.price, a.id).toBeLessThanOrEqual(hi);
			expect(wlo, a.id).toBeLessThanOrEqual(lo);
			expect(whi, a.id).toBeGreaterThanOrEqual(hi);
			// the labels and the volume stay the template's / the record's
			expect(rows.map((r) => r.map((c) => c.label))).toEqual(a.keyStats.rows.map((r) => r.map((c) => c.label)));
			expect(rows[1]![1]!.value).toBe(a.keyStats.rows[1]![1]!.value);
		}
	});

	it("a company the accessor does not know: cap, P/E and yield from the catalog's snapshot while the quote is a demo one", () => {
		const a = articleById("nvidia-chip-rally")!;
		const fin = financialsOf("NVDA")!;
		const rows = railStats(a.keyStats.rows, { api: null, catalog: fin, day: null, year: null });
		expect(rows[0]![0]!.value).toBe(formatCap(fin.marketCap.value));
		expect(rows[0]![1]!.value).toBe(formatPe(fin.peRatio.value));
		expect(rows[2]![1]!.value).toBe(formatYield(fin.dividendYield.value));
		// no history and no API: the ranges say so instead of inventing one
		expect(rows[1]![0]!.value).toBe(NO_DATA);
		expect(rows[2]![0]!.value).toBe(NO_DATA);
	});

	it("a company the accessor does not know: the API's metrics and ranges when the quote is a live one", () => {
		const a = articleById("tesla-deliveries")!;
		const rows = railStats(a.keyStats.rows, {
			api: { marketCap: "1.1T", peRatio: 101.25, dividendYield: "0%", week52Low: 180, week52High: 490, dayLow: 240.5, dayHigh: 251.25 },
			catalog: financialsOf("TSLA") ?? null,
			day: { low: 1, high: 2 },
			year: { low: 1, high: 2 },
		});
		expect(rows[0]!.map((c) => c.value)).toEqual(["$1.1T", "101.3"]);
		expect(rows[1]![0]!.value).toBe("$240.50–$251.25");
		expect(rows[2]!.map((c) => c.value)).toEqual(["$180.00–$490.00", "0.00%"]);
	});
});

describe("the ticker card's line is the company's own (news #4)", () => {
	it("runs from the box's left edge to its right, the highest close on top, the lowest at the bottom", () => {
		const d = tickerLinePath([10, 12, 11, 14]);
		const pts = d
			.slice(1)
			.split("L")
			.map((p) => p.split(" ").map(Number) as [number, number]);
		expect(pts[0]![0]).toBeCloseTo(3.121, 3);
		expect(pts.at(-1)![0]).toBeCloseTo(273.521, 3);
		expect(pts[0]![1]).toBeCloseTo(75.921, 3); // 10 is the lowest
		expect(pts.at(-1)![1]).toBeCloseTo(3.121, 3); // 14 is the highest
	});

	it("falls on a down day (the phones flip the line and turn it red)", () => {
		const q = demoQuote("MSFT")!; // -0.4% today
		const day = demoPriceHistory("MSFT", "1D", q)!;
		expect(day.change).toBeLessThan(0);
		const pts = tickerLinePath(day.closes)
			.slice(1)
			.split("L")
			.map((p) => p.split(" ").map(Number) as [number, number]);
		expect(pts.at(-1)![1]).toBeGreaterThan(pts[0]![1]); // ends lower on the card than it starts
		expect(LINE_DOWN).toBe("#FF5A6A");
		expect(LINE_UP).toBe("#2FD08A");
	});

	it("draws a 79-bar day as a clean line (simplified to the card's scale), a flat day through the middle, nothing for one close", () => {
		const q = demoQuote("NVDA")!;
		const day = demoPriceHistory("NVDA", "1D", q)!;
		expect(day.closes.length).toBe(79);
		const segments = tickerLinePath(day.closes).split("L").length;
		expect(segments).toBeGreaterThan(4);
		expect(segments).toBeLessThan(60);
		expect(tickerLinePath([5, 5, 5])).toBe("M3.121 39.521L273.521 39.521");
		expect(tickerLinePath([5])).toBe("");
		expect(tickerLinePath([])).toBe("");
	});
});

describe("Key stats print the company's ONE P/E and market cap (the hunt's NUM-05; N23j, N23o)", () => {
	const all = [...ARTICLES, ...HOME_ARTICLES];

	it("every article's company has its figures in the accessor the stock pages read", () => {
		for (const a of all) {
			const f = fundamentalsOf(a.ticker.symbol);
			expect(f, a.ticker.symbol).not.toBeNull();
			expect(f!.text.pe, a.ticker.symbol).not.toBe(NO_FIGURE);
			expect(f!.text.cap, a.ticker.symbol).toMatch(/^\$\d/);
		}
	});

	it("market cap and P/E are the accessor's, cell for cell, for every article (demo quote: the API down)", () => {
		for (const a of all) {
			const sym = a.ticker.symbol;
			const f = fundamentalsOf(sym)!;
			const rows = railStats(a.keyStats.rows, { fundamentals: f, api: null, catalog: financialsOf(sym) ?? null, day: null, year: null });
			expect(rows[0]!.map((c) => c.value), a.id).toEqual([f.text.cap, f.text.pe]);
			// the labels, the volume and the yield's source are untouched
			expect(rows.map((r) => r.map((c) => c.label))).toEqual(a.keyStats.rows.map((r) => r.map((c) => c.label)));
			expect(rows[1]![1]!.value).toBe(a.keyStats.rows[1]![1]!.value);
			expect(rows[2]![1]!.value).toBe(formatYield(financialsOf(sym)!.dividendYield.value));
		}
	});

	it("NVDA: the article no longer prints the catalog's 49.6 / $4.65T beside the stock page's own figures", () => {
		const a = articleById("nvidia-chip-rally")!;
		const f = fundamentalsOf("NVDA")!;
		expect(f.source).toBe("phones");
		const rows = railStats(a.keyStats.rows, { fundamentals: f, api: null, catalog: financialsOf("NVDA") ?? null, day: null, year: null });
		expect(rows[0]![0]!.value).toBe(f.text.cap);
		expect(rows[0]![1]!.value).toBe(f.text.pe);
		// the record's own showcase figures are never printed once the accessor answers
		expect(rows[0]!.map((c) => c.value)).not.toEqual(a.keyStats.rows[0]!.map((c) => c.value));
	});

	it("a live quote changes the ranges and the yield, never the company's P/E and cap", () => {
		const a = articleById("tesla-deliveries")!;
		const f = fundamentalsOf("TSLA")!;
		const rows = railStats(a.keyStats.rows, {
			fundamentals: f,
			api: { marketCap: "1.1T", peRatio: 101.25, dividendYield: "0%", week52Low: 180, week52High: 490, dayLow: 240.5, dayHigh: 251.25 },
			catalog: financialsOf("TSLA") ?? null,
			day: { low: 1, high: 2 },
			year: { low: 1, high: 2 },
		});
		expect(rows[0]!.map((c) => c.value)).toEqual([f.text.cap, f.text.pe]);
		expect(rows[1]![0]!.value).toBe("$240.50–$251.25");
		expect(rows[2]!.map((c) => c.value)).toEqual(["$180.00–$490.00", "0.00%"]);
	});

	it("a figure the accessor does not state reads the dash every card prints, not a second source's number", () => {
		const a = articleById("fed-minutes")!;
		const rows = railStats(a.keyStats.rows, { fundamentals: { text: { pe: NO_FIGURE, cap: "$690B" } }, api: null, catalog: financialsOf("JPM") ?? null, day: null, year: null });
		expect(rows[0]!.map((c) => c.value)).toEqual(["$690B", "—"]);
	});
});

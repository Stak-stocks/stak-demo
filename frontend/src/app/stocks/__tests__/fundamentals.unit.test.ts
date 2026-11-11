import { beforeAll, describe, expect, it } from "vitest";
import { allTickers, financialsOf, loadCatalog } from "@/app/live/catalog";
import { AAPL_COVERAGE, PHONE_COVERAGE } from "../coverage";
import { capDollars, figure, fundamentalsOf, hasFundamentals, NO_FIGURE, pctText, peText, signedPctText } from "../fundamentals";
import { displayInitial, displayName, displayTickerLine } from "../names";

beforeAll(() => loadCatalog());

describe("one figure per company everywhere: the accessor (N23j, NUM-05)", () => {
	it("gives the phones' authored figures for their nineteen companies", () => {
		// the hunt's examples: the article said P/E 49.6 and $4.65T (the catalog) beside the stock page's 52.8 and $3.0T
		expect(fundamentalsOf("NVDA")).toEqual({
			ticker: "NVDA",
			source: "phones",
			pe: 52.8,
			growth: 62,
			margin: 48.9,
			cap: 3e12,
			text: { pe: "52.8", growth: "62%", margin: "48.9%", cap: "$3.0T" },
		});
		expect(fundamentalsOf("nvda")).toEqual(fundamentalsOf("NVDA"));
		expect(financialsOf("NVDA")?.peRatio.value).toBe("49.6");
		for (const [T, pe, cap] of [["GS", "15.2", "$189B"], ["AAPL", "31.2", "$3.5T"], ["MSFT", "37.5", "$3.8T"], ["O", "54.3", "$53.2B"], ["JPM", "13.1", "$690B"]] as const) {
			expect([T, fundamentalsOf(T)!.text.pe, fundamentalsOf(T)!.text.cap]).toEqual([T, pe, cap]);
		}
		// all nineteen, each figure printed exactly as the phones' tile writes it
		for (const [T, c] of [...Object.entries(PHONE_COVERAGE), ["AAPL", AAPL_COVERAGE] as const]) {
			const f = fundamentalsOf(T)!;
			expect([T, f.source, f.text.pe, f.text.growth, f.text.margin]).toEqual([T, "phones", c.stats[0]![1], c.stats[1]![1], c.stats[2]![1]]);
			expect([T, f.text.cap]).toEqual([T, c.rows[3]![1]]);
			expect(f.cap).toBeGreaterThan(1e9);
		}
	});

	it("gives the catalog's figures for every other company, in the authored tiles' formats", () => {
		const tsla = fundamentalsOf("TSLA")!;
		expect(tsla.source).toBe("catalog");
		expect([tsla.pe, tsla.growth, tsla.margin]).toEqual([391.3, -3.1, 3.4]);
		expect(tsla.text).toEqual({ pe: "391.3", growth: "-3.1%", margin: "3.4%", cap: "$1.38T" });
		expect(tsla.cap).toBe(1.38e12);
		// every catalog company has an answer; a figure it does not state is the one dash
		for (const T of allTickers()) {
			const f = fundamentalsOf(T)!;
			expect(f).not.toBeNull();
			for (const [n, t] of [[f.pe, f.text.pe], [f.growth, f.text.growth], [f.margin, f.text.margin]] as const) expect(n === null).toBe(t === NO_FIGURE);
			expect(f.text.pe === NO_FIGURE || /^-?\d+\.\d$/.test(f.text.pe)).toBe(true);
			expect(f.text.growth === NO_FIGURE || (/^-?\d+(\.\d)?%$/.test(f.text.growth) && !f.text.growth.endsWith(".0%"))).toBe(true);
			expect(f.text.margin === NO_FIGURE || (/^-?\d+(\.\d)?%$/.test(f.text.margin) && !f.text.margin.endsWith(".0%"))).toBe(true);
			expect(f.text.cap === NO_FIGURE || f.text.cap.startsWith("$")).toBe(true);
		}
	});

	it("takes the phones' own peer cells for the three peers no catalog lists, and nothing for a stranger", () => {
		for (const T of ["SEDG", "ELV", "DECK"]) expect(financialsOf(T)).toBeUndefined();
		// ENPH's table: SEDG "n/m" / "-14%" / "n/m" / "$1.2B" ("n/m" is no figure: the one dash)
		expect(fundamentalsOf("SEDG")).toMatchObject({ source: "phones", pe: null, growth: -14, margin: null, text: { pe: NO_FIGURE, growth: "-14%", margin: NO_FIGURE, cap: "$1.2B" } });
		expect(fundamentalsOf("ELV")).toMatchObject({ pe: 11, growth: 7, margin: 3, text: { pe: "11.0", growth: "7%", margin: "3%", cap: "$70B" } });
		expect(fundamentalsOf("DECK")?.text).toEqual({ pe: "18.0", growth: "16%", margin: "19%", cap: "$17B" });
		expect(hasFundamentals("SEDG")).toBe(true);
		expect(fundamentalsOf("NOSUCH")).toBeNull();
		expect(hasFundamentals("NOSUCH")).toBe(false);
	});

	it("formats one way per measure", () => {
		expect([peText(52.8), peText(28), peText(-46.12), peText(null)]).toEqual(["52.8", "28.0", "-46.1", NO_FIGURE]);
		expect([pctText(62), pctText(8.1), pctText(36.04), pctText(-5), pctText(0), pctText(null)]).toEqual(["62%", "8.1%", "36%", "-5%", "0%", NO_FIGURE]);
		expect([signedPctText(62), signedPctText(-14), signedPctText(0), signedPctText(6.1), signedPctText(null)]).toEqual(["+62%", "-14%", "0%", "+6.1%", NO_FIGURE]);
		expect([figure("52.8"), figure("+62%"), figure("110x"), figure("-14%"), figure("−2%"), figure("n/m"), figure("—"), figure(undefined)]).toEqual([52.8, 62, 110, -14, -2, null, null, null]);
		expect([capDollars("$3.0T"), capDollars("1.38T"), capDollars("$46.2B"), capDollars("$622M"), capDollars(""), capDollars(undefined)]).toEqual([3e12, 1.38e12, 4.62e10, 6.22e8, null, null]);
	});
});

describe("one display name per company on Discover and the stock pages (N30.8f, C-10)", () => {
	it("prints the company, not a product or the ticker twice", () => {
		expect(displayName("GOOGL")).toBe("Alphabet");
		expect(displayTickerLine("googl")).toBe("GOOGL · Alphabet");
		expect(displayTickerLine("AMD")).toBe("AMD · Advanced Micro Devices");
		expect(displayTickerLine("NVDA")).toBe("NVDA · NVIDIA");
		expect(displayName("AAPL")).toBe("Apple");
		// never "T · T": a company nobody names prints its ticker alone
		expect(displayTickerLine("NOSUCH")).toBe("NOSUCH");
		const doubled = allTickers().filter((T) => {
			const [a, b] = displayTickerLine(T).split(" · ");
			return a === b;
		});
		expect(doubled).toEqual([]);
		// the coin's letter is the catalog's rule (the ticker's first letter, N30.8r)
		expect(displayInitial("GOOGL")).toBe("G");
	});
});

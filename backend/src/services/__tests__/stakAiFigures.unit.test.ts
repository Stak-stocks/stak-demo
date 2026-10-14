import { describe, expect, it } from "vitest";
import { answerFigures, unsupportedFigures } from "../stakAiFigures.js";

const NVDA_NOTES = `NVIDIA (NVDA): closed at $226.15, down 1.29% today | P/E 28.6 | mkt cap $5.53T | past year +19.1% | past 13 weeks (about a quarter) +8.7% | latest reported quarter vs the same quarter a year earlier: revenue +105.8%, EPS +128.2%
NVIDIA (NVDA) last 4 reported quarters:
  - Fiscal Q2 2027 (period listed as Sep 2026): $2.22 vs $2.14 estimate - beat by $0.08 (3.8%)
  - Fiscal Q1 2027 (period listed as Jun 2026): $1.87 vs $1.79 estimate - beat by $0.08 (4.3%)
  - (Thu, Oct 9) Yahoo Finance: Nvidia gains 2% as chip stocks rally; 300 engineers join, 45% of sales from data centers`;

describe("STAK AI number check", () => {
	it("finds dollar amounts (with their scale) and percentages, not years, quarters or plain counts", () => {
		expect(answerFigures("In fiscal Q2 2027 EPS was $2.22, up 128.2% over 13 weeks; market cap $5.53 trillion and 4 percent.").map((f) => f.text))
			.toEqual(["$2.22", "128.2%", "$5.53 trillion", "4 percent"]);
	});

	it("accepts the evidence's figures as the answer rounded them, and the exact gap between two dollar figures", () => {
		expect(unsupportedFigures("NVIDIA beat: $2.22 vs $2.14, a beat of $0.08 (3.8%). Up 19% this year, revenue +106%.", NVDA_NOTES)).toEqual([]);
		expect(unsupportedFigures("Its market cap is $5.53 trillion. EPS rose $0.35 between the two quarters.", NVDA_NOTES)).toEqual([]);
		expect(unsupportedFigures("It's up about 9% over the past three months.", NVDA_NOTES)).toEqual([]);
	});

	it("flags figures that came from nowhere - the invented NVIDIA quarter, an invented whole-number move", () => {
		expect(unsupportedFigures("For fiscal Q1 2027, EPS was $0.98 against a $0.90 estimate.", NVDA_NOTES)).toEqual(["$0.98", "$0.90"]);
		expect(unsupportedFigures("Apple is up 12.5% over the last year.", "No company data was loaded up front.")).toEqual(["12.5%"]);
		// Whole-number percents aren't let through by gaps between the notes' percents (45 - 19.1... and so on).
		expect(unsupportedFigures("NVIDIA is up 26% this year.", NVDA_NOTES)).toEqual(["26%"]);
		// Dates and counts in the evidence don't count as figures; nor does a wrong scale.
		expect(unsupportedFigures("It's down 300% and worth $5.53 billion.", NVDA_NOTES)).toEqual(["300%", "$5.53 billion"]);
	});

	it("leaves worked examples and long-run background alone, but not facts that merely say 'if a'", () => {
		const marketCap = "Market cap is a company's total value.\n\nImagine a company with 10 million shares. Each share costs $10. Its market cap is $100 million.\n\nApple's market cap is $3.2 trillion.";
		expect(unsupportedFigures(marketCap, "")).toEqual(["$3.2 trillion"]);
		expect(unsupportedFigures("Historically, the S&P 500 has returned about 10% a year. A move under 1% is normal noise.", "")).toEqual([]);
		expect(unsupportedFigures("If a company beats, shares often rise. NVIDIA earned $0.98 vs $0.90.", NVDA_NOTES)).toEqual(["$0.98", "$0.90"]);
		// The P/E and EPS explanations STAK AI actually gave: one-sentence hypotheticals.
		expect(unsupportedFigures("So, if a company's stock trades at $100 per share and its earnings per share were $5, its P/E ratio would be 20 ($100 / $5 = 20).", "")).toEqual([]);
		expect(unsupportedFigures("So, if a company has a profit of $10 million and 10 million shares, the EPS would be $1.00.", "")).toEqual([]);
		// How beta is explained: "if the market..." / "for every..." are explanations, not claims.
		expect(unsupportedFigures("If the market goes up 1%, this stock might go up 1.5%. For every 1% move, it moves 0.5%.", "")).toEqual([]);
		// A comma after a figure isn't part of it.
		expect(answerFigures("It closed at $5, then rose to $1,250.50.").map((f) => f.text)).toEqual(["$5", "$1,250.50"]);
	});
});

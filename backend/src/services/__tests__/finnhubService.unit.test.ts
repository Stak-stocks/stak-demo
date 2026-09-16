import { describe, expect, it } from "vitest";
import { classifyArticle, type FinnhubArticle } from "../finnhubService.js";

function makeArticle(overrides: Partial<FinnhubArticle> = {}): FinnhubArticle {
	return {
		headline: "",
		summary: "",
		url: "https://example.com",
		image: "",
		source: "Test",
		datetime: Date.now() / 1000,
		category: "general",
		id: 1,
		related: "",
		...overrides,
	};
}

describe("classifyArticle", () => {
	it("returns 'company' when company name appears in the headline", () => {
		const article = makeArticle({ headline: "Apple reports record quarterly earnings" });
		expect(classifyArticle(article, "Apple", "AAPL")).toBe("company");
	});

	it("returns 'company' when ticker appears in the headline", () => {
		const article = makeArticle({ headline: "NVDA surges after strong guidance" });
		expect(classifyArticle(article, "Nvidia", "NVDA")).toBe("company");
	});

	it("is case-insensitive for company name matching", () => {
		const article = makeArticle({ headline: "TESLA CUTS PRICES IN EUROPE" });
		expect(classifyArticle(article, "Tesla", "TSLA")).toBe("company");
	});

	it("returns 'macro' when a macro signal appears in the headline", () => {
		const article = makeArticle({ headline: "Federal Reserve raises interest rate by 25bps" });
		expect(classifyArticle(article)).toBe("macro");
	});

	it("returns 'macro' when a macro signal appears in the summary but not headline", () => {
		const article = makeArticle({
			headline: "Markets react to latest data",
			summary: "The CPI report shows inflation slowing across the board",
		});
		expect(classifyArticle(article)).toBe("macro");
	});

	it("returns 'sector' when no company name, ticker, or macro signal matches", () => {
		const article = makeArticle({
			headline: "Tech stocks move higher on positive sentiment",
			summary: "Broad sector gains driven by investor optimism",
		});
		expect(classifyArticle(article)).toBe("sector");
	});

	it("prefers 'company' over 'macro' when both match", () => {
		// Company name in headline takes priority over macro signal in summary
		const article = makeArticle({
			headline: "Tesla announces layoffs amid tariff concerns",
			summary: "Trade policy and tariffs weigh on EV maker outlook",
		});
		expect(classifyArticle(article, "Tesla", "TSLA")).toBe("company");
	});

	it("does not match a ticker inside a longer word", () => {
		// "googl" is a substring of "google"; a story about another company that
		// merely says "Google" must not become GOOGL company news via the ticker.
		const article = makeArticle({ headline: "What Happens To Apple Stock If Its Margin Keeps Slipping?" });
		expect(classifyArticle(article, "Google", "GOOGL")).toBe("sector");
	});

	it("does not let a one-letter ticker claim ordinary headlines", () => {
		const article = makeArticle({ headline: "The 1 Metric That Separates Joby From Archer" });
		expect(classifyArticle(article, "Realty Income", "O")).toBe("sector");
	});

	it("matches a short ticker only when it is cited explicitly", () => {
		expect(classifyArticle(makeArticle({ headline: "Realty Income (O) raises its dividend" }), undefined, "O")).toBe("company");
		expect(classifyArticle(makeArticle({ headline: "Why shares of $V are moving" }), undefined, "V")).toBe("company");
		expect(classifyArticle(makeArticle({ headline: "Stocks slip on softer data" }), undefined, "ON")).toBe("sector");
	});

	it("does not treat an everyday word as the company it shares a name with", () => {
		const article = makeArticle({ headline: "Analyst lifts Nvidia price target ahead of earnings" });
		expect(classifyArticle(article, "Target", "TGT")).toBe("sector");
	});

	it("matches a name as a whole word, not inside another word", () => {
		expect(classifyArticle(makeArticle({ headline: "Metaverse spending cools" }), "Meta", "META")).toBe("sector");
		expect(classifyArticle(makeArticle({ headline: "Tesla must prove Cybercab is legal to sell" }), "Tesla", "TSLA")).toBe("company");
	});

	it("returns 'sector' when called with no company info and no macro signal", () => {
		const article = makeArticle({
			headline: "AI chips demand remains strong across the industry",
		});
		expect(classifyArticle(article)).toBe("sector");
	});
});

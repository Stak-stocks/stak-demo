import { describe, expect, it, vi } from "vitest";

vi.mock("../geminiService.js", () => ({
	GEMINI_MODEL: "test",
	geminiUrl: () => "",
	getGeminiKeys: () => [],
	withGeminiConcurrencyLimit: (fn: () => unknown) => fn(),
}));

const { isAboutCompany, isChange } = await import("../updatesService.js");

const about = (headline: string, ticker: string, name: string, summary = "") => isAboutCompany({ headline, summary }, ticker, name);

describe("isAboutCompany", () => {
	it("doesn't file a story that only uses the ticker as a word (the Elf album under e.l.f.)", () => {
		expect(about("Singer releases new Elf-inspired holiday album", "ELF", "e.l.f. Beauty")).toBe(false);
		expect(about("Elf returns to theatres for its anniversary", "ELF", "e.l.f. Beauty")).toBe(false);
	});

	it("still finds real e.l.f. news, however the name or ticker is written", () => {
		expect(about("e.l.f. Beauty raises full-year sales outlook", "ELF", "e.l.f. Beauty")).toBe(true);
		expect(about("Elf Beauty shares jump after earnings beat", "ELF", "e.l.f. Beauty")).toBe(true);
		expect(about("Cosmetics maker (ELF) tops estimates", "ELF", "e.l.f. Beauty")).toBe(true);
		expect(about("Why $ELF is on the move", "ELF", "e.l.f. Beauty")).toBe(true);
		expect(about("e.l.f. Cosmetics opens its first flagship store", "ELF", "e.l.f. Beauty")).toBe(true);
	});

	it("a generic first word in the name doesn't claim every story in the industry", () => {
		expect(about("Ulta sees strong beauty demand into the holidays", "ELF", "e.l.f. Beauty")).toBe(false);
		expect(about("First-time buyers return to the housing market", "FSLR", "First Solar")).toBe(false);
	});

	it("short and everyday-word tickers count only when cited; the company's everyday name still counts", () => {
		expect(about("Now is the time to rethink cloud spending", "NOW", "ServiceNow")).toBe(false);
		expect(about("ServiceNow (NOW) beats on subscription revenue", "NOW", "ServiceNow")).toBe(true);
		expect(about("U.S. jobs report beats expectations", "U", "Unity Software")).toBe(false);
		expect(about("T-Mobile raises subscriber guidance", "T", "AT&T")).toBe(false);
		expect(about("AT&T (T) adds more fiber customers", "T", "AT&T")).toBe(true);
		expect(about("Meta unveils new smart glasses", "META", "Meta Platforms")).toBe(true);
	});

	it("keeps the Estée Lauder case the first-word rule was written for", () => {
		expect(about("Estee Lauder names new chief executive", "EL", "Estée Lauder Companies")).toBe(true);
	});

	it("a peer's story isn't this company's", () => {
		expect(about("PepsiCo raises its dividend", "MNST", "Monster Beverage")).toBe(false);
	});
});

describe("isChange", () => {
	const change = (headline: string, source = "Business Wire") => isChange({ headline, summary: "", source });

	it("a marketing stunt isn't a business change (e.l.f.'s promo album)", () => {
		expect(change("e.l.f. Cosmetics Drops Second Original Album, \"Mirror Mix,\" to Champion Next Generation of Breakthrough Artists")).toBe(false);
	});

	it("an opinion listicle isn't results", () => {
		expect(change("2 Reasons to Watch ELF and 1 to Stay Cautious", "StockStory")).toBe(false);
		expect(change("e.l.f. Beauty beats on revenue", "StockStory")).toBe(false);
	});

	it("real news still counts", () => {
		expect(change("e.l.f. Beauty raises full-year sales outlook")).toBe(true);
		expect(change("rhode Announces New Exclusives at Sephora Across Europe and the U.K.")).toBe(true);
	});
});

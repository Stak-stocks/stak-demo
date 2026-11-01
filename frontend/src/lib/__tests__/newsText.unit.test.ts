import { describe, expect, it } from "vitest";
import { deckStories, newsAge, summaryBeyondHeadline } from "../newsText";
import { expandQuery, matchesLive } from "../newsSearch";
import { moodColor, moodScore, moodStatus } from "../marketMood";

describe("summaryBeyondHeadline", () => {
	it("returns null when the summary adds nothing", () => {
		expect(summaryBeyondHeadline("Fed holds rates steady", "Fed holds rates steady")).toBeNull();
		expect(summaryBeyondHeadline("Fed holds rates", "short")).toBeNull();
		expect(summaryBeyondHeadline("Fed holds rates", undefined)).toBeNull();
	});

	it("drops the headline's own words from the front of a summary", () => {
		const out = summaryBeyondHeadline("Fed holds rates steady", "Fed holds rates steady. Officials signalled no cuts before the autumn meeting.");
		expect(out).toBe("Officials signalled no cuts before the autumn meeting.");
	});

	it("keeps an unrelated summary whole", () => {
		expect(summaryBeyondHeadline("Fed holds rates steady", "Chipmakers rallied as demand for AI hardware stayed strong all week.")).toBe(
			"Chipmakers rallied as demand for AI hardware stayed strong all week.",
		);
	});
});

describe("newsAge", () => {
	it("reads minutes, hours, days - without 'ago'", () => {
		const now = 1_000_000_000_000;
		const sec = now / 1000;
		expect(newsAge(sec - 5 * 60, now)).toBe("5m");
		expect(newsAge(sec - 3 * 3600, now)).toBe("3h");
		expect(newsAge(sec - 2 * 86400, now)).toBe("2d");
	});
});

describe("deckStories", () => {
	it("shows loading bars until news arrives, and a plain message when it fails", () => {
		expect(deckStories(undefined, false).every((s) => s.loading)).toBe(true);
		const failed = deckStories(undefined, true);
		expect(failed[0].title).toBe("Market news isn't loading");
		expect(failed[1].title).toBe("");
	});

	it("cuts long titles at 65 characters", () => {
		const long = "A".repeat(80);
		const [first] = deckStories([{ headline: long, summary: "", source: "x", url: "u", image: "", datetime: 0, explanation: "", whyItMatters: "", sentiment: "neutral", type: "macro" }], false);
		expect(first.title).toBe(`${"A".repeat(65)}…`);
	});
});

describe("news search", () => {
	const brands = [{ ticker: "TSLA", name: "Tesla" }, { ticker: "AAPL", name: "Apple" }];
	const story = { headline: "Tesla recalls cars", source: "Wire", url: "u", image: "", datetime: 0, summary: "", explanation: "", whyItMatters: "", sentiment: "neutral" as const, type: "company" as const, ticker: "TSLA" };

	it("finds a company by its ticker and a ticker by its company", () => {
		expect(expandQuery("TSLA", brands)).toContain("Tesla");
		expect(expandQuery("tesla", brands)).toContain("TSLA");
		expect(matchesLive({ ...story, headline: "Elon's carmaker recalls cars" }, "tesla", expandQuery("tesla", brands))).toBe(true);
	});

	it("matches an expanded ticker only as a whole word, in capitals", () => {
		const gartner = [{ ticker: "IT", name: "Gartner" }];
		const terms = expandQuery("gartner", gartner);
		expect(matchesLive({ ...story, ticker: undefined, headline: "Bitcoin rally continues" }, "gartner", terms)).toBe(false);
		expect(matchesLive({ ...story, ticker: undefined, headline: "IT spending rises" }, "gartner", terms)).toBe(true);
	});
});

describe("market mood", () => {
	it("words, scores and colours a mood like Android", () => {
		expect(moodStatus("Bullish", "settled")).toEqual({ lead: "Bullish momentum", rest: ", momentum is building." });
		expect(moodStatus(undefined, "loading").lead).toBe("Reading the market");
		expect(moodStatus("", "settled").lead).toBe("Mood unavailable");
		expect(moodScore("Bearish")).toBe(12);
		expect(moodScore("")).toBeNull();
		expect(moodColor("Mixed")).toBe("#DEB940");
	});
});

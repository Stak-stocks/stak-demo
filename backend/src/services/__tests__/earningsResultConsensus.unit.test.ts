import { describe, expect, it, vi } from "vitest";

const getCompanyNewsMock = vi.fn();

vi.mock("../finnhubService.js", () => ({
	getCompanyNews: getCompanyNewsMock,
}));

vi.mock("../geminiService.js", () => ({
	getEarningsBeatMissFromWeb: vi.fn(),
}));

describe("hasSameDayEarningsArticle", () => {
	it("matches an article published after 8pm ET, even though its raw UTC timestamp already rolled to the next day", async () => {
		const { hasSameDayEarningsArticle } = await import("../earningsResultConsensus.js");

		const todayStr = "2026-06-29";
		// 9:00 PM EDT on 2026-06-29 == 2026-06-30T01:00:00Z -- raw UTC conversion would
		// read this as "2026-06-30", one day past todayStr, even though it's still
		// "today" for any US-market reader.
		getCompanyNewsMock.mockResolvedValue([
			{
				headline: "Acme Corp reports third quarter results",
				summary: "Acme Corp announced quarterly earnings results after the bell.",
				url: "https://example.com",
				image: "",
				source: "Example Wire",
				datetime: 1782781200, // 2026-06-30T01:00:00Z == 2026-06-29 21:00 EDT
				category: "company",
				id: 1,
				related: "ACME",
			},
		]);

		const result = await hasSameDayEarningsArticle("ACME", "Acme Corp", todayStr);
		expect(result).toBe(true);
	});

	it("does not match an article actually published the next ET day", async () => {
		const { hasSameDayEarningsArticle } = await import("../earningsResultConsensus.js");

		const todayStr = "2026-06-29";
		// 10:00 AM EDT on 2026-06-30 -- genuinely the next ET day, should not match.
		getCompanyNewsMock.mockResolvedValue([
			{
				headline: "Acme Corp reports third quarter results",
				summary: "Acme Corp announced quarterly earnings results.",
				url: "https://example.com",
				image: "",
				source: "Example Wire",
				datetime: Math.floor(new Date("2026-06-30T14:00:00Z").getTime() / 1000),
				category: "company",
				id: 2,
				related: "ACME",
			},
		]);

		const result = await hasSameDayEarningsArticle("ACME", "Acme Corp", todayStr);
		expect(result).toBe(false);
	});
});

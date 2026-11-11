import { describe, expect, it } from "vitest";
import { seedGuest } from "@/app/live/guest";
import { newsListing, TAGS } from "../data";
import { FEED_CARDS, listingSections, loneSection } from "../sections";

const persona = new Set(seedGuest().saves.map((s) => s.ticker));
const ids = (cards: readonly { id: string }[]) => cards.map((c) => c.id);
const tags = (cards: readonly { tag: string }[]) => [...new Set(cards.map((c) => c.tag))];

describe("For You and Markets follow the person's saves (news #6, D9)", () => {
	it("the untouched showcase keeps Figma's grid verbatim: its three and three, every card In your STAK", () => {
		const s = listingSections(true, persona);
		expect(s.forYou).toBe(newsListing.forYou.cards);
		expect(s.markets).toBe(newsListing.markets.cards);
		expect(tags([...s.forYou, ...s.markets])).toEqual([TAGS.inYourStak]);
	});

	it("after the first action For You holds the stories about companies in the STAK, in feed order; Markets the rest", () => {
		// the persona saves TSLA and O among its nineteen (not NVDA, AAPL, MU, XOM)
		const s = listingSections(false, persona);
		expect(ids(s.forYou)).toEqual(["tesla-deliveries", "june-jobs-miss"]);
		expect(ids(s.markets)).toEqual(["nvidia-chip-rally", "apple-foldable", "memory-chips-soar", "oil-slips-iran"]);
		expect(tags(s.forYou)).toEqual([TAGS.inYourStak]);
		expect(tags(s.markets)).toEqual([TAGS.other]);
	});

	it("a save moves its story into For You at once, in the feed's order; an unsave moves it back", () => {
		const saved = new Set([...persona, "AAPL"]);
		expect(ids(listingSections(false, saved).forYou)).toEqual(["apple-foldable", "tesla-deliveries", "june-jobs-miss"]);
		const unsaved = new Set([...persona].filter((t) => t !== "TSLA"));
		expect(ids(listingSections(false, unsaved).forYou)).toEqual(["june-jobs-miss"]);
		expect(ids(listingSections(false, unsaved).markets)).toContain("tesla-deliveries");
	});

	it("a section can be empty (the route then draws only the other), and every story is in exactly one", () => {
		const none = listingSections(false, new Set());
		expect(none.forYou).toEqual([]);
		expect(ids(none.markets)).toEqual(ids(FEED_CARDS));
		const all = listingSections(false, new Set(FEED_CARDS.map((c) => c.ticker!)));
		expect(all.markets).toEqual([]);
		expect(ids(all.forYou)).toEqual(ids(FEED_CARDS));
		for (const set of [persona, new Set<string>(), new Set(["MU", "XOM"])]) {
			const s = listingSections(false, set);
			expect([...ids(s.forYou), ...ids(s.markets)].sort()).toEqual(ids(FEED_CARDS).sort());
		}
	});

	it("never changes the authored cards themselves (their copy, thumbnails and order)", () => {
		const s = listingSections(false, persona);
		for (const card of [...s.forYou, ...s.markets]) {
			const own = FEED_CARDS.find((c) => c.id === card.id)!;
			expect({ ...card, tag: own.tag }).toEqual(own);
		}
		expect(newsListing.forYou.cards.every((c) => c.tag === TAGS.inYourStak)).toBe(true);
	});
});

describe("a person whose stories all sit in one section (the hunt's VIS-04)", () => {
	it("no saves: Markets is the only section, as on the phones (no For You is drawn)", () => {
		const none = listingSections(false, new Set());
		expect(loneSection(none)).toBe("markets");
		// saves that touch none of the six companies are the same case
		expect(loneSection(listingSections(false, new Set(["KO", "MSFT", "COST"])))).toBe("markets");
	});

	it("all six companies saved: For You is the only section", () => {
		expect(loneSection(listingSections(false, new Set(FEED_CARDS.map((c) => c.ticker!))))).toBe("forYou");
	});

	it("both sections with a story (the persona, one save, the frame's grid): none is alone", () => {
		expect(loneSection(listingSections(false, persona))).toBeNull();
		expect(loneSection(listingSections(false, new Set(["AAPL"])))).toBeNull();
		expect(loneSection(listingSections(true, persona))).toBeNull();
		expect(loneSection(listingSections(true, new Set()))).toBeNull();
	});

	it("nothing anywhere is not a lone section", () => {
		expect(loneSection({ forYou: [], markets: [] })).toBeNull();
	});
});

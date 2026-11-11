import { describe, expect, it } from "vitest";
import { ARTICLES, articleById, HOME_ARTICLES } from "../articles";
import { type NewsCardData, newsListing, TAGS } from "../data";
import { HOT_CANDIDATES, rankHot } from "../hot";
import { briefMatches, cardText, foldText, listingHasTag, miniSearchKey, miniText, normalizeQuery, readSearchParam, resultMessage, searchListing, sourceName, type StoryText, storyMatches } from "../search";

const story: StoryText = {
	headline: ["Nvidia lags the chip rally it kicked off"],
	subtitle: "The company that started the AI chip boom ended the first half behind the chip index.",
	source: "Reuters",
	tags: ["NVIDIA"],
	ticker: "NVDA",
};

/**
 * the listing as the page hands it over: the frame's showcase state, every card wearing "In your STAK", and the Mini
 * card's hot stories on the stories' own figures (a signed-out visitor: Tesla, Micron, Apple, Nvidia; hot.ts)
 */
const HOT = rankHot(HOT_CANDIDATES);
const listing = {
	briefs: newsListing.briefs,
	mini: HOT,
	forYou: newsListing.forYou.cards,
	markets: newsListing.markets.cards,
};
const ids = (cards: readonly { id: string }[]) => cards.map((c) => c.id);
/** what a query shows: the briefs, the Mini card's stories, then the cards of each section */
const shows = (q: string, input = listing) => {
	const hits = searchListing(input, q);
	return { briefs: ids(hits.briefs), mini: ids(hits.mini), forYou: ids(hits.forYou), markets: ids(hits.markets), count: hits.count };
};

describe("the search's matcher (NewsScreen.kt articleMatches / matchesBrief)", () => {
	it("reads each of a story's fields: headline, subtitle, source, tags and ticker", () => {
		expect(storyMatches(story, "kicked off")).toBe(true);
		expect(storyMatches(story, "chip index")).toBe(true);
		expect(storyMatches(story, "reuters")).toBe(true);
		expect(storyMatches({ ...story, headline: ["Chip rally"] }, "nvidia")).toBe(true);
		expect(storyMatches(story, "nvda")).toBe(true);
		expect(storyMatches(story, "bloomberg")).toBe(false);
	});

	it("a story without a ticker is matched on its other fields only", () => {
		expect(storyMatches({ ...story, ticker: undefined }, "nvda")).toBe(false);
		expect(storyMatches({ ...story, ticker: undefined }, "nvidia")).toBe(true);
	});

	it("ignores case and matches anywhere in a field, inside words too", () => {
		expect(storyMatches(story, "NVIDIA")).toBe(true);
		expect(storyMatches(story, "nViDiA lAgS")).toBe(true);
		expect(storyMatches(story, "idia lag")).toBe(true);
		expect(storyMatches(story, "uter")).toBe(true);
	});

	it("trims the query; an empty or blank query keeps everything", () => {
		expect(normalizeQuery("  tesla \t")).toBe("tesla");
		expect(storyMatches(story, "   nvidia   ")).toBe(true);
		expect(storyMatches(story, "")).toBe(true);
		expect(storyMatches(story, "   ")).toBe(true);
		expect(briefMatches(newsListing.briefs[0]!, "")).toBe(true);
		expect(briefMatches(newsListing.briefs[0]!, " \t ")).toBe(true);
		// inner spaces are part of the query, as on the phones
		expect(storyMatches(story, "chip  rally")).toBe(false);
	});

	it("reads a brief's title, dek and whole source line (its age too, like the mobile brief's source)", () => {
		const [dow, fed, jobs] = newsListing.briefs;
		expect(briefMatches(dow!, "record as chips")).toBe(true);
		expect(briefMatches(dow!, "nasdaq")).toBe(true);
		expect(briefMatches(dow!, "BLOOMBERG")).toBe(true);
		expect(briefMatches(dow!, "10h")).toBe(true);
		expect(briefMatches(fed!, "10h")).toBe(false);
		expect(briefMatches(jobs!, "48,000")).toBe(true);
		// the kicker is the card's label, not the brief's copy
		expect(briefMatches(dow!, "today’s brief")).toBe(false);
	});

	it("a source line's name is what comes before its age", () => {
		expect(sourceName("Reuters · 2d")).toBe("Reuters");
		expect(sourceName("Bloomberg · 10h")).toBe("Bloomberg");
		expect(sourceName("CNBC")).toBe("CNBC");
	});
});

describe("straight and curly apostrophes and quotes are the same character (ruling (4) of 2026-11-06)", () => {
	it("folds every curly or prime mark to the straight one, one character for one, and lower-cases", () => {
		expect(foldText("‘a’ ‚b‛ c′")).toBe("'a' 'b' c'");
		expect(foldText("“A” „B‟ C″")).toBe('"a" "b" c"');
		expect(foldText("Fed’s")).toHaveLength("Fed’s".length);
	});

	it("a straight query finds copy written with curly marks", () => {
		const curly: StoryText = { ...story, subtitle: "The record of the Fed’s June meeting, the “dot plot” and all." };
		expect(storyMatches(curly, "fed's")).toBe(true);
		expect(storyMatches(curly, "FED'S JUNE")).toBe(true);
		expect(storyMatches(curly, '"dot plot"')).toBe(true);
		expect(briefMatches({ title: "Iran’s talks", dek: "", source: "Reuters · 3d" }, "iran's")).toBe(true);
	});

	it("a curly query (an iPhone's keyboard) finds copy written with straight marks", () => {
		const straight: StoryText = { ...story, subtitle: `The record of the Fed's June meeting, the "dot plot" and all.` };
		expect(storyMatches(straight, "fed’s")).toBe(true);
		expect(storyMatches(straight, "fed‘s")).toBe(true);
		expect(storyMatches(straight, "“dot plot”")).toBe(true);
		expect(storyMatches(straight, "„dot plot‟")).toBe(true);
	});

	it("an apostrophe is still an apostrophe: it never matches a quote, a space or nothing", () => {
		expect(storyMatches({ ...story, subtitle: "the Fed’s June" }, 'fed"s')).toBe(false);
		expect(storyMatches({ ...story, subtitle: "the Fed’s June" }, "feds")).toBe(false);
		expect(storyMatches({ ...story, subtitle: "the Fed’s June" }, "fed s")).toBe(false);
	});

	it("on the listing: the possessives the stories write with ’ answer to a desktop keyboard", () => {
		expect(shows("nvidia's")).toEqual(shows("nvidia’s"));
		expect(shows("iran's")).toEqual(shows("iran’s"));
		// Apple's dek ("... touching distance of Nvidia’s crown"): its story in the Mini card and its card, one story
		expect(shows("nvidia's")).toEqual({ briefs: [], mini: ["apple-foldable"], forYou: ["apple-foldable"], markets: [], count: 1 });
		// Oil's dek ("Iran’s nuclear program"): the calmest story is not one of the Mini card's four, so only its card
		expect(shows("iran's")).toEqual({ briefs: [], mini: [], forYou: [], markets: ["oil-slips-iran"], count: 1 });
		// "Fed’s" was the frame's Mini story's dek; the Fed brief (the story's place since N62) reads its own copy only
		expect(shows("fed's")).toEqual({ briefs: [], mini: [], forYou: [], markets: [], count: 0 });
	});
});

describe("what the search reads of the website's stories", () => {
	it("a card: its title and its article's, the article's dek, the source's name, the article's chip, its company", () => {
		const tesla = newsListing.forYou.cards[2]!;
		const a = articleById(tesla.id)!;
		expect(cardText(tesla)).toEqual({
			headline: [tesla.title, a.title],
			subtitle: a.dek,
			source: "CNBC",
			tags: ["Tesla"],
			ticker: "TSLA",
		});
		// the pill a card wears is the person's STAK, not the story: it is never read, whichever it is
		const worn: NewsCardData = { ...tesla, tag: TAGS.other };
		expect(cardText(worn)).toEqual(cardText(tesla));
	});

	it("a Mini card story is read like a card: its title and its article's, the dek, the source's name, the chip, the company", () => {
		const tesla = HOT.find((s) => s.id === "tesla-deliveries")!;
		const a = articleById(tesla.id)!;
		expect(miniText(tesla)).toEqual({
			headline: ["Tesla drops 7% even after beating deliveries", a.title],
			subtitle: a.dek,
			source: "CNBC",
			tags: ["Tesla"],
			ticker: "TSLA",
		});
		// what the card prints and a card does not: the kicker (the story's category, a slot label) and its one line (the
		// opening of the dek, which is read whole) add nothing to what the search reads
		expect(miniText(tesla)).toEqual(cardText(newsListing.forYou.cards.find((c) => c.id === tesla.id)!));
		// the frame's own Mini story (the Fed minutes, its article's company JPMorgan Chase, JPM) reads the same way
		expect(miniText(newsListing.mini)).toEqual({ headline: ["Fed minutes land Wednesday", "Fed minutes land Wednesday"], subtitle: articleById("fed-minutes")!.dek, source: "Reuters", tags: ["JPMorgan Chase"], ticker: "JPM" });
	});

	it("every listing story's tags are exactly its article's chip (the phones' `tags`, drawn in the same place)", () => {
		for (const card of [...newsListing.forYou.cards, ...newsListing.markets.cards]) expect(cardText(card).tags).toEqual([articleById(card.id)!.chip]);
		for (const story of HOT_CANDIDATES) expect(miniText(story).tags).toEqual([articleById(story.id)!.chip]);
		// every story the listing shows has an article, so none is read without its dek and chip
		for (const card of [...HOT_CANDIDATES, newsListing.mini, ...newsListing.forYou.cards, ...newsListing.markets.cards]) expect(ARTICLES.some((a) => a.id === card.id)).toBe(true);
	});
});

describe("the listing for a query (the mobile NewsScreen's choices)", () => {
	it("an empty query shows the whole listing, Market Mood included", () => {
		for (const q of ["", "   "]) {
			const hits = searchListing(listing, q);
			expect(hits.query).toBe("");
			expect(hits.mood).toBe(true);
			expect(ids(hits.briefs)).toEqual(["dow-record-chips", "fed-minutes", "june-jobs-miss"]);
			expect(ids(hits.mini)).toEqual(["tesla-deliveries", "memory-chips-soar", "apple-foldable", "nvidia-chip-rally"]);
			expect(ids(hits.forYou)).toEqual(ids(newsListing.forYou.cards));
			expect(ids(hits.markets)).toEqual(ids(newsListing.markets.cards));
			// eight stories: June jobs (a brief and a card) and the four hot stories (the Mini card and a card) count once each
			expect(hits.count).toBe(8);
		}
	});

	it("a query hides Market Mood and keeps only Tesla's story for 'tesla', whatever its case and spaces: in the Mini card (held there, its only story) and its card", () => {
		for (const q of ["tesla", "TESLA", "  Tesla  "]) {
			const hits = searchListing(listing, q);
			expect(hits.query).toBe(q.trim());
			expect(hits.mood).toBe(false);
			expect(shows(q)).toEqual({ briefs: [], mini: ["tesla-deliveries"], forYou: ["tesla-deliveries"], markets: [], count: 1 });
		}
	});

	it("'reuters' keeps every Reuters brief and story, in the listing's order; four stories, each counted once", () => {
		expect(shows("reuters")).toEqual({
			briefs: ["fed-minutes", "june-jobs-miss"],
			mini: ["nvidia-chip-rally"],
			forYou: ["nvidia-chip-rally"],
			markets: ["june-jobs-miss", "oil-slips-iran"],
			count: 4,
		});
	});

	it("brief filtering: the carousel carries only the matching briefs ('minutes': the Fed brief alone; 'fed': two)", () => {
		expect(shows("minutes")).toEqual({ briefs: ["fed-minutes"], mini: [], forYou: [], markets: [], count: 1 });
		// "Fed" is in the June jobs brief's title too ("...eases Fed hike bets"), so 'fed' keeps two briefs and that card
		expect(shows("fed")).toEqual({ briefs: ["fed-minutes", "june-jobs-miss"], mini: [], forYou: [], markets: ["june-jobs-miss"], count: 2 });
	});

	it("section filtering: a section with no hit is empty (the page drops it with its title), the other keeps its order", () => {
		expect(shows("chips")).toEqual({ briefs: ["dow-record-chips"], mini: ["memory-chips-soar"], forYou: [], markets: ["memory-chips-soar"], count: 2 });
		const chip = searchListing(listing, "chip");
		expect(ids(chip.forYou)).toEqual(["nvidia-chip-rally"]);
		expect(ids(chip.markets)).toEqual(["memory-chips-soar"]);
	});

	it("Mini card filtering: it keeps its matching hot stories, hottest first (it turns through several; one holds still); none, no card", () => {
		// 'chip': Micron (-5.84% today) before Nvidia (-1.42%), the hot order, whatever the listing's order of their cards
		expect(ids(searchListing(listing, "chip").mini)).toEqual(["memory-chips-soar", "nvidia-chip-rally"]);
		expect(ids(searchListing(listing, "apple").mini)).toEqual(["apple-foldable"]);
		expect(ids(searchListing(listing, "exxon").mini)).toEqual([]);
		// the hits are the card's own stories, the same objects, in the order the card was given
		const hits = searchListing(listing, "bloomberg").mini;
		expect(ids(hits)).toEqual(["memory-chips-soar", "apple-foldable"]);
		for (const s of hits) expect(HOT).toContain(s);
		// an empty query keeps every one of them
		expect(searchListing(listing, "  ").mini).toEqual(HOT);
	});

	it("the Mini card's key follows the search alone: the stories it matches among all the candidates, never the ranking", () => {
		// no search (or a blank one): every candidate, in the listing's order
		const all = "nvidia-chip-rally apple-foldable tesla-deliveries memory-chips-soar oil-slips-iran";
		expect(ids(HOT_CANDIDATES).join(" ")).toBe(all);
		expect(miniSearchKey(HOT_CANDIDATES, "")).toBe(all);
		expect(miniSearchKey(HOT_CANDIDATES, "   ")).toBe(all);
		// 'chip': its two stories in the listing's order, not the hot order the card shows them in
		expect(miniSearchKey(HOT_CANDIDATES, "chip")).toBe("nvidia-chip-rally memory-chips-soar");
		expect(miniSearchKey(HOT_CANDIDATES, "chips")).toBe("memory-chips-soar");
		// the calmest story counts too, though it is not one of the four: a live quote that moves it in or out of them
		// leaves the key as it is
		expect(miniSearchKey(HOT_CANDIDATES, "exxon")).toBe("oil-slips-iran");
		expect(ids(searchListing(listing, "exxon").mini)).toEqual([]);
		// the search's own rules (any case, the field's spaces trimmed); typing that keeps the same matches keeps the key
		expect(miniSearchKey(HOT_CANDIDATES, "  TESLA ")).toBe("tesla-deliveries");
		expect(miniSearchKey(HOT_CANDIDATES, "tesl")).toBe(miniSearchKey(HOT_CANDIDATES, "tesla"));
		expect(miniSearchKey(HOT_CANDIDATES, "zzz")).toBe("");
	});

	it("each field of a story finds it: the dek, the chip, the company", () => {
		expect(shows("micron")).toEqual({ briefs: [], mini: ["memory-chips-soar"], forYou: [], markets: ["memory-chips-soar"], count: 1 });
		expect(shows("NVDA").forYou).toEqual(["nvidia-chip-rally"]);
		expect(shows("NVDA").mini).toEqual(["nvidia-chip-rally"]);
		// the chips: "Exxon Mobil" (Oil), "Realty Income" (the June jobs card; a brief reads only its title, dek and
		// source, so not that brief)
		expect(shows("exxon")).toEqual({ briefs: [], mini: [], forYou: [], markets: ["oil-slips-iran"], count: 1 });
		expect(shows("realty")).toEqual({ briefs: [], mini: [], forYou: [], markets: ["june-jobs-miss"], count: 1 });
		// the Fed minutes (its company JPMorgan Chase, JPM) runs in the brief alone since N62, and a brief reads its title,
		// dek and source (and its whole chip, below): typed parts of the company find nothing
		expect(shows("jpm")).toEqual({ briefs: [], mini: [], forYou: [], markets: [], count: 0 });
		expect(shows("jpmorgan")).toEqual({ briefs: [], mini: [], forYou: [], markets: [], count: 0 });
	});

	it("an article's chip search (its whole tag, D1) also finds the brief whose story wears it; typed parts of it do not", () => {
		// the Dow article's chip "Goldman Sachs": its story is the Dow brief
		expect(shows("Goldman Sachs")).toEqual({ briefs: ["dow-record-chips"], mini: [], forYou: [], markets: [], count: 1 });
		expect(shows("goldman sachs ")).toEqual({ briefs: ["dow-record-chips"], mini: [], forYou: [], markets: [], count: 1 });
		expect(shows("goldman")).toEqual({ briefs: [], mini: [], forYou: [], markets: [], count: 0 });
		// "JPMorgan Chase" (the Fed minutes: the brief's item 2), "Realty Income" (June jobs: the card and item 3)
		expect(shows("JPMorgan Chase")).toEqual({ briefs: ["fed-minutes"], mini: [], forYou: [], markets: [], count: 1 });
		expect(shows("Realty Income")).toEqual({ briefs: ["june-jobs-miss"], mini: [], forYou: [], markets: ["june-jobs-miss"], count: 1 });
		// "Tesla" (a hot story): the Mini card holding it, and its card
		expect(shows("Tesla")).toEqual({ briefs: [], mini: ["tesla-deliveries"], forYou: ["tesla-deliveries"], markets: [], count: 1 });
		// every listing story's chip finds its own story
		for (const id of ["dow-record-chips", "fed-minutes", "nvidia-chip-rally", "apple-foldable", "tesla-deliveries", "june-jobs-miss", "memory-chips-soar", "oil-slips-iran"]) {
			const hits = searchListing(listing, articleById(id)!.chip);
			const found = [...hits.briefs.map((b) => b.id), ...ids(hits.mini), ...ids(hits.forYou), ...ids(hits.markets)];
			expect(found, id).toContain(id);
		}
	});

	it("what the phones do not read finds nothing: the pill a card wears, the Mini's kicker, the article's category", () => {
		const nothing = { briefs: [], mini: [], forYou: [], markets: [], count: 0 };
		// the showcase: every card wears "In your STAK"
		for (const q of ["stak", "your", "in your stak"]) expect(shows(q)).toEqual(nothing);
		// after it a card outside the person's STAK wears "Markets": still not a word of the story
		const worn = { ...listing, forYou: listing.forYou.map((c) => (c.ticker === "AAPL" ? c : { ...c, tag: TAGS.other })) };
		expect(shows("markets", worn)).toEqual(nothing);
		expect(shows("in your stak", worn)).toEqual(nothing);
		// the Mini card's kickers (the frame's MARKETS, the hot stories' TECH & AI and AUTOS) and the articles' categories
		// (Markets, Tech & Ai, Autos, Economy, Energy)
		for (const q of ["markets", "tech & ai", "autos", "economy", "energy"]) expect(shows(q)).toEqual(nothing);
		expect(new Set(HOT.map((s) => s.kicker))).toEqual(new Set(["AUTOS", "TECH & AI"]));
		// what the listing still finds is the same whichever pill the cards wear
		expect(shows("tesla", worn)).toEqual(shows("tesla"));
	});

	it("a story's source is its name only: an age finds briefs (their source line), never a story", () => {
		expect(shows("2d")).toEqual({ briefs: ["june-jobs-miss"], mini: [], forYou: [], markets: [], count: 1 });
	});

	it("nothing matching leaves nothing at all", () => {
		const hits = searchListing(listing, "zzz");
		expect([hits.mood, hits.briefs.length, hits.mini.length, hits.forYou.length, hits.markets.length, hits.count]).toEqual([false, 0, 0, 0, 0, 0]);
	});
});

describe("the screen reader's count", () => {
	it("says how many stories show, or that none matches", () => {
		expect(resultMessage(0)).toBe("No stories match");
		expect(resultMessage(1)).toBe("1 story");
		expect(resultMessage(3)).toBe("3 stories");
	});
});

describe("?q= in the listing's URL", () => {
	it("absent is closed; present is the field's text, empty included", () => {
		expect(readSearchParam(undefined)).toBeUndefined();
		expect(readSearchParam("")).toBe("");
		expect(readSearchParam("tesla")).toBe("tesla");
		expect(readSearchParam("  chips ")).toBe("  chips ");
	});

	it("a value the router parsed as JSON reads back as the text it was", () => {
		expect(readSearchParam(123)).toBe("123");
		expect(readSearchParam(true)).toBe("true");
		expect(readSearchParam(null)).toBe("null");
		expect(readSearchParam(["a", "b"])).toBe('["a","b"]');
	});
});

describe("an article's chip links to the search only when a listing story carries its tag (the ruling of 2026-11-07, 02:30)", () => {
	it("the eight listing stories' chips are carried; Home's two stories' chips (Coca-Cola, Microsoft) are not", () => {
		for (const a of ARTICLES) expect(listingHasTag(a.chip), a.chip).toBe(true);
		for (const a of HOME_ARTICLES) expect(listingHasTag(a.chip), a.chip).toBe(false);
		expect(HOME_ARTICLES.map((a) => a.chip).sort()).toEqual(["Coca-Cola", "Microsoft"]);
		expect(listingHasTag("")).toBe(false);
		expect(listingHasTag("Nvidia Corp")).toBe(false);
	});

	it("a carried tag's search shows a story, so the chip's link never lands on an empty search; the others would", () => {
		for (const a of ARTICLES) expect(searchListing(listing, a.chip).count, a.chip).toBeGreaterThan(0);
		for (const a of HOME_ARTICLES) expect(searchListing(listing, a.chip).count, a.chip).toBe(0);
	});

	it("reads the tag as the search does: case and curly marks do not matter", () => {
		expect(listingHasTag("nvidia")).toBe(true);
		expect(listingHasTag("GOLDMAN SACHS")).toBe(true);
		expect(listingHasTag("JPMorgan Chase")).toBe(true);
	});
});

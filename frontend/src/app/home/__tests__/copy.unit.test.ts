import { describe, expect, it } from "vitest";
import { homePromos, marketMood } from "@/app/data/home";
import { FRAME_NOW } from "@/app/live/clock";
import {
	cardsLeft,
	DECK_RECAP,
	type DeckReader,
	type DeckState,
	daysUntilWeekday,
	deckPromoBody,
	FED_NOTES_DATE,
	moodStories,
	PICKS_DONE,
	picksCaption,
	showsPicks,
	WHY_EMPTY,
	whyBody,
} from "../copy";

// a stand-in for the catalog's collections: today's stories touch these tickers' industries
const AFFECTED = new Set(["NVDA", "MSFT", "AMD", "TSLA", "JPM", "O", "ENPH", "COST"]);
const isAffected = (t: string) => AFFECTED.has(t);

describe("Why this matters: the person's saves against today's stories", () => {
	it("with nothing saved, invites a first save", () => {
		expect(whyBody([], isAffected)).toBe(WHY_EMPTY);
	});

	it("reports 0 honestly with the phones' quiet-day lines (no 5% that is not there)", () => {
		expect(whyBody(["PFE"], isAffected)).toBe("PFE is quiet in today’s news - nothing hits it yet.");
		expect(whyBody(["PFE", "LLY"], isAffected)).toBe("None of your 2 saved stocks are in today’s news - a quiet day for your STAK.");
		expect(whyBody(["PFE", "LLY", "MRK", "ABBV"], isAffected)).toBe("None of your 4 saved stocks are in today’s news - a quiet day for your STAK.");
		for (const body of [whyBody(["PFE"], isAffected), whyBody(["PFE", "LLY"], isAffected)]) expect(body).not.toMatch(/%/);
	});

	it("names ONE affected save instead of counting it (ST-20c: never 'collections house 100% of stocks' for one company)", () => {
		// the phones' sentence for a single save the news hits (android ui/StakInsights.kt:109), with the web's apostrophe
		expect(whyBody(["NVDA"], isAffected)).toBe("NVDA sits in an industry today’s news hits.");
		expect(whyBody(["COST"], isAffected)).toBe("COST sits in an industry today’s news hits.");
		for (const one of ["NVDA", "COST", "PFE"]) {
			expect(whyBody([one], isAffected)).not.toMatch(/%|collections|stocks/);
			expect(whyBody([one], isAffected).startsWith(`${one} `)).toBe(true);
		}
	});

	it("keeps Figma's percentage sentence once several saves are held and one is affected: rounded to 5, at least 5", () => {
		expect(whyBody(["NVDA", "PFE"], isAffected)).toBe("Your STAK collections house 50% of stocks from affected industries.");
		expect(whyBody(["NVDA", "MSFT"], isAffected)).toBe("Your STAK collections house 100% of stocks from affected industries.");
		// 1 of 30 is 3.3%: the floor of 5 applies only because one save IS affected
		const thirty = ["NVDA", ...Array.from({ length: 29 }, (_, i) => `H${i}`)];
		expect(whyBody(thirty, isAffected)).toBe("Your STAK collections house 5% of stocks from affected industries.");
	});

	it("gives the showcase persona Figma's own 80% (15 of 19 saves affected)", () => {
		const nineteen = Array.from({ length: 19 }, (_, i) => `T${i}`);
		const fifteen = new Set(nineteen.slice(0, 15));
		// the untouched showcase reads the frame's body verbatim (D7); the same saves computed read the phones' grammar
		expect(whyBody(nineteen, (t) => fifteen.has(t), { showcase: true })).toBe(homePromos.why.body);
		expect(homePromos.why.body).toBe("Your STAK collections houses 80% of stocks from affected industries.");
		expect(whyBody(nineteen, (t) => fifteen.has(t))).toBe("Your STAK collections house 80% of stocks from affected industries.");
	});

	it("reads the industries the three Market Mood stories touch", () => {
		expect(marketMood.deck.flatMap((s) => s.affects)).toEqual(["ai-tech", "green-energy", "consumer", "finance", "real-estate", "ai-tech"]);
	});
});

const deck = (over: Partial<DeckState> = {}): DeckState => ({ total: 12, index: 0, decided: 0, done: false, ...over });
const reader = (over: Partial<DeckReader> = {}): DeckReader => ({ completedDecks: 0, saves: 0, ...over });

describe("the deck card's line", () => {
	it("says 'first deck' to a person who has finished no deck and saved nothing (C-06)", () => {
		expect(deckPromoBody(deck(), reader())).toBe(homePromos.deck.body);
		expect(homePromos.deck.body).toBe("Take your first deck to build your taste");
	});

	it("keeps the frame's line for the untouched showcase, whose persona has nineteen saves (2:414, D7)", () => {
		expect(deckPromoBody(deck(), reader({ saves: 19, showcase: true }))).toBe(homePromos.deck.body);
	});

	it("never says 'first deck' to a person with saves: the persona past the showcase reads the card's count (C-06)", () => {
		expect(deckPromoBody(deck(), reader({ saves: 19 }))).toBe("12 cards left in today’s deck");
		expect(deckPromoBody(deck(), reader({ saves: 1 }))).toBe("12 cards left in today’s deck");
	});

	it("counts today's cards for a person who has finished a deck before, also on an untouched deck", () => {
		expect(deckPromoBody(deck(), reader({ completedDecks: 4 }))).toBe("12 cards left in today’s deck");
		// after "Swipe today's deck again": the replay starts untouched, completedDecks is at least 1
		expect(deckPromoBody(deck({ index: 0, decided: 0 }), reader({ completedDecks: 1 }))).toBe("12 cards left in today’s deck");
	});

	it("counts down as the person decides (one pass: 11; a save keeps the card in front: 11 too), the showcase flag or not", () => {
		expect(deckPromoBody(deck({ index: 1, decided: 1 }), reader())).toBe("11 cards left in today’s deck");
		expect(deckPromoBody(deck({ index: 0, decided: 1 }), reader())).toBe("11 cards left in today’s deck");
		expect(deckPromoBody(deck({ index: 11, decided: 11 }), reader())).toBe("1 card left in today’s deck");
		expect(deckPromoBody(deck({ index: 3, decided: 0 }), reader({ saves: 19, showcase: true }))).toBe("9 cards left in today’s deck");
	});

	it("is done once nothing is left, also when a replayed deck ended on cards saved before (no decision for them)", () => {
		expect(deckPromoBody(deck({ index: 12, decided: 12, done: true }), reader({ completedDecks: 1 }))).toBe(PICKS_DONE);
		expect(deckPromoBody(deck({ index: 12, decided: 9, done: true }), reader({ completedDecks: 1 }))).toBe(PICKS_DONE);
		expect(deckPromoBody(deck({ index: 12, decided: 12, done: true }), reader({ saves: 19, showcase: true }))).toBe(PICKS_DONE);
	});

	it("is NOT done while the deck is open, even with every card decided (the review of 2026-11-09)", () => {
		// every card decided, the pointer back on card 6 or still on a saved card 12: the control opens the DECK, so the
		// line must not say the deck is done (the recap exists only once the person has moved past the last card)
		expect(deckPromoBody(deck({ index: 5, decided: 12 }), reader({ completedDecks: 1 }))).toBe("1 card left in today’s deck");
		expect(deckPromoBody(deck({ index: 11, decided: 12 }), reader())).toBe("1 card left in today’s deck");
	});
});

describe("today's deck is done: one sentence, no invitation (C-06, ST-20b)", () => {
	it("is one sentence wherever it is said", () => {
		expect(PICKS_DONE).toBe("Today’s deck is done. Fresh picks tomorrow.");
		expect(deckPromoBody(deck({ index: 12, decided: 12, done: true }), reader())).toBe(PICKS_DONE);
		expect(picksCaption(0)).toBe(PICKS_DONE);
	});

	it("draws the See Todays Pick block only while a card is left", () => {
		expect(showsPicks(12)).toBe(true);
		expect(showsPicks(1)).toBe(true);
		expect(showsPicks(0)).toBe(false);
		expect(showsPicks(cardsLeft(deck({ index: 12, decided: 9, done: true })))).toBe(false);
	});

	it("names the deck's receipt, and leads there, where a control would open the finished deck", () => {
		expect(DECK_RECAP).toEqual({ label: "See the recap", to: "/discover/end" });
		for (const invitation of [homePromos.deck.cta, homePromos.picks.cta]) expect(DECK_RECAP.label).not.toBe(invitation);
	});
});

describe("the See picks caption", () => {
	it("is Figma's sentence for a fresh deck (2:531) and counts down with the deck", () => {
		expect(picksCaption(12)).toBe(homePromos.picks.caption);
		expect(picksCaption(11)).toBe("You have about 11 stock picks waiting for you");
		expect(picksCaption(2)).toBe("You have about 2 stock picks waiting for you");
	});

	it("puts the last card in the singular, without the 'about' (never 'about 1 stock picks')", () => {
		expect(picksCaption(1)).toBe("You have 1 stock pick waiting for you");
		expect(picksCaption(cardsLeft(deck({ index: 11, decided: 11 })))).toBe("You have 1 stock pick waiting for you");
	});
});

describe("cards left (the deck card and the See picks caption)", () => {
	it("follows the deck's own counter: the larger of the decisions and the pointer", () => {
		expect(cardsLeft(deck())).toBe(12);
		expect(cardsLeft(deck({ index: 3, decided: 1 }))).toBe(9);
		expect(cardsLeft(deck({ index: 1, decided: 4 }))).toBe(8);
		expect(cardsLeft(deck({ index: 12, decided: 7, done: true }))).toBe(0);
		expect(cardsLeft(deck({ index: 20, decided: 20, done: true }))).toBe(0);
	});

	it("a deck that is not done always has the card in front left: the last card saved but not passed", () => {
		// eleven passed, the twelfth saved and still in front: every card is decided, the deck is not done
		const lastSaved = deck({ index: 11, decided: 12 });
		expect(cardsLeft(lastSaved)).toBe(1);
		expect(showsPicks(cardsLeft(lastSaved))).toBe(true);
		expect(picksCaption(cardsLeft(lastSaved))).toBe("You have 1 stock pick waiting for you");
		// the same card bought, or a pointer past the end without the deck being closed: still one card, never "done"
		expect(cardsLeft(deck({ index: 11, decided: 11 }))).toBe(1);
		expect(cardsLeft(deck({ index: 20, decided: 20 }))).toBe(1);
		// one more step past the last card closes the deck
		expect(cardsLeft(deck({ index: 12, decided: 12, done: true }))).toBe(0);
	});
});

describe("the Market Mood stories on the clock (C-09, N23d / N30.3b)", () => {
	const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h, 41).getTime();
	const fed = (now: number) => moodStories(now).find((s) => s.id === "fed-minutes")!;

	it("prints exactly the frame's strings on the frames' own Saturday, July 4", () => {
		expect(moodStories(FRAME_NOW)).toEqual(marketMood.deck);
		expect(fed(FRAME_NOW).body).toBe("Minutes from the last Fed meeting land July 8. A market this tense moves on every word....");
		expect(marketMood.deck[1].body).toContain(`land ${FED_NOTES_DATE}.`);
	});

	it("dates the Fed card on the coming Wednesday, the day its title names (Monday, November 9: November 11)", () => {
		const nov9 = at(2026, 11, 9);
		expect(fed(nov9).title).toBe("Fed meeting notes drop Wednesday");
		expect(fed(nov9).body).toBe("Minutes from the last Fed meeting land November 11. A market this tense moves on every word....");
		expect(fed(nov9).body).not.toContain("July");
		// only the date moves: the other two stories and every other field are the frame's
		expect(moodStories(nov9).map((s) => ({ ...s, body: s.id === "fed-minutes" ? "" : s.body }))).toEqual(marketMood.deck.map((s) => ({ ...s, body: s.id === "fed-minutes" ? "" : s.body })));
	});

	it("names a Wednesday on every day of a week, today when today is one, and crosses a month and a year end", () => {
		for (let d = 9; d <= 15; d++) {
			const now = at(2026, 11, d);
			const days = daysUntilWeekday(3, now);
			expect(days).toBeGreaterThanOrEqual(0);
			expect(days).toBeLessThan(7);
			const lands = new Date(2026, 10, d + days);
			expect(lands.getDay()).toBe(3);
			expect(fed(now).body).toContain(`land ${lands.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`);
		}
		expect(daysUntilWeekday(3, at(2026, 11, 11))).toBe(0); // a Wednesday: the notes drop today
		expect(fed(at(2026, 11, 11, 23)).body).toContain("land November 11.");
		expect(fed(at(2026, 11, 12)).body).toContain("land November 18.");
		expect(fed(at(2026, 11, 27)).body).toContain("land December 2.");
		expect(fed(at(2026, 12, 31)).body).toContain("land January 6.");
	});
});

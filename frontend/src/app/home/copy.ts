import { homePromos, marketMood } from "@/app/data/home";
import { daysAheadLong } from "@/app/live/clock";

/** The Why card's line before anything is saved (the website's own invitation; the phones say the same in their words). */
export const WHY_EMPTY = "Save a few companies and this card tells you which of them the news touches.";

/**
 * "Why this matters to you" (2:471, body "Promo copy" 2:478 / 2:479): what today's three Market Mood stories mean for the
 * person's saves. A save is affected when its collection is one the stories touch (data/home.ts `affects`).
 * - nothing saved: the website's invitation (WHY_EMPTY);
 * - ONE save: it is named, never counted, as on the phones (android ui/StakInsights.kt:109-110, ios
 *   StakInsights.swift:119-120; read by android ui/home/WhyThisMattersFeed.kt:32): affected, "NVDA sits in an industry today’s news
 *   hits." (the hunt's ST-20c, coordinator ruling N27x: the percentage sentence read "Your STAK collections house 100%
 *   of stocks from affected industries." for a single saved company); not affected, "PFE is quiet in today’s news -
 *   nothing hits it yet.";
 * - several saves, none affected: the phones' quiet-day line (StakInsights.kt:111), counted ("None of your 2 saved
 *   stocks are in today’s news - a quiet day for your STAK."), instead of a 5% that is not there;
 * - several saves, one or more affected: Figma's sentence with the affected share, rounded to 5 and at least 5, in the
 *   phones' grammar ("collections house": the user's 2026-09-04 fix on both phones, android
 *   ui/home/WhyThisMattersFeed.kt:22, ios Home/WhyThisMattersFeed.swift:21);
 * - the untouched showcase (`showcase`): the frame's own body verbatim (data/home.ts, "houses 80%"), D7.
 */
export function whyBody(tickers: readonly string[], isAffected: (ticker: string) => boolean, opts?: { readonly showcase?: boolean }): string {
	if (opts?.showcase) return homePromos.why.body;
	const n = tickers.length;
	if (n === 0) return WHY_EMPTY;
	const hit = tickers.filter(isAffected).length;
	if (n === 1) return hit === 1 ? `${tickers[0]} sits in an industry today’s news hits.` : `${tickers[0]} is quiet in today’s news - nothing hits it yet.`;
	if (hit === 0) return `None of your ${n} saved stocks are in today’s news - a quiet day for your STAK.`;
	const share = Math.max(5, Math.round((hit / n) * 20) * 5);
	return `Your STAK collections house ${share}% of stocks from affected industries.`;
}

/** What Home reads of today's deck (src/app/live/deck.ts useDeck). */
export type DeckState = { readonly total: number; readonly index: number; readonly decided: number; readonly done: boolean };

/**
 * The cards of today's deck the person has not gone through yet: none once the deck is done (a replayed deck can end on
 * cards saved before, which only move the pointer and count as no decision), otherwise the total less the cards behind
 * the deck's counter (the deck's own "n/12" counts the larger of the decisions and the pointer).
 * A deck that is not done always has at least the card in front left (the review of 2026-11-09: with eleven cards passed
 * and the twelfth SAVED but still in front, every card was decided and this returned 0, so Home and My STAK said "Today's
 * deck is done" with "See the recap", and the control opened the deck: the recap exists only once the person has moved
 * past the last card, which is what `done` says).
 */
export function cardsLeft(deck: DeckState): number {
	if (deck.done) return 0;
	return Math.max(1, deck.total - Math.max(deck.decided, deck.index));
}

/**
 * THE sentence for "today's deck is done", wherever the site says it (the hunt's C-06, coordinator ruling N30.8l: Home
 * printed "Today’s deck is done. Fresh picks tomorrow." on its deck card and "You finished today’s deck. New picks arrive
 * tomorrow." under the pill beside it, My STAK a third wording): Home's deck card, My STAK's Discover card and its empty
 * state (src/app/mystak/data.ts) and Simulate's empty state import this constant. Short enough for the deck card's
 * 160-px column, where it breaks after its first sentence.
 */
export const PICKS_DONE = "Today’s deck is done. Fresh picks tomorrow.";

/**
 * What a control that would open today's deck reads once the deck is done, and where it leads then: the deck's own
 * receipt ("Deck complete": what was seen, saved and bought, with its ways on), never an invitation into a deck with no
 * card left ("Go to Deck", "Start swiping" and "Go to today’s deck" stood beside the done line: C-06 / the hunt's
 * ST-20b, rulings N27w and N30.8l). The control keeps its place and its style; only its words and its target follow the
 * deck. /discover itself would redirect a finished deck to the same receipt (src/routes/_app.discover.tsx).
 */
export const DECK_RECAP = { label: "See the recap", to: "/discover/end" } as const;

/**
 * The See picks caption (2:531, under the pill in "Frame 1618869171" 2:515): Figma's "You have about 12 stock picks waiting for you" with the
 * deck's own count (cardsLeft), the last card in the singular without the "about" (a count of one is exact; the deck
 * card beside it reads "1 card left in today’s deck"). With nothing left the block is not drawn at all (the pill "See
 * Todays Pick" would invite into a finished deck: Home draws it only while `showsPicks`); the done line is the deck
 * card's.
 */
export function picksCaption(remaining: number): string {
	if (remaining <= 0) return PICKS_DONE;
	if (remaining === 1) return "You have 1 stock pick waiting for you";
	return `You have about ${remaining} stock picks waiting for you`;
}

/** Whether Home draws the "See Todays Pick" block (2:515): only while today's deck still holds a card to see. */
export const showsPicks = (remaining: number): boolean => remaining > 0;

/** Who reads the deck card: the decks they have finished, the companies they have saved, the untouched showcase. */
export type DeckReader = { readonly completedDecks: number; readonly saves: number; readonly showcase?: boolean };

/**
 * The deck card's line ("Promo copy" 2:481 / 2:482). Figma's "Take your first deck to build your taste" is for a person
 * whose taste has nothing to go on yet: no deck finished, nothing saved, today's deck not started (C-06, ruling N30.8l:
 * it was keyed on finished decks alone, so the persona read it with nineteen saves and a formed taste once the showcase
 * was over). The untouched showcase keeps the frame's line (2:414, D7). Everyone else reads the card's own count, also
 * on an untouched deck (after "Swipe today's deck again", or on a new day), and the done line once nothing is left.
 */
export function deckPromoBody(deck: DeckState, reader: DeckReader): string {
	const left = cardsLeft(deck);
	if (left === 0) return PICKS_DONE;
	const started = deck.decided > 0 || deck.index > 0;
	if (!started && (reader.showcase || (reader.completedDecks === 0 && reader.saves === 0))) return homePromos.deck.body;
	return `${left} card${left === 1 ? "" : "s"} left in today’s deck`;
}

/** A Market Mood story as Home prints it: the authored record (data/home.ts) with its dated words on today's calendar. */
export type MoodStory = { readonly id: string; readonly title: string; readonly body: string; readonly source: string; readonly affects: readonly string[] };

/** The date the frame prints in the Fed story's body (2:462 "... land July 8."): the words moodStories puts on the clock. */
export const FED_NOTES_DATE = "July 8";

/** Wednesday, the day the Fed story's title names ("Fed meeting notes drop Wednesday", 2:461): Date#getDay's 3. */
const FED_NOTES_WEEKDAY = 3;

/** Days from the day of `now` to the coming `weekday` (0 = Sunday): 0 when today is that day, else 1 to 6. */
export const daysUntilWeekday = (weekday: number, now = Date.now()): number => (weekday - new Date(now).getDay() + 7) % 7;

/**
 * The stories with their dates on the clock (the hunt's C-09 / NUM-07, coordinator rulings N23d and N30.3b: on 9 November
 * the Fed card still said its minutes "land July 8", four months past). The one dated sentence on Home is that card's
 * body (2:462): its date is the coming Wednesday's, the day its title names ("Fed meeting notes drop Wednesday") and the
 * article it opens speaks of, written out as the frame writes it (src/app/live/clock.ts daysAheadLong). On the frames'
 * own Saturday, July 4 that is "July 8": the frame's string, to the letter. A fixed number of days ahead would name a
 * day that is no Wednesday six days out of seven (four days after Monday, November 9 is a Friday, the 13th).
 */
export function moodStories(now = Date.now()): readonly MoodStory[] {
	const lands = daysAheadLong(daysUntilWeekday(FED_NOTES_WEEKDAY, now), now);
	return marketMood.deck.map((story) => (story.id === "fed-minutes" ? { ...story, body: story.body.replace(FED_NOTES_DATE, lands) } : story));
}

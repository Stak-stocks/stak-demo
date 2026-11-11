import { type NewsCardData, newsListing, TAGS } from "./data";

/**
 * The listing's two story sections, For You (2:4406) and Markets (2:4430), as the phones fill them (the audit's news #6,
 * the coordinator's decision D9): For You = the stories about companies the person HOLDS in My STAK, Markets = the rest
 * (android NewsArticleFeed.kt:429-449, user 2026-09-01: "should show news that the user holds stock on ... saving a new
 * stock moves its story from Markets into For You instantly"; NewsScreen.kt:193-200; iOS NewsArticleFeed.swift:419-436,
 * NewsView.swift:31-33).
 *
 * The pool is the listing's six story cards, in the feed's order (For You's three, then Markets' three: Nvidia, Apple,
 * Tesla, June jobs, Memory chips, Oil); the brief and the Mini story keep their own slots above. The phones' For You also
 * leaves out the stories filed under "Markets" (their brief stories); none of the six cards is one, so the company rule
 * alone decides.
 * - The untouched signed-out visitor (the showcase rule, src/app/live/showcase.ts) sees Figma's grid verbatim: the
 *   frame's three and three, every card "In your STAK" (2:4411 ...).
 * - Everyone else: For You holds each card whose company is in the person's STAK, in feed order, wearing "In your STAK";
 *   Markets holds every other card, in feed order, wearing Figma's general tag "Markets". A save made anywhere (an
 *   article's Add to STAK, the deck, a stock page) moves its story at once; an unsave moves it back. A section with no
 *   story is not drawn (the route; the search does the same).
 */
export type ListingSections = { readonly forYou: readonly NewsCardData[]; readonly markets: readonly NewsCardData[] };

/** The six story cards in the feed's order. */
export const FEED_CARDS: readonly NewsCardData[] = [...newsListing.forYou.cards, ...newsListing.markets.cards];

/** Figma's own grid: the frame's three and three, as authored. */
const SHOWCASE: ListingSections = { forYou: newsListing.forYou.cards, markets: newsListing.markets.cards };

export function listingSections(showcase: boolean, savedTickers: ReadonlySet<string>): ListingSections {
	if (showcase) return SHOWCASE;
	const held = (card: NewsCardData) => card.ticker !== undefined && savedTickers.has(card.ticker.toUpperCase());
	return {
		forYou: FEED_CARDS.filter(held).map((card) => ({ ...card, tag: TAGS.inYourStak })),
		markets: FEED_CARDS.filter((card) => !held(card)).map((card) => ({ ...card, tag: TAGS.other })),
	};
}

/**
 * The ONE section a person's listing has when the other holds no story at all (the hunt's VIS-04, the coordinator's N30):
 * "markets" for a person with none of the six companies in their STAK (a new visitor: no saves), "forYou" for one who
 * holds all six; null while both sections have a story (the frame's grid, the usual case).
 *
 * Both phones draw no For You section and no line in its place for a person without saves: the section is simply not
 * there, and Markets lists every story (android ui/news/NewsScreen.kt:197-200 `if (forYou.isNotEmpty()) NewsSection("For
 * You" ...)` then Markets; ui/news/NewsArticleFeed.kt:447-451 `markets()`: every stock story For You did not take; iOS
 * StakDemo/News/NewsView.swift:125-132, NewsArticleFeed.swift:432-436). Their listing is one column, so that fills the
 * screen; the desktop row has two, and the six stories in the left one alone left the right half of the page empty under
 * a column 718 px tall. So at 1024 and up the lone section takes the whole story row: its one heading, then its stories
 * in the frame's two columns of cards, row by row (the reading and Tab order), three rows for the six, exactly where the
 * frame's six cards sit. Below 1024 it is the phones' one column. Decided on the person's own sections, before a search
 * narrows them: a query then filters the same two columns (a section that is alone only because the query hid the other
 * keeps its own column, the ruling of 2026-11-06, 19:50).
 */
export function loneSection(sections: ListingSections): "forYou" | "markets" | null {
	if (sections.forYou.length === 0 && sections.markets.length > 0) return "markets";
	if (sections.markets.length === 0 && sections.forYou.length > 0) return "forYou";
	return null;
}

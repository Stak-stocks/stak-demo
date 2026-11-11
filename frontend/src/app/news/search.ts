import { articleById, STORIES } from "./articles";
import type { BriefData, NewsCardData } from "./data";

/**
 * The News listing's search, as the mobile apps run it (android NewsScreen.kt, NewsScreen / articleMatches; iOS
 * NewsView.swift, NewsView / articleMatches: the same rules). The query is the field's text trimmed; it matches
 * case-insensitively anywhere in a brief's title, dek and source, and in a story's headline, subtitle, source, tags and
 * ticker. An empty query matches everything. Pure functions: the route renders what `searchListing` returns.
 *
 * The website's stories are the listing's cards and the Mini card's hot stories (src/app/news/hot.ts), each with its
 * article (src/app/news/articles.ts): headline = the card's title and its article's title (the same words today),
 * subtitle = the article's dek, source = the source's name ("Reuters", without the age: the mobile story's `source`),
 * tags = the article's chip ("Apple", "Exxon Mobil": the tag its page draws after Key stats, where the phones draw their
 * article's `tags`, NewsDetailScreen.kt lines 371-373, NewsDetailView.swift lines 233-235), ticker = the related
 * company's symbol. A brief's source is its whole source line ("Reuters · 2h"), as the mobile brief's `source` is.
 *
 * Left out, as the phones leave them out: the pill a card wears ("In your STAK" / "Markets": the person's STAK, not the
 * story; NewsScreen.kt line 514 draws it outside `tags`), the Mini card's kicker (its story's category, a slot label like
 * the phones' story tiles' "Markets" / "Your stocks") and its one line (the opening words of the dek, which is read),
 * the article's category (its kicker and the hero's label: the phones' `category`, drawn on their hero and never
 * searched), the section titles and the brief's kicker.
 */

/** What the search reads of one story (the mobile Article's headline, subtitle, source, tags, ticker). */
export type StoryText = {
	readonly headline: readonly string[];
	readonly subtitle: string;
	readonly source: string;
	readonly tags: readonly string[];
	readonly ticker?: string;
};

/** The query the listing filters by: the field's text trimmed (NewsScreen.kt `query.trim()`). */
export const normalizeQuery = (raw: string): string => raw.trim();

/**
 * Straight and curly apostrophes and quotes count as one character (the coordinator's ruling (4) of 2026-11-06): a
 * desktop keyboard types ' and ", an iPhone ’ and ” by itself, and the stories are written with ’ ("Fed’s", "Iran’s"), so
 * "fed's" finds what "fed’s" finds on a phone. Each mark becomes the straight one, one character for one.
 */
const APOSTROPHES = /[‘’‚‛′]/g;
const QUOTES = /[“”„‟″]/g;
export const foldText = (text: string): string => text.replace(APOSTROPHES, "'").replace(QUOTES, '"').toLowerCase();

/** A case-insensitive "contains" (Kotlin `contains(q, ignoreCase = true)`, Swift `range(of:options: .caseInsensitive)`). */
const contains = (text: string, q: string): boolean => foldText(text).includes(foldText(q));

/** NewsScreen.kt articleMatches: an empty query keeps every story. */
export function storyMatches(story: StoryText, query: string): boolean {
	const q = normalizeQuery(query);
	if (q === "") return true;
	const hit = (text: string) => contains(text, q);
	return story.headline.some(hit) || hit(story.subtitle) || hit(story.source) || story.tags.some(hit) || (story.ticker !== undefined && hit(story.ticker));
}

/**
 * NewsScreen.kt matchesBrief: a brief's title, its dek (the mobile `body`) and its source line. One addition the phones
 * have no use for (their tag chips are inert): an article's company chip opens this search for its tag (D1,
 * /news?q=<chip>), "the stories that share it", so a brief whose story wears that very tag (the Dow brief's "Goldman
 * Sachs") is found by it too. Only the whole tag does it: typed text keeps the phones' rule ('jpm' does not find the
 * Fed brief, whose story wears "JPMorgan Chase").
 */
export function briefMatches(brief: Pick<BriefData, "title" | "dek" | "source"> & { readonly id?: string }, query: string): boolean {
	const q = normalizeQuery(query);
	if (q === "") return true;
	if (contains(brief.title, q) || contains(brief.dek, q) || contains(brief.source, q)) return true;
	const tag = brief.id === undefined ? undefined : articleById(brief.id)?.chip;
	return tag !== undefined && foldText(tag) === foldText(q);
}

/**
 * Whether a listing story carries `tag` as its chip (the coordinator's ruling of 2026-11-07, 02:30): an article's company
 * chip is a link to /news?q=<chip> ONLY then, since that search shows the stories wearing the tag (the eight listing
 * chips, "Goldman Sachs" to "Exxon Mobil"); a chip no listing story carries (Home's two stories' "Coca-Cola" and
 * "Microsoft") would open an empty search, so the article draws it as plain text. The same folding as the search.
 */
export const listingHasTag = (tag: string): boolean => STORIES.some((s) => foldText(articleById(s.id)?.chip ?? "") === foldText(tag));

/** The source's name of a source line: "Reuters · 2d" -> "Reuters". */
export const sourceName = (line: string): string => line.split("·")[0]!.trim();

/** A story as the search reads it: its own copy, plus its article's dek, chip and company. */
type StoryCopy = { readonly id: string; readonly title: string; readonly source: string; readonly ticker?: string };

function storyText(story: StoryCopy): StoryText {
	const a = articleById(story.id);
	return {
		headline: a ? [story.title, a.title] : [story.title],
		subtitle: a?.dek ?? "",
		source: sourceName(story.source),
		tags: a ? [a.chip] : [],
		ticker: story.ticker ?? a?.ticker.symbol,
	};
}

/** A listing card as the search reads it (the pill it wears is not read: see above). */
export const cardText = (card: Pick<NewsCardData, "id" | "title" | "source" | "ticker">): StoryText => storyText(card);

/** A Mini card story as the search reads it: its own title and source line; its article gives the rest. */
export type MiniCopy = { readonly id: string; readonly title: string; readonly source: string };

/** A Mini card story ("Mini · Markets" 2:4397; the hot stories, src/app/news/hot.ts) as the search reads it: like a card. */
export const miniText = (mini: MiniCopy): StoryText => storyText({ id: mini.id, title: mini.title, source: mini.source });

/**
 * What the listing keys the Mini card on: the stories among ALL its `candidates` (hot.ts HOT_CANDIDATES, in their
 * order) that the query matches. It follows the search alone: a query that changes which stories match changes it, so
 * the card starts again at the hottest match (as the brief's carousel, keyed on its hits, starts at its first); a live
 * quote never changes it, whichever stories it makes the hottest, so the new ranking reaches the card at its next turn
 * (hot.ts useHotRotation), never under a pointer or a keyboard focus that holds it.
 */
export const miniSearchKey = (candidates: readonly MiniCopy[], query: string): string =>
	candidates
		.filter((s) => storyMatches(miniText(s), query))
		.map((s) => s.id)
		.join(" ");

export type ListingInput<C, M extends MiniCopy = MiniCopy> = {
	readonly briefs: readonly BriefData[];
	/** the Mini card's stories, hottest first (hot.ts useHotStories) */
	readonly mini: readonly M[];
	/** the For You and Markets cards, in their order */
	readonly forYou: readonly C[];
	readonly markets: readonly C[];
};

/** What the listing shows for a query (the mobile NewsScreen's choices, item for item). */
export type ListingHits<C, M extends MiniCopy = MiniCopy> = {
	/** the trimmed query ("" = no search: the whole listing) */
	readonly query: string;
	/** Market Mood shows only while the query is empty (`if (q.isEmpty()) MoodMiniRow()`) */
	readonly mood: boolean;
	/** the briefs the carousel carries: only the matching ones, in their order (none: no carousel) */
	readonly briefs: readonly BriefData[];
	/**
	 * the Mini card's stories that match, hottest first: the card shows the first and turns through them (one holds
	 * still); none: no Mini card
	 */
	readonly mini: readonly M[];
	/** each section keeps its matching cards in their order; a section with none is not drawn, title included */
	readonly forYou: readonly C[];
	readonly markets: readonly C[];
	/**
	 * the stories on show, each counted once (the coordinator's ruling (2) of 2026-11-06): a story shown as a brief and
	 * as a card (June jobs) or in the Mini card and as a card (the hot stories) is one story
	 */
	readonly count: number;
};

export function searchListing<C extends Pick<NewsCardData, "id" | "title" | "source" | "ticker">, M extends MiniCopy = MiniCopy>(
	listing: ListingInput<C, M>,
	rawQuery: string,
): ListingHits<C, M> {
	const query = normalizeQuery(rawQuery);
	const briefs = listing.briefs.filter((b) => briefMatches(b, query));
	const mini = listing.mini.filter((s) => storyMatches(miniText(s), query));
	const forYou = listing.forYou.filter((c) => storyMatches(cardText(c), query));
	const markets = listing.markets.filter((c) => storyMatches(cardText(c), query));
	const stories = new Set([...briefs.map((b) => b.id), ...mini.map((s) => s.id), ...forYou.map((c) => c.id), ...markets.map((c) => c.id)]);
	return { query, mood: query === "", briefs, mini, forYou, markets, count: stories.size };
}

/** The screen reader's line for a result count (the polite live region; nothing is drawn). */
export const resultMessage = (count: number): string => (count === 0 ? "No stories match" : count === 1 ? "1 story" : `${count} stories`);

/**
 * `?q=` in the listing's URL: absent = the search is closed, present (empty too) = open, holding the field's text as
 * typed. The router parses values that look like JSON (`?q=123` arrives as a number): any value is read back as text.
 */
export function readSearchParam(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value) ?? "";
	} catch {
		return "";
	}
}

/**
 * THE NEWS SIGNAL OF EVERY STOCK PAGE (coordinator ruling N39c; the user, 2026-11-10, beside a News signal that read only
 * "▲ +1.1% today" and "No fresh headlines today.": "look at figma how it is design i want all stocks should have something
 * in there ... all must have"). Every one of the 333 catalog companies gets Figma's anatomy (2:3519 / 2:3520): the move
 * line, two lines, and a row of news cards (2:3526: a source line, a tone pill, the headline), built from what the site
 * really carries. NOTHING IS INVENTED: no headline, event, quote or publisher the site does not carry. The phones fill an
 * unauthored company by copying Apple's facts (android ui/discover/StockDetailScreen.kt:997-1022 `detailFactsFor`: base
 * = AAPL's news and earnings with the symbol swapped); the web fills every company with its own.
 *
 * THE CARDS (`signalStoriesFor`, then `explainerCard`), up to `MAX_STORIES` stories and then the company's explainer, so
 * the row holds Figma's four cards (the fourth cut at the card's edge, the row scrolling sideways as the frames mark it):
 * every story is ranked by how closely it concerns the company, in this order (ties keep the feed's order: the News
 * listing's brief, Mini story, For You and Markets, then Home's two stories):
 *   0. the company's own story (its article's related company: news.ts `storiesFor`);
 *   1. a story whose copy NAMES the company ("a near 5 percent jump in Apple" in the Dow story, "Tesla, which lost 7
 *      percent in a day" in the fear gauge's): `READINGS[story].named`;
 *   2. a story whose own company shares the company's industry (its primary category: the Nvidia and memory chip
 *      stories for every chip maker, the Fed minutes for every bank);
 *   3. a story of the company's sector, by the story company's collection or category (the ruling's own examples: the
 *      chip and AI stories for AI & Tech, the oil story for Green Energy and energy, Tesla's for autos;
 *      `READINGS[story].sector`);
 *   4. a story whose copy reports how the company's industry moved ("solar companies" sold in the fear gauge's week);
 *   5. a market-wide story (the article's category is Markets or Economy: the Dow record, the Fed minutes, the jobs
 *      report, the fear gauge), for every company.
 * Each card is the story's own: its headline as the site lists it, its own publisher and its age ("Reuters · 2d", the
 * age its article's byline is dated from on the clock), opening its article (D1).
 *
 * THE TONE PILL, ONE RULE (`toneFor`): the direction the story's own copy reports for the company it stands under, for
 * the company itself (its own story's tone, news.ts TONE; or a company the copy names), otherwise for the group the copy
 * describes it in (narrower than an industry: the fear gauge's "solar companies" and its steady names, the Dow story's
 * "banks" among the capital-markets firms), otherwise for the company's industry (its primary category, or its
 * collection, where the copy reports how that industry moved), otherwise "Neutral". A company the copy reports both ways
 * reads "Neutral" (the memory story's Nvidia: a gain, in a half investors spent "selling the AI giants"). Every entry of
 * `READINGS` quotes the sentence it comes from (the article's paragraphs or its gist, which the article prints as "The
 * gist"). The explainer card reports no move: "Neutral".
 *
 * THE EXPLAINER CARD (`explainerCard`): ONE company-specific card from the catalog's own text, labelled as the site's
 * own ("STAK · Explainer", never a real outlet's name), its headline the catalog's culturalContext title; it opens the
 * catalog's culturalContext (title and sections, verbatim) in the app's sheet (StockDetail.tsx ExplainerSheet). The
 * phones have no such sheet: a web state drawn in the frames' sheet style.
 *
 * THE TWO LINES (`newsSignalFor`): line one is the company's own story's first point where it has a story, otherwise the
 * catalog's commentary on its revenue growth in the frames' sentence style (live/format.ts `sentence`: capitalised,
 * ending in a full stop: PLTR "Accelerating from commercial AI adoption."); line two is the earnings line for every
 * company, dated from the clock: the phones' `earningsIn` for their nineteen (coverage.ts; android StockDetailScreen.kt
 * :1099, 1140 ... `StakClock.daysAhead(n)`), a deterministic number of days ahead for every other company (`earningsInFor`),
 * and for an index fund, which reports no earnings, the line says so (`FUND_EARNINGS`).
 *
 * A COMPANY WITHOUT A PRICE (256 while the STAK API is down) keeps all of it but the day's move, whose line says there is
 * no price (`NO_PRICE_MOVE`, the chart card's own words, PerformanceChart NO_PRICE).
 */
import { betaOf, brandByTicker, type CollectionSlug, collectionOf, normalizeTicker, primaryCategoryOf } from "@/app/live/catalog";
import { daysAhead } from "@/app/live/clock";
import { sentence } from "@/app/live/format";
import { AAPL_COVERAGE, PHONE_COVERAGE } from "./coverage";
import type { StockArticle, StockDetailData } from "./data";
import { siteStories, type StockStory, type StockStoryTone } from "./news";

export const SIGNAL_TITLE = "News signal";

/** How many of the site's stories the row holds before the explainer card: with it, Figma's four cards (2:3526-2:3547). */
export const MAX_STORIES = 3;

/** The move line of a company without a price (N39c): it says so, in the chart card's own words (PerformanceChart NO_PRICE). */
export const NO_PRICE_MOVE = "No price right now, so no move to show";

/** Line one where the catalog has no commentary for the company (no catalog company today: kept for an unknown ticker). */
export const NO_FRESH_HEADLINES = "No fresh headlines today.";

/** The explainer card's source line: the site's own label, never a real outlet's name (N39c). */
export const EXPLAINER_SOURCE = "STAK · Explainer";

/** An explainer reports no move: its pill is the neutral one. */
export const EXPLAINER_TONE: StockStoryTone = "Neutral";

/** The earnings line of an index fund (the catalog's SPY and QQQ: "tracks index, not a company"): a fund reports none. */
export const FUND_EARNINGS = "No earnings day of its own: the companies it tracks report theirs.";

/** The tag table's category of the index funds. */
const FUND_CATEGORY = "etf_index";

/** The article categories that concern the whole market (the Dow record, the Fed minutes, the fear gauge; the jobs report). */
const MARKET_WIDE: ReadonlySet<string> = new Set(["Markets", "Economy"]);

/**
 * What each story's copy says beyond its own company (src/app/news/articles.ts, read 2026-11-10; the quotes are the
 * article's own words):
 * - `named`: catalog companies the copy names, with the direction it reports for each (tier 1, and their tone);
 * - `groups`: companies the copy describes by what they are rather than by name, a group narrower than their industry
 *   (the fear gauge's "solar companies": not every clean-energy company makes solar; its steady names), with the
 *   direction it reports for the group (tier 4, like an industry, and their tone, before the industry's);
 * - `industries` / `collections`: industries (primary categories) or whole collections whose move the copy reports;
 * - `sector`: the story's sector (tier 3), from the story company's collection or category (N39c's examples). A story
 *   missing here takes its company's collection.
 */
type Reading = {
	named?: Readonly<Record<string, StockStoryTone>>;
	groups?: readonly ReadingGroup[];
	industries?: Readonly<Record<string, StockStoryTone>>;
	collections?: Readonly<Partial<Record<CollectionSlug, StockStoryTone>>>;
	sector: { collections?: readonly CollectionSlug[]; categories?: readonly string[] };
};

/** A group of companies the copy reports a move for without naming them: who is in it (`has`, by ticker) and the move. */
export type ReadingGroup = { tone: StockStoryTone; has: (ticker: string) => boolean };

/**
 * The catalog's solar makers, the fear gauge's "solar companies": Enphase ("the tiny box that makes rooftop solar actually
 * work") and First Solar. The catalog's other clean-energy companies make no solar product: NextEra is a utility, the
 * biggest of "the big utilities" the same sentence says money moved INTO, and Plug Power makes hydrogen fuel cells.
 */
export const SOLAR_COMPANIES: ReadonlySet<string> = new Set(["ENPH", "FSLR"]);

/**
 * The banks among the catalog's capital-markets firms, the Dow story's "banks" ("Goldman Sachs gained 1.2 percent as banks
 * rose"): the investment banks Goldman Sachs, Morgan Stanley, Evercore and Raymond James. The exchanges filed beside them
 * (CME, ICE, Nasdaq, Cboe) are not banks, and the copy reports no move of theirs.
 */
export const CAPITAL_MARKETS_BANKS: ReadonlySet<string> = new Set(["GS", "MS", "EVR", "RJF"]);

/** The industries of the fear gauge's shelter: "companies people keep buying in any economy, from Coca-Cola to the big utilities". */
const SHELTER_INDUSTRIES: ReadonlySet<string> = new Set(["beverage", "consumer_staples", "utilities"]);

/**
 * A steady name, in the fear gauge's own words: Coca-Cola's "shares tend to swing less than the market does" ("Steady
 * names like Coca-Cola edged up"), which is what a beta under 1 measures (the page's own Risk fit reads the same beta).
 * Boston Beer (1.3) and Beyond Meat (2.5) swing more than the market: the copy's shelter is not theirs.
 */
export const isSteady = (ticker: string): boolean => {
	const beta = betaOf(ticker);
	return beta !== null && beta < 1;
};

export const READINGS: Readonly<Record<string, Reading>> = {
	// "lifted by banks, industrials and a near 5 percent jump in Apple"; "The S&P 500 ... edged up 0.3 percent"; "pulled
	// the Nasdaq down 0.6%"; "Goldman Sachs gained 1.2 percent as banks rose" (the investment banks among the capital-
	// markets firms, not the exchanges); "industrial and health care companies picked up the money leaving the chip makers";
	// "memory chip makers gave back part of a first half rally"
	"dow-record-chips": {
		named: { AAPL: "Positive", SPY: "Positive", QQQ: "Negative" },
		groups: [{ tone: "Positive", has: (T) => CAPITAL_MARKETS_BANKS.has(T) }],
		industries: { bank: "Positive", industrial: "Positive", semiconductor: "Negative" },
		collections: { healthcare: "Positive" },
		sector: { collections: ["finance"] },
	},
	// a preview: "The Fed publishes the minutes of its June meeting on Wednesday" (nothing has moved yet); "Banks have a lot
	// riding on the answer"
	"fed-minutes": { sector: { collections: ["finance"] } },
	// "the index of chip stocks it once dragged higher climbed about 31 percent"; "Memory makers ... rose by as much as 70
	// percent. Smaller chip designers and the companies that make chip factory equipment followed close behind"; "Apple,
	// now only a few percent behind in market value, takes aim at its crown" (no move)
	"nvidia-chip-rally": {
		named: { AAPL: "Neutral" },
		industries: { semiconductor: "Positive", semiconductor_equipment: "Positive" },
		sector: { collections: ["ai-tech"] },
	},
	// "within touching distance of Nvidia's crown" (no move); "a sell-off tearing through chip stocks"
	"apple-foldable": { named: { NVDA: "Neutral" }, industries: { semiconductor: "Negative" }, sector: { collections: ["ai-tech"] } },
	// Tesla's for autos (N39c); the copy reports no rival's move ("rivals in China and Europe crowd the market")
	"tesla-deliveries": { sector: { categories: ["auto_ev", "auto_legacy"] } },
	// "landlords like Realty Income, which borrow to buy their buildings, edged up"; "chip stocks slid as traders used the
	// report to take profits"
	"june-jobs-miss": { industries: { reit: "Positive", semiconductor: "Negative" }, sector: { collections: ["real-estate"] } },
	// "Memory makers led the chip index in the first half of the year". Nvidia is reported both ways, so its pill is
	// Neutral (the header's rule): "Investors spent the first half selling the AI giants and buying the makers of their
	// memory", while Micron rose "close to eight times the gain in Nvidia" (a gain, an eighth of the rally's)
	"memory-chips-soar": { named: { NVDA: "Neutral" }, industries: { semiconductor: "Positive" }, sector: { collections: ["ai-tech"] } },
	// the oil story for Green Energy and energy (N39c); "oil companies like Exxon Mobil, whose shares tend to follow the
	// price of the crude they sell"
	"oil-slips-iran": { industries: { energy_oilgas: "Negative" }, sector: { collections: ["green-energy"], categories: ["energy_oilgas"] } },
	// "Investors spent the week selling the high-growth names that led the first half: memory chip makers, solar companies
	// and Tesla, which lost 7 percent in a day", and its gist: "Investors sold chip, solar and electric car stocks for
	// safer names." (the chip makers, the SOLAR makers only, every electric carmaker); "money moved into companies people
	// keep buying in any economy, from Coca-Cola to the big utilities", "Steady names like Coca-Cola edged up" (the shelter's
	// industries, their steady names only: `isSteady`)
	"fear-gauge-32": {
		named: { TSLA: "Negative" },
		groups: [
			{ tone: "Negative", has: (T) => SOLAR_COMPANIES.has(T) },
			{ tone: "Positive", has: (T) => SHELTER_INDUSTRIES.has(primaryCategoryOf(T)) && isSteady(T) },
		],
		industries: { semiconductor: "Negative", auto_ev: "Negative" },
		sector: { categories: ["beverage", "consumer_staples", "utilities"] },
	},
	// Microsoft's own story; the copy names no other catalog company
	"openai-ipo-delayed": { sector: { collections: ["ai-tech"] } },
};

/** How closely a story concerns a company (0 its own story ... 5 market-wide; see the header), or null: not at all. */
export type SignalTier = 0 | 1 | 2 | 3 | 4 | 5;

function inSector(story: StockStory, T: string): boolean {
	const sector = READINGS[story.id]?.sector ?? { collections: [collectionOf(story.ticker)] };
	const collection = collectionOf(T);
	const category = primaryCategoryOf(T);
	return (collection !== "other" && (sector.collections ?? []).includes(collection)) || (!!category && (sector.categories ?? []).includes(category));
}

/** The group of the story's copy the company is in (`Reading.groups`), if any. */
const groupOf = (story: StockStory, T: string): ReadingGroup | undefined => READINGS[story.id]?.groups?.find((g) => g.has(T));

/** The story's copy reports how the company's group, its industry (its primary category) or its collection moved. */
function reportsIndustry(story: StockStory, T: string): boolean {
	const reading = READINGS[story.id];
	const category = primaryCategoryOf(T);
	return !!groupOf(story, T) || !!(category && reading?.industries?.[category]) || !!reading?.collections?.[collectionOf(T)];
}

/**
 * The tier of a story on a company's page (the header's list): 0 its own story, 1 the copy names it, 2 the story's own
 * company shares its industry, 3 the story is of its sector, 4 the copy reports how its industry moved (a market-wide
 * story that names it: the solar companies sold in the fear gauge's week, the health care companies the Dow record
 * lifted), 5 any other market-wide story; null for a story of another sector.
 */
export function tierOf(story: StockStory, ticker: string): SignalTier | null {
	const T = normalizeTicker(ticker);
	if (story.ticker === T) return 0;
	if (READINGS[story.id]?.named?.[T]) return 1;
	const category = primaryCategoryOf(T);
	if (category && category === primaryCategoryOf(story.ticker)) return 2;
	if (inSector(story, T)) return 3;
	if (reportsIndustry(story, T)) return 4;
	if (MARKET_WIDE.has(story.category)) return 5;
	return null;
}

/** The tone pill of a story's card on a company's page: THE ONE RULE of the header. */
export function toneFor(story: StockStory, ticker: string): StockStoryTone {
	const T = normalizeTicker(ticker);
	if (story.ticker === T) return story.tone;
	const reading = READINGS[story.id];
	const named = reading?.named?.[T];
	if (named) return named;
	const group = groupOf(story, T);
	if (group) return group.tone;
	const category = primaryCategoryOf(T);
	const industry = category ? reading?.industries?.[category] : undefined;
	if (industry) return industry;
	return reading?.collections?.[collectionOf(T)] ?? "Neutral";
}

/** One story picked for a company's row: the story, why (its tier) and the pill it wears there. */
export type SignalStory = { story: StockStory; tier: SignalTier; tone: StockStoryTone };

/** The site's stories for a company's row, closest first (ties in the feed's order), at most `MAX_STORIES`. */
export function signalStoriesFor(ticker: string): SignalStory[] {
	const T = normalizeTicker(ticker);
	return siteStories()
		.map((story, at) => ({ story, at, tier: tierOf(story, T) }))
		.filter((x): x is { story: StockStory; at: number; tier: SignalTier } => x.tier !== null)
		.sort((a, b) => a.tier - b.tier || a.at - b.at)
		.slice(0, MAX_STORIES)
		.map(({ story, tier }) => ({ story, tier, tone: toneFor(story, T) }));
}

/** The catalog's culturalContext of a company, verbatim: what its explainer sheet reads. */
export type Explainer = { symbol: string; title: string; sections: readonly { heading: string; content: string }[] };

/** A News signal card: a story (opens its article), a live headline (opens its source), or the company's explainer. */
export type SignalArticle = StockArticle & { explainer?: Explainer };

/** The catalog's own explainer of a company (its culturalContext), or null where the catalog has none. */
export function explainerFor(ticker: string): Explainer | null {
	const T = normalizeTicker(ticker);
	const context = brandByTicker(T)?.culturalContext;
	if (!context?.title?.trim() || !context.sections?.length) return null;
	return { symbol: T, title: context.title, sections: context.sections.map(({ heading, content }) => ({ heading, content })) };
}

/** The explainer's card in the row: the site's own label, the neutral pill, the catalog's title as its headline. */
export function explainerCard(ticker: string): SignalArticle | null {
	const explainer = explainerFor(ticker);
	return explainer ? { source: EXPLAINER_SOURCE, tone: EXPLAINER_TONE, text: explainer.title, explainer } : null;
}

/** The card that opens the company's explainer sheet (not an article, not a source page). */
export const isExplainerCard = (a: StockArticle): a is SignalArticle & { explainer: Explainer } => !!(a as SignalArticle).explainer;

/** A fund, which has no earnings of its own (the tag table's index funds). */
export const isFund = (ticker: string): boolean => primaryCategoryOf(ticker) === FUND_CATEGORY;

/** 32-bit FNV-1a of a text: the seed of a company's own figures (one company, one figure, every visit). */
function seedOf(text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * How far ahead a company that the phones do not author reports next, in days: within the coming quarter (companies
 * report every three months), at least two weeks out, so the line never reads like breaking news.
 */
export const EARNINGS_WINDOW = { first: 14, last: 91 } as const;

/**
 * The days until a company's next earnings: the phones' own for their nineteen (coverage.ts `earningsIn`, AAPL's being
 * the frame's 26: "Q3 earnings land July 30." on Saturday, July 4), otherwise a number in `EARNINGS_WINDOW` seeded by the
 * ticker (the same every visit), as the phones' StakClock.daysAhead takes a fixed number of days; null for an index fund.
 */
export function earningsInFor(ticker: string): number | null {
	const T = normalizeTicker(ticker);
	const authored = T === "AAPL" ? AAPL_COVERAGE : PHONE_COVERAGE[T];
	if (authored) return authored.earningsIn;
	if (isFund(T)) return null;
	return EARNINGS_WINDOW.first + (seedOf(T) % (EARNINGS_WINDOW.last - EARNINGS_WINDOW.first + 1));
}

/** "Next earnings land Dec 6.", dated from the clock (live/clock.ts daysAhead); a fund says it has none. */
export function earningsLineFor(ticker: string, now: number = Date.now()): string {
	const days = earningsInFor(ticker);
	return days === null ? FUND_EARNINGS : `Next earnings land ${daysAhead(days, now)}.`;
}

/**
 * The catalog's commentary on a company in the frames' sentence style: its revenue growth's culturalTranslation (the
 * ruling's example), capitalised and ending in a full stop; the personality line where that is missing; null without any.
 */
export function commentaryLine(ticker: string): string | null {
	const brand = brandByTicker(ticker);
	const text = brand?.financials?.revenueGrowth?.culturalTranslation?.trim() || brand?.personalityDescription?.trim();
	return text ? sentence(text) : null;
}

/**
 * A company's whole News signal (N39c): the move (or, without a price, `NO_PRICE_MOVE`; `move` is "" when the company
 * has no quote), the two lines, and the row: the stories `signalStoriesFor` picks, then the explainer card.
 */
export function newsSignalFor(ticker: string, move: string, now: number = Date.now()): StockDetailData["news"] {
	const T = normalizeTicker(ticker);
	const picked = signalStoriesFor(T);
	const own = picked.find((p) => p.tier === 0)?.story;
	const explainer = explainerCard(T);
	const cards: SignalArticle[] = picked.map(({ story, tone }) => ({ source: story.source, tone, text: story.title, story: story.id }));
	// the company's own stories lead, then its explainer, then the sector's and the market's stories (coordinator,
	// BUILD-PLAN N42): 203 companies have no story of their own and share the same market-wide stories, so the card that
	// is about THIS company stands where the row is seen without scrolling, not fourth and cut at the card's edge
	const ownCount = picked.filter((p) => p.tier === 0).length;
	const articles: SignalArticle[] = explainer ? [...cards.slice(0, ownCount), explainer, ...cards.slice(ownCount)] : cards;
	return {
		title: SIGNAL_TITLE,
		move: move || NO_PRICE_MOVE,
		lines: [own?.gist[0] ?? commentaryLine(T) ?? NO_FRESH_HEADLINES, earningsLineFor(T, now)],
		articles,
	};
}

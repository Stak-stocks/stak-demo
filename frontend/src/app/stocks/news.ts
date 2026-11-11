/**
 * The website's own stories, for the stock page's "News signal" (coordinator decision D1, the discover-stock audit #3 /
 * #4 and ruling N39c): every story of src/app/news/articles.ts names one related company (`ticker.symbol`, the company
 * its article's rail shows and saves). A company's own stories lead its News signal; signal.ts picks the rest of the
 * row (stories of the company's sector, the market-wide ones, the company's explainer) and gives each card its tone.
 * Each card is in Figma's 2:3526 template (source line, tone chip, headline) and opens its own article, as the News
 * listing's cards and Home's story cards do. The News files are read, never changed.
 *
 * - The source line is the one the story wears where the site lists it: the News listing's card ("Reuters · 2d": its
 *   own publisher and its age, the age its article's byline is dated from on the clock, articles.ts `bylineOf`), or for
 *   Home's two Market Mood stories the line their Read next cards print ("CNN Business · 1d").
 * - The tone chip is the story's sentiment for its OWN company, the chip vocabulary Figma's cards use (2:3528 Neutral,
 *   2:3539 Positive, 2:3545 Negative), authored here from each article's own copy (see TONE); signal.ts `toneFor` reads
 *   it for the story's company and the copy's other statements for every other company.
 * - The two lines under the move start with the story's first gist line (its one-line points, 2:4477), in place of
 *   "No fresh headlines today.".
 */
import { ARTICLES, HOME_ARTICLES, type NewsArticle, readNextOf, STORIES, type StoryRef } from "@/app/news/articles";

export type StockStoryTone = "Positive" | "Neutral" | "Negative";

/**
 * Each story's tone for its own company, from its article: GS rose 1.2 % with the banks that carried the Dow to a
 * record; JPM waits on the Fed minutes (a preview, no move yet); Nvidia rose in the half but trails the rally it
 * started; Apple climbed 5 %; Tesla fell 7 % after its deliveries; Realty Income edged up as rate bets eased; Micron
 * rose almost 70 % in the half; Exxon follows the oil slide; Coca-Cola edged up as money sheltered in it; for
 * Microsoft the OpenAI delay "changes little in the short run".
 */
const TONE: Readonly<Record<string, StockStoryTone>> = {
	"dow-record-chips": "Positive",
	"fed-minutes": "Neutral",
	"nvidia-chip-rally": "Neutral",
	"apple-foldable": "Positive",
	"tesla-deliveries": "Negative",
	"june-jobs-miss": "Positive",
	"memory-chips-soar": "Positive",
	"oil-slips-iran": "Negative",
	"fear-gauge-32": "Positive",
	"openai-ipo-delayed": "Neutral",
};

/** One story as the stock page's News signal shows it. */
export type StockStory = {
	/** the article's id: the card opens /news/<id> */
	id: string;
	title: string;
	/** "Reuters · 2d": where the site lists it */
	source: string;
	/** the story's tone for its own company (`TONE`) */
	tone: StockStoryTone;
	/** the story's one-line points (the article's gist), the signal lines under the move */
	gist: readonly string[];
	/** the story's related company (its article's rail), upper case */
	ticker: string;
	/** the article's category ("Markets", "Economy", "Tech & Ai", "Autos", "Energy"): Markets and Economy are market-wide */
	category: string;
};

/** Every story the site lists, as its list shows it: the News listing's, then Home's two (their Read next cards' lines). */
function storyRefs(): ReadonlyMap<string, StoryRef> {
	const refs = new Map<string, StoryRef>(STORIES.map((s) => [s.id, s]));
	for (const a of HOME_ARTICLES) for (const s of readNextOf(a.id)) if (!refs.has(s.id)) refs.set(s.id, s);
	return refs;
}

let all: readonly StockStory[] | null = null;
let cache: ReadonlyMap<string, readonly StockStory[]> | null = null;

/**
 * Every story of the site, in the feed's order: the listing's (the brief, the Mini story, For You, Markets), then Home's
 * two. A story the site never lists (none today) has no card to stand for: it is left out.
 */
export function siteStories(): readonly StockStory[] {
	if (all) return all;
	const refs = storyRefs();
	const out: StockStory[] = [];
	const add = (a: NewsArticle) => {
		const ref = refs.get(a.id);
		if (!ref) return;
		out.push({ id: a.id, title: ref.title, source: ref.source, tone: TONE[a.id] ?? "Neutral", gist: a.gist, ticker: a.ticker.symbol.toUpperCase(), category: a.category });
	};
	for (const a of ARTICLES) add(a);
	for (const a of HOME_ARTICLES) add(a);
	all = out;
	return out;
}

/** The site's stories by related company, in the feed's order. */
function byTicker(): ReadonlyMap<string, readonly StockStory[]> {
	if (cache) return cache;
	const out = new Map<string, StockStory[]>();
	for (const s of siteStories()) out.set(s.ticker, [...(out.get(s.ticker) ?? []), s]);
	cache = out;
	return out;
}

/** The site's stories about a company (empty when it has none). */
export function storiesFor(ticker: string): readonly StockStory[] {
	return byTicker().get(ticker.trim().toUpperCase()) ?? [];
}

/** The article a story id opens, as the stock page links it. */
export const storyPath = (id: string) => ({ to: "/news/$id" as const, params: { id } });

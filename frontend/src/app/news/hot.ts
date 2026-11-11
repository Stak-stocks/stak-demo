import { useEffect, useMemo, useRef, useState } from "react";
import { type Quote, useQuotes } from "@/app/live/quotes";
import { articleById, STORIES, type StoryRef } from "./articles";
import { type RotationBind, useRotationHold } from "./briefRotation";
import { newsListing } from "./data";

/**
 * The Mini card's hot stories ("Mini · Markets" 2:4397; the user, 2026-11-11, N62: "this section should be hottest news
 * going on in the market. something to catch users atterntion" and "and be making it change every 30 secs").
 *
 * The card shows the listing's hottest stories in turn: the listing's stories the Today's brief does not already carry
 * (its three briefs rotate there), ranked by how hard their company is moving today, the absolute daily move of the
 * story's related company (its article's rail): the company's live quote when there is one (a signed-in account while
 * the STAK API serves prices), otherwise the move the story's own rail prints ("-7.04% today"). A signed-out visitor
 * (the showcase included: the user asked for this section for every visitor) gets the stories' own figures, so the card
 * opens on "Tesla drops 7% even after beating deliveries". Two equal moves (at the two decimals the rail prints) rank
 * the younger story first, then the listing's order. The hottest HOT_COUNT turn every HOT_INTERVAL_MS (useHotRotation).
 *
 * Home's two Market Mood stories (articles.ts HOME_ARTICLES) are not candidates: they stay out of the listing and its
 * search (the coordinator's D12).
 */

/** The Mini card shows the next hot story every 30 seconds (the user, 2026-11-11). */
export const HOT_INTERVAL_MS = 30_000;

/** How many of the hottest stories the card turns through (N62: "the top several, at least 4"): a two-minute round. */
export const HOT_COUNT = 4;

/** One story as the Mini card draws it (2:4397: kicker, title, one line, source) and what it is ranked by. */
export type MiniStory = {
	readonly id: string;
	/** the story's category in capitals, as the frame's "MARKETS" is the Fed minutes' category ("AUTOS", "TECH & AI") */
	readonly kicker: string;
	/** the title the listing gives the story */
	readonly title: string;
	/** one line from the story's own dek, cut as the frame cuts the Fed minutes' (data.ts miniLines) */
	readonly body: string;
	/** the source line the listing prints for the story ("CNBC · 2d") */
	readonly source: string;
	/** the related company, the one its article's rail shows */
	readonly symbol: string;
	/** the company's move today as the story's rail prints it for a signed-out visitor, in percent (-7.04) */
	readonly move: number;
	/** the story's age as the listing prints it ("2d", "2h") */
	readonly age: string;
};

/** What a quote tells the ranking: today's move in percent, and whether it is a live quote (not the demo table's). */
export type MoveQuote = Pick<Quote, "changePercent" | "live">;

/** "-7.04% today" -> -7.04, "+4.84% today" -> 4.84 (a typographic minus too); NaN for a text that states no figure. */
export function movePct(change: string): number {
	const m = /^\s*([+\-−]?)\s*(\d+(?:\.\d+)?)\s*%/.exec(change);
	if (!m) return Number.NaN;
	const n = Number(m[2]);
	return m[1] === "" || m[1] === "+" ? n : -n;
}

const MINUTES: Readonly<Record<string, number>> = { m: 1, h: 60, d: 1440, w: 10_080 };

/** A story's age in minutes ("40m" 40, "2h" 120, "2d" 2880), the ranking's tie-break; an age it cannot read is the oldest. */
export function ageMinutes(age: string): number {
	const m = /^(\d+)\s*([mhdw])$/.exec(age.trim());
	return m ? Number(m[1]) * MINUTES[m[2]!]! : Number.POSITIVE_INFINITY;
}

/**
 * How hard a story's company is moving today: the absolute move at the two decimals the rail prints ("-7.04% today" is
 * 7.04), from the company's live quote when there is one, otherwise from the story's own figure. A demo quote (the
 * signed-out visitor's prices, the API down) is not the story's company moving today, so the story's figure stands.
 */
export function heatOf(story: Pick<MiniStory, "move">, quote?: MoveQuote | null): number {
	const pct = quote?.live === true && Number.isFinite(quote.changePercent) ? quote.changePercent : story.move;
	return Number.isFinite(pct) ? Math.round(Math.abs(pct) * 100) / 100 : 0;
}

/**
 * The hottest `count` of `stories`, hottest first: by heatOf, an equal heat by age (the younger first), then in the
 * order given (the listing's). `quotes` is keyed by symbol.
 */
export function rankHot<S extends Pick<MiniStory, "symbol" | "move" | "age">>(
	stories: readonly S[],
	quotes: Readonly<Record<string, MoveQuote | undefined>> = {},
	count = HOT_COUNT,
): S[] {
	return stories
		.map((story, order) => ({ story, order, heat: heatOf(story, quotes[story.symbol]), age: ageMinutes(story.age) }))
		.sort((a, b) => b.heat - a.heat || a.age - b.age || a.order - b.order)
		.slice(0, Math.max(0, Math.floor(count)))
		.map((r) => r.story);
}

const BRIEF_IDS: ReadonlySet<string> = new Set(newsListing.briefs.map((b) => b.id));

/** A listing story as the Mini card draws it; none for a story without an article or a line written for the card. */
function miniStoryOf(story: StoryRef): MiniStory[] {
	const a = articleById(story.id);
	const body = newsListing.miniLines[story.id];
	if (!a || !body) return [];
	return [
		{
			id: story.id,
			kicker: a.category.toUpperCase(),
			title: story.title,
			body,
			source: story.source,
			symbol: a.ticker.symbol,
			move: movePct(a.ticker.change),
			age: a.age,
		},
	];
}

/** The stories the Mini card can show: the listing's stories (articles.ts STORIES) the Today's brief does not carry, in the listing's order. */
export const HOT_CANDIDATES: readonly MiniStory[] = STORIES.filter((s) => !BRIEF_IDS.has(s.id)).flatMap(miniStoryOf);

const HOT_SYMBOLS: readonly string[] = [...new Set(HOT_CANDIDATES.map((s) => s.symbol))];

/**
 * The Mini card's stories right now, hottest first: the candidates ranked on the quotes every screen shares (useQuotes:
 * a live quote for an account while the API serves prices, the demo table otherwise, which leaves the stories' own
 * figures in charge). The list keeps its identity while no quote changes.
 */
export function useHotStories(): readonly MiniStory[] {
	const quotes = useQuotes(HOT_SYMBOLS);
	return useMemo(() => rankHot(HOT_CANDIDATES, quotes), [quotes]);
}

/** The stories the card turns through and the one on show. */
type HotPage<T> = { readonly list: readonly T[]; readonly at: number };

/**
 * The page after `page`: the story after the one on show in the `latest` order, the last wrapping to the first; the
 * first when the one on show has left that order (a live quote moved it out of the hottest).
 */
export function nextHotPage<T extends { readonly id: string }>(page: HotPage<T>, latest: readonly T[]): HotPage<T> {
	if (latest.length === 0) return page;
	const shownId = page.list[page.at]?.id;
	const i = latest.findIndex((s) => s.id === shownId);
	return { list: latest, at: i < 0 ? 0 : (i + 1) % latest.length };
}

export type HotRotation<T> = {
	/** the stories the card holds, in the order it turns through them */
	stories: readonly T[];
	/** the story on show (0 at mount: the hottest) */
	index: number;
	/** true while the pointer rests on the card or it has keyboard focus: the rotation holds */
	paused: boolean;
	/** the card's handlers: hover and keyboard focus hold the rotation, leaving resumes it */
	bind: RotationBind;
};

/**
 * The Mini card's clock: the next story every `intervalMs`, the last wrapping to the first, held while the pointer
 * rests on the card or it has keyboard focus (the brief's hold, useRotationHold: WCAG 2.2.2), a full interval again
 * once both have left. It opens on the hottest story. Each turn reads the LATEST ranking (a live quote may have moved
 * it since: nextHotPage), so a new ranking never changes the story on show between turns, and never while the card is
 * held; the stories it was given are re-read only at a turn. One story never moves. The listing keys the card on the
 * search alone (search.ts miniSearchKey), never on the ranking, so a search that changes which stories match starts it
 * again at the hottest match while a new ranking waits for the turn.
 */
export function useHotRotation<T extends { readonly id: string }>(stories: readonly T[], intervalMs = HOT_INTERVAL_MS): HotRotation<T> {
	const { paused, bind } = useRotationHold();
	const [page, setPage] = useState<HotPage<T>>(() => ({ list: stories, at: 0 }));
	const latest = useRef(stories);
	useEffect(() => {
		latest.current = stories;
	}, [stories]);
	const turns = Math.max(page.list.length, stories.length) > 1;
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new `page` (a turn) restarts the interval on purpose
	useEffect(() => {
		if (paused || !turns) return;
		const t = window.setTimeout(() => setPage((p) => nextHotPage(p, latest.current)), intervalMs);
		return () => window.clearTimeout(t);
	}, [paused, turns, intervalMs, page]);
	return { stories: page.list, index: page.at, paused, bind };
}

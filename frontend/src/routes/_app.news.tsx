import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { colPlus, useSizeClass } from "@/app/FitCanvas";
import { useShowcase } from "@/app/live/showcase";
import { useLive } from "@/app/live/store";
import { N } from "@/app/news/assets";
import { rememberListingSearch } from "@/app/news/backToListing";
import { BriefCard } from "@/app/news/BriefCard";
import { recallBrief, rememberBrief } from "@/app/news/briefMemory";
import { useBriefRead } from "@/app/news/briefRead";
import { listingDate, newsListing } from "@/app/news/data";
import { HOT_CANDIDATES, useHotStories } from "@/app/news/hot";
import { MiniCard } from "@/app/news/MiniCard";
import { NewsColumn } from "@/app/news/NewsCard";
import { NewsSearchButton, NewsSearchField, NewsSearchStatus } from "@/app/news/NewsSearch";
import { usePreloadNext } from "@/app/news/preload";
import { miniSearchKey, readSearchParam, resultMessage, searchListing } from "@/app/news/search";
import { listingSections, loneSection } from "@/app/news/sections";

/**
 * The article screen, loaded ahead so the first click is instant like the prototype's (every story opens the same route,
 * so this loads it for all of them): the brief's story and the first card's. The articles' heroes are the listing's own
 * thumbnails, already in the cache.
 */
const NEXT = [
	{ to: "/news/$id", params: { id: newsListing.briefs[0]!.id } },
	{ to: "/news/$id", params: { id: newsListing.forYou.cards[0]!.id } },
] as const;

/** "Frame 1618869217" 2:4371: the brief (744) and the Market Mood column (360) share the row's width less its 40 gap, 744 : 360. */
const BRIEF_SHARE = "calc((100% - 40px) * 744 / 1104)";
const MOOD_SHARE = "calc((100% - 40px) * 360 / 1104)";

/**
 * The search field spans the header row from the title's left edge to the magnifier's right edge, at every size and in
 * both navigation states (the coordinator's ruling of 2026-11-06, 21:05; the phones put the field in the header's
 * column). From 1024 the row runs 10 past the content box (the Search button sits 3 in from its end), so the field is the
 * content box + 10, the header row's whole box: 1144 at 1440, ending on the stories' right edge (1400) with the
 * navigation open, and 1304 with it closed (x 96 to 1400); below 1024 the row is the column and the button ends it, so
 * the field is the column (--stak-compact: 1).
 */
const SEARCH_FIELD_WIDTH = "calc(100% + 10px * (1 - var(--stak-compact, 0)))";

/** The listing's address (the `_app` layout adds nothing to it). */
const LISTING_PATH = "/news";

/**
 * Figma 2:4359 is 1120 tall and its last cards end at 840 (the shell's 88, then 752 of content): the page keeps those
 * 280 under its stories, as every page keeps its frame's own space under its content (My STAK's FRAME_BOTTOM, the
 * article's 420). At rest that is the frame's height exactly (752 + 280 = the 1032 minimum); a listing that grows past
 * it (a search field over a long column of hits) keeps the same margin instead of ending on its last card's edge (the
 * hunt's VIS-04). Below 1024 the shell's own 32 px gutter ends the page.
 */
const FRAME_BOTTOM_SPACE = 280;

/** `?q=`: absent = the search is closed (a fresh visit), present = open with the field's text (empty: `?q=`). */
type ListingSearchParams = { q?: string };

export const Route = createFileRoute("/_app/news")({
	validateSearch: (search: Record<string, unknown>): ListingSearchParams => ({ q: readSearchParam(search.q) }),
	component: NewsPage,
});

/**
 * Figma 2:4359 "Desktop · News listing" (1440x1120): a 1144 column (the 1134 content column + 10) of a header
 * row, the brief / Market Mood / Mini · Markets row (744 + 40 + 360) and the For You / Markets columns
 * (552 + 40 + 552). Above 1440 the column widths keep their share of the real column; the search button stays
 * at the right edge, 3px in, as in the frame, also with the navigation closed (the stories then keep their width).
 *
 * Below 1024 (SPEC R2, R3; the phone frame "News listing tab" 1:1186 on page 0:1 gives the ORDER): both rows stack
 * into one column of the same pieces, each as wide as the column, in the phone frame's order: Market Mood, the
 * brief, the Mini story, then For You and Markets. The stacked blocks are rendered in that order (useSizeClass), so
 * the DOM and the Tab order are what the eye sees (R10's ruling); at 1024 and above the DOM is the approved one.
 * The brief and the cards hug their wrapped copy there instead of clipping it (R9).
 *
 * What the prototype wires (the desktop frame has no reactions; the phone's "News listing tab" 1:1186 carries them):
 * the Apple story opens its article (1:1220 -> 1:1319, INSTANT). Since the user's ruling of 2026-11-01 ("the figma
 * design was a place holder") every story does the same, each opening its own article in the template's layout (the
 * brief's Read ›, the Mini story, all six cards; src/app/news/articles.ts), and the brief pages through three briefs
 * every 25 s (BriefCard). Since the user's ruling of 2026-11-11 (N62: "this section should be hottest news going on in
 * the market" and "be making it change every 30 secs") the Mini card shows the day's hottest stories outside the brief,
 * the next every 30 s, in the frame's look (src/app/news/MiniCard.tsx, hot.ts), for every visitor. The Market Mood chip
 * has no reaction on either page: not a control.
 *
 * The Search button works as the mobile apps' search glass does (the user's request of 2026-11-06: "look at how it was
 * done in the mobile codebase"; android NewsScreen.kt, iOS NewsView.swift; Figma draws no search screen): it opens a
 * field under the header row and focuses it; pressed again, or Escape in the field, it closes the field and clears the
 * query. A query (trimmed, any case, anywhere in a brief's title, dek and source or a story's headline, dek, source,
 * tags and company: src/app/news/search.ts) hides Market Mood and keeps only what matches: the brief carousel carries
 * its matching briefs (none: no carousel), the Mini card its matching hot stories (none: no card; one holds still) and
 * each section its matching stories, a section with none goes with its title; nothing matching leaves the header and the
 * field (no message, as on the phones). At 1024 and
 * above the results start from the left (the coordinator's ruling of 2026-11-06, 19:50): in a row whose left piece is
 * hidden (the brief, For You), the right piece (the Mini story, Markets) takes its place at its own width, and a row with
 * nothing left goes entirely. Below 1024 the one column simply closes up. Screen readers hear the count, each story
 * once (NewsSearchStatus); nothing else is drawn. The article's own Back arrow returns to the search
 * (src/app/news/backToListing.ts).
 *
 * The stories are the authored demo feed. A signed-out visitor who has not acted yet sees the frame verbatim (every
 * card "In your STAK"). After the first action (the showcase rule), and for accounts, the two sections follow the
 * person's saves as the phones' do (src/app/news/sections.ts): For You holds the stories about companies in their STAK
 * ("In your STAK"), Markets the rest ("Markets"); a save or an unsave anywhere moves its story at once, and a section
 * with no story is not drawn (at 1024 and up the one left starts from the left, the search's rule of 2026-11-06).
 * A person with NO story in one of the two (no saves: the phones then list every story under Markets and draw no For
 * You at all) gets the other across the whole story row at 1024 and up, its six stories in the frame's two columns of
 * cards, row by row (sections.ts loneSection; the hunt's VIS-04: one half-width column beside an empty half).
 *
 * The date line is today's (the phones' StakClock.todayLong; src/app/news/data.ts listingDate), for every visitor: on
 * the frames' own day it reads the frame's "Saturday, July 4". The stories' ages are ages ("2d", "10h").
 *
 * Showing the brief records today's brief as read (useBriefRead: the inbox's "Your daily brief is ready" row is derived
 * from it, src/app/live/notifications.ts). Stepping back to the listing from an article finds the brief card on the brief
 * the person left, as the phones' pager keeps its page; a fresh visit starts at the first brief
 * (src/app/news/briefMemory.ts).
 */
function NewsPage() {
	const { forYou, markets } = newsListing;
	usePreloadNext(NEXT);
	const live = useLive();
	const showcase = useShowcase();
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	const search = useListingSearch();

	const sections = listingSections(showcase, live.savedTickers);
	// a person whose stories all sit in one section (no saves: Markets holds every story, as on the phones) gets that
	// section across the whole story row at 1024 and up (sections.ts loneSection, the hunt's VIS-04)
	const lone = loneSection(sections);
	// the Mini card's stories: the hottest outside the brief, hottest first (src/app/news/hot.ts)
	const hot = useHotStories();
	// the whole listing for an empty query (the search closed, or open with nothing typed)
	const hits = searchListing({ briefs: newsListing.briefs, mini: hot, forYou: sections.forYou, markets: sections.markets }, search.query);
	useBriefRead(hits.briefs.length > 0);
	const forYouColumn = hits.forYou.length > 0 && <NewsColumn title={forYou.title} cards={hits.forYou} wide={lone === "forYou"} />;
	const marketsColumn = hits.markets.length > 0 && <NewsColumn title={markets.title} cards={hits.markets} wide={lone === "markets"} />;
	// keyed on its briefs: a new set of hits starts the carousel at its first one (the mobile pager is keyed on its pages)
	const briefKey = hits.briefs.map((b) => b.id).join(" ");
	// ... and stepping back to this listing entry (an article's Back, the browser's) finds the brief the person left, as
	// the phones' pager keeps its page (src/app/news/briefMemory.ts): the card opens on the brief this history entry last
	// showed and reports every brief it shows
	// (the router's location is already the next page's while this one is still on its way out: only the listing's own
	// entry is ever remembered)
	const entry = useLocation({ select: (l) => (l.pathname.replace(/\/$/, "") === LISTING_PATH ? l.state.__TSR_key : undefined) });
	const briefStart = recallBrief(entry, briefKey, hits.briefs.length);
	const onBriefShow = useCallback((index: number) => rememberBrief(entry, briefKey, index), [entry, briefKey]);
	// the Mini card is keyed on the search alone, the stories it matches among all the candidates (search.ts
	// miniSearchKey): a search that changes which stories match starts it again at the hottest match (as the brief starts
	// at its first hit); a live quote, whichever stories it makes the hottest, moves nothing on show until the card's next
	// turn and nothing while it is held (hot.ts useHotRotation). Only a search's last hot matches leaving the hottest take
	// the card away, as a search that matches none of them draws none.
	const mini = hits.mini.length > 0 && <MiniCard key={miniSearchKey(HOT_CANDIDATES, hits.query)} stories={hits.mini} />;
	const topRow = hits.mood || hits.briefs.length > 0 || hits.mini.length > 0;
	const storyRow = hits.forYou.length > 0 || hits.markets.length > 0;

	return (
		<div className="stak-news flex min-h-[1032px] w-full flex-col items-start gap-[24px] max-lg:min-h-0 max-lg:pb-0!" style={{ paddingBottom: FRAME_BOTTOM_SPACE }}>
			{/* "Frame 1618869181": title block left, the 40px Search button at x 1101 of 1144 (the row runs 10 past the
			    column). It spans the shell's whole content box, so when the navigation closes the Search button stays at
			    the right edge (as the bell does in 2:8435) while the stories below keep their width. Below 1024 the row is
			    the column and the button sits on its right edge. */}
			<div className="flex h-[58px] items-center justify-between max-lg:w-full!" style={{ width: "calc(100% + 10px)" }}>
				<div className="flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap">
					<h1 className="font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{newsListing.title}</h1>
					{/* 2:4365: today, on the clock (the phones' StakClock.todayLong; the frame's "Saturday, July 4" on its own day) */}
					<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{listingDate()}</p>
				</div>
				<NewsSearchButton ref={search.buttonRef} open={search.open} onToggle={search.toggle} />
			</div>

			{/* the field, 12 under the header row (the mobile's top padding: the listing's 24 gap less 12) and 24 above the
			    stories, across the header row's whole box: the title's left edge to the row's right edge, which the stories' column shares with the navigation open (SEARCH_FIELD_WIDTH; coordinator, 2026-11-06 22:40) */}
			{search.open && (
				<>
					<NewsSearchField ref={search.fieldRef} value={search.text} onChange={search.change} onEscape={search.close} style={{ width: SEARCH_FIELD_WIDTH, marginTop: -12 }} />
					<NewsSearchStatus query={hits.query} message={hits.query ? resultMessage(hits.count) : ""} />
				</>
			)}

			{!topRow && !storyRow ? null : compact ? (
				// one column in the phone frame's order; the Market Mood column's own 22 between its blocks, the frame's 50
				// before the story sections, and the story row's 40 between For You and Markets
				<div className="flex w-full flex-col items-start gap-[50px]">
					{topRow && (
						<div className="flex w-full flex-col items-start gap-[22px]">
							{hits.mood && <MoodChip />}
							{hits.briefs.length > 0 && <BriefCard key={briefKey} briefs={hits.briefs} start={briefStart} onShow={onBriefShow} />}
							{mini}
						</div>
					)}
					{storyRow && (
						<div className="flex w-full flex-col items-start gap-[40px]">
							{forYouColumn}
							{marketsColumn}
						</div>
					)}
				</div>
			) : (
				<div className="flex flex-col items-start gap-[50px]" style={{ width: colPlus(10) }}>
					{/* while a query is active the results start from the left (the coordinator's ruling of 2026-11-06,
					    19:50): in a row whose left piece is hidden the right piece takes its place at its own width (the Mini
					    story at the brief's x, Markets in For You's place); a right piece that goes leaves its room empty.
					    With no query both rows are Figma's grid, as approved. */}
					{topRow && (
						<div className="flex w-full items-start gap-[40px]">
							{hits.briefs.length > 0 && (
								<BriefCard key={briefKey} briefs={hits.briefs} start={briefStart} onShow={onBriefShow} style={{ flex: `0 0 ${BRIEF_SHARE}` }} />
							)}
							{(hits.mood || mini) && (
								<div className="flex min-w-0 flex-col items-start gap-[22px]" style={{ flex: `0 0 ${MOOD_SHARE}` }}>
									{hits.mood && <MoodChip />}
									{mini}
								</div>
							)}
						</div>
					)}

					{storyRow && (
						<div className="flex w-full items-start gap-[40px]">
							{forYouColumn}
							{marketsColumn}
							{/* a section a query left on its own keeps its half of the row; the person's only section has the whole row */}
							{!(forYouColumn && marketsColumn) && !lone && <div className="min-w-0 flex-1" />}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * The search's state, kept in the URL as the mobile apps keep it in rememberSaveable (a story opened from the results
 * and Back return to the same search): `?q=` holds the field's text as typed. The URL is REPLACED as the search opens,
 * changes and closes, never pushed, so searching adds no history entry; a fresh visit (no `?q`) starts closed. The
 * field reads the page's own state, so a keystroke never waits for the router; a change of the URL the page did not make
 * (the rail's News link to a bare /news while the search is open) is followed.
 */
function useListingSearch() {
	const { q } = Route.useSearch();
	const navigate = Route.useNavigate();
	const [open, setOpen] = useState(q !== undefined);
	const [text, setText] = useState(q ?? "");
	const buttonRef = useRef<HTMLButtonElement>(null);
	const fieldRef = useRef<HTMLInputElement>(null);
	// what this page wrote into the URL, oldest first, until the router hands each one back; and the latest one
	const pending = useRef<(string | undefined)[]>([]);
	const last = useRef<string | undefined>(q);

	const write = useCallback(
		(next: string | undefined) => {
			pending.current.push(next);
			last.current = next;
			void navigate({ to: ".", search: (prev) => ({ ...prev, q: next }), replace: true, resetScroll: false, viewTransition: false });
		},
		[navigate],
	);

	useEffect(() => {
		const echo = pending.current.indexOf(q);
		if (echo >= 0) {
			pending.current.splice(0, echo + 1);
			return;
		}
		if (q === last.current) return;
		pending.current = [];
		last.current = q;
		setOpen(q !== undefined);
		setText(q ?? "");
	}, [q]);

	// the Search button pressed while open, or Escape in the field: closed, cleared, focus on the Search button
	const close = useCallback(() => {
		setOpen(false);
		setText("");
		write(undefined);
		buttonRef.current?.focus();
	}, [write]);

	const toggle = useCallback(() => {
		if (open) {
			close();
			return;
		}
		// the field is drawn at once, so it takes focus within the press (a phone raises its keyboard only then)
		flushSync(() => setOpen(true));
		fieldRef.current?.focus();
		write("");
	}, [open, close, write]);

	const change = useCallback(
		(value: string) => {
			setText(value);
			write(value);
		},
		[write],
	);

	// what the article's own Back arrow returns to when it did not come from here (src/app/news/backToListing.ts)
	useEffect(() => rememberListingSearch(open ? text : undefined), [open, text]);

	return { open, text, query: open ? text : "", buttonRef, fieldRef, toggle, change, close };
}

/**
 * "Market Mood chip" 2:4390: 95 tall, the gauge (Group 314) 17.97 from the right edge; the subtitle names the reading
 * the gauge art shows, as on Home's Market Mood card.
 */
function MoodChip() {
	const { mood } = newsListing;
	return (
		<div className="relative flex h-[95px] w-full items-center overflow-clip rounded-[12px] bg-[#181f30] px-[16px] py-[10px]">
			<div className="flex flex-col items-start gap-[2px] overflow-clip whitespace-nowrap">
				<span className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{mood.title}</span>
				<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">{mood.subtitle}</span>
			</div>
			{/* the 3x export is 202x101 (67.03x33.62 rounded up at 3x, drawn from its top-left): 67.33x33.67 from x 275 */}
			<img alt="" src={N.gauge} width={67.333} height={33.667} className="absolute right-[17.667px] top-[30.692px] h-[33.667px] w-[67.333px] max-w-none" />
		</div>
	);
}

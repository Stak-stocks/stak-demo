import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useLayoutEffect, useMemo } from "react";
import { col, useSizeClass } from "@/app/FitCanvas";
import { cardsLeft } from "@/app/home/copy";
import { type CollectionGroup, countLabel, useCollections } from "@/app/live/collections";
import { useDeck } from "@/app/live/deck";
import { useShowcase } from "@/app/live/showcase";
import { type AllocationLineRow, allocationFor } from "@/app/mystak/allocation";
import { AllocationRing } from "@/app/mystak/AllocationRing";
import { MS } from "@/app/mystak/assets";
import {
	ALLOCATION_DOTS,
	ALLOCATION_TRACK,
	COLLECTION_ICONS,
	DEFAULT_RANGE,
	DISCOVER_CTA,
	deckControl,
	EMPTY,
	FOCUS_KEY,
	FRAME_BOTTOM,
	INSIGHT_HEADING,
	OVERVIEW,
	RANGES,
	type Range,
	SHOWCASE,
} from "@/app/mystak/data";
import { readFor } from "@/app/mystak/insight";
import { FROM_OVERVIEW } from "@/app/mystak/nav";
import { PerformanceCard } from "@/app/mystak/PerformanceCard";
import { PrimaryButton } from "@/app/ui/Button";
import { cn } from "@/lib/utils";

type MyStakSearch = { state?: "empty"; range?: Range };

export const Route = createFileRoute("/_app/my-stak/")({
	validateSearch: (search: Record<string, unknown>): MyStakSearch => ({
		state: search.state === "empty" ? "empty" : undefined,
		// the performance card's selected tab (2:4804); absent = 3M, the tab the frame selects
		range: RANGES.includes(search.range as Range) && search.range !== DEFAULT_RANGE ? (search.range as Range) : undefined,
	}),
	component: MyStakPage,
});

/**
 * The collection grid below 1024 (SPEC R2 / R3): Figma's cards (2:4748 …, 265.5 wide at 1440) fill the column, two per
 * row where two fit (a card needs 240: its 19 padding, the 55.851 icon, the 16 gaps, "Green Energy" at 14.03 and the
 * chevron), else one per row; never more than the frame's two columns. 16 gaps as the frame's (2:4748 -> 2:4754).
 */
const COMPACT_COLLECTION_COLUMNS = "repeat(auto-fill, minmax(min(100%, max(240px, calc(50% - 8px))), 1fr))";

/** The FOCUS_KEY of the control that had focus in the tree being replaced, noted while that tree is still in the page. */
let pendingFocus: string | null = null;

/**
 * Keyboard focus survives the switch between the overview's two trees. The compact and the desktop arrangements are
 * different subtrees (the R10 ruling: below 1024 the DOM follows the visual order), so crossing 1024 (a rotation, a
 * resize) mounts new controls in place of the old ones and focus would fall to <body>. Each tree sits in a keeper of
 * its own (keyed "compact" / "desktop"): React runs the leaving keeper's cleanup BEFORE it removes that tree's DOM
 * (a deleted component's effects unmount first), so the focused control is still the active element there and its
 * FOCUS_KEY is noted; the arriving keeper's effect runs once the new tree is in the page and focuses the control with
 * the same key. Nothing is noted when focus is elsewhere, nothing is moved when something else has focus by then, and
 * a note nobody claims in the same commit (the page was left) is dropped. Renders no element of its own.
 */
function FocusKeeper({ children }: { children: ReactNode }) {
	useLayoutEffect(() => {
		const key = pendingFocus;
		pendingFocus = null;
		const active = document.activeElement;
		if (key !== null && (!active || active === document.body)) {
			Array.from(document.querySelectorAll<HTMLElement>(`[${FOCUS_KEY}]`))
				.find((el) => el.getAttribute(FOCUS_KEY) === key)
				?.focus();
		}
		return () => {
			const leaving = document.activeElement?.closest(`[${FOCUS_KEY}]`)?.getAttribute(FOCUS_KEY) ?? null;
			if (leaving === null) return;
			pendingFocus = leaving;
			queueMicrotask(() => {
				pendingFocus = null;
			});
		};
	}, []);
	return children;
}

function Header() {
	return (
		<div className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap max-lg:max-w-full max-lg:whitespace-normal">
			<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{OVERVIEW.title}</h1>
			<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{OVERVIEW.subtitle}</p>
		</div>
	);
}

/**
 * Figma 2:1830 "Desktop · My STAK · Empty" (10 States): the header, then a 640px stage with the empty-box block.
 * Below 1024 (SPEC R3 / R6) the body text fills the column up to its 460, the stage is the window's remaining height
 * (the phone top bar / tablet band, the header, the 38 gap and the shell's 32 bottom gutter taken out: the block stays
 * centred in what is left, as the phone frame 1:6002 centres its empty state) and the frame's bottom padding goes
 * (the shell's own gutter ends the page there, CORE-API section 4).
 */
function MyStakEmpty({ remaining }: { remaining: number }) {
	// the button opens today's deck while a card is left; once the deck is done it names and opens the deck's receipt
	// instead of inviting into a deck with nothing in it (data.ts deckControl: C-06), in the same place and style
	const control = deckControl(remaining, EMPTY.cta);
	return (
		<div className="flex flex-col items-start gap-[38px] max-lg:pb-0!" style={{ width: col(932), paddingBottom: FRAME_BOTTOM.empty }}>
			<Header />
			<div className="flex h-[640px] w-full flex-col items-center justify-center overflow-clip max-lg:h-auto max-lg:min-h-[calc(100svh-212px)] max-sm:min-h-[calc(100svh-204px)]">
				<div className="flex flex-col items-center overflow-clip">
					{/* 2:1838: a 121.143 x 151 box; the export (2:1839) runs past it for the blurred base shadow */}
					<div className="relative h-[151px] w-[121.143px]">
						<img alt="" src={MS.emptyBox} className="absolute left-[-5.26px] top-0 block h-[165.355px] w-[135.091px] max-w-none" />
					</div>
					<div className="h-[28px] w-[10px]" />
					<p className="whitespace-nowrap text-center font-sora text-[26px] font-semibold leading-[33px] text-white">{EMPTY.title}</p>
					<div className="size-[10px]" />
					<p className="w-[460px] text-center font-geist text-[15px] leading-[22px] text-[#819abb] max-lg:w-full max-lg:max-w-[460px]">{EMPTY.body}</p>
					<div className="h-[28px] w-[10px]" />
					{/* "Go to today's deck": no prototype wiring on either page; the label names the deck (/discover), reached
					    at once like every page-to-page edge of the prototype. The link takes the button's 6 corners, so its
					    keyboard focus ring follows them (the link paints nothing itself) */}
					<Link to={control.to} viewTransition={false} className="block w-[240px] rounded-[6px]">
						<PrimaryButton as="span">{control.label}</PrimaryButton>
					</Link>
					<div className="h-[14px] w-[10px]" />
					<p className="whitespace-nowrap text-center font-geist text-[13px] leading-[17px] text-[#819abb] max-lg:max-w-full max-lg:whitespace-normal">{EMPTY.caption(remaining)}</p>
				</div>
			</div>
		</div>
	);
}

/**
 * Figma 2:4667 "Desktop · My STAK Overview · synced" (1440x1096): 547px main column + 350px rail.
 * Everything on it is read from the saves: the collections and their counts, the move across them over the
 * selected range, the best and worst movers, the allocation and the "Your read" insight.
 *
 * Below 1024 (SPEC R2: a two-column row stacks) the two columns become ONE column of the same pieces, 20 apart, in the
 * SECTION ORDER of the phone frame of this screen (page "mobile updated" 1:3501 "My STAK Overview · corrected", read
 * 2026-10-25: Collections and the grid, Add more, Your read, the performance card, Breakdown and the allocation, the
 * Discover CTA; its visuals are not used). The sections are RENDERED in that order (`useSizeClass`), so the DOM, the
 * reading order and the Tab sequence are the order the eye sees (the R10 ruling of 2026-10-25: never a CSS `order`
 * that leaves the keyboard jumping backwards); the focus order inside each section stays as at 1440, and a control
 * that has keyboard focus when the window crosses 1024 keeps it (FocusKeeper). Every card fills the column (R3); Add
 * more keeps its 350 as a maximum and 24 of air each side, centred like the phone frame centres it. From 1024 up the
 * tree is the approved two-column one, element for element.
 */
function MyStakPage() {
	const { state, range = DEFAULT_RANGE } = Route.useSearch();
	const navigate = Route.useNavigate();
	const c = useCollections();
	const deck = useDeck({ quotes: false }); // progress only: no need to subscribe to the twelve cards' quotes
	// the cards of today's deck still to see, by the rule Home's deck card counts with (home/copy.ts cardsLeft: none once
	// the deck is done, also when a replayed deck ended on cards saved before, which are no decisions)
	const remaining = cardsLeft({ total: deck.total, index: deck.index, decided: deck.decided.size, done: deck.done });
	/** the untouched demo persona shows the frame's own figures (live/showcase.ts) */
	const showcase = useShowcase();
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	// today's figures for the performance card's 1D tab (one object while the quotes hold, so its memo holds)
	const today = useMemo(
		() => ({
			avgChange: c.avgChange,
			best: c.best,
			worst: c.worst,
			count: c.tickers.filter((t) => c.quotes[t]).length,
			live: c.tickers.length > 0 && c.tickers.every((t) => c.quotes[t]?.live === true),
		}),
		[c],
	);
	if (state === "empty" || c.total === 0) return <MyStakEmpty remaining={remaining} />;
	// the untouched showcase keeps the frame's rows, bars and donut (2:4686 / 2:4693 …, D7); everyone else's are drawn
	// from their saves (src/app/mystak/allocation.ts): one row per collection held, bars and arcs by share
	const allocation: AllocationLineRow[] = showcase
		? SHOWCASE.allocation.map((r) => ({ key: r.key, slug: r.slug, name: r.name, count: r.count, share: r.share, fill: r.width / ALLOCATION_TRACK, color: r.color }))
		: allocationFor(c.groups);
	const insight = showcase ? SHOWCASE.insight : readFor(c.groups);
	/**
	 * The collection cards: every collection with a save, in the overview's order, and the seventh "Other" card last
	 * while a save sits outside the six collections (mystak audit item 1; android ui/mystak/MyStakScreen.kt:132-147 +
	 * Collections.kt:140-159, iOS MyStakView.swift:98-103). The showcase holds none, so it keeps the frame's six.
	 */
	const cards = c.all.filter((g) => g.count > 0);
	const rows: CollectionGroup[][] = [];
	for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2));
	const setRange = (next: Range) =>
		navigate({
			search: (prev) => ({ ...prev, range: next === DEFAULT_RANGE ? undefined : next }),
			replace: true,
			resetScroll: false,
			viewTransition: false,
		});

	const collections = (
		<div className="flex w-full flex-col items-start gap-[13px]">
			<SectionHeader title={OVERVIEW.collections} size="sm" />
			{/* "grid" / "gr" clip their contents like Figma's frames; while a card has keyboard focus the clip widens by
			    the ring's reach (2px ring at 2px offset) so the ring shows whole; resting pixels are unchanged */}
			{compact ? (
				<div
					className="grid w-full gap-[16px] overflow-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]"
					style={{ gridTemplateColumns: COMPACT_COLLECTION_COLUMNS }}
				>
					{cards.map((g) => (
						<CollectionCard key={g.slug} group={g} />
					))}
				</div>
			) : (
				<div className="flex w-full flex-col items-start gap-[16px] overflow-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]">
					{rows.map((row) => (
						<div key={row[0]!.slug} className="flex w-full items-start gap-[16px] overflow-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]">
							{row.map((g) => (
								<CollectionCard key={g.slug} group={g} />
							))}
							{/* a lone last card (an odd count: the seventh "Other", one save) keeps its column's width: the empty
							    slot takes the card's own 19 side padding, so both start from the same 38 and share the row
							    equally, as every full row does (265.5 + 16 + 265.5 at 1440) */}
							{row.length === 1 && <div className="min-w-px flex-1 px-[19px]" aria-hidden="true" />}
						</div>
					))}
				</div>
			)}
		</div>
	);
	const performance = (
		<PerformanceCard
			range={range}
			onRange={setRange}
			tickers={c.tickers}
			today={today}
			showcase={showcase}
		/>
	);
	// Below 1024 "Your read" (or the performance card when there is no read) sits 20 under Add more, inside the reach of
	// its glow (Figma's drop shadows, 28 to 77 down), which 2:4667 lets fall on the page between Add more and Breakdown.
	// The phone frame stacks Insight ABOVE the button (a later layer of 1:3503), so the card covers the glow: positioned,
	// it paints after the button's filtered layer, as Figma's layer order does. The glow still falls on the 20 gap.
	const insightCard = insight && (
		<div className="flex w-full flex-col items-start gap-[7px] overflow-clip rounded-[14px] bg-[#181f30] p-[16px] max-lg:relative">
			<div className="flex items-center gap-[8px] overflow-clip">
				<img alt="" src={MS.sparkle} className="size-[24px]" />
				<span className="whitespace-nowrap font-sora text-[14px] font-semibold leading-[18px] text-white">{INSIGHT_HEADING}</span>
			</div>
			<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-white max-lg:whitespace-normal">{insight.title}</p>
			<p className="w-full font-geist text-[13px] leading-[19px] text-[#c8d2e0]">{insight.body}</p>
		</div>
	);
	// "Add more": no prototype wiring; saves are added from the deck (/discover), reached at once like every
	// page-to-page edge of the prototype. The link takes the button's 6 corners, so its keyboard focus ring follows them
	// (the link paints nothing itself). Below 1024 the phone frame centres it between full-width cards (1:3554, inset
	// in its column); Figma's 350 is its widest, and it keeps 24 of air on either side, so it reads as centred at every
	// width instead of nearly lining up with the cards' edges (a 350 button in a 351-374 column)
	const addMore = (
		<Link
			to="/discover"
			viewTransition={false}
			data-mystak-focus="add-more"
			className={cn("block w-full rounded-[6px]", compact && "mx-auto w-[min(350px,100%_-_48px)]")}
		>
			<PrimaryButton as="span">
				{/* 2:4676's text box is 64 wide: the label and the plus sit where Figma centres them */}
				<span className="w-[64px]">{OVERVIEW.addMore}</span>
				<img alt="" src={MS.plus} className="size-[14px]" />
			</PrimaryButton>
		</Link>
	);
	const breakdown = (
		<div className="flex w-full flex-col items-start gap-[14px]">
			<SectionHeader title={OVERVIEW.breakdown} size="md" />
			<div className="flex w-full flex-col items-center gap-[16px] overflow-clip rounded-[16px] bg-[#181f30] p-[18px]">
				<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-white">{OVERVIEW.allocation}</p>
				{showcase ? <img alt="" src={MS.donut} className="size-[150px]" /> : <AllocationRing rows={allocation} />}
				{/* clips like Figma's frame; while a row has keyboard focus the clip widens by the ring's reach, as the grid's does */}
				<div className="flex w-full flex-col items-start gap-[12px] overflow-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]">
					{allocation.map((row) => (
						<AllocationLine
							key={row.key}
							row={row}
							labelWidth={showcase ? SHOWCASE.allocationLabelWidths[row.key] : undefined}
							// a row opens its collection (D1) when that collection holds a save: the frame's "Other · 1 stock" stands
							// for no save of the showcase persona (its page would read "0 stocks"), so that row stays text
							linked={(c.byPath(row.slug)?.count ?? 0) > 0}
						/>
					))}
				</div>
			</div>
		</div>
	);
	// "Discover CTA" / "Start swiping ›": no prototype wiring; the card names the deck (/discover), reached at once;
	// no hover or pressed look (Figma defines none). Its line and its control follow the deck (the hunt's ST-20b, C-06):
	// once today's deck is done the line is the site's one done sentence and the control names and opens the deck's
	// receipt (data.ts deckControl), in Figma's place and style; its label then hugs its own words, not the frame's 82 box
	const swipe = deckControl(remaining, DISCOVER_CTA.cta);
	const cta = (
		<Link
			to={swipe.to}
			viewTransition={false}
			data-mystak-focus="discover-cta"
			className="flex w-full cursor-pointer flex-col items-start gap-[9px] overflow-clip rounded-[16px] bg-[#69b3ca] p-[18px]"
		>
			<span className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.6px] text-[#0e162b]">{DISCOVER_CTA.eyebrow}</span>
			<span className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-[#0e162b]">{DISCOVER_CTA.title}</span>
			<span className="w-full font-geist text-[12px] leading-[17px] text-[#0e162b]">{showcase ? SHOWCASE.discoverBody : DISCOVER_CTA.body(remaining)}</span>
			<span className="flex items-center gap-[4px] overflow-clip whitespace-nowrap pt-[4px] font-geist font-medium">
				<span className={cn("text-[13px] leading-[17px] text-[rgba(10,16,32,0.72)]", !swipe.done && "w-[82px]")}>{swipe.label}</span>
				{/* 2:4739: a decorative glyph inside the link (the label already names the action) */}
				<span aria-hidden="true" className="text-[14px] leading-[18px] text-[#0e162b]">
					›
				</span>
			</span>
		</Link>
	);

	if (compact) {
		return (
			<div className="flex flex-col items-start gap-[38px]" style={{ width: col(932) }}>
				<Header />
				<FocusKeeper key="compact">
					<div className="flex w-full flex-col gap-[20px]">
						{collections}
						{addMore}
						{insightCard}
						{performance}
						{breakdown}
						{cta}
					</div>
				</FocusKeeper>
			</div>
		);
	}
	return (
		<div className="flex flex-col items-start gap-[38px]" style={{ width: col(932), paddingBottom: FRAME_BOTTOM.overview }}>
			<Header />
			<FocusKeeper key="desktop">
				<div className="flex w-full items-start gap-[35px]">
					<div className="flex min-w-0 flex-col items-start gap-[20px]" style={{ flex: "547 1 0" }}>
						<div className="flex w-full flex-col items-end gap-[20px]">
							{collections}
							{performance}
						</div>
						{insightCard}
					</div>

					<div className="mt-[33px] flex min-w-0 flex-col items-end gap-[31px]" style={{ flex: "350 1 0" }}>
						{addMore}
						{breakdown}
						{cta}
					</div>
				</div>
			</FocusKeeper>
		</div>
	);
}

function SectionHeader({ title, size }: { title: string; size: "sm" | "md" }) {
	return (
		<div className="flex w-full items-center justify-between overflow-clip">
			<h2 className={cn("whitespace-nowrap font-sora font-semibold text-[#d3d3dd]", size === "sm" ? "text-[14.584px] leading-[18px]" : "text-[16px] leading-[20px]")}>
				{title}
			</h2>
			<div className={cn("w-0", size === "sm" ? "h-[18.23px]" : "h-[20px]")} />
		</div>
	);
}

/**
 * "cc" (2:4748 …): the phone prototype opens the collection from this card at once (1:3509 -> 1:3680, instant). The
 * entry it pushes is marked as opened from here (FROM_OVERVIEW), so the collection's Back names the overview (D2).
 * No hover or pressed look: Figma defines none for the card.
 */
function CollectionCard({ group }: { group: CollectionGroup }) {
	const icon = COLLECTION_ICONS[group.slug];
	return (
		<Link
			to="/my-stak/$collection"
			params={{ collection: group.slug }}
			state={FROM_OVERVIEW}
			viewTransition={false}
			data-mystak-focus={`collection:${group.slug}`}
			className="flex min-w-px flex-1 cursor-pointer items-center gap-[16px] overflow-clip rounded-[12.467px] bg-[#181f30] p-[19px]"
		>
			<img alt="" src={icon.icon} className="shrink-0 object-cover" style={{ width: icon.iconSize, height: icon.iconSize }} />
			<span className="flex min-w-px flex-1 flex-col items-start gap-[3px] overflow-clip whitespace-nowrap">
				<span className="font-sora text-[14.026px] font-semibold leading-[18px] text-white">{group.name}</span>
				<span className="font-geist text-[10.909px] leading-[14px] text-[#819abb]">{group.countLabel}</span>
			</span>
			{/* 2:4753 …: a decorative glyph inside the link (the name and the count are the card's accessible name) */}
			<span aria-hidden="true" className="w-[9px] whitespace-nowrap font-geist text-[24.823px] leading-[32px] text-[#5c6b85]">
				›
			</span>
		</Link>
	);
}

/**
 * "sector" (2:4693 …): the bar is the row's share of the 314px track (2:4699), so it keeps its proportion when the rail
 * widens; Figma's own bars are exactly their shares (132 / 66 / 63 / 38 / 16 of 314), and every live row's is its
 * share of the saves (android ui/mystak/MyStakScreen.kt:490 `314 × share`, iOS MyStakView.swift:384).
 *
 * The row stands for its collection, so it opens it (`linked`; the hunt's I-08, coordinator ruling N27v, D1): one link
 * around the name, the share and the bar, to the collection's page, marked as opened from the overview like a collection
 * card's entry (FROM_OVERVIEW: the collection's Back steps back here). The phones draw these rows as plain text (android
 * ui/mystak/MyStakScreen.kt:509 SectorBar: no clickable); D1 makes them links on the web. Nothing changes at rest: the
 * link is the row's own box (no fill, no radius, the same flex column) with the pointer and the canvas's keyboard focus
 * ring; no hover or pressed look (Figma defines none).
 */
function AllocationLine({ row, labelWidth, linked }: { row: AllocationLineRow; labelWidth?: number; linked: boolean }) {
	const dot = ALLOCATION_DOTS[row.slug];
	const line = (
		<>
			<div className="flex w-full items-center justify-between overflow-clip max-lg:flex-wrap max-lg:gap-x-[12px] max-lg:gap-y-[4px]">
				<div className="flex items-center gap-[8px] overflow-clip">
					{dot ? <img alt="" src={dot} className="size-[9px]" /> : <span className="size-[9px] rounded-full" style={{ backgroundColor: row.color }} />}
					<span className="whitespace-nowrap font-geist text-[13px] leading-[17px] text-white">{row.name}</span>
				</div>
				<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]" style={labelWidth ? { width: labelWidth } : undefined}>
					{row.share}% · {countLabel(row.count)}
				</span>
			</div>
			<div className="relative h-[7px] w-full overflow-clip rounded-[4px] bg-[#2a3346]">
				<div
					className="absolute left-0 top-0 h-[7px] rounded-[4px] transition-[width] duration-300"
					style={{ width: `${row.fill * 100}%`, backgroundColor: row.color }}
				/>
			</div>
		</>
	);
	if (!linked) return <div className="flex w-full flex-col items-start gap-[6px] overflow-clip">{line}</div>;
	return (
		<Link
			to="/my-stak/$collection"
			params={{ collection: row.slug }}
			state={FROM_OVERVIEW}
			viewTransition={false}
			data-mystak-focus={`allocation:${row.slug}`}
			className="flex w-full cursor-pointer flex-col items-start gap-[6px] overflow-clip"
		>
			{line}
		</Link>
	);
}

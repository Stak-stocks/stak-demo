import { Link } from "@tanstack/react-router";
import { type CSSProperties, type FocusEvent, type ReactNode, type RefCallback, useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { BackCrumb, CRUMB_SEPARATOR } from "@/app/discover/BackCrumb";
import { GhostButton } from "@/app/discover/Button";
import { PrimaryButton } from "@/app/ui/Button";
import { Sheet } from "@/app/ui/Sheet";
import { colPlus, useSizeClass } from "@/app/FitCanvas";
import { cn } from "@/lib/utils";
import { S } from "./assets";
import { COMPARE_FOLDED, COMPARE_OPEN, CompareDisclosure } from "./CompareCard";
import type { AnalystView, StockArticle, StockDetailData } from "./data";
import type { CrumbParent } from "./origin";
import { PerformanceChart } from "./PerformanceChart";
import { useKeptScrollLeft, useReflowFocus } from "./reflow";
import { StatGrid } from "./StatGrid";
import { signText } from "./tone";
import { type Explainer, isExplainerCard } from "./signal";
import { MORPH } from "./transitions";

/**
 * How the page is painted:
 * - `base`: cards and tiles #181f30, as in every frame without a ticket, and under the sheet of 2:5247;
 * - `dim`: under the ticket of 2:4007 / 2:4161 / 2:5402, cards #0e1a36, tiles, articles and tracks #12203e.
 */
export type StockTone = "base" | "dim";

export type StockDetailProps = {
	stock: StockDetailData;
	saved: boolean;
	open: boolean;
	tone: StockTone;
	from: "discover" | "my-stak";
	/**
	 * The app section the page was opened from (D2, discover-stock #11), named by the crumb of the Discover entry ("Home  /
	 * NVDA" from Home's notifications); undefined: the entry's natural parent, Discover (Figma's 2:3572).
	 */
	origin?: CrumbParent | null;
	onBack: () => void;
	onToggleSaved: () => void;
	onToggleOpen: () => void;
	onPracticeBuy: () => void;
	/**
	 * Compare and learn's open state when the page's route holds it (kept per history entry, src/app/stocks/analystOpen.ts
	 * useCompareOpen: Back draws the table as it was left, as the phones' rememberSaveable does); without it the page keeps
	 * its own, per stock.
	 */
	compare?: { open: boolean; onToggle: () => void };
};

type Colors = { card: string; inner: string; track: string };

/**
 * The risk track is #293144 on a Discover entry (2:3457 … 2:3891) and the card's own #181f30 on a saved My STAK
 * entry (2:4970 / 2:5130 / 2:5247), where only its marker shows; under the ticket it is #12203e.
 */
const colorsFor = (tone: StockTone, myStakSaved: boolean): Colors =>
	tone === "dim"
		? { card: "#0e1a36", inner: "#12203e", track: "#12203e" }
		: { card: "#181f30", inner: "#181f30", track: myStakSaved ? "#181f30" : "#293144" };

/** Figma's widths for the news tone chips (label box = text width rounded, plus 8px a side). */
const TONE_WIDTH: Record<string, number> = { Neutral: 51, Positive: 54, Negative: 59 };

/** A px offset authored on a track of the given width, kept at the same fraction when the track stretches. */
const pct = (px: number, of: number) => `${((px / of) * 100).toFixed(4)}%`;

/** A text in Figma's auto-width box: its glyph run rounded up to a whole pixel, left-aligned (as the ticket's labels). */
const FIT = "w-[calc-size(max-content,round(up,size,1px))] text-left";

/**
 * How far the centre of the "Avg" column stays from the two ends of the target track, in px: the widest Low / High
 * figure the cards print ("$1,050": 41), 8 of air, and half of the widest Avg ("$1,020": 21), so the three columns never
 * touch (N30.8e).
 */
export const AVG_KEEP = 70;
/** The left of the "Avg" column's centre for an average `at` (0 to 1) along the track, kept clear of Low and High. */
export const avgLeft = (at: number) => `clamp(${AVG_KEEP}px, ${(Math.min(1, Math.max(0, at)) * 100).toFixed(4)}%, calc(100% - ${AVG_KEEP}px))`;

/** Fixed 326 text boxes of the frames (news lines, benchmarks): the column's width below 1024, never wider than Figma's (R3). */
const BOX_326 = "max-lg:w-full max-lg:max-w-[326px]";

/**
 * Save / Unsave is one control that changes its look: unsaved it is the canon PrimaryButton (Save, above Practice buy),
 * saved a GhostButton (Unsave, below it). The CTA's buttons are keyed by their action, so React never turns the focused
 * Save into Practice buy (a second Enter then opened the ticket); and since no element can be both components, the
 * toggle hands its focus to its successor: the old button's ref cleanup runs while it is still in the page and focused
 * (React 19 detaches refs before it removes the element) and notes whether it showed the keyboard ring; the new button's
 * ref, attached in the same commit, takes the focus without scrolling (a scroll there would move every card of the
 * morph). The EXAMPLE page's toggle keeps one element.
 */
let toggleFocus: { ring: boolean } | null = null;
const keepToggleFocus: RefCallback<HTMLButtonElement> = (button) => {
	if (!button) return;
	const now = document.activeElement;
	// only into a page whose focus left with the old toggle (never over a control focused meanwhile)
	if (toggleFocus && (!now || now === document.body || now === document.documentElement)) {
		button.focus({ preventScroll: true, focusVisible: toggleFocus.ring } as FocusOptions);
		if (toggleFocus.ring) revealWhenSettled(button);
	}
	toggleFocus = null;
	return () => {
		if (document.activeElement !== button) return;
		toggleFocus = { ring: button.matches(":focus-visible") };
		// its successor mounts in this same commit; once that is over, nothing may take this focus
		queueMicrotask(() => {
			toggleFocus = null;
		});
	};
};

/** What a scrolled-to control keeps clear around it, in layout px: the focus ring (2px at a 2px offset) and 2px to spare. */
const RING_ROOM = 6;

/**
 * The toggle moves 62px when it changes its look (Save above Practice buy, Unsave below it), so the focus it hands on can
 * land outside the window: Save near the window's bottom puts Unsave under it, Unsave near the top puts Save over it.
 * Once the page has settled (the Save morph over, or at once where none runs) a keyboard user's toggle is scrolled the
 * least distance that shows it whole with its ring, below the phone top bar (the html's scroll-padding-top), as the next
 * Tab would. The morph itself is untouched, and a mouse click (no ring) leaves the page where the person has it.
 */
function revealWhenSettled(button: HTMLElement) {
	const html = document.documentElement;
	const morphing = () => {
		try {
			return html.matches(":active-view-transition");
		} catch {
			return false;
		}
	};
	const reveal = () => {
		if (morphing()) {
			requestAnimationFrame(reveal);
			return;
		}
		if (document.activeElement !== button) return;
		// the button's box is in the zoomed canvas's device px, as are the window and its scroll
		const css = getComputedStyle(html);
		const room = RING_ROOM * (Number.parseFloat(css.getPropertyValue("--stak-zoom")) || 1);
		const top = (Number.parseFloat(css.scrollPaddingTop) || 0) + room;
		const bottom = window.innerHeight - room;
		const r = button.getBoundingClientRect();
		const dy = r.bottom > bottom ? Math.min(r.bottom - bottom, r.top - top) : r.top < top ? r.top - top : 0;
		if (dy) window.scrollBy({ top: dy, behavior: "instant" });
	};
	requestAnimationFrame(reveal);
}

/** The eight cards of the page, built once and placed by `StockDetail` in the tree the window's size asks for. */
type Cards = Record<"chart" | "intro" | "risk" | "numbers" | "news" | "cta" | "analyst" | "compare", ReactNode>;

/**
 * Stock detail (Figma "Desktop · Stock detail · …", 1440 × 1200). Two columns, 744 + 40 + 360.
 * Entered from Discover the back block floats at (1, −44) and the columns start 72px into the
 * content box; a SAVED stock entered from My STAK flows top-down instead (back, 24px gap, columns:
 * 2:4970 / 2:5130 / 2:5247 put the cards at y 204), while the unsaved My STAK ticket frame 2:5402
 * keeps the floating back block (cards at y 160) like every Discover frame.
 *
 * Below 1024 (SPEC R2 / R3 / R6; CORE-API: a 744 : 360 row stacks) the page is as tall as its content (the shell follows
 * the window, CORE-API section 4) and the two columns become ONE column of the eight cards, the column's width, 14 apart,
 * in the SECTION ORDER of the phone frames of these screens (page "mobile updated" 1:2496 / 1:2685 / 1:3846 / 1:4035,
 * their "Modules" group read 2026-10-25: Price + chart, Since you saved, Risk fit, Numbers that matter, Analyst view,
 * News signal, Compare and learn, then the CTA last: Save / Practice buy with the cash line). The cards are RENDERED in
 * that order (`useSizeClass`), so the DOM, the reading order and the Tab sequence are the order the eye sees (the R10
 * ruling of 2026-10-25: never a CSS `order` that leaves the keyboard jumping backwards); the focus order inside each card
 * stays as at 1440. From 1024 up the tree is the approved two-column one, card for card.
 *
 * The one column below 1024 IS the content column of the two-column tree (the same element, the rail column is simply
 * not rendered there), and every card carries a key: when the window crosses 1024 React keeps the content column's cards
 * mounted and only inserts or removes the rail's three (keyed siblings of one parent are matched by key, not rebuilt), so
 * what the person did on the page survives the reflow (R10: a chart range they chose, a Benchmarks line they revealed,
 * the focus they hold in those cards; the analyst view's open state is the route's). The rail cards (CTA, Analyst view,
 * Compare) hold no state of their own, but React rebuilds them in the other column: the control a keyboard user is on
 * there (Practice buy, Save / Unsave, the Analyst view toggle) gets the focus back in its new place (`useReflowFocus`).
 * The headlines row keeps its sideways offset (`useKeptScrollLeft`): for one frame the window's new media queries meet
 * the canvas's previous `--stak-vw`, the row is briefly wider than its content allows and Chrome clamps the offset
 * (measured 120 -> 25 at 1100 -> 800, -> 0 at 1100 -> 390); the row puts the person's offset back once it has its size.
 *
 * On a tablet the Discover entry keeps its floating back block at y 44 (the 88 top band is there as on the desktop) over
 * the column in flow at y 160; on a phone the back block goes into flow too (R6: the phone top bar covers the desktop's
 * top band), 24 above the cards as the My STAK entry flows it.
 */
export function StockDetail(p: StockDetailProps) {
	const c = colorsFor(p.tone, p.from === "my-stak" && p.saved);
	// the crumb names the page the stock was opened from (D2, discover-stock #11): My STAK for the My STAK entry (2:4970
	// "My STAK  /  AAPL"), the app section the person came from for the Discover entry, Discover when there is none (2:3572)
	const parent: CrumbParent = p.from === "my-stak" ? MY_STAK : (p.origin ?? DISCOVER);
	const crumb = `${parent.label}${CRUMB_SEPARATOR}${p.stock.symbol}`;
	// the analyst card's disclosure: both toggle buttons announce their state and name the panel they unfold
	const panelId = useId();
	const compareId = useId();
	// Compare and learn's open state (D8): the route's where it holds it (per history entry, `p.compare`), else the page's
	// own; either survives the reflow at 1024 that rebuilds the rail cards, and belongs to the stock it was opened on
	// (another symbol on the same route starts folded)
	const [compareFor, setCompareFor] = useState<string | null>(null);
	const compare = p.compare
		? { open: p.compare.open, toggle: p.compare.onToggle, id: compareId }
		: { open: compareFor === p.stock.symbol, toggle: () => setCompareFor((s) => (s === p.stock.symbol ? null : p.stock.symbol)), id: compareId };
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	const newsRow = useKeptScrollLeft<HTMLDivElement>();
	const ctaNoteId = useId();
	const k = cards(p, c, panelId, newsRow, compare, ctaNoteId);
	// the content column's cards: the approved five from 1024 up, all eight in the phone frames' order below
	const main = compact ? [k.chart, k.intro, k.risk, k.numbers, k.analyst, k.news, k.compare, k.cta] : [k.chart, k.intro, k.risk, k.numbers, k.news];
	const columns = (
		<div className="flex items-start justify-center gap-[40px]" style={{ width: colPlus(10) }}>
			<div className="flex min-w-0 flex-col items-start gap-[14px] overflow-clip" style={{ flex: "744 1 0" }}>
				{main}
			</div>
			{!compact && (
				<div className="flex min-w-0 flex-col items-start gap-[14px] overflow-clip" style={{ flex: "360 1 0" }}>
					{k.cta}
					{k.analyst}
					{k.compare}
				</div>
			)}
		</div>
	);
	if (p.from === "my-stak" && p.saved) {
		return (
			<div className="flex min-h-[1112px] flex-col items-start gap-[24px] max-lg:min-h-0">
				<BackCrumb crumb={crumb} onBack={p.onBack} className={MORPH.back} />
				{columns}
			</div>
		);
	}
	return (
		<div className="relative min-h-[1112px] max-lg:min-h-0 max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-[24px]">
			<BackCrumb crumb={crumb} onBack={p.onBack} className={cn("absolute left-[1px] top-[-44px] max-sm:static", MORPH.back)} />
			<div className="absolute left-0 top-[72px] max-lg:static max-lg:pt-[72px] max-sm:pt-0">{columns}</div>
		</div>
	);
}

const DISCOVER: CrumbParent = { label: "Discover", to: "/discover" };
const MY_STAK: CrumbParent = { label: "My STAK", to: "/my-stak" };

/**
 * A News signal card opens what it stands for (D1, discover-stock #4): one of the site's own stories opens its article at
 * once (the News listing's cards open theirs the same way, with no transition), a live headline its source page in a new
 * tab, the company's explainer card (N39c, signal.ts) its sheet. The card keeps Figma's box (2:3526); a plain frame in
 * Figma, so no hover or pressed look, only the cursor and the keyboard ring, drawn inside the card: the scrolling row
 * cuts a ring outside it (it cut the canvas's ring, 2px at a 2px offset, along the top and the bottom of every card: the
 * canvas rule is unlayered and beat the plain utility, so the inside offset is marked important, as the Profile rows'
 * ROW_FOCUS is). The explainer card is a real button that says it opens a dialog; its box is the links' own, its text
 * left-aligned as theirs.
 */
function ArticleCard({ a, className, style, children, onExplain }: { a: StockArticle; className: string; style: CSSProperties; children: ReactNode; onExplain: (e: Explainer) => void }) {
	const ring = "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px]! focus-visible:outline-[#69b3ca]";
	if (isExplainerCard(a))
		return (
			<button type="button" aria-haspopup="dialog" onClick={() => onExplain(a.explainer)} className={cn(className, ring, "text-left")} style={style}>
				{children}
			</button>
		);
	if (a.story)
		return (
			<Link to="/news/$id" params={{ id: a.story }} viewTransition={false} className={cn(className, ring)} style={style}>
				{children}
			</Link>
		);
	if (a.url)
		return (
			<a href={a.url} target="_blank" rel="noopener noreferrer" className={cn(className, ring)} style={style}>
				{children}
				<span className="sr-only"> (opens in a new tab)</span>
			</a>
		);
	return (
		<div className={className} style={style}>
			{children}
		</div>
	);
}

/**
 * A headline card that takes keyboard focus comes fully into view inside its row (the core pass's finding, coordinator
 * note N11b). The browser's own focus scroll only brings in a card that is wholly out of view and leaves one that is
 * partly in view where it is, cut at the row's edge with its ring: measured on /stocks/AAPL with Tab, the second and the
 * fourth card 80 and 140 px past the edge at 390 x 844, the fourth 172 px at 820 x 1180 and 128 px at 1440 x 1024.
 * "nearest" moves the row only as far as needed, onto the row's own 16 px inset (its scroll padding), where the first
 * card rests. Keyboard focus only (:focus-visible): a card the pointer presses must not move under it between press and
 * release, and a row that does not scroll is left alone.
 */
function revealCard(e: FocusEvent<HTMLDivElement>) {
	const row = e.currentTarget;
	// a story's link, a live headline's link, or the explainer's button
	const card = e.target instanceof Element ? e.target.closest("a, button") : null;
	if (!card || !row.contains(card) || row.scrollWidth <= row.clientWidth + 1 || !card.matches(":focus-visible")) return;
	card.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/**
 * The News signal's article row ("Frame 3" of 2:3519): the 856-wide row runs past the card, which cuts the fourth article
 * at its edge. The row scrolls sideways (the phone frame 1:3846 marks it HORIZONTAL); it spans the card edge to edge with
 * the card's 16px inset, so at rest it shows exactly what the frames show.
 *
 * The four cards keep one bottom edge (Figma: four 205 x 102 cards, bottoms level at y 1004). They hug their headlines,
 * so where a wider card lets one headline wrap to fewer lines than its neighbour's (measured at 2560: two one-line and
 * two two-line headlines) the row stretches every card to the tallest; at 1440 all four wrap to three lines and nothing
 * changes. Its sideways offset survives the reflow at 1024 (`rowRef`: useKeptScrollLeft, see StockDetail).
 *
 * Every catalog company has cards (ruling N39c, signal.ts: its stories, then its explainer, four in all); the row is
 * still rendered only for a page that HAS articles (the independent review r2b, medium 1: the row was drawn with no
 * cards in it and was a tab stop whenever no card opened anything, which includes no cards at all: an invisible stop on a
 * 744 x 0 box, and the empty row's 12 px gap left the card ending 26 px under its last line instead of 14).
 *
 * Keyboard: every card that opens something is the row's tab stop (D1), and a card that takes keyboard focus comes fully
 * into view on the row's 16px inset (revealCard, the row's scroll padding). The row is a tab stop of its own, with the
 * house focus ring (2px #69b3ca) drawn inside where the card's clip cannot cut it, only when it must be: its cards open
 * nothing AND it scrolls sideways, so the arrow keys are the one way to bring the cut cards in. A row that fits, or one
 * whose cards take the focus themselves, adds no stop.
 *
 * The explainer card's sheet is the row's own state, drawn beside the row (not inside it: the row's focus handler and its
 * sideways scroll stay the cards' alone), so it survives the reflow at 1024 with the content column's cards.
 */
function HeadlinesRow({ symbol, articles, inner, rowRef }: { symbol: string; articles: readonly StockArticle[]; inner: string; rowRef: RefCallback<HTMLDivElement> }) {
	const linked = articles.some((a) => a.story || a.url || isExplainerCard(a));
	const row = useRef<HTMLDivElement | null>(null);
	const [scrolls, setScrolls] = useState(false);
	const [explainer, setExplainer] = useState<Explainer | null>(null);
	const attach = useCallback(
		(el: HTMLDivElement | null) => {
			row.current = el;
			const kept = rowRef(el);
			if (!el) return;
			// the row's own width follows the card (the window, the 1024 reflow)
			const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => setScrolls(scrollsSideways(el)));
			observer?.observe(el);
			return () => {
				row.current = null;
				observer?.disconnect();
				if (typeof kept === "function") kept();
			};
		},
		[rowRef],
	);
	// what the row holds changes without its box changing (live headlines arriving): measured again with the cards
	useLayoutEffect(() => {
		if (row.current) setScrolls(scrollsSideways(row.current));
	}, [articles]);
	return (
		<>
			<div
				ref={attach}
				// the router puts the row's sideways place back on a history step by this name, not by its place in the DOM, so
				// it never carries over to another page's element (both phones keep it: android StockDetailScreen.kt:481)
				data-scroll-restoration-id="stock-news-row"
				role="region"
				aria-label={`${symbol} headlines`}
				tabIndex={!linked && scrolls ? 0 : undefined}
				onFocus={revealCard}
				className="-mx-[16px] flex w-[calc(100%+32px)] scroll-px-[16px] items-stretch gap-[12px] overflow-x-auto overscroll-x-contain px-[16px] [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#69b3ca] [&::-webkit-scrollbar]:hidden"
			>
				{articles.map((a) => {
					// a button holds phrasing content only: the explainer card draws the same boxes as spans
					const button = isExplainerCard(a);
					const Box = button ? "span" : "div";
					const Text = button ? "span" : "p";
					return (
						// below 1024 each card keeps Figma's own 205 (the row scrolls sideways, R5) instead of a share of a narrow row
						<ArticleCard
							key={`${a.source}|${a.text}`}
							a={a}
							onExplain={setExplainer}
							className="flex w-[28.792%] shrink-0 flex-col items-start gap-[8px] overflow-clip rounded-[12px] p-[12px] max-lg:w-[205px]"
							style={{ background: inner }}
						>
							<Box className="flex h-[22px] w-full items-center justify-between overflow-clip">
								<Text className="block whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">{a.source}</Text>
								{/* the label starts at the chip's 8px padding, as Figma's hug chip places its text box */}
								<Box className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[8px] py-[3px]" style={{ width: TONE_WIDTH[a.tone] }}>
									<Text className="block whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[#819abb]">{a.tone}</Text>
								</Box>
							</Box>
							{/* 173 of the 181 inner width, growing downwards like the frames' text box */}
							<Text className="block w-[calc(100%-8px)] font-geist text-[12px] font-normal leading-[16px] text-[#f2f6fc]">{a.text}</Text>
						</ArticleCard>
					);
				})}
			</div>
			{explainer && <ExplainerSheet explainer={explainer} onClose={() => setExplainer(null)} />}
		</>
	);
}

/** The sheet's kicker: the site's own label (N39c: never a real outlet's name), the company it explains. */
export const explainerKicker = (symbol: string) => `STAK EXPLAINER · ${symbol}`;
/** The sheet's footnote, the Compare card's own (1:2835). */
export const EXPLAINER_NOTE = "Cultural context only, not financial advice.";

/**
 * The company's explainer (ruling N39c): the catalog's culturalContext, its title and sections verbatim, in the app's sheet
 * (src/app/ui/Sheet.tsx: Figma's 480-wide sheet, 2:1421 et al., a native modal dialog over the scrim: Escape, the back
 * gesture and a press on the scrim close it, and the focus goes back to the card that opened it). The phones have no
 * such sheet: a web state drawn in the frames' sheet style, the type of the sheets' titles (Sora 18 / 23 white) and body
 * copy (Geist 12 / 18 #c8d2e0, as 2:1699's description), the cards' label style for its kicker (Geist Medium 10, 0.8
 * tracking, #819abb) and the canon ghost button to close it. A screen reader hears the title as the dialog's name; the
 * focus starts ON the title (not the Close button at the end), so a long explainer opens at its top, also where the
 * panel scrolls inside itself: below 1024 and in a shallow window (the Sheet's own rules), and in a desktop window too
 * short for it (`lg:max-h`, the window's height in the canvas's px, FitCanvas viewportHeight).
 */
function ExplainerSheet({ explainer, onClose }: { explainer: Explainer; onClose: () => void }) {
	const titleId = useId();
	return (
		<Sheet label={explainer.title} labelledBy={titleId} onClose={onClose} className="lg:max-h-[calc(100vh/var(--stak-zoom,1)_-_32px)] lg:overflow-y-auto lg:overscroll-contain">
			<div className="flex w-full flex-col items-start gap-[6px]">
				<p className="font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{explainerKicker(explainer.symbol)}</p>
				<h2 id={titleId} tabIndex={-1} data-autofocus="" className="w-full font-sora text-[18px] font-semibold leading-[23px] text-white outline-none">
					{explainer.title}
				</h2>
			</div>
			{explainer.sections.map((s) => (
				<section key={s.heading} className="flex w-full flex-col items-start gap-[4px]">
					<h3 className="w-full font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{s.heading}</h3>
					<p className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{s.content}</p>
				</section>
			))}
			<p className="font-geist text-[10px] font-medium leading-[13px] text-[#819abb]">{EXPLAINER_NOTE}</p>
			<GhostButton onClick={onClose}>Close</GhostButton>
		</Sheet>
	);
}

/** A row whose content is wider than its box: it scrolls sideways (a pixel of rounding is not a scroll). */
const scrollsSideways = (row: HTMLElement) => row.scrollWidth > row.clientWidth + 1;

/** A card; `reflow` names a rail card that the 1024 reflow rebuilds in the other column, which keeps a held focus. */
function Card({ className, style, children, c, reflow }: { className?: string; style?: CSSProperties; children: ReactNode; c: Colors; reflow?: string }) {
	const ref = useReflowFocus<HTMLDivElement>(reflow);
	return (
		<div ref={ref} className={cn("overflow-clip rounded-[16px]", className)} style={{ background: c.card, ...style }}>
			{children}
		</div>
	);
}

/** A RECENT ACTIONS row of the open Analyst card (2:3672): 38 tall, r10, the inner fill; it wraps in a narrow column. */
const ANALYST_ROW =
	"flex w-full items-center justify-between overflow-clip whitespace-nowrap rounded-[10px] px-[12px] py-[9px] font-geist font-medium h-[38px] max-lg:h-auto max-lg:min-h-[38px] max-lg:flex-wrap max-lg:gap-x-[12px] max-lg:gap-y-[8px] max-lg:whitespace-normal";

/**
 * The open Analyst card of an index fund (coordinator ruling N43a, AnalystView.fund, live.ts fundAnalyst), in the card's
 * own styles: the caption in the style of the no-target caption, the label in the style of RECENT ACTIONS, then one row
 * per company in the style of a RECENT ACTIONS row (the company's name where a firm's stands, its consensus line in the
 * label grey where a rating stands, as an unpriced card's folded line prints the same sentence). Each row is a real link
 * to the company's own page (the canvas's keyboard ring), named by the company and its consensus. The EXAMPLE layout
 * (ExampleDetail.tsx) draws the same.
 */
export function FundCompanies({ fund, inner }: { fund: NonNullable<AnalystView["fund"]>; inner: string }) {
	return (
		<>
			<p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{fund.caption}</p>
			{fund.companies.length > 0 && (
				<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{fund.label}</p>
			)}
			{fund.companies.map((co) => (
				<Link
					key={co.symbol}
					to="/stocks/$symbol"
					params={{ symbol: co.symbol }}
					viewTransition={false}
					aria-label={`${co.name}: ${co.consensus}`}
					className={cn(ANALYST_ROW, "cursor-pointer")}
					style={{ background: inner }}
				>
					<span className="text-[12px] leading-[16px] text-[#f2f6fc]">{co.name}</span>
					<span className="text-[11px] leading-[14px] text-[#819abb]">{co.consensus}</span>
				</Link>
			))}
		</>
	);
}

/** Compare and learn's disclosure: open or folded, its toggle, and the id of the panel it controls. */
type CompareState = { open: boolean; toggle: () => void; id: string };

/**
 * The cards of both columns, each exactly as its frame draws it, in no particular order: `StockDetail` places them. Each
 * carries a key (the chart's names the stock too, so another symbol starts on its own range): the content column keeps
 * its cards across the reflow at 1024 by those keys; the rail's three carry a `reflow` name (the focus they hold).
 */
function cards(
	{ stock, saved, open, onToggleSaved, onToggleOpen, onPracticeBuy }: StockDetailProps,
	c: Colors,
	panelId: string,
	newsRow: RefCallback<HTMLDivElement>,
	compare: CompareState,
	ctaNoteId: string,
): Cards {
	const an = stock.analyst;
	return {
		/* Performance chart (the range buttons switch the line) */
		chart: <PerformanceChart key={`chart:${stock.symbol}`} stock={stock} card={c.card} selected={c.inner} />,

		/* Save intro (its one-line body wraps in the narrower compact card: R9, nothing cut) */
		intro: saved ? (
			<Card key="intro" c={c} className={cn("flex w-full flex-col items-start gap-[10px] px-[16px] py-[12px]", MORPH.intro)}>
				<div className="flex items-center gap-[8px] overflow-clip">
					<img alt="" src={S.bookmarkSaved} className="size-[12px]" />
					<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
						{stock.saveIntro.saved}
					</p>
					{/* the move since the save, coloured by its sign (N20c: Figma draws the gain, "+4.6%" 2:3483; a loss is the header's red) */}
					<p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", signText(stock.saveIntro.delta))}>{stock.saveIntro.delta}</p>
				</div>
				<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:whitespace-normal">{stock.saveIntro.body}</p>
			</Card>
		) : (
			<Card key="intro" c={c} className={cn("flex w-full flex-col items-start px-[16px] py-[12px]", MORPH.intro)}>
				<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
					<div className="flex items-center gap-[8px] overflow-clip">
						<img alt="" src={S.bookmark} className="size-[12px]" />
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
							{stock.saveIntro.unsaved}
						</p>
					</div>
				</div>
				<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:whitespace-normal">{stock.saveIntro.body}</p>
			</Card>
		),

		/* Risk fit */
		risk: (
			<Card key="risk" c={c} className={cn("flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]", MORPH.risk)}>
				<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
					<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.risk.title}</p>
					<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(93,168,191,0.12)] px-[10px] py-[4px]">
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#a6e4f7]" style={{ minWidth: stock.risk.badgeW }}>
							{stock.risk.badge}
						</p>
					</div>
				</div>
				<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: c.track }}>
					<img alt="" src={S.marker} className="absolute top-[-3px] size-[14px]" style={{ left: pct(stock.risk.markerLeft, 712) }} />
				</div>
				<div className="flex h-[14px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">
					<p>{stock.risk.low}</p>
					<p>{stock.risk.high}</p>
				</div>
				<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:whitespace-normal">{stock.risk.note}</p>
			</Card>
		),

		/* Numbers that matter */
		numbers: (
			<Card key="numbers" c={c} className={cn("flex w-full flex-col items-start gap-[12px] whitespace-nowrap px-[16px] py-[14px]", MORPH.numbers)}>
				<p className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.numbers.title}</p>
				<StatGrid stats={stock.numbers.stats} footer={stock.numbers.footer} benchmarks={stock.numbers.benchmarks} inner={c.inner} />
			</Card>
		),

		/* News signal */
		news: (
			<Card key="news" c={c} className={cn("flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]", MORPH.news)}>
				<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.news.title}</p>
				{/* the day's move; a company with no quote has none, and its line says there is no price (N39c, signal.ts
				    NO_PRICE_MOVE: no figure, so the label grey). A move-less card (none today) leaves the line out */}
				{stock.news.move && (
					<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", signText(stock.news.move))}>{stock.news.move}</p>
				)}
				{stock.news.lines.map((l) => (
					// a fixed 326 box that grows downwards (Figma: width FIXED, auto height), as the frames set it
					<p key={l} className={cn("w-[45.787%] font-geist text-[11px] leading-[14px] text-[#819abb]", BOX_326)}>
						{l}
					</p>
				))}
				{/* the article row: every company's stories and its explainer (N39c, signal.ts); a page without articles (none
				    today) ends on its lines, 14 above the card's edge (HeadlinesRow) */}
				{stock.news.articles.length > 0 && <HeadlinesRow symbol={stock.symbol} articles={stock.news.articles} inner={c.inner} rowRef={newsRow} />}
			</Card>
		),

		/* CTA card (the last card of the stacked page, as the phone frames place Save / Practice buy) */
		/* A company without a price cannot be bought (N27n, N30.8c): Practice buy is unavailable and the card's caption says
		   why (orders.ts refusalLine), in place of the cash line; the button names that caption as its description */
		cta: (
			<Card key="cta" reflow="cta" c={c} className={cn("flex w-full flex-col items-start gap-[10px] p-[16px]", MORPH.cta)}>
				<div className="flex w-full flex-col items-start gap-[10px]">
					{saved ? (
						<>
							<PrimaryButton key="buy" onClick={onPracticeBuy} disabled={!!stock.cta.refusal} aria-describedby={stock.cta.refusal ? ctaNoteId : undefined}>
								{stock.cta.buy}
							</PrimaryButton>
							<GhostButton key="save" ref={keepToggleFocus} onClick={onToggleSaved}>
								{stock.cta.unsave}
							</GhostButton>
						</>
					) : (
						<>
							<PrimaryButton key="save" ref={keepToggleFocus} onClick={onToggleSaved}>
								{stock.cta.save}
							</PrimaryButton>
							<GhostButton key="buy" onClick={onPracticeBuy} disabled={!!stock.cta.refusal} aria-describedby={stock.cta.refusal ? ctaNoteId : undefined}>
								{stock.cta.buy}
							</GhostButton>
						</>
					)}
				</div>
				{stock.cta.refusal ? (
					<p id={ctaNoteId} className="whitespace-normal font-geist text-[11px] leading-[14px] text-[#819abb]">
						{stock.cta.refusal}
					</p>
				) : (
					<p className="whitespace-pre font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:whitespace-pre-wrap">{stock.cta.cash}</p>
				)}
			</Card>
		),

		/*
		 * Analyst view (between Numbers that matter and News signal in the stacked page). A disclosure for every covered stock
		 * (D8), and every catalog company is covered (N39a: the demo coverage of live.ts demoCoverage / demoCoverage.ts while
		 * the API is down; "No analyst coverage yet" is left for a live quote the API has no coverage for): folded, the whole
		 * card toggles (the phones' card does, android StockDetailScreen.kt:680-688); open, its title row does, and the caret
		 * stays on it turned up (the user's ruling for the phones, 2026-09-06: "no drop up when a user is on it", android
		 * 699-702; Figma's open frame 2:3573 draws none, D8 adds it). The turned caret is laid out of flow at the row's right
		 * edge, where the folded card draws it, so the title row keeps Figma's 19 and nothing under it moves at any zoom. A
		 * company without a price opens into the same card without its dollar parts: its consensus line folded, the caption
		 * in the range's place, the consensus and the five firms' ratings (`AnalystView.noTargets`). An index fund opens into
		 * the fund card (N43a, `AnalystView.fund`): analysts rate the companies it tracks, listed as links with their consensus.
		 */
		analyst: (
			<Card key="analyst" reflow="analyst" c={c} className={cn("relative flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]", MORPH.analyst)}>
				{!an ? (
					<>
						<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">Analyst view</p>
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">No analyst coverage yet</p>
					</>
				) : open ? (
					<>
						<button type="button" onClick={onToggleOpen} aria-expanded={open} aria-controls={panelId} className="relative flex w-full cursor-pointer items-start">
							<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{an.title}</p>
							<img alt="" src={S.caret} className="absolute right-0 top-0 size-[20px] rotate-180" />
						</button>
						{/* display: contents — the panel's children stay the card's own flex items, so the layout is untouched */}
						{/* the fund card's panel is a box of the same column and gap instead (the same layout): its company links are the
							    panel's controls, and Back's focus return (src/app/focusReturn.ts) tells an open panel by its boxes, which a
							    display: contents element has none of, so after Back from a company's page the focus went to the toggle, not
							    the link that was pressed (the every-stock final review's low) */}
							<div id={panelId} className={an.fund ? "flex w-full flex-col items-start gap-[12px]" : "contents"}>
							{an.fund ? (
								<FundCompanies fund={an.fund} inner={c.inner} />
							) : (
								<>
									{/* a card without targets (a company without a price, N39a): one caption in the range's place, in the style of
									    the card's own "No analyst coverage yet"; it wraps rather than clips in a narrow column */}
									{an.noTargets ? (
										<p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{an.noTargets}</p>
									) : (
										<>
											<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] tracking-[0.8px] text-[#819abb]">{an.rangeLabel}</p>
											<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: c.inner }}>
												<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[rgba(93,168,191,0.55)]" style={{ width: pct(an.rangeFill, 328) }} />
												<img alt="" src={S.rangeMarker} className="absolute top-[-3px] size-[14px]" style={{ left: pct(an.rangeMarker, 328) }} />
											</div>
											{/*
											 * "Low / Avg / High" (2:3680-2:3687): three hug columns spread over the 328 row, each as wide as its figure's
											 * text box ($180 28, $248 31, $300 32), the label centred / right-anchored inside it. Figma's boxes are the
											 * glyph run rounded up, glyphs flush left; Chrome's runs measure up to 1.3px narrower, so the figure takes
											 * Figma's box (left-aligned: "$248" lands at x 1202.5, not centred 0.55px right of it) and the label its own
											 * run rounded up to the pixel, which centres and right-anchors it where the frames put it.
											 */}
											{/*
											 * On a computed card (every company's but the design's AAPL) "Avg" stands under the end of the bar it names
											 * (N30.8e, the hunt's CH-03: Low and High stand under the track's two ends, so a centred Avg read as a tick at
											 * the middle while the bar ended up to 55 px away): its column is centred on the average's place along the
											 * track, kept `AVG_KEEP` clear of both ends so it never touches Low or High. Figma's own card keeps the
											 * frame's centred column.
											 */}
											<div className="relative flex h-[30px] w-full items-start justify-between overflow-clip whitespace-nowrap">
												{[an.low, an.avg, an.high].map(([k, v], i) => (
													<div
														key={k}
														className={cn(
															"flex flex-col gap-px overflow-clip",
															i === 0 ? "items-start" : i === 1 ? "items-center" : "items-end",
															i === 1 && an.avgAt !== undefined && "absolute top-0 -translate-x-1/2",
														)}
														style={i === 1 && an.avgAt !== undefined ? { left: avgLeft(an.avgAt) } : { minWidth: an.boxes?.cols[i] }}
													>
														<p className={cn("font-geist text-[10px] leading-[13px] text-[#819abb]", FIT)}>{k}</p>
														<p className="font-geist text-[12px] font-medium leading-[16px] text-[#f2f6fc]" style={{ minWidth: an.boxes?.cols[i] }}>
															{v}
														</p>
													</div>
												))}
											</div>
											{/* a target under the price reads as downside, in the down colour (the phones' COST: "↓ 2.3% downside") */}
											<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", signText(an.upside))}>{an.upside}</p>
										</>
									)}
									<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
										{an.consensusLabel}
									</p>
									<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: c.inner }}>
										<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[#2fd08a]" style={{ width: pct(an.consensusFill, 328) }} />
									</div>
									<div className="flex h-[16px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]">
										{an.counts.map((t, i) => (
											<p key={t} className={i === 0 ? "text-[#2fd08a]" : "text-[#819abb]"} style={{ minWidth: an.boxes?.counts[i] }}>
												{t}
											</p>
										))}
									</div>
									<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
										{an.recentLabel}
									</p>
									{an.actions.map((a) => (
										<div
											key={a.firm}
											className={cn(
												"flex w-full items-center justify-between overflow-clip whitespace-nowrap rounded-[10px] px-[12px] py-[9px] font-geist font-medium max-lg:h-auto max-lg:min-h-[38px] max-lg:flex-wrap max-lg:gap-x-[12px] max-lg:gap-y-[8px] max-lg:whitespace-normal",
												!a.hug && "h-[38px]",
											)}
											style={{ background: c.inner }}
										>
											<p className="text-[12px] leading-[16px] text-[#f2f6fc]">{a.firm}</p>
											<div className="flex items-center gap-[10px] overflow-clip">
												<p
													className={cn("text-[11px] leading-[14px]", a.rating === "Buy" ? "text-[#2fd08a]" : "text-[#819abb]")}
													style={{ minWidth: an.boxes?.rating[a.rating] }}
												>
													{a.rating}
												</p>
												{/* no target without a price (N39a): the row ends on the rating */}
												{a.target && (
													<p className="text-[12px] leading-[16px] text-[#f2f6fc]" style={{ minWidth: an.boxes?.target }}>
														{a.target}
													</p>
												)}
											</div>
										</div>
									))}
								</>
							)}
						</div>
					</>
				) : (
					<>
						{/* folded, the button's stretched layer makes the whole card its target */}
						<button
							type="button"
							onClick={onToggleOpen}
							aria-expanded={open}
							aria-controls={panelId}
							className="flex w-full cursor-pointer items-start justify-between after:absolute after:inset-0 after:content-['']"
						>
							<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{an.title}</p>
							<img alt="" src={S.caret} className="size-[20px] shrink-0" />
						</button>
						{/* the line takes no press of its own: the shared baseline shift (styles.css) makes it position: relative, which
						    painted it over the button's stretched layer, so a press on it did nothing (every-stock review, 90 of 90
						    real presses); passed through, the press reaches the button like a press anywhere else on the card */}
						<p className={cn("pointer-events-none whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", signText(an.upside))}>{an.upside}</p>
						{/* the folded panel: present for aria-controls, display: none so the card's gaps ignore it */}
						<div id={panelId} hidden />
					</>
				)}
			</Card>
		),

		/* Compare and learn (after News signal in the stacked page): a disclosure into the peer table (D8, CompareCard.tsx).
		   Folded it is Figma's teaser: the caret, or the "›" 2:3573 draws while Analyst view is open */
		compare: (
			<Card key="compare" reflow="compare" c={c} className={cn(compare.open && stock.compare.table ? COMPARE_OPEN : COMPARE_FOLDED, MORPH.compare)}>
				<CompareDisclosure
					title={stock.compare.title}
					sub={stock.compare.sub}
					table={stock.compare.table}
					open={compare.open && !!stock.compare.table}
					onToggle={compare.toggle}
					panelId={compare.id}
					chevron={open}
				/>
			</Card>
		),
	};
}

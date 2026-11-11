import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { colPlus, useSizeClass } from "@/app/FitCanvas";
import {
	apiPriceHistory,
	changeLineOrFlat,
	chartQuery,
	closeAt,
	companyInitial,
	companyName,
	dayLabel,
	demoMarketMoveSince,
	MARKET_SYMBOL,
	money,
	normalizeTicker,
	type OrderRefusal,
	pct1,
	positionLots,
	shares4,
	signedMoneyOrZero,
	type SoldEntry,
	splitMoney,
	tickerLine,
	type Tone,
	toneOf,
	useHistoryNow,
	useMarketMove,
	usePortfolio,
	usePriceHistory,
	useShowcase,
	useQuote,
	type PositionRow,
} from "@/app/live";
import { cn } from "@/lib/utils";
import { pickDetail, stocks } from "./data";
import { drawsClosedReceipt, isLeavingPick, pickBack, replacesLeftReceipt, tabReceipts, useReceiptExit, useSimulateBack } from "./back";
import { blendedCost, closedPick, firstPrice, heroCaption, marketCell, marketOverBuys, NO_FIGURE, pickReturn, refusalFrom, round6, stakeAndGain, stakeText, weekMove } from "./figures";
import { BuyFailedSheet, type SaleLedger, SellConfirmSheet, SellSuccessSheet } from "./sheets";
import { stockFor } from "./SimulateHome";
import { hairline } from "@/app/ui/Button";
import { Avatar, BackHeader, Card, Eyebrow, GhostButton, SellButton } from "./ui";
import { useTradeRequest } from "./useTradeRequest";

/**
 * `modal`: the Sell sheet (2:1458), its receipt (2:1730) and, when a sale could not be placed, the failed-order sheet
 * (2:1863) in the Sell sheet's place; `portion`: the share of the position sold, or chosen (Try again restores it).
 */
export type PickDetailSearch = { modal?: "sell-confirm" | "sell-success" | "sell-failed"; portion?: number };

/** A figure with no source here (the My STAK cards use the same dash). */
const NONE = NO_FIGURE;

/**
 * The colour of a signed figure of this page by its tone (coordinator rulings N20c / N23g / N23h): Figma's green for a
 * gain (2:899 "+$3.80", 2:902 "+20.8% ahead"), the header's red for a loss (the red the day's move takes on this page,
 * "▼ 0.4% today"; a negative "This week" or "vs the market" was drawn white: the hunt's NUM-09), the label grey at zero.
 */
const TONE_TEXT: Readonly<Record<Tone, string>> = { up: "text-[#2fd08a]", down: "text-[#e5484d]", flat: "text-[#819abb]" };

/** A stat tile: `tone` null for a figure with no sign (the two prices, a dash), drawn white as the frame draws them. */
type StatCell = { label: string; value: string; tone: Tone | null };

/** Figma's auto-width text boxes are whole pixels wide ("+$24" is 97), Chrome's fractional: the box rounds up the same way so ".00" lands 7px after it. */
const WHOLE_PX = "w-[calc-size(max-content,round(up,size,1px))]";

/**
 * The hero's gain row past 2560 only (html[data-stak-size="big"]: the 2560 x 1440 layout zoomed up, CORE-API section 1):
 * the row aligns its items to the top and the cents' box starts 22 layout px below the row, the distance the baseline
 * alignment gives it at 2560 (".00" 2:877 sits 22 under "+$24" 2:876 in the frame; measured in the browser at
 * 2560 x 1440: 387.00 and 409.00 before the text rule's own step), so the box scales with the zoom exactly. Up to 2560
 * neither class matches.
 */
const BIG_START = "[html[data-stak-size=big]_&]:items-start";
const BIG_CENTS = "[html[data-stak-size=big]_&]:mt-[22px]";

/**
 * Figma's own exports of this frame's vectors (download_assets on 2:850, 2026-10-11), saved under public/figma/portfolio
 * and byte-identical to the app-assets copies the Simulate screens share (516e2.svg, f268b.svg).
 */
const PF = {
	/** 2:880 "Chart line": the 769.346 x 165 vector plus half its 2px stroke on every side (771.346 x 167) */
	chartLine: "/figma/portfolio/chart-line__2-880.svg",
	/** 2:892 icon/sparkle, 16px, Inactive state in #69b3ca */
	sparkle: "/figma/portfolio/icon-sparkle__2-892.svg",
} as const;

type Range = (typeof pickDetail.hero.ranges)[number];

/**
 * "Range tabs" 2:881 as the frame lays them out with 3M on: label boxes 13 · 16 · 16 · [the 39-wide pill 2:885] · 22 · 12,
 * 90px apart and centred (1D at x 70 of the 708 chart frame, 1W 173, 1M 279, the pill 385, YTD 514, 1Y 626). Every tab
 * keeps that slot whichever range is on, so no label moves when the selection does: the selected tab is the pill,
 * 39 wide and centred on its own slot (negative margins hand the extra width back to the gaps).
 */
const TAB_SLOT: Record<Range, number> = { "1D": 13, "1W": 16, "1M": 16, "3M": 39, YTD: 22, "1Y": 12 };
const PILL_W = 39;

/**
 * The range row below 1024 (SPEC R5, R8; the coordinator's touch-area ruling of 2026-10-31). The six slots (118 together)
 * spread over the row with equal gaps g = (row - 118) / 5, the row being the card's inside less its insets: 14 a side,
 * which from 752-px windows leaves Figma's own run (568: g = 90, the row capped at 596) and on phones keeps every pill
 * inside the card's 18-px content inset (the 1D pill overhangs its 13 slot by 13, the 1Y pill its 12 slot by 13.5). Under
 * 359-px windows the insets are exactly those overhangs, 13 and 13.5, so a selected 1D or 1Y pill ends on the content
 * edge, like the avatar and the gain above it, and the gaps keep the 21.5 the pills need (13.5 + 8: g = 21.5 at 320).
 * Each tab has an invisible touch area (its ::before; no pixel changes): a selected tab's is its pill, an unselected
 * tab's reaches `--range-hit` past its slot each side, which is g - 22 (0 up to 322-px windows, 8 from 364). A pill
 * overhangs its slot by 13.5 at most, so the touch areas of any two neighbours stay at least 8 apart for every selection
 * at every width (SPEC R8; 8.5 wherever an area reaches past its slot, the half pixel covering the layout's rounding),
 * and every area is 44 tall, 10.75 / 14 above and below the 22.5 / 16 tab, inside the card's 18-px bottom padding and
 * the 40 under the chart, as Simulate home's range tabs reach 44 (sim-hit-tab).
 */
const RANGE_ROW =
	"max-lg:max-w-[596px] max-lg:justify-between max-lg:gap-0 max-lg:px-[14px] max-lg:@container max-lg:[--range-hit:clamp(0px,calc((100cqi_-_118px)_/_5_-_22px),8px)] max-[359px]:pl-[13px]! max-[359px]:pr-[13.5px]!";

/** "Chart line" 2:880: a 769.346 × 165 vector centred under the 708 chart frame (it overhangs 30.67px a side and the card clips it). */
const CHART_W = 769.346;
const CHART_H = 165;
/** Figma's export of it (516e2.svg) is 771.346 × 167: the box plus half the 2px stroke on every side, one export unit. */
const EXPORT_INSET = `calc(-100% / ${CHART_H}) calc(-100% / ${CHART_W})`;
/** The chart box's width over the content box's (the vector's 769.346 over the 708 chart frame): `w-[108.665%]` below. */
const CHART_OVERHANG = 1.08665;
/**
 * Where a COMPUTED series is drawn inside that box (coordinator ruling N44a, 2026-11-10; round 7's review, medium): at
 * the content box's width, `calc(50% - 50% / 1.08665)` in from each side of the box, so its first close stands on the
 * content box's left edge and today's price on its right one. Figma's own line keeps the vector's overhang (its export
 * is drawn where the frame draws it, FigmaChartLine), but a series drawn there lost its two ends: from 1024 up the card
 * clips 12.7 px a side at 1440 (the overhang 30.67 is wider than the card's 18 padding), so the line ran from about the
 * second close to yesterday's, and a story company's pin day drew MU's 1Y falling under "+$0.24 (0.2% up)". The same
 * stroke, colour and height; the two ends are now the two figures the label's move is computed from, at every size.
 */
export const SERIES_INSET = `calc(50% - 50% / ${CHART_OVERHANG})`;

/** A computed series (the price history's closes) in the vector's stroke, at the content box's width (SERIES_INSET). */
export function SeriesLine({ closes }: { closes: readonly number[] }) {
	return (
		<div data-chart-series="" className="absolute inset-y-0" style={{ left: SERIES_INSET, right: SERIES_INSET }}>
			<svg aria-hidden="true" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="block size-full overflow-visible">
				<path
					d={linePath(closes)}
					fill="none"
					stroke="#69b3ca"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</div>
	);
}

/** The closes as Figma draws "Chart line": evenly spaced across the vector box, the lowest close on its bottom edge, the highest on its top. */
function linePath(closes: readonly number[]): string {
	const lo = Math.min(...closes);
	const hi = Math.max(...closes);
	const step = CHART_W / (closes.length - 1);
	return closes
		.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(2)} ${(hi > lo ? ((hi - v) / (hi - lo)) * CHART_H : CHART_H / 2).toFixed(2)}`)
		.join("");
}

/**
 * What the chart draws for the selected range:
 * - `figma`: Figma's own "Chart line" (NVDA's 3M line): the untouched showcase on the frame's range (D7);
 * - `series`: the range's closes (the FOUNDATION's price history, D3: the STAK API's when it answers, the deterministic
 *   demo series ending at the pick's price otherwise), in the vector's stroke;
 * - `pending`: the API's closes are on their way (the line on screen stays while they load);
 * - `none`: a company with no price at all (no quote anywhere), said in words rather than drawn.
 */
type ChartLine = { kind: "figma" } | { kind: "series"; closes: number[] } | { kind: "pending" } | { kind: "none" };

const markupCache = new Map<string, Promise<string>>();

/** Figma's exported SVG as markup, so the page can draw the file itself inline (the same bytes, the same drawing). */
function useSvgMarkup(url: string): string | null {
	const [markup, setMarkup] = useState<string | null>(null);
	useEffect(() => {
		let alive = true;
		let p = markupCache.get(url);
		if (!p) {
			p = fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))));
			p.catch(() => markupCache.delete(url));
			markupCache.set(url, p);
		}
		p.then((text) => {
			// only a plain SVG document from our own folder is ever inlined
			if (alive && /^\s*<svg[\s>]/.test(text) && !/<script|<foreignObject|\son[a-z]+\s*=/i.test(text)) setMarkup(text);
		}).catch(() => {
			/* the <img> keeps drawing the file */
		});
		return () => {
			alive = false;
		};
	}, [url]);
	return markup;
}

/**
 * Figma's "Chart line" file. Above 1440 the card stretches and Figma would move the vector's points while its stroke
 * stays 2px; an <img> would widen the stroke with the points, so the file is drawn inline with a non-scaling stroke
 * once it has loaded (the <img> draws it until then; at 1440 the two are the same picture).
 */
function FigmaChartLine() {
	const markup = useSvgMarkup(PF.chartLine);
	return (
		<div className="absolute" style={{ inset: EXPORT_INSET }}>
			{markup ? (
				<div
					className="size-full [&>svg]:block [&>svg]:size-full [&_path]:[vector-effect:non-scaling-stroke]"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Figma's exported chart file, same origin, checked above
					dangerouslySetInnerHTML={{ __html: markup }}
				/>
			) : (
				<img alt="" src={PF.chartLine} className="block size-full max-w-none" />
			)}
		</div>
	);
}

/**
 * Figma's screen transitions, as view-transition types on the router's navigation (TanStack `viewTransition`):
 * 2:1730 "Back to Simulate" PUSH LEFT 0.3 s ease-out, "View portfolio" DISSOLVE 0.3 s ease-out, and the phone's
 * "Confirm sell" (1:5238 → 1:5242) SMART_ANIMATE 0.35 s ease-out, drawn as a 0.35 s cross-fade of the sheet.
 * Every other edge of these screens is INSTANT in the prototype (`viewTransition: false`). The rules behind these
 * types (keyframes, durations, easing, the reduced-motion guard) live in src/styles.css next to the ::view-transition rules.
 */
export const PUSH_LEFT = { types: ["stak-push-left"] };
export const DISSOLVE = { types: ["stak-dissolve"] };
export const SMART = { types: ["stak-smart"] };

/**
 * The Back chevron (BackHeader, ui.tsx) of Portfolio, Pick detail and Leaderboard leaves INSTANT in the prototype
 * (phone 1:4997, 1:5019 and 1:4526 carry no transition) and returns where the person came from (D2: back.ts, the phones'
 * own Back), but its <Link> would take the router's default cross-fade to the page's natural parent. This catches a
 * plain click on it first and runs the page's Back instead; the Link stays a real link to the parent (new tab, copy
 * address), and Enter on it is a click like any other.
 */
export function InstantBack({ onBack, children }: { onBack: () => void; children: ReactNode }) {
	const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
		if (!(e.target instanceof Element) || !e.target.closest('a[aria-label="Back"]')) return;
		e.preventDefault();
		onBack();
	};
	return (
		<div className="contents" onClickCapture={onClickCapture}>
			{children}
		</div>
	);
}

/**
 * What a change of a page's sheet state does to the history. The prototype NAVIGATEs to a sheet (phone 1:5066 Sell ->
 * 1:5070), so a sheet opened from its page is its own history entry, marked pushed (the entry's `simSheet` state), and
 * the browser's Back closes it onto the page. The mark belongs to the ENTRY, not to the sheet state on show:
 * - opening (`shown` is no sheet): a new entry, marked pushed;
 * - a swap (Confirm -> the receipt, a failed sale -> the failed-order sheet, Try again -> the Sell sheet again): the
 *   same entry, replaced, KEEPING its mark, as Simulate home's swapSheet does. A sheet reached by its address (a pasted
 *   link, a reload, the 2:1116 capture) was never pushed, so neither are its failed-order sheet, its Try again and its
 *   receipt;
 * - closing (`next` is no sheet): a step back to the page when the entry was pushed, else the page in the entry's place.
 * Marking every swapped state pushed (as these pages did) made Not now, Back or the receipt's close on such a sheet step
 * back OUT of the page: a tab opened on /simulate/picks/TSLA?modal=sell-confirm ended on about:blank after a failed
 * sale (review r2), and on the site before it when there was one. `shown` / `next` are the `modal` on show and the one
 * asked for; `pushed` is the current entry's mark. The Portfolio's own sheet follows the same rule (Portfolio.tsx);
 * unit-tested in __tests__/sheetMove.unit.test.ts.
 */
export type SheetMove = { kind: "back" } | { kind: "navigate"; replace: boolean; pushed: boolean };
export function sheetMove(shown: string | undefined, next: string | undefined, pushed: boolean): SheetMove {
	if (!next) return pushed ? { kind: "back" } : { kind: "navigate", replace: true, pushed: false };
	return shown ? { kind: "navigate", replace: true, pushed } : { kind: "navigate", replace: false, pushed: true };
}

/**
 * The position's move over the trailing week (cell 2:897 "This week"): every share held since the week began moved from
 * the week's first close (the company's 1W price history, the FOUNDATION's: D3) to today's price, a share bought during
 * the week from what it cost (figures.ts weekMove). null while the API's closes load, or for a company with no price.
 */
function useWeekMove(symbol: string, pos: PositionRow | undefined, enabled: boolean): number | null {
	const week = usePriceHistory(symbol, "1W", { enabled: enabled && !!pos });
	// the week's window ends on the history's own clock (its last point), so the two always agree
	const now = week.history?.times.at(-1) ?? Date.now();
	if (!pos) return null;
	return weekMove(pos, week.history, now);
}

/**
 * The market's move over the pick's own days, for "vs the market" (2:900): each buy set against the market since ITS
 * day, weighed by what it cost (figures.ts marketOverBuys; coordinator rulings N28d / N29i: a $25 top-up made today
 * moved the May 8 pick from "+20.8% ahead" to "+16.0%"). The first buy's market is the FOUNDATION's (useMarketMove: from
 * the same kind of figures as the pick's own price, so a demo gain is never set against a live market); a later buy
 * reads the same source at its own day: the demo market's figure, or the API's SPY closes (the cache entry
 * useMarketMove filled). A pick bought once is the FOUNDATION's figure itself.
 */
function useMarketOverBuys(symbol: string, pos: PositionRow | undefined, enabled: boolean): number {
	const first = useMarketMove(pos?.addedAt, { enabled: enabled && !!pos, ticker: symbol });
	const toppedUp = enabled && !!pos && positionLots(pos).length > 1;
	const closes = useQuery(chartQuery(MARKET_SYMBOL, "1Y", toppedUp && first.source === "api"));
	const now = useHistoryNow("1Y");
	if (!pos) return 0;
	if (!toppedUp) return first.pct;
	const api = first.source === "api" ? apiPriceHistory(MARKET_SYMBOL, "1Y", closes.data?.prices) : null;
	return marketOverBuys(pos, (at) => {
		if (at <= pos.addedAt) return first.pct;
		if (!api) return demoMarketMoveSince(at, now);
		const then = closeAt(api, at);
		return then > 0 ? (api.last / then - 1) * 100 : 0;
	});
}

/**
 * What the page and its Sell sheet showed when Confirm was pressed: the page keeps it under the receipt (2:1730 draws
 * the receipt over the pre-sale page), until the receipt closes. `exact`: the ledger's own figures the sheet previewed
 * the sale from (sheets.tsx SaleLedger; absent on the frame's own figures). `sold`: the sale the store booked, which the
 * receipt prints (coordinator rulings N23e / N28e: the receipt repeated the sheet's estimate, a cent and a
 * ten-thousandth of a share off what the cash, the SOLD row and the inbox said: the hunt's NUM-01 / ST-04).
 */
export type Frozen = { fig: boolean; pos: PositionRow; shares: number; stake: number; value: number; exact?: SaleLedger; sold?: SoldEntry };

/**
 * The figures the portfolio's Sell sheet (2:1116) promised, handed to the pick page that opens next with the receipt:
 * the phone's "Confirm sell" morphs the sheet into the receipt over the same list (1:5238 → 1:5242), so the page under
 * the receipt keeps the pre-sale position and the receipt repeats the sheet. Read once, by the next mount.
 */
let handoff: { symbol: string; frozen: Frozen } | null = null;
export function handOffSale(symbol: string, frozen: Frozen) {
	handoff = { symbol, frozen };
}

/** 2:850 "Desktop · Pick detail" (+ 2:1458 Sell confirm, 2:1730 Sell success as ?modal=), on the live position. */
export function PickDetail({ symbol: raw, search }: { symbol: string; search: PickDetailSearch }) {
	const symbol = normalizeTicker(raw);
	const navigate = useNavigate();
	const pf = usePortfolio();
	const live = pf.live;
	const quote = useQuote(symbol);
	const showcase = useShowcase();
	const d = pickDetail;
	// opening and closing the sheets is INSTANT in the prototype (1:5066 Sell, 1:5240 Back); confirming morphs (SMART)
	const router = useRouter();
	const sheetPath = `/simulate/picks/${symbol}`;
	const pushed = useLocation({ select: (location) => location.state.simSheet === true && location.state.simSheetPath === sheetPath });
	// This history entry's own key (the router's, kept in the entry's state through a reload): what back.ts lists a
	// receipt's entry by once the app has left it. The router's location moves on BEFORE this page's own search does (while
	// a navigation away is under way the location is already the next entry's and `search` still this one's), so the key
	// is read only while the two agree and the last key read stands until they agree again. Read without that, the page
	// took the next entry's key for its own: while the Portfolio was replacing a left receipt's entry the pick page drew
	// that receipt once more for a moment, under the Portfolio's key (measured 2026-11-09 with a real Forward).
	const entryNow = useLocation({
		select: (location) => ((location.search as PickDetailSearch).modal === search.modal ? (location.state.__TSR_key ?? location.state.key ?? null) : false),
	});
	const [settledKey, setSettledKey] = useState<string | undefined>(undefined);
	const entryKey = entryNow === false ? settledKey : (entryNow ?? undefined);
	if (entryKey !== settledKey) setSettledKey(entryKey);
	// While the receipt's way out replaces this pick's own history entry (back.ts receiptExit `below`: a position sold in
	// full leaves no pick page under the Portfolio), the page is rendered on that entry for a moment: the receipt and the
	// page under it stay exactly as they were until the target has taken the entry's place.
	const modal = isLeavingPick(sheetPath) ? "sell-success" : search.modal;
	// The store's own refusal of a sale the sheet had let through (the position changed under it): the sheet stays and
	// says why (live/orders.ts refusalLine), never the failed-order sheet (N30.3a)
	const [refused, setRefused] = useState<OrderRefusal | null>(null);
	// The sheets are drawn over the untouched page (2:1458 / 2:1730 over 2:850), so opening or closing one never moves
	// the page: the navigation keeps the scroll position (`resetScroll: false`; at 390x844 Sell used to scroll the page
	// from 429 to 0, the coordinator's note of 2026-10-31), and a history step that stays on this page (the sheet's Back
	// stepping back, the browser's own Back / Forward between the page and its sheet) keeps it too, below.
	const setSearch = (next: PickDetailSearch, viewTransition: false | typeof SMART = false) => {
		// a swap keeps the entry's pushed mark (sheetMove): a sheet opened by its address closes in place, never out of the page
		const move = sheetMove(search.modal, next.modal, pushed);
		if (move.kind === "back") return router.history.back();
		return navigate({ to: "/simulate/picks/$symbol", params: { symbol }, search: next, replace: move.replace, viewTransition, resetScroll: false,
			state: (prev) => ({ ...prev, simSheet: move.pushed, simSheetPath: sheetPath }) });
	};
	// The router answers a history step with a scroll to the top unless its `_scroll.next` flag is off: the flag a
	// navigation's `resetScroll: false` sets, read when the step's entry renders. A step has no such option, so the flag
	// is set here while the step is under way (the router renders it after this event), as SimulateHome does.
	useEffect(() => {
		const here = window.location.pathname;
		const onPop = () => {
			if (window.location.pathname === here) router._scroll.next = false;
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [router]);
	// below 1024 (phones and tablets) the two columns stack and the sections take the phone frame's order (SPEC R2)
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	const trade = useTradeRequest(`${live.uid ?? "guest"}:${symbol}:${search.modal ?? "page"}`);
	// both Backs (the chevron and the position card's) land on the Portfolio (B17: a step back when it is the page
	// below, else the Portfolio in this page's place, so its own Back returns to where the pick was opened from)
	const back = useSimulateBack((prev) => pickBack(prev));
	// the receipt's ways out leave the pick and the receipt behind, as the phones' B19 does (back.ts receiptExit): a step
	// back to the Portfolio / Simulate home when it is below this page, else that page in the receipt's place; the
	// browser's Back never reopens the receipt
	const leave = useReceiptExit(sheetPath);

	// A sale changes the position (and ends the showcase) before the receipt replaces the Sell sheet; from then until
	// the receipt closes the page and the sheets keep what was on screen, so the prototype's sheet-to-receipt morph
	// starts from it and the receipt sits over the page that promised it. A receipt arriving from the portfolio's
	// sheet brings that sheet's figures along (handOffSale).
	const [frozen, setFrozen] = useState<Frozen | null>(() => {
		const h = handoff;
		return search.modal === "sell-success" && h && h.symbol === symbol ? h.frozen : null;
	});
	useEffect(() => {
		// the hand-off was for this mount only (read in the initializer, without side effects)
		if (handoff?.symbol === symbol) handoff = null;
	}, [symbol]);
	useEffect(() => {
		if (search.modal || isLeavingPick(sheetPath)) return;
		setFrozen(null);
		setRefused(null);
	}, [search.modal, sheetPath]);

	/** the untouched demo persona on the frame's own pick shows the frame's figures verbatim (live/showcase.ts) */
	const fig = (frozen ? frozen.fig : showcase) && symbol === d.symbol;
	const held = pf.positions.find((p) => p.ticker === symbol);
	const pos = frozen?.pos ?? held;

	// the chart's timeline (Range tabs 2:881): every range of every pick draws the pick's own line (D3: the FOUNDATION's
	// price history, the API's closes when it answers, otherwise the deterministic demo series ending at the pick's price,
	// as both phones draw a line for every range: android ui/simulate/PickDetailScreen.kt:209-223, ios
	// Simulate/PickDetailView.swift:161-163); the untouched showcase keeps Figma's own line on the frame's 3M (D7)
	const [range, setRange] = useState<Range>(d.hero.activeRange);
	const isDefaultRange = range === d.hero.activeRange;
	const history = usePriceHistory(symbol, range, { enabled: !(fig && isDefaultRange) });
	// while a range's API closes load, the line on screen stays (the next range's state is "pending" until then)
	const lastLine = useRef<ChartLine | null>(null);
	const line: ChartLine =
		fig && isDefaultRange
			? { kind: "figma" }
			: history.status === "ready"
				? { kind: "series", closes: history.history.closes }
				: history.status === "loading"
					? { kind: "pending" }
					: { kind: "none" };
	if (line.kind !== "pending") lastLine.current = line;
	const drawn: ChartLine = line.kind === "pending" ? (lastLine.current ?? line) : line;

	// the most recent sale of this company (the sold log is newest first)
	const lastSold = live.sold.find((s) => s.ticker === symbol);
	// A pick that is no longer held shows "Position closed" from its sale record where the receipt's address was LOADED
	// (a reload on the receipt, a pasted link). An entry the app has already left is not a receipt any more (follow-up
	// S1, review of 2026-11-09: the receipt's ways out step back through the history, so the browser's Forward landed on
	// its entry again and "Position closed" was drawn a second time): the Portfolio takes that entry's place, through
	// the same redirect as a pick that is not held (below). back.ts keeps the list of left receipts for the tab.
	const closedView = drawsClosedReceipt({ held: !!pos, modal, sold: !!lastSold, left: tabReceipts().wasLeft(entryKey) });
	// A PART sale's receipt the app has already left (coordinator ruling N36.3b, S1 extended; the SIMULATE polish round's
	// open issue 1): the pick is still held, so the redirect below never ran, and the browser's Forward drew "Order filled
	// · Sold 0.1689 shares ..." again over the pick (from the address alone, a minute later, a preview of a sale that did
	// not happen). Such an entry gives its place to the pick page itself, at once (back.ts replacesLeftReceipt), whichever
	// history step lands on it (the browser's Back too, after a rail link left the receipt: the same stale preview), as the
	// closed pick's does; a reload on the receipt still shows it (nothing is listed when a document unloads).
	const leftReceipt = replacesLeftReceipt({ receipt: !!held && search.modal === "sell-success", left: tabReceipts().wasLeft(entryKey), leaving: isLeavingPick(sheetPath) });
	// the receipt this entry's own address draws (not the one kept on screen for a moment while its exit steps back onto
	// the pick's entry: isLeavingPick), listed as left once the app moves off the entry by any navigation; a reload
	// unloads the page without one, so it still shows the receipt
	const receiptEntry = search.modal === "sell-success" && !leftReceipt && (!!pos || closedView) ? entryKey : undefined;
	useEffect(() => {
		if (!receiptEntry) return;
		tabReceipts().shown(receiptEntry);
		return () => tabReceipts().left(receiptEntry);
	}, [receiptEntry]);
	useEffect(() => {
		if (leftReceipt) void navigate({ to: "/simulate/picks/$symbol", params: { symbol }, search: {}, replace: true, resetScroll: false, viewTransition: false });
	}, [leftReceipt, symbol, navigate]);
	const week = useWeekMove(symbol, pos, !fig);
	// the market over the pick's own days, for "vs the market" (D3), buy by buy (useMarketOverBuys)
	const marketPct = useMarketOverBuys(symbol, pos, !fig);

	useEffect(() => {
		if (live.ready && !pos && !closedView) navigate({ to: "/simulate/portfolio", replace: true, viewTransition: false });
	}, [live.ready, pos, closedView, navigate]);

	if (!pos && !closedView) return null;

	// a pick that was just closed is shown from its sale record, its buys the record's own (figures.ts closedPick: the
	// pick-day price stays the first buy's for a topped-up pick, as on the page of a pick still held)
	const view: PositionRow = pos ?? { ...closedPick(lastSold!), ticker: symbol, quote };
	// One name per company on the page and in its sheets (N30.8k, the hunt's C-10): the catalog's display name for every
	// computed state; the frame's own strings ("NVDA · NVIDIA Corp" 2:864, "NVIDIA Corp." on its Sell sheet 2:1458) only
	// while the frame itself is on show
	const name = fig ? (stocks[symbol]?.name ?? companyName(symbol)) : companyName(symbol);
	const stock = fig && stocks[symbol] ? stocks[symbol] : stockFor(symbol, view.price, quote?.changePercent ?? 0);
	// zero is neutral (N23h): a pick that has not moved is neither up nor down, in its words and in its colours
	const gainTone = toneOf(view.gain, 2);
	const down = gainTone === "down";
	const gain = fig ? { whole: d.hero.gainWhole, cents: d.hero.gainCents } : gainTone === "flat" ? { whole: "$0", cents: ".00" } : splitMoney(view.gain);
	// the pick's return from its prices and exact shares, never from its cent-rounded dollars (N29g, figures.ts pickReturn)
	const ret = pickReturn(view);
	// The price of the pick day stays the FIRST buy's through a top-up (N23f, the hunt's NUM-03 / ST-11: "Picked May 8
	// at $102.46" was the blended cost; both phones keep the pick line and the price then: android
	// ui/simulate/PaperPortfolio.kt:333-347); the blended figure, where there is one, is named an average cost
	const pickedAt = firstPrice(view) ?? 0;
	const average = blendedCost(view);
	const pickedLine = `Picked ${dayLabel(view.addedAt)} at ${money(pickedAt)}${average === null ? "" : ` · average cost ${money(average)}`}`;
	// the pick's return since it was picked against the market's over the same days, as the frame (+24.0% - 3.2% =
	// "+20.8% ahead") and both phones compare them (android ui/simulate/PickDetailScreen.kt:84-92)
	// (a pick that was sold out has no position to compare: a dash, figures.ts marketCell)
	const vsMarket = marketCell(!pos, ret, marketPct);
	const stats: readonly (readonly StatCell[])[] = fig
		? d.stats.map((row) => row.map((cell) => ({ label: cell.label, value: cell.value, tone: cell.up ? ("up" as const) : null })))
		: [
				[
					// Figma's "This week" cell, from the week's own figures (useWeekMove), a dash while they load
					{ label: d.stats[0][0].label, value: week === null ? NONE : signedMoneyOrZero(week), tone: week === null ? null : toneOf(week, 2) },
					{ label: d.stats[0][1].label, value: vsMarket.text, tone: vsMarket.tone },
				],
				[
					{ label: "Price then", value: money(pickedAt), tone: null },
					{ label: "Price now", value: money(quote?.price ?? view.price), tone: null },
				],
			];
	// the stake and the gain as printed add up to the value beside them (N23i, figures.ts stakeAndGain)
	const note = fig ? d.position.note : `Selling returns ${money(view.value)} to your cash: ${stakeAndGain(view.stake, view.gain)}.`;
	const insight = fig
		? d.insight.text
		: gainTone === "flat"
			? `Your stake tracks the move live. Whichever way ${symbol} goes, the dollars follow it.`
			: down
				? `Your stake tracks the move live. If ${symbol} recovers, the dollars follow it back up.`
				: `Your stake tracks the move live. If ${symbol} gives back gains, the dollars follow it down.`;

	// The receipt prints THE SALE THE STORE BOOKED (N23e / N28e): its shares, its proceeds and its gain are the record the
	// cash, the SOLD row and the inbox are made of, to the cent and the ten-thousandth of a share (the receipt used to
	// repeat the sheet's estimate: half of TSLA read "$59.01 / 0.2374 shares" beside a cash that rose $59.02 and an inbox
	// row of 0.2375 shares). Without a booked sale (a reload on the receipt) it shows the sale that just happened, or, by
	// its address alone (the 2:1730 capture), a preview of selling the whole position. The stake it names is the
	// position's whole stake, as the frame's sentence does ("from your $100 stake"): a sale of half the shares is still a
	// sale from that stake (the sold log keeps the sold part's cost, the rest is still held)
	const justSold = lastSold && (!held || lastSold.soldAt > Date.now() - 60_000) ? lastSold : null;
	const portion = search.portion ?? 1;
	const booked = frozen?.sold;
	const sale = booked && frozen
		? { shares: booked.shares, stake: frozen.stake, proceeds: booked.proceeds, pnl: booked.pnl }
		: frozen
			? { shares: frozen.shares * portion, stake: frozen.stake, proceeds: frozen.value * portion, pnl: (frozen.value - frozen.stake) * portion }
			: justSold
				? { ...justSold, stake: justSold.stake + (held?.stake ?? 0) }
				: fig
					? { shares: d.position.shares * portion, stake: d.position.stake, proceeds: d.position.value * portion, pnl: (d.position.value - d.position.stake) * portion }
					: { shares: view.shares * portion, stake: view.stake, proceeds: view.value * portion, pnl: view.gain * portion };
	// whether the booked sale ended the position (the store's own record; an older record: nothing of it is held any more)
	const bookedClosed = booked ? (booked.closed ?? !held) : undefined;

	// the Sell sheet reads the frame's figures in the showcase (1.0152 shares, $100 stake, $124.00), the position's otherwise
	const sheetShares = frozen ? frozen.shares : fig ? d.position.shares : (held?.shares ?? 0);
	const sheetStake = frozen ? frozen.stake : fig ? d.position.stake : (held?.stake ?? 0);
	const sheetValue = frozen ? frozen.value : fig ? d.position.value : (held?.value ?? 0);
	// ... and previews the sale by the ledger's own arithmetic on the exact quantity held (sheets.tsx SaleLedger); the
	// frame's own figures are multiplied as the frame multiplies them
	const sheetExact: SaleLedger | undefined = frozen ? frozen.exact : fig || !held ? undefined : { shares: held.shares, price: held.price, account: live.signedIn };

	const confirmSell = async (frac: number) => {
		if (!held) return;
		const request = trade.begin();
		if (!request) return;
		setRefused(null);
		setFrozen({ fig, pos: held, shares: sheetShares, stake: sheetStake, value: sheetValue, exact: sheetExact });
		try {
			// the portion's shares go to the ledger unrounded (FOUNDATION v2's request, FOUNDATION-API.md "FOR THE SELL SHEETS"):
			// a guest holds eight decimals, and a partial sale asked at four sold a rounded quantity, so the cash it returned
			// could be cents off the receipt's own figure (half of $100 of COST: $50.04 beside a receipt of $50.00). The store
			// quantises what it is asked (ledger.ts paperSale; an account's quantity in store.ts), and All still sells everything.
			const sold = await live.actions.sell(symbol, held.shares * frac, held.price);
			if (!request.isCurrent()) return;
			// the receipt prints the sale the store booked (see `sale` above)
			setFrozen((f) => (f ? { ...f, sold } : f));
			// the receipt is the confirmation (2:1730): no toast over it. The address keeps the portion to six decimals, as the
			// sheet's own address does (figures.ts typedForAddress: a typed 99.999% left "portion=0.9999899999999999" here too)
			setSearch({ modal: "sell-success", portion: round6(frac) }, SMART);
		} catch (error) {
			if (!request.isCurrent()) return;
			setFrozen(null);
			// A REFUSED sale (live/orders.ts: a quantity that rounds to nothing, nothing held, no price) is not a failed one:
			// the sheet stays on its portion and says why (N27i / N30.3a)
			const reason = refusalFrom(error);
			if (reason) {
				setRefused(reason);
				return;
			}
			// the failed-order sheet takes the Sell sheet's place (2:1863: "Couldn't place that trade / Order not placed /
			// Prices are refreshing. Your paper cash wasn't touched." fits a sale word for word): Try again returns to the
			// Sell sheet on the same portion, Not now closes it. The position and cash are unchanged.
			await setSearch({ modal: "sell-failed", portion: round6(frac) });
		} finally {
			request.finish();
		}
	};

	// "Stats" (2:898 …): two rows of two tiles; below 1024 the tiles wrap two per row while two fit (`sim-stats`, responsive.css)
	const statsGrid = (
		<div className="flex w-full flex-col items-start gap-[10px] overflow-clip whitespace-nowrap font-geist">
			{stats.map((row) => (
				<div key={row[0]!.label} className="sim-stats flex w-full items-start gap-[10px] overflow-clip">
					{row.map((cell) => (
						<div key={cell.label} className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip rounded-[14px] bg-[#181f30] px-[14px] py-[13px]">
							<p className="text-[10px] leading-[13px] text-[#819abb]">{cell.label}</p>
							<p className={cn("text-[14px] leading-[18px]", cell.tone === null ? "text-white" : TONE_TEXT[cell.tone])}>{cell.value}</p>
						</div>
					))}
				</div>
			))}
		</div>
	);

	return (
		<div className="sim-responsive flex flex-col items-start gap-[14px]" style={{ width: colPlus(23), minHeight: 1004 }}>
			<div className="flex w-[222px] flex-col items-start gap-[24px] max-lg:w-full">
				{/* phone 1:5019 "Back" → 1:4876 Portfolio, INSTANT */}
				<InstantBack onBack={back}>
					<BackHeader crumbs={d.crumbs(symbol)} to="/simulate/portfolio" />
				</InstantBack>
				<div className="sim-copy flex flex-col items-start gap-[4px] whitespace-nowrap">
					<div className="flex flex-col items-start gap-[4px]">
						<div className="flex flex-col items-start gap-[4px] text-[#819abb]">
							<Eyebrow>{fig ? d.eyebrow : `PICKED ${dayLabel(view.addedAt).toUpperCase()} · ${stakeText(view.stake).toUpperCase()} STAKE`}</Eyebrow>
							{/* the pick's own name ("NVDA · NVIDIA Corp", 2:864) is this page's h1: the frame gives a pick no title line of
							    its own (no PageTitle here), and the Portfolio's and the Leaderboard's titles are h1s (ui.tsx PageTitle), so
							    every Simulate page has its one heading (review r2: the three pages had none). Drawn exactly as the paragraph
							    it replaced: the preflight gives a heading no size, weight or margin, and the shared text rules (styles.css)
							    name h1 beside p */}
							<h1 className="font-geist text-[12px] leading-[16px] max-lg:text-pretty">{fig ? `${symbol} · ${name}` : tickerLine(symbol)}</h1>
						</div>
						<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{fig ? d.price : money(quote?.price ?? view.price)}</p>
					</div>
					<p className={cn("font-geist text-[13px] font-medium leading-[17px]", TONE_TEXT[fig ? "up" : toneOf(quote?.changePercent ?? 0, 1)])}>
						{fig ? d.change : changeLineOrFlat(quote?.changePercent ?? 0)}
					</p>
				</div>
			</div>

			{/* the two columns 23 apart (2:850); below 1024 they stack (`sim-columns`) and the position card follows the insight 14
			    below, the frame's vertical rhythm between these cards (the header, the hero, the stats and the insight are 14
			    apart too), not the 23 of the desktop's columns */}
			<div className="sim-columns flex w-full items-start gap-[23px] max-lg:gap-[14px]">
				<div className="flex min-w-0 flex-col items-start gap-[30px]" style={{ flex: "744 1 0" }}>
					<div className="flex w-full flex-col items-start gap-[14px]">
						<section className="flex w-full flex-col items-start gap-[11px] overflow-clip rounded-[16px] bg-[#181f30] p-[18px]">
							<div className="flex items-center gap-[9px] overflow-clip">
								<Avatar letter={stocks[symbol]?.initial ?? companyInitial(symbol)} size={38} radius={19} bg="#242b3d" />
								<p className="sim-copy whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{fig ? d.hero.picked : pickedLine}</p>
							</div>
							{/* "num" (2:875): the whole dollars (Sora 38/48) and the cents (Sora 16/20, 2:877 at y 22 of the row) on one baseline.
							    Past 2560 (the big regime, html[data-stak-size="big"]) that baseline is laid out explicitly instead: Chrome solves
							    `items-baseline` with the zoomed fonts' metrics rounded in device pixels, which put the cents' glyphs 1-1.5 device px
							    off 2560 x the zoom (CORE-API, PAGE ISSUES: portfolio); the cents' box then starts 22 below the row at every zoom,
							    as it does at 2560, and the shared text rule lands each glyph on its device pixel. 1024-2560 is untouched. */}
							<div className={cn("flex items-baseline gap-[7px] overflow-clip whitespace-nowrap font-sora font-semibold", BIG_START)}>
								<p className={cn(WHOLE_PX, "text-[38px] leading-[48px]", down ? "text-[#ff5a6a]" : "text-white")}>{gain.whole}</p>
								<p className={cn("text-[16px] leading-[20px] text-[#819abb]", BIG_CENTS)}>{gain.cents}</p>
							</div>
							{/* below 1024 the hero's lines, the insight, the position line and the note wrap with a signed-in account's longer
							    figures (`sim-copy` or their own width) and never end on one word (text-wrap: pretty), as on the portfolio page */}
							<p className="sim-copy whitespace-nowrap font-geist text-[12px] font-light leading-[16px] text-[#819abb] max-lg:text-pretty">
								{fig ? d.hero.caption : heroCaption(ret, view.gain, view.stake)}
							</p>
							<div className="flex w-full flex-col items-center gap-[40px]">
								<div
									role="img"
									aria-label={
										line.kind === "pending"
											? `Loading ${symbol} prices, ${range}`
											: line.kind === "series" && history.status === "ready"
												? `${symbol} price, ${range}: ${signedMoneyOrZero(history.history.change)} (${toneOf(history.history.changePercent, 1) === "flat" ? "no change" : `${pct1(history.history.changePercent)} ${history.history.change < 0 ? "down" : "up"}`})`
												: line.kind === "figma"
													? `${symbol} price, ${range}`
													: `No ${range} price history for ${symbol} right now`
									}
									// below 1024 the line keeps the vector's own shape (769.346 : 165) and follows the card's width, overhanging the
									// chart frame by the same 4.3 % a side (the phone frame 1:5036 draws it 343 wide in a 314 frame, 73.56 tall);
									// the card's padding clips nothing there, as on the phone frame. It is never drawn taller than Figma's 165
									// (2:880): on the widest tablets (windows from 865, where the vector's shape would grow past it, to 202 at
									// 1023) the height stays 165 and the line stretches sideways, as the approved 1440-2560 layout stretches it.
									// The box is Figma's line's (FigmaChartLine draws in it); a computed series takes the box's height and the
									// content box's width inside it (SeriesLine, N44a), so its two ends are never clipped
									className="relative h-[165px] w-[108.665%] shrink-0 max-lg:aspect-[769.346/165] max-lg:h-auto max-lg:max-h-[165px]"
								>
									{drawn.kind === "figma" && <FigmaChartLine />}
									{drawn.kind === "series" && <SeriesLine closes={drawn.closes} />}
									{drawn.kind === "none" && (
										// the frame draws no empty chart: the card says so in its own secondary text (Geist 12 #819abb)
										<div className="absolute inset-0 flex items-center justify-center">
											<p className="sim-copy whitespace-nowrap text-center font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{`No ${range} price history to show right now`}</p>
										</div>
									)}
								</div>
								{/* "Range tabs" 2:881: Figma's run is 568 wide (the six slots' 118 + 5 x 90), centred in the card (1D at 70 of the 708
								    inside). Below 1024 the row keeps that run, centred, wherever it fits: its box is at most 596 (the run + its
								    14-px insets), so its space-between spreads the slots exactly 90 apart and the column's items-center centres it
								    (tablets from 752-px windows: 768, 820, 1023). Narrower, the slots spread over the card's width instead, the
								    pills always inside its content inset, with touch areas that never come within 8 of each other (RANGE_ROW) */}
								<div role="group" aria-label="Chart range" className={cn("flex h-[22.5px] w-full items-center justify-center gap-[90px]", RANGE_ROW)}>
									{d.hero.ranges.map((r) => {
										const on = r === range;
										return (
											<button
												key={r}
												type="button"
												aria-pressed={on}
												onClick={() => setRange(r)}
												className={cn(
													// the hit area runs past the label (a 13px "1D" is too small to aim at); the layout box stays Figma's. No hover or
													// pressed look: the tabs are plain frames in Figma (no variant, no reaction), only the selection moves.
													// Below 1024 the areas follow RANGE_ROW: the pill's own box for the selected tab, `--range-hit` past the slot
													// for the others, 44 tall for all
													"relative flex shrink-0 cursor-pointer items-center justify-center before:absolute before:inset-x-[-14px] before:inset-y-[-8px] before:content-['']",
													on
														? "h-[22.5px] rounded-[11.25px] bg-[rgba(44,157,188,0.16)] px-[7px] pt-[3px] pb-[5px] max-lg:before:inset-x-0 max-lg:before:inset-y-[-10.75px]"
														: "h-[16px] max-lg:before:-inset-x-[var(--range-hit)] max-lg:before:inset-y-[-14px]",
												)}
												style={
													on
														? { width: PILL_W, marginInline: (TAB_SLOT[r] - PILL_W) / 2, boxShadow: hairline(0.75, "rgba(44,157,188,0.4)") }
														: { width: TAB_SLOT[r] }
												}
											>
												{on ? (
													<span className="whitespace-nowrap text-center font-geist text-[12px] font-medium leading-[16px] text-[#69b3ca] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
														{r}
													</span>
												) : (
													<span className="whitespace-nowrap text-center font-geist text-[12px] leading-[16px] text-[#819abb]">{r}</span>
												)}
											</button>
										);
									})}
								</div>
							</div>
						</section>

						{/* Below 1024 the stat tiles follow the hero and the insight follows them: the phone frame's order (1:5003: Pick hero,
						    Stats, Live note, then Sell / Back; SPEC R2), rendered in that DOM order so the keyboard follows what the eye sees
						    (R10 ruling); from 1024 the tree is the approved one (hero and insight 14 apart, the tiles 30 below). */}
						{compact && statsGrid}
						<section className="flex w-full items-baseline overflow-clip rounded-[12px] bg-[#181f30] px-[12px] py-[10px]">
							<div className="flex w-full flex-col items-start gap-[8px]">
								<div className="flex items-start gap-[7px] overflow-clip">
									<img alt="" src={PF.sparkle} className="size-[16px] shrink-0" />
									<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.9px] text-[#5c6b85]">{d.insight.label}</p>
								</div>
								<p className="w-full font-geist text-[12px] leading-[17px] text-[#c8d2e0] max-lg:text-pretty">{insight}</p>
							</div>
						</section>
					</div>

					{!compact && statsGrid}
				</div>

				<div className="flex min-w-0 flex-col items-start overflow-clip" style={{ flex: "390 1 0" }}>
					<Card className="w-full">
						<Eyebrow>{d.position.eyebrow}</Eyebrow>
						<p className="sim-copy whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc] max-lg:text-pretty">{fig ? d.position.line : `${shares4(view.shares)} shares · worth ${money(view.value)}`}</p>
						<div className="flex w-full flex-col items-start gap-[16px]">
							<SellButton onClick={() => setSearch({ modal: "sell-confirm" })} disabled={!held}>
								{d.position.sell}
							</SellButton>
							{/* phone 1:5068 "Back" → 1:4876 Portfolio, INSTANT */}
							<GhostButton height={51} radius={6} fontSize={14} onClick={back}>
								{d.position.back}
							</GhostButton>
						</div>
						{/* 2:919 is a fixed 320-wide text (not a fill): it keeps its two lines when the card stretches, so the card stays 253 tall */}
						<p className="w-[320px] font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:w-full max-lg:max-w-[320px] max-lg:text-pretty">{note}</p>
					</Card>
				</div>
			</div>

			{modal === "sell-confirm" && (held || frozen) && (
				<SellConfirmSheet
					symbol={symbol}
					stock={stock}
					shares={sheetShares}
					value={sheetValue}
					exact={sheetExact}
					initialPortion={search.portion}
					refusal={refused}
					pending={trade.pending}
					// The portion chosen lives in the address, as Try again's does, so a reload with the sheet open keeps it
					// (coordinator ruling N29f: a reload turned a chosen 75% into the default 50% and Confirm sold half). The
					// entry is replaced, Instant, and keeps its pushed mark (sheetMove's swap)
					onPortion={(p) => {
						setRefused(null);
						if (p !== search.portion) void setSearch({ modal: "sell-confirm", portion: p });
					}}
					onConfirm={confirmSell}
					onClose={() => setSearch({})}
				/>
			)}
			{modal === "sell-failed" && held && (
				// a sale that could not be placed (an account's write failed): Try again returns to the Sell sheet on the same
				// portion (Smart Animate, as the buy flow's retry), Not now closes it (Instant)
				<BuyFailedSheet
					motion
					stock={stock}
					onRetry={() => setSearch({ modal: "sell-confirm", portion: search.portion })}
					onClose={() => setSearch({})}
				/>
			)}
			{modal === "sell-success" && !leftReceipt && (
				<SellSuccessSheet
					stock={stock}
					shares={sale.shares}
					stake={sale.stake}
					proceeds={sale.proceeds}
					pnl={sale.pnl}
					closed={bookedClosed}
					// 2:1730: "Back to Simulate" (2:1825) PUSH LEFT, "View portfolio" (2:1827) DISSOLVE, both 0.3 s ease-out; both
					// pop to their page when it is below this one, else take the receipt's place (android StakNavHost.kt:638-647).
					// A position sold in full leaves no pick page behind: the target takes the pick's own entry (back.ts
					// receiptExit `closed`), so the browser's Back leaves the Portfolio in one press (N27m)
					onPrimary={() => leave("/simulate", PUSH_LEFT, !held)}
					onSecondary={() => leave("/simulate/portfolio", DISSOLVE, !held)}
					// closing the receipt of a position sold out leaves for the Portfolio the same way, Instant
					onClose={() => (held ? setSearch({}) : leave("/simulate/portfolio", false, true))}
				/>
			)}
		</div>
	);
}

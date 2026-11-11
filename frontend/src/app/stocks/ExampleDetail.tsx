import { Link } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode, useId, useState } from "react";
import { colPlus, useSizeClass } from "@/app/FitCanvas";
import { PrimaryButton } from "@/app/ui/Button";
import { ExampleTopBar } from "@/app/ui/ExampleTopBar";
import { cn } from "@/lib/utils";
import { SL } from "./assets";
import { COMPARE_FOLDED, COMPARE_OPEN, CompareDisclosure } from "./CompareCard";
import { type StockArticle, type StockDetailData, stockDetails } from "./data";
import { CHART_BOX, type ChartLine, chartPoints, useStockChart } from "./live";
import { NO_PRICE } from "./PerformanceChart";
import { plotHeight, useHeaderBoxes } from "./plot";
import { useReflowFocus } from "./reflow";
import { StatGrid } from "./StatGrid";
import { avgLeft, FundCompanies } from "./StockDetail";
import { signText } from "./tone";
import "./ticket.css";

export type ExampleDetailProps = {
	stock: StockDetailData;
	saved: boolean;
	onToggleSaved: () => void;
	onPracticeBuy: () => void;
	/** Compare and learn's open state when the route holds it (per history entry, as on the product page); else the page's own */
	compare?: { open: boolean; onToggle: () => void };
};

/**
 * Figma's own exports of the frame's vector layers (design context / download_assets of 2:6315 and 2:6399, each file
 * byte-identical to Figma's current export, re-checked 2026-10-18), kept in /figma/ref-examples: the chart line
 * "Vector" 2:6321, the filled 12px "icon/bookmark" 2:6333 of SINCE YOU SAVED, the 14px risk "Marker" 2:6344, the
 * analyst range's 14px "Ellipse" 2:6401 (its own export: the same circle, its own layer id), and the 12px outline
 * "icon/bookmark" of the EXAMPLE set (2:6462, the deck's Save chip), drawn where the unsaved card names the stock.
 */
const X = {
	chart: "/figma/ref-examples/vector__2-6321.svg",
	bookmarkSaved: "/figma/ref-examples/icon-bookmark__2-6333.svg",
	bookmark: "/figma/ref-examples/icon-bookmark__2-6462.svg",
	marker: "/figma/ref-examples/marker__2-6344.svg",
	ellipse: "/figma/ref-examples/ellipse__2-6401.svg",
} as const;

/** The example frames paint every card #0e1a36 with #12203e insets (the product frames' ticket palette). */
const CARD = "#0e1a36";
const INNER = "#12203e";
const RAIL_TRACK = 328;
const RISK_TRACK = 712;

/** "Frame" 2:6323 / 2:6325 / 2:6327 / 2:6329: each range button hugs its label (Figma's box) with 10px a side. */
const RANGE_WIDTH: Record<string, number> = { "1D": 33, "1W": 36, "1M": 35, "1Y": 31 };
/** The range in words, for the screen-reader status line. */
const RANGE_NAME: Record<string, string> = { "1D": "1 day", "1W": "1 week", "1M": "1 month", "3M": "3 month", YTD: "year to date", "1Y": "1 year" };
/** "Tone · bullish (neutral chip)" 2:6380 / 2:6386: Figma's hug width (label box + 8px a side). */
const TONE_WIDTH: Record<string, number> = { Neutral: 51, Positive: 54, Negative: 59 };
/** A text in Figma's auto-width box: its glyph run rounded up to a whole pixel, left-aligned (Figma "1 / 12" 32, "Save" 32 …). */
const FIT = "w-[calc-size(max-content,round(up,size,1px))] text-left";

/** A px offset authored on a track of the given width, kept at the same fraction when the track stretches. */
const pct = (px: number, of: number) => `${((px / of) * 100).toFixed(4)}%`;

/** The frames' fixed 326 text boxes: the card's width below 1024, never wider than Figma's (R3). */
const BOX_326 = "max-lg:w-full max-lg:max-w-[326px]";

/** The blocks of both columns, built once and placed by `ExampleDetail` in the tree the window's size asks for. */
type Cards = Record<"price" | "chart" | "intro" | "risk" | "numbers" | "news" | "cta" | "analyst" | "compare", ReactNode>;

/**
 * Figma 2:6311 "EXAMPLE · Desktop · Stock detail · Saved (two-column)", 1440 × 1128: the breadcrumb top bar, the price
 * block above the chart, the chart's range buttons top-left, and the analyst view always unfolded in the rail. Two
 * columns of 744 + 40 + 360 from (256, 88), on the live detail data; every card stretches with the real column and the
 * two keep their 744 : 360 ratio. `/stocks/$symbol?variant=example` (`&saved=1` previews the frame's saved state);
 * the product frames keep their own layout. The frame carries no reactions: the controls follow the product's wiring
 * (phone page) for the same layers, see the route.
 *
 * Below 1024 (SPEC R2 / R3 / R6) the two columns become one, exactly as the product StockDetail does: one column of the
 * blocks in the phone frames' section order (page "mobile updated" 1:2496 / 1:3846: price, chart, Since you saved, Risk
 * fit, Numbers that matter, Analyst view, News signal, Compare and learn, the CTA last), RENDERED in that order
 * (`useSizeClass`) so the DOM and the Tab sequence are what the eye sees (the R10 ruling of 2026-10-25); the page is as
 * tall as its content there (the shell follows the window). From 1024 up the tree is the approved two-column one.
 *
 * As on the product page, the one column below 1024 IS the content column of the two-column tree (the rail column is not
 * rendered there) and every block carries a key, so a window crossing 1024 keeps the content column's blocks mounted
 * (React matches keyed siblings of one parent by key) and only inserts or removes the rail's three: the chart's range,
 * the Benchmarks line and the headline dot in use survive the reflow (R10). The rail blocks hold no state, but React
 * rebuilds them in the other column: a control a keyboard user is on there (Practice buy, Save / Unsave) gets the focus
 * back in its new place (`useReflowFocus`, src/app/stocks/reflow.ts).
 */
export function ExampleDetail({ stock, saved, onToggleSaved, onPracticeBuy, compare: held }: ExampleDetailProps) {
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	// Compare and learn opens in place (D8): the route's state where it holds it (per history entry: Back draws it as it was
	// left), else the page's own; either survives the reflow at 1024, per stock
	const [compareFor, setCompareFor] = useState<string | null>(null);
	const compareId = useId();
	const compare = held
		? { open: held.open, toggle: held.onToggle, id: compareId }
		: { open: compareFor === stock.symbol, toggle: () => setCompareFor((s) => (s === stock.symbol ? null : stock.symbol)), id: compareId };
	const k = cards(stock, saved, onToggleSaved, onPracticeBuy, compare);
	// the content column's blocks: the approved six from 1024 up, all nine in the phone frames' order below
	const main = compact
		? [k.price, k.chart, k.intro, k.risk, k.numbers, k.analyst, k.news, k.compare, k.cta]
		: [k.price, k.chart, k.intro, k.risk, k.numbers, k.news];
	return (
		<>
			<ExampleTopBar crumb={`Discover  /  ${stock.symbol}`} />
			{/* the 1128 frame: 88 above the columns, the News card ends at 1068, 60 below it; below 1024 the content's own height */}
			<div className="flex min-h-[1040px] items-start justify-center gap-[40px] max-lg:min-h-0" style={{ width: colPlus(10) }}>
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
		</>
	);
}

/** A card; `reflow` names a rail card that the 1024 reflow rebuilds in the other column, which keeps a held focus. */
function Card({ className, style, children, reflow }: { className?: string; style?: CSSProperties; children: ReactNode; reflow?: string }) {
	const ref = useReflowFocus<HTMLDivElement>(reflow);
	return (
		<div ref={ref} className={cn("overflow-clip rounded-[16px]", className)} style={{ background: CARD, ...style }}>
			{children}
		</div>
	);
}

/** The chart card (2:6320): 744 x 220 in the frame, its line's 692 x 122 box at the card's top-left corner. */
const CHART_CARD = { width: 744, height: 220 } as const;

/**
 * "Performance chart" 2:6320: 744 × 220, r16. The line "Vector" 2:6321 (692 × 122) starts at the card's top-left corner.
 * Figma's export is the stroke's own box: the 2.5 stroke overhangs the layer by 0.4117 on the left, 0.2235 on the right,
 * 1.3054 above and 1.1834 below, so the 692.635 × 124.484 file is laid exactly that far out of the layer (and keeps
 * 51.365 of the card's width to its right as the card stretches), and the line lands on the layer with no squeeze. The
 * range row "Frame" 2:6322 sits at (20, 16), 1M selected (#12203e fill, #f2f6fc label). The ranges are a real choice,
 * as on the product chart: the clicked one takes the selected look and the line redraws that range (`useStockChart`:
 * the frame's own line for the frame's range, the shared price history for the others, nothing when a range has no
 * data, announced to screen readers).
 *
 * This card's header is the range row itself (the price block sits above the card): the line's box starts at the card's
 * top edge, 16 above the row, so a live series whose high is on the left ran through "1D" and "1W". As on the product
 * chart (N20b, plot.ts) a live series uses the whole box whenever it clears the row and otherwise has its top lowered
 * just enough to stay 8 px under the buttons it passes by; Figma's own line (2:6321) stays where the frame draws it.
 */
function ExampleChart({ stock }: { stock: StockDetailData }) {
	const [range, setRange] = useState(stock.activePeriod);
	const fetched = useStockChart(stock.symbol, range, stock.activePeriod, stock.design);
	// the frame's line is AAPL's month (2:6321): another company without live closes draws nothing rather than AAPL's shape
	const line: ChartLine = fetched.kind === "design" && !stockDetails[stock.symbol] ? { kind: "none" } : fetched;
	const [frame, header] = useHeaderBoxes<HTMLDivElement>('[role="group"] > button', CHART_CARD.height);
	const height =
		line.kind === "live"
			? plotHeight(line.closes, { left: 0, top: 0, width: (header?.width ?? CHART_CARD.width) - (CHART_CARD.width - CHART_BOX.width), height: CHART_BOX.height }, header?.boxes ?? [])
			: CHART_BOX.height;
	// a company without a price (N30.8c): the card says so in words and offers no range tabs (see PerformanceChart)
	if (!stock.priced) {
		return (
			<div className="relative h-[220px] w-full overflow-clip rounded-[16px]" style={{ background: CARD }}>
				<p data-chart-empty="" className="absolute inset-x-[20px] top-[16px] whitespace-normal font-geist text-[12px] leading-[16px] text-[#819abb]">
					{NO_PRICE.plot(stock.symbol)}
				</p>
			</div>
		);
	}
	return (
		// the Card's own box and fill (it holds no rail focus to hand on), with the header's measure on it
		<div ref={frame} className="relative h-[220px] w-full overflow-clip rounded-[16px]" style={{ background: CARD }}>
			{(line.kind === "design" || line.kind === "loading") && (
				// the layer's own 692 x 122 box (stretching with the card), the export laid in it at its sub-pixel offset: an <img>
				// is drawn on whole pixels (Chrome snapped the 692.635 x 124.484 file into 692 x 124 and the line drifted up to
				// 0.37px from Figma's), an SVG <image> keeps the fractions
				<svg aria-hidden="true" className="absolute left-0 top-0 h-[122px] w-[calc(100%-52px)] overflow-visible" viewBox="0 0 692 122" preserveAspectRatio="none">
					<image href={line.kind === "design" ? X.chart : SL.chartDim} x={-0.4117} y={-1.3054} width={692.635} height={124.484} preserveAspectRatio="none" />
				</svg>
			)}
			{line.kind === "live" && (
				// the closes in the vector's box and stroke (#5da8bf, 2.5, centred), on the box's bottom edge at the height that
				// clears the range row (`height`: the whole 122 for a line that passes under it); the stroke keeps its width
				// when the card stretches
				<svg
					aria-hidden="true"
					data-chart-line="live"
					data-plot-height={height}
					className="absolute left-0 top-0 h-[122px] w-[calc(100%-52px)] overflow-visible"
					viewBox="0 0 692 122"
					preserveAspectRatio="none"
				>
					<polyline points={chartPoints(line.closes, CHART_BOX.width, height, CHART_BOX.height - height)} fill="none" stroke="#5da8bf" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
				</svg>
			)}
			{/* the row clips like Figma's frame, 4px out, so a focused button's ring shows whole */}
			<div role="group" aria-label="Chart range" className="absolute left-[20px] top-[16px] flex items-start gap-[8px] overflow-clip [overflow-clip-margin:4px]">
				{stock.periods.map((per) => {
					const on = per === range;
					return (
						<button
							key={per}
							type="button"
							aria-pressed={on}
							onClick={() => setRange(per)}
							// a plain frame in Figma: no hover or pressed state, the cursor and the focus ring only
							className="flex shrink-0 cursor-pointer items-start overflow-clip rounded-[8px] px-[10px] py-[4px]"
							style={{ width: RANGE_WIDTH[per], ...(on ? { background: INNER } : {}) }}
						>
							<span className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", on ? "text-[#f2f6fc]" : "text-[#819abb]")}>{per}</span>
						</button>
					);
				})}
			</div>
			<p className="sr-only" aria-live="polite">
				{line.kind === "none" ? `No ${RANGE_NAME[range] ?? range} price history to show` : line.kind === "loading" ? `Loading ${RANGE_NAME[range] ?? range} prices` : ""}
			</p>
		</div>
	);
}

/**
 * "News signal" 2:6366: the move, two headlines (fixed 326 boxes that wrap), the dots, two article cards in view. Its own
 * component: the dot in use is its state, kept whichever tree the card is placed in.
 */
function ExampleNews({ stock }: { stock: StockDetailData }) {
	/*
	 * "Frame 4" 2:6371: one dot per headline, the filled one the dot in use (the frame fills the second, 2:6373, with
	 * articles 1-2 in view). A dot brings its headline in as the second card of the pair (the first card for headline 1),
	 * and turns filled itself, so every dot can be the current one.
	 */
	const [current, setCurrent] = useState(1);
	const articles = stock.news.articles;
	// a refresh can bring fewer headlines than the dot in use: keep the dot and the window inside the list
	const dot = Math.max(0, Math.min(current, articles.length - 1));
	const start = Math.max(0, Math.min(dot - 1, articles.length - 2));
	const visible = articles.slice(start, start + 2);
	// The frame's dots (below) stand at x 291 of the card, on the row of its short second line ("Q3 earnings land July 30.").
	// Another company's lines are the site's own story points and can fill the frame's 326 box (16 to 342), which ran the
	// text under the dots ("... memory makers and small● chip names", measured on /stocks/NVDA?variant=example). With
	// dots on the card, a line that is not the frame's own wraps 8 short of them (267 of the 712 inner width); the frame's
	// lines keep its 326 box. Below 1024 the dots are in flow and the lines take the card's width (BOX_326).
	const lineBox = !stock.design && articles.length > 0 ? "w-[37.5%]" : "w-[45.787%]";
	return (
		<Card className="relative flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
			<h2 className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.news.title}</h2>
			<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", signText(stock.news.move))}>{stock.news.move}</p>
			{stock.news.lines.map((l) => (
				<p key={l} className={cn(lineBox, "font-geist text-[11px] leading-[14px] text-[#819abb]", BOX_326)}>
					{l}
				</p>
			))}
			{/* "Frame 4" (absolute at 291, 101 of the 744 card: 8px dots 4 apart, outlined 1px white inside, the current one
			    filled #d9d9d9); the pager the dots draw, inferred from the layer (no reaction in Figma). Below 1024 the frame's
			    position would land on the wrapped headlines (R6): the dots sit in flow between the headlines and the cards they
			    page, centred in the card. There the dots keep Figma's 8px but stand 8 apart (SPEC R8: at least 8px between
			    adjacent touch targets) and their targets are the dots themselves, 24 tall; at 1440 each dot's transparent 12 x 24
			    margin takes the pointer as before (the 12px pitch leaves no room between them: the frame's own geometry). */}
			{articles.length > 0 && (
				<div className="absolute left-[39.1129%] top-[101px] flex items-center gap-[4px] max-lg:static max-lg:gap-[8px] max-lg:self-center" role="group" aria-label="Headlines">
					{articles.map((a, i) => {
						const on = i === dot;
						return (
							<button
								key={a.source + a.text}
								type="button"
								aria-label={`Headline ${i + 1} of ${articles.length}`}
								aria-current={on ? "true" : undefined}
								onClick={() => setCurrent(i)}
								// the outlined dots' margin is measured from inside their 1px border
								className={cn(
									"relative size-[8px] shrink-0 cursor-pointer rounded-[200px] after:absolute after:content-['']",
									on
										? "bg-[#d9d9d9] after:-inset-x-[2px] after:-inset-y-[8px] max-lg:after:inset-x-0"
										: "border border-solid border-white after:-inset-x-[3px] after:-inset-y-[9px] max-lg:after:-inset-x-px",
								)}
							/>
						);
					})}
				</div>
			)}
			{/* with no articles the card ends on its lines, whose fallback ("No fresh headlines today.") says so once, as the
			    product StockDetail prints it */}
			{/* the pair fills the compact card: side by side on a tablet, one under the other on a phone (R2, R3: cards fill the column) */}
			{visible.length > 0 && (
				<div className="flex w-full items-start gap-[12px] max-sm:flex-col">
					{visible.map((a) => (
						// every card opens what it stands for (D1): the site's story, or a live headline's source page
						<ExampleArticle
							key={a.source + a.text}
							a={a}
							className="flex w-[28.792%] shrink-0 flex-col items-start gap-[8px] overflow-clip rounded-[12px] p-[12px] max-lg:w-auto max-lg:flex-1 max-sm:w-full max-sm:flex-none"
						>
							<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
								<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">{a.source}</p>
								{/* the label starts at the chip's 8px padding, as Figma's hug chip places its text box */}
								<div className="flex shrink-0 items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[8px] py-[3px]" style={{ width: TONE_WIDTH[a.tone] }}>
									<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[#819abb]">{a.tone}</p>
								</div>
							</div>
							{/* 173 of the 181 inner width, growing downwards like the frame's text box */}
							<p className="w-[calc(100%-8px)] font-geist text-[12px] leading-[16px] text-[#f2f6fc]">{a.text}</p>
						</ExampleArticle>
					))}
				</div>
			)}
		</Card>
	);
}

/**
 * An article card (2:6376 / 2:6382) that opens what it stands for (D1): one of the site's own stories opens its article at
 * once, a live headline its source page in a new tab. A plain frame in Figma: the cursor and the canvas's focus ring only.
 */
function ExampleArticle({ a, className, children }: { a: StockArticle; className: string; children: ReactNode }) {
	const style = { background: INNER };
	if (a.story)
		return (
			<Link to="/news/$id" params={{ id: a.story }} viewTransition={false} className={cn(className, "cursor-pointer")} style={style}>
				{children}
			</Link>
		);
	if (a.url)
		return (
			<a href={a.url} target="_blank" rel="noopener noreferrer" className={cn(className, "cursor-pointer")} style={style}>
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

/** Compare and learn's disclosure: open or folded, its toggle, and the id of the panel it controls. */
type CompareState = { open: boolean; toggle: () => void; id: string };

/**
 * The blocks of both columns, each exactly as the frame draws it, in no particular order: `ExampleDetail` places them.
 * Each carries a key (the chart's names the stock too, so another symbol starts on its own range): the content column
 * keeps its blocks across the reflow at 1024 by those keys.
 */
function cards(stock: StockDetailData, saved: boolean, onToggleSaved: () => void, onPracticeBuy: () => void, compare: CompareState): Cards {
	const an = stock.analyst;
	return {
		/* "Frame" 2:6316: ticker line, price, today's move, 4 apart; the ticker line names the page (h1 for assistive tech) */
		price: (
			<div key="price" className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
				<h1 className="font-geist text-[12px] leading-[16px] text-[#819abb]">{stock.ticker}</h1>
				<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{stock.price}</p>
				{/* the day's move by its sign (tone.ts): green rising, red falling, the label grey at 0.0 %; a company without a
				    price says so in words where the move would stand (N30.8c) */}
				<p className={cn("font-geist text-[13px] font-medium leading-[17px]", signText(stock.change))}>{stock.priced ? stock.change : NO_PRICE.header}</p>
			</div>
		),

		chart: <ExampleChart key={`chart:${stock.symbol}`} stock={stock} />,

		/* "Since you saved" 2:6331 (px 16, py 14, 12 apart; the body a fixed 326 box that wraps). The frame draws the saved
		   state; the unsaved one names the stock the way the product's "Save intro" does (NOT SAVED YET, the outline glyph) */
		intro: (
			<Card key="intro" className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				{/* "Frame" 2:6332: 16 tall (the +4.6% line box), in both states, so the card keeps Figma's 84 and nothing below moves */}
				<div className="flex h-[16px] items-center gap-[8px] overflow-clip">
					<img alt="" src={saved ? X.bookmarkSaved : X.bookmark} className="size-[12px] shrink-0" />
					<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
						{saved ? stock.saveIntro.saved : stock.saveIntro.unsaved}
					</p>
					{/* the move since the save, by its sign (N20c: the frame draws the gain, "+4.6%" 2:6335; a loss is the price block's red) */}
					{saved && <p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", signText(stock.saveIntro.delta))}>{stock.saveIntro.delta}</p>}
				</div>
				<p className={cn("w-[45.787%] font-geist text-[11px] leading-[14px] text-[#819abb]", BOX_326)}>{stock.saveIntro.body}</p>
			</Card>
		),

		/* "Risk fit" 2:6338 */
		risk: (
			<Card key="risk" className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
					<h2 className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.risk.title}</h2>
					{/* "Badge · Matches you" 2:6341: the label in Figma's 66 box, 10px a side */}
					<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(93,168,191,0.12)] px-[10px] py-[4px]">
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#a6e4f7]" style={{ minWidth: stock.risk.badgeW }}>
							{stock.risk.badge}
						</p>
					</div>
				</div>
				<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: INNER }}>
					<img alt="" src={X.marker} className="absolute top-[-3px] size-[14px]" style={{ left: pct(stock.risk.markerLeft, RISK_TRACK) }} />
				</div>
				{/* "Frame" 2:6345: Low / High spaced out, each an auto-width box rounded up to a whole pixel (20 / 21), so "High"
				    ends on the track's right edge at Figma's 963 rather than Chrome's 20.88 run */}
				<div className="flex h-[14px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">
					<p className={FIT}>{stock.risk.low}</p>
					<p className={FIT}>{stock.risk.high}</p>
				</div>
				<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:whitespace-normal">{stock.risk.note}</p>
			</Card>
		),

		/* "Numbers that matter" 2:6349 (the stat tiles reveal the frame's hidden "Benchmarks" line 2:6364) */
		numbers: (
			<Card key="numbers" className="flex w-full flex-col items-start gap-[12px] whitespace-nowrap px-[16px] py-[14px]">
				<h2 className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.numbers.title}</h2>
				<StatGrid stats={stock.numbers.stats} footer={stock.numbers.footer} benchmarks={stock.numbers.benchmarks} inner={INNER} />
			</Card>
		),

		news: <ExampleNews key="news" stock={stock} />,

		/* "CTA card" 2:6390: Practice buy (the canon, 328 × 52), the 44px "Save" row, the cash line, 10 apart; the last
		   card of the stacked page, as the phone frames place Save / Practice buy */
		cta: (
			<Card key="cta" reflow="example-cta" className="flex w-full flex-col items-start gap-[10px] p-[16px]">
				{/* a company without a price cannot be bought: unavailable, with the reason where the cash line stands (N27n, N30.8c) */}
				<PrimaryButton onClick={onPracticeBuy} disabled={!!stock.cta.refusal}>
					{stock.cta.buy}
				</PrimaryButton>
				{/*
				 * "Save" 2:6393: 44 tall, r6, a 1px INSIDE stroke of white at 14 %, Sora 13 #819abb centred in Figma's 32 box. The
				 * button does what it says: Save, or Unsave once the stock is saved, as the product's saved frames print it
				 * (2:3891 / 2:3732; coordinator's ruling 2026-10-18: the EXAMPLE frames' "Save" under SINCE YOU SAVED is not
				 * followed). Its radius stays 6 under the ticket too (2:6393; 2:6568 draws 14, ruled the same day). A plain
				 * frame: no hover or pressed look.
				 */}
				<button
					type="button"
					onClick={onToggleSaved}
					className="flex h-[44px] w-full cursor-pointer items-center justify-center overflow-clip rounded-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
				>
					<span className={cn("whitespace-nowrap font-sora text-[13px] leading-[16px] text-[#819abb]", FIT)}>{saved ? stock.cta.unsave : stock.cta.save}</span>
				</button>
				<p className={cn("font-geist text-[11px] leading-[14px] text-[#819abb]", stock.cta.refusal ? "whitespace-normal" : "whitespace-pre max-lg:whitespace-pre-wrap")}>{stock.cta.refusal ?? stock.cta.cash}</p>
			</Card>
		),

		/* "Analyst view" 2:6396, unfolded (between Numbers that matter and News signal in the stacked page) */
		analyst: (
			<Card key="analyst" reflow="example-analyst" className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				<h2 className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{an?.title ?? "Analyst view"}</h2>
				{!an ? (
					<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">No analyst coverage yet</p>
				) : an.fund ? (
					// an index fund (N43a): analysts rate the companies it tracks, listed as links with their consensus
					<FundCompanies fund={an.fund} inner={INNER} />
				) : (
					<>
						{/* a card without targets (a company without a price, N39a / N43c): the caption in the range's place, no range,
						    no dot, no Low / Avg / High, no upside; the consensus and the firms' ratings below, as the product card */}
						{an.noTargets ? (
							<p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{an.noTargets}</p>
						) : (
							<>
						<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] tracking-[0.8px] text-[#819abb]">{an.rangeLabel}</p>
						{/* "Range track" 2:6399: the 180 fill (#5da8bf 55 %) and the "Ellipse" 2:6401 at 173 of the 328 track */}
						<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: INNER }}>
							<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[rgba(93,168,191,0.55)]" style={{ width: pct(an.rangeFill, RAIL_TRACK) }} />
							<img alt="" src={X.ellipse} className="absolute top-[-3px] size-[14px]" style={{ left: pct(an.rangeMarker, RAIL_TRACK) }} />
						</div>
						{/*
						 * "Frame" 2:6402: Low / Avg / High, spaced out. Each column hugs its figure (2:6403 / 2:6406 / 2:6409: 28 / 31 / 32
						 * wide, the figure's own box) and aligns its label left / centre / right. Figma's text boxes are left-aligned
						 * runs on whole pixels: the labels' boxes are their runs rounded up (Low 20, Avg 18, High 21, so Avg starts
						 * 6.5 into its column and High 11), the figures fill their column (so "$248" starts at the column's 1202.5,
						 * not centred by Chrome's 29.9 run); a live figure without authored boxes hugs its rounded-up run.
						 */}
						{/* on a computed card "Avg" stands under the end of the bar it names, clear of Low and High (N30.8e, StockDetail avgLeft) */}
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
									<p className={cn("text-left font-geist text-[12px] font-medium leading-[16px] text-[#f2f6fc]", !an.boxes && FIT)} style={an.boxes ? { width: an.boxes.cols[i] } : undefined}>
										{v}
									</p>
								</div>
							))}
						</div>
						<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", signText(an.upside))}>{an.upside}</p>
							</>
						)}
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{an.consensusLabel}</p>
						{/* "Consensus bar" 2:6414: the 212 fill of the 328 bar */}
						<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: INNER }}>
							<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[#2fd08a]" style={{ width: pct(an.consensusFill, RAIL_TRACK) }} />
						</div>
						{/* "Counts" 2:6416, spaced out in Figma's boxes (49 / 38 / 30) */}
						<div className="flex h-[16px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]">
							{an.counts.map((t, i) => (
								<p key={t} className={i === 0 ? "text-[#2fd08a]" : "text-[#819abb]"} style={{ minWidth: an.boxes?.counts[i] }}>
									{t}
								</p>
							))}
						</div>
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{an.recentLabel}</p>
						{/* the rows (38 tall, Goldman Sachs hugs at 34): the rating and target right-anchored in Figma's boxes */}
						{an.actions.map((a) => (
							<div
								key={a.firm}
								className={cn(
									"flex w-full items-center justify-between overflow-clip whitespace-nowrap rounded-[10px] px-[12px] py-[9px] font-geist font-medium max-lg:h-auto max-lg:min-h-[38px] max-lg:flex-wrap max-lg:gap-x-[12px] max-lg:gap-y-[8px] max-lg:whitespace-normal",
									!a.hug && "h-[38px]",
								)}
								style={{ background: INNER }}
							>
								<p className="text-[12px] leading-[16px] text-[#f2f6fc]">{a.firm}</p>
								<div className="flex items-center gap-[10px] overflow-clip">
									<p className={cn("text-[11px] leading-[14px]", a.rating === "Buy" ? "text-[#2fd08a]" : "text-[#819abb]")} style={{ minWidth: an.boxes?.rating[a.rating] }}>
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
			</Card>
		),

		/* "Compare teaser" 2:6446 (after News signal in the stacked page): Figma gives it no reaction and no destination frame,
		   and its "›" says it opens; every dropdown opens (D8, the user's 2026-11-06 ruling), so it is the product page's
		   disclosure into the phones' peer table (CompareCard.tsx), folded exactly as the frame draws it. The "›" keeps its
		   5-wide auto-width box at the card's right padding (2:6450, 1379), not Chrome's 4.88 run */
		compare: (
			<Card key="compare" reflow="example-compare" className={compare.open && stock.compare.table ? COMPARE_OPEN : COMPARE_FOLDED}>
				<CompareDisclosure
					title={stock.compare.title}
					sub={stock.compare.sub}
					table={stock.compare.table}
					open={compare.open && !!stock.compare.table}
					onToggle={compare.toggle}
					panelId={compare.id}
					chevron
					heading
					chevronClassName={FIT}
				/>
			</Card>
		),
	};
}

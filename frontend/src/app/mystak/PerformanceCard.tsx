import { Link } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";
import { signedPct } from "@/app/live/format";
import { hairline } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { ChartSlot, DataChartLine, FigmaChartLine } from "./ChartLine";
import { MS } from "./assets";
import { PERFORMANCE, RANGES, type Range, SHOWCASE } from "./data";
import { drawsBestWorst, type TodayFigures, useRangeFigures } from "./performance";

const GREEN = "text-[#2fd08a]";
const RED = "text-[#ff5a6a]";
/** the row's own muted colour (2:4800 / 2:4801), for a count that has no move to colour */
const MUTED = "text-[#819abb]";

/**
 * Figma 2:4804: the unselected tabs are text boxes as wide as their text rounded up (Geist 10.6061: 1D 11.43,
 * 1W 14.09, 1M 13.37, 3M 15.79, YTD 19.08, 1Y 10.18), 63px apart and centred; the selected one is the 34.47 x
 * 19.886 pill (2:4808), so the row lands where Figma puts it whichever tab is on.
 */
const TAB_WIDTH: Record<Range, number> = { "1D": 12, "1W": 15, "1M": 14, "3M": 16, YTD: 20, "1Y": 11 };
/** invisible reach around the small text tabs (the layout keeps Figma's boxes: the margins cancel the padding) */
const REACH_X = 8;
const REACH_Y = 3;
/**
 * Below 1024 the Best / Worst links (14 px tall: 65 x 14 and 75 x 14 at 390, the SMALL-AREAS review's R8 report) get an
 * invisible reach (coordinator ruling N36.3e; the ruling of 2026-10-31 allows an enlarged touch area for a target under
 * 24 px that changes no pixel): up over their label (the 13 px label and the 3 px gap) and 12 below, down to the card's
 * edge (the card keeps 12 of air under its last line), as wide as the link. It is an empty, hidden child of the link, so a
 * press on it is a press on the link. The link, its column and the row clip like Figma's frames; below 1024 they clip
 * SIDEWAYS ONLY (overflow-y visible), so the reach passes them up and down in every browser, and nothing they draw moves:
 * the clip that bites is sideways (a glyph's edge at a column's side: the 1W "Worst", the 1Y "Best over the past year"),
 * and nothing reaches past their tops or bottoms (measured at 390 x 844 and 320 x 568 on three ranges against the
 * rendering clipped on both axes). The LEFTOVERS review r2: the round before let the reach through every side with an
 * overflow-clip-margin, which WebKit (Safari, every iPhone's browser) does not implement, so on an iPhone the clips would
 * have cut it back to the 14 px link; and a clip with no sideways bite let those glyph edges through. 1024 and up: no reach,
 * the frames' clip, nothing changes.
 */
const MOVER_REACH = { top: 16, bottom: 12 } as const;

type Props = {
	range: Range;
	onRange: (range: Range) => void;
	/** every saved ticker */
	tickers: readonly string[];
	today: TodayFigures;
	/** the untouched demo persona: its 3M tab is the frame's own state */
	showcase: boolean;
};

/**
 * "Portfolio summary" (Figma 2:4793): the move across the saves over the selected range, the line, the range
 * tabs and the range's best and worst saves. Clicking a tab selects it (Figma's pill) and switches every figure
 * and the line to that range (sources in ./performance.ts: every range draws, D3).
 * Best and worst are named once two saves have figures (./performance.ts showsBestWorst, the phones' rule: android
 * MyStakScreen.kt:431-433, iOS MyStakView.swift:315-317); with fewer the card ends under its range tabs: no hairline
 * (2:4812) and no row, and the card is that much shorter (303.11 less the row's 30, the hairline's 0.884 and their
 * two 12 gaps), so it keeps the frame's 12 of air below its last line instead of an empty footer. While a range's
 * closes load for two or more saves the row stays, reading "—" (drawsBestWorst), so the card keeps its height.
 * Best and Worst each open their stock's page as a My STAK entry (MoverLine; the hunt's I-08, D1).
 * Below 1024 the card is positioned (`max-lg:relative`), so it paints over the glow of a button right above it in the
 * overview's one-column stack (Add more, when there is no "Your read"), as a later Figma layer covers an earlier one.
 */
export function PerformanceCard({ range, onRange, tickers, today, showcase }: Props) {
	const authored = showcase && range === SHOWCASE.performance.range;
	const f = useRangeFigures(range, tickers, today, authored);
	const sc = SHOWCASE.performance;
	const down = !authored && f.value !== null && f.value < 0;
	const value = authored ? sc.value : f.value === null ? PERFORMANCE.none : signedPct(f.value);
	const pair = authored || drawsBestWorst(f, tickers.length);
	// `symbol`: the saved company a row names (its page opens), or null while the row reads "—". The frame's own pair
	// (TSLA, SNOW) are saves of the showcase persona, so they open like any other
	const rows = authored
		? [
				{ key: "best", label: sc.best.label, ticker: sc.best.ticker, symbol: sc.best.ticker as string | null, change: sc.best.change as string | null, down: false, widths: sc.best.widths as readonly [number, number] | undefined },
				{ key: "worst", label: sc.worst.label, ticker: sc.worst.ticker, symbol: sc.worst.ticker as string | null, change: sc.worst.change as string | null, down: true, widths: sc.worst.widths as readonly [number, number] | undefined },
			]
		: [
				{ key: "best", label: PERFORMANCE.bestLabel(range), ticker: f.best?.ticker ?? PERFORMANCE.none, symbol: f.best?.ticker ?? null, change: f.best ? signedPct(f.best.changePercent) : null, down: (f.best?.changePercent ?? 0) < 0, widths: undefined },
				{ key: "worst", label: PERFORMANCE.worstLabel, ticker: f.worst?.ticker ?? PERFORMANCE.none, symbol: f.worst?.ticker ?? null, change: f.worst ? signedPct(f.worst.changePercent) : null, down: (f.worst?.changePercent ?? 0) < 0, widths: undefined },
			];

	return (
		<section
			aria-label={authored ? sc.eyebrow : PERFORMANCE.eyebrow(range)}
			aria-busy={f.status === "loading" && !authored}
			className={cn("flex w-full flex-col items-center justify-center gap-[12px] rounded-[12.467px] bg-[#181f30] max-lg:relative", pair ? "h-[303.11px]" : "h-[248.226px]")}
		>
			<div className="flex w-full flex-col items-start gap-[7px] pl-[18px]">
				<div className="flex items-center">
					<span className="whitespace-nowrap font-sora text-[10.606px] leading-[13px] text-[#819abb]">{authored ? sc.eyebrow : PERFORMANCE.eyebrow(range)}</span>
				</div>
				<p className="whitespace-nowrap font-sora text-[38.889px] font-semibold leading-[49px] tracking-[-0.3889px] text-white">{value}</p>
				<div className="flex items-center gap-[9px] whitespace-nowrap text-[12.374px] leading-[16px]">
					<span className={cn("font-geist font-medium", authored ? GREEN : f.value === null ? MUTED : down ? RED : GREEN)} style={authored ? { width: 98 } : undefined}>
						{authored ? sc.across : PERFORMANCE.across(f.count)}
					</span>
					<span className="w-[4px] font-sora text-[#819abb]">.</span>
					<span className="font-geist text-[#819abb]">{range}</span>
				</div>
			</div>
			<div className="flex w-full flex-col items-center gap-[35px]">
				<ChartSlot>{authored ? <FigmaChartLine src={MS.chartLine} /> : f.series ? <DataChartLine values={f.series} /> : null}</ChartSlot>
				<RangeTabs value={range} onChange={onRange} />
			</div>
			{pair && <div className="h-[0.884px] w-full bg-[#2a3346]" />}
			{pair && (
				// the row and its two columns clip like Figma's frames; while a mover has keyboard focus the clip widens by the
				// ring's reach (2px ring at a 2px offset), as the collection grid's does: resting pixels are unchanged. Below 1024
				// they clip sideways only (MOVER_REACH: the movers' reach passes them up and down), except while a mover has
				// keyboard focus: a clip margin only widens a box that clips on both axes, so they clip both ways again then and
				// the ring stays whole (the keyboard needs no reach)
				<div
					className="flex w-[calc(100%-21.818px)] items-center justify-between overflow-clip whitespace-nowrap max-lg:overflow-y-visible [&:has(:focus-visible)]:overflow-y-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]"
					data-mystak-bestworst=""
				>
					{rows.map(({ key, label, ticker, symbol, change, down: neg, widths }) => (
						<div key={key} className="flex flex-col items-start gap-[3px] overflow-clip max-lg:overflow-y-visible [&:has(:focus-visible)]:overflow-y-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]">
							<MoverLine focusKey={key} label={label} symbol={symbol}>
								<span className="font-sora text-[11.49px] font-semibold leading-[14px] text-white" style={widths ? { width: widths[0] } : undefined}>
									{ticker}
								</span>
								{change && (
									<span className={cn("font-geist text-[10.606px] font-medium leading-[14px]", neg ? RED : GREEN)} style={widths ? { width: widths[1] } : undefined}>
										{change}
									</span>
								)}
							</MoverLine>
						</div>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * One of the two movers under the chart (2:4815 best, 2:4820 worst): its label over the stock and its move. The stock
 * stands for an item, so it opens it (the hunt's I-08, coordinator ruling N27v, D1): the stock's page as a My STAK entry
 * (My STAK stays lit in the rail, the crumb reads "My STAK / TSLA", Back steps back here), at once like a collection
 * card's stock (phone 1:3723 -> 1:3846, instant). The link is the frame's own ticker-and-move line (no fill, no radius,
 * the same flex row): nothing changes at rest; the pointer and the canvas's keyboard focus ring only (no hover or
 * pressed look: Figma defines none). It is named by its label and its own words ("Best over 3 months CRWD +12.4%").
 * The phones draw both as plain text (android ui/mystak/MyStakScreen.kt:435-445): D1 makes them links on the web.
 * While a range has no figure yet the line reads "—" and is plain text.
 */
function MoverLine({ focusKey, label, symbol, children }: { focusKey: string; label: string; symbol: string | null; children: ReactNode }) {
	const id = useId();
	return (
		<>
			<span id={`${id}-label`} className="font-geist text-[9.722px] leading-[13px] text-[#5c6b85]">
				{label}
			</span>
			{symbol ? (
				<Link
					to="/stocks/$symbol"
					params={{ symbol }}
					search={{ saved: 1, from: "my-stak" }}
					viewTransition={false}
					id={`${id}-stock`}
					aria-labelledby={`${id}-label ${id}-stock`}
					data-mystak-focus={`mover:${focusKey}`}
					className="flex cursor-pointer items-center gap-[5px] overflow-clip max-lg:relative max-lg:overflow-y-visible"
				>
					{children}
					{/* the reach below 1024 (MOVER_REACH): empty, unseen and unread; a press on it is a press on the link */}
					<span
						aria-hidden="true"
						data-mystak-reach=""
						className="absolute hidden max-lg:block"
						style={{ inset: `${-MOVER_REACH.top}px 0 ${-MOVER_REACH.bottom}px` }}
					/>
				</Link>
			) : (
				<span className="flex items-center gap-[5px] overflow-clip">{children}</span>
			)}
		</>
	);
}

/**
 * "Range tabs" (Figma 2:4804): real buttons, 63px apart and centred like the frame's row. The selected one draws
 * 2:4808 (fill #2C9DBC at 16%, a 0.6629 INSIDE stroke #2C9DBC at 40%, radius 9.943, Geist Medium #69B3CA trimmed to
 * its cap height); the others are 2:4805's Geist Regular #819ABB. Figma defines no hover or pressed look and no
 * transition for them (no variants, no "change to", no motion), so a click moves the pill at once; the keyboard
 * focus ring is the app's shared one.
 *
 * Below 1024 (SPEC R5: a row of tabs whose wrapping would break its meaning) the six tabs keep their sizes and their
 * order and stay in one line: the 63 gap gives way only as far as the card needs (the tabs' 112 and five gaps inside
 * the card's 18 margins: 63 down to 24, which still fits a 290 column), and should a column ever be narrower than that
 * the row scrolls sideways inside the card (scrollbar hidden, 4px of room kept for the focus rings), never the page.
 */
function RangeTabs({ value, onChange }: { value: Range; onChange: (range: Range) => void }) {
	return (
		<div
			role="group"
			aria-label={PERFORMANCE.group}
			className="flex w-full items-center justify-center gap-[63px] max-lg:-my-[4px] max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:px-[18px] max-lg:py-[4px] max-lg:[column-gap:clamp(24px,(100%_-_112px)/5,63px)] max-lg:[justify-content:safe_center] max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden"
		>
			{RANGES.map((r) => {
				const on = r === value;
				return (
					<button
						key={r}
						type="button"
						data-mystak-focus={`range:${r}`}
						aria-pressed={on}
						onClick={() => onChange(r)}
						className={cn(
							"flex shrink-0 cursor-pointer items-center justify-center",
							on ? "h-[19.886px] w-[34.47px] rounded-[9.943px] bg-[rgba(44,157,188,0.16)]" : "rounded-[6px]",
						)}
						style={
							on
								? { boxShadow: hairline(0.6629, "rgba(44,157,188,0.4)") }
								: {
										width: TAB_WIDTH[r] + 2 * REACH_X,
										height: 14 + 2 * REACH_Y,
										margin: `${-REACH_Y}px ${-REACH_X}px`,
									}
						}
					>
						{on ? (
							<span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] whitespace-nowrap text-center font-geist text-[10.606px] font-medium text-[#69b3ca]">
								{r}
							</span>
						) : (
							<span className="whitespace-nowrap text-center font-geist text-[10.606px] leading-[14px] text-[#819abb]">{r}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

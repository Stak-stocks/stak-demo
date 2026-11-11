import { useState } from "react";
import { cn } from "@/lib/utils";
import { S, SL } from "./assets";
import { ChartLine } from "./ChartLine";
import type { StockDetailData } from "./data";
import { CHART_BOX, chartPoints, useStockChart } from "./live";
import { type Band, plotBand, useHeaderBoxes } from "./plot";
import { signText } from "./tone";
import { MORPH } from "./transitions";

/** Figma's widths for the range buttons (label box = text width rounded, plus 10px a side); the label starts at the 10px padding. */
const RANGE_WIDTH: Record<string, number> = { "1D": 33, "1W": 36, "1M": 35, "1Y": 31 };
/** The range in words, for the screen-reader status line. */
const RANGE_NAME: Record<string, string> = { "1D": "1 day", "1W": "1 week", "1M": "1 month", "3M": "3 month", YTD: "year to date", "1Y": "1 year" };

/** The card (2:3461): 744 x 220 in the frames; its height is fixed, its width the column's. */
const CARD = { width: 744, height: 220 } as const;
/** "Vector" 2:3462: the line's 692 x 122 box at (13, 60) of the card, 39 short of its right edge at every width. */
const VECTOR = { left: 13, top: 60, inset: CARD.width - CHART_BOX.width } as const;

/** What the chart card says for a company without a price (N30.8c): under the price dash, and where the line would be. */
export const NO_PRICE = {
	header: "No price right now",
	plot: (symbol: string) => `There is no price history to draw for ${symbol} until it has a price.`,
} as const;

type Props = {
	stock: StockDetailData;
	/** the card's fill (#181f30, or #0e1a36 under the ticket) */
	card: string;
	/** the selected range button's fill (Figma: the card's own #181f30, #12203e under the ticket) */
	selected: string;
};

/**
 * "Performance chart" (Figma 2:3461 et al.): a 744 × 220 card, r16. The price block sits at (40, 20), the line in the
 * 692 × 122 box at (13, 60), the range row's left edge 178px in from the card's right (566 at 744). The range buttons
 * are a real choice: the clicked one takes the selected fill and white label, and the line redraws that range (see
 * `useStockChart` for where each range's closes come from).
 *
 * The vector's box reaches 44 px up into the price block (the ticker line at y 20, the price to 83, the day's move to
 * 104). Figma's own line passes under the figures; a LIVE series uses the whole box whenever it clears them too, and
 * otherwise has its top lowered just enough to stay 8 px under the texts it passes by (N20b, plot.ts): a rising line
 * keeps the frame's full height, a falling one sits under the header. The texts are measured as drawn, so the rule holds
 * for every company's price, at every width.
 *
 * The box's bottom edge is the top edge of the range row (y 182), whose labels start 4 px lower: a live series that is
 * at its low over the row has its bottom raised just enough to keep the same 8 px above the row (review r2b, low 3;
 * ruling N33h; plot.ts `plotBand`), and a line that passes high over the tabs keeps the box's bottom edge. Figma's own
 * line is not touched.
 *
 * The card's ref is attached in both of its looks (with and without a price), and the header is measured again whenever
 * its texts are not the ones measured last (plot.ts `useHeaderBoxes`): a card that first paints without a price and gets
 * one later measures the header it then draws (review r2b, low 7).
 */
export function PerformanceChart({ stock, card, selected }: Props) {
	const [range, setRange] = useState(stock.activePeriod);
	const line = useStockChart(stock.symbol, range, stock.activePeriod, stock.design);
	const [cardRef, header] = useHeaderBoxes<HTMLDivElement>("[data-chart-figures] > p", CARD.height, "[data-chart-ranges]");
	/*
	 * A company without a price (N30.8c; the hunt's CH-01, VIS-02 and C-20: 256 catalog companies have no demo quote while
	 * the STAK API is down): the card says so in words, in its own caption styles (the day's-move line under the price
	 * dash, the ticker line's style in the plot), and offers no range tabs, since there is no line for them to switch.
	 * Before, it was 190 px of nothing under two dashes, with four tabs that took the pressed look and changed nothing, and
	 * its only message was for screen readers.
	 */
	if (!stock.priced) {
		return (
			<div ref={cardRef} className={cn("relative h-[220px] w-full overflow-clip rounded-[16px]", MORPH.chart)} style={{ background: card }}>
				<div data-chart-figures="" className="absolute left-[40px] top-[20px] flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
					<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{stock.ticker}</p>
					<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">
						<span aria-hidden="true">{stock.price}</span>
						<span className="sr-only">No price</span>
					</p>
					<p className="font-geist text-[13px] font-medium leading-[17px] text-[#819abb]">{NO_PRICE.header}</p>
				</div>
				<p data-chart-empty="" className="absolute inset-x-[40px] top-[130px] whitespace-normal font-geist text-[12px] leading-[16px] text-[#819abb]">
					{NO_PRICE.plot(stock.symbol)}
				</p>
			</div>
		);
	}
	// where the series is drawn in the vector's box: all of it, or the band that clears the header above and the tabs below
	const band: Band =
		line.kind === "live"
			? plotBand(line.closes, { left: VECTOR.left, top: VECTOR.top, width: (header?.width ?? CARD.width) - VECTOR.inset, height: CHART_BOX.height }, header?.boxes ?? [], header?.under ?? [])
			: { top: 0, height: CHART_BOX.height };
	return (
		<div ref={cardRef} className={cn("relative h-[220px] w-full overflow-clip rounded-[16px]", MORPH.chart)} style={{ background: card }}>
			{/* the frames' own line (2:3462), or the loading frame's dimmed one (2:2145) while a range is on its way */}
			{(line.kind === "design" || line.kind === "loading") && <ChartLine src={line.kind === "design" ? S.chart : SL.chartDim} />}
			{line.kind === "live" && (
				// the closes in the vector's box and stroke (#5da8bf, 2.5, centred), in the band that clears the header and the
				// range row (`band`: the whole 122 on the box's bottom edge for a line that passes under the figures and high
				// over the tabs); the stroke keeps its width when the card stretches
				<svg
					aria-hidden="true"
					data-chart-line="live"
					data-plot-height={band.height}
					data-plot-top={band.top}
					className="absolute left-[13px] top-[60px] h-[122px] w-[calc(100%-52px)] overflow-visible"
					viewBox={`0 0 ${CHART_BOX.width} ${CHART_BOX.height}`}
					preserveAspectRatio="none"
				>
					<polyline
						points={chartPoints(line.closes, CHART_BOX.width, band.height, band.top)}
						fill="none"
						stroke="#5da8bf"
						strokeWidth={2.5}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
			)}
			{/* "Frame" 2:3463 clips its content; the clip widens 4px only while a range button has keyboard focus, so the canvas's
			    2px ring at 2px offset shows whole (it was cut to two arcs), with the resting pixels unchanged */}
			<div role="group" aria-label="Chart range" data-chart-ranges="" className="absolute left-[calc(100%-178px)] top-[182px] flex items-start gap-[8px] overflow-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]">
				{stock.periods.map((per) => {
					const on = per === range;
					return (
						<button
							key={per}
							type="button"
							aria-pressed={on}
							onClick={() => setRange(per)}
							// plain frames in Figma (2:3464 … 2:3470: no variant, no hover / pressed state, no reaction): the cursor and the
								// canvas's keyboard focus ring are their only responses; the selected look is the state itself
								className="flex cursor-pointer items-start overflow-clip rounded-[8px] px-[10px] py-[4px]"
							style={{ width: RANGE_WIDTH[per], ...(on ? { background: selected } : {}) }}
						>
							<span className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", on ? "text-[#f2f6fc]" : "text-[#819abb]")}>
								{per}
							</span>
						</button>
					);
				})}
			</div>
			{/* the price block (Figma 2:3461: 84 tall at 40, 20) is the frames' plain text whatever line is drawn (no halo): a
			    live series is kept clear of it, Figma's own line passes below the figures. The day's move takes its colour from
			    its sign (tone.ts): green rising, red falling, the label grey at 0.0 % and for a company with no quote ("—") */}
			<div data-chart-figures="" className="absolute left-[40px] top-[20px] flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
				<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{stock.ticker}</p>
				<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{stock.price}</p>
				<p className={cn("font-geist text-[13px] font-medium leading-[17px]", signText(stock.change))}>{stock.change}</p>
			</div>
			<p className="sr-only" aria-live="polite">
				{line.kind === "none" ? `No ${RANGE_NAME[range] ?? range} price history to show` : line.kind === "loading" ? `Loading ${RANGE_NAME[range] ?? range} prices` : ""}
			</p>
		</div>
	);
}

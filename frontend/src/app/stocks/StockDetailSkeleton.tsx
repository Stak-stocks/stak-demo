import type { ReactNode } from "react";
import { colPlus, useSizeClass } from "@/app/FitCanvas";
import { Bar } from "@/app/SidebarSkeleton";
import { GLOW_FILTER, GRADIENT, hairline } from "@/app/ui/Button";
import { SL as L } from "./assets";
import { ChartLine } from "./ChartLine";

const CARD = "flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[16px] bg-[#181f30] px-[16px] py-[14px]";

/** The eight blocks of the skeleton, built once and placed in the tree the window's size asks for. */
type Blocks = Record<"chart" | "intro" | "risk" | "numbers" | "news" | "cta" | "analyst" | "compare", ReactNode>;

/**
 * Figma 2:2113 "Desktop · Stock detail · Loading" (section 10 States). Back block at y 44, columns at y 160.
 * Below 1024 the skeleton reflows exactly as the page it stands for (StockDetail: one column of the blocks in the phone
 * frames' section order, which the loading frame 1:6360 orders the same way, RENDERED in that order; the back block goes
 * into flow on phones, with the crumb's 21px line box), so the page does not jump when its content arrives. The tree is
 * the page's too: the one column below 1024 is the content column of the two-column tree, the rail column is not
 * rendered there, the blocks are keyed (R10: nothing here holds state, but the skeleton and the page reflow alike).
 * From 1024 up the DOM is the approved one, element for element (the crumb's 21px line box is rendered on phones only).
 */
export function StockDetailSkeleton() {
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	const k = blocks();
	// the content column's blocks: the approved five from 1024 up, all eight in the phone frames' order below
	const main = compact ? [k.chart, k.intro, k.risk, k.numbers, k.analyst, k.news, k.compare, k.cta] : [k.chart, k.intro, k.risk, k.numbers, k.news];
	return (
		<div className="relative h-[936px] max-lg:h-auto max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-[24px]" style={{ width: colPlus(10) }} aria-busy="true">
			<div className="absolute left-[1px] top-[-44px] flex flex-col items-start gap-[31px] max-sm:static">
				<div className="size-[40px] rounded-[20px] bg-[#223050]" />
				{/* on a phone the block is in flow: the crumb bar sits in the line box of the crumb it stands for (BackCrumb:
				    Geist 16 / 21), so the cards land where the page's do (y 196 at 390, not 187); elsewhere the bar alone, as
				    the approved tree has it */}
				{size === "phone" ? (
					<div className="h-[21px]">
						<Bar w={94.32} h={11.55} />
					</div>
				) : (
					<Bar w={94.32} h={11.55} />
				)}
			</div>

			{/* in flow below 1024 the row needs its own width (left-0 / right-0 no longer size it): the root's, so the blocks'
			    w-full is the column and not the widest block (the 4 x 205 news row made the phone page 904 wide) */}
			<div className="absolute left-0 right-0 top-[72px] flex items-start justify-center gap-[40px] max-lg:static max-lg:w-full max-lg:pt-[72px] max-sm:pt-0">
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
		</div>
	);
}

/** The blocks of both columns, each as the loading frame draws it, in no particular order (keyed): the skeleton places them. */
function blocks(): Blocks {
	return {
		/* Performance chart */
		chart: (
			<div key="chart" className="relative h-[220px] w-full overflow-clip rounded-[16px] bg-[#181f30]">
				{/* "Vector" 2:2145: the performance line at 15 %, its stroke kept at 2.5 px as the card stretches */}
				<ChartLine src={L.chartDim} />
				<div className="absolute left-[calc(100%-178px)] top-[182px] flex items-start gap-[8px] overflow-clip">
					{[0, 1, 2, 3].map((k) => (
						<div key={k} className="flex items-start overflow-clip rounded-[8px] px-[10px] py-[4px]" style={k === 2 ? { backgroundColor: "#181f30" } : undefined}>
							<Bar w={28} h={8} />
						</div>
					))}
				</div>
				<div className="absolute left-[40px] top-[20px] flex flex-col items-start gap-[4px] overflow-clip">
					<Bar w={65.52} h={8.8} />
					<Bar w={100.8} h={12} />
					<Bar w={56.88} h={9.35} />
				</div>
			</div>
		),

		/* Save intro */
		intro: (
			<div key="intro" className="flex w-full flex-col items-start overflow-clip rounded-[16px] bg-[#181f30] px-[16px] py-[12px]">
				<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
					<div className="flex items-center gap-[8px] overflow-clip">
						<img alt="" src={L.bookmarkDim} className="size-[12px] shrink-0" />
						<Bar w={60.48} h={8} />
					</div>
				</div>
				{/* the body bar keeps inside the narrower compact card (the page's body wraps there): the card's width, never
				    wider than the frame's 355.68 */}
				<Bar w={355.68} h={8} className="max-lg:w-full! max-lg:max-w-[355.68px]" />
			</div>
		),

		/* Risk fit */
		risk: (
			<div key="risk" className={CARD}>
				<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
					<Bar w={38.88} h={10.45} />
					<div className="flex items-start overflow-clip rounded-[999px] bg-[#223050] px-[10px] py-[4px]">
						<Bar w={47.52} h={8} />
					</div>
				</div>
				<div className="relative h-[8px] w-full overflow-clip rounded-[4px] bg-[#293144]">
					<img alt="" src={L.marker} className="absolute left-[12.3596%] top-[-3px] size-[14px]" />
				</div>
				<div className="flex h-[14px] w-full items-start justify-between overflow-clip">
					<Bar w={28} h={8} />
					<Bar w={28} h={8} />
				</div>
				<Bar w={175.68} h={8} />
			</div>
		),

		/* Numbers that matter */
		numbers: (
			<div key="numbers" className={CARD}>
				<Bar w={116.64} h={10.45} />
				<div className="flex w-full items-start gap-[8px] overflow-clip">
					<StatCell bars={[[28.8, 8], [28, 11.55], [28, 8]]} />
					<StatCell bars={[[54, 8], [28.08, 11.55], [28, 8]]} />
					<StatCell bars={[[43.2, 8], [38.16, 11.55], [31.68, 8]]} outlined />
				</div>
				<Bar w={234.72} h={12} />
				<Bar w={139.68} h={8} />
			</div>
		),

		/* News signal (after Analyst view in the stacked page; its cards keep Figma's 205 there) */
		news: (
			<div key="news" className={CARD}>
				<Bar w={67.68} h={10.45} />
				<Bar w={107.28} h={8} />
				<Bar w={234.72} h={8} />
				<Bar w={234.72} h={8} />
				<div className="flex w-full items-start gap-[12px]">
					{[
						[50.4, 28],
						[41.76, 28],
						[64.08, 28],
						[60.48, 30.96],
					].map(([source, chip], k) => (
						<div key={k} className="flex w-[28.792%] shrink-0 flex-col items-start gap-[8px] overflow-clip rounded-[12px] bg-[#181f30] p-[12px] max-lg:w-[205px]">
							<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
								<Bar w={source} h={8} />
								<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[8px] py-[3px]">
									<Bar w={chip} h={8} />
								</div>
							</div>
							<Bar w={124.56} h={12} />
						</div>
					))}
				</div>
			</div>
		),

		/* CTA card (the last block of the stacked page, as the phone frames place Save / Practice buy) */
		cta: (
			<div key="cta" className="flex w-full flex-col items-start gap-[10px] overflow-clip rounded-[16px] bg-[#181f30] p-[16px]">
				<div className="flex w-full flex-col items-start gap-[10px]">
					<div className="stak-stroke h-[52px] w-full rounded-[6px]" style={{ backgroundImage: GRADIENT, filter: GLOW_FILTER }} />
					<div className="stak-stroke flex h-[52px] w-full items-center justify-center overflow-clip rounded-[6px]" style={{ filter: GLOW_FILTER }}>
						<Bar w={59.04} h={11.55} />
					</div>
				</div>
				<Bar w={95.04} h={8} />
			</div>
		),

		/* Analyst view (between Numbers that matter and News signal in the stacked page) */
		analyst: (
			<div key="analyst" className={CARD}>
				<div className="flex w-full items-start justify-between">
					<Bar w={70.56} h={10.45} />
					<img alt="" src={L.caretA} className="size-[20px] shrink-0" />
				</div>
				<Bar w={51.84} h={8} />
			</div>
		),

		/* Compare teaser (after News signal in the stacked page) */
		compare: (
			<div key="compare" className="flex h-[52px] w-full items-center justify-between overflow-clip rounded-[16px] bg-[#181f30] px-[16px] py-[14px]">
				<div className="flex flex-col items-start gap-[2px] overflow-clip">
					<Bar w={98.64} h={9.9} />
					<Bar w={64.08} h={8} />
				</div>
				<img alt="" src={L.caretB} className="size-[20px] shrink-0" />
			</div>
		),
	};
}

function StatCell({ bars, outlined }: { bars: [number, number][]; outlined?: boolean }) {
	return (
		<div
			className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip rounded-[12px] bg-[#181f30] p-[10px]"
			style={outlined ? { boxShadow: hairline(1, "#212d4b") } : undefined}
		>
			{bars.map(([w, h], k) => (
				<Bar key={k} w={w} h={h} />
			))}
		</div>
	);
}

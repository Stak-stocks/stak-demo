import { type CSSProperties, type ReactNode, useState } from "react";
import { colPlus } from "@/app/FitCanvas";
import { PrimaryButton } from "@/app/ui/Button";
import { ExampleTopBar } from "@/app/ui/ExampleTopBar";
import { cn } from "@/lib/utils";
import { S } from "./assets";
import type { StockDetailData } from "./data";
import { StatGrid } from "./StatGrid";

export type ExampleDetailProps = {
	stock: StockDetailData;
	saved: boolean;
	onToggleSaved: () => void;
	onPracticeBuy: () => void;
};

/** The example frames paint every card #0e1a36 with #12203e insets (the product frames' ticket palette). */
const CARD = "#0e1a36";
const INNER = "#12203e";
const RAIL_TRACK = 328;
const RISK_TRACK = 712;

/** A px offset authored on a track of the given width, kept at the same fraction when the track stretches. */
const pct = (px: number, of: number) => `${((px / of) * 100).toFixed(4)}%`;

/**
 * Figma 2:6311 "EXAMPLE · Desktop · Stock detail · Saved (two-column)", 1440 × 1128: the breadcrumb
 * top bar, the price block above the chart, the chart's range chips top-left, and the analyst view
 * always unfolded in the rail. Two columns of 744 + 40 + 360 from (256, 88), on the live detail data.
 * `/stocks/$symbol?variant=example`; the product frames keep their own layout.
 */
export function ExampleDetail({ stock, saved, onToggleSaved, onPracticeBuy }: ExampleDetailProps) {
	return (
		<>
			<ExampleTopBar crumb={`Discover  /  ${stock.symbol}`} />
			<div className="flex min-h-[1040px] items-start justify-center gap-[40px]" style={{ width: colPlus(10) }}>
				<ContentColumn stock={stock} saved={saved} />
				<ActionRail stock={stock} saved={saved} onToggleSaved={onToggleSaved} onPracticeBuy={onPracticeBuy} />
			</div>
		</>
	);
}

function Card({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
	return (
		<div className={cn("overflow-clip rounded-[16px]", className)} style={{ background: CARD, ...style }}>
			{children}
		</div>
	);
}

function ContentColumn({ stock, saved }: { stock: StockDetailData; saved: boolean }) {
	const down = stock.change.startsWith("▼");
	// "Frame 4": one dot per headline, the filled one marks the last article in view; a dot brings its pair into view
	const [startAt, setStart] = useState(0);
	const articles = stock.news.articles;
	// a refresh can bring fewer headlines than the pair in view: keep the window inside the list
	const start = Math.max(0, Math.min(startAt, articles.length - 2));
	const visible = articles.slice(start, start + 2);
	return (
		<div className="flex min-w-0 flex-col items-start gap-[14px] overflow-clip" style={{ flex: "744 1 0" }}>
			<div className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
				<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{stock.ticker}</p>
				<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{stock.price}</p>
				<p className={cn("font-geist text-[13px] font-medium leading-[17px]", down ? "text-[#e5484d]" : "text-[#2fd08a]")}>{stock.change}</p>
			</div>

			{/* Performance chart: the line from the card's top edge, the range chips at (20, 16) */}
			<Card className="relative h-[220px] w-full">
				<img alt="" src={S.chart} className="absolute left-0 top-[-1.31px] h-[124.49px] w-[calc(100%-52px)] max-w-none" />
				<div className="absolute left-[20px] top-[16px] flex items-start gap-[8px] overflow-clip">
					{stock.periods.map((per) => {
						const on = per === stock.activePeriod;
						return (
							<button
								key={per}
								type="button"
								aria-pressed={on}
								className="stak-press flex cursor-pointer items-start overflow-clip rounded-[8px] px-[10px] py-[4px]"
								style={on ? { background: INNER } : undefined}
							>
								<span className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", on ? "text-[#f2f6fc]" : "text-[#819abb]")}>{per}</span>
							</button>
						);
					})}
				</div>
			</Card>

			{/* Since you saved (2:6331): the saved frame's card; the unsaved look follows the product's "NOT SAVED YET" row */}
			{saved ? (
				<Card className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
					<div className="flex items-center gap-[8px] overflow-clip">
						<img alt="" src={S.bookmarkSaved} className="size-[12px]" />
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{stock.saveIntro.saved}</p>
						<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#2fd08a]">{stock.saveIntro.delta}</p>
					</div>
					<p className="w-[45.787%] font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.saveIntro.body}</p>
				</Card>
			) : (
				<Card className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
					<div className="flex items-center gap-[8px] overflow-clip">
						<img alt="" src={S.bookmark} className="size-[12px]" />
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{stock.saveIntro.unsaved}</p>
					</div>
					<p className="w-[45.787%] font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.saveIntro.body}</p>
				</Card>
			)}

			{/* Risk fit */}
			<Card className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
					<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.risk.title}</p>
					<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(93,168,191,0.12)] px-[10px] py-[4px]">
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#a6e4f7]">{stock.risk.badge}</p>
					</div>
				</div>
				<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: INNER }}>
					<img alt="" src={S.marker} className="absolute top-[-3px] size-[14px]" style={{ left: pct(stock.risk.markerLeft, RISK_TRACK) }} />
				</div>
				<div className="flex h-[14px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">
					<p>{stock.risk.low}</p>
					<p>{stock.risk.high}</p>
				</div>
				<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.risk.note}</p>
			</Card>

			{/* Numbers that matter */}
			<Card className="flex w-full flex-col items-start gap-[12px] whitespace-nowrap px-[16px] py-[14px]">
				<p className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.numbers.title}</p>
				<StatGrid stats={stock.numbers.stats} footer={stock.numbers.footer} benchmarks={stock.numbers.benchmarks} inner={INNER} />
			</Card>

			{/* News signal: two headlines, the dots, two article cards in view */}
			<Card className="relative flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.news.title}</p>
				<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", stock.news.move.startsWith("▼") ? "text-[#e5484d]" : "text-[#2fd08a]")}>{stock.news.move}</p>
				{stock.news.lines.map((l) => (
					<p key={l} className="w-[45.787%] truncate font-geist text-[11px] leading-[14px] text-[#819abb]">
						{l}
					</p>
				))}
				{articles.length > 0 && (
					<div className="absolute left-[39.1129%] top-[101px] flex items-center gap-[4px]" role="group" aria-label="Headlines">
						{articles.map((a, i) => {
							const on = i === Math.min(start + 1, articles.length - 1);
							return (
								<button
									key={a.source + a.text}
									type="button"
									aria-label={`Headline ${i + 1} of ${articles.length}`}
									aria-current={on ? "true" : undefined}
									onClick={() => setStart(Math.max(0, Math.min(i - 1, articles.length - 2)))}
									className={cn("size-[8px] cursor-pointer rounded-[200px]", on ? "bg-[#d9d9d9]" : "border border-solid border-white")}
								/>
							);
						})}
					</div>
				)}
				{visible.length > 0 ? (
					<div className="flex w-full items-start gap-[12px]">
						{visible.map((a) => (
							<div key={a.source + a.text} className="flex w-[28.792%] shrink-0 flex-col items-start gap-[8px] overflow-clip rounded-[12px] p-[12px]" style={{ background: INNER }}>
								<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
									<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">{a.source}</p>
									<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[8px] py-[3px]">
										<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[#819abb]">{a.tone}</p>
									</div>
								</div>
								<p className="line-clamp-3 w-[calc(100%-8px)] font-geist text-[12px] leading-[16px] text-[#f2f6fc]">{a.text}</p>
							</div>
						))}
					</div>
				) : (
					<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">No fresh headlines today.</p>
				)}
			</Card>
		</div>
	);
}

function ActionRail({ stock, saved, onToggleSaved, onPracticeBuy }: ExampleDetailProps) {
	const an = stock.analyst;
	return (
		<div className="flex min-w-0 flex-col items-start gap-[14px] overflow-clip" style={{ flex: "360 1 0" }}>
			{/* CTA card: Practice buy (the canon), the 44px Save row, the cash line */}
			<Card className="flex w-full flex-col items-start gap-[10px] p-[16px]">
				<PrimaryButton onClick={onPracticeBuy}>{stock.cta.buy}</PrimaryButton>
				<button
					type="button"
					onClick={onToggleSaved}
					aria-pressed={saved}
					className="stak-press flex h-[44px] w-full cursor-pointer items-center justify-center overflow-clip rounded-[6px] border border-solid border-[rgba(255,255,255,0.14)] font-sora text-[13px] leading-[16px] text-[#819abb]"
				>
					{saved ? stock.cta.unsave : stock.cta.save}
				</button>
				<p className="whitespace-pre font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.cta.cash}</p>
			</Card>

			{/* Analyst view, unfolded */}
			<Card className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{an?.title ?? "Analyst view"}</p>
				{!an ? (
					<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">No analyst coverage yet</p>
				) : (
					<>
						<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] tracking-[0.8px] text-[#819abb]">{an.rangeLabel}</p>
						<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: INNER }}>
							<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[rgba(93,168,191,0.55)]" style={{ width: pct(an.rangeFill, RAIL_TRACK) }} />
							<img alt="" src={S.marker} className="absolute top-[-3px] size-[14px]" style={{ left: pct(an.rangeMarker, RAIL_TRACK) }} />
						</div>
						<div className="flex h-[30px] w-full items-start justify-between overflow-clip whitespace-nowrap">
							{[an.low, an.avg, an.high].map(([k, v], i) => (
								<div key={k} className={cn("flex flex-col gap-px overflow-clip", i === 0 ? "items-start" : i === 1 ? "items-center" : "items-end")}>
									<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{k}</p>
									<p className="font-geist text-[12px] font-medium leading-[16px] text-[#f2f6fc]">{v}</p>
								</div>
							))}
						</div>
						<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", an.upside.startsWith("↓") ? "text-[#e5484d]" : "text-[#2fd08a]")}>{an.upside}</p>
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{an.consensusLabel}</p>
						<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: INNER }}>
							<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[#2fd08a]" style={{ width: pct(an.consensusFill, RAIL_TRACK) }} />
						</div>
						<div className="flex h-[16px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]">
							{an.counts.map((t, i) => (
								<p key={t} className={i === 0 ? "text-[#2fd08a]" : "text-[#819abb]"}>
									{t}
								</p>
							))}
						</div>
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">{an.recentLabel}</p>
						{an.actions.map((a) => (
							<div
								key={a.firm}
								className={cn(
									"flex w-full items-center justify-between overflow-clip whitespace-nowrap rounded-[10px] px-[12px] py-[9px] font-geist font-medium",
									a.firm !== "Goldman Sachs" && "h-[38px]",
								)}
								style={{ background: INNER }}
							>
								<p className="text-[12px] leading-[16px] text-[#f2f6fc]">{a.firm}</p>
								<div className="flex items-center gap-[10px] overflow-clip">
									<p className={cn("text-[11px] leading-[14px]", a.rating === "Buy" ? "text-[#2fd08a]" : "text-[#819abb]")}>{a.rating}</p>
									<p className="text-[12px] leading-[16px] text-[#f2f6fc]">{a.target}</p>
								</div>
							</div>
						))}
					</>
				)}
			</Card>

			{/* Compare teaser */}
			<Card className="flex h-[52px] w-full items-center justify-between whitespace-nowrap px-[16px] py-[14px]">
				<div className="flex flex-col items-start gap-[2px] overflow-clip">
					<p className="font-sora text-[14px] font-semibold leading-[18px] text-[#f2f6fc]">{stock.compare.title}</p>
					<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.compare.sub}</p>
				</div>
				<p className="font-geist text-[14px] font-medium leading-[18px] text-[#819abb]">›</p>
			</Card>
		</div>
	);
}

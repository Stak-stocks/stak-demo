import { type CSSProperties, type ReactNode, useId } from "react";
import { BackCrumb } from "@/app/discover/BackCrumb";
import { GhostButton } from "@/app/discover/Button";
import { PrimaryButton } from "@/app/ui/Button";
import { colPlus } from "@/app/FitCanvas";
import { cn } from "@/lib/utils";
import { S } from "./assets";
import type { StockDetailData } from "./data";

export type StockDetailProps = {
	stock: StockDetailData;
	saved: boolean;
	open: boolean;
	/** the practice ticket is up: Figma paints every card #0e1a36 / #12203e in those frames */
	dim: boolean;
	from: "discover" | "my-stak";
	onBack: () => void;
	onToggleSaved: () => void;
	onToggleOpen: () => void;
	onPracticeBuy: () => void;
};

type Colors = { card: string; inner: string; track: string };

/** A px offset authored on a track of the given width, kept at the same fraction when the track stretches. */
const pct = (px: number, of: number) => `${((px / of) * 100).toFixed(4)}%`;

/**
 * Stock detail (Figma "Desktop · Stock detail · …", 1440 × 1200). Two columns, 744 + 40 + 360.
 * Entered from Discover the back block floats at (1, −44) and the columns start 72px into the
 * content box; entered from My STAK the same blocks flow top-down (back, 24px gap, columns).
 */
export function StockDetail(p: StockDetailProps) {
	const c: Colors = p.dim
		? { card: "#0e1a36", inner: "#12203e", track: "#12203e" }
		: { card: "#181f30", inner: "#181f30", track: "#293144" };
	const crumb = p.from === "my-stak" ? `My STAK  /  ${p.stock.symbol}` : `Discover  /  ${p.stock.symbol}`;
	const columns = (
		<div className="flex items-start justify-center gap-[40px]" style={{ width: colPlus(10) }}>
			<ContentColumn {...p} c={c} />
			<ActionRail {...p} c={c} />
		</div>
	);
	if (p.from === "my-stak") {
		return (
			<div className="flex min-h-[1112px] flex-col items-start gap-[24px]">
				<BackCrumb crumb={crumb} onBack={p.onBack} />
				{columns}
			</div>
		);
	}
	return (
		<div className="relative min-h-[1112px]">
			<BackCrumb crumb={crumb} onBack={p.onBack} className="absolute left-[1px] top-[-44px]" />
			<div className="absolute left-0 top-[72px]">{columns}</div>
		</div>
	);
}

function Card({ className, style, children, c }: { className?: string; style?: CSSProperties; children: ReactNode; c: Colors }) {
	return (
		<div className={cn("overflow-clip rounded-[16px]", className)} style={{ background: c.card, ...style }}>
			{children}
		</div>
	);
}

function ContentColumn({ stock, saved, c }: StockDetailProps & { c: Colors }) {
	return (
		<div className="flex min-w-0 flex-col items-start gap-[14px] overflow-clip" style={{ flex: "744 1 0" }}>
			{/* Performance chart */}
			<Card c={c} className="relative h-[220px] w-full">
				<img alt="" src={S.chart} className="absolute left-[13px] top-[58.69px] h-[124.49px] w-[calc(100%-52px)] max-w-none" />
				<div className="absolute left-[calc(100%-178px)] top-[182px] flex items-start gap-[8px] overflow-clip">
					{stock.periods.map((per) => {
						const on = per === stock.activePeriod;
						return (
							<button
								key={per}
								type="button"
								className="stak-press flex cursor-pointer items-start overflow-clip rounded-[8px] px-[10px] py-[4px]"
								style={on ? { background: c.inner } : undefined}
							>
								<span
									className={cn(
										"whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]",
										on ? "text-[#f2f6fc]" : "text-[#819abb]",
									)}
								>
									{per}
								</span>
							</button>
						);
					})}
				</div>
				<div className="absolute left-[40px] top-[20px] flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
					<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{stock.ticker}</p>
					<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{stock.price}</p>
					<p className={cn("font-geist text-[13px] font-medium leading-[17px]", stock.change.startsWith("▼") ? "text-[#e5484d]" : "text-[#2fd08a]")}>{stock.change}</p>
				</div>
			</Card>

			{/* Save intro */}
			{saved ? (
				<Card c={c} className="flex w-full flex-col items-start gap-[10px] px-[16px] py-[12px]">
					<div className="flex items-center gap-[8px] overflow-clip">
						<img alt="" src={S.bookmarkSaved} className="size-[12px]" />
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
							{stock.saveIntro.saved}
						</p>
						<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#2fd08a]">{stock.saveIntro.delta}</p>
					</div>
					<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.saveIntro.body}</p>
				</Card>
			) : (
				<Card c={c} className="flex w-full flex-col items-start px-[16px] py-[12px]">
					<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
						<div className="flex items-center gap-[8px] overflow-clip">
							<img alt="" src={S.bookmark} className="size-[12px]" />
							<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
								{stock.saveIntro.unsaved}
							</p>
						</div>
					</div>
					<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.saveIntro.body}</p>
				</Card>
			)}

			{/* Risk fit */}
			<Card c={c} className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
					<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.risk.title}</p>
					<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(93,168,191,0.12)] px-[10px] py-[4px]">
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#a6e4f7]">{stock.risk.badge}</p>
					</div>
				</div>
				<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: c.track }}>
					<img alt="" src={S.marker} className="absolute top-[-3px] size-[14px]" style={{ left: pct(stock.risk.markerLeft, 712) }} />
				</div>
				<div className="flex h-[14px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">
					<p>{stock.risk.low}</p>
					<p>{stock.risk.high}</p>
				</div>
				<p className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.risk.note}</p>
			</Card>

			{/* Numbers that matter */}
			<Card c={c} className="flex w-full flex-col items-start gap-[12px] whitespace-nowrap px-[16px] py-[14px]">
				<p className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.numbers.title}</p>
				<div className="flex w-full items-start gap-[8px] overflow-clip">
					{stock.numbers.stats.map((st) => (
						<div
							key={st.label}
							className={cn(
								"flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip rounded-[12px] p-[10px]",
								st.outlined && "shadow-[inset_0_0_0_1px_#212d4b]",
							)}
							style={{ background: c.inner }}
						>
							<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{st.label}</p>
							<p className="font-sora text-[17px] font-semibold leading-[21px] text-[#f2f6fc]">{st.value}</p>
							<p className={cn("font-geist text-[10px] font-medium leading-[13px]", st.good ? "text-[#2fd08a]" : "text-[#819abb]")}>
								{st.note}
							</p>
						</div>
					))}
				</div>
				<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{stock.numbers.footer}</p>
			</Card>

			{/* News signal */}
			<Card c={c} className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{stock.news.title}</p>
				<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", stock.news.move.startsWith("▼") ? "text-[#e5484d]" : "text-[#2fd08a]")}>{stock.news.move}</p>
				{stock.news.lines.map((l) => (
					<p key={l} className="w-[45.787%] truncate font-geist text-[11px] leading-[14px] text-[#819abb]">
						{l}
					</p>
				))}
				<div className="flex w-full items-start gap-[12px]">
					{stock.news.articles.map((a) => (
						<div
							key={a.source}
							className="flex w-[28.792%] shrink-0 flex-col items-start gap-[8px] overflow-clip rounded-[12px] p-[12px]"
							style={{ background: c.inner }}
						>
							<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
								<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">{a.source}</p>
								<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[8px] py-[3px]">
									<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[#819abb]">{a.tone}</p>
								</div>
							</div>
							<p className="line-clamp-3 w-[calc(100%-8px)] font-geist text-[12px] font-normal leading-[16px] text-[#f2f6fc]">{a.text}</p>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}

function ActionRail({ stock, saved, open, c, onToggleSaved, onToggleOpen, onPracticeBuy }: StockDetailProps & { c: Colors }) {
	const an = stock.analyst;
	// the analyst card's disclosure: both toggle buttons announce their state and name the panel they unfold
	const panelId = useId();
	return (
		<div className="flex min-w-0 flex-col items-start gap-[14px] overflow-clip" style={{ flex: "360 1 0" }}>
			{/* CTA card */}
			<Card c={c} className="flex w-full flex-col items-start gap-[10px] p-[16px]">
				<div className="flex w-full flex-col items-start gap-[10px]">
					{saved ? (
						<>
							<PrimaryButton onClick={onPracticeBuy}>{stock.cta.buy}</PrimaryButton>
							<GhostButton onClick={onToggleSaved}>{stock.cta.unsave}</GhostButton>
						</>
					) : (
						<>
							<PrimaryButton onClick={onToggleSaved}>{stock.cta.save}</PrimaryButton>
							<GhostButton onClick={onPracticeBuy}>{stock.cta.buy}</GhostButton>
						</>
					)}
				</div>
				<p className="whitespace-pre font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.cta.cash}</p>
			</Card>

			{/* Analyst view */}
			<Card c={c} className="flex w-full flex-col items-start gap-[12px] px-[16px] py-[14px]">
				{!an ? (
					<>
						<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">Analyst view</p>
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">No analyst coverage yet</p>
					</>
				) : open ? (
					<>
						<button type="button" onClick={onToggleOpen} aria-expanded={open} aria-controls={panelId} className="stak-press flex cursor-pointer items-start">
							<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{an.title}</p>
						</button>
						{/* display: contents — the panel's children stay the card's own flex items, so the layout is untouched */}
						<div id={panelId} className="contents">
							<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] tracking-[0.8px] text-[#819abb]">{an.rangeLabel}</p>
							<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: c.inner }}>
								<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[rgba(93,168,191,0.55)]" style={{ width: pct(an.rangeFill, 328) }} />
								<img alt="" src={S.marker} className="absolute top-[-3px] size-[14px]" style={{ left: pct(an.rangeMarker, 328) }} />
							</div>
							<div className="flex h-[30px] w-full items-start justify-between overflow-clip whitespace-nowrap">
								{[an.low, an.avg, an.high].map(([k, v], i) => (
									<div
										key={k}
										className={cn("flex flex-col gap-px overflow-clip", i === 0 ? "items-start" : i === 1 ? "items-center" : "items-end")}
									>
										<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{k}</p>
										<p className="font-geist text-[12px] font-medium leading-[16px] text-[#f2f6fc]">{v}</p>
									</div>
								))}
							</div>
							<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#2fd08a]">{an.upside}</p>
							<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
								{an.consensusLabel}
							</p>
							<div className="relative h-[8px] w-full overflow-clip rounded-[4px]" style={{ background: c.inner }}>
								<div className="absolute left-0 top-0 h-[8px] rounded-[4px] bg-[#2fd08a]" style={{ width: pct(an.consensusFill, 328) }} />
							</div>
							<div className="flex h-[16px] w-full items-start justify-between overflow-clip whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]">
								{an.counts.map((t, i) => (
									<p key={t} className={i === 0 ? "text-[#2fd08a]" : "text-[#819abb]"}>
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
										"flex w-full items-center justify-between overflow-clip whitespace-nowrap rounded-[10px] px-[12px] py-[9px] font-geist font-medium",
										a.firm !== "Goldman Sachs" && "h-[38px]",
									)}
									style={{ background: c.inner }}
								>
									<p className="text-[12px] leading-[16px] text-[#f2f6fc]">{a.firm}</p>
									<div className="flex items-center gap-[10px] overflow-clip">
										<p className={cn("text-[11px] leading-[14px]", a.rating === "Buy" ? "text-[#2fd08a]" : "text-[#819abb]")}>{a.rating}</p>
										<p className="text-[12px] leading-[16px] text-[#f2f6fc]">{a.target}</p>
									</div>
								</div>
							))}
						</div>
					</>
				) : (
					<>
						<button type="button" onClick={onToggleOpen} aria-expanded={open} aria-controls={panelId} className="stak-press flex w-full cursor-pointer items-start justify-between">
							<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{an.title}</p>
							<img alt="" src={S.caret} className="size-[20px] shrink-0" />
						</button>
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#2fd08a]">{an.upside}</p>
						{/* the folded panel: present for aria-controls, display: none so the card's gaps ignore it */}
						<div id={panelId} hidden />
					</>
				)}
			</Card>

			{/* Compare teaser */}
			<Card c={c} className="flex h-[52px] w-full items-center justify-between whitespace-nowrap px-[16px] py-[14px]">
				<div className="flex flex-col items-start gap-[2px] overflow-clip">
					<p className="font-sora text-[14px] font-semibold leading-[18px] text-[#f2f6fc]">{stock.compare.title}</p>
					<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{stock.compare.sub}</p>
				</div>
				{open ? (
					<p className="font-geist text-[14px] font-medium leading-[18px] text-[#819abb]">›</p>
				) : (
					<img alt="" src={S.caret} className="size-[20px] shrink-0" />
				)}
			</Card>
		</div>
	);
}

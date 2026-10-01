import { useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, LineChart, Sparkles } from "lucide-react";
import type { ChartRange, LiveMetrics, StockUpdateDto } from "@/lib/api";
import { usd } from "@/lib/simFormat";
import { rangeChangeText, type sinceSavedFor } from "@/lib/stockPage";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, DeskButton, deskFocus, deskPageBg } from "@/components/desktop/deskKit";
import { Sparkline } from "@/components/desktop/Sparkline";
import { AnalystCard, CompareCard, LessonCard, NewsSignalCard, NumbersCard, RiskAndWatch, SinceYouSavedCard } from "./StockModules";

const RANGES: ReadonlyArray<readonly [ChartRange, string]> = [["1d", "1D"], ["1w", "1W"], ["1m", "1M"], ["3m", "3M"], ["ytd", "YTD"], ["1y", "1Y"]];

function Logo({ src, name }: { src: string | null; name: string }) {
	const [failed, setFailed] = useState(false);
	return (
		<span className="grid h-[56px] w-[56px] shrink-0 place-items-center overflow-hidden rounded-[14px]" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }} aria-hidden="true">
			{src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-[38px] w-[38px] object-contain" /> : <span className="font-heading text-[22px] font-semibold" style={{ color: DESK.muted }}>{name.charAt(0).toUpperCase()}</span>}
		</span>
	);
}

export interface StockDesktopProps {
	symbol: string;
	name: string;
	logoSrc: string | null;
	/** "NVDA · in your Chips", or just the ticker. */
	subtitle: string;
	saved: boolean;
	/** Opened from a saved company: the page leads with "Since you saved" and its CTAs are Practice / Unsave. */
	held: boolean;
	canSave: boolean;
	fullNotice: boolean;
	price: number | null;
	asOf: string;
	shownPct: number | null;
	range: ChartRange;
	onRange: (r: ChartRange) => void;
	values: number[];
	chartPct: number | null;
	flatToday: boolean;
	chartPending: boolean;
	since: ReturnType<typeof sinceSavedFor>;
	changes: StockUpdateDto[];
	unreadOnEntry: Set<number>;
	metrics: LiveMetrics | undefined;
	changePct: number | null;
	onBack: () => void;
	onSave: () => void;
	onUnsave: () => void;
	onPractice: () => void;
	/** STAK AI with this stock as context. */
	onAskAi?: () => void;
}

/**
 * The stock page on desktop: the company and its actions across the top; the price and a large chart with the news
 * signal, numbers and comparison on the left; since-you-saved, risks, analysts and the lesson in a rail on the right.
 * Same modules, data and actions as the phone page (it renders the phone's own cards, sized for the desktop).
 */
export function StockDesktop(p: StockDesktopProps) {
	const up = (p.chartPct ?? 0) >= 0;
	const lineColor = up ? DESK.green : DESK.red;
	const moveColor = p.shownPct != null && p.shownPct < 0 ? DESK.red : DESK.green;
	const secondary = `flex h-[40px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-white/[0.06] ${deskFocus}`;

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<DesktopTopBar />

				<button type="button" onClick={p.onBack} className={`flex items-center gap-1 self-start rounded-md text-[12.5px] hover:text-white ${deskFocus}`} style={{ color: DESK.muted }}>
					<ArrowLeft className="h-[14px] w-[14px]" aria-hidden="true" /> Back
				</button>

				<header className="flex flex-wrap items-center gap-4">
					<Logo src={p.logoSrc} name={p.name} />
					<div className="min-w-0 flex-1">
						<h1 className="flex flex-wrap items-center gap-3 font-heading text-[28px] font-semibold leading-[36px] text-white">
							{p.name}
							{p.saved && (
								<span className="flex items-center gap-1 rounded-full px-3 py-[3px] text-[12px] font-medium" style={{ background: DESK.cyanSoft, color: DESK.cyan }}>
									<BookmarkCheck className="h-[13px] w-[13px]" aria-hidden="true" /> Saved
								</span>
							)}
						</h1>
						<p className="text-[13.5px]" style={{ color: DESK.muted }}>{p.subtitle}</p>
					</div>
					<div className="flex flex-col items-end gap-1">
						<div className="flex flex-wrap gap-2">
							{p.saved ? (
								<>
									<DeskButton onClick={p.onPractice}>
										<LineChart className="h-[15px] w-[15px]" aria-hidden="true" /> {p.held ? `Practice with ${p.name}` : "Practice buy"}
									</DeskButton>
									<button type="button" onClick={p.onUnsave} className={secondary} style={{ border: `1px solid ${DESK.border}` }}>Unsave</button>
								</>
							) : (
								<>
									<DeskButton onClick={p.onSave} disabled={!p.canSave}>
										<Bookmark className="h-[15px] w-[15px]" aria-hidden="true" /> Save
									</DeskButton>
									<button type="button" onClick={p.onPractice} className={secondary} style={{ border: `1px solid ${DESK.border}` }}>
										<LineChart className="h-[15px] w-[15px]" aria-hidden="true" /> Practice buy
									</button>
								</>
							)}
							{p.onAskAi && (
								<button type="button" onClick={p.onAskAi} className={secondary} style={{ border: `1px solid ${DESK.borderStrong}`, color: DESK.cyan }}>
									<Sparkles className="h-[15px] w-[15px]" aria-hidden="true" /> Ask STAK AI
								</button>
							)}
						</div>
						{p.fullNotice && <p role="status" className="text-[12px]" style={{ color: DESK.muted }}>Your STAK is full — remove a stock to save another</p>}
					</div>
				</header>

				{/* The phone's own cards (sized in figma units) render here at 1u = 1.05px. */}
				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start" style={{ ["--u" as string]: "1.05px" }}>
					<div className="flex min-w-0 flex-col gap-5">
						<section className="flex flex-col gap-4 rounded-[16px] p-6" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }} aria-label="Price">
							<div className="flex flex-wrap items-end justify-between gap-4">
								<div>
									<p className="min-h-[16px] text-[12px]" style={{ color: DESK.muted }}>{p.asOf}</p>
									<p className="font-heading text-[40px] font-semibold leading-[48px] tabular-nums text-white">{p.price != null ? usd(p.price) : "—"}</p>
									{p.shownPct != null && <p className="text-[14px] font-medium" style={{ color: moveColor }}>{rangeChangeText(p.shownPct, p.range)}</p>}
								</div>
								<div className="flex gap-1 rounded-[10px] p-1" role="group" aria-label="Chart range" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
									{RANGES.map(([key, label]) => {
										const on = key === p.range;
										return (
											<button
												key={key}
												type="button"
												aria-pressed={on}
												onClick={() => p.onRange(key)}
												className={`rounded-[8px] px-3 py-[5px] text-[12.5px] font-medium transition-colors ${deskFocus}`}
												style={on ? { background: DESK.cyanSoft, color: DESK.cyan, boxShadow: `inset 0 0 0 1px ${DESK.borderStrong}` } : { color: DESK.muted }}
											>
												{label}
											</button>
										);
									})}
								</div>
							</div>
							<div className="grid h-[280px] place-items-center">
								{p.flatToday ? (
									<p className="text-[13px]" style={{ color: DESK.muted }}>Not much movement yet today</p>
								) : p.values.length >= 2 ? (
									<Sparkline values={p.values} color={lineColor} strokeWidth={2} className="h-full w-full" />
								) : (
									<p className="text-[13px]" style={{ color: DESK.muted }}>{p.chartPending ? "" : "No price history for this range"}</p>
								)}
							</div>
						</section>

						<NewsSignalCard symbol={p.symbol} name={p.name} changePct={p.changePct} />
						<div className="grid gap-5 2xl:grid-cols-2">
							<NumbersCard symbol={p.symbol} metrics={p.metrics} />
							<CompareCard symbol={p.symbol} metrics={p.metrics} />
						</div>
					</div>

					<aside className="flex min-w-0 flex-col gap-5" aria-label={`More on ${p.name}`}>
						{p.held && <SinceYouSavedCard value={p.since.value} tone={p.since.tone} body={p.since.body} changes={p.changes} unreadOnEntry={p.unreadOnEntry} />}
						<RiskAndWatch symbol={p.symbol} />
						<AnalystCard symbol={p.symbol} name={p.name} price={p.price} />
						<LessonCard symbol={p.symbol} />
					</aside>
				</div>
			</div>
		</div>
	);
}

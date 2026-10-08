import { ArrowRight, ChevronRight, History, Plus, Sparkles } from "lucide-react";
import type { ChartRange, SandboxTrade, StockChartPoint } from "@/lib/api";
import type { Pick } from "@/hooks/usePaperPortfolio";
import { isUp, monthDayYear, sharesLabel, signedUsd, usd, versusWords } from "@/lib/simFormat";
import type { BrandSummary } from "@stak/shared";
import { BrandLogo } from "@/components/BrandLogo";
import { DESK, DeskButton, Panel, PanelHeader, SkeletonBar, changeColor, deskFocus, deskPageBg, signedPctLabel } from "@/components/desktop/deskKit";
import { ValueChart } from "@/components/desktop/ValueChart";

const RANGES: ReadonlyArray<readonly [ChartRange, string]> = [["1d", "1D"], ["1w", "1W"], ["1m", "1M"], ["3m", "3M"], ["ytd", "YTD"], ["1y", "1Y"]];

function Tile({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-[12px] p-4" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
			<span className="text-[12px]" style={{ color: DESK.muted }}>{label}</span>
			<span className="truncate font-heading text-[18px] font-semibold tabular-nums" style={{ color }}>{value}</span>
		</div>
	);
}

/**
 * One practice holding on desktop: what it has made since it was bought, its price chart, how it did this week and
 * against the market, and Sell / Buy more - beside every trade in it. Same figures as the phone's pick page.
 */
export function PickDesktop({ pick, brand, held, range, onRange, prices, chartLoading, flatToday, weekGain, versus, trades, onSell, onBuyMore, onStock, onBack }: {
	pick: Pick;
	brand: BrandSummary | undefined;
	/** Still held (the page can outlive a full sale while its receipt shows). */
	held: boolean;
	range: ChartRange;
	onRange: (r: ChartRange) => void;
	prices: StockChartPoint[];
	chartLoading: boolean;
	flatToday: boolean;
	weekGain: number | null;
	versus: number | null;
	trades: SandboxTrade[];
	onSell: () => void;
	onBuyMore: () => void;
	onStock: () => void;
	onBack: () => void;
}) {
	const up = isUp(pick.gain);
	const lineColor = prices.length >= 2 && prices[prices.length - 1]!.close < prices[0]!.close ? DESK.red : DESK.green;

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px]" style={{ color: DESK.muted }}>
					<button type="button" onClick={onBack} className={`rounded-md hover:text-white ${deskFocus}`}>Simulate</button>
					<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
					<span aria-current="page" className="text-white">{pick.ticker}</span>
				</nav>

				<header className="flex flex-wrap items-center gap-4">
					{brand ? <BrandLogo brand={brand} className="h-[52px] w-[52px] rounded-[13px]" alt="" /> : null}
					<div className="min-w-0 flex-1">
						<h1 className="font-heading text-[26px] font-semibold leading-[34px] text-white">{pick.name}</h1>
						<p className="text-[13px]" style={{ color: DESK.muted }}>{pick.ticker} · practice holding · picked {monthDayYear(pick.addedAt)} at {usd(pick.costPerShare)}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{held && (
							<DeskButton tone="sell" onClick={onSell}>Sell</DeskButton>
						)}
						<DeskButton onClick={onBuyMore}>
							<Plus className="h-[15px] w-[15px]" aria-hidden="true" /> Buy more
						</DeskButton>
						<button type="button" onClick={onStock} className={`flex h-[40px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-medium text-white hover:bg-white/[0.06] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
							Stock page <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
						</button>
					</div>
				</header>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
					<div className="flex min-w-0 flex-col gap-5">
						<Panel label={`${pick.ticker} performance`} className="gap-4 p-6">
							<div className="flex flex-wrap items-end justify-between gap-4">
								<div>
									<p className="text-[12.5px]" style={{ color: DESK.muted }}>Your gain on this holding</p>
									<p className="font-heading text-[40px] font-semibold leading-[48px] tabular-nums" style={{ color: up ? "#fff" : DESK.red }}>{signedUsd(pick.gain)}</p>
									<p className="text-[13.5px]" style={{ color: changeColor(pick.gain) }}>{signedPctLabel(pick.gainPct)} on a {usd(pick.stake)} paper stake</p>
								</div>
								<div className="flex gap-1 rounded-[10px] p-1" role="group" aria-label="Chart range" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
									{RANGES.map(([key, label]) => {
										const on = key === range;
										return <button key={key} type="button" aria-pressed={on} onClick={() => onRange(key)} className={`rounded-[8px] px-3 py-[5px] text-[12.5px] font-medium ${deskFocus}`} style={on ? { background: DESK.cyanSoft, color: DESK.cyan, boxShadow: `inset 0 0 0 1px ${DESK.borderStrong}` } : { color: DESK.muted }}>{label}</button>;
									})}
								</div>
							</div>
							<div className="grid h-[260px]">
								{flatToday ? <p className="grid place-items-center text-[13px]" style={{ color: DESK.muted }}>Not much movement yet today</p>
									: prices.length >= 2 ? <ValueChart points={prices.map((p) => ({ ts: p.ts, value: p.close }))} color={lineColor} formatValue={usd} className="h-full" />
									: chartLoading ? <SkeletonBar width="100%" height={260} />
									: <p className="grid place-items-center text-[13px]" style={{ color: DESK.muted }}>No history yet</p>}
							</div>
						</Panel>

						<div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
							<Tile label="This week" value={weekGain === null ? "—" : signedUsd(weekGain)} color={weekGain === null ? DESK.muted : changeColor(weekGain)} />
							<Tile label="vs S&P 500 this week" value={versus === null ? "—" : versusWords(versus)} color={versus === null ? DESK.muted : changeColor(versus)} />
							<Tile label="Shares" value={sharesLabel(pick.shares)} />
							<Tile label="Price then" value={usd(pick.costPerShare)} />
							<Tile label="Price now" value={usd(pick.price)} />
							<Tile label="Value now" value={usd(pick.value)} />
						</div>

						<section className="flex items-start gap-3 rounded-[14px] p-4" style={{ background: DESK.cyanSoft, border: `1px solid ${DESK.border}` }} aria-label="Insight">
							<Sparkles className="mt-[2px] h-[16px] w-[16px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />
							<p className="text-[13.5px] leading-[20px]" style={{ color: DESK.body }}>{up
									? `Your stake tracks the move live. If ${pick.ticker} gives back gains, the dollars follow it down.`
									: `Your stake tracks the move live. If ${pick.ticker} recovers, the dollars follow it back up.`}</p>
						</section>
					</div>

					<Panel label={`${pick.ticker} trades`} className="gap-3 p-5">
						<PanelHeader icon={History} title={`Your ${pick.ticker} trades`} badge={trades.length} />
						{trades.length === 0 ? (
							<p className="text-[13px]" style={{ color: DESK.muted }}>No trades recorded yet.</p>
						) : (
							<ul className="flex flex-col">
								{trades.map((t, i) => (
									<li key={t.id} className={`flex items-center justify-between gap-3 py-2 text-[13px] ${i > 0 ? "border-t" : ""}`} style={{ borderColor: DESK.border }}>
										<span>
											<span className="block font-semibold text-white">{t.side === "buy" ? "Bought" : "Sold"} {sharesLabel(t.shares)} at {usd(t.price)}</span>
											<span className="block text-[12px]" style={{ color: DESK.muted }}>{monthDayYear(t.executedAt)}{t.source === "limit" ? " · limit order" : ""}</span>
										</span>
										<span className="font-medium tabular-nums" style={{ color: t.side === "buy" ? DESK.body : DESK.green }}>{t.side === "buy" ? "-" : "+"}{usd(t.amount)}</span>
									</li>
								))}
							</ul>
						)}
					</Panel>
				</div>
			</div>
		</div>
	);
}

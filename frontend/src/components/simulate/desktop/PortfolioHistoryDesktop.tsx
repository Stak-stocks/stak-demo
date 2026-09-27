import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Clock, History, Receipt, X } from "lucide-react";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useOrderCancel, usePaperPortfolio } from "@/hooks/usePaperPortfolio";
import { marketTime, monthDayYear, sharesLabel, signedUsd, usd } from "@/lib/simFormat";
import { BrandLogo } from "@/components/BrandLogo";
import { DESK, Panel, PanelHeader, SkeletonBar, changeColor, deskFocus, deskPageBg, signedPctLabel } from "@/components/desktop/deskKit";

type Filter = "all" | "buy" | "sell";

function SummaryTile({ label, value, sub, color = "#fff" }: { label: string; value: string; sub?: string; color?: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-[14px] p-4" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }}>
			<span className="text-[12px]" style={{ color: DESK.muted }}>{label}</span>
			<span className="font-heading text-[20px] font-semibold tabular-nums" style={{ color }}>{value}</span>
			{sub && <span className="text-[12px]" style={{ color: DESK.body }}>{sub}</span>}
		</div>
	);
}

/**
 * Simulate's trade history on desktop: the portfolio in four figures, the full trade ledger as a table (filterable to
 * buys or sells), and a rail with open limit orders and what was sold. Holdings themselves live on Simulate's main page.
 */
export function PortfolioHistoryDesktop() {
	const navigate = useNavigate();
	const paper = usePaperPortfolio();
	const { allBrands } = useMyStakData();
	const [filter, setFilter] = useState<Filter>("all");
	const { cancel: cancelOrder, isCancelling } = useOrderCancel(paper.cancelOrder);

	const brandByTicker = useMemo(() => new Map(allBrands.map((b) => [b.ticker.toUpperCase(), b])), [allBrands]);
	const trades = paper.trades.filter((t) => filter === "all" || t.side === filter);
	const realizedTotal = paper.realized.reduce((s, r) => s + r.gain, 0);
	const returnPct = paper.paperStart > 0 ? (paper.allTimeGain / paper.paperStart) * 100 : 0;
	const th = "pb-2 text-left text-[11px] font-medium";

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<header>
					<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px]" style={{ color: DESK.muted }}>
						<button type="button" onClick={() => navigate({ to: "/simulate" })} className={`rounded-md hover:text-white ${deskFocus}`}>Simulate</button>
						<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
						<span aria-current="page" className="text-white">Trade history</span>
					</nav>
					<h1 className="mt-1 font-heading text-[28px] font-semibold leading-[36px] text-white">Trade history</h1>
					<p className="text-[14px]" style={{ color: DESK.muted }}>Every practice trade in {paper.name || "your paper portfolio"}, newest first.</p>
				</header>

				<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
					<SummaryTile label="Portfolio value" value={usd(paper.portfolioValue)} sub={`Cash ${usd(paper.cash)}`} />
					<SummaryTile label="All-time gain" value={signedUsd(paper.allTimeGain)} sub={signedPctLabel(returnPct)} color={changeColor(paper.allTimeGain)} />
					<SummaryTile label="Realized from sells" value={signedUsd(realizedTotal)} sub={`${paper.realized.length} ${paper.realized.length === 1 ? "sale" : "sales"}`} color={changeColor(realizedTotal)} />
					<SummaryTile label="Trades" value={String(paper.trades.length)} sub={`${paper.picks.length} ${paper.picks.length === 1 ? "company" : "companies"} held now`} />
				</div>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
					<Panel label="Trades" className="gap-3 p-5">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<PanelHeader icon={History} title="All trades" badge={paper.trades.length} />
							<div className="flex gap-2" role="group" aria-label="Show">
								{([["all", "All"], ["buy", "Buys"], ["sell", "Sells"]] as const).map(([id, label]) => {
									const on = filter === id;
									return (
										<button key={id} type="button" aria-pressed={on} onClick={() => setFilter(id)} className={`rounded-full px-3 py-[5px] text-[12px] ${deskFocus}`} style={on ? DESK.chipOn : { color: DESK.body, background: "rgba(255,255,255,0.03)", border: `1px solid ${DESK.border}` }}>
											{label}
										</button>
									);
								})}
							</div>
						</div>
						{paper.loading ? (
							<SkeletonBar width="100%" height={200} />
						) : trades.length === 0 ? (
							<p className="py-4 text-[13px]" style={{ color: DESK.muted }}>{paper.trades.length === 0 ? "No trades yet. Your first practice buy shows up here." : filter === "buy" ? "No buys yet." : "No sells yet."}</p>
						) : (
							// Seven columns need ~640px; a narrower window scrolls the ledger sideways rather than overflowing.
							<div className="overflow-x-auto">
							<table className="w-full min-w-[640px] table-fixed border-collapse">
								<thead>
									<tr style={{ color: DESK.muted }}>
										<th className={`${th} w-[18%]`}>Date</th>
										<th className={`${th} w-[10%]`}>Side</th>
										<th className={`${th} w-[24%]`}>Company</th>
										<th className={`${th} w-[12%]`}>Shares</th>
										<th className={`${th} w-[12%]`}>Price</th>
										<th className={`${th} w-[14%]`}>Amount</th>
										<th className={`${th} w-[10%]`}>Order</th>
									</tr>
								</thead>
								<tbody>
									{trades.map((t) => {
										const brand = brandByTicker.get(t.ticker.toUpperCase());
										return (
											<tr key={t.id} className="border-t" style={{ borderColor: DESK.border }}>
												<td className="py-[8px] text-[12.5px]" style={{ color: DESK.body }}>{monthDayYear(t.executedAt)}<span className="block text-[11px]" style={{ color: DESK.muted }}>{marketTime(t.executedAt)}</span></td>
												<td><span className="rounded-full px-[9px] py-[2px] text-[11.5px] font-semibold" style={t.side === "buy" ? { background: DESK.cyanSoft, color: DESK.cyan } : { background: "rgba(255,90,106,0.14)", color: "#FF8A95" }}>{t.side === "buy" ? "Buy" : "Sell"}</span></td>
												<td>
													<button type="button" onClick={() => navigate({ to: "/stock/$symbol", params: { symbol: t.ticker } })} className={`flex min-w-0 items-center gap-2 rounded-md text-left ${deskFocus}`}>
														{brand ? <BrandLogo brand={brand} className="h-[22px] w-[22px] rounded-[6px]" alt="" /> : null}
														<span className="truncate text-[13px] font-medium text-white">{brand?.name ?? t.ticker}</span>
														<span className="shrink-0 text-[11px]" style={{ color: DESK.muted }}>{t.ticker}</span>
													</button>
												</td>
												<td className="text-[13px] tabular-nums text-white">{sharesLabel(t.shares)}</td>
												<td className="text-[13px] tabular-nums" style={{ color: DESK.body }}>{usd(t.price)}</td>
												<td className="text-[13px] font-medium tabular-nums" style={{ color: t.side === "buy" ? "#fff" : DESK.green }}>{t.side === "buy" ? "-" : "+"}{usd(t.amount)}</td>
												<td className="text-[12px]" style={{ color: DESK.muted }}>{t.source === "limit" ? "Limit" : "Market"}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							</div>
						)}
					</Panel>

					<aside className="flex min-w-0 flex-col gap-5" aria-label="Orders and sales">
						<Panel label="Open orders" className="gap-3 p-5">
							<PanelHeader icon={Clock} title="Open orders" subtitle="Buy-limit orders waiting for their price." />
							{paper.openOrders.length === 0 ? (
								<p className="text-[13px]" style={{ color: DESK.muted }}>None right now. Place a limit order from Simulate's trade panel.</p>
							) : paper.openOrders.map((o) => (
								<div key={o.id} className="flex items-center gap-3 border-t pt-3 text-[13px]" style={{ borderColor: DESK.border }}>
									<span className="min-w-0 flex-1">
										<span className="block font-semibold text-white">Buy {o.ticker} at {usd(o.limitPrice)} or below</span>
										<span className="block text-[12px]" style={{ color: DESK.muted }}>{usd(o.amount)} reserved · placed {monthDayYear(o.createdAt)}</span>
									</span>
									<button type="button" onClick={() => { void cancelOrder(o.id); }} disabled={isCancelling(o.id)} aria-label={`Cancel ${o.ticker} order`} className={`flex items-center gap-1 rounded-md text-[12.5px] hover:text-white disabled:opacity-60 ${deskFocus}`} style={{ color: DESK.muted }}>
										<X className="h-[13px] w-[13px]" aria-hidden="true" /> {isCancelling(o.id) ? "Cancelling…" : "Cancel"}
									</button>
								</div>
							))}
						</Panel>

						<Panel label="Sold and realized" className="gap-3 p-5">
							<PanelHeader icon={Receipt} title="Sold · realized" subtitle="Gains and losses you've locked in." />
							{paper.realized.length === 0 ? (
								<p className="text-[13px]" style={{ color: DESK.muted }}>Nothing sold yet. Sell a pick and the cash returns to your balance, gain or loss.</p>
							) : (
								<ul className="flex flex-col">
									{paper.realized.map((r, i) => (
										<li key={`${r.ticker}-${r.executedAt}-${i}`} className={`flex items-center justify-between py-2 text-[13px] ${i > 0 ? "border-t" : ""}`} style={{ borderColor: DESK.border }}>
											<span><span className="font-semibold text-white">{r.ticker}</span> <span style={{ color: DESK.muted }}>· {monthDayYear(r.executedAt)}</span></span>
											<span className="font-medium tabular-nums" style={{ color: changeColor(r.gain) }}>{signedUsd(r.gain)}</span>
										</li>
									))}
								</ul>
							)}
						</Panel>
					</aside>
				</div>
			</div>
		</div>
	);
}

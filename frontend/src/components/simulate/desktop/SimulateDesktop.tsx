import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { BarChart3, BookOpen, Briefcase, History, MoreHorizontal, Plus, Star, Wallet, X } from "lucide-react";
import { SANDBOX_STRATEGIES } from "@stak/shared";
import { getStockChart, type ChartRange } from "@/lib/api";
import { sharesLabel, signedUsd, usd, wholeUsd } from "@/lib/simFormat";
import { useAccount } from "@/context/AccountContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { todaysMove, useOrderCancel, usePaperPortfolio, usePortfolioHistory, type Pick } from "@/hooks/usePaperPortfolio";
import { BrandLogo } from "@/components/BrandLogo";
import { DESK, Kicker, Panel, PanelHeader, SkeletonBar, changeColor, deskFocus, deskPageBg, signedPctLabel } from "@/components/desktop/deskKit";
import { Sparkline } from "@/components/desktop/Sparkline";
import { ValueChart } from "@/components/desktop/ValueChart";
import { PortfolioSetupCard } from "@/components/simulate/SimSections";
import { TradePanel, type TradeMode } from "./TradePanel";

const RANGES: ReadonlyArray<readonly [ChartRange, string]> = [["1w", "1W"], ["1m", "1M"], ["3m", "3M"], ["ytd", "YTD"], ["1y", "1Y"]];
const WATCHLIST_SHOWN = 5;
/** A column that scrolls by itself on desktop, with no scrollbar drawn. */
const COLUMN_SCROLL = "xl:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const EXPLAINER_KEY = "stak:sim-explainer-hidden";

function Stat({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-[12px]" style={{ color: DESK.muted }}>{label}</span>
			<span className="truncate font-heading text-[20px] font-semibold tabular-nums text-white">{value}</span>
			{sub && <span className="text-[12.5px] font-medium tabular-nums" style={{ color: subColor ?? DESK.body }}>{sub}</span>}
		</div>
	);
}

/** One holding's row menu: its practice page and its stock page. */
function RowMore({ ticker, onPick, onStock }: { ticker: string; onPick: () => void; onStock: () => void }) {
	const [open, setOpen] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	// Keyboard: opening moves focus into the menu, arrows move between its items, Escape closes it and returns focus.
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!open) return;
		if (e.key === "Escape") { e.preventDefault(); setOpen(false); trigger.current?.focus(); return; }
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
		const at = items.indexOf(document.activeElement as HTMLButtonElement);
		items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
	};
	return (
		<div className="relative" onKeyDown={onKeyDown} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
			<button ref={trigger} type="button" onClick={() => { setOpen((o) => !o); requestAnimationFrame(() => menu.current?.querySelector("button")?.focus()); }} aria-expanded={open} aria-label={`More for ${ticker}`} className={`grid h-[28px] w-[28px] place-items-center rounded-md hover:bg-white/[0.06] ${deskFocus}`}>
				<MoreHorizontal className="h-[16px] w-[16px]" style={{ color: DESK.muted }} aria-hidden="true" />
			</button>
			{open && (
				<div ref={menu} className="absolute right-0 top-[32px] z-20 w-[170px] rounded-[10px] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.45)]" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
					<button type="button" onClick={() => { setOpen(false); onPick(); }} className="block w-full rounded-[6px] px-3 py-2 text-left text-[12.5px] text-white hover:bg-white/[0.06]">Practice details</button>
					<button type="button" onClick={() => { setOpen(false); onStock(); }} className="block w-full rounded-[6px] px-3 py-2 text-left text-[12.5px] text-white hover:bg-white/[0.06]">Stock page</button>
				</div>
			)}
		</div>
	);
}

/**
 * Simulate on desktop, from the user's design: the paper portfolio (value, today's change, return, cash and its history
 * chart), the holdings table with Buy / Sell per row, open limit orders, saved ideas to trade, and a trade ticket beside
 * it all. Same server portfolio, prices and rules as the phone (and Android).
 */
export function SimulateDesktop({ initialSymbol }: { initialSymbol?: string }) {
	const navigate = useNavigate();
	const { account } = useAccount();
	const { allBrands, swipedBrands, batchQuotes } = useMyStakData();
	const paper = usePaperPortfolio();
	const [range, setRange] = useState<ChartRange>("3m");
	const [symbol, setSymbol] = useState<string | null>(initialSymbol ?? null);
	const [mode, setMode] = useState<TradeMode>("buy");
	const [explainerHidden, setExplainerHidden] = useState(() => { try { return localStorage.getItem(EXPLAINER_KEY) === "1"; } catch { return false; } });
	const { points, loading: historyLoading } = usePortfolioHistory(paper.trades, paper.paperStart, range);

	const brandByTicker = useMemo(() => new Map(allBrands.map((b) => [b.ticker.toUpperCase(), b])), [allBrands]);
	const holdings = useMemo(() => [...paper.picks].sort((a, b) => b.value - a.value), [paper.picks]);
	const charts = useQueries({
		queries: holdings.map((p) => ({ queryKey: ["stock-chart", p.ticker, "1d"], queryFn: () => getStockChart(p.ticker, "1d"), staleTime: 5 * 60 * 1000, retry: 1 })),
	});
	const saved = useMemo(() => {
		const at = (id: string) => account?.stakSavedAt?.[id]?.savedAt ?? 0;
		return [...swipedBrands].sort((a, b) => at(b.id) - at(a.id));
	}, [swipedBrands, account?.stakSavedAt]);

	const today = todaysMove(paper);
	const returnPct = paper.paperStart > 0 ? (paper.allTimeGain / paper.paperStart) * 100 : 0;
	const holdingsValue = holdings.reduce((s, p) => s + p.value, 0);
	const holdingsGain = holdings.reduce((s, p) => s + p.gain, 0);
	const holdingsCost = holdings.reduce((s, p) => s + p.stake, 0);
	const strategy = SANDBOX_STRATEGIES.find((s) => s.id === paper.strategy)?.label;

	const ticketRef = useRef<HTMLElement>(null);
	const { cancel: cancelOrder, isCancelling } = useOrderCancel(paper.cancelOrder);
	// Below xl the ticket sits under everything else, so bring it into view (and into focus) when a row sets it up.
	const trade = (ticker: string, m: TradeMode) => {
		setSymbol(ticker.toUpperCase());
		setMode(m);
		if (window.matchMedia("(min-width: 1280px)").matches) return;
		requestAnimationFrame(() => {
			ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
			ticketRef.current?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus({ preventScroll: true });
		});
	};
	const hideExplainer = () => { setExplainerHidden(true); try { localStorage.setItem(EXPLAINER_KEY, "1"); } catch { /* per-viewer nicety only */ } };
	const th = "pb-2 text-left text-[11px] font-medium";

	return (
		// From xl the page fits the window and each column scrolls on its own (no page scroll), so scrolling the
		// portfolio never moves the trade ticket; narrower, the two stack and the page scrolls as usual.
		<div className="flex min-h-full flex-col xl:h-dvh xl:min-h-0 xl:overflow-hidden" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-8 pt-5 xl:min-h-0 xl:flex-1">
				<div className="grid gap-5 pb-10 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_360px] xl:pb-0 xl:[grid-template-rows:minmax(0,1fr)]">
					<div className={`flex min-w-0 flex-col gap-5 xl:min-h-0 xl:pb-8 ${COLUMN_SCROLL}`}>
						<header>
							<Kicker icon={BarChart3}>Simulate</Kicker>
							<h1 className="mt-1 font-heading text-[30px] font-semibold leading-[38px] text-white">Practice investing with real market data.</h1>
							<p className="text-[15px]" style={{ color: DESK.cyan }}>Build a paper portfolio, test your ideas, and learn without risk.</p>
						</header>

						<Panel label="Paper portfolio" className="gap-5 p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<PanelHeader icon={Wallet} title={paper.name || "Paper Portfolio"} subtitle={strategy ? `${strategy} · started with ${wholeUsd(paper.paperStart)}` : `Started with ${wholeUsd(paper.paperStart)} of practice money`} />
								<button type="button" onClick={() => navigate({ to: "/simulate/portfolio" })} className={`flex items-center gap-1 rounded-md text-[12.5px] font-medium hover:opacity-80 ${deskFocus}`} style={{ color: DESK.cyan }}>
									<History className="h-[14px] w-[14px]" aria-hidden="true" /> Trade history
								</button>
							</div>
							{paper.loading ? (
								<SkeletonBar width="100%" height={320} className="rounded-[12px]" />
							) : paper.needsSetup ? (
								<div className="max-w-[420px]" style={{ ["--u" as string]: "1px" }}>
									<PortfolioSetupCard onSubmit={(balance, name, strat) => { void paper.setup(balance, name, strat); }} />
								</div>
							) : (
								<>
									<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
										<Stat label="Total portfolio value" value={usd(paper.portfolioValue)} sub={`${signedUsd(paper.allTimeGain)} (${signedPctLabel(returnPct)})`} subColor={changeColor(paper.allTimeGain)} />
										<Stat label="Today's change" value={signedUsd(today.usd)} sub={signedPctLabel(today.pct)} subColor={changeColor(today.usd)} />
										<Stat label="Total return" value={signedUsd(paper.allTimeGain)} sub={signedPctLabel(returnPct)} subColor={changeColor(returnPct)} />
										<Stat label="Cash balance" value={usd(paper.cash)} sub={paper.openOrders.length ? `${paper.openOrders.length} open ${paper.openOrders.length === 1 ? "order" : "orders"}` : "Ready to invest"} />
									</div>
									<div className="flex justify-end gap-1" role="group" aria-label="Chart range">
										{RANGES.map(([key, label]) => {
											const on = key === range;
											return (
												<button key={key} type="button" aria-pressed={on} onClick={() => setRange(key)} className={`rounded-[8px] px-3 py-[4px] text-[12px] font-medium ${deskFocus}`} style={on ? { background: DESK.cyanSoft, color: DESK.cyan, boxShadow: `inset 0 0 0 1px ${DESK.borderStrong}` } : { color: DESK.muted }}>
													{label}
												</button>
											);
										})}
									</div>
									<div className="grid h-[260px] place-items-stretch">
										{points && points.length >= 2 ? (
											<ValueChart points={points.map((p) => ({ ts: p.ts, value: p.value }))} color={DESK.green} formatValue={usd} className="h-full" />
										) : (
											historyLoading
												? <SkeletonBar width="100%" height={260} />
												: <p className="grid place-items-center text-[13px]" style={{ color: DESK.muted }}>Your chart starts with your first trade.</p>
										)}
									</div>
								</>
							)}
						</Panel>

						<Panel label="Simulated holdings" className="gap-3 p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<PanelHeader icon={Briefcase} title="Simulated Holdings" badge={holdings.length} />
								{holdings.length > 0 && (
									<p className="text-[12.5px]" style={{ color: DESK.muted }}>
										Total value <span className="font-semibold text-white">{usd(holdingsValue)}</span> · Total gain/loss{" "}
										<span className="font-semibold" style={{ color: changeColor(holdingsGain) }}>{signedUsd(holdingsGain)} ({signedPctLabel(holdingsCost > 0 ? (holdingsGain / holdingsCost) * 100 : 0)})</span>
									</p>
								)}
							</div>
							{paper.loading ? (
								<SkeletonBar width="100%" height={160} />
							) : holdings.length === 0 ? (
								<p className="py-4 text-[13px]" style={{ color: DESK.muted }}>No holdings yet. Buy a company with the trade panel and it lands here with its live gain.</p>
							) : (
								// Eight columns need ~760px; a narrower window scrolls the table sideways rather than overflowing the panel.
								<div className="overflow-x-auto">
								<table className="w-full min-w-[760px] table-fixed border-collapse">
									<thead>
										<tr style={{ color: DESK.muted }}>
											<th className={`${th} w-[23%]`}>Company</th>
											<th className={`${th} w-[9%]`}>Quantity</th>
											<th className={`${th} w-[10%]`}>Avg. cost</th>
											<th className={`${th} w-[11%]`}>Current price</th>
											<th className={`${th} w-[11%]`}>Current value</th>
											<th className={`${th} w-[12%]`}>Gain/Loss</th>
											<th className={`${th} w-[10%]`}>1D</th>
											<th className={`${th} w-[14%]`}><span className="sr-only">Actions</span></th>
										</tr>
									</thead>
									<tbody>
										{holdings.map((p: Pick, i) => {
											const brand = brandByTicker.get(p.ticker);
											const line = (charts[i]?.data?.prices ?? []).map((c) => c.close).filter((c) => c > 0);
											return (
												<tr key={p.ticker} className="border-t" style={{ borderColor: DESK.border }}>
													<td className="py-[8px]">
														<button type="button" onClick={() => navigate({ to: "/simulate/pick/$symbol", params: { symbol: p.ticker } })} className={`flex w-full min-w-0 items-center gap-3 rounded-md text-left ${deskFocus}`}>
															{brand ? <BrandLogo brand={brand} className="h-[26px] w-[26px] rounded-[7px]" alt="" /> : <span className="h-[26px] w-[26px] rounded-[7px]" style={{ background: DESK.track }} />}
															<span className="min-w-0">
																<span className="block truncate text-[13px] font-medium text-white">{p.name}</span>
																<span className="block text-[11px]" style={{ color: DESK.muted }}>{p.ticker}</span>
															</span>
														</button>
													</td>
													<td className="text-[13px] tabular-nums text-white">{sharesLabel(p.shares)}</td>
													<td className="text-[13px] tabular-nums" style={{ color: DESK.body }}>{usd(p.costPerShare)}</td>
													<td className="text-[13px] tabular-nums text-white">{usd(p.price)}</td>
													<td className="text-[13px] tabular-nums text-white">{usd(p.value)}</td>
													<td className="tabular-nums" style={{ color: changeColor(p.gain) }}>
														<span className="block text-[13px] font-medium">{signedUsd(p.gain)}</span>
														<span className="block text-[11.5px]">{signedPctLabel(p.gainPct)}</span>
													</td>
													<td className="pr-3">{line.length >= 2 ? <Sparkline values={line} color={changeColor(p.dayChange)} fill={false} className="h-[22px] w-full" /> : <span className="text-[12px]" style={{ color: DESK.muted }}>—</span>}</td>
													<td>
														<div className="flex items-center justify-end gap-1">
															<button type="button" onClick={() => trade(p.ticker, "buy")} aria-label={`Buy ${p.ticker}`} className={`rounded-[7px] px-[10px] py-[4px] text-[12px] font-semibold ${deskFocus}`} style={{ background: DESK.cyanSoft, color: DESK.cyan }}>Buy</button>
															<button type="button" onClick={() => trade(p.ticker, "sell")} aria-label={`Sell ${p.ticker}`} className={`rounded-[7px] px-[10px] py-[4px] text-[12px] font-semibold ${deskFocus}`} style={{ background: "rgba(255,90,106,0.14)", color: "#FF8A95" }}>Sell</button>
															<RowMore ticker={p.ticker} onPick={() => navigate({ to: "/simulate/pick/$symbol", params: { symbol: p.ticker } })} onStock={() => navigate({ to: "/stock/$symbol", params: { symbol: p.ticker } })} />
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
								</div>
							)}
							{paper.openOrders.length > 0 && (
								<div className="mt-2 flex flex-col gap-2 border-t pt-3" style={{ borderColor: DESK.border }}>
									<p className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: DESK.muted }}>Open limit orders</p>
									{paper.openOrders.map((o) => (
										<div key={o.id} className="flex items-center gap-3 text-[13px]">
											<span className="w-[60px] font-semibold text-white">{o.ticker}</span>
											<span className="flex-1" style={{ color: DESK.body }}>Buy {usd(o.amount)} at {usd(o.limitPrice)} or below</span>
											<button type="button" onClick={() => { void cancelOrder(o.id); }} disabled={isCancelling(o.id)} aria-label={`Cancel ${o.ticker} order`} className={`flex items-center gap-1 rounded-md text-[12.5px] hover:text-white disabled:opacity-60 ${deskFocus}`} style={{ color: DESK.muted }}>
												<X className="h-[13px] w-[13px]" aria-hidden="true" /> {isCancelling(o.id) ? "Canceling…" : "Cancel"}
											</button>
										</div>
									))}
								</div>
							)}
						</Panel>

						<Panel label="Watchlist and saved ideas" className="gap-4 p-5">
							<PanelHeader icon={Star} title="Watchlist / Saved Ideas" subtitle="Companies you've saved. Click + to set up a practice trade." action={saved.length ? "View all" : undefined} onAction={() => navigate({ to: "/my-stak" })} />
							{saved.length === 0 ? (
								<p className="text-[13px]" style={{ color: DESK.muted }}>Save companies in Discover and they show up here to practice with.</p>
							) : (
								<div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
									{saved.slice(0, WATCHLIST_SHOWN).map((b) => {
										const q = batchQuotes[b.ticker];
										return (
											<div key={b.id} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
												<BrandLogo brand={b} className="h-[28px] w-[28px] rounded-[7px]" alt="" />
												<div className="min-w-0 flex-1">
													<p className="truncate text-[13px] font-semibold text-white">{b.name}</p>
													<p className="text-[11.5px] tabular-nums" style={{ color: DESK.muted }}>{b.ticker} · {q ? usd(q.price) : "—"} <span style={{ color: changeColor(q?.changePercent) }}>{q ? signedPctLabel(q.changePercent) : ""}</span></p>
												</div>
												<button type="button" onClick={() => trade(b.ticker, "buy")} aria-label={`Practice buy ${b.name}`} className={`grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full transition-colors hover:bg-white/[0.08] ${deskFocus}`} style={{ border: `1px solid ${DESK.borderStrong}`, color: DESK.cyan }}>
													<Plus className="h-[15px] w-[15px]" aria-hidden="true" />
												</button>
											</div>
										);
									})}
								</div>
							)}
						</Panel>
					</div>

					<aside ref={ticketRef} className={`flex min-w-0 flex-col gap-5 scroll-mt-5 xl:min-h-0 xl:pb-8 ${COLUMN_SCROLL}`} aria-label="Trade">
						<TradePanel paper={paper} brands={allBrands} symbol={symbol} mode={mode} onSymbol={setSymbol} onMode={setMode} />
						{!explainerHidden && (
							<Panel label="What does this order mean?" className="gap-3 p-5">
								<div className="flex items-start gap-3">
									<BookOpen className="mt-[2px] h-[18px] w-[18px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />
									<h2 className="flex-1 text-[14.5px] font-semibold text-white">What does a {mode} order mean?</h2>
									<button type="button" onClick={hideExplainer} aria-label="Hide this explainer" className={`grid h-[24px] w-[24px] place-items-center rounded-md hover:bg-white/[0.06] ${deskFocus}`}><X className="h-[14px] w-[14px]" style={{ color: DESK.muted }} aria-hidden="true" /></button>
								</div>
								<p className="text-[13px] leading-[20px]" style={{ color: DESK.body }}>
									{mode === "buy"
										? "A buy order is how you purchase shares of a company - at the current market price (a market order) or only at a price you choose or lower (a limit order). In this simulator you use real market prices, but no real money is involved."
										: "A sell order turns shares you hold back into cash at the current market price. Selling part of a holding keeps the rest invested. In this simulator no real money is involved."}
								</p>
								<button type="button" onClick={() => navigate({ to: "/playground" })} className={`self-start rounded-md text-[13px] font-medium hover:opacity-80 ${deskFocus}`} style={{ color: DESK.cyan }}>
									Learn more about investing →
								</button>
							</Panel>
						)}
					</aside>
				</div>
			</div>
		</div>
	);
}

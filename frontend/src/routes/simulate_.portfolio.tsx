import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { usePaperPortfolio } from "@/hooks/usePaperPortfolio";
import { useIsMobile } from "@/hooks/use-mobile";
import { PortfolioHistoryDesktop } from "@/components/simulate/desktop/PortfolioHistoryDesktop";
import { isUp, monthDay, signedUsd, usd } from "@/lib/simFormat";
import { Badge, EmptyStateCard, Kicker, SIM } from "@/components/simulate/simKit";
import { PortfolioRow } from "@/components/simulate/SimSections";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PRESS, PhonePage, SettingsChip, f, focusRing, sheetCard } from "@/components/phone/phone";
import { ShareCircle } from "@/components/simulate/simKit";
import { portfolioShareText, shareText } from "@/lib/share";

export const Route = createFileRoute("/simulate_/portfolio")({
	component: PortfolioRoute,
});

/** Desktop: summary tiles, the trade ledger as a table, open orders and sales; the phone keeps Android's list. */
function PortfolioRoute() {
	return useIsMobile() ? <PortfolioPage /> : <PortfolioHistoryDesktop />;
}

type Sort = "gainers" | "newest" | "worst";
type Filter = "all" | "buys" | "sells";

/** The sort chips here have no border (unlike the setup card's chips). */
function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={PRESS}
			style={{ padding: `${cu(6)} ${cu(12)}`, borderRadius: cu(14), font: f(500, 12, 16), background: selected ? SIM.tealTint : DISC.sheet, color: selected ? DISC.teal : DISC.muted, ...focusRing }}
		>
			{label}
		</button>
	);
}

const hairlineButton = { borderRadius: cu(6), border: `${cu(1)} solid ${SIM.hairline}`, font: f(400, 12, 15, "heading"), color: DISC.muted, ...focusRing };

/** Android's Portfolio page: every pick with a Sell pill, what was sold, open limit orders and the trade ledger. */
function PortfolioPage() {
	const navigate = useNavigate();
	const paper = usePaperPortfolio();
	const [sort, setSort] = useState<Sort>("gainers");
	const [filter, setFilter] = useState<Filter>("all");

	const picks = useMemo(() => {
		const list = [...paper.picks];
		if (sort === "newest") return list.sort((a, b) => b.addedAt - a.addedAt);
		if (sort === "worst") return list.sort((a, b) => a.gain - b.gain);
		return list.sort((a, b) => b.gain - a.gain);
	}, [paper.picks, sort]);
	const shownTrades = paper.trades.filter((t) => filter === "all" || (filter === "buys" ? t.side === "buy" : t.side === "sell"));
	const openPick = (ticker: string) => navigate({ to: "/simulate/pick/$symbol", params: { symbol: ticker } });
	const count = paper.picks.length === 1 ? "1 pick" : `${paper.picks.length} picks`;
	const empty = paper.picks.length === 0 && paper.realized.length === 0;

	return (
		<PhonePage>
			<div className="relative flex items-center justify-between" style={{ padding: `${cu(8)} ${cu(18)}` }}>
				<BackCircle onClick={() => navigate({ to: "/simulate" })} label="Back to Simulate" />
				<h1 className="pointer-events-none absolute inset-x-0 text-center" style={{ font: f(600, 16, 20, "heading"), color: "#fff" }}>Your portfolio</h1>
				<ShareCircle onClick={() => { void shareText(portfolioShareText((paper.allTimeGain / paper.paperStart) * 100, empty), "STAK"); }} />
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: cu(16), padding: `${cu(6)} ${cu(20)} ${cu(26)}` }}>
				<div className="flex justify-center">
					<span className="flex items-center" style={{ minWidth: cu(158), minHeight: cu(32), borderRadius: cu(13), border: `${cu(1)} solid ${DISC.sheet}`, padding: `0 ${cu(16)}`, font: f(400, 10, 13), color: DISC.muted }}>
						{count} · {signedUsd(paper.allTimeGain)} all time
					</span>
				</div>

				{empty ? (
					<EmptyStateCard title="No picks yet" body="Your first practice buy lands here with its live gain." />
				) : (
					<>
						<div className="flex" style={{ gap: cu(8) }} role="group" aria-label="Sort picks">
							<FilterChip label="Top gainers" selected={sort === "gainers"} onClick={() => setSort("gainers")} />
							<FilterChip label="Newest" selected={sort === "newest"} onClick={() => setSort("newest")} />
							<FilterChip label="Worst" selected={sort === "worst"} onClick={() => setSort("worst")} />
						</div>

						{picks.map((p) => (
							<PortfolioRow
								key={p.ticker}
								pick={p}
								subLight
								onOpen={() => openPick(p.ticker)}
								trailing={<button type="button" onClick={() => openPick(p.ticker)} aria-label={`Sell ${p.ticker}`} className={PRESS} style={{ ...hairlineButton, ...focusRing, width: cu(60), height: cu(30) }}>Sell</button>}
							/>
						))}

						{paper.realized.length > 0 && (
							<>
								<Kicker>SOLD · REALIZED</Kicker>
								{paper.realized.map((r, i) => (
									<div key={`${r.ticker}-${r.executedAt}-${i}`} className="flex items-center" style={{ gap: cu(12), ...sheetCard(12), padding: `${cu(12)} ${cu(14)}` }}>
										<Badge letter={r.ticker} size={36} fontSize={14} alpha={0.55} />
										<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
											<span style={{ font: f(600, 12, 15, "heading"), color: DISC.headerGray }}>{r.ticker}</span>
											<span style={{ font: f(300, 10, 13), color: DISC.faint }}>Sold {monthDay(r.executedAt)} · {isUp(r.gain) ? "profit banked" : "loss realized"}</span>
										</span>
										<span style={{ font: f(400, 14, 18), color: r.gain >= 0 ? DISC.green : DISC.red }}>{signedUsd(r.gain)}</span>
									</div>
								))}
							</>
						)}

						<p className="text-center" style={{ font: f(400, 11, 14), color: DISC.faint }}>Sell a pick and the cash returns to your balance, gain or loss.</p>
					</>
				)}

				{paper.openOrders.length > 0 && (
					<section style={{ display: "flex", flexDirection: "column", gap: cu(16) }} aria-label="Open orders">
						<Kicker>OPEN ORDERS</Kicker>
						{paper.openOrders.map((o) => (
							<div key={o.id} className="flex items-center" style={{ gap: cu(12) }}>
								<Badge letter={o.ticker} size={36} fontSize={14} />
								<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
									<span style={{ font: f(600, 14, undefined, "heading"), color: "#fff" }}>Buy {o.ticker} · limit {usd(o.limitPrice)}</span>
									<span style={{ font: f(300, 11), color: DISC.muted }}>{usd(o.amount)} reserved · placed {monthDay(o.createdAt)} · pending</span>
								</span>
								<button type="button" onClick={() => { void paper.cancelOrder(o.id); }} aria-label={`Cancel ${o.ticker} order`} className={PRESS} style={{ ...hairlineButton, ...focusRing, width: cu(64), height: cu(30) }}>Cancel</button>
							</div>
						))}
					</section>
				)}

				{paper.trades.length > 0 && (
					<section style={{ display: "flex", flexDirection: "column", gap: cu(16) }} aria-label="Trade history">
						<Kicker>TRADE HISTORY</Kicker>
						<div className="flex" style={{ gap: cu(8) }} role="group" aria-label="Filter trades">
							<SettingsChip label="All" selected={filter === "all"} onClick={() => setFilter("all")} />
							<SettingsChip label="Buys" selected={filter === "buys"} onClick={() => setFilter("buys")} />
							<SettingsChip label="Sells" selected={filter === "sells"} onClick={() => setFilter("sells")} />
						</div>
						{shownTrades.length === 0 && <p style={{ font: f(400, 11), color: DISC.faint }}>{filter === "buys" ? "No buys yet." : "No sells yet."}</p>}
						{shownTrades.map((t) => (
							<div key={t.id} className="flex items-center" style={{ gap: cu(12) }}>
								<Badge letter={t.ticker} size={36} fontSize={14} alpha={0.7} />
								<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
									<span style={{ font: f(600, 12, undefined, "heading"), color: DISC.headerGray }}>{t.side === "buy" ? "Bought" : "Sold"} {t.ticker}</span>
									<span style={{ font: f(300, 10), color: DISC.faint }}>{monthDay(t.executedAt)} · {t.shares.toFixed(4)} sh at {usd(t.price)}</span>
								</span>
								<span style={{ font: f(400, 14), color: t.side === "buy" ? DISC.headerGray : DISC.green }}>{t.side === "buy" ? "-" : "+"}{usd(t.amount)}</span>
							</div>
						))}
					</section>
				)}
			</div>
		</PhonePage>
	);
}

import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { colPlus } from "@/app/FitCanvas";
import { companyInitial, dayLabel, money, normalizeTicker, round4, signedMoney, signedPct, usePortfolio } from "@/app/live";
import { portfolio, stocks } from "./data";
import { PortfolioSellSheet } from "./sheets";
import { stockFor } from "./SimulateHome";
import { Avatar, BackHeader, Eyebrow, FilterChip, GREEN, PageTitle, type Palette, RED, SmallSellButton } from "./ui";

export type PortfolioSearch = { variant?: "alt"; modal?: "sell-confirm"; symbol?: string };

/** 2:743 "Desktop · Portfolio" (canonical) and 2:1116 (alternate palette, header 44px higher, Sell sheet; ?variant=alt). */
const CANON: Palette = { card: "#181f30", inner: "#12203e" };
const ALT: Palette = { card: "#0e1a36", inner: "#12203e" };

/** "$100 stake" — stakes read as whole dollars in the rows. */
const stakeLabel = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function Portfolio({ search }: { search: PortfolioSearch }) {
	const navigate = useNavigate();
	const pf = usePortfolio();
	const live = pf.live;
	const alt = search.variant === "alt";
	const p = alt ? ALT : CANON;
	const [chip, setChip] = useState(0);
	const setSearch = (next: PortfolioSearch) =>
		navigate({ to: "/simulate/portfolio", search: { variant: search.variant, ...next }, replace: true });
	const symbol = normalizeTicker(search.symbol ?? "NVDA");
	const d = portfolio;

	const rows = useMemo(() => {
		const r = [...pf.positions];
		if (chip === 0) r.sort((a, b) => b.gain - a.gain);
		else if (chip === 1) r.sort((a, b) => b.addedAt - a.addedAt);
		else r.sort((a, b) => a.gain - b.gain);
		return r;
	}, [pf.positions, chip]);

	const pos = pf.positions.find((x) => x.ticker === symbol);
	const stock = stockFor(symbol, pos?.price ?? pf.quotes[symbol]?.price ?? stocks[symbol]?.price ?? 0, pos?.quote?.changePercent ?? 0);

	// the Sell sheet only opens over a position actually held; a ?modal=sell-confirm for anything else is dropped once the portfolio is known
	const stale = search.modal === "sell-confirm" && live.ready && !pos;
	useEffect(() => {
		if (stale) navigate({ to: "/simulate/portfolio", search: { variant: search.variant }, replace: true });
	}, [stale, search.variant, navigate]);

	const confirmSell = async (portion: number) => {
		if (!pos) return;
		try {
			await live.actions.sell(symbol, round4(pos.shares * portion), pos.price);
			toast.success(portion >= 1 ? "Position closed" : `Sold ${Math.round(portion * 100)}% of ${symbol}`);
			navigate({ to: "/simulate/picks/$symbol", params: { symbol }, search: { modal: "sell-success", portion } });
		} catch {
			toast.error("Could not sell. Try again."); // the position and cash are unchanged
			setSearch({});
		}
	};

	return (
		<div className="flex flex-col items-start gap-[22px]" style={{ width: colPlus(10), marginTop: alt ? -44 : 0 }}>
			<div className="flex w-[186px] flex-col items-start gap-[24px]">
				<BackHeader crumb={d.crumb} to="/simulate" style={{ marginLeft: alt ? 2 : 0 }} />
				<PageTitle title={d.title} subtitle={`${pf.positions.length} ${pf.positions.length === 1 ? "pick" : "picks"} · ${signedMoney(pf.allTime)} all time`} />
			</div>

			<div className="flex w-full flex-col items-start gap-[16px]">
				<div className="flex w-full flex-col items-start gap-[28px]">
					<div className="flex items-start gap-[8px] overflow-clip">
						{d.chips.map((label, i) => (
							<FilterChip key={label} active={chip === i} activeBg={p.inner === p.card ? p.card : alt ? p.inner : p.card} onClick={() => setChip(i)}>
								{label}
							</FilterChip>
						))}
					</div>

					<div className="flex w-full flex-col items-start gap-[20px]">
						<div className="flex w-full flex-col items-start overflow-clip rounded-[16px] px-[20px] py-[8px]" style={{ backgroundColor: p.card }}>
							{rows.length === 0 && (
								<p className="w-full py-[16px] font-geist text-[12px] leading-[16px] text-[#819abb]">No open picks. Buy a saved company from Simulate and it lands here.</p>
							)}
							{rows.map((pick, i) => (
								<div key={pick.ticker} className="contents">
									{i > 0 && <div className="h-px w-full bg-[rgba(255,255,255,0.06)]" />}
									<div className="flex h-[56px] w-full items-center gap-[14px] overflow-clip">
										<Link
											to="/simulate/picks/$symbol"
											params={{ symbol: pick.ticker }}
											className="stak-press flex min-w-px flex-1 cursor-pointer items-center gap-[14px] overflow-clip"
										>
											<Avatar letter={stocks[pick.ticker]?.initial ?? companyInitial(pick.ticker)} size={36} radius={10} bg={p.inner} />
											<div className="flex min-w-px flex-1 flex-col items-start gap-px overflow-clip whitespace-nowrap">
												<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{pick.ticker}</p>
												<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{`Picked ${dayLabel(pick.addedAt)} · ${stakeLabel(pick.stake)} stake`}</p>
											</div>
										</Link>
										<div className="flex flex-col items-end gap-px overflow-clip whitespace-nowrap" style={{ color: pick.gain >= 0 ? GREEN : RED }}>
											<p className="font-geist text-[13px] font-medium leading-[17px]">{signedMoney(pick.gain)}</p>
											<p className="font-geist text-[11px] leading-[14px]">{signedPct(pick.pct)}</p>
										</div>
										<SmallSellButton aria-label={`Sell ${pick.ticker}`} onClick={() => navigate({ to: "/simulate/picks/$symbol", params: { symbol: pick.ticker } })}>
											{d.sell}
										</SmallSellButton>
									</div>
								</div>
							))}
						</div>

						<div
							className="flex w-full flex-col items-start gap-[10px] overflow-clip rounded-[16px] px-[20px] py-[16px] whitespace-nowrap"
							style={{ backgroundColor: p.card }}
						>
							<Eyebrow>{d.sold.eyebrow}</Eyebrow>
							{pf.sold.length === 0 && <p className="font-geist text-[11px] leading-[14px] text-[#819abb]">Nothing sold yet.</p>}
							{pf.sold.map((row) => (
								<div key={`${row.ticker}-${row.soldAt}`} className="flex h-[24px] w-full items-center justify-between overflow-clip">
									<div className="flex items-center gap-[10px] overflow-clip">
										<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.ticker}</p>
										<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{`Sold ${dayLabel(row.soldAt)} · ${row.pnl >= 0 ? "profit banked" : "loss realized"}`}</p>
									</div>
									<p className="font-geist text-[13px] font-medium leading-[17px]" style={{ color: row.pnl >= 0 ? GREEN : RED }}>
										{signedMoney(row.pnl)}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{d.footnote}</p>
			</div>

			{search.modal === "sell-confirm" && pos && (
				<PortfolioSellSheet
					symbol={symbol}
					stock={stock}
					shares={pos.shares}
					stake={pos.stake}
					value={pos.value}
					onConfirm={confirmSell}
					onClose={() => setSearch({})}
				/>
			)}
		</div>
	);
}

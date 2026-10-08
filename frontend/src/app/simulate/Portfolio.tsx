import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { portfolio, stocks } from "./data";
import { PortfolioSellSheet } from "./sheets";
import { Avatar, BackHeader, Eyebrow, FilterChip, GREEN, PageTitle, type Palette, RED, SmallSellButton } from "./ui";

export type PortfolioSearch = { variant?: "alt"; modal?: "sell-confirm"; symbol?: string };

/** 2:743 "Desktop · Portfolio" (canonical) and 2:1116 (alternate palette, header 44px higher, Sell sheet; ?variant=alt). */
const CANON: Palette = { card: "#181f30", inner: "#12203e" };
const ALT: Palette = { card: "#0e1a36", inner: "#12203e" };

export function Portfolio({ search }: { search: PortfolioSearch }) {
	const navigate = useNavigate();
	const alt = search.variant === "alt";
	const p = alt ? ALT : CANON;
	const [chip, setChip] = useState(0);
	const setSearch = (next: PortfolioSearch) =>
		navigate({ to: "/simulate/portfolio", search: { variant: search.variant, ...next }, replace: true });
	const symbol = search.symbol ?? "NVDA";
	const stock = stocks[symbol] ?? stocks.NVDA;
	const d = portfolio;

	return (
		<div className="flex w-[1144px] flex-col items-start gap-[22px]" style={{ marginTop: alt ? -44 : 0 }}>
			<div className="flex w-[186px] flex-col items-start gap-[24px]">
				<BackHeader crumb={d.crumb} to="/simulate" style={{ marginLeft: alt ? 2 : 0 }} />
				<PageTitle title={d.title} subtitle={d.subtitle} />
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
							{d.picks.map((pick, i) => (
								<div key={pick.symbol} className="contents">
									{i > 0 && <div className="h-px w-full bg-[rgba(255,255,255,0.06)]" />}
									<div className="flex h-[56px] w-full items-center gap-[14px] overflow-clip">
										<Link
											to="/simulate/picks/$symbol"
											params={{ symbol: pick.symbol }}
											className="flex min-w-px flex-1 items-center gap-[14px] overflow-clip"
										>
											<Avatar letter={pick.initial} size={36} radius={10} bg={p.inner} />
											<div className="flex min-w-px flex-1 flex-col items-start gap-px overflow-clip whitespace-nowrap">
												<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{pick.symbol}</p>
												<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{pick.meta}</p>
											</div>
										</Link>
										<div className="flex flex-col items-end gap-px overflow-clip whitespace-nowrap" style={{ color: pick.up ? GREEN : RED }}>
											<p className="font-geist text-[13px] font-medium leading-[17px]">{pick.gain}</p>
											<p className="font-geist text-[11px] leading-[14px]">{pick.pct}</p>
										</div>
										<SmallSellButton onClick={() => navigate({ to: "/simulate/picks/$symbol", params: { symbol: pick.symbol } })}>{d.sell}</SmallSellButton>
									</div>
								</div>
							))}
						</div>

						<div
							className="flex w-full flex-col items-start gap-[10px] overflow-clip rounded-[16px] px-[20px] py-[16px] whitespace-nowrap"
							style={{ backgroundColor: p.card }}
						>
							<Eyebrow>{d.sold.eyebrow}</Eyebrow>
							{d.sold.rows.map((row) => (
								<div key={row.symbol} className="flex h-[24px] w-full items-center justify-between overflow-clip">
									<div className="flex items-center gap-[10px] overflow-clip">
										<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.symbol}</p>
										<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{row.meta}</p>
									</div>
									<p className="font-geist text-[13px] font-medium leading-[17px]" style={{ color: row.up ? GREEN : RED }}>
										{row.amount}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{d.footnote}</p>
			</div>

			{search.modal === "sell-confirm" && (
				<PortfolioSellSheet
					symbol={symbol}
					stock={stock}
					onConfirm={(portion) =>
						navigate({ to: "/simulate/picks/$symbol", params: { symbol }, search: { modal: "sell-success", portion } })
					}
					onClose={() => setSearch({})}
				/>
			)}
		</div>
	);
}

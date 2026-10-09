import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { colPlus } from "@/app/FitCanvas";
import {
	changeLine,
	companyInitial,
	companyName,
	dayLabel,
	money,
	normalizeTicker,
	pct1,
	round4,
	shares4,
	signedMoney,
	signedPct,
	splitMoney,
	useApiHealth,
	usePortfolio,
	useQuote,
	type PositionRow,
} from "@/app/live";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import { pickDetail, stocks } from "./data";
import { SellConfirmSheet, SellSuccessSheet } from "./sheets";
import { stockFor } from "./SimulateHome";
import { hairline } from "@/app/ui/Button";
import { Avatar, BackHeader, Card, Eyebrow, GhostButton, SellButton } from "./ui";

export type PickDetailSearch = { modal?: "sell-confirm" | "sell-success"; portion?: number };

/** "$100" — stakes and gains read as whole dollars in the copy. */
const whole = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
/** The demo proxy for the market's move when no SPY quote exists. */
const DEMO_MARKET_PCT = 0.4;

/** 2:850 "Desktop · Pick detail" (+ 2:1458 Sell confirm, 2:1730 Sell success as ?modal=), on the live position. */
export function PickDetail({ symbol: raw, search }: { symbol: string; search: PickDetailSearch }) {
	const symbol = normalizeTicker(raw);
	const navigate = useNavigate();
	const pf = usePortfolio();
	const live = pf.live;
	const quote = useQuote(symbol);
	const spy = useQuote("SPY");
	const healthy = useApiHealth();
	const d = pickDetail;
	const setSearch = (next: PickDetailSearch) =>
		navigate({ to: "/simulate/picks/$symbol", params: { symbol }, search: next, replace: true });

	const pos = pf.positions.find((p) => p.ticker === symbol);
	// the most recent sale of this company (the sold log is newest first)
	const lastSold = live.sold.find((s) => s.ticker === symbol);
	const closedView = !pos && search.modal === "sell-success" && !!lastSold;

	useEffect(() => {
		if (live.ready && !pos && !closedView) navigate({ to: "/simulate/portfolio", replace: true });
	}, [live.ready, pos, closedView, navigate]);

	if (!pos && !closedView) return null;

	// a pick that was just closed is shown from its sale record
	const view: PositionRow = pos ?? {
		ticker: symbol,
		shares: lastSold!.shares,
		priceAtAdd: lastSold!.shares > 0 ? lastSold!.stake / lastSold!.shares : null,
		addedAt: lastSold!.addedAt ?? lastSold!.soldAt,
		quote,
		price: lastSold!.shares > 0 ? lastSold!.proceeds / lastSold!.shares : 0,
		value: lastSold!.proceeds,
		stake: lastSold!.stake,
		gain: lastSold!.pnl,
		pct: lastSold!.stake > 0 ? (lastSold!.pnl / lastSold!.stake) * 100 : 0,
		today: 0,
	};
	const name = stocks[symbol]?.name ?? companyName(symbol);
	const stock = stockFor(symbol, view.price, quote?.changePercent ?? 0);
	const up = view.gain >= 0;
	const gain = splitMoney(view.gain);
	const marketPct = healthy && spy ? spy.changePercent : DEMO_MARKET_PCT;
	// today's move against the market's (SPY when the API is up): like for like, not the all-time gain against one day
	const vsMarket = (quote?.changePercent ?? 0) - marketPct;
	const stats = [
		[
			{ label: "Today", value: signedMoney(view.today), up: view.today >= 0 },
			{ label: "vs the market", value: `${signedPct(vsMarket)} ${vsMarket >= 0 ? "ahead" : "behind"}`, up: vsMarket >= 0 },
		],
		[
			{ label: "Price then", value: money(view.priceAtAdd ?? 0), up: false },
			{ label: "Price now", value: money(quote?.price ?? view.price), up: false },
		],
	];
	const note = up
		? `Selling returns ${money(view.value)} to your cash: the ${whole(view.stake)} stake plus the ${whole(view.gain)} gain, locked in for good.`
		: `Selling returns ${money(view.value)} to your cash: the ${whole(view.stake)} stake minus the ${whole(view.gain)} loss, locked in for good.`;
	const insight = up
		? `Your stake tracks the move live. If ${symbol} gives back gains, the dollars follow it down.`
		: `Your stake tracks the move live. If ${symbol} recovers, the dollars follow it back up.`;

	// the success sheet shows the sale that just happened, or a preview of selling the whole position
	const justSold = lastSold && (!pos || lastSold.soldAt > Date.now() - 60_000) ? lastSold : null;
	const portion = search.portion ?? 1;
	const sale = justSold ?? { shares: view.shares * portion, stake: view.stake * portion, proceeds: view.value * portion, pnl: view.gain * portion };

	const confirmSell = async (frac: number) => {
		if (!pos) return;
		try {
			await live.actions.sell(symbol, round4(pos.shares * frac), pos.price);
			toast.success(frac >= 1 ? "Position closed" : `Sold ${Math.round(frac * 100)}% of ${symbol}`);
			setSearch({ modal: "sell-success", portion: frac });
		} catch {
			toast.error("Could not sell. Try again."); // the position and cash are unchanged
			setSearch({});
		}
	};

	return (
		<div className="flex flex-col items-start gap-[14px]" style={{ width: colPlus(23) }}>
			<div className="flex w-[222px] flex-col items-start gap-[24px]">
				<BackHeader crumb={`Simulate  /  Portfolio  /  ${symbol}`} to="/simulate/portfolio" />
				<div className="flex flex-col items-start gap-[4px] whitespace-nowrap">
					<div className="flex flex-col items-start gap-[4px]">
						<div className="flex flex-col items-start gap-[4px] text-[#819abb]">
							<Eyebrow>{`PICKED ${dayLabel(view.addedAt).toUpperCase()} · ${whole(view.stake)} STAKE`}</Eyebrow>
							<p className="font-geist text-[12px] leading-[16px]">{`${symbol} · ${name}`}</p>
						</div>
						<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{money(quote?.price ?? view.price)}</p>
					</div>
					<p className={cn("font-geist text-[13px] font-medium leading-[17px]", (quote?.changePercent ?? 0) >= 0 ? "text-[#2fd08a]" : "text-[#e5484d]")}>
						{changeLine(quote?.changePercent ?? 0)}
					</p>
				</div>
			</div>

			<div className="flex w-full items-start gap-[23px]">
				<div className="flex min-w-0 flex-col items-start gap-[30px]" style={{ flex: "744 1 0" }}>
					<div className="flex w-full flex-col items-start gap-[14px]">
						<section className="flex w-full flex-col items-start gap-[11px] overflow-clip rounded-[16px] bg-[#181f30] p-[18px]">
							<div className="flex items-center gap-[9px] overflow-clip">
								<Avatar letter={stocks[symbol]?.initial ?? companyInitial(symbol)} size={38} radius={19} bg="#242b3d" />
								<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]">{`Picked ${dayLabel(view.addedAt)} at ${money(view.priceAtAdd ?? 0)}`}</p>
							</div>
							<div className="flex items-baseline gap-[7px] overflow-clip whitespace-nowrap font-sora font-semibold">
								<p className={cn("text-[38px] leading-[48px]", up ? "text-white" : "text-[#ff5a6a]")}>{gain.whole}</p>
								<p className="text-[16px] leading-[20px] text-[#819abb]">{gain.cents}</p>
							</div>
							<p className="whitespace-nowrap font-geist text-[12px] font-light leading-[16px] text-[#819abb]">
								{`That is ${up ? "up" : "down"} ${pct1(view.pct)} on a ${whole(view.stake)} paper stake`}
							</p>
							<div className="flex w-full flex-col items-center gap-[40px]">
								{/* "Chart line" 769.346x165; the export is 771.346x167 and overhangs 0.61% / 0.13% — the card clips the overflow */}
								<div className="relative h-[165px] w-[108.665%] shrink-0">
									<div className="absolute" style={{ inset: "-0.61% -0.13%" }}>
										<img alt="" src={SA.chartLine} className="block size-full max-w-none" />
									</div>
								</div>
								<div className="flex w-full items-center justify-center gap-[90px]">
									{d.hero.ranges.map((r) =>
										r === d.hero.activeRange ? (
											<div
												key={r}
												className="flex h-[22.5px] w-[39px] shrink-0 items-center justify-center rounded-[11.25px] bg-[rgba(44,157,188,0.16)] px-[7px] pt-[3px] pb-[5px]"
												style={{ boxShadow: hairline(0.75, "rgba(44,157,188,0.4)") }}
											>
												<p className="whitespace-nowrap text-center font-geist text-[12px] font-medium leading-[16px] text-[#69b3ca] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
													{r}
												</p>
											</div>
										) : (
											<p key={r} className="whitespace-nowrap text-center font-geist text-[12px] leading-[16px] text-[#819abb]">
												{r}
											</p>
										),
									)}
								</div>
							</div>
						</section>

						<section className="flex w-full items-baseline overflow-clip rounded-[12px] bg-[#181f30] px-[12px] py-[10px]">
							<div className="flex w-full flex-col items-start gap-[8px]">
								<div className="flex items-start gap-[7px] overflow-clip">
									<img alt="" src={SA.sparkle} className="size-[16px] shrink-0" />
									<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.9px] text-[#5c6b85]">{d.insight.label}</p>
								</div>
								<p className="w-full font-geist text-[12px] leading-[17px] text-[#c8d2e0]">{insight}</p>
							</div>
						</section>
					</div>

					<div className="flex w-full flex-col items-start gap-[10px] overflow-clip whitespace-nowrap font-geist">
						{stats.map((row) => (
							<div key={row[0]!.label} className="flex w-full items-start gap-[10px] overflow-clip">
								{row.map((cell) => (
									<div key={cell.label} className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip rounded-[14px] bg-[#181f30] px-[14px] py-[13px]">
										<p className="text-[10px] leading-[13px] text-[#819abb]">{cell.label}</p>
										<p className={cn("text-[14px] leading-[18px]", cell.up ? "text-[#2fd08a]" : "text-white")}>{cell.value}</p>
									</div>
								))}
							</div>
						))}
					</div>
				</div>

				<div className="flex min-w-0 flex-col items-start overflow-clip" style={{ flex: "390 1 0" }}>
					<Card className="w-full">
						<Eyebrow>{d.position.eyebrow}</Eyebrow>
						<p className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{`${shares4(view.shares)} shares · worth ${money(view.value)}`}</p>
						<div className="flex w-full flex-col items-start gap-[16px]">
							<SellButton onClick={() => setSearch({ modal: "sell-confirm" })} disabled={!pos}>
								{d.position.sell}
							</SellButton>
							<GhostButton height={51} radius={6} fontSize={14} onClick={() => navigate({ to: "/simulate/portfolio" })}>
								{d.position.back}
							</GhostButton>
						</div>
						<p className="w-[calc(100%-30px)] font-geist text-[11px] leading-[14px] text-[#819abb]">{note}</p>
					</Card>
				</div>
			</div>

			{search.modal === "sell-confirm" && pos && (
				<SellConfirmSheet symbol={symbol} stock={stock} shares={pos.shares} value={pos.value} onConfirm={confirmSell} onClose={() => setSearch({})} />
			)}
			{search.modal === "sell-success" && (
				<SellSuccessSheet
					stock={stock}
					shares={sale.shares}
					stake={sale.stake}
					proceeds={sale.proceeds}
					pnl={sale.pnl}
					onPrimary={() => navigate({ to: "/simulate" })}
					onSecondary={() => navigate({ to: "/simulate/portfolio" })}
					onClose={() => (pos ? setSearch({}) : navigate({ to: "/simulate/portfolio" }))}
				/>
			)}
		</div>
	);
}

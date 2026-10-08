import { useNavigate } from "@tanstack/react-router";
import { colPlus } from "@/app/FitCanvas";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import { pickDetail, stocks } from "./data";
import { SellConfirmSheet, SellSuccessSheet } from "./sheets";
import { Avatar, BackHeader, Card, Eyebrow, GhostButton, hairline, SellButton } from "./ui";

export type PickDetailSearch = { modal?: "sell-confirm" | "sell-success"; portion?: number };

/** 2:850 "Desktop · Pick detail" (+ 2:1458 Sell confirm, 2:1730 Sell success as ?modal=). Demo data is the NVDA pick. */
export function PickDetail({ symbol, search }: { symbol: string; search: PickDetailSearch }) {
	const navigate = useNavigate();
	const d = pickDetail;
	const stock = stocks[symbol] ?? stocks.NVDA;
	const crumb = symbol === d.symbol ? d.crumb : `Simulate  /  Portfolio  /  ${symbol}`;
	const setSearch = (next: PickDetailSearch) =>
		navigate({ to: "/simulate/picks/$symbol", params: { symbol }, search: next, replace: true });

	return (
		<div className="flex flex-col items-start gap-[14px]" style={{ width: colPlus(23) }}>
			<div className="flex w-[222px] flex-col items-start gap-[24px]">
				<BackHeader crumb={crumb} to="/simulate/portfolio" />
				<div className="flex flex-col items-start gap-[4px] whitespace-nowrap">
					<div className="flex flex-col items-start gap-[4px]">
						<div className="flex flex-col items-start gap-[4px] text-[#819abb]">
							<Eyebrow>{d.eyebrow}</Eyebrow>
							<p className="font-geist text-[12px] leading-[16px]">{d.subtitle}</p>
						</div>
						<p className="font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{d.price}</p>
					</div>
					<p className="font-geist text-[13px] font-medium leading-[17px] text-[#2fd08a]">{d.change}</p>
				</div>
			</div>

			<div className="flex w-full items-start gap-[23px]">
				<div className="flex min-w-0 flex-col items-start gap-[30px]" style={{ flex: "744 1 0" }}>
					<div className="flex w-full flex-col items-start gap-[14px]">
						<section className="flex w-full flex-col items-start gap-[11px] overflow-clip rounded-[16px] bg-[#181f30] p-[18px]">
							<div className="flex items-center gap-[9px] overflow-clip">
								<Avatar letter={stock.initial} size={38} radius={19} bg="#242b3d" />
								<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]">{d.hero.picked}</p>
							</div>
							<div className="flex items-baseline gap-[7px] overflow-clip whitespace-nowrap font-sora font-semibold">
								<p className="text-[38px] leading-[48px] text-white">{d.hero.gainWhole}</p>
								<p className="text-[16px] leading-[20px] text-[#819abb]">{d.hero.gainCents}</p>
							</div>
							<p className="whitespace-nowrap font-geist text-[12px] font-light leading-[16px] text-[#819abb]">{d.hero.caption}</p>
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
								<p className="w-full font-geist text-[12px] leading-[17px] text-[#c8d2e0]">{d.insight.text}</p>
							</div>
						</section>
					</div>

					<div className="flex w-full flex-col items-start gap-[10px] overflow-clip whitespace-nowrap font-geist">
						{d.stats.map((row) => (
							<div key={row[0].label} className="flex w-full items-start gap-[10px] overflow-clip">
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
						<p className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{d.position.line}</p>
						<div className="flex w-full flex-col items-start gap-[16px]">
							<SellButton onClick={() => setSearch({ modal: "sell-confirm" })}>
								{d.position.sell}
							</SellButton>
							<GhostButton height={51} radius={6} fontSize={14} onClick={() => navigate({ to: "/simulate/portfolio" })}>
								{d.position.back}
							</GhostButton>
						</div>
						<p className="w-[calc(100%-30px)] font-geist text-[11px] leading-[14px] text-[#819abb]">{d.position.note}</p>
					</Card>
				</div>
			</div>

			{search.modal === "sell-confirm" && (
				<SellConfirmSheet
					symbol={symbol}
					stock={stock}
					onConfirm={(portion) => setSearch({ modal: "sell-success", portion })}
					onClose={() => setSearch({})}
				/>
			)}
			{search.modal === "sell-success" && (
				<SellSuccessSheet
					stock={stock}
					portion={search.portion ?? 1}
					onPrimary={() => navigate({ to: "/simulate" })}
					onSecondary={() => navigate({ to: "/simulate/portfolio" })}
					onClose={() => setSearch({})}
				/>
			)}
		</div>
	);
}

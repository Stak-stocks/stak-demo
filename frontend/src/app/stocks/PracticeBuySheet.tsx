import { useState } from "react";
import { SheetBackButton } from "@/app/discover/Button";
import { PrimaryButton } from "@/app/ui/Button";
import { money, shares4 } from "@/app/live/format";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";
import { ticketCopy } from "./data";

type Props = {
	ticker: string;
	name: string;
	initial: string;
	/** today's price (live or demo) */
	price: number;
	/** "▲ 2.4%" */
	changeShort: string;
	/** paper cash available right now */
	cash: number;
	/** vertical offset of the sheet centre from the viewport centre (Figma: +88.5 on the 1024 deck, +0.5 on the 1200 detail) */
	offsetY: number;
	scrim?: string;
	defaultAmount?: number;
	onClose: () => void;
	onConfirm: (amount: number, shares: number) => void | Promise<void>;
};

const AMOUNTS = [10, 25, 50, 100] as const;

/** "Sheet" 480 wide over a scrim — the practice-buy ticket (Figma 2:3385 / 2:4321 / 2:5365), priced live. */
export function PracticeBuySheet({ ticker, name, initial, price, changeShort, cash, offsetY, scrim, defaultAmount = 25, onClose, onConfirm }: Props) {
	const [amount, setAmount] = useState(defaultAmount);
	const [custom, setCustom] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const shares = price > 0 ? amount / price : 0;
	const short = amount > cash + 0.005;
	const canBuy = amount > 0 && !short && price > 0 && !busy;
	const down = changeShort.startsWith("▼");

	const confirm = async () => {
		if (!canBuy) return;
		setBusy(true);
		try {
			await onConfirm(Math.round(amount * 100) / 100, Math.round(shares * 10000) / 10000);
		} finally {
			setBusy(false);
		}
	};

	const chip = (selected: boolean) =>
		cn(
			"stak-press flex h-[32px] min-w-px flex-1 cursor-pointer items-center justify-center overflow-clip rounded-[10px] font-geist text-[12px] font-medium leading-[16px]",
			selected ? "bg-[#0f2a38] text-[#a6e4f7] shadow-[inset_0_0_0_0.5px_#5da8bf]" : "bg-[#0b1430] text-[#dce7f7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
		);

	return (
		<Sheet label={`Buy ${ticker}?`} scrim={scrim ?? "rgba(0,0,0,0.66)"} offsetY={offsetY} onClose={onClose}>
			<p className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">Buy {ticker}?</p>
			<div className="flex w-full items-center gap-[11px] overflow-clip rounded-[5.78px] bg-[rgba(105,179,202,0.1)] px-[14px] py-[12px]">
				<div className="flex size-[38px] shrink-0 items-center justify-center overflow-clip rounded-[19px] bg-[#242b3d]">
					<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#9eadc7]">{initial}</span>
				</div>
				<div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip whitespace-nowrap">
					<p className="font-geist text-[13px] font-medium leading-[17px] text-white">{name}</p>
					<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{price > 0 ? money(price) : "—"} today</p>
				</div>
				<p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", down ? "text-[#e5484d]" : "text-[#2fd08a]")}>{changeShort}</p>
			</div>
			<p className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{ticketCopy.body}</p>
			<div className="flex w-full flex-col items-start gap-[24px] overflow-clip">
				<div className="flex w-full flex-col items-start gap-[15px]">
					<div className="flex items-center gap-[6px] overflow-clip whitespace-nowrap font-geist text-[12px] leading-[16px]">
						<span className="text-[#819abb]">{ticketCopy.cashLabel}</span>
						<span className={cn("font-medium", short ? "text-[#e5484d]" : "text-[#f2f6fc]")}>{money(cash)}</span>
					</div>
					<div className="flex w-full items-start gap-[8px] overflow-clip">
						{AMOUNTS.map((a) => {
							const on = custom === null && amount === a;
							return (
								<button
									key={a}
									type="button"
									aria-pressed={on}
									className={chip(on)}
									onClick={() => {
										setCustom(null);
										setAmount(a);
									}}
								>
									${a}
								</button>
							);
						})}
						{custom === null ? (
							<button type="button" aria-pressed={false} className={chip(false)} onClick={() => setCustom(String(amount))}>
								{ticketCopy.amounts[4]}
							</button>
						) : (
							<label className={cn(chip(true), "px-[6px]")}>
								<span className="sr-only">Custom amount in dollars</span>
								<span className="text-[#819abb]">$</span>
								<input
									autoFocus
									type="number"
									inputMode="decimal"
									min={1}
									step={1}
									value={custom}
									onChange={(e) => {
										setCustom(e.target.value);
										setAmount(Math.max(0, Number(e.target.value) || 0));
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											confirm();
										}
									}}
									className="w-full min-w-0 bg-transparent text-center font-geist text-[12px] font-medium text-[#a6e4f7] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
							</label>
						)}
					</div>
				</div>
				<div className="flex h-[19px] w-full items-start justify-center gap-[6px] overflow-clip whitespace-nowrap">
					{short ? (
						<span className="mt-[3px] font-geist text-[12px] leading-[16px] text-[#e5484d]">Only {money(cash)} of paper cash left</span>
					) : (
						<>
							<span className="mt-[3px] font-geist text-[12px] leading-[16px] text-[#819abb]">{ticketCopy.youGet}</span>
							<span className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{shares4(shares)}</span>
							<span className="mt-[3px] font-geist text-[12px] leading-[16px] text-[#819abb]">
								{ticketCopy.sharesOf} {ticker}
							</span>
						</>
					)}
				</div>
			</div>
			<div className="flex w-full flex-col items-start gap-[16px]">
				<PrimaryButton onClick={confirm} disabled={!canBuy} aria-disabled={!canBuy}>
					{busy ? "Placing order…" : ticketCopy.confirm}
				</PrimaryButton>
				<SheetBackButton onClick={onClose}>{ticketCopy.back}</SheetBackButton>
			</div>
		</Sheet>
	);
}

import { PrimaryButton, SheetBackButton } from "@/app/discover/Button";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";
import { ticketCopy } from "./data";

type Props = {
	symbol: string;
	name: string;
	initial: string;
	price: string;
	changeShort: string;
	shares: string;
	/** vertical offset of the sheet centre from the viewport centre (Figma: +88.5 on the 1024 deck, +0.5 on the 1200 detail) */
	offsetY: number;
	scrim?: string;
	onClose: () => void;
	onConfirm: () => void;
};

/** "Sheet" 480 wide over a scrim — the practice-buy ticket (Figma 2:3385 / 2:4321 / 2:5365). */
export function PracticeBuySheet({ symbol, name, initial, price, changeShort, shares, offsetY, scrim, onClose, onConfirm }: Props) {
	return (
		<Sheet label={`Buy ${symbol}?`} scrim={scrim ?? "rgba(0,0,0,0.66)"} offsetY={offsetY} onClose={onClose}>
			<p className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">Buy {symbol}?</p>
				<div className="flex w-full items-center gap-[11px] overflow-clip rounded-[5.78px] bg-[rgba(105,179,202,0.1)] px-[14px] py-[12px]">
					<div className="flex size-[38px] shrink-0 items-center justify-center overflow-clip rounded-[19px] bg-[#242b3d]">
						<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#9eadc7]">{initial}</span>
					</div>
					<div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip whitespace-nowrap">
						<p className="font-geist text-[13px] font-medium leading-[17px] text-white">{name}</p>
						<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{price} today</p>
					</div>
					<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#2fd08a]">{changeShort}</p>
				</div>
				<p className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{ticketCopy.body}</p>
				<div className="flex w-full flex-col items-start gap-[24px] overflow-clip">
					<div className="flex w-full flex-col items-start gap-[15px]">
						<div className="flex items-center gap-[6px] overflow-clip whitespace-nowrap font-geist text-[12px] leading-[16px]">
							<span className="text-[#819abb]">{ticketCopy.cashLabel}</span>
							<span className="font-medium text-[#f2f6fc]">{ticketCopy.cash}</span>
						</div>
						<div className="flex w-full items-start gap-[8px] overflow-clip">
							{ticketCopy.amounts.map((a, i) => {
								const on = i === ticketCopy.selected;
								return (
									<button
										key={a}
										type="button"
										aria-pressed={on}
										className={cn(
											"flex h-[32px] min-w-px flex-1 items-center justify-center overflow-clip rounded-[10px] font-geist text-[12px] font-medium leading-[16px]",
											on
												? "bg-[#0f2a38] text-[#a6e4f7] shadow-[inset_0_0_0_0.5px_#5da8bf]"
												: "bg-[#0b1430] text-[#dce7f7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
										)}
									>
										{a}
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex h-[19px] w-full items-start justify-center gap-[6px] overflow-clip whitespace-nowrap">
						<span className="mt-[3px] font-geist text-[12px] leading-[16px] text-[#819abb]">{ticketCopy.youGet}</span>
						<span className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{shares}</span>
						<span className="mt-[3px] font-geist text-[12px] leading-[16px] text-[#819abb]">
							{ticketCopy.sharesOf} {symbol}
						</span>
					</div>
				</div>
				<div className="flex w-full flex-col items-start gap-[16px]">
					<PrimaryButton className="px-[14px] py-[7px]" onClick={onConfirm}>
						{ticketCopy.confirm}
					</PrimaryButton>
					<SheetBackButton onClick={onClose}>{ticketCopy.back}</SheetBackButton>
				</div>
		</Sheet>
	);
}

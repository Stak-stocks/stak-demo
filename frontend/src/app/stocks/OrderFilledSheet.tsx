import { money, shares4 } from "@/app/live/format";
import { SA } from "@/app/simulate/assets";
import { sheets } from "@/app/simulate/data";
import { GhostButton } from "@/app/simulate/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";

type Props = {
	ticker: string;
	name: string;
	initial: string;
	price: number;
	/** "▲ 2.4%" */
	changeShort: string;
	/** shares just bought */
	shares: number;
	/** paper cash after the order */
	cash: number;
	onPrimary: () => void;
	/** "Keep exploring" */
	onSecondary: () => void;
	onClose: () => void;
};

/** 2:1699 "Order filled" with the order's real shares and the cash that is left — the deck and detail flows' success sheet. */
export function OrderFilledSheet({ ticker, name, initial, price, changeShort, shares, cash, onPrimary, onSecondary, onClose }: Props) {
	const s = sheets.addSuccess;
	const down = changeShort.startsWith("▼");
	return (
		<Sheet label={s.title} onClose={onClose}>
			<div className="flex w-full flex-col items-center gap-[14px]">
				<div className="flex w-full flex-col items-center gap-[14px]">
					<img alt="" src={SA.checkCircle} className="size-[47px]" />
					<p className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">{s.title}</p>
					<div className="flex w-full items-center gap-[12px] overflow-clip rounded-[6px] bg-[rgba(105,179,202,0.1)] px-[14px] py-[12px]">
						<div className="flex size-[38px] shrink-0 items-center justify-center overflow-clip rounded-[19px] bg-[#242b3d]">
							<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#9eadc7]">{initial}</span>
						</div>
						<div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip whitespace-nowrap">
							<p className="font-geist text-[13px] font-medium leading-[17px] text-white">{name}</p>
							<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{money(price)} today</p>
						</div>
						<p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", down ? "text-[#e5484d]" : "text-[#2fd08a]")}>{changeShort}</p>
					</div>
				</div>
				<p className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{s.description}</p>
			</div>
			<div className="flex w-full flex-col items-start overflow-clip">
				<div className="flex w-full flex-col items-start gap-[24px]">
					<div className="flex items-center gap-[6px] overflow-clip whitespace-nowrap text-[12px]">
						<p className="font-geist leading-[16px] text-[#819abb]">{s.cashLabel}</p>
						<p className="font-geist font-medium leading-[16px] text-[#f2f6fc]">{money(cash)}</p>
					</div>
					<div className="flex w-full items-baseline justify-center gap-[6px] overflow-clip whitespace-nowrap">
						<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{s.youHold}</p>
						<p className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{shares4(shares)}</p>
						<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{sheets.addConfirm.sharesOf(ticker)}</p>
					</div>
				</div>
			</div>
			<div className="flex w-full flex-col items-start gap-[16px]">
				<PrimaryButton onClick={onPrimary}>{s.primary}</PrimaryButton>
				<GhostButton onClick={onSecondary} height={52} radius={6} fontSize={14}>
					{s.secondary}
				</GhostButton>
			</div>
		</Sheet>
	);
}

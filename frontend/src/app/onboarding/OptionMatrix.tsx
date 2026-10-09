import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OB } from "./assets";
import type { MatrixOption } from "./data";

/**
 * 2x2 option matrix (776x300): 378x140 cards, 20px gutters, selected = 0.5px #69b3ca hairline.
 * The arrow keys move between the cards (left/right across a row, up/down across rows).
 */
export function OptionMatrix({
	options,
	icons,
	selected,
	onSelect,
	wideFirst,
}: {
	options: MatrixOption[];
	icons: Record<string, ReactNode>;
	selected: string | null;
	onSelect: (id: string) => void;
	/** The first goal card in Figma has a 34px gap and no fixed row width. */
	wideFirst?: boolean;
}) {
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const cards = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-option]"));
		const at = cards.indexOf(document.activeElement as HTMLButtonElement);
		if (at === -1) return;
		const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 };
		const delta = step[e.key];
		if (delta === undefined) return;
		const next = cards[at + delta];
		if (next) {
			e.preventDefault();
			next.focus();
		}
	};
	return (
		<div className="relative h-[300px] w-full overflow-clip" role="radiogroup" onKeyDown={onKeyDown}>
			{options.map((o, i) => {
				const isSelected = o.id === selected;
				const first = wideFirst && i === 0;
				return (
					<button
						type="button"
						key={o.id}
						data-option={o.id}
						role="radio"
						aria-checked={isSelected}
						onClick={() => onSelect(o.id)}
						className={cn(
							"stak-press absolute flex h-[140px] w-[378px] cursor-pointer flex-col items-center justify-center overflow-clip rounded-[16px] bg-[#181f30] py-[20px] pl-[24px] pr-[40px] text-left",
							isSelected && "border-[0.5px] border-solid border-[#69b3ca]",
						)}
						style={{ left: i % 2 ? 398 : 0, top: i < 2 ? 0 : 160 }}
					>
						<div className={cn("flex h-[57px] items-center", first ? "justify-center gap-[34px]" : "w-[274px] gap-[30px]")}>
							{icons[o.id]}
							<div className="flex w-[187px] flex-col items-start gap-[6px]">
								<p className="w-full font-geist text-[15px] font-medium leading-[20px] text-[#f2f6fc]">{o.title}</p>
								<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{o.subtitle}</p>
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}

/** 57px #242b3d disc with a centred glyph at the frame's sub-pixel offset. */
function Disc({ children }: { children: ReactNode }) {
	return <div className="relative size-[57px] shrink-0 overflow-clip rounded-[28.351px] bg-[#242b3d]">{children}</div>;
}

export const GOAL_ICONS: Record<string, ReactNode> = {
	learn: (
		<Disc>
			<img alt="" src={OB.goal.learn} className="absolute left-[calc(50%+0.24px)] top-[calc(50%+2.94px)] size-[27.818px] -translate-x-1/2 -translate-y-1/2" />
		</Disc>
	),
	grow: (
		<Disc>
			<img alt="" src={OB.goal.grow} className="absolute left-[calc(50%+0.13px)] top-[calc(50%-0.37px)] size-[31.267px] -translate-x-1/2 -translate-y-1/2" />
		</Disc>
	),
	first: (
		<Disc>
			<img alt="" src={OB.goal.first} className="absolute left-[calc(50%-0.34px)] top-[calc(50%+0.16px)] size-[38.32px] -translate-x-1/2 -translate-y-1/2" />
		</Disc>
	),
	explore: (
		<Disc>
			<img alt="" src={OB.goal.explore} className="absolute left-[calc(50%+0.13px)] top-[calc(50%-0.37px)] size-[33.267px] -translate-x-1/2 -translate-y-1/2" />
		</Disc>
	),
};

export const RISK_ICONS: Record<string, ReactNode> = {
	buy: <img alt="" src={OB.risk.buy} className="size-[57px] shrink-0" />,
	hold: (
		<Disc>
			<div className="absolute inset-[39.04%_28.07%_37.28%_29.82%]">
				<div className="absolute inset-[-5.56%_-3.76%]">
					<img alt="" src={OB.risk.hold} className="block size-full max-w-none" />
				</div>
			</div>
		</Disc>
	),
	step: (
		<Disc>
			<div className="absolute inset-[39.47%_42.11%_39.47%_43.86%]">
				<div className="absolute inset-[0_-9.38%]">
					<img alt="" src={OB.risk.step} className="block size-full max-w-none" />
				</div>
			</div>
		</Disc>
	),
	sell: (
		<Disc>
			<img alt="" src={OB.risk.sell} className="absolute left-1/2 top-[calc(50%-0.5px)] size-[29px] -translate-x-1/2 -translate-y-1/2" />
		</Disc>
	),
};

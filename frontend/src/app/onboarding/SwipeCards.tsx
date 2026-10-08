import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OB } from "./assets";
import { BackControl } from "./Chrome";
import { TUTORIAL_CARDS, type TutorialCard } from "./data";

/**
 * Step 03 deck (2:5895): three stacked discover cards, the front one upright, the two behind rotated
 * ±5° and faded. Arrow keys / the round controls rotate which stock is in front; Save toggles the pill.
 */
export function SwipeCards() {
	const [order, setOrder] = useState<TutorialCard[]>(TUTORIAL_CARDS);
	const [saved, setSaved] = useState<Record<string, boolean>>({});
	const [front, left, right] = order;

	const next = () => setOrder(([a, b, c]) => [b, c, a]);
	const prev = () => setOrder(([a, b, c]) => [c, a, b]);
	const toggleSave = (id: string) => setSaved((s) => ({ ...s, [id]: !s[id] }));

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") prev();
			if (e.key === "ArrowRight") toggleSave(front.id);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [front.id]);

	return (
		<div className="flex w-full flex-col items-center gap-[35px]">
			<div className="relative h-[460.461px] w-[680.499px] shrink-0">
				<BackCard variant="right" card={right} saved={!!saved[right.id]} />
				<BackCard variant="left" card={left} saved={!!saved[left.id]} />
				<FrontCard card={front} saved={!!saved[front.id]} onSave={() => toggleSave(front.id)} />
			</div>
			<div className="flex items-center justify-center gap-[93px]">
				<BackControl onClick={prev} />
				<BackControl flipped onClick={next} />
			</div>
		</div>
	);
}

const SAVE_LABEL = (saved: boolean) => (saved ? "Saved" : "Save");

/** Media art for a card: box vectors + shadow + the stock's crystal coin, at the frame's geometry. */
function Media({ id, scale }: { id: TutorialCard["id"]; scale: "googl" | "aapl" | "nvda" }) {
	const art = OB.swipe[id];
	if (scale === "googl") {
		return (
			<div className="absolute left-1/2 top-[30.26px] h-[242.684px] w-[179.422px] -translate-x-1/2">
				<div className="absolute left-[-13.46px] top-[66.45px] h-[185.653px] w-[206.336px]">
					<div className="absolute inset-[0_-7.17%_-13.17%_-4.34%]">
						<img alt="" className="block size-full max-w-none" src={art.box} />
					</div>
				</div>
				<div className="absolute left-[30.96px] top-[-4.48px] h-[129.687px] w-[121.55px]">
					<div className="absolute inset-[0_0.39%_0_0.37%]">
						<img alt="" className="block size-full max-w-none" src={art.shadow} />
					</div>
				</div>
				<div className="absolute left-[1.79px] top-[-11.2px] flex size-[175.799px] items-center justify-center">
					<div className="flex-none rotate-[-49.53deg]">
						<div className="relative size-[124.699px]">
							<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={art.coin} />
						</div>
					</div>
				</div>
			</div>
		);
	}
	if (scale === "aapl") {
		return (
			<div className="absolute left-1/2 top-[32.22px] h-[258.341px] w-[190.998px] -translate-x-1/2">
				<div className="absolute left-[-14.32px] top-[70.74px] h-[197.631px] w-[219.648px]">
					<div className="absolute inset-[0_-7.17%_-13.17%_-4.34%]">
						<img alt="" className="block size-full max-w-none" src={art.box} />
					</div>
				</div>
				<div className="absolute left-[32.96px] top-[-4.78px] h-[138.054px] w-[129.392px]">
					<div className="absolute inset-[0_0.39%_0_0.37%]">
						<img alt="" className="block size-full max-w-none" src={art.shadow} />
					</div>
				</div>
				<div className="absolute left-[calc(50%-0.48px)] top-[16.49px] size-[132.744px] -translate-x-1/2">
					<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={art.coin} />
				</div>
			</div>
		);
	}
	return (
		<div className="absolute left-1/2 top-[35.8px] h-[287.046px] w-[212.22px] -translate-x-1/2">
			<div className="absolute left-[-15.92px] top-[78.6px] h-[219.59px] w-[244.053px]">
				<div className="absolute inset-[0_-7.17%_-13.17%_-4.34%]">
					<img alt="" className="block size-full max-w-none" src={art.box} />
				</div>
			</div>
			<div className="absolute left-[36.62px] top-[-5.31px] h-[153.393px] w-[143.769px]">
				<div className="absolute inset-[0_0.39%_0_0.37%]">
					<img alt="" className="block size-full max-w-none" src={art.shadow} />
				</div>
			</div>
			<div className="absolute left-[31.83px] top-[18.32px] size-[147.493px]">
				<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={art.coin} />
			</div>
		</div>
	);
}

function BackCard({ variant, card, saved }: { variant: "left" | "right"; card: TutorialCard; saved: boolean }) {
	const isRight = variant === "right";
	const art = OB.swipe[card.id];
	return (
		<div
			className={cn(
				"absolute flex items-center justify-center",
				isRight ? "left-[333.04px] top-0 h-[423.583px] w-[347.459px]" : "left-0 top-[2.24px] h-[439.887px] w-[368.911px]",
			)}
		>
			<div className={cn("flex-none", isRight ? "-rotate-5" : "rotate-5")}>
				<div
					className={cn(
						"relative flex flex-col items-center overflow-clip bg-gradient-to-b to-[#0c1526]",
						isRight
							? "h-[397.73px] w-[313.989px] gap-[22px] rounded-[19.736px] from-[#263d5d] pt-[5px] opacity-65"
							: "h-[412.324px] w-[334.247px] gap-[24px] rounded-[21.01px] from-[#283e5d] py-[4px] opacity-85",
					)}
				>
					<div
						className={cn(
							"relative shrink-0 overflow-clip",
							isRight ? "h-[205.439px] w-[305.018px] rounded-[16.148px] bg-[#2f486e]" : "h-[218.693px] w-[324.697px] rounded-[17.19px] bg-[#253a59]",
						)}
					>
						<Media id={card.id} scale={isRight ? "googl" : "aapl"} />
					</div>
					<div className={cn("flex w-full flex-col items-start overflow-clip", isRight ? "px-[16px] pb-[14px]" : "px-[17px] pb-[15px]")}>
						<div className={cn("flex w-full flex-col items-start", isRight ? "gap-[17px]" : "gap-[18px]")}>
							<div className={cn("flex w-full flex-col items-start", isRight ? "gap-[7px]" : "gap-[8px]")}>
								<p className={cn("whitespace-nowrap font-geist text-[#819abb]", isRight ? "text-[8.971px] leading-[12px]" : "text-[9.55px] leading-[13px]")}>
									{card.ticker}
								</p>
								<div className={cn("flex w-full flex-col items-start", isRight ? "gap-[7px]" : "gap-[8px]")}>
									<p className={cn("w-full font-geist text-white", isRight ? "text-[14.354px] leading-[20.634px]" : "text-[15.28px] leading-[21.965px]")}>
										{card.blurb}
									</p>
									<div className={cn("flex items-baseline overflow-clip whitespace-nowrap", isRight ? "gap-[8px]" : "gap-[9px]")}>
										<p className={cn("font-sora font-semibold text-white", isRight ? "text-[17.942px] leading-[23px]" : "text-[19.1px] leading-[24px]")}>
											{card.price}
										</p>
										<p className={cn("font-geist font-medium text-[#2fd08a]", isRight ? "text-[9.868px] leading-[13px]" : "text-[10.505px] leading-[14px]")}>
											{card.change}
										</p>
									</div>
								</div>
							</div>
							<div
								className={cn(
									"flex w-full items-center overflow-clip bg-[rgba(105,179,202,0.1)]",
									isRight ? "gap-[7px] rounded-[8.971px] px-[11px] py-[8px]" : "gap-[8px] rounded-[9.55px] px-[11px] py-[9px]",
								)}
							>
								<p className={cn("whitespace-nowrap font-geist font-medium text-[#69b3ca]", isRight ? "text-[8.971px] leading-[12px] tracking-[0.8074px]" : "text-[9.55px] leading-[13px] tracking-[0.8595px]")}>
									TIP
								</p>
								<p className={cn("min-w-px flex-1 font-geist text-[#c8d2e0]", isRight ? "text-[9.868px] leading-[13.457px]" : "text-[10.505px] leading-[14.325px]")}>
									{card.tip}
								</p>
							</div>
						</div>
					</div>
					<div
						className={cn(
							"absolute flex items-center justify-center overflow-clip bg-[rgba(255,255,255,0.09)]",
							isRight ? "left-[242.67px] top-[8.07px] gap-[5px] rounded-[14.354px] px-[12px] py-[6px]" : "left-[258.33px] top-[8.59px] gap-[6px] rounded-[15.28px] px-[12px] py-[7px]",
						)}
					>
						<p className={cn("whitespace-nowrap font-geist font-medium text-white", isRight ? "text-[10.765px] leading-[14px]" : "text-[11.46px] leading-[15px]")}>
							{SAVE_LABEL(saved)}
						</p>
						<img alt="" src={art.bookmark} className={isRight ? "size-[10.765px]" : "size-[11.46px]"} />
					</div>
				</div>
			</div>
		</div>
	);
}

function FrontCard({ card, saved, onSave }: { card: TutorialCard; saved: boolean; onSave: () => void }) {
	const art = OB.swipe[card.id];
	return (
		<div className="absolute left-[160.86px] top-[3.73px] flex h-[456.731px] w-[371.385px] flex-col items-center gap-[27px] overflow-clip rounded-[23.344px] bg-gradient-to-b from-[#152a47] to-[#0c1526] py-[4px]">
			<div className="relative h-[242.992px] w-[360.774px] shrink-0 overflow-clip rounded-[19.1px] bg-[#142844]">
				<Media id={card.id} scale="nvda" />
				<button
					type="button"
					aria-pressed={saved}
					onClick={onSave}
					className="absolute left-[280.13px] top-[6.37px] flex items-center justify-center gap-[6px] overflow-clip rounded-[16.978px] bg-[rgba(255,255,255,0.09)] px-[14px] py-[7px]"
				>
					<span className="whitespace-nowrap font-geist text-[12.733px] font-medium leading-[17px] text-white">{SAVE_LABEL(saved)}</span>
					<img alt="" src={art.bookmark} className="size-[12.733px]" />
				</button>
			</div>
			<div className="flex w-full flex-col items-start overflow-clip px-[19px] pb-[17px]">
				<div className="flex w-full flex-col items-start gap-[20px]">
					<div className="flex w-full flex-col items-start gap-[8px]">
						<p className="whitespace-nowrap font-geist text-[10.611px] leading-[14px] text-[#819abb]">{card.ticker}</p>
						<div className="flex w-full flex-col items-start gap-[8px]">
							<p className="w-full font-geist text-[16.978px] leading-[24.405px] text-white">{card.blurb}</p>
							<div className="flex items-baseline gap-[10px] overflow-clip whitespace-nowrap">
								<p className="font-sora text-[21.222px] font-semibold leading-[27px] text-white">{card.price}</p>
								<p className="font-geist text-[11.672px] font-medium leading-[15px] text-[#2fd08a]">{card.change}</p>
							</div>
						</div>
					</div>
					<div className="flex w-full items-center gap-[8px] overflow-clip rounded-[10.611px] bg-[rgba(105,179,202,0.1)] px-[13px] py-[10px]">
						<p className="whitespace-nowrap font-geist text-[10.611px] font-medium leading-[14px] tracking-[0.955px] text-[#69b3ca]">TIP</p>
						<p className="min-w-px flex-1 font-geist text-[11.672px] leading-[15.917px] text-[#c8d2e0]">{card.tip}</p>
					</div>
				</div>
			</div>
		</div>
	);
}

import { D } from "./assets";
import type { DeckCardData } from "./data";
import { deckCopy } from "./data";

export type DeckSlot = "center" | "left" | "right";

/**
 * One deck card at the centre geometry (371.385 × 456.731). The side slots are the same card
 * scaled (0.9 / 0.8455), tilted (+5° / −5°) and dimmed (.85 / .65) — exactly how Figma derived them.
 */
const TONES: Record<DeckSlot, { from: string; frame: string; opacity: number; scale: number; rotate: number }> = {
	center: { from: "#152a47", frame: "#142844", opacity: 1, scale: 1, rotate: 0 },
	left: { from: "#283e5d", frame: "#253a59", opacity: 0.85, scale: 0.9, rotate: 5 },
	right: { from: "#263d5d", frame: "#2f486e", opacity: 0.65, scale: 0.8455, rotate: -5 },
};

type Props = { card: DeckCardData; slot: DeckSlot; saved?: boolean; onSave?: () => void };

export function DeckCard({ card, slot, saved = false, onSave }: Props) {
	const tone = TONES[slot];
	const art = D.art[card.art];
	// the NVDA export is the illustration group clipped by its frame; the AAPL/GOOGL exports are
	// whole image frames that Figma rendered with the card opacity already composited over the page
	const groupArt = card.art === "nvda";
	return (
		<article
			className="relative h-[456.731px] w-[371.385px] shrink-0"
			style={{ transform: `rotate(${tone.rotate}deg) scale(${tone.scale})` }}
			data-slot={slot}
		>
			<div
				className="absolute inset-0 overflow-clip rounded-[23.344px]"
				style={{ opacity: tone.opacity, backgroundImage: `linear-gradient(to bottom, ${tone.from}, #0c1526)` }}
			/>
			<div className="absolute left-[5.3055px] top-[4px] h-[242.992px] w-[360.774px] overflow-clip rounded-[19.1px]">
				<div className="absolute inset-0" style={{ background: tone.frame, opacity: tone.opacity }} />
				{groupArt ? (
					<img
						alt=""
						src={art}
						className="absolute h-[212.5px] w-[272.5px] max-w-none"
						style={{ left: 47.77, top: 30.49, opacity: tone.opacity }}
					/>
				) : (
					<img alt="" src={art} className="absolute inset-0 size-full max-w-none" />
				)}
				<button
					type="button"
					onClick={onSave}
					aria-pressed={saved}
					className="absolute top-[6.37px] flex items-center justify-center gap-[6px] overflow-clip rounded-[16.978px] bg-[rgba(255,255,255,0.09)] px-[14px] py-[7px]"
					style={{ left: saved ? 268.13 : 280.13, opacity: tone.opacity }}
				>
					<span className="whitespace-nowrap font-geist text-[12.733px] font-medium leading-[16.13px] text-white">
						{saved ? deckCopy.saved : deckCopy.save}
					</span>
					<img alt="" src={saved ? D.bookmarkSaved : D.bookmark} className="size-[12.733px]" />
				</button>
			</div>
			<div
				className="absolute left-0 top-[273.992px] flex w-full flex-col items-start overflow-clip px-[19px] pb-[17px]"
				style={{ opacity: tone.opacity }}
			>
				<div className="flex w-full flex-col items-start gap-[20px]">
					<div className="flex w-full flex-col items-start gap-[8px]">
						<p className="whitespace-nowrap font-geist text-[10.611px] leading-[14px] text-[#819abb]">{card.ticker}</p>
						<div className="flex w-full flex-col items-start gap-[8px]">
							<p className="w-full font-geist text-[16.978px] leading-[24.405px] text-white">{card.headline}</p>
							<div className="flex items-baseline gap-[10px] overflow-clip whitespace-nowrap">
								<p className="font-sora text-[21.222px] font-semibold leading-[27px] text-white">{card.price}</p>
								<p className="font-geist text-[11.672px] font-medium leading-[15px] text-[#2fd08a]">{card.change}</p>
							</div>
						</div>
					</div>
					<div className="flex w-full items-center gap-[8px] overflow-clip rounded-[10.611px] bg-[rgba(105,179,202,0.1)] px-[13px] py-[10px]">
						<p className="whitespace-nowrap font-geist text-[10.611px] font-medium leading-[13.26px] tracking-[0.955px] text-[#69b3ca]">
							TIP
						</p>
						<p className="min-w-px flex-1 font-geist text-[11.672px] leading-[15.917px] text-[#c8d2e0]">{card.tip}</p>
					</div>
				</div>
			</div>
		</article>
	);
}

import type { CSSProperties, MouseEvent } from "react";
import { signText } from "@/app/stocks/tone";
import { cn } from "@/lib/utils";
import { D } from "./assets";
import type { DeckCardData } from "./data";
import { deckCopy } from "./data";
import { ART_W, GlassCoin } from "./GlassCoin";

export type DeckSlot = "center" | "left" | "right";

/**
 * Every value of the three cards of 2:2944, read from the layers (front 2:3042, left 2:3003, right 2:2962). Figma did
 * not scale the side cards as one piece: their auto-layout paddings and gaps were rounded to whole pixels while the
 * type, radii and art kept the exact factor (0.9 left, 0.8455 right), so each slot carries its own numbers.
 * Each card is a FIXED-height vertical auto layout (image frame, then the "Overlay" text block), top-aligned, and the
 * whole card fades with one group opacity. `rotate` is CSS (clockwise): Figma's -5 on the left card, +5 on the right.
 */
type Geo = {
	w: number;
	h: number;
	radius: number;
	from: string;
	opacity: number;
	rotate: number;
	padTop: number;
	padBottom: number;
	gap: number;
	image: { w: number; h: number; radius: number; fill: string };
	art: { scale: number; top: number; coin: [number, number] };
	save: { inImage: boolean; left: number; savedLeft: number; top: number; padY: number; padX: number; radius: number; gap: number; font: number; lh: number; icon: number };
	padX: number;
	padEnd: number;
	stackGap: number;
	infoGap: number;
	ticker: { size: number; lh: number };
	headline: { size: number; lh: number };
	priceGap: number;
	price: { size: number; lh: number };
	change: { size: number; lh: number };
	/**
	 * The change text's top under the price's in the price row (Figma aligns the two text boxes' baselines and rounds
	 * each baseline to a whole pixel: 2:3073 sits 9 under 2:3072; the side cards' rows 7 apart). Chrome's own baseline
	 * alignment gives the same at 1024-2560 (measured 2026-10-25: the right card's Figma value is 8, Chrome's 7, and the
	 * approved pixels keep 7); past 2560 it reads font metrics rounded in device pixels and drifts, so the big regime
	 * lays the row out with this explicit offset instead (discover.css).
	 */
	changeTop: number;
	tip: { radius: number; padX: number; padY: number; gap: number; label: { size: number; lh: number }; text: { size: number; lh: number } };
	/**
	 * Below 1024 the card fills its column (SPEC R3: width 100 %, Figma's width the maximum) and the Save chip keeps
	 * its distance from the image frame's right edge instead of its authored left: Figma's right inset of the chip
	 * (2:3061 ends 3.91 before 2:3043's edge; 2:3206 "Saved" 7.91; the side cards' chips 5.19 / 4.54).
	 */
	saveRight: { save: number; saved: number };
};

/** The front card's coin centre in its art frame (31.8331 + 147.493 / 2, 18.3196 + 147.493 / 2). */
const COIN_CENTRE: [number, number] = [105.5796, 92.0661];

const SLOTS: Record<DeckSlot, Geo> = {
	// 2:3042 "Frame 1618869088": 371.3852 x 456.7314, "discover card gradient", pad 4/0/4/0, gap 27
	center: {
		w: 371.3852,
		h: 456.7314,
		radius: 23.3442,
		from: "#152a47",
		opacity: 1,
		rotate: 0,
		padTop: 4,
		// Figma pads 4, but the FIXED 456.7314 height clips 0.2606 of it (4 + 242.992 + 27 + 179 + 4 = 456.992)
		padBottom: 3.7394,
		gap: 27,
		image: { w: 360.7742, h: 242.992, radius: 19.0998, fill: "#142844" },
		art: { scale: 1, top: 35.7965, coin: COIN_CENTRE },
		// 2:3061 Save sits inside the image frame; 2:3206 "Saved" moves to x 268.1304
		save: { inImage: true, left: 280.1306, savedLeft: 268.1304, top: 6.3662, padY: 7, padX: 14, radius: 16.9776, gap: 6, font: 12.7332, lh: 17, icon: 12.7332 },
		padX: 19,
		padEnd: 17,
		stackGap: 20,
		infoGap: 8,
		ticker: { size: 10.611, lh: 14 },
		headline: { size: 16.9776, lh: 24.4053 },
		priceGap: 10,
		price: { size: 21.222, lh: 27 },
		change: { size: 11.6721, lh: 15 },
		changeTop: 9,
		tip: { radius: 10.611, padX: 13, padY: 10, gap: 8, label: { size: 10.611, lh: 14 }, text: { size: 11.6721, lh: 15.9165 } },
		// 360.7742 - (280.1306 + 76.7332) and 360.7742 - (268.1304 + 84.7332): the chips of 2:3061 / 2:3206
		saveRight: { save: 3.9104, saved: 7.9106 },
	},
	// 2:3003: 334.2467 x 412.3244 at Figma rotation -5, opacity 0.85, pad 4/0/4/0, gap 24
	left: {
		w: 334.2467,
		h: 412.3244,
		radius: 21.0098,
		from: "#283e5d",
		opacity: 0.85,
		rotate: 5,
		padTop: 4,
		// 4 in Figma, 0.3684 of it clipped by the FIXED 412.3244 (4 + 218.6928 + 24 + 162 + 4 = 412.6928)
		padBottom: 3.6316,
		gap: 24,
		image: { w: 324.6968, h: 218.6928, radius: 17.1898, fill: "#253a59" },
		art: { scale: 0.9, top: 32.216, coin: COIN_CENTRE },
		// 2:3033 Save is a child of the card frame, not of the image frame
		save: { inImage: false, left: 258.3277, savedLeft: 258.3277 - 12 * 0.9, top: 8.5939, padY: 7, padX: 12, radius: 15.2798, gap: 6, font: 11.4599, lh: 15, icon: 11.4599 },
		padX: 17,
		padEnd: 15,
		stackGap: 18,
		infoGap: 8,
		ticker: { size: 9.5499, lh: 12 },
		headline: { size: 15.2798, lh: 21.9648 },
		priceGap: 9,
		price: { size: 19.0998, lh: 24 },
		change: { size: 10.5049, lh: 14 },
		changeTop: 7,
		tip: { radius: 9.5499, padX: 11, padY: 9, gap: 8, label: { size: 9.5499, lh: 12 }, text: { size: 10.5049, lh: 14.3249 } },
		// 334.2467 - (258.3277 + 70.7269), the chip 2:3033; Saved: 12 x 0.9 further left, the label 8 x 0.9 wider
		saveRight: { save: 5.1921, saved: 5.1921 + 4 * 0.9 },
	},
	// 2:2962: 313.9893 x 397.7301 at Figma rotation 5, opacity 0.65, pad 5/0/0/0, gap 22
	right: {
		w: 313.9893,
		h: 397.7301,
		radius: 19.7365,
		from: "#263d5d",
		opacity: 0.65,
		rotate: -5,
		padTop: 5,
		padBottom: 0,
		gap: 22,
		image: { w: 305.0182, h: 205.4387, radius: 16.148, fill: "#2f486e" },
		// 2:2979 "Logo": the coin's centre at (89.6909, 76.6908) in the 179.4224-wide art frame
		art: { scale: 179.4224 / ART_W, top: 30.2628, coin: [89.6909 / (179.4224 / ART_W), 76.6908 / (179.4224 / ART_W)] },
		save: { inImage: false, left: 242.6672, savedLeft: 242.6672 - 12 * (179.4224 / ART_W), top: 8.0719, padY: 6, padX: 12, radius: 14.3538, gap: 5, font: 10.7653, lh: 14, icon: 10.7653 },
		padX: 16,
		padEnd: 14,
		stackGap: 17,
		infoGap: 7,
		ticker: { size: 8.9711, lh: 12 },
		headline: { size: 14.3538, lh: 20.6336 },
		priceGap: 8,
		price: { size: 17.9422, lh: 23 },
		change: { size: 9.8682, lh: 13 },
		// Figma's 2:2990 sits 8 under 2:2989; Chrome's baseline alignment put it at 7 at 1024-2560 and that is the approved look
		changeTop: 7,
		tip: { radius: 8.9711, padX: 11, padY: 8, gap: 7, label: { size: 8.9711, lh: 12 }, text: { size: 9.8682, lh: 13.4567 } },
		// 313.9893 - (242.6672 + 66.7849), the chip 2:2994
		saveRight: { save: 4.5372, saved: 4.5372 + 4 * (179.4224 / ART_W) },
	},
};

/** Figma's auto-width text boxes are whole pixels wide (the price is 81 wide, so the change starts at 91). */
const FIGMA_W = "w-[calc-size(fit-content,round(up,size,1px))]";
const type = (t: { size: number; lh: number }): CSSProperties => ({ fontSize: t.size, lineHeight: `${t.lh}px` });

type Props = {
	card: DeckCardData;
	slot: DeckSlot;
	saved?: boolean;
	onSave?: () => void;
	/** the front card opens its stock detail (phone wiring 1:1854 -> 1:2496, "Stock Detail · Unsaved · folded (entry: Discover)") */
	onOpen?: () => void;
	/**
	 * Below 1024 (SPEC R3): the card is as wide as the box the deck gives it (Figma's width at most), its image frame
	 * keeps Figma's inset, the art stays centred in it, the Save chip keeps its distance from the frame's right edge,
	 * and the front card grows with its copy instead of clipping a third headline line (R9: no text cut). Type, radii,
	 * paddings and gaps are Figma's (the zoom is 1 there, R1). The fluid front card is as tall as the cell the deck
	 * stacks it in (every card of the deck measured at this width, see the deck route), so a card change moves nothing
	 * else (R10), as Figma's FIXED-height card keeps the arrows and buttons put at 1440.
	 */
	fluid?: boolean;
	/**
	 * A measuring copy of a fluid front card (the deck route stacks one per card of the deck, invisible, in the front
	 * card's cell so the cell is as tall as the tallest card at this width): the same frame, copy and type, without
	 * the art, the Save chip or any handler.
	 */
	ghost?: boolean;
	/**
	 * The card's ticker line when it is not the card's own: past the showcase the route prints one display name per
	 * company (N30.8f, src/app/stocks/names.ts: "NVDA · NVIDIA", the stock page's line); the frames' own lines ("NVDA ·
	 * NVIDIA Corp" 2:3046) stay while the deck is the design itself.
	 */
	tickerLine?: string;
};

export function DeckCard({ card, slot, saved = false, onSave, onOpen, fluid = false, ghost = false, tickerLine }: Props) {
	const line = tickerLine ?? card.ticker;
	const g = SLOTS[slot];
	const front = slot === "center";
	const interactive = front && !!onSave && !ghost;
	// the image frame's inset from the card's edges (2:3043 at 5.3055 in 2:3042; 4.775 / 4.4856 on the side cards)
	const imageInset = (g.w - g.image.w) / 2;

	const save = (
		<button
			type="button"
			onClick={
				interactive
					? (e: MouseEvent) => {
							e.stopPropagation(); // the chip's own reaction wins over the card's
							onSave?.();
						}
					: undefined
			}
			aria-label={interactive ? (saved ? `Unsave ${card.symbol} from My STAK` : `Save ${card.symbol} to My STAK`) : undefined}
			aria-pressed={interactive ? saved : undefined}
			tabIndex={interactive ? 0 : -1}
			aria-hidden={interactive ? undefined : true}
			// 2:3061 / 2:3206 are plain frames: no hover or pressed look, only the Save -> Saved swap (and the canvas's focus ring)
			className={cn("absolute z-[1] flex items-center justify-center overflow-clip bg-[rgba(255,255,255,0.09)]", interactive ? "cursor-pointer" : "pointer-events-none")}
			style={{
				...(fluid ? { right: saved ? g.saveRight.saved : g.saveRight.save } : { left: saved ? g.save.savedLeft : g.save.left }),
				top: g.save.top,
				padding: `${g.save.padY}px ${g.save.padX}px`,
				borderRadius: g.save.radius,
				gap: g.save.gap,
			}}
		>
			<span className={cn("whitespace-nowrap font-geist font-medium text-white", FIGMA_W)} style={{ fontSize: g.save.font, lineHeight: `${g.save.lh}px` }}>
				{saved ? deckCopy.saved : deckCopy.save}
			</span>
			<img alt="" src={saved ? D.bookmarkSaved : D.bookmark} className="shrink-0" style={{ width: g.save.icon, height: g.save.icon }} />
		</button>
	);

	return (
		<article
			// 2:3042 is a plain frame (no variants, no hover or pressed state, no reaction of its own): the pointer only
			// reads as a hand over the front card, which opens the stock detail
			className={cn("relative flex shrink-0 flex-col items-center overflow-clip", front && onOpen && !ghost && "cursor-pointer")}
			style={{
				width: fluid ? "100%" : g.w,
				// FIXED height in Figma (primaryAxisSizingMode FIXED, clipsContent): a two-line tip on a live card spends its
				// bottom padding inside the clip instead of growing the card past the frame's geometry. The fluid front card
				// (below 1024) keeps that height as its minimum and fills the cell the deck stacks it in, which is as tall as
				// the deck's tallest card at this width (a headline or tip that wraps once more in a narrower column grows
				// every card alike, so nothing under the stack moves on a card change); the side cards stay fixed (what they
				// would grow by sits behind the front card).
				...(fluid && front ? { minHeight: g.h, height: "100%" } : { height: g.h }),
				borderRadius: g.radius,
				backgroundImage: `linear-gradient(to bottom, ${g.from}, #0c1526)`,
				opacity: g.opacity === 1 ? undefined : g.opacity,
				// Figma turns a frame about its own top-left corner (the stack places that corner, see the deck route)
				transform: g.rotate ? `rotate(${g.rotate}deg)` : undefined,
				transformOrigin: g.rotate ? "0 0" : undefined,
				paddingTop: g.padTop,
				paddingBottom: g.padBottom,
				gap: g.gap,
			}}
			data-slot={ghost ? undefined : slot}
			data-ghost={ghost ? "" : undefined}
			aria-label={ghost ? undefined : `${line}: ${card.headline}`}
			aria-hidden={ghost || undefined}
			// pointer only: "Learn more" is the keyboard path to the same page, and the card holds the Save button
			onClick={front && !ghost ? onOpen : undefined}
		>
			{/*
			 * The image frame (2:3043 et al., clipsContent) cuts the art at its own edge: its bottom sits on a fraction (the
			 * front card's at y 444.49 of the frame) and Figma blends that row at its coverage ((54,95,121) over the box).
			 * Chrome snaps an overflow clip to whole rows and dropped the row (the card's gradient showed, 210 px off in the
			 * audit); a clip-path on the same box is anti-aliased at the fraction and paints the row as Figma does (54,96,122).
			 */}
			<div
				className="relative shrink-0"
				style={{
					width: fluid ? `calc(100% - ${2 * imageInset}px)` : g.image.w,
					height: g.image.h,
					borderRadius: g.image.radius,
					backgroundColor: g.image.fill,
					clipPath: `inset(0 round ${g.image.radius}px)`,
				}}
			>
				{!ghost && (
					<GlassCoin
						ticker={card.symbol}
						scale={g.art.scale}
						// Figma centres the art frame in the image frame: x = (image w - art w) / 2; a fluid frame centres it the same way
						left={fluid ? `calc(50% - ${(ART_W * g.art.scale) / 2}px)` : (g.image.w - ART_W * g.art.scale) / 2}
						top={g.art.top}
						coin={g.art.coin}
					/>
				)}
				{g.save.inImage && !ghost && save}
			</div>
			{/* data-card-copy: on a phone column the side cards' copy sits wholly behind the front card (discover.css hides it there) */}
			<div data-card-copy="" className="flex w-full shrink-0 flex-col items-start overflow-clip" style={{ padding: `0 ${g.padX}px ${g.padEnd}px` }}>
				<div className="flex w-full flex-col items-start" style={{ gap: g.stackGap }}>
					<div className="flex w-full flex-col items-start" style={{ gap: g.infoGap }}>
						<p className="whitespace-nowrap font-geist text-[#819abb]" style={type(g.ticker)}>
							{line}
						</p>
						<div className="flex w-full flex-col items-start" style={{ gap: g.infoGap }}>
							<p className={cn("w-full font-geist text-white", fluid && front ? "line-clamp-none" : "line-clamp-2")} style={type(g.headline)}>
								{card.headline}
							</p>
							{/* past 2560 discover.css aligns this row from the top with --deck-change-top (see Geo.changeTop) */}
							<div
								data-price-row=""
								className="flex items-baseline overflow-clip whitespace-nowrap"
								style={{ gap: g.priceGap, "--deck-change-top": `${g.changeTop}px` } as CSSProperties}
							>
								<p className={cn("font-sora font-semibold text-white", FIGMA_W)} style={type(g.price)}>
									{card.price}
								</p>
								<p data-change="" className={cn("font-geist font-medium", signText(card.change))} style={type(g.change)}>
									{card.change}
								</p>
							</div>
						</div>
					</div>
					<div
						className="flex w-full items-center overflow-clip bg-[rgba(105,179,202,0.1)]"
						style={{ padding: `${g.tip.padY}px ${g.tip.padX}px`, borderRadius: g.tip.radius, gap: g.tip.gap }}
					>
						{/* 9% tracking; Figma's box leaves out the spacing after the last letter (18 wide on the front card) */}
						<p className="w-[calc-size(fit-content,round(up,size_-_0.09em,1px))] whitespace-nowrap font-geist font-medium tracking-[0.09em] text-[#69b3ca]" style={type(g.tip.label)}>
							TIP
						</p>
						<p className="line-clamp-2 min-w-px flex-1 font-geist text-[#c8d2e0]" style={type(g.tip.text)}>
							{card.tip}
						</p>
					</div>
				</div>
			</div>
			{!g.save.inImage && !ghost && save}
		</article>
	);
}

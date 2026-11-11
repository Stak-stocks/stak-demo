import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { useSizeClass } from "@/app/FitCanvas";
import { FIGMA_BASELINE } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { OB } from "./assets";
import { BackControl } from "./Chrome";
import { TUTORIAL_CARDS, type TutorialCard } from "./data";
import { FigmaImg, onFraction } from "./subpixel";

/**
 * Step 03's deck, "Group 1000002800" 2:5895 (680.5034 x 460.4639): three discover cards, the front one upright (2:5976),
 * the next one to its left (2:5937, Figma rotation -5, 85%) and the one after to its right (2:5896, rotation 5, 65%).
 * "Use ← → keys or click. Save what you like.": the keys and the round controls work as on the product deck this step
 * teaches (Discover 2:2944): ← and Nav · Previous bring the card passed last back to the front, → and Nav · Next pass
 * the front card, the chip saves it (it reads Saved, a second press takes it back). The file gives the cards no motion
 * (the phone frame 1:345 wires only Back and Continue, the frames hold no keyframes) and the product deck swaps at once,
 * so a pass and a previous swap the cards at once here too. The tutorial's saves stay on this screen.
 *
 * Below 1024 (responsive.css, SPEC R3 / R4) the stack reflows as the product deck it teaches does on Discover: on a
 * column of 680.5 or more it is exactly 2:5895; narrower, the side cards fold in behind the front card (keeping Figma's
 * proportions to it), the front card fills a phone column (Figma's 371.39 at most) and grows with its copy, the side
 * cards lean their lower corners one gutter into the margins, and where only a sliver of a side card shows, its copy is
 * not painted. Type is never scaled (R1). The front card shares one grid cell with invisible measuring copies of the
 * other two cards, so the cell is as tall as the tallest card at this width and ‹ ›, Continue keep their place through
 * every card change (R10), as the FIXED-height cards of the frame keep them at 1440.
 */
type Slot = "front" | "left" | "right";
type Font = { size: number; lh: number };
type Rect = [x: number, y: number, w: number, h: number];
type Geo = {
	/** the card's bounding box in the stack, and its CSS rotation about the centre of that box (the upright front card hangs from its top) */
	place: Rect;
	rotate: number;
	card: { w: number; h: number; radius: number; from: string; opacity: number; padTop: number; padBottom: number; gap: number };
	image: { w: number; h: number; radius: number; fill: string };
	/** the art frame ("Frame 1618869052") at `scale` of the front card's 212.2201 x 287.0456, centred, `top` down; the side cards' box layer and the beam */
	art: { scale: number; top: number; box?: Rect; beam: Rect };
	/**
	 * the Save chip: inside the image frame (front) or the card (sides), placed by its left edge like Figma; `textW` =
	 * Figma's "Save" box. Saved: the deck's saved chip 2:3206 (the only saved chip Figma draws) sits 12 left of the Save
	 * chip it replaces (2:3061 at 280.1306 -> 2:3206 at 268.1304 in the front image frame); the side slots take the same
	 * shift at their scale, as the product deck does (src/app/discover/DeckCard.tsx).
	 */
	save: { inImage: boolean; left: number; savedLeft: number; top: number; padY: number; padX: number; radius: number; gap: number; font: Font; icon: number; textW: number };
	text: {
		padX: number;
		padBottom: number;
		stackGap: number;
		infoGap: number;
		ticker: Font;
		headline: Font;
		priceGap: number;
		price: Font;
		change: Font;
		/**
		 * Where Chrome's baseline alignment of the price row puts the change below the row's top at zoom 1 (the deck's
		 * Geo.changeTop on Discover, the same sizes). Past 2560 responsive.css aligns the row from the top with this offset:
		 * Chrome aligns baselines with font metrics rounded in device pixels, which put the change up to 3 device px off
		 * 2560 x zoom (G2); an explicit offset scales exactly.
		 * The turned left card is the exception (review round 1, onb3 at 3840: +1.75 device px): Chrome draws a turned
		 * card's glyphs on the nearest whole pixel of the card's own grid, and at 2560 the change's exact baseline there is
		 * 4 + 218.6928 + 24 + 12 + 8 + 44 + 8 + 7 - 0.2707 + 11 = 336.4221 (padding, image, gap, ticker, gap, headline,
		 * gap, this offset, the shared text rule's top, the ascent), drawn on row 336. With 7 the zoomed baseline lands
		 * 0.4221 x zoom below 336 x zoom and rounds a whole device pixel low (504.63 -> 505 at 1.5); 7 - 0.4221 puts it on
		 * 336 itself, the middle of the row at every zoom (1 included, so 3440 x 1440 draws it where 2560 does). The ticker,
		 * headline and TIP rows are whole pixels apart, so the fraction is the same for every card the slot shows. The
		 * turned right card's row is covered by the front card, as in the frame: nothing of it is drawn to correct.
		 */
		changeTop: number;
		tip: { radius: number; padX: number; padY: number; gap: number; label: Font; labelLs: number; labelW: number; body: Font };
	};
};

const ART_W = 212.2201;
const ART_H = 287.0456;
const COIN = 147.493;
/**
 * Figma's render of the front card's box "Group 1000002777" (2:5979), over the image frame's #142844: its render bounds
 * start at (-26.5146, 78.5953) of the art frame (the glow runs 10.598 left of the group) and stop at the image frame's
 * bottom, which clips it; the 1x export is 273 x 129. Composing the box from vectors leaves hairline seams where its
 * panels meet; Figma's render has none. The side cards keep their vector exports (they fade to 85% and 65%).
 */
const FRONT_BOX = { x: -26.5146, y: 78.5953, w: 273, h: 129 };

/** Every value read from the layers of 2:5865 (front 2:5976, left 2:5937, right 2:5896). */
const SLOTS: Record<Slot, Geo> = {
	front: {
		place: [160.8569, 3.7324, 371.3852, 456.7314],
		rotate: 0,
		// FIXED 456.7314 in Figma: 4 + 242.992 + 27 + 179 + 4 runs 0.2606 past it, so the bottom pad shows 3.7394
		card: { w: 371.3852, h: 456.7314, radius: 23.3442, from: "#152a47", opacity: 1, padTop: 4, padBottom: 3.7394, gap: 27 },
		image: { w: 360.7742, h: 242.992, radius: 19.0998, fill: "#142844" },
		art: { scale: 1, top: 35.7965, beam: [36.6184, -5.3057, 143.7688, 153.3935] },
		// 2:5995 at 280.1306 / 6.3662 of the 360.7742 image frame, 76.7332 x 31
		save: { inImage: true, left: 280.1306, savedLeft: 268.1304, top: 6.3662, padY: 7, padX: 14, radius: 16.9776, gap: 6, font: { size: 12.7332, lh: 17 }, icon: 12.7332, textW: 30 },
		text: {
			padX: 19,
			padBottom: 17,
			stackGap: 20,
			infoGap: 8,
			ticker: { size: 10.611, lh: 14 },
			headline: { size: 16.9776, lh: 24.4053 },
			priceGap: 10,
			price: { size: 21.222, lh: 27 },
			change: { size: 11.6721, lh: 15 },
			changeTop: 9,
			tip: { radius: 10.611, padX: 13, padY: 10, gap: 8, label: { size: 10.611, lh: 14 }, labelLs: 0.955, labelW: 18, body: { size: 11.6721, lh: 15.9165 } },
		},
	},
	left: {
		place: [0, 2.2373, 368.9112, 439.8869],
		rotate: 5,
		// FIXED 412.3244: 4 + 218.6928 + 24 + 162 + 4 runs 0.3684 past it, the bottom pad shows 3.6316
		card: { w: 334.2467, h: 412.3244, radius: 21.0098, from: "#283e5d", opacity: 0.85, padTop: 4, padBottom: 3.6316, gap: 24 },
		image: { w: 324.6968, h: 218.6928, radius: 17.1898, fill: "#253a59" },
		art: { scale: 190.9981 / ART_W, top: 32.216, box: [-14.3248, 70.7367, 219.6485, 197.6308], beam: [32.9557, -4.7753, 129.3919, 138.0541] },
		// 2:5967 at 258.3277 / 8.5939 of the 334.2467 card (a child of the card), 68.4599 x 29
		save: { inImage: false, left: 258.3277, savedLeft: 258.3277 - 12 * 0.9, top: 8.5939, padY: 7, padX: 12, radius: 15.2798, gap: 6, font: { size: 11.4599, lh: 15 }, icon: 11.4599, textW: 27 },
		text: {
			padX: 17,
			padBottom: 15,
			stackGap: 18,
			infoGap: 8,
			ticker: { size: 9.5499, lh: 12 },
			headline: { size: 15.2798, lh: 21.9648 },
			priceGap: 9,
			price: { size: 19.0998, lh: 24 },
			change: { size: 10.5049, lh: 14 },
			// 7 at zoom 1, less the 0.4221 by which 2560 draws the turned card's change above its exact baseline (see Geo.text)
			changeTop: 6.5779,
			tip: { radius: 9.5499, padX: 11, padY: 9, gap: 8, label: { size: 9.5499, lh: 12 }, labelLs: 0.8595, labelW: 16, body: { size: 10.5049, lh: 14.3249 } },
		},
	},
	right: {
		place: [333.0445, 0, 347.459, 423.5826],
		rotate: -5,
		card: { w: 313.9893, h: 397.7301, radius: 19.7365, from: "#263d5d", opacity: 0.65, padTop: 5, padBottom: 0, gap: 22 },
		image: { w: 305.0182, h: 205.4387, radius: 16.148, fill: "#2f486e" },
		art: { scale: 179.4224 / ART_W, top: 30.2628, box: [-13.4561, 66.4519, 206.3355, 185.653], beam: [30.9594, -4.4837, 121.55, 129.6872] },
		// 2:5928 at 242.6672 / 8.0719 of the 313.9893 card (a child of the card), 64.7654 x 26
		save: { inImage: false, left: 242.6672, savedLeft: 242.6672 - 12 * (179.4224 / ART_W), top: 8.0719, padY: 6, padX: 12, radius: 14.3538, gap: 5, font: { size: 10.7653, lh: 14 }, icon: 10.7653, textW: 25 },
		text: {
			padX: 16,
			padBottom: 14,
			stackGap: 17,
			infoGap: 7,
			ticker: { size: 8.9711, lh: 12 },
			headline: { size: 14.3538, lh: 20.6336 },
			priceGap: 8,
			price: { size: 17.9422, lh: 23 },
			change: { size: 9.8682, lh: 13 },
			changeTop: 7,
			tip: { radius: 8.9711, padX: 11, padY: 8, gap: 7, label: { size: 8.9711, lh: 12 }, labelLs: 0.8074, labelW: 15, body: { size: 9.8682, lh: 13.4567 } },
		},
	},
};

/**
 * Where the front card's art frame sits in the 1440 frame: the deck (680.5034 wide) centred in the step's column
 * "Frame 1618869140" 2:5893 at 500 / 283 (440 wide), the card at its place, the image frame centred in the card, the art
 * frame centred in it. Figma's NVDA coin 2:5994 puts it at 620.187456 / 326.528984 (its 652.020508 / 344.848633 minus
 * its 31.833052 / 18.319649 in the art frame); this lands within 0.0003px. The front coin and beam are drawn at their
 * exact fractional boxes from there (FigmaImg); the side cards turn, and keep plain images.
 */
/** The deck "Group 1000002800" 2:5895 in the 1440 frame: 680.5034 wide, centred in the 440 column at 500 / 283 (379.7481 in Figma). */
const DECK_AT = [500 + (440 - 680.5034) / 2, 283] as const;
const FRONT_ART_ORIGIN = (() => {
	const g = SLOTS.front;
	const x = DECK_AT[0] + g.place[0] + (g.place[2] - g.card.w) / 2 + (g.card.w - g.image.w) / 2 + (g.image.w - ART_W) / 2;
	const y = DECK_AT[1] + g.place[1] + g.card.padTop + g.art.top;
	return [x, y] as const;
})();

/**
 * A turned side card on its exact place. Its unrotated box sits where Figma's rotation about the card's centre leaves
 * it (2:5896 right: 729.5277 / 295.9263, centred in its bounding box; 2:5937 left: 397.0806 / 299.0186), but Chrome
 * lays a rotated box out on the whole pixel nearest that place and drops the fraction (measured 2026-10-18: the right
 * card's coin painted 0.75 / 0.25px right / low of Figma's render). The box is laid out on the whole pixel below and
 * `translate` (composed with the rotation, never snapped) carries it the rest of the way, as onFraction does elsewhere.
 */
const sideCardShift = (g: Geo) =>
	onFraction(DECK_AT[0] + g.place[0] + (g.place[2] - g.card.w) / 2, DECK_AT[1] + g.place[1] + (g.place[3] - g.card.h) / 2);
/** Where a side card's art frame sits in the card's own (unrotated) box: the image frame centred, the art frame centred in it. */
const sideArtOrigin = (g: Geo, artW: number) => [(g.card.w - g.image.w) / 2 + (g.image.w - artW) / 2, g.card.padTop + g.art.top] as const;

/** The Saved chip of the deck's saved frame (2:3206, 84.7332 x 31): "Saved" 2:3207 is a 38px box at the front card's 12.7332px. */
const SAVED_W_FRONT = 38;
/** Figma's auto-width text boxes are whole pixels wide; where the frames give no width, the text's own width rounded up. */
const FIGMA_W = "calc-size(fit-content, round(up, size, 1px))";

const font = (f: Font): CSSProperties => ({ fontSize: f.size, lineHeight: `${f.lh}px` });
const rect = ([x, y, w, h]: Rect): CSSProperties => ({ left: x, top: y, width: w, height: h });

export function SwipeCards() {
	// front, then the next card (left), then the one after (right): the frame opens on NVDA, AAPL, GOOGL
	const [order, setOrder] = useState<TutorialCard[]>(TUTORIAL_CARDS);
	const [saved, setSaved] = useState<Record<string, boolean>>({});
	const [front, left, right] = order;
	// below 1024 the front card is in flow and grows with its copy: the measuring copies keep the stack's height (see above)
	const sizeClass = useSizeClass();
	const compact = sizeClass === "phone" || sizeClass === "tablet";

	/** Pass (→ or ›): the next card comes to the front at once, the passed one goes behind the other two. */
	const next = useCallback(() => setOrder(([a, b, c]) => [b, c, a]), []);
	/** ← or ‹: the card passed last comes back to the front at once. */
	const prev = useCallback(() => setOrder(([a, b, c]) => [c, a, b]), []);
	const toggleSave = useCallback((id: string) => setSaved((s) => ({ ...s, [id]: !s[id] })), []);

	// the product deck's keys (_app.discover.tsx): ← previous, → pass; Alt+← stays the browser's Back
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				prev();
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				next();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [next, prev]);

	return (
		<div className="flex w-full flex-col items-center gap-[35px]">
			<div className="onboarding-swipe-deck relative h-[460.4639px] w-[680.5034px] shrink-0" role="group" aria-roledescription="practice deck" aria-label="Practice deck">
				<p className="sr-only" aria-live="polite">
					{`${front.ticker}${saved[front.id] ? ", saved" : ""}`}
				</p>
				<Card slot="right" card={right} saved={!!saved[right.id]} />
				<Card slot="left" card={left} saved={!!saved[left.id]} />
				{compact && TUTORIAL_CARDS.map((c) => c.id !== front.id && <Card key={`${c.id}-ghost`} slot="front" card={c} saved={false} ghost />)}
				<Card slot="front" card={front} saved={!!saved[front.id]} onSave={() => toggleSave(front.id)} />
			</div>
			{/* "Frame 1618869213" 2:6011: Nav · Previous and Nav · Next (the same control turned 180°), 93 apart, at 633.5 / 766.5
			    and y 778.4639 (the deck's 460.4639 height carries the fraction): drawn there, edges and all */}
			<div className="flex items-center justify-center gap-[93px]">
				<BackControl label="Previous card" shortcut="ArrowLeft" onClick={prev} style={onFraction(633.5, 778.4639)} />
				<BackControl flipped label="Pass, next card" shortcut="ArrowRight" onClick={next} style={onFraction(766.5, 778.4639)} />
			</div>
		</div>
	);
}

/**
 * `ghost`: an invisible measuring copy of a front card (below 1024 only: the copy and the frame, no art, no chip, out of
 * the accessibility tree), stacked in the front card's grid cell so the cell is as tall as the tallest card.
 */
function Card({ slot, card, saved, onSave, ghost }: { slot: Slot; card: TutorialCard; saved: boolean; onSave?: () => void; ghost?: boolean }) {
	const g = SLOTS[slot];
	const t = g.text;
	const k = g.art.scale;
	const artW = ART_W * k;
	const coin = COIN * k;
	const chip = ghost ? null : <SaveChip slot={slot} saved={saved} onSave={onSave} label={card.ticker} />;
	/**
	 * The front card's texts on Figma's own baselines: Figma rounds a text's baseline offset inside its box (the canon's
	 * FIGMA_BASELINE), and the front card's boxes start .7 past a pixel (the ticker 2:6002 at 560.7, the price 2:6006 at
	 * 639.7, TIP 2:6009 at 697.7), where the app's unrounded rule draws them a row above Figma's. The turned side cards
	 * keep the shared rule.
	 */
	const fb = slot === "front" ? FIGMA_BASELINE : undefined;
	return (
		<div
			data-onboarding-card={ghost ? "ghost" : slot}
			className={cn("absolute flex justify-center", g.rotate ? "items-center" : "items-start")}
			style={rect(g.place)}
			aria-hidden={slot === "front" && !ghost ? undefined : true}
		>
			<div
				data-onboarding-card-body=""
				className="relative flex flex-none flex-col items-center overflow-clip"
				style={{
					width: g.card.w,
					// the frame's height; a card whose copy runs longer than the frame's (GOOGL's two-line tip in front) grows, as the product deck's cards do
					minHeight: g.card.h,
					borderRadius: g.card.radius,
					backgroundImage: `linear-gradient(to bottom, ${g.card.from}, #0c1526)`,
					opacity: g.card.opacity === 1 ? undefined : g.card.opacity,
					rotate: g.rotate ? `${g.rotate}deg` : undefined,
					paddingTop: g.card.padTop,
					paddingBottom: g.card.padBottom,
					gap: g.card.gap,
					...(g.rotate ? sideCardShift(g) : undefined),
				}}
			>
				{/* below 1024 the image frame keeps Figma's inset from the card's edges (--image-inset) and the art stays centred in it (--art-w) */}
				<div
					data-onboarding-image=""
					className="relative shrink-0 overflow-clip"
					style={
						{
							width: g.image.w,
							height: g.image.h,
							borderRadius: g.image.radius,
							backgroundColor: g.image.fill,
							"--image-inset": `${(g.card.w - g.image.w) / 2}px`,
						} as CSSProperties
					}
				>
					{!ghost && (
					<div
						data-onboarding-art=""
						className="absolute"
						style={{ left: (g.image.w - artW) / 2, top: g.art.top, width: artW, height: ART_H * k, "--art-w": `${artW}px` } as CSSProperties}
						aria-hidden="true"
					>
						{slot === "front" ? (
							// at its render bounds' fractional place (593.673 / 405.124 in the frame): measured 0.84 levels from Figma's
							// render over the box against 0.91 snapped to the nearest pixel (max 37 against 66)
							<FigmaImg
								src={OB.swipe.frontBox.x1}
								srcSet={`${OB.swipe.frontBox.x1} 1x, ${OB.swipe.frontBox.x2} 2x, ${OB.swipe.frontBox.x4} 4x`}
								origin={FRONT_ART_ORIGIN}
								x={FRONT_BOX.x}
								y={FRONT_BOX.y}
								w={FRONT_BOX.w}
								h={FRONT_BOX.h}
							/>
						) : (
							g.art.box && (
								<div className="absolute" style={rect(g.art.box)}>
									<div className="absolute inset-[0_-7.17%_-13.17%_-4.34%]">
										<img alt="" className="block size-full max-w-none" src={OB.swipe[slot as "left" | "right"].box} />
									</div>
								</div>
							)
						)}
						{slot === "front" ? (
							<>
								{/* "Vector 7" 2:5992: its export (142.687 x 153.393) starts 0.37% into the layer's 143.7688 box */}
								<FigmaImg
									src={OB.swipe.front.beam}
									origin={FRONT_ART_ORIGIN}
									x={g.art.beam[0] + g.art.beam[2] * 0.0037}
									y={g.art.beam[1]}
									w={142.687}
									h={g.art.beam[3]}
								/>
								<FigmaImg
									src={card.coin.src}
									origin={FRONT_ART_ORIGIN}
									x={card.coin.cx - COIN / 2}
									y={card.coin.cy - COIN / 2}
									w={COIN}
									h={COIN}
									rotate={card.coin.rotate || undefined}
									className="object-cover"
								/>
							</>
						) : (
							<>
								<div className="absolute" style={rect(g.art.beam)}>
									<div className="absolute inset-[0_0.39%_0_0.37%]">
										<img alt="" className="block size-full max-w-none" src={OB.swipe[slot].beam} />
									</div>
								</div>
								{/* "Image" 2:5954 (left, 132.7437 at 28.6494 / 16.4877) and 2:5915 (right, 124.6986 turned 49.532°, its centre
								    at 89.6929 / 76.6997 of the art frame): at the exact box, turned about its centre (a plain turned <img> is
								    snapped to whole pixels in the card first) */}
								<FigmaImg
									src={card.coin.src}
									origin={sideArtOrigin(g, artW)}
									x={card.coin.cx * k - coin / 2}
									y={card.coin.cy * k - coin / 2}
									w={coin}
									h={coin}
									rotate={card.coin.rotate || undefined}
									className="object-cover"
								/>
							</>
						)}
					</div>
					)}
					{g.save.inImage && chip}
				</div>
				{/* data-onboarding-card-copy: below 1024 a side card's copy is not painted where only a sliver of it shows (responsive.css) */}
				<div data-onboarding-card-copy="" className="flex w-full shrink-0 flex-col items-start overflow-clip" style={{ padding: `0 ${t.padX}px ${t.padBottom}px` }}>
					<div className="flex w-full flex-col items-start" style={{ gap: t.stackGap }}>
						<div className="flex w-full flex-col items-start" style={{ gap: t.infoGap }}>
							<p className={cn("whitespace-nowrap font-geist text-[#819abb]", fb)} style={font(t.ticker)}>
								{card.ticker}
							</p>
							<div className="flex w-full flex-col items-start" style={{ gap: t.infoGap }}>
								<p className={cn("w-full font-geist text-white", fb)} style={font(t.headline)}>
									{card.blurb}
								</p>
								{/* past 2560 responsive.css aligns this row from the top with --onb-change-top (see Geo.text.changeTop) */}
								<div
									data-onb-price-row=""
									className="flex items-baseline overflow-clip whitespace-nowrap"
									style={{ gap: t.priceGap, "--onb-change-top": `${t.changeTop}px` } as CSSProperties}
								>
									<p className={cn("font-sora font-semibold text-white", fb)} style={{ ...font(t.price), width: FIGMA_W }}>
										{card.price}
									</p>
									<p data-onb-change="" className={cn("font-geist font-medium text-[#2fd08a]", fb)} style={font(t.change)}>
										{card.change}
									</p>
								</div>
							</div>
						</div>
						<div
							className="flex w-full items-center overflow-clip bg-[rgba(105,179,202,0.1)]"
							style={{ gap: t.tip.gap, borderRadius: t.tip.radius, padding: `${t.tip.padY}px ${t.tip.padX}px` }}
						>
							<p
								className={cn("shrink-0 whitespace-nowrap font-geist font-medium text-[#69b3ca]", fb)}
								style={{ ...font(t.tip.label), letterSpacing: t.tip.labelLs, width: t.tip.labelW }}
							>
								TIP
							</p>
							<p className={cn("min-w-px flex-1 font-geist text-[#c8d2e0]", fb)} style={font(t.tip.body)}>
								{card.tip}
							</p>
						</div>
					</div>
				</div>
				{!g.save.inImage && chip}
			</div>
		</div>
	);
}

/**
 * The Save chip (2:5995 front, 2:5967 left, 2:5928 right): white 9% fill, Geist Medium text and the bookmark glyph.
 * Saved, it reads "Saved" with the filled glyph 2:3208 and sits where the deck's saved frame draws it (2:3206). A plain
 * frame (no variant, no hover or pressed look): the pointer cursor and the canvas's focus ring are its only states.
 */
function SaveChip({ slot, saved, onSave, label }: { slot: Slot; saved: boolean; onSave?: () => void; label: string }) {
	const g = SLOTS[slot];
	const s = g.save;
	const left = saved ? s.savedLeft : s.left;
	// the frame the chip is placed in (the front card's image frame, a side card itself): below 1024 that frame narrows and
	// the chip keeps its left edge's distance from the frame's right edge (responsive.css), as the deck's chip does
	const frameW = s.inImage ? g.image.w : g.card.w;
	const style = {
		left,
		top: s.top,
		padding: `${s.padY}px ${s.padX}px`,
		borderRadius: s.radius,
		gap: s.gap,
		"--chip-from-right": `${frameW - left}px`,
	} as CSSProperties;
	const text = (
		<span
			className="whitespace-nowrap text-left font-geist font-medium text-white"
			style={{ ...font(s.font), width: saved ? (slot === "front" ? SAVED_W_FRONT : FIGMA_W) : s.textW }}
		>
			{saved ? "Saved" : "Save"}
		</span>
	);
	const icon = <img alt="" src={saved ? OB.swipe.bookmarkSaved : OB.swipe[slot].bookmark} className="shrink-0" style={{ width: s.icon, height: s.icon }} />;
	if (!onSave) {
		return (
			<div data-onboarding-save="" className="absolute flex items-center justify-center overflow-clip bg-[rgba(255,255,255,0.09)]" style={style}>
				{text}
				{icon}
			</div>
		);
	}
	return (
		<button
			data-onboarding-save=""
			type="button"
			aria-pressed={saved}
			aria-label={saved ? `${label}: saved` : `Save ${label}`}
			onClick={onSave}
			className="absolute z-[1] flex cursor-pointer items-center justify-center overflow-clip bg-[rgba(255,255,255,0.09)]"
			style={style}
		>
			{text}
			{icon}
		</button>
	);
}

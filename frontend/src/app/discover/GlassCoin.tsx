import { CompanyLogo } from "@/app/ui/CompanyLogo";
import { D } from "./assets";

/** The art frame "Frame 1618869052" of the front card (2:3044), in its own units. */
export const ART_W = 212.2201;
export const ART_H = 287.0456;
/** "Group 1000002783" / "6 nvidia 1" (2:3059 / 2:3060): a 147.493 square at (31.8331, 18.3196) in the art frame. */
const COIN = 147.493;

type Props = {
	ticker: string;
	/** the slot's art frame size over the front card's (1, 0.9 for 2:3005, 0.845455 for 2:2964) */
	scale: number;
	/** the art frame's position in the image frame (Figma centres it: x = (image w - art w) / 2; a CSS length for a fluid frame) */
	left: number | string;
	top: number;
	/** the coin's centre in front-card art units (the right card's Google coin sits 0.5 / -1.36 off the others) */
	coin: [number, number];
};

/**
 * The deck card illustration as Figma layers it, every piece Figma's own file: the open box (2:3045, Figma's 2x PNG
 * export of the layer on a transparent ground, see `D.deckBoxRaster`), the light beam (2:3058, SVG export) and the
 * company's glass coin. The side cards are the same layers at 0.9 / 0.845455 (Figma scaled them uniformly, blur
 * radius included: its own exports of the side cards' box, beam and bookmark layers equal these files scaled), so the
 * art frame is drawn in front-card units and scaled. The coin is the raw image of 6 nvidia 1 / 7 apple 1 / 3 google 1
 * / 5 amazon 1 / 4 shopify 1 for those five companies and, since the user's request of 2026-10-30 (it replaces the
 * 2026-10-19 "box and beam alone" rule), the same glass coin with the company's own mark for every other company
 * (CompanyLogo), in the same 147.493 square at the same centre in all three slots.
 */
export function GlassCoin({ ticker, scale, left, top, coin }: Props) {
	return (
		<div
			className="pointer-events-none absolute origin-top-left"
			style={{ left, top, width: ART_W, height: ART_H, transform: scale === 1 ? undefined : `scale(${scale})` }}
			aria-hidden="true"
		>
			{/* 545 x 258 px at 2x: 272.5 x 129, from the box's render-bounds corner (-26.5142, 78.5953) */}
			<img alt="" src={D.deckBoxRaster} draggable={false} className="absolute block h-[129px] w-[272.5px] max-w-none" style={{ left: -26.5142, top: 78.5953 }} />
			<img alt="" src={D.deckBeam} draggable={false} className="absolute block h-[153.3936px] w-[142.687px] max-w-none" style={{ left: 37.1463, top: -5.3057 }} />
			<CompanyLogo ticker={ticker} size={COIN} className="absolute" style={{ left: coin[0] - COIN / 2, top: coin[1] - COIN / 2 }} />
		</div>
	);
}

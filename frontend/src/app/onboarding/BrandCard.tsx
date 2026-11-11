import { cn } from "@/lib/utils";
import type { BrandPick } from "./data";
import { FigmaImg, onFraction } from "./subpixel";

/** "B" 2:5783 …: the white 24px badge, radius 12, clipping its logo layer. */
const BADGE = 24;
/** The name's left edge in the tile: the badge and Figma's 10px gap. */
const NAME_AT = BADGE + 10;

/**
 * "Brand · Apple" 2:5782 (225x76, radius 14, #181f30): the white 24px "B" badge with the logo layer, gap 10, the name in
 * Geist Medium 14/18, the pair centred by the tile's auto layout. Picked: Figma's 1px INSIDE stroke
 * rgba(105,179,202,0.5) and the name in #a6e4f7. A plain frame (no variant, no hover or pressed look, no reaction on
 * either page): it answers with the picked look, the pointer cursor and the canvas's keyboard focus ring only.
 * Six tiles centre their pair on a half pixel (Nike's badge 2:5791 at x 810.5, Spotify 1046.5, Amazon 553.5,
 * PlayStation 542.5, Coinbase 794.5, Uber 1054.5): the badge is drawn there with Figma's anti-aliased edge
 * (onFraction), and each logo at its layer's exact box (FigmaImg).
 */
export function BrandCard({ brand, selected, onToggle, index }: { brand: BrandPick; selected: boolean; onToggle: () => void; index: number }) {
	const badgeX = (225 - NAME_AT - brand.nameW) / 2;
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onToggle}
			className="onboarding-brand absolute flex h-[76px] w-[225px] cursor-pointer items-center justify-center gap-[10px] overflow-clip rounded-[14px] bg-[#181f30]"
			style={{ left: (index % 4) * 245, top: Math.floor(index / 4) * 96, boxShadow: selected ? "inset 0 0 0 1px rgba(105,179,202,0.5)" : undefined }}
		>
			<span className="relative block size-[24px] shrink-0 overflow-clip rounded-[12px] bg-white" style={onFraction(badgeX, 0)}>
				<BrandLogo logo={brand.logo} />
			</span>
			<span className={cn("whitespace-nowrap text-left font-geist text-[14px] font-medium leading-[18px]", selected ? "text-[#a6e4f7]" : "text-[#f2f6fc]")} style={{ width: brand.nameW }}>
				{brand.name}
			</span>
		</button>
	);
}

/** The logo layer inside the badge, at its box: an image layer FITs into its rounded rectangle; a vector is its SVG export. */
function BrandLogo({ logo }: { logo: BrandPick["logo"] }) {
	const [x, y, w, h] = logo.box;
	return <FigmaImg src={logo.src} x={x} y={y} w={w} h={h} radius={logo.radius} className={logo.radius ? "object-contain" : undefined} />;
}

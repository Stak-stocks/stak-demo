import type { ComponentProps, CSSProperties } from "react";
import { BackRing, CANON_BOX, CANON_LABELS, GHOST_FILTER, GLOW_FILTER, GhostRing, LABEL_ROW_BASELINE, LIGHT_INK, MUTED_INK, labelled } from "@/app/ui/Button";
import { cn } from "@/lib/utils";

/**
 * The frames beside the canon primary (`@/app/ui/Button`): Ghost is the primary's box without a fill
 * ("Learn more" 2:3087, "Review saves in My STAK" 2:3448, "Unsave" / the ghost "Practice buy" of the stock rail
 * 2:3553 …), SheetBackButton is the sheets' "Back" row.
 * Ghost (Figma 2026-10-18, 16 layers): h52 · r6 · fills hidden · the canon stroke · clips · auto layout padding 0, items
 * 8 apart (2:3087 "Add to STAK", as the canon 2:8023) · Geist Medium 14/20.69 white in a hugging box centred · the
 * canon's three drop shadows. With no fill Figma casts them from what the frame
 * draws (the stroke and the label), as a filter does: a box-shadow would print a faint copy of the box 28px below it.
 * Both are plain frames in Figma (no variants, no hover or pressed state), so neither answers the pointer; the cursor,
 * the disabled look and the canvas's focus outline stay.
 * The label is an element of its own: a button holding bare text matched the app's plain-text baseline rule itself and
 * moved down a third of a pixel (Learn more painted from row 857 instead of Figma's 856.2).
 * The stroke is GhostRing: with no fill, the ring is the button's whole edge, so each run sits in the pixel row Figma
 * paints it in (the deck's 2:3087 at y 856.2: row 856), not where Chrome's rounding of the box would put it.
 */
export function GhostButton({ className, style, disabled, children, ...rest }: ComponentProps<"button">) {
	return (
		<button
			type="button"
			disabled={disabled}
			className={cn(
				CANON_BOX,
				"flex h-[52px] w-full items-center justify-center overflow-clip whitespace-nowrap rounded-[6px] font-geist text-[14px] font-medium leading-[20.69px] text-white",
				"[filter:var(--stak-ghost-glow)]",
				className,
			)}
			style={{ "--stak-ghost-glow": GLOW_FILTER, ...style } as CSSProperties}
			{...rest}
		>
			<span className={cn("inline-flex items-center gap-[8px]", LIGHT_INK, LABEL_ROW_BASELINE)}>{labelled(children, CANON_LABELS)}</span>
			<GhostRing />
		</button>
	);
}

/** The Back row's corner radius (2:3420 / 2:4356 / 2:5598 "Frame 264": 5.781). */
const BACK_RADIUS = 5.781;

/**
 * The sheet's "Back" row (2:3420 "Frame 264"): h51 · r5.781 · 0.361 outside stroke rgba(52,59,79,.33) · Sora 14.453
 * #819abb in Figma's 18px auto-height text box, centred (y 16.5) · the five-layer glow.
 * The stroke is BackRing: the 1px ring carrying the stroke's ink in the pixel rows Figma paints it in, whether the
 * ticket puts the row on a half pixel (the Discover-entry tickets 2:3420 / 2:4356 at y 751.5: the top run in row 751)
 * or a whole one (the My STAK-entry ticket 2:5598 at y 751: row 750); the bottom run is row 802 in both. Inside the
 * button, so the stroke casts the row's drop shadows with the label, as Figma's no-fill frame does.
 * Plain frame in Figma: no hover or pressed look; cursor, disabled look and focus ring stay. The label is Figma's
 * whole-pixel box drawn at Figma's stroke weight (MUTED_INK).
 */
export function SheetBackButton({ className, style, children, ...rest }: ComponentProps<"button">) {
	return (
		<button
			type="button"
			className={cn(
				"relative flex h-[51px] w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-[5.781px] px-[14px] py-[7px] font-sora text-[14.453px] leading-[18px] text-[#819abb] disabled:cursor-default disabled:opacity-60",
				className,
			)}
			style={{ filter: GHOST_FILTER, ...style }}
			{...rest}
		>
			<span className={cn("inline-flex items-center", MUTED_INK, LABEL_ROW_BASELINE)}>{labelled(children)}</span>
			<BackRing radius={BACK_RADIUS} />
		</button>
	);
}

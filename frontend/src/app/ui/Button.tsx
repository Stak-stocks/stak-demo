import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The button canon of the Figma references (2:8019 "Button audit · 129 buttons · one dialect"):
 * r6 · h52 · width contextual · Geist Medium 14/20.69 white · hairline 0.361 rgba(101,158,173,.63) ·
 * the faint (82,170,199) glow · the cyan gradient. Every primary button in the product is this component;
 * the width comes from the frame (the column it sits in, or an explicit `width`).
 */
export const GRADIENT =
	"linear-gradient(180deg, rgb(166, 228, 247) 8.8889%, rgb(93, 168, 191) 39.189%, rgb(60, 152, 180) 72.549%), linear-gradient(90deg, rgb(44, 157, 188) 0%, rgb(44, 157, 188) 100%)";
export const HAIRLINE_COLOR = "rgba(101,158,173,0.63)";
/**
 * Figma hairline strokes sit inside the box; an inset shadow keeps the layout size and the fractional width
 * (a 0.361px CSS border snaps to a whole device pixel, three times the authored coverage).
 */
export const hairline = (width: number, color: string) => `inset 0 0 0 ${width}px ${color}`;
/** The glow as box-shadows (Figma's three drop shadows), so the shared .stak-press hover filter still applies. */
export const GLOW =
	"0px 77.322px 21.679px 0px rgba(82,170,199,0), 0px 49.862px 19.511px 0px rgba(82,170,199,0.01), 0px 28.183px 16.621px 0px rgba(82,170,199,0.03)";
/** The same glow as a filter, for shells whose shadow has to follow their alpha. */
export const GLOW_FILTER =
	"drop-shadow(0px 77.322px 10.839px rgba(82,170,199,0)) drop-shadow(0px 49.862px 9.756px rgba(82,170,199,0.01)) drop-shadow(0px 28.183px 8.31px rgba(82,170,199,0.03))";
/** The five-layer glow of the ghost "Back" rows. */
export const GHOST_FILTER =
	"drop-shadow(0px 77.322px 10.839px rgba(82,170,199,0)) drop-shadow(0px 49.862px 9.756px rgba(82,170,199,0.01)) drop-shadow(0px 28.183px 8.31px rgba(82,170,199,0.05)) drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.1))";
/** Hairline and glow together: the canon's whole frame in one box-shadow. */
export const PRIMARY_SHADOW = `${hairline(0.361, HAIRLINE_COLOR)}, ${GLOW}`;

const BASE =
	"stak-press flex cursor-pointer items-center justify-center gap-[8px] overflow-clip whitespace-nowrap rounded-[6px] px-[14px] py-[7px] font-geist text-[14px] font-medium leading-[20.69px] text-white";

type Props = ComponentProps<"button"> & {
	/** `span` draws the same box as plain content, for the inside of a Link that is the control itself (no button nested in the anchor). */
	as?: "button" | "span";
	/** The contextual width in px; without it the button fills its column. */
	width?: number;
	height?: number;
};

export function PrimaryButton({ as = "button", width, height = 52, className, style, children, type = "button", ...rest }: Props) {
	const classes = cn(BASE, width === undefined && "w-full", className);
	const css: CSSProperties = { width, height, backgroundImage: GRADIENT, boxShadow: PRIMARY_SHADOW, ...style };
	if (as === "span") {
		return (
			<span className={classes} style={css}>
				{children}
			</span>
		);
	}
	return (
		<button type={type} className={classes} style={css} {...rest}>
			{children}
		</button>
	);
}

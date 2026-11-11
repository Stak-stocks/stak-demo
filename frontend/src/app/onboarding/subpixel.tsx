import type { CSSProperties, ReactNode } from "react";
import { DensityImg } from "@/app/FitCanvas";
import { cn } from "@/lib/utils";

/**
 * Figma draws every layer where it is, fractions included, and anti-aliases the edges that fall inside a pixel. Chrome
 * paints a box's background, border and an image's content box on whole device pixels: a 26.4782px mark is drawn 26px
 * wide, a badge at x 810.5 starts on 811, a card at y 376.5 on 377. A transform is not snapped, so a box laid out on a
 * whole pixel and carried by a transform lands on Figma's fractional place with Figma's edges. Measured on 2026-10-18
 * (headless Chrome, 1440): a 40px box at left 200.5 paints columns 201-240 solid; at left 200 + translateX(0.5px) it
 * paints columns 200 and 240 at half strength, as Figma's render of a box at 200.5 does; the STAK mark drawn this way
 * sits 5.7 levels from Figma's render on average (14.0 as a plain 26.4782px <img>), the wordmark 4.1 (8.2), and a sweep
 * of ±0.25 / ±0.5px offsets around that place only moves further away.
 * Text never goes through a fractional transform: Chrome snaps a glyph run in its own layer first and rounds again on
 * the screen, so a text whose offset ends in .5 or more lands a row low (measured: the canon labels and the taste-card
 * texts moved one row down that way). Boxes that hold text keep their layout and draw their fill on a layer behind it
 * (FracFill); a button keeps its label on its row with FracLabel.
 * The fractions hold at every even window width (the steps centre on 50%, a whole pixel there) and on the zoomed canvas
 * below 1440 they scale with it.
 * Below 1024 the steps reflow (responsive.css): no element sits at its 1440 place any more, so there every one of these
 * placements is undone (the relative offset and the translate of shift() / FracLabel, FracFill back on its box) and
 * the boxes paint where the reflowed layout puts them, on whole pixels like the rest of the page. A FracFill drawn
 * inside its box (the selected option's 0.5px INSIDE stroke) keeps its inset there as a translate: laid out at the
 * inset itself, Chrome snapped both of its edges the same way (16.5 -> 17, 373.5 -> 374), so the stroke showed at full
 * strength on the left and top and not at all on the right and bottom (review round 2).
 */
const n = (v: number) => Number(v.toFixed(5));
/** The part of a position past the whole pixel below it (0.5 for 376.5, 0.5361 for -0.4639). */
export const frac = (v: number) => n(v - Math.floor(v + 1e-6));

/**
 * The style that keeps an in-flow element in its layout slot but draws it `fx` / `fy` px further on: its relative
 * offset pulls the layout box back by the fraction and the `translate` carries the paint forward again. For boxes
 * without text (tracks, badges, round controls, images); `translate` (not `transform`) composes outside any rotate the
 * element has (the flipped Nav · Next).
 */
export function shift(fx: number, fy: number): CSSProperties | undefined {
	const x = n(fx);
	const y = n(fy);
	if (!x && !y) return undefined;
	return { position: "relative", left: -x, top: -y, translate: `${x}px ${y}px` };
}

/**
 * shift() for an element whose layout puts it at `x` / `y` in the frame (Figma's position): its layout box goes onto
 * the whole pixel below that place and the paint onto the place itself. Whole positions pass through untouched.
 */
export const onFraction = (x: number, y: number) => shift(frac(x), frac(y));

/**
 * The fill of a box that holds text, drawn on Figma's fractional place behind the box's content: the box keeps its
 * layout and draws nothing itself (it carries `isolate` so this layer stays behind its children); `x` / `y` are where
 * the frame puts the box. `inset` draws the layer that much inside the box: an INSIDE stroke is a stroke-coloured layer
 * with the fill inset by the stroke's weight over it, so a 0.5px stroke on a half-pixel edge covers half of that row in
 * the stroke's colour, as Figma's does (an inset box-shadow there is anti-aliased twice, a quarter of the colour).
 * With whole positions it is a plain background layer.
 */
export function FracFill({ x, y, inset = 0, className, style }: { x: number; y: number; inset?: number; className?: string; style?: CSSProperties }) {
	const fx = frac(x + inset);
	const fy = frac(y + inset);
	return (
		<span
			aria-hidden="true"
			// below 1024 responsive.css puts the layer back on its box without the fraction; an inset layer ("inset") is
			// carried there by a translate of its inset (--frac-inset), so its four edges anti-alias alike
			data-frac-fill={inset ? "inset" : ""}
			className={cn("pointer-events-none absolute -z-10 block", className)}
			style={
				{
					left: n(inset - fx),
					top: n(inset - fy),
					width: inset ? `calc(100% - ${2 * inset}px)` : "100%",
					height: inset ? `calc(100% - ${2 * inset}px)` : "100%",
					translate: fx || fy ? `${fx}px ${fy}px` : undefined,
					"--frac-inset": `${inset}px`,
					...style,
				} as CSSProperties
			}
		/>
	);
}

/**
 * The inside of a label whose button is drawn on a fraction (onFraction): the counter-shift that gives the glyph run its
 * own layout back and cancels the button's translate, so the text is drawn on exactly the row it had. A block: a
 * transform does not apply to an inline box (only the relative offset would, a whole fraction too far).
 */
export function FracLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
	const fx = frac(x);
	const fy = frac(y);
	if (!fx && !fy) return <>{children}</>;
	return <span style={{ display: "block", position: "relative", left: fx, top: fy, translate: `${-fx}px ${-fy}px` }}>{children}</span>;
}

/**
 * Figma's image layer `x` / `y` / `w` / `h` (relative to its positioned parent), drawn at exactly that box: the <img> is
 * laid out in the whole-pixel box that holds it and a translate + scale carries it onto Figma's (a raster image is
 * resampled once, to Figma's size; an SVG export is drawn as vectors at that size). `origin`: where the parent's box
 * sits in the frame when that is not on whole pixels, so the layout box still lands on one. `radius` is the layer's
 * corner in Figma's units; `rotate` (CSS degrees) turns it about its centre, as Figma's rotation does.
 * Drawn through the core's DensityImg: up to 2560 exactly the <img> it was; past 2560 a raster with Figma's @2x / @4x
 * exports in `srcSet` draws the one that covers the canvas zoom (CORE-API section 8), so it stays sharp on 4K - 8K.
 */
export function FigmaImg({
	src,
	x,
	y,
	w,
	h,
	origin = [0, 0],
	radius,
	rotate,
	className,
	style,
	srcSet,
	alt = "",
}: {
	src: string;
	srcSet?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	origin?: readonly [number, number];
	radius?: number;
	rotate?: number;
	className?: string;
	style?: CSSProperties;
	alt?: string;
}) {
	const [ox, oy] = origin;
	const X = Math.floor(ox + x + 1e-6) - ox;
	const Y = Math.floor(oy + y + 1e-6) - oy;
	const W = Math.ceil(w - 1e-6);
	const H = Math.ceil(h - 1e-6);
	const sx = n(w / W);
	const sy = n(h / H);
	const turn = rotate ? ` translate(${n(w / 2)}px, ${n(h / 2)}px) rotate(${rotate}deg) translate(${n(-w / 2)}px, ${n(-h / 2)}px)` : "";
	return (
		<DensityImg
			alt={alt}
			src={src}
			srcSet={srcSet}
			width={W}
			height={H}
			className={cn("pointer-events-none absolute block max-w-none", className)}
			style={{
				left: n(X),
				top: n(Y),
				width: W,
				height: H,
				transformOrigin: "0 0",
				transform: `translate(${n(x - X)}px, ${n(y - Y)}px)${turn} scale(${sx}, ${sy})`,
				// the corner is drawn before the scale: Figma's radius in the image's own (unscaled) units
				borderRadius: radius ? `${n(radius / sx)}px / ${n(radius / sy)}px` : undefined,
				...style,
			}}
		/>
	);
}

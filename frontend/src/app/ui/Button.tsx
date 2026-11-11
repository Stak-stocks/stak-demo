import { Children, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The button canon of the Figma references (2:8019 / 2:7307 "Button audit · canon applied · 129 buttons · one
 * dialect"): r6 · h52 · width contextual · Geist Medium 14/20.69 white · the 0.361 OUTSIDE gradient stroke
 * rgba(101,158,173,.63) -> rgba(22,54,63,.43) · the faint (82,170,199) glow · the cyan gradient. Every primary button
 * in the product is this component; the width comes from the frame (the column it sits in, or an explicit `width`).
 * Values read from Figma on 2026-10-18 (read-only Plugin API dump of the 79 canon-stroke buttons in 42 frames): fill
 * #2c9dbc under the gradient (tf [[0, 1.570842, -0.13963], …]: stops at 8.8889 / 39.189 / 72.549 % of the height),
 * stroke 0.361316 OUTSIDE (tf [[0, 0.967742, 0.032258], …]: t = 1/31 + 30/31 · y/h), three visible drop shadows
 * (0 28.182617 / 16.620518 at 3 %, 0 49.861553 / 19.511044 at 1 %, 0 77.321541 / 21.678936 at 0 %). Every button is a
 * plain frame: no component, no variant, no hover / pressed state and no "change to" reaction anywhere in the file.
 */
export const GRADIENT =
	"linear-gradient(180deg, rgb(166, 228, 247) 8.8889%, rgb(93, 168, 191) 39.189%, rgb(60, 152, 180) 72.549%), linear-gradient(90deg, rgb(44, 157, 188) 0%, rgb(44, 157, 188) 100%)";
/**
 * The class that draws the canon's stroke from src/styles.css (an SVG hairline 0.361 wide); `-sm` for the 60x30 pill.
 * The buttons of this file draw it with `StrokeRing` instead (the same stroke, laid on the pixel Figma paints it in);
 * the skeletons still use the class.
 */
export const STROKE = "stak-stroke";
/**
 * Figma INSIDE strokes: an inset shadow keeps the layout size and the fractional width
 * (a 0.361px CSS border snaps to a whole device pixel, three times the authored coverage).
 */
export const hairline = (width: number, color: string) => `inset 0 0 0 ${width}px ${color}`;
/** Figma OUTSIDE strokes in a solid colour (the sheets' Back rows): a spread shadow, drawn outside the box like Figma's. */
export const outsideHairline = (width: number, color: string) => `0 0 0 ${width}px ${color}`;
/**
 * The glow as box-shadows (Figma's three visible drop shadows; Figma's own code export for the clipping frames).
 * Figma's floats, read with the Plugin API on 2026-10-18: offsets 28.1826172 / 49.8615532 / 77.3215408, radii
 * 16.6205177 / 19.5110435 / 21.678936, colour (82,170,199) at exactly 0.03 / 0.01 / 0 (the "#52aac708" / "#…03" of
 * a hex readout is that alpha rounded to 1/255, not a different value).
 */
export const GLOW =
	"0px 77.3215px 21.6789px 0px rgba(82,170,199,0), 0px 49.8616px 19.511px 0px rgba(82,170,199,0.01), 0px 28.1826px 16.6205px 0px rgba(82,170,199,0.03)";
/**
 * The same glow as a filter (Figma's export for the non-clipping frames: a drop-shadow's third value is the Gaussian's
 * standard deviation, half the box-shadow blur). The canon uses this one: measured below Sign in (2:5700) against
 * Figma's render, the filter lands within 0.54 of a level on average, the box-shadows within 0.96.
 */
export const GLOW_FILTER =
	"drop-shadow(0px 77.3215px 10.8395px rgba(82,170,199,0)) drop-shadow(0px 49.8616px 9.7555px rgba(82,170,199,0.01)) drop-shadow(0px 28.1826px 8.3103px rgba(82,170,199,0.03))";
/**
 * The Back-row dialect's stroke (Figma "Frame 264" / "Log out": 0.361316 OUTSIDE, rgb(52,59,79) at 33%) as Figma
 * rasterises it: the whole coverage in the one pixel row / column each run falls in, i.e. a 1px ring carrying
 * 0.33 x 0.361316 = 0.1192 (measured on 2:1311's Back: edge rows (28,38,56) / (27,34,51) against Figma's
 * (29,38,57) / (28,34,53); a 0.361 spread shadow paints (27,36,54) / (26,32,50)).
 */
export const BACK_INK = "rgba(52,59,79,0.1192)";
/** BACK_INK as a spread shadow: right on whole pixels only (its bottom run lands a row low on a half-pixel box). */
export const BACK_RING = outsideHairline(1, BACK_INK);

/**
 * A length in device pixels, whatever the canvas zoom (FitCanvas zooms the 1440 layout down below 1440). Past 2560
 * (zoom above 1) it stays a pixel of the 2560 layout, which the big regime scales evenly (min(1, zoom) = zoom up to 2560).
 */
const devicePx = (px: number) => `calc(${px}px / min(1, var(--stak-zoom, 1)))`;

/**
 * Where the no-fill rings (BackRing, GhostRing) start before / end past the button's edges, so that once Chrome rounds
 * each edge of the ring's box to the nearest pixel, every run of the ring sits in the pixel row / column that Figma's
 * 0.361 OUTSIDE stroke covers most. A top edge at n + f puts [n + f - 0.361, n + f] on the canvas: all of it in row n
 * when f >= 0.361, else 0.361 - f in row n - 1 and f in row n, so row n - 1 holds most of it while f < 0.1807 (half the
 * stroke). round(n + f - 0.6807) is n - 1 exactly while f < 0.1807, and the bottom / right edges mirror it (row n + 1
 * once f > 0.8193). Figma's render of the deck's Learn more (2:3087, left edge x 660.1) puts 72 % of that run in column
 * 659: an offset of 0.53 rounded it into column 660. Whole, half and .2 / .8 edges land where they did. (A run Figma
 * splits over two rows stays in one: four quarter-ink rings split it, but Chrome composites each low-alpha ring in
 * 8 bits and the whole-pixel rows lost 2-6 levels, measured 2026-10-18.)
 */
const RING_OUT = 0.6807;

/**
 * The Back-row dialect's stroke as one 1px ring (BACK_INK) laid on the pixels Figma paints its 0.361 OUTSIDE stroke
 * in, wherever the row lands. Figma puts each run in the pixel row / column the stroke covers: the row above a box on
 * a whole pixel (2:5598 at y 751: row 750), the row a half-pixel edge splits (2:3420 at y 751.5: row 751), and below
 * the box the row its bottom edge starts or splits (802 for both). Chrome rounds each edge of a box to the nearest
 * pixel, so the ring's box starts RING_OUT before the button's top / left edge and ends RING_OUT past its bottom /
 * right edge: rounded, its 1px border then covers the row or column holding most of Figma's stroke at any fraction.
 * The corners are concentric with the button's (outer radius + 1). A child of the button, so
 * the ring casts the button's drop shadows as Figma's stroke does; a clipping button keeps `overflow-clip-margin: 1px`.
 */
export function BackRing({ radius }: { radius: number }) {
	return (
		<i
			aria-hidden="true"
			className="pointer-events-none absolute block not-italic"
			style={{
				left: devicePx(-RING_OUT),
				top: devicePx(-RING_OUT),
				width: `calc(100% + ${devicePx(2 * RING_OUT)})`,
				height: `calc(100% + ${devicePx(2 * RING_OUT)})`,
				border: `${devicePx(1)} solid ${BACK_INK}`,
				borderRadius: `calc(${radius}px + ${devicePx(1)})`,
			}}
		/>
	);
}
/**
 * The five-layer glow of the ghost "Back" rows ("Frame 264" 2:1456 / 2:1728, "Log out" 2:2552: offsets 2.8905249 /
 * 12.2847309 / 28.1826172 / 49.8615532 / 77.3215408, radii 6.5036812 / 12.2847309 / 16.6205177 / 19.5110435 /
 * 21.678936, colour (82,170,199) at 0.1 / 0.09 / 0.05 / 0.01 / 0; standard deviations = radius / 2).
 */
export const GHOST_FILTER =
	"drop-shadow(0px 77.3215px 10.8395px rgba(82,170,199,0)) drop-shadow(0px 49.8616px 9.7555px rgba(82,170,199,0.01)) drop-shadow(0px 28.1826px 8.3103px rgba(82,170,199,0.05)) drop-shadow(0px 12.2847px 6.1424px rgba(82,170,199,0.09)) drop-shadow(0px 2.8905px 3.2518px rgba(82,170,199,0.1))";
/** The canon's shadow as box-shadows (kept for callers that draw the canon's box themselves). */
export const PRIMARY_SHADOW = GLOW;

/** Figma's stroke weight on every canon-stroke button. */
const STROKE_WEIGHT = 0.361316;

/**
 * The canon stroke as Figma rasterises it. The 0.361 OUTSIDE stroke of a box on whole pixels lies inside the one pixel
 * row / column next to each edge, and Figma paints its whole coverage there (36 %; Figma's render of 2:5700: row 700 =
 * the page plus 0.361 x 0.63 of rgb(101,158,173)). Chrome paints a stroke thinner than a pixel as a 1px hairline at
 * that fraction of its alpha centred on the stroke's line, so a third of the ink lands on the button's own first row
 * (the shared .stak-stroke measured rows 700 / 701 at (23,37,53) / (161,223,242) against Figma's (32,49,64) /
 * (166,228,247)). Here the stroke is a 1px line centred half a pixel outside the box, carrying 0.361 x the stroke's
 * alpha: the same ink, in the pixel Figma puts it in (measured (29,47,63) / (166,228,247)). The gradient keeps Figma's
 * transform (t = 1/31 + 30/31 · y/h: rgba(101,158,173,.63) 1/30 of the height above the box, rgba(22,54,63,.43) at its
 * bottom edge), expressed in the line's own bounding box (half a pixel outside the button all round).
 */
function strokeRing(height: number, radius: number) {
	const top = (0.5 - height / 30) / (height + 1);
	const bottom = (height + 0.5) / (height + 1);
	const svg =
		`<svg xmlns='http://www.w3.org/2000/svg'><linearGradient id='s' x1='0' y1='${top.toFixed(6)}' x2='0' y2='${bottom.toFixed(6)}'>` +
		`<stop stop-color='rgb(101,158,173)' stop-opacity='${(0.63 * STROKE_WEIGHT).toFixed(6)}'/>` +
		`<stop offset='1' stop-color='rgb(22,54,63)' stop-opacity='${(0.43 * STROKE_WEIGHT).toFixed(6)}'/></linearGradient>` +
		`<rect style='x:0.5px;y:0.5px;width:calc(100% - 1px);height:calc(100% - 1px)' rx='${radius + 0.5}' fill='none' stroke='url(#s)' stroke-width='1'/></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const RINGS = new Map<string, string>();
const ringFor = (height: number, radius: number) => {
	const key = `${height}/${radius}`;
	let url = RINGS.get(key);
	if (!url) RINGS.set(key, (url = strokeRing(height, radius)));
	return url;
};

/**
 * The canon stroke of a button `height` tall with corner `radius` (52 / 6 by default; Sell 51 / 6, the Buy pill
 * 30 / 5.781). It sits 1px outside the button, so the button keeps `overflow-clip-margin: 1px` (CANON_BOX) when it
 * clips. An <i>: the app's plain-text rules (baseline shift, grayscale opacity, the sheets' text layers) target
 * spans and paragraphs, and this is no text.
 */
export function StrokeRing({ height = 52, radius = 6 }: { height?: number; radius?: number }) {
	return (
		<i
			aria-hidden="true"
			className="pointer-events-none absolute inset-[-1px] block not-italic"
			style={{ backgroundImage: ringFor(height, radius), backgroundRepeat: "no-repeat" }}
		/>
	);
}

/**
 * The canon stroke on a button WITHOUT a fill (the canon ghosts: "Learn more" 2:3087, "Review saves in My STAK"
 * 2:3448, the stock rail's "Practice buy" 2:3553 …), laid on the pixel rows Figma paints it in. StrokeRing follows the
 * button's own box, which Chrome rounds to whole pixels; that keeps a filled button's ring flush with its fill, but a
 * ghost has no fill, so its ring is all there is of its edge, and Figma puts each run in the row the stroke covers most
 * (2:3087 at y 856.2: the top run in row 856, not 855; its left edge at x 660.1: column 659, where Figma paints 72 %
 * of that run; a box at y + .5 has its bottom run in the row its edge splits).
 * The same placement as BackRing (a box RING_OUT before and past the button, rounded edge by edge), drawn as the
 * canon gradient through a 1px band (a mask that excludes the content box), so the corners stay concentric (outer
 * radius + 1). Whole-pixel boxes paint exactly as StrokeRing does. The gradient keeps
 * Figma's transform (t = 1/31 + 30/31 · y/h: rgba(101,158,173,.63) h/30 above the box, rgba(22,54,63,.43) at its
 * bottom edge) at 0.361 x those alphas, the ink Figma's renderer leaves in the band.
 */
export function GhostRing({ height = 52, radius = 6 }: { height?: number; radius?: number }) {
	const top = RING_OUT - height / 30;
	const bottom = height + RING_OUT;
	const band = "linear-gradient(#000 0 0)";
	return (
		<i
			aria-hidden="true"
			className="pointer-events-none absolute block box-border not-italic"
			style={{
				left: devicePx(-RING_OUT),
				top: devicePx(-RING_OUT),
				width: `calc(100% + ${devicePx(2 * RING_OUT)})`,
				height: `calc(100% + ${devicePx(2 * RING_OUT)})`,
				padding: devicePx(1),
				borderRadius: `calc(${radius}px + ${devicePx(1)})`,
				backgroundImage: `linear-gradient(180deg, rgba(101,158,173,${(0.63 * STROKE_WEIGHT).toFixed(6)}) ${top.toFixed(4)}px, rgba(22,54,63,${(0.43 * STROKE_WEIGHT).toFixed(6)}) ${bottom.toFixed(4)}px)`,
				mask: `${band} content-box exclude, ${band}`,
			}}
		/>
	);
}

/**
 * What every canon-stroke box carries: a positioned box for the ring, and its 1px outside the clip.
 * Interaction: Figma defines no hover or pressed look for any button, so none answers the pointer (the Home, sidebar,
 * Discover and Portfolio rulings removed the shared .stak-press brightness / scale for the same reason); the cursor,
 * the disabled look (60 %, default cursor) and the canvas's keyboard focus ring (2px #69b3ca, 2px out) stay.
 */
export const CANON_BOX =
	"relative cursor-pointer [overflow-clip-margin:1px] disabled:cursor-default disabled:opacity-60 aria-disabled:cursor-default aria-disabled:opacity-60";

/**
 * Figma's auto-width text boxes are their glyph run rounded UP to a whole pixel ("Practice buy" 82, "Confirm practice
 * buy" 137, "Learn more" 74), left-aligned, and the button's auto layout centres that box. A button centres the bare
 * run instead (a fraction of a pixel right of Figma's glyphs), and gives the text no element for the app's baseline
 * rule to place. Bare text children get that box; element children (icons, call sites that pass Figma's exact box)
 * pass through.
 */
export const LABEL_BOX = "w-[calc-size(max-content,round(up,size,1px))] text-left";

/**
 * Figma's label boxes of the canon's labels (Geist Medium 14 white, the text layers of the 106 button frames read on
 * 2026-10-18). Chrome's run rounded up gives the same width for all of them but two ("Review saves in My STAK" 164.91
 * -> 165 against Figma's 166, "Confirm practice sell" 135.53 -> 136 against 137), whose glyphs would otherwise start
 * half a pixel right of Figma's; a label found here takes Figma's box.
 */
export const CANON_LABELS: Readonly<Record<string, number>> = {
	"Add to STAK": 81,
	"Back to Simulate": 113,
	"Confirm practice buy": 137,
	"Confirm practice sell": 137,
	Continue: 60,
	"Continue · 5 picked": 126,
	"Create account": 101,
	"Get started": 75,
	"Go to today’s deck": 123,
	"Learn more": 74,
	"Lets go!": 52,
	"Open mail app": 95,
	"Practice buy": 82,
	"Practice buy your saves": 156,
	"Proceed to home": 112,
	"Review saves in My STAK": 166,
	Save: 33,
	"Save changes": 92,
	"Save new password": 131,
	"See today’s pick": 109,
	"Send reset link": 99,
	"Sign in": 45,
	"Try again": 60,
	Unsave: 49,
	"View in My STAK": 109,
};

/**
 * White text on the buttons drawn at Figma's stroke weight. Chrome's glyph rasteriser picks its contrast table from the
 * text colour's luminance and paints light text 1.2-1.3x the ink Figma paints with the same font, size and weight
 * (measured on 2026-10-18 against Figma's renders: Practice buy 1.19, Learn more 1.32, Confirm practice buy 1.18-1.21,
 * Sell 1.32; Sign in 1.19). Painted as its inverse (black, through -webkit-text-fill-color, so the declared colour
 * stays white) and inverted back by a colour filter, the label is rasterised with the dark-text table: Sign in measures
 * 0.97 of Figma's ink. Weight, size, colour and opacity are unchanged; images inside (the News plus 2:4542) are
 * pre-inverted so they come out as authored. Forced-colours mode draws the plain system colours.
 * The same technique as src/app/home/ink.css (Home and the page header).
 */
export const LIGHT_INK =
	"[filter:invert(1)] [-webkit-text-fill-color:#000] [&_img]:[filter:invert(1)] [&_svg]:[filter:invert(1)] forced-colors:[filter:none] forced-colors:[-webkit-text-fill-color:currentcolor] forced-colors:[&_img]:[filter:none] forced-colors:[&_svg]:[filter:none]";
/**
 * LIGHT_INK for the #819abb labels of the Back rows, Log out and the 60x30 Sell pills: painted as #7e6544 (its inverse)
 * and inverted back. Measured on 2:1311's "Back": 1.06 of Figma's ink as plain text, 1.006 this way.
 */
export const MUTED_INK =
	"[filter:invert(1)] [-webkit-text-fill-color:#7e6544] forced-colors:[filter:none] forced-colors:[-webkit-text-fill-color:currentcolor]";

/**
 * A button label's baseline where Figma draws it. Figma rounds every text's baseline to a whole pixel inside its text
 * box: read from Figma's own render bounds of the reference boards' 400-odd text layers against the fonts' glyph boxes,
 * the baseline sits exactly round(A·size + (line - (A + D)·size) / 2) below the box top (Geist Medium 14 / 20.69: 15,
 * not 15.32; Sora 14.45 / auto: 14; Sora 12 / auto: 12). The app's plain-text rule in src/styles.css aims at the
 * unrounded value, which put a canon label 0.32px below Figma's baseline before Chrome rounds it to a pixel: on a
 * button at y + .8 a whole row low (the article's Add to STAK 2:4541 at y 662.8: ink +0.68px, now -0.32px), and the
 * same 0.28 device px low on the zoomed canvas below 1440 wherever the rounding falls. This overrides that rule's
 * `top` on the label only: Figma's rounded baseline (in layout px) minus Chrome's own baseline in the line box (ascent
 * and descent rounded to device pixels, the leading's upper half floored: the rule's terms), plus 1/64px so that a
 * baseline Figma puts on a half pixel (a button on a whole pixel: its label box at .5) is drawn on the lower of the two
 * rows, the same side for every dialect. Box, height (the rule's) and glyphs are unchanged.
 */
export const FIGMA_BASELINE =
	"[top:calc(round(nearest,var(--stak-fa)*1em_+_(1lh_-_(var(--stak-fa)_+_var(--stak-fd))*1em)/2,1px)_+_0.015625px_-_round(nearest,var(--stak-fa)*1em,var(--stak-dpx))_-_round(down,(1lh_-_round(nearest,var(--stak-fa)*1em,var(--stak-dpx))_-_round(nearest,var(--stak-fd)*1em,var(--stak-dpx)))/2_+_0.01px,var(--stak-dpx)))]";
/**
 * FIGMA_BASELINE for the label boxes of a label row (the canon's row, the ghosts' and the ticket Back row's): every span
 * child, whether labelled() made it from a bare string or the call site passed its own box (Sign in, Create account …).
 */
export const LABEL_ROW_BASELINE =
	"[&>span]:[top:calc(round(nearest,var(--stak-fa)*1em_+_(1lh_-_(var(--stak-fa)_+_var(--stak-fd))*1em)/2,1px)_+_0.015625px_-_round(nearest,var(--stak-fa)*1em,var(--stak-dpx))_-_round(down,(1lh_-_round(nearest,var(--stak-fa)*1em,var(--stak-dpx))_-_round(nearest,var(--stak-fd)*1em,var(--stak-dpx)))/2_+_0.01px,var(--stak-dpx)))]";

/**
 * Bare text children in Figma's text box: its authored width when `widths` knows the string, else the run rounded up
 * (LABEL_BOX); other children unchanged. The row that holds them puts them on Figma's baseline (LABEL_ROW_BASELINE).
 */
export function labelled(children: ReactNode, widths?: Readonly<Record<string, number>>): ReactNode {
	return Children.map(children, (child) => {
		if (typeof child !== "string" && typeof child !== "number") return child;
		const width = typeof child === "string" ? widths?.[child] : undefined;
		return width === undefined ? (
			<span className={LABEL_BOX}>{child}</span>
		) : (
			<span className="shrink-0 text-left" style={{ width }}>
				{child}
			</span>
		);
	});
}

/**
 * The canon's frame (2:8023 "Add to STAK", the board's CANON): horizontal auto layout, padding 0, items 8 apart,
 * centred both ways (instances named "Frame 267" carry 7 / 14 or 7.2263 / 14.4526 padding, which moves nothing at their
 * fixed widths: the label row is centred either way).
 */
const BASE = cn(
	CANON_BOX,
	"flex items-center justify-center overflow-clip whitespace-nowrap rounded-[6px] font-geist text-[14px] font-medium leading-[20.69px] text-white",
	// below 1024 a contextual width never runs past the column it sits in (SPEC R3: the Figma width is the maximum)
	"max-lg:max-w-full",
);

type Props = ComponentProps<"button"> & {
	/** `span` draws the same box as plain content, for the inside of a Link that is the control itself (no button nested in the anchor). */
	as?: "button" | "span";
	/** The contextual width in px; without it the button fills its column. */
	width?: number;
	height?: number;
};

/**
 * The canon primary. Its children sit in one row (icon + label 8 apart, as "Add to STAK" 2:8051 / 2:4541) drawn with
 * LIGHT_INK; a bare string becomes Figma's whole-pixel label box. The row carries `data-canon-label`, a hook for a
 * container that has to move the label alone, never for its look: a panel centred with a half-pixel transform (the
 * alternate Simulate sheet 2:1079 at y 298.5) makes Chrome round the label's baseline twice, a whole row below
 * Figma's (2:1113: +1.03 px), and half a pixel up inside that one panel puts it back on Figma's row (+0.04 px).
 */
export function PrimaryButton({ as = "button", width, height = 52, className, style, children, type = "button", ...rest }: Props) {
	const classes = cn(BASE, width === undefined && "w-full", className);
	const css: CSSProperties = { width, height, backgroundImage: GRADIENT, filter: GLOW_FILTER, ...style };
	const content = (
		<>
			<span data-canon-label="" className={cn("inline-flex items-center gap-[8px]", LIGHT_INK, LABEL_ROW_BASELINE)}>
				{labelled(children, CANON_LABELS)}
			</span>
			<StrokeRing height={height} />
		</>
	);
	if (as === "span") {
		return (
			<span className={classes} style={css}>
				{content}
			</span>
		);
	}
	return (
		<button type={type} className={classes} style={css} {...rest}>
			{content}
		</button>
	);
}

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * A filled rounded rectangle that Figma places on a fraction of a pixel, painted the way Figma paints it: anti-aliased
 * over the rows and columns it straddles. Chrome snaps a CSS box (a background with its radius) to whole device pixels,
 * so the loading frame's 8.8px bar authored at y 634.51 lands crisp on row 635 and the "Go to Deck" pill authored at
 * y 761.36 gets a hard top edge on row 761, where Figma's render (2:1991, 2:414) shows the partial rows. The same
 * rectangle as an SVG rect, inside a whole-pixel box with the fraction moved inside it, is rasterised at Figma's
 * coverage. `left` / `top` are the rectangle's authored position in its parent; when the parent itself sits on a
 * fraction of a pixel (a flex-placed pill at x .3906), `shift` carries that fraction so the box still starts on a whole
 * pixel. Decorative only: the box is aria-hidden and takes no pointer events.
 */
export function SubpixelRect({
	left,
	top,
	width,
	height,
	radius = 0,
	fill,
	shift,
	className,
	style,
}: {
	left: number;
	top: number;
	width: number;
	height: number;
	radius?: number;
	fill: string;
	shift?: { x?: number; y?: number };
	className?: string;
	style?: CSSProperties;
}) {
	const sx = shift?.x ?? 0;
	const sy = shift?.y ?? 0;
	const ax = left + sx;
	const ay = top + sy;
	const x0 = Math.floor(ax);
	const y0 = Math.floor(ay);
	const boxW = Math.ceil(ax + width) - x0;
	const boxH = Math.ceil(ay + height) - y0;
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			width={boxW}
			height={boxH}
			className={cn("pointer-events-none absolute block", className)}
			style={{ left: x0 - sx, top: y0 - sy, ...style }}
		>
			<rect x={ax - x0} y={ay - y0} width={width} height={height} rx={radius} ry={radius} fill={fill} />
		</svg>
	);
}

/**
 * Figma's render of the See Todays Pick glass (136 x 51: "Container" 2:519 on Home, 2:2100 on Home loading) placed on
 * the fraction of a pixel the frame gives it: the pill "Container" sits on x .5 and the glass 0.159 further right
 * (x 630.66 at 1440). The box starts on the whole pixel below the pill's left edge (0.5 left of the pill, which Chrome
 * snaps to that pixel) and the image sits 0.659 into it, so the bright rim is rasterised over two columns at each end,
 * as Figma's render spreads it, where an <img> is snapped to one column at full strength. `src` is the 4x render:
 * down-sampled by the browser, it keeps the rims sharp at every screen density. Decorative only.
 */
export function GlassFile({ node, src }: { node: string; src: string }) {
	return (
		<svg aria-hidden="true" focusable="false" width={136} height={51} className="pointer-events-none absolute top-0 block overflow-visible" style={{ left: -0.5 }}>
			<image data-node-id={node} href={src} x={0.659} y={0} width={136} height={51} />
		</svg>
	);
}

import { type ReactNode, useLayoutEffect } from "react";

/** The Figma desktop frames are authored at this width. */
export const CANVAS_WIDTH = 1440;
/** The content column of those frames with the navigation open: 1440 − 216 sidebar − 40 − 50 margins. */
export const COLUMN_WIDTH = 1134;

/**
 * How the desktop frames meet real screens:
 * - wider than 1440: nothing scales. Text, buttons and cards keep their size, the sidebar hugs the left
 *   edge, and every width a frame authors inside its content column becomes the same fraction of the
 *   real column (`--stak-col`, 1134 at 1440). Each screen then fills the window the way its frame fills
 *   the 1440 canvas: left-anchored blocks stay left, right-anchored ones stay right, cards stretch.
 *   Collapsing the navigation shifts the content left without widening it (Figma 2:8435).
 * - narrower than 1440: the canvas scales down (CSS zoom) so nothing is cut off on small laptops.
 */
function applyZoom() {
	const root = document.documentElement;
	const width = root.clientWidth || CANVAS_WIDTH;
	const zoom = Math.min(1, Math.max(0.5, width / CANVAS_WIDTH));
	root.style.setProperty("--stak-zoom", zoom.toFixed(4));
	// the canvas width in CSS px: 1440 on anything narrower, the real width above it
	root.style.setProperty("--stak-vw", `${Math.max(CANVAS_WIDTH, width / zoom).toFixed(2)}px`);
}

export function useCanvasZoom() {
	useLayoutEffect(() => {
		applyZoom();
		window.addEventListener("resize", applyZoom);
		const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(applyZoom);
		observer?.observe(document.documentElement);
		return () => {
			window.removeEventListener("resize", applyZoom);
			observer?.disconnect();
			document.documentElement.style.removeProperty("--stak-zoom");
			document.documentElement.style.removeProperty("--stak-vw");
		};
	}, []);
}

export function FitCanvas({ children }: { children: ReactNode }) {
	useCanvasZoom();
	return (
		<div className="stak-canvas relative" style={{ minWidth: CANVAS_WIDTH, zoom: "var(--stak-zoom, 1)" }}>
			{children}
		</div>
	);
}

/** A viewport-relative height expressed inside the (possibly scaled-down) canvas. */
export const viewportHeight = (fraction = 1) => `calc(${fraction * 100}vh / var(--stak-zoom, 1))`;

/** Standalone pages (auth, onboarding, splash) fill the window and never shrink below the 1024 frame. */
export const fillHeight = `max(1024px, ${viewportHeight()})`;

const COL = `var(--stak-col, ${COLUMN_WIDTH}px)`;

/** A width authored inside the 1134 column (885, 932, 640 …), kept at the same fraction of the real column. */
export const col = (px: number) => `calc(${COL} * ${(px / COLUMN_WIDTH).toFixed(6)})`;

/** The column plus (or minus) the few pixels some frames run past it (News and Stock detail: 1144 = 1134 + 10). */
export const colPlus = (px: number) => `calc(${COL} ${px < 0 ? "-" : "+"} ${Math.abs(px)}px)`;

/** The left offset that centres a block of the given width in the column, plus an authored shift. */
export const colCentre = (width: number, shift = 0) =>
	`calc((${COL} - ${width}px) / 2${shift ? ` ${shift < 0 ? "-" : "+"} ${Math.abs(shift)}px` : ""})`;

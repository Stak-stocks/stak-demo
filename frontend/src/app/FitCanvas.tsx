import { type ReactNode, useLayoutEffect } from "react";

/** The Figma desktop frames are authored at this width. */
export const CANVAS_WIDTH = 1440;

/**
 * How the desktop frames meet real screens:
 * - wider than 1440: nothing scales. The sidebar hugs the left edge, text and cards keep their
 *   size, and the shell centres the content column in the remaining width (standalone pages such
 *   as sign-in centre their 1440 composition). This is how desktop products behave on large monitors.
 * - narrower than 1440: the canvas scales down (CSS zoom) so nothing is cut off on small laptops.
 */
function applyZoom() {
	const root = document.documentElement;
	const zoom = Math.min(1, Math.max(0.5, root.clientWidth / CANVAS_WIDTH));
	root.style.setProperty("--stak-zoom", zoom.toFixed(4));
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

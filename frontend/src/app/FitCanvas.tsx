import { type ReactNode, useLayoutEffect } from "react";

/** The Figma desktop frames are authored at this width. */
export const CANVAS_WIDTH = 1440;

/**
 * Scales the 1440px design canvas to the viewport width (CSS zoom), so a laptop or a 32-inch
 * monitor shows the frames exactly as drawn, edge to edge, instead of a pixel-sized layout
 * pinned to the left. The factor lives in --stak-zoom so heights that depend on the viewport
 * (sidebar, page minimum) can divide it back out.
 */
function applyZoom() {
	const root = document.documentElement;
	const zoom = Math.max(0.5, root.clientWidth / CANVAS_WIDTH);
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
		<div className="stak-canvas relative" style={{ width: CANVAS_WIDTH, zoom: "var(--stak-zoom, 1)" }}>
			{children}
		</div>
	);
}

/** A viewport-relative height expressed inside the zoomed canvas. */
export const viewportHeight = (fraction = 1) => `calc(${fraction * 100}vh / var(--stak-zoom, 1))`;

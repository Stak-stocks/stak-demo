import { createContext, type ImgHTMLAttributes, type ReactNode, useContext, useLayoutEffect, useSyncExternalStore } from "react";

/** The Figma desktop frames are authored at this width. */
export const CANVAS_WIDTH = 1440;
/** The content column of those frames with the navigation open: 1440 − 216 sidebar − 40 − 50 margins. */
export const COLUMN_WIDTH = 1134;
/** Below this window width the desktop design reflows (tablet and phone): Tailwind's `max-lg:` / `@media (width < 1024px)`. */
export const COMPACT_BELOW = 1024;
/** Below this window width the shell is the phone one (top bar + slide-in menu): Tailwind's `max-sm:` / `@media (width < 640px)`. */
export const PHONE_BELOW = 640;
/** The approved layout the big regime scales up from: the user's 32-inch screen. */
export const BIG_WIDTH = 2560;
export const BIG_HEIGHT = 1440;
/** Ultrawides stretch sideways up to this shape (width : height of the layout), then the whole canvas centres. */
export const CAP_RATIO = 2.4;

/**
 * The five size regimes (SPEC section 1). W / H: the window's width / height in CSS px.
 * - phone    W < 640       zoom 1, layout W, the shell is a top bar + the open sidebar as a slide-in menu
 * - tablet   640 - 1023    zoom 1, layout W, the shell is Figma's closed 72 rail whose Show opens the same menu
 * - laptop   1024 - 1439   zoom W / 1440, layout 1440 (approved, unchanged)
 * - desktop  1440 - 2560   zoom 1, layout W, the fraction rule (approved, unchanged)
 * - big      W > 2560      zoom max(1, min(W / 2560, H / 1440)), layout min(W / zoom, CAP),
 *                          CAP = 2.4 x max(1440, H / zoom); a canvas wider than CAP is CAP wide and centred
 */
export type Regime = "phone" | "tablet" | "laptop" | "desktop" | "big";
/** The regimes a page reflows for: laptop and desktop are one class (the approved 1024 - 2560 range). */
export type SizeClass = "phone" | "tablet" | "desktop" | "big";

export type CanvasSize = {
	regime: Regime;
	sizeClass: SizeClass;
	/** phone or tablet: the desktop design reflows (zoom 1, the canvas is the window's width) */
	compact: boolean;
	/** the canvas zoom, as applied (--stak-zoom): 4 decimals on laptops (the approved strings), 8 past 2560 (so the layout
	 *  is exactly W / zoom = 2560 when the width limits the zoom: 3000 x 1800 is 1.171875, not 1.1719) */
	zoom: number;
	/** the canvas width in layout px (--stak-vw) */
	layoutWidth: number;
	/** big regime: the canvas is CAP wide and centred, `canvasX` layout px of page background on each side */
	capped: boolean;
	canvasX: number;
	/** big regime: CAP in layout px (Infinity elsewhere) */
	cap: number;
};

/**
 * The regime for a window. `width` is the canvas's available width (documentElement.clientWidth, as the approved code
 * always measured it); `compact` / `phone` come from the same media queries the CSS uses when given, so JS and CSS
 * agree at the boundaries. Every value from 1024 to 2560 is computed exactly as before this size system (G1).
 */
export function canvasSize(width: number, height: number, media?: { compact: boolean; phone: boolean }): CanvasSize {
	const compact = media ? media.compact : width < COMPACT_BELOW;
	const phone = media ? media.phone : width < PHONE_BELOW;
	if (compact) {
		const regime = phone ? "phone" : "tablet";
		return { regime, sizeClass: regime, compact: true, zoom: 1, layoutWidth: width, capped: false, canvasX: 0, cap: Number.POSITIVE_INFINITY };
	}
	if (width <= BIG_WIDTH) {
		// the approved formula, unchanged: laptops zoom the 1440 canvas down, wider screens keep zoom 1 (the fraction rule)
		const zoom = Math.min(1, Math.max(0.5, width / CANVAS_WIDTH));
		return {
			regime: width < CANVAS_WIDTH ? "laptop" : "desktop",
			sizeClass: "desktop",
			compact: false,
			zoom: Number(zoom.toFixed(4)),
			layoutWidth: Math.max(CANVAS_WIDTH, width / zoom),
			capped: false,
			canvasX: 0,
			cap: Number.POSITIVE_INFINITY,
		};
	}
	// past 2560 the whole app grows evenly from the 2560 x 1440 layout, like the OS scaling a 4K screen. The zoom keeps 8
	// decimals (W / 2560 has at most 9, H / 1440 repeats): rounded to 4, a 3000-wide window laid out 2559.95 px, not 2560.
	const zoom = Number(Math.max(1, Math.min(width / BIG_WIDTH, height / BIG_HEIGHT)).toFixed(8));
	const cap = CAP_RATIO * Math.max(BIG_HEIGHT, height / zoom);
	const natural = width / zoom;
	const capped = natural > cap + 0.005;
	return {
		regime: "big",
		sizeClass: "big",
		compact: false,
		zoom,
		layoutWidth: capped ? cap : natural,
		capped,
		canvasX: capped ? (natural - cap) / 2 : 0,
		cap,
	};
}

const DESKTOP_FALLBACK = canvasSize(CANVAS_WIDTH, 1024);
const hasMedia = typeof window !== "undefined" && typeof window.matchMedia === "function";
const queries = hasMedia ? { compact: window.matchMedia("(width < 1024px)"), phone: window.matchMedia("(width < 640px)") } : null;

function measure(): CanvasSize {
	if (typeof window === "undefined" || !queries) return DESKTOP_FALLBACK;
	const width = document.documentElement.clientWidth || window.innerWidth || CANVAS_WIDTH;
	return canvasSize(width, window.innerHeight, { compact: queries.compact.matches, phone: queries.phone.matches });
}

/* One shared snapshot of the window's regime for every component (useSyncExternalStore). */
let snapshot: CanvasSize | null = null;
let density = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
const listeners = new Set<() => void>();
let detachWindow: (() => void) | null = null;

const sameSize = (a: CanvasSize, b: CanvasSize) =>
	a.regime === b.regime && a.zoom === b.zoom && a.layoutWidth === b.layoutWidth && a.canvasX === b.canvasX && a.cap === b.cap;

function refresh() {
	const next = measure();
	const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
	const changed = !snapshot || !sameSize(snapshot, next) || dpr !== density;
	density = dpr;
	if (!snapshot || !sameSize(snapshot, next)) snapshot = next;
	if (changed) for (const l of listeners) l();
}

function attachWindow() {
	const onChange = () => refresh();
	window.addEventListener("resize", onChange);
	queries?.compact.addEventListener("change", onChange);
	queries?.phone.addEventListener("change", onChange);
	// devicePixelRatio changes (a window dragged to another screen, browser zoom) without always firing resize
	let dprQuery = hasMedia ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`) : null;
	const onDpr = () => {
		dprQuery?.removeEventListener("change", onDpr);
		dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
		dprQuery.addEventListener("change", onDpr);
		refresh();
	};
	dprQuery?.addEventListener("change", onDpr);
	return () => {
		window.removeEventListener("resize", onChange);
		queries?.compact.removeEventListener("change", onChange);
		queries?.phone.removeEventListener("change", onChange);
		dprQuery?.removeEventListener("change", onDpr);
	};
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	if (!detachWindow && typeof window !== "undefined") detachWindow = attachWindow();
	refresh();
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0 && detachWindow) {
			detachWindow();
			detachWindow = null;
		}
	};
}

function getSnapshot(): CanvasSize {
	if (!snapshot) snapshot = measure();
	return snapshot;
}

/** The window's regime and the canvas numbers, re-rendering when they change (resize, a breakpoint, a new screen). */
export function useCanvasSize(): CanvasSize {
	return useSyncExternalStore(subscribe, getSnapshot, () => DESKTOP_FALLBACK);
}

/** `"phone" | "tablet" | "desktop" | "big"` for code that has to branch on the regime (CSS should use max-lg: / max-sm:). */
export function useSizeClass(): SizeClass {
	return useSyncExternalStore(subscribe, () => getSnapshot().sizeClass, () => "desktop" as const);
}

/** Device pixels per layout pixel: the canvas zoom times the screen's devicePixelRatio. */
export function useRasterDensity(): number {
	return useSyncExternalStore(
		subscribe,
		() => getSnapshot().zoom * density,
		() => 1,
	);
}

/**
 * Writes the regime onto <html> for CSS: --stak-zoom (the canvas zoom), --stak-vw (the layout width), --stak-zoom-up
 * (the zoom when above 1, else 1: toasts and other things outside the canvas scale with it), --stak-cap and
 * --stak-canvas-x (the big regime's centred canvas), and data-stak-size="phone|tablet|laptop|desktop|big".
 * From 1024 to 2560 --stak-zoom and --stak-vw are the strings the approved code wrote.
 */
/**
 * The zoom as the CSS variable string: "0.7111" / "1.0000" up to 2560 (the strings the approved code wrote), the exact
 * zoom past it ("1.5", "1.171875"). The 404 page's big-regime zoom (__root.tsx) uses the same string.
 */
export const zoomString = (zoom: number) => (zoom > 1 ? String(zoom) : zoom.toFixed(4));

function applyZoom() {
	const root = document.documentElement;
	const width = root.clientWidth || CANVAS_WIDTH;
	const s = queries
		? canvasSize(width, window.innerHeight, { compact: queries.compact.matches, phone: queries.phone.matches })
		: canvasSize(width, window.innerHeight);
	root.style.setProperty("--stak-zoom", zoomString(s.zoom));
	root.style.setProperty("--stak-vw", `${s.layoutWidth.toFixed(2)}px`);
	root.style.setProperty("--stak-zoom-up", s.zoom > 1 ? zoomString(s.zoom) : "1");
	root.style.setProperty("--stak-canvas-x", `${s.canvasX.toFixed(2)}px`);
	if (Number.isFinite(s.cap)) root.style.setProperty("--stak-cap", `${s.cap.toFixed(2)}px`);
	else root.style.removeProperty("--stak-cap");
	root.dataset.stakSize = s.regime;
	refresh();
}

let canvases = 0;

/** Keeps the <html> variables current while a canvas is mounted (reference-counted: the last one to go clears them). */
export function useCanvasZoom() {
	useLayoutEffect(() => {
		canvases += 1;
		applyZoom();
		window.addEventListener("resize", applyZoom);
		const media = queries ? [queries.compact, queries.phone] : [];
		for (const q of media) q.addEventListener("change", applyZoom);
		const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(applyZoom);
		observer?.observe(document.documentElement);
		return () => {
			window.removeEventListener("resize", applyZoom);
			for (const q of media) q.removeEventListener("change", applyZoom);
			observer?.disconnect();
			canvases -= 1;
			if (canvases > 0) return;
			const root = document.documentElement;
			for (const name of ["--stak-zoom", "--stak-vw", "--stak-zoom-up", "--stak-canvas-x", "--stak-cap"]) root.style.removeProperty(name);
			delete root.dataset.stakSize;
		};
	}, []);
}

const InCanvas = createContext(false);
/** True inside <FitCanvas> (the app's zoomed canvas); false on pages rendered outside it (the 404 page). */
export const useInCanvas = () => useContext(InCanvas);

/**
 * The app canvas. Laptops (1024 - 1439): the 1440 canvas zoomed down (CSS zoom). 1440 - 2560: zoom 1, the canvas is
 * the window and every frame width inside the content column is the same fraction of the real column (`--stak-col`).
 * Past 2560: the whole canvas zoomed up from the 2560 x 1440 layout (dialogs, the rail and viewport heights included:
 * they are inside it), as wide as the window up to CAP, then centred (styles.css `html[data-stak-size="big"]`).
 * Below 1024: zoom 1 and the canvas is the window's width (no 1440 minimum: styles.css applies it at 1024+ only).
 */
export function FitCanvas({ children }: { children: ReactNode }) {
	useCanvasZoom();
	return (
		<div className="stak-canvas relative" style={{ zoom: "var(--stak-zoom, 1)" }}>
			<InCanvas.Provider value={true}>{children}</InCanvas.Provider>
		</div>
	);
}

/** A viewport-relative height expressed inside the (possibly zoomed) canvas: always the real window height. */
export const viewportHeight = (fraction = 1) => `calc(${fraction * 100}vh / var(--stak-zoom, 1))`;

/** Standalone pages (auth, onboarding, splash) fill the window and never shrink below the 1024 frame (every regime). */
export const fillHeight = `max(1024px, ${viewportHeight()})`;

const COL = `var(--stak-col, ${COLUMN_WIDTH}px)`;
/** 1 below 1024 (compact), 0 from 1024 up: styles.css sets it on :root from the same media query as max-lg:. */
const COMPACT = "var(--stak-compact, 0)";

/**
 * A width authored inside the 1134 column (885, 932, 640 …).
 * 1024+: the same fraction of the real column (the approved fraction rule, the identical computed value).
 * Below 1024: the column's width, capped at the Figma width (SPEC R3: 100 % of the column, max-width = Figma's width).
 */
export const col = (px: number) =>
	`calc(${COL} * ${(px / COLUMN_WIDTH).toFixed(6)} * (1 - ${COMPACT}) + min(${px}px, ${COL}) * ${COMPACT})`;

/**
 * The column plus (or minus) the few pixels some frames run past it (News and Stock detail: 1144 = 1134 + 10).
 * Below 1024: the column itself (the compact gutters leave no room to run past it).
 */
export const colPlus = (px: number) => `calc(${COL} ${px < 0 ? "-" : "+"} ${Math.abs(px)}px * (1 - ${COMPACT}))`;

/**
 * The left offset that centres a block of the given width in the column, plus an authored shift.
 * Below 1024: the offset that centres a block min(width, column) wide (0 when it is wider), the shift dropped.
 */
export const colCentre = (width: number, shift = 0) =>
	`calc(((${COL} - ${width}px) / 2${shift ? ` ${shift < 0 ? "-" : "+"} ${Math.abs(shift)}px` : ""}) * (1 - ${COMPACT}) + max(0px, (${COL} - ${width}px) / 2) * ${COMPACT})`;

/**
 * Raster density. The browser picks a srcset's x-descriptor candidate by devicePixelRatio alone, so under the big
 * regime's canvas zoom (1.5 on a 4K screen, 2 on 5K, 3 on 8K) it would draw the 1x file 1.5-3x enlarged. `densitySrc`
 * picks the smallest x candidate that covers `density` (canvas zoom x devicePixelRatio), or the largest there is.
 * x descriptors only (a missing descriptor is 1x); w-descriptor candidates are skipped (DensityImg keeps those to the
 * browser, see zoomSizes).
 */
export function densitySrc(src: string | undefined, srcSet: string | undefined, density: number): string | undefined {
	if (!srcSet) return src;
	const candidates = srcSet
		.split(",")
		.map((part) => part.trim().split(/\s+/))
		.filter((bits) => bits[0])
		.map(([url, d]) => ({ url: url as string, x: d?.endsWith("x") ? Number.parseFloat(d) : d ? Number.NaN : 1 }))
		.filter((c) => Number.isFinite(c.x))
		.sort((a, b) => a.x - b.x);
	if (candidates.length === 0) return src;
	return (candidates.find((c) => c.x >= density - 0.01) ?? candidates[candidates.length - 1])?.url ?? src;
}

/**
 * `sizes` for a w-descriptor srcset drawn inside the zoomed canvas. The browser picks a w candidate by the slot size
 * (sizes) x devicePixelRatio, reading the slot in window px, while the canvas draws the image zoom x larger than its
 * layout size: each slot value's px / em / rem lengths take the zoom; vw lengths and the media conditions already read
 * the real window and stay. No `sizes` is the browser's default slot, 100vw.
 *   zoomSizes("(width < 640px) 100vw, 320px", 1.5) === "(width < 640px) 100vw, 480px"
 *   zoomSizes("calc(100vw - 32px)", 2) === "calc(100vw - 64px)"
 */
export function zoomSizes(sizes: string | undefined, zoom: number): string {
	const list = sizes?.trim() ? sizes : "100vw";
	const entries: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < list.length; i++) {
		const c = list[i];
		if (c === "(") depth++;
		else if (c === ")") depth--;
		else if (c === "," && depth === 0) {
			entries.push(list.slice(start, i));
			start = i + 1;
		}
	}
	entries.push(list.slice(start));
	return entries
		.map((entry) => {
			const e = entry.trim();
			// the slot value ends the entry: one length token, or a math function (calc(), min(), clamp() …) with its name
			let at = e.search(/\S+$/);
			if (e.endsWith(")")) {
				let d = 0;
				for (at = e.length - 1; at > 0; at--) {
					if (e[at] === ")") d++;
					else if (e[at] === "(" && --d === 0) break;
				}
				while (at > 0 && /[a-z-]/i.test(e[at - 1] ?? "")) at--;
			}
			const value = e.slice(at).replace(/(\d*\.?\d+)(px|rem|em)\b/g, (_m, n: string, unit: string) => `${Number((Number(n) * zoom).toFixed(4))}${unit}`);
			return e.slice(0, at) + value;
		})
		.join(", ");
}

/**
 * <img> for a raster with @2x / @4x exports (Figma's own exports of the layer). From 1024 to 2560 (and below) it is
 * exactly the <img> it replaces (src + srcSet + sizes, the browser's own choice); in the big regime it draws the x
 * candidate that covers zoom x devicePixelRatio, so the image stays sharp on 4K / 5K / 8K screens. A w-descriptor
 * srcSet stays the browser's choice there too, with its `sizes` scaled by the zoom (zoomSizes).
 *   <DensityImg src="/figma/home/x.png" srcSet="/figma/home/x.png 1x, /figma/home/x@2x.png 2x, /figma/home/x@4x.png 4x" … />
 */
export function DensityImg({ src, srcSet, sizes, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
	const size = useCanvasSize();
	const raster = useRasterDensity();
	if (size.zoom <= 1) return <img alt={alt} src={src} srcSet={srcSet} sizes={sizes} {...rest} />;
	if (srcSet && /\d\s*w\s*(,|$)/.test(srcSet)) return <img alt={alt} src={src} srcSet={srcSet} sizes={zoomSizes(sizes, size.zoom)} {...rest} />;
	return <img alt={alt} src={densitySrc(src, srcSet, raster)} {...rest} />;
}

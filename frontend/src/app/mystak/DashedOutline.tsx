import { useLayoutEffect, useRef, useState } from "react";

/**
 * The dashed stroke of Figma's "Add card" (2:4967): 2.1px INSIDE, #2A3346, dash 8.4 / gap 7, radius 22.4.
 *
 * Figma does not run one dash pattern round the outline: every straight side and every corner gets a whole
 * number of periods (its length / 15.4, rounded), stretched to fit, with a dash centred on each joint (measured
 * on the 2:4830 render: the 255.2px top runs 17 periods of 15.01, the 150.2px sides 10 of 15.02, each corner 2).
 * A CSS dashed border cannot do either, so each side and corner is its own path, normalised with `pathLength`
 * so the browser lays the dashes exactly where Figma does at any tile width.
 */
const STROKE = 2.1;
const HALF = STROKE / 2;
const RADIUS = 22.4;
/** the stroke's centre line runs half a stroke inside the outline */
const R = RADIUS - HALF;
const DASH = 8.4;
const GAP = 7;
const PERIOD = DASH + GAP;
const DASH_FRACTION = DASH / PERIOD;

const periods = (length: number) => Math.max(1, Math.round(length / PERIOD));
const n = (v: number) => Math.round(v * 1000) / 1000;

function segments(w: number, h: number): { d: string; count: number }[] {
	const arc = periods((Math.PI * R) / 2);
	const top = periods(w - 2 * RADIUS);
	const side = periods(h - 2 * RADIUS);
	const L = HALF;
	const T = HALF;
	const Rt = w - HALF;
	const B = h - HALF;
	return [
		{ d: `M${n(RADIUS)} ${n(T)}L${n(w - RADIUS)} ${n(T)}`, count: top },
		{ d: `M${n(w - RADIUS)} ${n(T)}A${n(R)} ${n(R)} 0 0 1 ${n(Rt)} ${n(RADIUS)}`, count: arc },
		{ d: `M${n(Rt)} ${n(RADIUS)}L${n(Rt)} ${n(h - RADIUS)}`, count: side },
		{ d: `M${n(Rt)} ${n(h - RADIUS)}A${n(R)} ${n(R)} 0 0 1 ${n(w - RADIUS)} ${n(B)}`, count: arc },
		{ d: `M${n(w - RADIUS)} ${n(B)}L${n(RADIUS)} ${n(B)}`, count: top },
		{ d: `M${n(RADIUS)} ${n(B)}A${n(R)} ${n(R)} 0 0 1 ${n(L)} ${n(h - RADIUS)}`, count: arc },
		{ d: `M${n(L)} ${n(h - RADIUS)}L${n(L)} ${n(RADIUS)}`, count: side },
		{ d: `M${n(L)} ${n(RADIUS)}A${n(R)} ${n(R)} 0 0 1 ${n(RADIUS)} ${n(T)}`, count: arc },
	];
}

/** Draws the dashed outline over its positioned parent (the tile), sized from the parent's layout box. */
export function DashedOutline({ color = "#2A3346" }: { color?: string }) {
	const ref = useRef<SVGSVGElement>(null);
	// Figma's 300 x 195 tile until the real box is known
	const [size, setSize] = useState({ w: 300, h: 195 });
	useLayoutEffect(() => {
		const host = ref.current?.parentElement;
		if (!host) return;
		const measure = () => {
			// layout px (CSS zoom on the canvas scales the drawing with everything else)
			const w = host.offsetWidth;
			const h = host.offsetHeight;
			if (w > 0 && h > 0) setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
		};
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(measure);
		ro.observe(host);
		return () => ro.disconnect();
	}, []);
	return (
		<svg ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible" fill="none">
			{segments(size.w, size.h).map((s) => (
				<path
					key={s.d}
					d={s.d}
					pathLength={s.count}
					stroke={color}
					strokeWidth={STROKE}
					strokeDasharray={`${DASH_FRACTION} ${1 - DASH_FRACTION}`}
					strokeDashoffset={DASH_FRACTION / 2}
				/>
			))}
		</svg>
	);
}

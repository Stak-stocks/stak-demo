import { type ReactNode, useEffect, useState } from "react";

/**
 * The performance card's line (Figma 2:4803 "Chart line": a 547 x 65.453 vector, stroke #69B3CA 1.76768
 * CENTER, round caps and joins, filling the card's width). Figma exports it as a 548.768 x 67.2209 SVG: the
 * box plus half the stroke on every side, which is why the line's slot overhangs the box by 0.88384px.
 *
 * When the card stretches past 1440, Figma would move the vector's points and keep its stroke 1.76768 wide;
 * an <img> would stretch the stroke with the points, so both lines draw with `vector-effect: non-scaling-stroke`.
 */
export const VIEW_W = 548.768;
export const VIEW_H = 67.2209;
/** half the 1.76768 stroke: the export's margin around the 547 x 65.453 box */
export const PAD = 0.88384;
const STROKE = "#69B3CA";
const STROKE_WIDTH = 1.76768;

/** The 547 x 65.453 slot (2:4803) every state of the line sits in; empty when a range has no price series. */
export function ChartSlot({ children }: { children?: ReactNode }) {
	return (
		<div className="relative h-[65.453px] w-full shrink-0" aria-hidden="true">
			{children}
		</div>
	);
}

const markupCache = new Map<string, Promise<string>>();

/** Figma's exported SVG as markup, so the page can render the file itself inline (same bytes, same drawing). */
function useSvgMarkup(url: string): string | null {
	const [markup, setMarkup] = useState<string | null>(null);
	useEffect(() => {
		let alive = true;
		let p = markupCache.get(url);
		if (!p) {
			p = fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))));
			p.catch(() => markupCache.delete(url));
			markupCache.set(url, p);
		}
		p.then((text) => {
			// only a plain SVG document from our own folder is ever inlined
			if (alive && /^\s*<svg[\s>]/.test(text) && !/<script|<foreignObject|\son[a-z]+\s*=/i.test(text)) setMarkup(text);
		}).catch(() => {
			/* the <img> fallback keeps drawing the file */
		});
		return () => {
			alive = false;
		};
	}, [url]);
	return markup;
}

/** The frame's own line (the demo persona's 3M state): Figma's file, drawn inline once it has loaded. */
export function FigmaChartLine({ src }: { src: string }) {
	const markup = useSvgMarkup(src);
	return (
		<div className="absolute" style={{ inset: -PAD }}>
			{markup ? (
				<div
					className="size-full [&>svg]:block [&>svg]:size-full [&_path]:[vector-effect:non-scaling-stroke]"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Figma's exported chart file, same origin, checked above
					dangerouslySetInnerHTML={{ __html: markup }}
				/>
			) : (
				<img alt="" src={src} className="block size-full max-w-none" />
			)}
		</div>
	);
}

/** The path of a series in the export's coordinates: oldest point at the left edge, the highest close at the top. */
export function linePath(values: readonly number[]): string | null {
	if (values.length < 2) return null;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const w = VIEW_W - 2 * PAD;
	const h = VIEW_H - 2 * PAD;
	const r = (n: number) => Math.round(n * 1000) / 1000;
	return values
		.map((v, i) => {
			const x = PAD + (i / (values.length - 1)) * w;
			const y = max === min ? VIEW_H / 2 : PAD + ((max - v) / (max - min)) * h;
			return `${i === 0 ? "M" : "L"}${r(x)} ${r(y)}`;
		})
		.join("");
}

/** A range's line from its price series, drawn with the frame's stroke. */
export function DataChartLine({ values }: { values: readonly number[] }) {
	const d = linePath(values);
	if (!d) return null;
	return (
		<div className="absolute" style={{ inset: -PAD }}>
			<svg className="block size-full" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" fill="none" overflow="visible">
				<path d={d} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
			</svg>
		</div>
	);
}

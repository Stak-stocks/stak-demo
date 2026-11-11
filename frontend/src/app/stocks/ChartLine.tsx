import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The performance line as Figma draws it: "Vector" 2:3462 (and its 15 % twin 2:2145 on the loading frame), a 692 x 122
 * layer at (13, 60) of the 744-wide card, stroked 2.5 px #5da8bf, centred. Figma's export of the layer is its render
 * box, 692.635 x 124.484, which starts 0.4117 px left of and 1.3054 px above the layer (the stroke's overhang), so the
 * file is laid at (12.5883, 58.6946) and keeps the extra 0.635 px of width as the card stretches.
 */
const BOX = "absolute left-[12.5883px] top-[58.6946px] h-[124.484px] w-[calc(100%-51.365px)]";

/** Figma's exported SVG files as text, fetched once per file (the shell's FigmaFile does the same for the sidebar). */
const markupCache = new Map<string, string>();
const loads = new Map<string, Promise<string>>();

function loadMarkup(src: string): Promise<string> {
	let load = loads.get(src);
	if (!load) {
		load = fetch(src)
			.then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${src}`))))
			.then((text) => {
				// only an SVG document is drawn inline; anything else keeps the <img>
				if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text)) throw new Error(`not an svg: ${src}`);
				markupCache.set(src, text);
				return text;
			});
		loads.set(src, load);
		// a failed load is tried again on the next mount; the <img> stays meanwhile
		load.catch(() => loads.delete(src));
	}
	return load;
}

function useMarkup(src: string): string | undefined {
	const [text, setText] = useState(() => markupCache.get(src));
	useEffect(() => {
		const cached = markupCache.get(src);
		if (cached) {
			setText(cached);
			return;
		}
		let alive = true;
		loadMarkup(src).then(
			(t) => alive && setText(t),
			() => {},
		);
		return () => {
			alive = false;
		};
	}, [src]);
	return text;
}

/**
 * Figma's own file, drawn inline so the stroke keeps its 2.5 px when the card stretches (the approved rule above 1440
 * stretches the card and the line's box with it: an <img> of the file scaled the stroke sideways too, up to 3.3x at
 * 3840, while the live polyline next to it keeps a non-scaling stroke). The markup is the downloaded file, untouched:
 * its root is sized by CSS to the layer's box and its path told, from outside, to keep its stroke width. Until the
 * text has loaded (one fetch per file, then cached) the same file shows as an <img>, as it always did.
 */
export function ChartLine({ src, className }: { src: string; className?: string }) {
	const markup = useMarkup(src);
	if (markup)
		return (
			<span
				aria-hidden="true"
				className={cn(BOX, "pointer-events-none block [&>svg]:block [&>svg]:size-full [&_path]:[vector-effect:non-scaling-stroke]", className)}
				// the markup is Figma's exported file, served from /public (no user input)
				dangerouslySetInnerHTML={{ __html: markup }}
			/>
		);
	return <img alt="" src={src} className={cn(BOX, "block max-w-none", className)} />;
}

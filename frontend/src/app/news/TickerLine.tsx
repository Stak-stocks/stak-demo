import { useEffect, useState } from "react";
import type { Tone } from "@/app/live/format";

/**
 * The ticker card's line (Figma 2:4517 unsaved / 2:4626 saved): a 270.4 x 72.8 vector, stroke #2FD08A 6.24 CENTER,
 * round caps and joins, at the left of the card's 320 content column. Figma exports it as a 276.641 x 79.0415 SVG:
 * the line's box plus half the stroke (3.12077 x 3.1208) on every side.
 *
 * Above 1440 the card stretches (its rail keeps its 360 : 720 share of the column), and the line keeps its share of
 * the card, 270.4 / 320 = 84.5%, like every chart line of the app: its points spread while its stroke stays 6.24 and
 * its height stays 72.8. An <img> would widen the stroke with the points, so Figma's file is drawn inline with a
 * non-scaling stroke once it has loaded (the <img> draws it until then; at 1440 both are the frame's picture). The
 * export's side margins are a share of the line's width, so the path's own ends land on the slot's edges at any width.
 */
const LINE_W = 270.4;
const LINE_H = 72.8;
const PAD_X = 3.12077;
const PAD_Y = 3.1208;
const SIDE = `${((-PAD_X / LINE_W) * 100).toFixed(5)}%`;
/** Figma's export box of the line (the line's box plus half the stroke on every side). */
const VIEW_W = 276.641;
const VIEW_H = 79.0415;
/**
 * The frame's stroke (2:4517: 6.24, CENTER, round caps and joins) and the app's up / down pair (#2FD08A / #FF5A6A); a
 * day whose move prints zero is neither, so its line is the label grey every flat figure takes (#819ABB: N28c).
 */
const STROKE = 6.24;
export const LINE_UP = "#2FD08A";
export const LINE_DOWN = "#FF5A6A";
export const LINE_FLAT = "#819ABB";
/** The line's colour by the tone of the day's move (src/app/news/rail.ts changeTone: the change line's own tone). */
export const LINE_COLOR: Readonly<Record<Tone, string>> = { up: LINE_UP, down: LINE_DOWN, flat: LINE_FLAT };

const markupCache = new Map<string, Promise<string>>();

/** Figma's exported SVG as markup (same bytes, same drawing), so the page can draw the file itself inline. */
function useSvgMarkup(url: string): string | null {
	const [markup, setMarkup] = useState<string | null>(null);
	useEffect(() => {
		let alive = true;
		let request = markupCache.get(url);
		if (!request) {
			request = fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))));
			request.catch(() => markupCache.delete(url));
			markupCache.set(url, request);
		}
		request
			.then((text) => {
				// only a plain SVG document from our own folder is ever inlined
				if (alive && /^\s*<svg[\s>]/.test(text) && !/<script|<foreignObject|\son[a-z]+\s*=/i.test(text)) setMarkup(text);
			})
			.catch(() => {
				/* the <img> keeps drawing the file */
			});
		return () => {
			alive = false;
		};
	}, [url]);
	return markup;
}

export function TickerLine({ src }: { src: string }) {
	const markup = useSvgMarkup(src);
	return (
		<div className="relative h-[72.8px] w-[84.5%] shrink-0" aria-hidden="true">
			<div className="absolute" style={{ top: -PAD_Y, bottom: -PAD_Y, left: SIDE, right: SIDE }}>
				{markup ? (
					<div
						className="size-full [&>svg]:block [&>svg]:size-full [&_path]:[vector-effect:non-scaling-stroke]"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Figma's exported line file, same origin, checked above
						dangerouslySetInnerHTML={{ __html: markup }}
					/>
				) : (
					<img alt="" src={src} width={276.641} height={79.0415} className="block size-full max-w-none" />
				)}
			</div>
		</div>
	);
}

/**
 * The company's own line (the audit's news #4; the coordinator's D3 / D9): its closes of the day (the FOUNDATION price
 * history, src/app/live/history.ts usePriceHistory(symbol, "1D"): the STAK API's intraday closes when the quote is a
 * live one, otherwise the deterministic demo day that starts at the previous close and ends at the quote) drawn exactly
 * where and how the frame draws its line: the same 270.4 x 72.8 box at the card's left (84.5% of the content column),
 * the same 6.24 round stroke, the highest close on the box's top edge and the lowest on its bottom edge. It is green on
 * an up day and the app's red on a down day, so the chart agrees with the move as on the phones (android
 * NewsDetailScreen.kt:790-797, user 2026-08-25 "showing red then the graph is green"; iOS NewsDetailView.swift:568-573),
 * and the label grey on a day whose move prints zero (`tone` is the change line's own, rail.ts changeTone: zero is
 * neutral, N23c / N28c / N30.3c; the phones draw a flat day green, their `up = pct >= 0`).
 * Never Apple's frame line under another company's name (src/app/stocks/live.ts); the untouched showcase visitor's Apple
 * card keeps Figma's line (TickerLine). `closes` empty: nothing drawn (no quote anywhere, or the API's closes on their
 * way), the box keeps its place so the card does not move.
 */
export function PriceLine({ closes, tone }: { closes: readonly number[]; tone: Tone }) {
	const d = tickerLinePath(closes);
	return (
		<div className="relative h-[72.8px] w-[84.5%] shrink-0" aria-hidden="true" data-line={d ? tone : "none"}>
			{d && (
				<div className="absolute" style={{ top: -PAD_Y, bottom: -PAD_Y, left: SIDE, right: SIDE }}>
					<svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" overflow="visible" fill="none" className="block size-full">
						<path
							d={d}
							stroke={LINE_COLOR[tone]}
							strokeWidth={STROKE}
							strokeLinecap="round"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					</svg>
				</div>
			)}
		</div>
	);
}

/** How close (in the box's px) a dropped close may lie to the drawn line: the card shows the day's shape, not each bar. */
export const LINE_TOLERANCE = 1.2;

/**
 * The path of a series of closes in the export's box (viewBox 276.641 x 79.0415): oldest at the left edge of the line's
 * box, newest at its right edge, the highest close at the top, the lowest at the bottom (a flat day runs through the
 * middle). The series is drawn at the card's scale: smoothed over a few neighbouring bars (a quiet day of a cheap stock
 * moves a cent at a time, and one cent of a 14-cent day is 5 px of this box: a staircase), its first and last closes
 * kept exact (the previous close and the price), then simplified (Ramer-Douglas-Peucker, LINE_TOLERANCE px), so a 79-bar
 * day keeps its turns as a clean 6.24 stroke, like the frame's own seven-point line. "" for fewer than two usable closes.
 */
export function tickerLinePath(closes: readonly number[]): string {
	const raw = closes.filter((v) => Number.isFinite(v));
	if (raw.length < 2) return "";
	const c = smooth(raw);
	const lo = Math.min(...c);
	const hi = Math.max(...c);
	const span = hi - lo;
	const pts = c.map((v, i) => ({
		x: PAD_X + (i / (c.length - 1)) * LINE_W,
		y: span > 0 ? PAD_Y + ((hi - v) / span) * LINE_H : PAD_Y + LINE_H / 2,
	}));
	const kept = simplify(pts, LINE_TOLERANCE);
	return `M${kept.map((p) => `${round3(p.x)} ${round3(p.y)}`).join("L")}`;
}

/** A centred moving average over about a sixteenth of the series (2 bars each side for a 79-bar day); ends kept exact. */
function smooth(values: readonly number[]): number[] {
	const n = values.length;
	const half = Math.floor(Math.max(1, Math.round(n / 16)) / 2);
	if (half < 1) return [...values];
	return values.map((v, i) => {
		if (i === 0 || i === n - 1) return v;
		const from = Math.max(0, i - half);
		const to = Math.min(n - 1, i + half);
		let sum = 0;
		for (let j = from; j <= to; j++) sum += values[j]!;
		return sum / (to - from + 1);
	});
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

type Pt = { x: number; y: number };

/** Ramer-Douglas-Peucker: the fewest points within `tolerance` of the full line, first and last always kept. */
function simplify(points: readonly Pt[], tolerance: number): Pt[] {
	if (points.length <= 2) return [...points];
	const keep = new Array<boolean>(points.length).fill(false);
	keep[0] = true;
	keep[points.length - 1] = true;
	const stack: [number, number][] = [[0, points.length - 1]];
	while (stack.length) {
		const [a, b] = stack.pop()!;
		const pa = points[a]!;
		const pb = points[b]!;
		const dx = pb.x - pa.x;
		const dy = pb.y - pa.y;
		const len = Math.hypot(dx, dy) || 1;
		let far = -1;
		let farDist = tolerance;
		for (let i = a + 1; i < b; i++) {
			const p = points[i]!;
			const dist = Math.abs(dy * (p.x - pa.x) - dx * (p.y - pa.y)) / len;
			if (dist > farDist) {
				far = i;
				farDist = dist;
			}
		}
		if (far >= 0) {
			keep[far] = true;
			stack.push([a, far], [far, b]);
		}
	}
	return points.filter((_, i) => keep[i]);
}

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Where a chart card draws a LIVE series (coordinator ruling N20b, refining N17b; the user's report of 2026-11-09 on
 * /stocks/ENPH: "the graph line in different stocks", a line that starts high ran through the price and the day figure).
 *
 * A live series uses the frame's whole vector box (692 x 122 at 13, 60 of the 744 x 220 "Performance chart" card, 2:3461)
 * whenever it clears the card's header texts (the ticker line, the price, the day's move). When it does not, the plot's
 * TOP is lowered just enough that no point of the line comes within 8 px of those texts: the box keeps its left and right
 * edges, so a rising line (low on the left, under the header) keeps Figma's full height, and a falling one (its high on
 * the left) sits under the header. Never a fixed short band, and no halo on the figures. Figma's own line (the showcase
 * AAPL's month, 2:3462, ChartLine.tsx) is not a live series and stays exactly where the frame draws it.
 *
 * The same rule at the BOTTOM (the independent review r2b, low 3; follow-up D1, ruling N33h): the range tabs' row starts
 * on the box's bottom edge (y 182 of the card, its labels 4 px lower), so a series that ends at its low drew its last
 * stretch 2.7 px above "1M" and "1Y" (ENPH's month on the user's own page). Inside the row's reach the line keeps the
 * header's 8 px above the row: the plot's BOTTOM is raised just enough, for that series alone (a line that is high over
 * the tabs keeps the box's bottom edge), and the top rule is solved together with it (`plotBand`).
 *
 * The texts are measured where they are drawn (`useHeaderBoxes`): their width follows the company (a "$4.85" and a
 * "$1,024.50" end 70 px apart) and their share of the plot follows the card (at 390 the price spans half of it, and the
 * tab row more than half).
 */

/** A box in a chart card's layout px, from the card's top-left corner. */
export type Box = { left: number; top: number; right: number; bottom: number };

/** The plot box of a chart card in its layout px (the vector's box; `width` stretches with the card). */
export type Plot = { left: number; top: number; width: number; height: number };

/**
 * The part of the plot box a series is drawn in, in the plot's own px: `top` px down from the box's top edge, `height`
 * tall (the whole box: 0 and the box's height). `chartPoints(closes, width, band.height, band.top)` draws it.
 */
export type Band = { top: number; height: number };

/** How near the line may come to a text of its card, in layout px (N20b). */
export const HEADER_CLEAR = 8;
/**
 * The header starts in the card's inset (the texts at x 40 of the product card, 27 from the plot's left edge; the range
 * row at 20 on the EXAMPLE's): a text that near the plot's edge reaches to it. A line has no room to pass beside the
 * header in that gutter: one that starts at its high starts under the header, it does not climb up beside it.
 */
export const HEADER_GUTTER = 32;
/** The line's stroke (Figma's "Vector": 2.5, centred on the path): its ink reaches half of it past the path. */
export const LINE_STROKE = 2.5;

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * The band a series is drawn in so that it stays `clear` px away from the texts of its card: UNDER every text of `above`
 * (the header) and OVER every box of `below` (the range tabs' row), wherever it passes by them.
 *
 * A point's height above the band's bottom edge is its share of the series' span (`chartPoints`: the high on the top
 * edge, the low on the bottom one, a flat series on the middle). With the band's bottom at y = b and its height H:
 * - beside a text of `above` ending at `bottom`, the line's highest share S there (its vertices and the two points where
 *   it enters and leaves the text's reach: `clear` px to the text's left and right, and all the way to the plot's left
 *   edge for a text in the card's inset, `HEADER_GUTTER`) must stay below it: b - S * H >= bottom + clear;
 * - over a box of `below` starting at `top`, the line's lowest share s in its reach must stay above it:
 *   b - s * H <= top - clear.
 * Both are met by the tallest band there is: every limit lets H grow with b and b with H, so the greatest b (the box's
 * bottom edge, or the highest of the limits the boxes below set together with the box's top and the header) carries the
 * greatest H. With nothing below, that is the box's bottom edge and the old rule: the plot's whole height when the line
 * clears every header text, otherwise the tallest height at which it stays `clear` px under each text it passes by.
 * A text the plot never reaches asks for nothing: one ending above the plot's top or past its right edge, one whose
 * limit lies outside the box.
 */
export function plotBand(closes: readonly number[], plot: Plot, above: readonly Box[], below: readonly Box[] = [], clear: number = HEADER_CLEAR + LINE_STROKE / 2): Band {
	const n = closes.length;
	if (n < 2 || !(plot.width > 0) || !(plot.height > 0)) return { top: 0, height: plot.height };
	const lo = Math.min(...closes);
	const span = Math.max(...closes) - lo;
	const share = (i: number) => (span > 0 ? (closes[i]! - lo) / span : 0.5);
	const step = plot.width / (n - 1);
	// the line's share at x px along the plot (between two closes: on the segment that joins them)
	const at = (x: number) => {
		const k = Math.min(n - 2, Math.max(0, Math.floor(x / step)));
		return share(k) + (share(k + 1) - share(k)) * (x / step - k);
	};
	// the line's lowest and highest share from `from` to `to` px along the plot
	const extremes = (from: number, to: number): [number, number] => {
		let low = Math.min(at(from), at(to));
		let high = Math.max(at(from), at(to));
		for (let i = Math.ceil(from / step); i <= Math.floor(to / step); i++) {
			low = Math.min(low, share(i));
			high = Math.max(high, share(i));
		}
		return [low, high];
	};
	const floor = plot.top + plot.height;

	// the header: the y the line must stay under (`edge`), and its highest share beside that text
	const heads: { edge: number; share: number }[] = [];
	for (const t of above) {
		const from = t.left - plot.left <= HEADER_GUTTER ? 0 : Math.max(0, t.left - clear - plot.left);
		const to = Math.min(plot.width, t.right + clear - plot.left);
		const edge = t.bottom + clear;
		if (from > to || edge <= plot.top || edge >= floor) continue;
		const top = extremes(from, to)[1];
		if (top > 0) heads.push({ edge, share: top });
	}
	// the tabs: the y the line must stay over, and its lowest share over that box
	const feet: { edge: number; share: number }[] = [];
	for (const t of below) {
		const from = Math.max(0, t.left - clear - plot.left);
		const to = Math.min(plot.width, t.right + clear - plot.left);
		const edge = t.top - clear;
		if (from > to || edge >= floor || edge <= plot.top) continue;
		const bottom = extremes(from, to)[0];
		if (bottom < 1) feet.push({ edge, share: bottom });
	}

	// the tallest band whose bottom edge is at y = b: the box's top, and every header text it passes by
	const tallest = (b: number) => heads.reduce((h, t) => Math.min(h, (b - t.edge) / t.share), b - plot.top);
	// the lowest bottom edge the boxes below allow: b <= edge + share * tallest(b), solved against the box's top and
	// against each header text (a text the line passes lower than it passes the tabs sets no limit: raising the band
	// frees both)
	let b = floor;
	for (const f of feet) {
		let limit = (f.edge - f.share * plot.top) / (1 - f.share);
		for (const t of heads) if (t.share > f.share && f.edge > t.edge) limit = Math.min(limit, (f.edge * t.share - f.share * t.edge) / (t.share - f.share));
		b = Math.min(b, limit);
	}
	const height = Math.max(0, tallest(b));
	return { top: round2(b - plot.top - height), height: round2(height) };
}

/**
 * The height the series is drawn at, measured up from the plot's bottom edge, on a card with nothing under its plot (the
 * EXAMPLE's chart, whose range row is its header): `plotBand` with no boxes below, whose band sits on the box's bottom
 * edge.
 */
export function plotHeight(closes: readonly number[], plot: Plot, texts: readonly Box[], clear: number = HEADER_CLEAR + LINE_STROKE / 2): number {
	return plotBand(closes, plot, texts, [], clear).height;
}

/** A card's width, the boxes of its header texts and the boxes under its plot, in the card's own layout px. */
export type Measured = { width: number; boxes: Box[]; under: Box[] };

const sameBox = (x: Box, y: Box) => Math.abs(x.left - y.left) < 0.25 && Math.abs(x.top - y.top) < 0.25 && Math.abs(x.right - y.right) < 0.25 && Math.abs(x.bottom - y.bottom) < 0.25;
const sameList = (a: readonly Box[], b: readonly Box[]) => a.length === b.length && a.every((x, i) => sameBox(x, b[i]!));
const sameBoxes = (a: Measured | null, b: Measured) => !!a && Math.abs(a.width - b.width) < 0.25 && sameList(a.boxes, b.boxes) && sameList(a.under, b.under);

/** What the hook is watching: the card it measured last, the elements found in it then, and their observer. */
type Watch = { card: Element | null; key: string; parts: Element[]; observer: ResizeObserver | null };

/**
 * The card's width and the boxes of its header texts (`selector`, inside the card) and of what stands under its plot
 * (`under`: the range tabs' row), in the card's own layout px: measured before the first paint and again whenever the
 * card or one of those elements changes size (another company's price, the fonts arriving, the window). The canvas zoom
 * scales the card and its texts alike, so the card's known layout height (`layoutHeight`, the frames' 220) gives the
 * scale. null until measured (and where nothing is laid out: the unit tests' DOM), which draws the whole box.
 *
 * The card and its texts are looked for after EVERY commit of the component that owns the card, and measured again when
 * they are not the elements measured last (the independent review r2b, low 7: the measure ran once, on mount, and read
 * the ref then; a card that first rendered without a price drew no header and attached no ref, so when its price arrived
 * the header was never measured and a falling line ran through it again: the user's own report, waiting for an account
 * with the STAK API up). So it does not matter which branch attaches the ref, nor when the texts appear.
 */
export function useHeaderBoxes<T extends HTMLElement>(selector: string, layoutHeight: number, under?: string): [RefObject<T | null>, Measured | null] {
	const card = useRef<T | null>(null);
	const [measured, setMeasured] = useState<Measured | null>(null);
	const watch = useRef<Watch>({ card: null, key: "", parts: [], observer: null });
	// no dependency list: after every commit, and cheap when nothing changed (one query, no layout read)
	useLayoutEffect(() => {
		const el = card.current;
		const w = watch.current;
		const key = `${selector}\n${under ?? ""}\n${layoutHeight}`;
		const parts = el ? [...el.querySelectorAll(under ? `${selector}, ${under}` : selector)] : [];
		if (el === w.card && key === w.key && parts.length === w.parts.length && parts.every((p, i) => p === w.parts[i])) return;
		w.observer?.disconnect();
		watch.current = { card: el, key, parts, observer: null };
		if (!el) {
			setMeasured(null);
			return;
		}
		const boxesOf = (c: DOMRect, k: number, query: string) => {
			const boxes: Box[] = [];
			for (const e of el.querySelectorAll(query)) {
				const r = e.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) boxes.push({ left: (r.left - c.left) * k, top: (r.top - c.top) * k, right: (r.right - c.left) * k, bottom: (r.bottom - c.top) * k });
			}
			return boxes;
		};
		const measure = () => {
			const c = el.getBoundingClientRect();
			if (!(c.height > 0)) return;
			const k = layoutHeight / c.height;
			const next: Measured = { width: c.width * k, boxes: boxesOf(c, k, selector), under: under ? boxesOf(c, k, under) : [] };
			setMeasured((prev) => (sameBoxes(prev, next) ? prev : next));
		};
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		for (const p of parts) observer.observe(p);
		watch.current.observer = observer;
	});
	useEffect(
		() => () => {
			watch.current.observer?.disconnect();
			watch.current = { card: null, key: "", parts: [], observer: null };
		},
		[],
	);
	return [card, measured];
}

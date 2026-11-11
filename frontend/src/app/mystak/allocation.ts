/**
 * The Breakdown card's live allocation (mystak audit items 3, 4 and 7): one row per collection the person holds a save
 * in, its share of the saves, its bar and its arc of the ring. The untouched showcase keeps the frame's own rows, bars
 * and donut (2:4686 / 2:4693 …, SHOWCASE in ./data.ts); everything here is for every other state.
 *
 * Rows (android ui/StakInsights.kt:93-101 `buckets`, MyStakScreen.kt:486-491; iOS StakInsights.swift:101,
 * MyStakView.swift:380-385): every non-empty collection gets its own row, the biggest first (a tie keeps the overview's
 * collection order), "Other" (saves no collection catalogues) always last; each row is coloured from COLLECTION_COLORS.
 * Bars (MyStakScreen.kt:490 `fill = 314 × share`, MyStakView.swift:384): a row's bar is its share of the whole track,
 * exactly as Figma's own bars are (132 / 66 / 63 / 38 / 16 of 314 = 42 / 21 / 20 / 12 / 5 %).
 * Ring (android ui/components/DonutRing.kt:13-41, iOS Components/DonutRing.swift): one arc per row, sized by its share,
 * in the row's colour, clockwise from the top, a small gap between arcs, drawn in the frame's 150 box. The arcs take the
 * desktop donut's own shape (2:4686 "Segments": a 74.56 outer and 37.28 inner radius, corners rounded by 6): a thick
 * ring of rounded segments rather than the phones' 28 stroke.
 */
import { ALLOCATION_NAMES, COLLECTION_ORDER, type CollectionSlug } from "@/app/live/catalog";
import { COLLECTION_COLORS } from "@/app/live/collections";

export type AllocationLineRow = {
	key: string;
	slug: CollectionSlug;
	name: string;
	count: number;
	/** the row's share of all saves, in whole percent (the label) */
	share: number;
	/** the same share as a fraction of the 314 track (the bar) and of the ring (the arc) */
	fill: number;
	color: string;
};

/**
 * The printed shares of the rows, in whole percent, adding up to exactly 100 (the hunt's NUM-06, coordinator ruling N23p:
 * rounded each on its own, the persona's nineteen saves printed 26 + 21 + 16 + 16 + 11 + 11 = 101, and three saves in
 * three collections 33 + 33 + 33 = 99). The largest-remainder rule: every row takes its share rounded down, and the
 * points still missing from 100 go, one each, to the rows that lost the most by it (a tie goes to the row drawn first:
 * the bigger one, then the overview's order). So two rows of one size can print shares one point apart (11% beside 10%
 * for two stocks each of nineteen): the price of a column that adds up. A row that holds a save never prints 0% (a
 * single save among hundreds): it takes 1, from the largest row when there is no point left to give.
 * Only the LABEL is rounded: the bars and the ring keep the exact shares (`fill`).
 */
export function wholeShares(counts: readonly number[]): number[] {
	const total = counts.reduce((n, c) => n + c, 0);
	if (total <= 0) return counts.map(() => 0);
	const exact = counts.map((c) => (c / total) * 100);
	const shares = exact.map((e, i) => (counts[i]! > 0 ? Math.max(1, Math.floor(e)) : 0));
	let left = 100 - shares.reduce((n, s) => n + s, 0);
	// what each row lost by its rounding, largest first; a stable sort keeps the rows' own order on a tie
	const byLoss = exact.map((e, i) => ({ i, loss: e - shares[i]! })).sort((a, b) => b.loss - a.loss);
	for (let k = 0; left > 0; k = (k + 1) % byLoss.length, left--) shares[byLoss[k]!.i]! += 1;
	// more 1% floors than points (a few single saves beside one huge row): the largest rows give them back
	while (left < 0) {
		const big = shares.indexOf(Math.max(...shares));
		shares[big]! -= 1;
		left++;
	}
	return shares;
}

/** The live rows for the saves grouped by collection (an empty list when nothing is saved). */
export function allocationFor(groups: Readonly<Record<CollectionSlug, readonly string[]>>): AllocationLineRow[] {
	const count = (s: CollectionSlug) => groups[s]?.length ?? 0;
	const total = COLLECTION_ORDER.reduce((n, s) => n + count(s), 0) + count("other");
	if (total === 0) return [];
	const held = COLLECTION_ORDER.filter((s) => count(s) > 0).sort((a, b) => count(b) - count(a) || COLLECTION_ORDER.indexOf(a) - COLLECTION_ORDER.indexOf(b));
	const slugs: CollectionSlug[] = count("other") > 0 ? [...held, "other"] : held;
	const shares = wholeShares(slugs.map(count));
	return slugs.map((slug, i) => ({
		key: slug,
		slug,
		name: ALLOCATION_NAMES[slug],
		count: count(slug),
		share: shares[i]!,
		fill: count(slug) / total,
		color: COLLECTION_COLORS[slug],
	}));
}

/** The frame's donut box and ring (2:4685 "Donut", 150 x 150; 2:4686's segments). */
export const RING = { size: 150, outer: 74.56, inner: 37.28, corner: 6, gap: 2 } as const;

export type RingSegment = { key: string; color: string; d: string };

type Pt = { x: number; y: number };
const n3 = (v: number) => Math.round(v * 1000) / 1000;
const pt = (p: Pt) => `${n3(p.x)} ${n3(p.y)}`;
const TAU = Math.PI * 2;

/** The angle of a point around the ring's centre, unwrapped to start at or after `from` (radians, clockwise on screen). */
function angleFrom(p: Pt, from: number): number {
	let a = Math.atan2(p.y, p.x);
	while (a < from - 1e-9) a += TAU;
	while (a >= from + TAU - 1e-9) a -= TAU;
	return a;
}

/**
 * One rounded segment of the ring from angle a0 to a1 (radians, 0 = 3 o'clock, clockwise on screen), centred on the
 * origin: its two straight edges run parallel to the radii at a0 and a1, `half` inside them (so neighbours keep a gap
 * of constant width), and its four corners are rounded by `corner`. Null when the segment is too thin for that corner
 * (the caller retries with a smaller one).
 */
function roundedSector(a0: number, a1: number, R: number, r: number, corner: number, half: number): string | null {
	const u0 = { x: Math.cos(a0), y: Math.sin(a0) };
	const n0 = { x: -Math.sin(a0), y: Math.cos(a0) }; // toward a1
	const u1 = { x: Math.cos(a1), y: Math.sin(a1) };
	const n1 = { x: Math.sin(a1), y: -Math.cos(a1) }; // toward a0
	const c = corner;
	const off = half + c;
	const along = (rho: number) => (rho * rho - off * off >= 0 ? Math.sqrt(rho * rho - off * off) : Number.NaN);
	const tOut = along(R - c);
	const tIn = along(r + c);
	if (!Number.isFinite(tOut) || !Number.isFinite(tIn) || tIn > tOut) return null;
	// a corner circle's centre, the foot of it on the straight edge, and its touch point on the arc
	const edge = (u: Pt, n: Pt, t: number) => ({ x: t * u.x + half * n.x, y: t * u.y + half * n.y });
	const centre = (u: Pt, n: Pt, t: number) => ({ x: t * u.x + off * n.x, y: t * u.y + off * n.y });
	const onArc = (p: Pt, rho: number, from: number) => {
		const k = rho / from;
		return { x: p.x * k, y: p.y * k };
	};
	const s0 = { line: edge(u0, n0, tOut), arc: onArc(centre(u0, n0, tOut), R, R - c) };
	const e0 = { line: edge(u1, n1, tOut), arc: onArc(centre(u1, n1, tOut), R, R - c) };
	const s1 = { line: edge(u0, n0, tIn), arc: c > 0 ? onArc(centre(u0, n0, tIn), r, r + c) : edge(u0, n0, tIn) };
	const e1 = { line: edge(u1, n1, tIn), arc: c > 0 ? onArc(centre(u1, n1, tIn), r, r + c) : edge(u1, n1, tIn) };
	// the arcs must keep a positive length between their corners (angles unwrapped from the segment's start: every point
	// of the segment lies between a0 and a1 < a0 + 2π)
	const base = a0 - 1e-6;
	const outerSpan = angleFrom(e0.arc, base) - angleFrom(s0.arc, base);
	const innerSpan = angleFrom(e1.arc, base) - angleFrom(s1.arc, base);
	if (!(outerSpan > 1e-6) || !(innerSpan > 1e-6)) return null;
	const large = (span: number) => (span > Math.PI ? 1 : 0);
	const k = n3(c);
	const parts = [`M${pt(s0.line)}`];
	if (c > 0) parts.push(`A${k} ${k} 0 0 1 ${pt(s0.arc)}`);
	parts.push(`A${n3(R)} ${n3(R)} 0 ${large(outerSpan)} 1 ${pt(e0.arc)}`);
	if (c > 0) parts.push(`A${k} ${k} 0 0 1 ${pt(e0.line)}`);
	parts.push(`L${pt(e1.line)}`);
	if (c > 0) parts.push(`A${k} ${k} 0 0 1 ${pt(e1.arc)}`);
	parts.push(`A${n3(r)} ${n3(r)} 0 ${large(innerSpan)} 0 ${pt(s1.arc)}`);
	if (c > 0) parts.push(`A${k} ${k} 0 0 1 ${pt(s1.line)}`);
	parts.push("Z");
	return parts.join("");
}

/** A whole ring (one row holds every save): two circles, filled even-odd. */
function fullRing(R: number, r: number): string {
	const circle = (rho: number, sweep: 0 | 1) => `M${n3(-rho)} 0A${n3(rho)} ${n3(rho)} 0 1 ${sweep} ${n3(rho)} 0A${n3(rho)} ${n3(rho)} 0 1 ${sweep} ${n3(-rho)} 0Z`;
	return circle(R, 1) + circle(r, 0);
}

/**
 * The ring's segments for the rows (each `fill` a share of the whole), in path coordinates centred on (0, 0): draw them
 * inside an SVG whose viewBox is centred, e.g. "-75 -75 150 150". The first row starts at 12 o'clock and the rows follow
 * clockwise. A row whose arc is too thin for the frame's corner takes the largest corner that fits, then none, then no
 * gap (it never disappears: the phones draw at least 2 degrees, DonutRing.kt:32).
 */
export function ringSegments(rows: readonly Pick<AllocationLineRow, "key" | "color" | "fill">[], ring: { outer: number; inner: number; corner: number; gap: number } = RING): RingSegment[] {
	const live = rows.filter((r) => r.fill > 0);
	if (live.length === 0) return [];
	if (live.length === 1) return [{ key: live[0]!.key, color: live[0]!.color, d: fullRing(ring.outer, ring.inner) }];
	const total = live.reduce((s, r) => s + r.fill, 0);
	const MIN = (2 * Math.PI) / 180;
	let at = -Math.PI / 2;
	return live.map((row) => {
		const sweep = Math.max(MIN, (row.fill / total) * TAU);
		const a0 = at;
		const a1 = at + sweep;
		at += (row.fill / total) * TAU;
		let d: string | null = null;
		for (let c = ring.corner; c >= 0 && !d; c = c > 0.5 ? c / 2 : c > 0 ? 0 : -1) d = roundedSector(a0, a1, ring.outer, ring.inner, c, ring.gap / 2);
		d ??= roundedSector(a0, a1, ring.outer, ring.inner, 0, 0)!;
		return { key: row.key, color: row.color, d };
	});
}

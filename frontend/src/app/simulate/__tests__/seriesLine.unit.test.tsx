/**
 * The pick page's computed line is drawn inside its card (coordinator ruling N44a, 2026-11-10; FOUNDATION round 7's
 * review, medium). The chart box is Figma's "Chart line" vector, 769.346 over the 708 chart frame (w-[108.665%]); Figma's
 * own line keeps that overhang (the untouched showcase), but a COMPUTED series drawn there lost its two ends: from 1024
 * up the card clips 12.7 px a side at 1440, so the line ran from about the second close to yesterday's, and a story
 * company's pin day drew MU's 1Y falling under "+$0.24 (0.2% up)". A series is now drawn at the content box's width.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SERIES_INSET, SeriesLine } from "../PickDetail";

afterEach(() => cleanup());

/** The fraction of the chart box's width the inset stands for: calc(50% - 50% / overhang). */
function insetShare(): { overhang: number; share: number } {
	const m = /^calc\(50% - 50% \/ ([0-9.]+)\)$/.exec(SERIES_INSET);
	if (!m) throw new Error(`unexpected inset ${SERIES_INSET}`);
	const overhang = Number(m[1]);
	return { overhang, share: 0.5 - 0.5 / overhang };
}

describe("the pick page's computed line is drawn inside its card (N44a)", () => {
	it("insets the series to the content box: the box's overhang (108.665%) taken back on each side", () => {
		const { overhang, share } = insetShare();
		expect(overhang).toBe(1.08665); // the box's own w-[108.665%]
		// at 1440 the content box is 708 wide, the box 769.35, overhanging 30.67 a side (the card's padding is 18, so 12.7 of
		// it was clipped): the series spans exactly the 708 from the content box's left edge, at every width
		for (const content of [708, 1006, 322, 288, 1412]) {
			const box = content * overhang;
			expect(box * share).toBeCloseTo((box - content) / 2, 9);
			expect(box - 2 * box * share).toBeCloseTo(content, 9);
		}
	});

	it("draws the closes in the vector's stroke, the first close on the left edge and today's price on the right one", () => {
		const { container } = render(<SeriesLine closes={[100, 99, 101, 104]} />);
		const wrap = container.querySelector<HTMLElement>("[data-chart-series]")!;
		expect(wrap).not.toBeNull();
		// absolutely placed over the box's full height (the same heights), the content box's width
		expect(wrap.className.split(" ")).toEqual(expect.arrayContaining(["absolute", "inset-y-0"]));
		// the inset on both sides (jsdom folds the calc() to its percentage: 50 - 50 / 1.08665 = 3.98702 % of the box)
		const { share } = insetShare();
		for (const side of [wrap.style.left, wrap.style.right]) {
			const pct = /^calc\(([0-9.]+)%\)$/.exec(side);
			expect(pct, side).not.toBeNull();
			expect(Number(pct![1])).toBeCloseTo(100 * share, 5);
		}
		const svg = container.querySelector("svg")!;
		expect(svg.getAttribute("viewBox")).toBe("0 0 769.346 165");
		expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
		expect(svg.getAttribute("aria-hidden")).toBe("true");
		const path = svg.querySelector("path")!;
		// the closes evenly across the svg (which now spans the content box): the first at x 0, the last at the right edge;
		// the lowest close on the bottom edge, the highest on the top (Figma's "Chart line" rule)
		expect(path.getAttribute("d")).toBe("M0.00 132.00L256.45 165.00L512.90 99.00L769.35 0.00");
		// the stroke the series has always had
		expect([path.getAttribute("stroke"), path.getAttribute("stroke-width"), path.getAttribute("fill"), path.getAttribute("vector-effect")]).toEqual(["#69b3ca", "2", "none", "non-scaling-stroke"]);
		expect([path.getAttribute("stroke-linecap"), path.getAttribute("stroke-linejoin")]).toEqual(["round", "round"]);
	});
});

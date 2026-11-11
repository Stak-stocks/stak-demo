import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { changeTone } from "../rail";
import { PriceLine } from "../TickerLine";

afterEach(cleanup);

/** The line as the article's ticker card draws it for a day's move of `pct` percent. */
function drawn(pct: number, closes: readonly number[] = [10, 10.02, 9.99, 10]) {
	const { container } = render(<PriceLine closes={closes} tone={changeTone(pct)} />);
	const box = container.firstElementChild as HTMLElement;
	const path = container.querySelector("path");
	return { tone: box.dataset.line, stroke: path?.getAttribute("stroke") ?? null, width: path?.getAttribute("stroke-width") ?? null, hidden: box.getAttribute("aria-hidden") };
}

describe("the ticker card's line takes the tone of the move printed above it (zero is neutral: N23c, N28c, N30.3c)", () => {
	it("green on an up day, the app's red on a down day", () => {
		expect(drawn(1.2)).toMatchObject({ tone: "up", stroke: "#2FD08A" });
		expect(drawn(-0.4)).toMatchObject({ tone: "down", stroke: "#FF5A6A" });
	});

	it("the label grey when the move prints zero: exactly flat, or a rounding's worth either way (it was green, never neutral)", () => {
		expect(drawn(0)).toMatchObject({ tone: "flat", stroke: "#819ABB" });
		expect(drawn(-0.004)).toMatchObject({ tone: "flat", stroke: "#819ABB" });
		expect(drawn(0.004)).toMatchObject({ tone: "flat", stroke: "#819ABB" });
		// the smallest move the card prints is a move again
		expect(drawn(-0.006)).toMatchObject({ tone: "down", stroke: "#FF5A6A" });
		expect(drawn(0.006)).toMatchObject({ tone: "up", stroke: "#2FD08A" });
	});

	it("keeps the frame's stroke and stays decoration whatever the tone; no closes, no line (the box keeps its place)", () => {
		for (const pct of [1.2, 0, -0.4]) expect(drawn(pct)).toMatchObject({ width: "6.24", hidden: "true" });
		expect(drawn(0, [])).toMatchObject({ tone: "none", stroke: null });
		expect(drawn(-0.4, [5])).toMatchObject({ tone: "none", stroke: null });
	});
});

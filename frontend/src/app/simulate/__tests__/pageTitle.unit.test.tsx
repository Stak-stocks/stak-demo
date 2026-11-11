import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardTitle, PageTitle } from "../ui";

/**
 * The Portfolio's and the Leaderboard's title is the page's heading (review r2: both pages had none, while Simulate
 * home, My STAK and News title their pages with an h1). Its pixels are the paragraph's it replaced, which G1 checks on
 * the running page; here: what assistive tech is given.
 */
describe("a Simulate page's title (ui.tsx PageTitle)", () => {
	afterEach(cleanup);

	it("is the page's one heading, an h1 named by the title", () => {
		render(<PageTitle title="Your portfolio" subtitle="12 picks · +$240.00 all time" />);
		const headings = screen.getAllByRole("heading");
		expect(headings).toHaveLength(1);
		expect(headings[0]!.tagName).toBe("H1");
		expect(screen.getByRole("heading", { level: 1, name: "Your portfolio" })).toBe(headings[0]);
	});

	it("leaves the line under it a paragraph, outside the heading", () => {
		render(<PageTitle title="Leaderboard" subtitle="Ranked by return · Trailing 7 days" />);
		const line = screen.getByText("Ranked by return · Trailing 7 days");
		expect(line.tagName).toBe("P");
		expect(screen.getByRole("heading", { level: 1 }).contains(line)).toBe(false);
	});

	it("sits above the cards' titles, which are h2", () => {
		render(
			<>
				<PageTitle title="Leaderboard" subtitle="Ranked by return · Trailing 7 days" />
				<CardTitle>Rankings</CardTitle>
			</>,
		);
		expect(screen.getAllByRole("heading").map((h) => `${h.tagName} ${h.textContent}`)).toEqual(["H1 Leaderboard", "H2 Rankings"]);
	});
});

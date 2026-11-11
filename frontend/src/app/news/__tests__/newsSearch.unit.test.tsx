import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// the brief's Read link is a router Link: an anchor to the article it opens (and the history state it gives that
// article's entry, as data-state) is all these tests need
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		params,
		state,
		children,
		viewTransition: _vt,
		...rest
	}: { to: string; params?: { id: string }; state?: object; children: ReactNode; viewTransition?: boolean }) => (
		<a href={params ? to.replace("$id", params.id) : to} data-state={state ? JSON.stringify(state) : undefined} {...rest}>
			{children}
		</a>
	),
}));

import { BRIEF_INTERVAL_MS } from "../briefRotation";
import { BriefCard } from "../BriefCard";
import { newsListing } from "../data";
import { HOT_CANDIDATES, rankHot } from "../hot";
import { ANNOUNCE_DELAY_MS, NEWS_SEARCH_FIELD_ID, NewsSearchButton, NewsSearchField, NewsSearchStatus, REANNOUNCE_GAP_MS } from "../NewsSearch";
import { resultMessage, searchListing } from "../search";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

// the showcase listing: the Mini card's hot stories on the stories' own figures (hot.ts)
const listing = { briefs: newsListing.briefs, mini: rankHot(HOT_CANDIDATES), forYou: newsListing.forYou.cards, markets: newsListing.markets.cards };
const dots = () => screen.getAllByRole("button", { name: /^Brief \d of \d$/ });
const readHref = () => screen.getByRole("link").getAttribute("href");
const strip = () => dots()[0]!.parentElement!;

describe("the Today's brief carousel carries the search's hits", () => {
	it("with all three briefs it is the frame's strip: Figma's 30 px dots export, three dots", () => {
		render(<BriefCard briefs={newsListing.briefs} />);
		expect(dots().map((d) => d.getAttribute("aria-label"))).toEqual(["Brief 1 of 3", "Brief 2 of 3", "Brief 3 of 3"]);
		expect(strip().getAttribute("style")).toBeNull();
		const img = strip().querySelector("img")!;
		expect(img.className).toBe("h-[6px] w-[30px]");
		expect(img.getAttribute("style")).toBeNull();
	});

	it("two hits: two dots, the export cut to its first two (18 px), the first brief on show opening its own article", () => {
		const { briefs } = searchListing(listing, "reuters");
		render(<BriefCard briefs={briefs} />);
		expect(dots().map((d) => d.getAttribute("aria-label"))).toEqual(["Brief 1 of 2", "Brief 2 of 2"]);
		expect(strip().style.width).toBe("18px");
		const img = strip().querySelector("img")!;
		expect(img.style.width).toBe("18px");
		expect(img.className).toContain("object-none");
		expect(img.className).toContain("object-left");
		expect(readHref()).toBe("/news/fed-minutes");
		expect(dots()[0]!.getAttribute("aria-current")).toBe("true");
		// the article entry it pushes says the listing came before it (the article's Back steps back to the search)
		expect(screen.getByRole("link").getAttribute("data-state")).toBe(JSON.stringify({ newsFromListing: true }));
	});

	it("the rotation runs among the hits: after 25 s the second hit shows and opens its own article, then back to the first", () => {
		const { briefs } = searchListing(listing, "reuters");
		render(<BriefCard briefs={briefs} />);
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS));
		expect(readHref()).toBe("/news/june-jobs-miss");
		expect(dots()[1]!.getAttribute("aria-current")).toBe("true");
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS));
		expect(readHref()).toBe("/news/fed-minutes");
	});

	it("one hit: one dot (6 px) and it never moves", () => {
		const { briefs } = searchListing(listing, "minutes");
		render(<BriefCard briefs={briefs} />);
		expect(dots().map((d) => d.getAttribute("aria-label"))).toEqual(["Brief 1 of 1"]);
		expect(strip().style.width).toBe("6px");
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS * 4));
		expect(readHref()).toBe("/news/fed-minutes");
		expect(screen.getByText("Fed minutes land Wednesday")).toBeInTheDocument();
	});
});

describe("a pointer resting on the brief card as it mounts (a query's new hits remount it under a still pointer)", () => {
	/** the pointer is on the card while `on()` says so: `:hover` matches the carousel, as the browser reports it */
	const pointerOnCard = (on: () => boolean) => {
		const matches = Element.prototype.matches;
		vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
			if (selector === ":hover") return on() && this.getAttribute("aria-roledescription") === "carousel";
			return matches.call(this, selector);
		});
	};
	/** a screen whose pointers can hover (a mouse, a trackpad) or not (a finger only) */
	const canHover = (hover: boolean) =>
		vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(any-hover: hover)" ? hover : false, media: query }) as MediaQueryList);
	const card = () => screen.getByRole("group", { name: "Today’s brief" });
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("holds the rotation while it rests there, and the 25 s start once it moves off", () => {
		let on = true;
		pointerOnCard(() => on);
		canHover(true);
		render(<BriefCard briefs={searchListing(listing, "reuters").briefs} />);
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS * 3));
		expect(readHref()).toBe("/news/fed-minutes");
		expect(dots()[0]!.getAttribute("aria-current")).toBe("true");
		on = false;
		fireEvent.pointerLeave(card());
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS - 1));
		expect(readHref()).toBe("/news/fed-minutes");
		act(() => vi.advanceTimersByTime(1));
		expect(readHref()).toBe("/news/june-jobs-miss");
	});

	it("also when the browser moves :hover to the new card only at its first frame (Chrome)", () => {
		let on = false;
		pointerOnCard(() => on);
		canHover(true);
		render(<BriefCard briefs={searchListing(listing, "reuters").briefs} />);
		on = true;
		act(() => vi.advanceTimersToNextFrame());
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS * 2));
		expect(readHref()).toBe("/news/fed-minutes");
	});

	it("a pointer elsewhere leaves the rotation running", () => {
		pointerOnCard(() => false);
		canHover(true);
		render(<BriefCard briefs={searchListing(listing, "reuters").briefs} />);
		act(() => vi.advanceTimersToNextFrame());
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS));
		expect(readHref()).toBe("/news/june-jobs-miss");
	});

	it("a finger's tap leaves :hover behind on a touch screen without resting there: the rotation runs", () => {
		pointerOnCard(() => true);
		canHover(false);
		render(<BriefCard briefs={searchListing(listing, "reuters").briefs} />);
		act(() => vi.advanceTimersToNextFrame());
		act(() => vi.advanceTimersByTime(BRIEF_INTERVAL_MS));
		expect(readHref()).toBe("/news/june-jobs-miss");
	});
});

describe("the Search button", () => {
	it("keeps the frame's look and names the field it opens", () => {
		const onToggle = vi.fn();
		const { rerender } = render(<NewsSearchButton open={false} onToggle={onToggle} />);
		const button = screen.getByRole("button", { name: "Search" });
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("aria-expanded", "false");
		expect(button).toHaveAttribute("aria-controls", NEWS_SEARCH_FIELD_ID);
		expect(button.className).toBe(
			"mr-[3px] flex size-[40px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#181f30] max-lg:mr-0",
		);
		fireEvent.click(button);
		expect(onToggle).toHaveBeenCalledTimes(1);
		rerender(<NewsSearchButton open onToggle={onToggle} />);
		expect(button).toHaveAttribute("aria-expanded", "true");
	});
});

describe("the search field", () => {
	it("is a plain search field named 'Search news': no autocomplete, autocorrect, capitalisation or spellcheck", () => {
		render(<NewsSearchField value="" onChange={() => {}} onEscape={() => {}} />);
		const field = screen.getByRole("searchbox", { name: "Search news" });
		expect(field).toHaveAttribute("id", NEWS_SEARCH_FIELD_ID);
		expect(field).toHaveAttribute("type", "search");
		expect(field).toHaveAttribute("placeholder", "Search news");
		expect(field).toHaveAttribute("autocomplete", "off");
		expect(field).toHaveAttribute("autocorrect", "off");
		expect(field).toHaveAttribute("autocapitalize", "none");
		expect(field).toHaveAttribute("spellcheck", "false");
	});

	it("hands each change on, and Escape closes it (not while an IME composition is open)", () => {
		const onChange = vi.fn();
		const onEscape = vi.fn();
		render(<NewsSearchField value="" onChange={onChange} onEscape={onEscape} />);
		const field = screen.getByRole("searchbox", { name: "Search news" });
		fireEvent.change(field, { target: { value: "tesla" } });
		expect(onChange).toHaveBeenLastCalledWith("tesla");
		fireEvent.keyDown(field, { key: "Escape", isComposing: true });
		expect(onEscape).not.toHaveBeenCalled();
		fireEvent.keyDown(field, { key: "Enter" });
		expect(onEscape).not.toHaveBeenCalled();
		fireEvent.keyDown(field, { key: "Escape" });
		expect(onEscape).toHaveBeenCalledTimes(1);
	});
});

describe("the screen reader's count", () => {
	/** the status for the trimmed query `q`, as the listing renders it */
	const status = (q: string) => <NewsSearchStatus query={q} message={q ? resultMessage(searchListing(listing, q).count) : ""} />;
	/**
	 * Every text the region takes, in order (a live region speaks when its text changes). React renders a timer's update
	 * when its act() ends, so each step advances to one timer and reads the region's records right after it.
	 */
	const watch = (region: HTMLElement) => {
		const said: string[] = [];
		const observer = new MutationObserver(() => {});
		observer.observe(region, { childList: true, characterData: true, subtree: true });
		const step = (ms: number) => {
			act(() => vi.advanceTimersByTime(ms));
			if (observer.takeRecords().length > 0) said.push(region.textContent ?? "");
		};
		const take = () => {
			if (observer.takeRecords().length > 0) said.push(region.textContent ?? "");
		};
		return { said, step, take };
	};

	it("is a polite live region that reads the count once the typing rests, and says nothing for an empty query", () => {
		const { rerender } = render(status(""));
		const region = screen.getByRole("status");
		expect(region).toHaveAttribute("aria-live", "polite");
		expect(region).toHaveAttribute("aria-atomic", "true");
		expect(region.className).toBe("sr-only");
		expect(region).toHaveTextContent("");
		rerender(status("reuters"));
		act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS - 1));
		expect(region).toHaveTextContent("");
		rerender(status("tesla"));
		act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS - 1));
		expect(region).toHaveTextContent("");
		act(() => vi.advanceTimersByTime(1));
		expect(region).toHaveTextContent("1 story");
		rerender(status(""));
		expect(region).toHaveTextContent("");
	});

	it("counts each story once: 'reuters' is four stories (June jobs, a brief and a card, and Nvidia, in the Mini card and a card, show twice each)", () => {
		const { rerender } = render(status(""));
		rerender(status("reuters"));
		act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
		expect(screen.getByRole("status")).toHaveTextContent("4 stories");
	});

	it("a new query with the same count is read out again: the region empties, then holds the count once more", () => {
		const { rerender } = render(status(""));
		const region = screen.getByRole("status");
		const { said, step } = watch(region);
		rerender(status("tesla"));
		step(ANNOUNCE_DELAY_MS);
		expect(said).toEqual(["1 story"]);
		// "micron" replaces "tesla": one story too (Micron's, in the Mini card and in Markets)
		rerender(status("micron"));
		step(ANNOUNCE_DELAY_MS);
		expect(region).toHaveTextContent("");
		step(REANNOUNCE_GAP_MS);
		expect(region).toHaveTextContent("1 story");
		expect(said).toEqual(["1 story", "", "1 story"]);
		// two queries in a row that match nothing: both answered
		rerender(status("exxonx"));
		step(ANNOUNCE_DELAY_MS);
		rerender(status("realtyx"));
		step(ANNOUNCE_DELAY_MS);
		step(REANNOUNCE_GAP_MS);
		expect(said).toEqual(["1 story", "", "1 story", "No stories match", "", "No stories match"]);
	});

	it("a query the typing only passed through, or came back to, is not read out again", () => {
		const { rerender } = render(status(""));
		const region = screen.getByRole("status");
		const { said, step, take } = watch(region);
		rerender(status("tesla"));
		step(ANNOUNCE_DELAY_MS);
		// "teslax", then back to "tesla" before the typing rests
		rerender(status("teslax"));
		step(ANNOUNCE_DELAY_MS - 100);
		rerender(status("tesla"));
		take();
		for (let i = 0; i < 4; i++) step(ANNOUNCE_DELAY_MS);
		expect(said).toEqual(["1 story"]);
		expect(region).toHaveTextContent("1 story");
	});

	it("typing on while the region is empty for a repeat: the next query it rests on is still answered", () => {
		const { rerender } = render(status(""));
		const region = screen.getByRole("status");
		const { said, step, take } = watch(region);
		rerender(status("tesla"));
		step(ANNOUNCE_DELAY_MS);
		rerender(status("micron"));
		step(ANNOUNCE_DELAY_MS);
		expect(region).toHaveTextContent("");
		// a keystroke inside the gap, then back to "micron" before the typing rests
		rerender(status("micronx"));
		rerender(status("micron"));
		take();
		step(ANNOUNCE_DELAY_MS);
		step(REANNOUNCE_GAP_MS);
		expect(region).toHaveTextContent("1 story");
		expect(said).toEqual(["1 story", "", "1 story"]);
	});

	it("a search the page opens with holds its count from the start (nothing to announce)", () => {
		render(status("chips"));
		const region = screen.getByRole("status");
		const { said, step } = watch(region);
		expect(region).toHaveTextContent("2 stories");
		for (let i = 0; i < 4; i++) step(ANNOUNCE_DELAY_MS);
		expect(region).toHaveTextContent("2 stories");
		expect(said).toEqual([]);
	});
});

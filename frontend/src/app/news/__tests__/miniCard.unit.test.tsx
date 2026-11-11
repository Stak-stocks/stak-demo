import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// the Mini card is a router Link: an anchor to the article it opens (and the history state it gives that article's
// entry, as data-state) is all these tests need; React 19 hands the card's ref to the anchor as a prop
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

import { FROM_LISTING } from "../backToListing";
import { FADE } from "../briefRotation";
import { newsListing } from "../data";
import { HOT_CANDIDATES, HOT_INTERVAL_MS, rankHot } from "../hot";
import { MiniCard } from "../MiniCard";
import { searchListing } from "../search";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

/** the signed-out visitor's hot stories (the stories' own figures): Tesla, Micron, Apple, Nvidia */
const HOT = rankHot(HOT_CANDIDATES);
const card = () => screen.getByRole("link");
const href = () => card().getAttribute("href");
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
/** the stories' stacked layers, in the card's order */
const layers = () => [...card().firstElementChild!.children] as HTMLElement[];
/** the four texts of the story on show: kicker, title, line, source */
const onShow = () => {
	const layer = layers().find((l) => !l.hasAttribute("aria-hidden"))!;
	return [...layer.querySelectorAll("p")].map((p) => p.textContent);
};

describe("the Mini card shows the hottest stories (N62)", () => {
	it("opens on the hottest: the frame's four texts for Tesla, the card's one link opening its article from the listing", () => {
		render(<MiniCard stories={HOT} />);
		expect(onShow()).toEqual(["AUTOS", "Tesla drops 7% even after beating deliveries", "Tesla delivered more cars than Wall Street...", "CNBC · 2d"]);
		expect(href()).toBe("/news/tesla-deliveries");
		expect(card().getAttribute("data-state")).toBe(JSON.stringify(FROM_LISTING));
		expect(screen.getAllByRole("link")).toHaveLength(1);
		// its name is the story it opens: the stories off show are hidden from assistive technology
		expect(card()).toHaveAccessibleName("AUTOS Tesla drops 7% even after beating deliveries Tesla delivered more cars than Wall Street... CNBC · 2d");
	});

	it("shows the next story every 30 seconds, the last wrapping to the first; the link always opens the story on show", () => {
		render(<MiniCard stories={HOT} />);
		advance(HOT_INTERVAL_MS - 1);
		expect(href()).toBe("/news/tesla-deliveries");
		advance(1);
		expect(href()).toBe("/news/memory-chips-soar");
		expect(onShow()).toEqual(["TECH & AI", "Memory chips soar as the AI trade rotates", "Investors spent the first half selling...", "Bloomberg · 2d"]);
		advance(30_000);
		expect(href()).toBe("/news/apple-foldable");
		expect(onShow()).toEqual(["TECH & AI", "Apple climbs 5% on foldable iPhone push", "A bigger foldable order and the widest...", "Bloomberg · 2d"]);
		advance(30_000);
		expect(href()).toBe("/news/nvidia-chip-rally");
		expect(onShow()).toEqual(["TECH & AI", "Nvidia lags the chip rally it kicked off", "The company that started the AI chip boom...", "Reuters · 2d"]);
		advance(30_000);
		expect(href()).toBe("/news/tesla-deliveries");
		expect(card()).toHaveAccessibleName(/^AUTOS Tesla drops 7%/);
	});

	it("keeps the frame's box and type: the same classes as the frame's card and texts", () => {
		render(<MiniCard stories={HOT} />);
		expect(card().className).toBe(
			"flex h-[129px] w-full cursor-pointer flex-col items-start overflow-clip rounded-[12px] bg-[#181f30] px-[18px] pb-[14px] pt-[16px] max-lg:h-auto max-lg:min-h-[129px]",
		);
		const [kicker, title, line, source] = [...layers()[0]!.querySelectorAll("p")];
		expect(kicker!.className).toBe("whitespace-nowrap font-geist text-[9px] font-medium leading-[12px] tracking-[0.72px] text-[#5bd7e4]");
		expect(title!.className).toBe("w-full font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]");
		expect(line!.className).toBe("w-full font-geist text-[12px] leading-[16px] text-[#819abb]");
		expect(source!.className).toBe("whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]");
	});

	it("changes with the brief's 300 ms cross-fade (instant under reduced motion); the stories share one cell; nothing is announced", () => {
		const { container } = render(<MiniCard stories={HOT} />);
		const stack = card().firstElementChild as HTMLElement;
		expect(stack.className).toBe("grid w-full");
		for (const [i, layer] of layers().entries()) {
			for (const c of FADE.split(" ")) expect(layer.className.split(" ")).toContain(c);
			expect(layer.className).toContain("col-start-1 row-start-1");
			// off show: invisible once faded, and out of the accessibility tree at once
			expect(layer.className.includes("invisible opacity-0")).toBe(i !== 0);
			expect(layer.getAttribute("aria-hidden")).toBe(i === 0 ? null : "true");
		}
		expect(FADE).toContain("duration-300");
		expect(FADE).toContain("motion-reduce:transition-none");
		advance(30_000);
		expect(layers().map((l) => l.getAttribute("aria-hidden"))).toEqual(["true", null, "true", "true"]);
		expect(layers().map((l) => l.className.includes("invisible"))).toEqual([true, false, true, true]);
		// never a live region
		expect(container.querySelector("[aria-live], [role=status], [role=alert], [role=log], [role=marquee], [role=timer]")).toBeNull();
	});

	it("holds while the pointer rests on it, a full 30 s again once it leaves", () => {
		render(<MiniCard stories={HOT} />);
		advance(20_000);
		fireEvent.pointerEnter(card());
		advance(120_000);
		expect(href()).toBe("/news/tesla-deliveries");
		fireEvent.pointerLeave(card());
		advance(29_999);
		expect(href()).toBe("/news/tesla-deliveries");
		advance(1);
		expect(href()).toBe("/news/memory-chips-soar");
	});

	it("holds while it has keyboard focus, until the focus leaves it", () => {
		render(<MiniCard stories={HOT} />);
		const link = card();
		// a keyboard focus (its ring shows); every other selector as the engine reads it
		const matches = link.matches.bind(link);
		link.matches = ((sel: string) => sel === ":focus-visible" || matches(sel)) as typeof link.matches;
		act(() => link.focus());
		advance(120_000);
		expect(href()).toBe("/news/tesla-deliveries");
		act(() => link.blur());
		advance(30_000);
		expect(href()).toBe("/news/memory-chips-soar");
	});

	it("holds for a pointer already resting on it as it mounts (a search's new hits under a still pointer)", () => {
		// the engine says the pointer is over the card (an anchor) as it mounts; every other selector as it reads it
		const matches = Element.prototype.matches;
		vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, sel: string) {
			return sel === ":hover" ? this.tagName === "A" : matches.call(this, sel);
		});
		render(<MiniCard stories={HOT} />);
		advance(120_000);
		expect(href()).toBe("/news/tesla-deliveries");
		fireEvent.pointerLeave(card());
		advance(30_000);
		expect(href()).toBe("/news/memory-chips-soar");
	});

	it("leaves no clock behind when it goes (an article opens)", () => {
		const { unmount } = render(<MiniCard stories={HOT} />);
		advance(30_000);
		expect(vi.getTimerCount()).toBeGreaterThan(0);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("the Mini card carries the search's hits", () => {
	const listing = { briefs: newsListing.briefs, mini: HOT, forYou: newsListing.forYou.cards, markets: newsListing.markets.cards };

	it("a query that matches one of its stories shows that story and holds it there", () => {
		render(<MiniCard stories={searchListing(listing, "micron").mini} />);
		expect(href()).toBe("/news/memory-chips-soar");
		expect(layers()).toHaveLength(1);
		advance(300_000);
		expect(href()).toBe("/news/memory-chips-soar");
		expect(onShow()[1]).toBe("Memory chips soar as the AI trade rotates");
	});

	it("several matches: the hottest first, then the next every 30 s among them only", () => {
		render(<MiniCard stories={searchListing(listing, "chip").mini} />);
		expect(href()).toBe("/news/memory-chips-soar");
		advance(30_000);
		expect(href()).toBe("/news/nvidia-chip-rally");
		advance(30_000);
		expect(href()).toBe("/news/memory-chips-soar");
	});
});

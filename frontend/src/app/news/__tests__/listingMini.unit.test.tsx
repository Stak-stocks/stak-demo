/**
 * The News listing's Mini card as the route draws it (src/routes/_app.news.tsx): the route hands the card the hot stories
 * that match the search and keys it, so a search that changes which stories match starts it again at the hottest match,
 * as the brief's carousel starts at its first hit. A live quote is no search: one that changes which stories are the
 * hottest four (a signed-in account while the STAK API serves prices) must not rebuild the card, or the story on show
 * would swap at once, without the cross-fade, under a hovering pointer or a keyboard focus that holds it (WCAG 2.2.2),
 * and the focus would drop to the page. The new ranking waits for the card's next turn (hot.ts useHotRotation).
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	search: {} as { q?: string },
	navigate: vi.fn(),
	/** what useQuotes hands the page, by symbol (a live quote: an account while the STAK API serves prices) */
	quotes: {} as Record<string, { ticker: string; price: number; change: number; changePercent: number; live: boolean }>,
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: object) => ({ ...options, useSearch: () => mocks.search, useNavigate: () => mocks.navigate }),
	useLocation: ({ select }: { select: (location: object) => unknown }) => select({ pathname: "/news", state: { __TSR_key: "listing-entry" } }),
	// a story link is an anchor to the article it opens; React 19 hands the card's ref to the anchor as a prop
	Link: ({ to, params, state: _state, children, viewTransition: _vt, ...rest }: { to: string; params?: { id: string }; state?: object; children: ReactNode; viewTransition?: boolean }) => (
		<a href={params ? to.replace("$id", params.id) : to} {...rest}>
			{children}
		</a>
	),
}));
vi.mock("@/app/live/quotes", () => ({ useQuotes: () => mocks.quotes }));
vi.mock("@/app/live/store", () => ({ useLive: () => ({ savedTickers: new Set<string>() }) }));
vi.mock("@/app/live/showcase", () => ({ useShowcase: () => false }));
vi.mock("@/app/FitCanvas", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/app/FitCanvas")>()), useSizeClass: () => "desktop" }));
vi.mock("@/app/news/preload", () => ({ usePreloadNext: () => {} }));
vi.mock("@/app/news/briefRead", () => ({ useBriefRead: () => {} }));
// the For You and Markets cards are not under test here: light stand-ins
vi.mock("@/app/news/NewsCard", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/app/news/NewsCard")>()), NewsColumn: () => null }));

import { HOT_CANDIDATES, HOT_INTERVAL_MS } from "../hot";
import { Route } from "@/routes/_app.news";

const NewsPage = (Route as unknown as { component: ComponentType }).component;

beforeEach(() => {
	vi.useFakeTimers();
	mocks.search = {};
	mocks.quotes = {};
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

const HOT_IDS: ReadonlySet<string> = new Set(HOT_CANDIDATES.map((s) => s.id));
/** the Mini card: the listing's one link to a hot story (the brief's Read link opens a brief's story) */
const mini = () => {
	const cards = screen.queryAllByRole("link").filter((a) => HOT_IDS.has(a.getAttribute("href")?.replace("/news/", "") ?? ""));
	expect(cards).toHaveLength(1);
	return cards[0]!;
};
/** the story on show: the one the card opens (its link always follows the story on show) */
const onShow = () => mini().getAttribute("href")!.replace("/news/", "");
/** one turn at most per call: the card sets its next clock as it renders the turn, after the act */
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
/** live quotes arrive for these symbols (today's move in percent) */
const liveQuotes = (moves: Record<string, number>) => {
	mocks.quotes = Object.fromEntries(Object.entries(moves).map(([ticker, changePercent]) => [ticker, { ticker, price: 100, change: 0, changePercent, live: true }]));
};
/** a keyboard focus on the card (its ring shows: :focus-visible); every other selector as the engine reads it */
const keyboardFocus = (el: HTMLElement) => {
	const matches = el.matches.bind(el);
	el.matches = ((sel: string) => sel === ":focus-visible" || matches(sel)) as typeof el.matches;
	act(() => el.focus());
};

describe("the listing's Mini card and a live quote that changes which stories are the hottest four", () => {
	// on the stories' own figures the four are Tesla, Micron, Apple, Nvidia (hot.ts); Exxon moving 9.1% live puts Oil
	// first and drops Nvidia out of the four: Oil, Tesla, Micron, Apple
	const OIL_LEADS = { XOM: -9.1 };

	it("moves nothing on show: the same card keeps its story and its 30 s, and the next turn follows the new order", () => {
		const { rerender } = render(<NewsPage />);
		expect(onShow()).toBe("tesla-deliveries");
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("memory-chips-soar");
		const card = mini();
		advance(10_000);
		liveQuotes(OIL_LEADS);
		rerender(<NewsPage />);
		expect(mini()).toBe(card);
		expect(onShow()).toBe("memory-chips-soar");
		advance(19_999);
		expect(onShow()).toBe("memory-chips-soar");
		// the story after Micron in the new order, then on round it
		advance(1);
		expect(onShow()).toBe("apple-foldable");
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("oil-slips-iran");
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("tesla-deliveries");
		expect(mini()).toBe(card);
	});

	it("nor while keyboard focus holds the card: it keeps the focus and its story until the focus leaves", () => {
		const { rerender } = render(<NewsPage />);
		advance(HOT_INTERVAL_MS);
		const card = mini();
		keyboardFocus(card);
		expect(document.activeElement).toBe(card);
		liveQuotes(OIL_LEADS);
		rerender(<NewsPage />);
		expect(mini()).toBe(card);
		expect(document.activeElement).toBe(card);
		expect(onShow()).toBe("memory-chips-soar");
		advance(HOT_INTERVAL_MS * 3);
		expect(onShow()).toBe("memory-chips-soar");
		act(() => card.blur());
		advance(HOT_INTERVAL_MS - 1);
		expect(onShow()).toBe("memory-chips-soar");
		advance(1);
		expect(onShow()).toBe("apple-foldable");
	});

	it("nor while the pointer rests on the card: it holds its story until the pointer leaves", () => {
		const { rerender } = render(<NewsPage />);
		advance(HOT_INTERVAL_MS);
		const card = mini();
		fireEvent.pointerEnter(card);
		liveQuotes(OIL_LEADS);
		rerender(<NewsPage />);
		expect(mini()).toBe(card);
		expect(onShow()).toBe("memory-chips-soar");
		advance(HOT_INTERVAL_MS * 4);
		expect(onShow()).toBe("memory-chips-soar");
		fireEvent.pointerLeave(card);
		advance(HOT_INTERVAL_MS - 1);
		expect(onShow()).toBe("memory-chips-soar");
		advance(1);
		expect(onShow()).toBe("apple-foldable");
	});
});

describe("the listing's Mini card and the search", () => {
	const field = () => screen.getByRole("searchbox", { name: "Search news" });

	it("a search that changes which stories match starts it again at the hottest match; a live quote under it waits for the turn", () => {
		// the search open, nothing typed: the whole rotation
		mocks.search = { q: "" };
		const { rerender } = render(<NewsPage />);
		advance(HOT_INTERVAL_MS);
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("apple-foldable");
		// 'chip': Micron (-5.84% today) and Nvidia (-1.42%), the hottest first
		fireEvent.change(field(), { target: { value: "chip" } });
		expect(onShow()).toBe("memory-chips-soar");
		const card = mini();
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("nvidia-chip-rally");
		// Nvidia moving 6.5% live now leads the two: the card keeps Nvidia on show until its turn
		liveQuotes({ NVDA: 6.5 });
		rerender(<NewsPage />);
		expect(mini()).toBe(card);
		expect(onShow()).toBe("nvidia-chip-rally");
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("memory-chips-soar");
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("nvidia-chip-rally");
		// 'chips': Micron alone, at once, and it holds still
		fireEvent.change(field(), { target: { value: "chips" } });
		expect(onShow()).toBe("memory-chips-soar");
		advance(HOT_INTERVAL_MS * 4);
		expect(onShow()).toBe("memory-chips-soar");
		// the search emptied: the whole rotation again, from the hottest (Nvidia's live move puts it second)
		fireEvent.change(field(), { target: { value: "" } });
		expect(onShow()).toBe("tesla-deliveries");
		advance(HOT_INTERVAL_MS);
		expect(onShow()).toBe("nvidia-chip-rally");
	});
});

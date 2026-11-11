import { act, renderHook } from "@testing-library/react";
import type { FocusEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ARTICLES, articleById, HOME_ARTICLES, STORIES } from "../articles";
import { newsListing } from "../data";
import { ageMinutes, HOT_CANDIDATES, HOT_COUNT, HOT_INTERVAL_MS, heatOf, type MiniStory, movePct, nextHotPage, rankHot, useHotRotation } from "../hot";

const ids = (list: readonly { id: string }[]) => list.map((s) => s.id);
const story = (id: string, move: number, age = "2d", symbol = id.toUpperCase()): MiniStory => ({
	id,
	kicker: "MARKETS",
	title: id,
	body: "...",
	source: "Reuters · 2d",
	symbol,
	move,
	age,
});
const BRIEF_IDS = newsListing.briefs.map((b) => b.id);

describe("the Mini card's candidates: the listing's stories outside the Today's brief (N62)", () => {
	it("are the listing's five stories the brief does not carry, in the listing's order", () => {
		expect(ids(HOT_CANDIDATES)).toEqual(["nvidia-chip-rally", "apple-foldable", "tesla-deliveries", "memory-chips-soar", "oil-slips-iran"]);
		for (const id of BRIEF_IDS) expect(ids(HOT_CANDIDATES), id).not.toContain(id);
		// every other listing story is one
		expect(ids(HOT_CANDIDATES)).toEqual(ids(STORIES).filter((id) => !BRIEF_IDS.includes(id)));
	});

	it("leave Home's two Market Mood stories out: they stay out of the listing (D12)", () => {
		for (const a of HOME_ARTICLES) expect(ids(HOT_CANDIDATES), a.id).not.toContain(a.id);
	});

	it("each is drawn from its own story: the category as the kicker, the listing's title and source line, the article's company and move", () => {
		for (const s of HOT_CANDIDATES) {
			const a = articleById(s.id)!;
			const listed = STORIES.find((x) => x.id === s.id)!;
			expect(s.kicker, s.id).toBe(a.category.toUpperCase());
			expect(s.title, s.id).toBe(listed.title);
			expect(s.source, s.id).toBe(listed.source);
			expect(s.source, s.id).toBe(`${a.publisher} · ${a.age}`);
			expect(s.symbol, s.id).toBe(a.ticker.symbol);
			expect(s.age, s.id).toBe(a.age);
			expect(s.move, s.id).toBe(movePct(a.ticker.change));
		}
		const tesla = HOT_CANDIDATES.find((s) => s.id === "tesla-deliveries")!;
		expect(tesla).toEqual({
			id: "tesla-deliveries",
			kicker: "AUTOS",
			title: "Tesla drops 7% even after beating deliveries",
			body: "Tesla delivered more cars than Wall Street...",
			source: "CNBC · 2d",
			symbol: "TSLA",
			move: -7.04,
			age: "2d",
		});
	});

	it("each one line is its article's dek, its opening words cut at a word as the frame cuts the Fed minutes', ending '...'", () => {
		// the frame's own line (2:4397) is the opening of the Fed minutes dek
		const frame = newsListing.mini.body;
		expect(articleById(newsListing.mini.id)!.dek.startsWith(frame.slice(0, -3))).toBe(true);
		for (const s of HOT_CANDIDATES) {
			const dek = articleById(s.id)!.dek;
			expect(s.body, s.id).toBe(newsListing.miniLines[s.id]);
			expect(s.body.endsWith("..."), s.id).toBe(true);
			const words = s.body.slice(0, -3);
			// the story's own words, never another fact: the start of its dek, cut before a space
			expect(dek.startsWith(words), s.id).toBe(true);
			expect(dek[words.length], s.id).toBe(" ");
			// the frame's voice and length: one line on the card (the frame's is 39 characters, 211 px; the longest here,
			// 48, measures 258 px of the card's 324 at 1440 and stays one line down to a 360 px phone)
			expect(s.body.length, s.id).toBeGreaterThanOrEqual(36);
			expect(s.body.length, s.id).toBeLessThanOrEqual(48);
		}
		// a line for every candidate and for nothing else
		expect(Object.keys(newsListing.miniLines).sort()).toEqual(ids(HOT_CANDIDATES).sort());
	});
});

describe("the hottest stories: ranked by how hard their company moves today", () => {
	it("on the stories' own figures (every signed-out visitor, the showcase included) it is Tesla, Micron, Apple, Nvidia", () => {
		expect(HOT_COUNT).toBeGreaterThanOrEqual(4);
		const hot = rankHot(HOT_CANDIDATES);
		expect(ids(hot)).toEqual(["tesla-deliveries", "memory-chips-soar", "apple-foldable", "nvidia-chip-rally"]);
		expect(hot[0]!.title).toBe("Tesla drops 7% even after beating deliveries");
		// the calmest (Exxon, -0.71% today) sits out
		expect(ids(hot)).not.toContain("oil-slips-iran");
		// the moves its rails print: -7.04, -5.84, +4.84, -1.42
		expect(hot.map((s) => s.move)).toEqual([-7.04, -5.84, 4.84, -1.42]);
	});

	it("a fall counts as much as a rise: the order is the size of the move", () => {
		const list = [story("a", 1.5), story("b", -3.25), story("c", 2), story("d", -0.5), story("e", 0)];
		expect(ids(rankHot(list, {}, 5))).toEqual(["b", "c", "a", "d", "e"]);
	});

	it("takes the hottest `count` (four by default), hottest first", () => {
		const list = [story("a", 1), story("b", 2), story("c", 3), story("d", 4), story("e", 5), story("f", 6)];
		expect(ids(rankHot(list))).toEqual(["f", "e", "d", "c"]);
		expect(ids(rankHot(list, {}, 2))).toEqual(["f", "e"]);
		expect(rankHot(list, {}, 0)).toEqual([]);
		expect(ids(rankHot(list, {}, 99))).toEqual(["f", "e", "d", "c", "b", "a"]);
	});

	it("a tie (at the two decimals the rail prints) goes to the younger story, then to the listing's order", () => {
		const list = [story("old", -2.5, "3d"), story("young", 2.5, "2h"), story("mid", 2.5, "2d"), story("young-too", -2.5, "120m")];
		// 2h and 120m are the same age: the listing's order decides between them
		expect(ids(rankHot(list, {}, 4))).toEqual(["young", "young-too", "mid", "old"]);
		// 4.844 and -4.836 both print 4.84: a tie, so the younger first
		expect(ids(rankHot([story("x", 4.844, "2d"), story("y", -4.836, "10h")], {}, 2))).toEqual(["y", "x"]);
		// an age that reads as nothing counts as the oldest
		expect(ids(rankHot([story("odd", 1, "soon"), story("dated", 1, "3d")], {}, 2))).toEqual(["dated", "odd"]);
		// all equal: the listing's order
		expect(ids(rankHot([story("p", 1), story("q", -1), story("r", 1)], {}, 3))).toEqual(["p", "q", "r"]);
	});

	it("a live quote (an account while the STAK API serves prices) replaces the story's own figure", () => {
		// Exxon moving 9.1% live takes the lead; Tesla's quiet live day drops it out of the four
		const hot = rankHot(HOT_CANDIDATES, { XOM: { changePercent: -9.1, live: true }, TSLA: { changePercent: 0.12, live: true } });
		expect(ids(hot)).toEqual(["oil-slips-iran", "memory-chips-soar", "apple-foldable", "nvidia-chip-rally"]);
		// a live quote changes the order among the four too
		expect(ids(rankHot(HOT_CANDIDATES, { NVDA: { changePercent: 6.5, live: true } }))).toEqual(["tesla-deliveries", "nvidia-chip-rally", "memory-chips-soar", "apple-foldable"]);
	});

	it("a demo quote (a signed-out visitor's prices, the API down) is not the company moving today: the story's figure stands", () => {
		const demo = { TSLA: { changePercent: 3.4, live: false }, MU: { changePercent: 4.2, live: false }, XOM: { changePercent: 0.7, live: false } };
		expect(ids(rankHot(HOT_CANDIDATES, demo))).toEqual(ids(rankHot(HOT_CANDIDATES)));
		// a live quote without a usable move leaves the story's own figure too
		expect(heatOf(story("t", -7.04), { changePercent: Number.NaN, live: true })).toBe(7.04);
		expect(heatOf(story("t", -7.04), { changePercent: 1.234, live: true })).toBe(1.23);
		expect(heatOf(story("t", -7.04), null)).toBe(7.04);
		// a story whose own figure reads as nothing is the calmest
		expect(heatOf(story("t", Number.NaN))).toBe(0);
	});

	it("reads the rails' change line and the listing's ages", () => {
		expect(movePct("-7.04% today")).toBe(-7.04);
		expect(movePct("+4.84% today")).toBe(4.84);
		expect(movePct("0.00% today")).toBe(0);
		expect(movePct("−1.5% today")).toBe(-1.5);
		expect(movePct("12%")).toBe(12);
		expect(movePct("today")).toBeNaN();
		expect(ageMinutes("40m")).toBe(40);
		expect(ageMinutes("2h")).toBe(120);
		expect(ageMinutes("10h")).toBe(600);
		expect(ageMinutes("2d")).toBe(2880);
		expect(ageMinutes(" 3d ")).toBe(4320);
		expect(ageMinutes("1w")).toBe(10_080);
		expect(ageMinutes("yesterday")).toBe(Number.POSITIVE_INFINITY);
		// every listing story's age reads
		for (const a of ARTICLES) expect(Number.isFinite(ageMinutes(a.age)), a.id).toBe(true);
	});
});

describe("the Mini card's clock (useHotRotation)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
	const HOT = rankHot(HOT_CANDIDATES);
	const onShow = (r: { current: { stories: readonly MiniStory[]; index: number } }) => r.current.stories[r.current.index]!.id;
	const focusEvent = (target: Element, currentTarget: Element, relatedTarget: Element | null = null) =>
		({ target, currentTarget, relatedTarget }) as unknown as FocusEvent<HTMLElement>;

	it("opens on the hottest and shows the next every 30 seconds, the last wrapping to the first", () => {
		expect(HOT_INTERVAL_MS).toBe(30_000);
		const { result } = renderHook(() => useHotRotation(HOT));
		expect(onShow(result)).toBe("tesla-deliveries");
		advance(29_999);
		expect(onShow(result)).toBe("tesla-deliveries");
		advance(1);
		expect(onShow(result)).toBe("memory-chips-soar");
		advance(30_000);
		expect(onShow(result)).toBe("apple-foldable");
		advance(30_000);
		expect(onShow(result)).toBe("nvidia-chip-rally");
		advance(30_000);
		expect(onShow(result)).toBe("tesla-deliveries");
	});

	it("holds while the pointer rests on the card and gives the story a full interval once it leaves", () => {
		const { result } = renderHook(() => useHotRotation(HOT));
		advance(25_000);
		act(() => result.current.bind.onPointerEnter());
		expect(result.current.paused).toBe(true);
		advance(120_000);
		expect(onShow(result)).toBe("tesla-deliveries");
		act(() => result.current.bind.onPointerLeave());
		expect(result.current.paused).toBe(false);
		advance(29_999);
		expect(onShow(result)).toBe("tesla-deliveries");
		advance(1);
		expect(onShow(result)).toBe("memory-chips-soar");
	});

	it("holds while the card has keyboard focus (it is a link), until the focus leaves it; a mouse click's focus does not hold", () => {
		const card = document.createElement("a");
		const outside = document.createElement("button");
		document.body.append(card, outside);
		card.matches = ((sel: string) => sel === ":focus-visible") as unknown as typeof card.matches; // a keyboard focus (its ring shows)
		const { result } = renderHook(() => useHotRotation(HOT));
		act(() => result.current.bind.onFocus(focusEvent(card, card)));
		expect(result.current.paused).toBe(true);
		advance(90_000);
		expect(onShow(result)).toBe("tesla-deliveries");
		act(() => result.current.bind.onBlur(focusEvent(card, card, outside)));
		expect(result.current.paused).toBe(false);
		advance(30_000);
		expect(onShow(result)).toBe("memory-chips-soar");
		// a click's focus shows no ring: the pointer alone decides
		card.matches = (() => false) as unknown as typeof card.matches;
		act(() => result.current.bind.onFocus(focusEvent(card, card)));
		expect(result.current.paused).toBe(false);
		card.remove();
		outside.remove();
	});

	it("one story (a search's only hit) never moves", () => {
		const { result } = renderHook(() => useHotRotation(HOT.slice(0, 1)));
		advance(300_000);
		expect(onShow(result)).toBe("tesla-deliveries");
		expect(vi.getTimerCount()).toBe(0);
	});

	it("a new ranking moves nothing on show; the next turn follows it", () => {
		const { result, rerender } = renderHook(({ list }) => useHotRotation(list), { initialProps: { list: HOT } });
		advance(10_000);
		// a live quote moved Nvidia to the top: Tesla stays on show, and its full 30 s run on
		const reranked = [HOT[3]!, HOT[0]!, HOT[1]!, HOT[2]!];
		rerender({ list: reranked });
		expect(onShow(result)).toBe("tesla-deliveries");
		advance(19_999);
		expect(onShow(result)).toBe("tesla-deliveries");
		// the turn takes the story after Tesla in the new order
		advance(1);
		expect(onShow(result)).toBe("memory-chips-soar");
		expect(ids(result.current.stories)).toEqual(ids(reranked));
		advance(30_000);
		expect(onShow(result)).toBe("apple-foldable");
		advance(30_000);
		expect(onShow(result)).toBe("nvidia-chip-rally");
	});

	it("a story that leaves the hottest stays until the turn, which opens the new ranking at its hottest", () => {
		const { result, rerender } = renderHook(({ list }) => useHotRotation(list), { initialProps: { list: HOT } });
		advance(30_000);
		expect(onShow(result)).toBe("memory-chips-soar");
		// Micron calms down live, Exxon takes its place
		const oil = HOT_CANDIDATES.find((s) => s.id === "oil-slips-iran")!;
		rerender({ list: [oil, HOT[0]!, HOT[2]!, HOT[3]!] });
		expect(onShow(result)).toBe("memory-chips-soar");
		advance(30_000);
		expect(onShow(result)).toBe("oil-slips-iran");
		expect(nextHotPage({ list: HOT, at: 1 }, [])).toEqual({ list: HOT, at: 1 });
	});

	it("leaves no clock behind when the card goes (an article opens, a search drops it)", () => {
		const { result, unmount } = renderHook(() => useHotRotation(HOT));
		advance(30_000);
		expect(onShow(result)).toBe("memory-chips-soar");
		expect(vi.getTimerCount()).toBe(1);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});

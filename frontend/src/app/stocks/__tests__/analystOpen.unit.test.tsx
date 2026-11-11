import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/** The router's location as the hook reads it (useRouterState's select), changed by each test step. */
const router = vi.hoisted(() => ({ location: { pathname: "/stocks/SPY", state: { __TSR_key: "k1", __TSR_index: 1 } as Record<string, unknown> } }));
vi.mock("@tanstack/react-router", () => ({
	useRouterState: ({ select }: { select: (s: typeof router) => unknown }) => select(router),
}));

import { loadCatalog } from "@/app/live/catalog";
import {
	ANALYST_OPEN_RECORD,
	COMPARE_OPEN_RECORD,
	type EntryOpen,
	entryKey,
	forgetOnFreshVisit,
	MAX_ENTRIES,
	nextEntryOpen,
	recallAnalystOpen,
	recallCompareOpen,
	rememberAnalystOpen,
	rememberCompareOpen,
	useAnalystOpen,
	useCompareOpen,
} from "../analystOpen";

beforeAll(() => loadCatalog());

const at = (pathname: string, key: string) => {
	router.location = { pathname, state: { __TSR_key: key, __TSR_index: 1 } };
};

beforeEach(() => {
	sessionStorage.clear();
	at("/stocks/SPY", "k1");
});
afterEach(() => cleanup());

describe("the Analyst view's open state, kept per history entry (every-stock interface review, low 4)", () => {
	it("remembers an entry's state, forgets it on null, and keeps only the newest entries", () => {
		expect(recallAnalystOpen("k1")).toBeNull();
		rememberAnalystOpen("k1", true);
		rememberAnalystOpen("k2", false);
		expect([recallAnalystOpen("k1"), recallAnalystOpen("k2")]).toEqual([true, false]);
		rememberAnalystOpen("k1", null);
		expect(recallAnalystOpen("k1")).toBeNull();
		for (let i = 0; i < MAX_ENTRIES + 5; i++) rememberAnalystOpen(`n${i}`, true);
		const record = JSON.parse(sessionStorage.getItem(ANALYST_OPEN_RECORD)!) as Record<string, boolean>;
		expect(Object.keys(record)).toHaveLength(MAX_ENTRIES);
		expect(recallAnalystOpen("n0")).toBeNull();
		expect(recallAnalystOpen(`n${MAX_ENTRIES + 4}`)).toBe(true);
		// a record that is not ours reads as none; an entry without a key is never remembered
		sessionStorage.setItem(ANALYST_OPEN_RECORD, "not json");
		expect(recallAnalystOpen("k1")).toBeNull();
		rememberAnalystOpen("", true);
		expect(recallAnalystOpen("")).toBeNull();
		expect([entryKey({ __TSR_key: "a" }), entryKey(null), entryKey({ key: 1 })]).toEqual(["a", "", ""]);
	});

	it("starts a fresh visit folded (an address entered again keeps its entry's key) and keeps it on a reload or Back", () => {
		rememberAnalystOpen("k1", true);
		expect(forgetOnFreshVisit("reload", { __TSR_key: "k1" })).toBe(false);
		expect(forgetOnFreshVisit("back_forward", { __TSR_key: "k1" })).toBe(false);
		expect(recallAnalystOpen("k1")).toBe(true);
		expect(forgetOnFreshVisit("navigate", { __TSR_key: "k1" })).toBe(true);
		expect(recallAnalystOpen("k1")).toBeNull();
	});

	it("restores another company's or another entry's record, and keeps the card on the same page under a replaced key", () => {
		const recall = (key: string) => ({ k1: true, k3: false })[key] ?? null;
		const spy: EntryOpen = { symbol: "SPY", key: "k1", open: true };
		expect(nextEntryOpen(spy, "SPY", "k1", recall)).toBe(spy);
		// another company: its own record, none: folded
		expect(nextEntryOpen(spy, "NVDA", "k2", recall)).toEqual({ symbol: "NVDA", key: "k2", open: null });
		expect(nextEntryOpen({ symbol: "NVDA", key: "k2", open: null }, "SPY", "k1", recall)).toEqual(spy);
		// the same company under another key: its record where it has one, else the card as it is (a replace)
		expect(nextEntryOpen(spy, "SPY", "k3", recall)).toEqual({ symbol: "SPY", key: "k3", open: false });
		expect(nextEntryOpen(spy, "SPY", "k4", recall)).toEqual({ symbol: "SPY", key: "k4", open: true });
	});

	it("draws the card as it was left when the page comes back, and folded on another company's page", () => {
		// the stock page: opened, then left for an article (the router on its way there, then the page gone)
		const first = renderHook(({ symbol }) => useAnalystOpen(symbol), { initialProps: { symbol: "SPY" } });
		expect(first.result.current[0]).toBeNull();
		act(() => first.result.current[1](true));
		expect(first.result.current[0]).toBe(true);
		expect(recallAnalystOpen("k1")).toBe(true);
		at("/news/dow-record-chips", "k2");
		first.rerender({ symbol: "SPY" });
		expect(first.result.current[0]).toBe(true);
		expect(recallAnalystOpen("k2")).toBeNull();
		first.unmount();
		// Back: the page is drawn anew on its entry, open from its first render
		at("/stocks/SPY", "k1");
		const back = renderHook(({ symbol }) => useAnalystOpen(symbol), { initialProps: { symbol: "SPY" } });
		expect(back.result.current[0]).toBe(true);
		// a link to another company on the same route (the fund card's NVDA): the router first, then the page's params
		at("/stocks/NVDA", "k3");
		back.rerender({ symbol: "SPY" });
		expect(back.result.current[0]).toBe(true);
		expect(recallAnalystOpen("k3")).toBeNull();
		back.rerender({ symbol: "NVDA" });
		expect(back.result.current[0]).toBeNull();
		// Back to the fund: its card as it was left
		at("/stocks/SPY", "k1");
		back.rerender({ symbol: "SPY" });
		expect(back.result.current[0]).toBe(true);
		// a preview flag cleared by a replace (a new key, the same page): the card stays, remembered under the new key
		at("/stocks/SPY", "k5");
		back.rerender({ symbol: "SPY" });
		expect(back.result.current[0]).toBe(true);
		expect(recallAnalystOpen("k5")).toBe(true);
		act(() => back.result.current[1](false));
		expect(recallAnalystOpen("k5")).toBe(false);
	});
});

describe("Compare and learn's open state, kept per history entry the same way (every-stock final review, low)", () => {
	it("has its own record beside the Analyst view's, and a fresh visit forgets both", () => {
		rememberCompareOpen("k1", true);
		expect([recallCompareOpen("k1"), recallAnalystOpen("k1")]).toEqual([true, null]);
		expect(JSON.parse(sessionStorage.getItem(COMPARE_OPEN_RECORD)!)).toEqual({ k1: true });
		expect(sessionStorage.getItem(ANALYST_OPEN_RECORD)).toBeNull();
		rememberAnalystOpen("k1", false);
		expect(forgetOnFreshVisit("reload", { __TSR_key: "k1" })).toBe(false);
		expect(forgetOnFreshVisit("navigate", { __TSR_key: "k1" })).toBe(true);
		expect([recallCompareOpen("k1"), recallAnalystOpen("k1")]).toEqual([null, null]);
		// only one of the two remembered: still forgotten
		rememberCompareOpen("k2", false);
		expect(forgetOnFreshVisit("prerender", { __TSR_key: "k2" })).toBe(true);
		expect(recallCompareOpen("k2")).toBeNull();
	});

	it("draws the table as it was left when the page comes back, folded on another company's page and on a fresh entry", () => {
		at("/stocks/PLTR", "k1");
		const first = renderHook(({ symbol }) => useCompareOpen(symbol), { initialProps: { symbol: "PLTR" } });
		// never opened on this entry: folded (false, not null: Compare has no URL preview)
		expect(first.result.current[0]).toBe(false);
		act(() => first.result.current[1](true));
		expect(first.result.current[0]).toBe(true);
		expect([recallCompareOpen("k1"), recallAnalystOpen("k1")]).toEqual([true, null]);
		// a story card pressed: the router on its way to the article, then the page gone
		at("/news/dow-record-chips", "k2");
		first.rerender({ symbol: "PLTR" });
		expect(first.result.current[0]).toBe(true);
		expect(recallCompareOpen("k2")).toBeNull();
		first.unmount();
		// Back: open from the page's first render, so the window lands on the same layout
		at("/stocks/PLTR", "k1");
		const back = renderHook(({ symbol }) => useCompareOpen(symbol), { initialProps: { symbol: "PLTR" } });
		expect(back.result.current[0]).toBe(true);
		// another company on the same route: folded (the router first, then the page's params)
		at("/stocks/EAT", "k3");
		back.rerender({ symbol: "PLTR" });
		expect(back.result.current[0]).toBe(true);
		back.rerender({ symbol: "EAT" });
		expect(back.result.current[0]).toBe(false);
		at("/stocks/PLTR", "k1");
		back.rerender({ symbol: "PLTR" });
		expect(back.result.current[0]).toBe(true);
		// a replace (a preview flag cleared, a new key on the same page) keeps it, remembered under the new key
		at("/stocks/PLTR", "k4");
		back.rerender({ symbol: "PLTR" });
		expect(back.result.current[0]).toBe(true);
		expect(recallCompareOpen("k4")).toBe(true);
		act(() => back.result.current[1](false));
		expect([back.result.current[0], recallCompareOpen("k4")]).toEqual([false, false]);
		// the Analyst view's record was never touched by the table
		expect(sessionStorage.getItem(ANALYST_OPEN_RECORD)).toBeNull();
	});
});

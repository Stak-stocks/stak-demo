import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetBriefs, recallBrief, rememberBrief } from "../briefMemory";

const ALL = "dow-record-chips fed-minutes june-jobs-miss";

beforeEach(() => {
	forgetBriefs();
});

describe("the brief on show is remembered per listing entry (the phones' pager keeps its page: android NewsScreen.kt:258-260, iOS NewsView.swift:184)", () => {
	it("stepping back to the listing entry finds the brief the person left", () => {
		// dot 2 (the Fed minutes brief), its article, Back: the same history entry, the same briefs
		rememberBrief("entry-a", ALL, 1);
		expect(recallBrief("entry-a", ALL, 3)).toBe(1);
		rememberBrief("entry-a", ALL, 2);
		expect(recallBrief("entry-a", ALL, 3)).toBe(2);
	});

	it("a fresh visit (another entry) starts at the first brief", () => {
		rememberBrief("entry-a", ALL, 2);
		expect(recallBrief("entry-b", ALL, 3)).toBe(0);
		// each listing entry in the tab's history keeps its own
		rememberBrief("entry-b", ALL, 1);
		expect(recallBrief("entry-a", ALL, 3)).toBe(2);
		expect(recallBrief("entry-b", ALL, 3)).toBe(1);
	});

	it("a new set of search hits starts at its first brief, also on the same entry", () => {
		rememberBrief("entry-a", ALL, 2);
		expect(recallBrief("entry-a", "fed-minutes june-jobs-miss", 2)).toBe(0);
		// the hits are what is remembered from then on
		rememberBrief("entry-a", "fed-minutes june-jobs-miss", 1);
		expect(recallBrief("entry-a", "fed-minutes june-jobs-miss", 2)).toBe(1);
		expect(recallBrief("entry-a", ALL, 3)).toBe(0);
	});

	it("never opens on a brief the card does not have", () => {
		rememberBrief("entry-a", ALL, 2);
		expect(recallBrief("entry-a", ALL, 2)).toBe(0);
		rememberBrief("entry-a", ALL, -1);
		expect(recallBrief("entry-a", ALL, 3)).toBe(0);
		rememberBrief("entry-a", ALL, 1.5);
		expect(recallBrief("entry-a", ALL, 3)).toBe(0);
	});

	it("without an entry (the page on its way out, a router that keys none) remembers and recalls nothing", () => {
		rememberBrief(undefined, ALL, 2);
		expect(recallBrief(undefined, ALL, 3)).toBe(0);
		rememberBrief("", ALL, 2);
		expect(recallBrief("", ALL, 3)).toBe(0);
	});

	it("keeps the listing entries of a long session bounded, the one the person just left always among them", () => {
		rememberBrief("first", ALL, 1);
		for (let i = 0; i < 40; i++) rememberBrief(`entry-${i}`, ALL, 2);
		expect(recallBrief("first", ALL, 3)).toBe(0); // long gone
		expect(recallBrief("entry-39", ALL, 3)).toBe(2);
		// an entry reported again counts as new: it outlives the ones reported after its first time
		rememberBrief("entry-20", ALL, 1);
		for (let i = 40; i < 60; i++) rememberBrief(`entry-${i}`, ALL, 2);
		expect(recallBrief("entry-20", ALL, 3)).toBe(1);
		expect(recallBrief("entry-21", ALL, 3)).toBe(0);
	});

	it("is the page's own memory: a reload starts empty, so the card shows the frame's brief at load", async () => {
		rememberBrief("entry-a", ALL, 2);
		vi.resetModules();
		const fresh = await import("../briefMemory");
		expect(fresh.recallBrief("entry-a", ALL, 3)).toBe(0);
	});
});

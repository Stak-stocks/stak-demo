import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// the brief's Read link is a router Link: an anchor to the article it opens is all these tests need
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		params,
		state: _state,
		children,
		viewTransition: _vt,
		...rest
	}: { to: string; params?: { id: string }; state?: object; children: ReactNode; viewTransition?: boolean }) => (
		<a href={params ? to.replace("$id", params.id) : to} {...rest}>
			{children}
		</a>
	),
}));

import { BriefCard } from "../BriefCard";
import { newsListing } from "../data";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const card = () => screen.getByRole("group", { name: "Today’s brief" });
const read = () => screen.getByRole("link");
const dots = () => screen.getAllByRole("button", { name: /^Brief \d of \d$/ });

describe("the whole brief card opens the brief on show (news #1, D9)", () => {
	it("Read › is the card's one link, stretched over the card it is positioned on", () => {
		render(<BriefCard briefs={newsListing.briefs} />);
		expect(card().className.split(" ")).toContain("relative");
		const cls = read().className.split(" ");
		for (const c of ["after:absolute", "after:inset-0", "after:content-['']", "cursor-pointer"]) expect(cls).toContain(c);
		expect(read().getAttribute("href")).toBe("/news/dow-record-chips");
		expect(read().getAttribute("aria-label")).toBe("Read: Dow closes at a record as chips slide");
	});

	it("keeps the dots their own buttons, after the link (drawn over its stretch), never inside it", () => {
		render(<BriefCard briefs={newsListing.briefs} />);
		for (const dot of dots()) {
			expect(read().contains(dot)).toBe(false);
			// later in the document than the link: a later positioned layer, on top of the stretched link
			expect(read().compareDocumentPosition(dot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		}
		act(() => {
			fireEvent.click(dots()[2]!);
		});
		expect(read().getAttribute("href")).toBe("/news/june-jobs-miss");
	});

	it("lets the page scroll under a vertical move and takes only sideways ones (touch-action pan-y pinch-zoom)", () => {
		render(<BriefCard briefs={newsListing.briefs} />);
		expect(card().className).toContain("touch-pan-y");
		expect(card().className).toContain("touch-pinch-zoom");
	});
});

describe("the card comes back on the brief the person left (the review of 2026-11-09; the phones' pager keeps its page)", () => {
	it("opens on `start`: its title, its article, its dot", () => {
		render(<BriefCard briefs={newsListing.briefs} start={1} />);
		expect(read().getAttribute("href")).toBe("/news/fed-minutes");
		expect(read().getAttribute("aria-label")).toBe("Read: Fed minutes land Wednesday");
		expect(dots().map((d) => d.getAttribute("aria-current"))).toEqual([null, "true", null]);
	});

	it("without one, or with one it does not have, it shows the frame's first brief", () => {
		const { unmount } = render(<BriefCard briefs={newsListing.briefs} />);
		expect(read().getAttribute("href")).toBe("/news/dow-record-chips");
		unmount();
		render(<BriefCard briefs={newsListing.briefs} start={7} />);
		expect(read().getAttribute("href")).toBe("/news/dow-record-chips");
	});

	it("reports the brief on show as it mounts and at every change: a dot, a swipe, the clock", () => {
		const onShow = vi.fn();
		render(<BriefCard briefs={newsListing.briefs} onShow={onShow} />);
		expect(onShow.mock.calls).toEqual([[0]]);
		act(() => {
			fireEvent.click(dots()[1]!);
		});
		expect(onShow).toHaveBeenLastCalledWith(1);
		act(() => {
			vi.advanceTimersByTime(25_000);
		});
		expect(onShow).toHaveBeenLastCalledWith(2);
		act(() => {
			vi.advanceTimersByTime(25_000);
		});
		expect(onShow.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, 0]);
	});

	it("reports again under a new listener (the listing's entry was rewritten by its search): the entry the person leaves is the one remembered", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(<BriefCard briefs={newsListing.briefs} start={2} onShow={first} />);
		expect(first.mock.calls).toEqual([[2]]);
		rerender(<BriefCard briefs={newsListing.briefs} start={0} onShow={second} />);
		// the card stays on its brief (a new `start` moves nothing) and tells the new listener which
		expect(read().getAttribute("href")).toBe("/news/june-jobs-miss");
		expect(second.mock.calls).toEqual([[2]]);
	});

	it("round trip through the listing's memory: dot 2, away, back on the same entry shows the Fed minutes brief; a fresh entry the first", async () => {
		const { forgetBriefs, recallBrief, rememberBrief } = await import("../briefMemory");
		forgetBriefs();
		const ids = newsListing.briefs.map((b) => b.id).join(" ");
		const mount = (entry: string) =>
			render(<BriefCard briefs={newsListing.briefs} start={recallBrief(entry, ids, newsListing.briefs.length)} onShow={(i) => rememberBrief(entry, ids, i)} />);
		const listing = mount("entry-a");
		act(() => {
			fireEvent.click(dots()[1]!);
		});
		expect(read().getAttribute("href")).toBe("/news/fed-minutes");
		listing.unmount(); // the article opens
		const back = mount("entry-a");
		expect(read().getAttribute("href")).toBe("/news/fed-minutes");
		expect(dots()[1]!.getAttribute("aria-current")).toBe("true");
		back.unmount();
		mount("entry-b"); // the rail's News link: a new entry
		expect(read().getAttribute("href")).toBe("/news/dow-record-chips");
	});
});

describe("a touch swipe pages the brief and stops at the ends (news #10, D9; the phones' pagers)", () => {
	// jsdom has no PointerEvent: a pointer event is a mouse event carrying the pointer fields React reads off the native event
	const pointer = (type: string, pointerType: string, pointerId: number, x: number, y: number) => {
		const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
		Object.defineProperties(e, { pointerType: { value: pointerType }, isPrimary: { value: true }, pointerId: { value: pointerId } });
		return e;
	};
	const drag = (pointerType: string, dx: number) => {
		act(() => {
			fireEvent(card(), pointer("pointerdown", pointerType, 1, 300, 120));
			fireEvent(card(), pointer("pointerup", pointerType, 1, 300 + dx, 124));
		});
	};
	const swipe = (dx: number) => drag("touch", dx);

	it("finger left shows the next brief, finger right the previous one, and neither turns past an end", () => {
		render(<BriefCard briefs={newsListing.briefs} />);
		swipe(80); // finger right on the first brief: it stays (no wrap to the last)
		expect(read().getAttribute("href")).toBe("/news/dow-record-chips");
		expect(dots()[0]!.getAttribute("aria-current")).toBe("true");
		swipe(-80);
		expect(read().getAttribute("href")).toBe("/news/fed-minutes");
		swipe(-80);
		expect(read().getAttribute("href")).toBe("/news/june-jobs-miss");
		swipe(-80); // finger left on the last brief: it stays (no wrap to the first)
		expect(read().getAttribute("href")).toBe("/news/june-jobs-miss");
		expect(dots()[2]!.getAttribute("aria-current")).toBe("true");
		swipe(80);
		expect(read().getAttribute("href")).toBe("/news/fed-minutes");
	});

	it("a mouse drag turns nothing (the desktop keeps the dots), and a short wobble is a tap", () => {
		render(<BriefCard briefs={newsListing.briefs} />);
		drag("mouse", -100);
		expect(read().getAttribute("href")).toBe("/news/dow-record-chips");
		swipe(-30);
		expect(read().getAttribute("href")).toBe("/news/dow-record-chips");
	});
});

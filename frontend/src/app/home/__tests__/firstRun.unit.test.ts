import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// a stand-in for the router's navigation events: the hook subscribes to "onBeforeNavigate"
const nav = vi.hoisted(() => {
	const listeners = new Set<(e: { toLocation: { pathname: string } }) => void>();
	const router = {
		subscribe: (_event: string, fn: (e: { toLocation: { pathname: string } }) => void) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
	};
	const go = (pathname: string) => {
		for (const fn of [...listeners]) fn({ toLocation: { pathname } });
	};
	return { listeners, router, go };
});

vi.mock("@tanstack/react-router", () => ({ useRouter: () => nav.router }));

import {
	type Activity,
	endFirstRun,
	endsFirstRun,
	FIRST_RUN_KEY,
	firstRunKey,
	hasActed,
	isFirstRunDone,
	type NavigationSource,
	useFirstRun,
	watchFirstRunHops,
	watchingFirstRun,
} from "../firstRun";

const NOTHING: Activity = { saves: 0, positions: 0, sold: 0, passed: 0, completedDecks: 0, decidedToday: 0 };

/** A navigation source the test drives by hand. */
function source() {
	const subs = new Set<(p: string) => void>();
	let stops = 0;
	const src: NavigationSource = (onPath) => {
		subs.add(onPath);
		return () => {
			stops += 1;
			subs.delete(onPath);
		};
	};
	return { src, go: (p: string) => [...subs].forEach((fn) => fn(p)), active: () => subs.size, stops: () => stops };
}

beforeEach(() => {
	// end any watch a previous test left running (it outlives Home by design), then start from an empty browser
	watchFirstRunHops(() => () => {}, "test-reset");
	endFirstRun("test-reset");
	localStorage.clear();
});

afterEach(() => cleanup());

describe("first run is a visit before the person has done anything", () => {
	it("is over once anything is saved, held, sold, passed, finished or decided", () => {
		expect(hasActed(NOTHING)).toBe(false);
		for (const field of Object.keys(NOTHING) as (keyof Activity)[]) expect(hasActed({ ...NOTHING, [field]: 1 }), field).toBe(true);
	});

	it("is kept per browser and account (the phones' Session flag), the guest apart", () => {
		expect(firstRunKey(null)).toBe(`${FIRST_RUN_KEY}.guest`);
		expect(firstRunKey("uid-1")).toBe(`${FIRST_RUN_KEY}.uid-1`);
		expect(isFirstRunDone(firstRunKey("uid-1"))).toBe(false);
		endFirstRun(firstRunKey("uid-1"));
		expect(localStorage.getItem(firstRunKey("uid-1"))).toBe("1");
		expect(isFirstRunDone(firstRunKey("uid-1"))).toBe(true);
		expect(isFirstRunDone(firstRunKey("uid-2"))).toBe(false);
		expect(isFirstRunDone(firstRunKey(null))).toBe(false);
	});
});

describe("the hops that end it (the phones end it at every hop from the first-run Home)", () => {
	it("a tab page: News and its articles, Discover, a stock, My STAK, Simulate", () => {
		for (const p of ["/news", "/news/fear-gauge-32", "/news/fed-minutes", "/discover", "/discover/end", "/stocks/NVDA", "/my-stak", "/my-stak/ai-tech", "/simulate", "/simulate/picks/NVDA", "/simulate/leaderboard"]) {
			expect(endsFirstRun(p), p).toBe(true);
		}
	});

	it("not Home itself, the Profile pages (the phones' Profile push returns to first run) or the pages outside the app", () => {
		for (const p of ["/home", "/profile", "/profile/edit", "/profile/taste-risk", "/profile/help", "/profile/notifications", "/onboarding", "/login", "/signup", "/welcome", "/", "/newsroom", "/no-such-page"]) {
			expect(endsFirstRun(p), p).toBe(false);
		}
	});

	it("the watch ends it at the first tab page, wherever the person is when they make the hop, then stops", () => {
		const s = source();
		const key = firstRunKey("uid-w");
		watchFirstRunHops(s.src, key);
		expect(watchingFirstRun()).toBe(key);
		s.go("/home"); // the bell's panel closing, a capture switch
		s.go("/profile"); // the account row: first run is kept (Back returns to it)
		s.go("/profile/edit");
		expect(isFirstRunDone(key)).toBe(false);
		s.go("/news"); // Profile -> the rail's News: a tab hop
		expect(isFirstRunDone(key)).toBe(true);
		expect(watchingFirstRun()).toBe(null);
		expect(s.active()).toBe(0);
		expect(s.stops()).toBe(1);
	});

	it("one watch at a time: the same account's is kept, another account's takes over", () => {
		const a = source();
		const b = source();
		watchFirstRunHops(a.src, firstRunKey("uid-a"));
		watchFirstRunHops(b.src, firstRunKey("uid-a"));
		expect(a.active()).toBe(1);
		expect(b.active()).toBe(0);
		watchFirstRunHops(b.src, firstRunKey("uid-b"));
		expect(a.active()).toBe(0);
		expect(watchingFirstRun()).toBe(firstRunKey("uid-b"));
		b.go("/discover");
		expect(isFirstRunDone(firstRunKey("uid-b"))).toBe(true);
		expect(isFirstRunDone(firstRunKey("uid-a"))).toBe(false);
	});

	it("ending it another way (an action Home sees) stops the watch", () => {
		const s = source();
		const key = firstRunKey("uid-c");
		watchFirstRunHops(s.src, key);
		endFirstRun(key);
		expect(watchingFirstRun()).toBe(null);
		expect(s.active()).toBe(0);
	});
});

describe("useFirstRun: what Home draws", () => {
	const fresh = { forced: false, acted: false, ready: true, uid: "uid-h" };

	it("a new person sees first run until their first hop; Home opened again after it shows Main, for good", () => {
		const first = renderHook(() => useFirstRun(fresh));
		expect(first.result.current).toBe(true);
		nav.go("/home");
		nav.go("/profile");
		first.rerender();
		expect(first.result.current).toBe(true);
		// the Market Mood header: /news. Home keeps its layout on the way out (no Main flash), the flag is stored
		nav.go("/news");
		first.rerender();
		expect(first.result.current).toBe(true);
		expect(localStorage.getItem(firstRunKey("uid-h"))).toBe("1");
		first.unmount();
		// the rail's Home, Back to the hand-off entry, a later visit
		const again = renderHook(() => useFirstRun(fresh));
		expect(again.result.current).toBe(false);
		// the capture switch still draws 2:532
		const forced = renderHook(() => useFirstRun({ ...fresh, forced: true }));
		expect(forced.result.current).toBe(true);
	});

	it("a person who has acted never sees it, and only a hop made during a first run ends one (the phones' endFirstRun)", () => {
		// the demo persona (saves, holdings): Main, no watch, no flag; its hops end nothing
		const persona = renderHook(() => useFirstRun({ ...fresh, uid: null, acted: true }));
		expect(persona.result.current).toBe(false);
		expect(watchingFirstRun()).toBe(null);
		nav.go("/news");
		expect(isFirstRunDone(firstRunKey(null))).toBe(false);
		persona.unmount();
		// so an empty state in the same browser (a new person) still gets its first run
		const empty = renderHook(() => useFirstRun({ ...fresh, uid: null }));
		expect(empty.result.current).toBe(true);
		expect(watchingFirstRun()).toBe(firstRunKey(null));
	});

	it("an account still loading changes nothing (no flag, no watch)", () => {
		const loading = renderHook(() => useFirstRun({ ...fresh, uid: "uid-l", ready: false }));
		expect(loading.result.current).toBe(true);
		expect(watchingFirstRun()).toBe(null);
		nav.go("/discover");
		expect(isFirstRunDone(firstRunKey("uid-l"))).toBe(false);
	});

	it("each account has its own first run: another account's flag does not end it", () => {
		endFirstRun(firstRunKey("someone-else"));
		const mine = renderHook(() => useFirstRun({ ...fresh, uid: "uid-new" }));
		expect(mine.result.current).toBe(true);
		const guest = renderHook(() => useFirstRun({ ...fresh, uid: null }));
		expect(guest.result.current).toBe(true);
	});
});

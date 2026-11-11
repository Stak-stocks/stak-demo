import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activeFromPath, myStakEntryLit, navKeyOf, openedFromSection } from "../AppShell";
import { account as demo } from "../data/account";
import { findOpener, installFocusReturn, labelOf, markOf, pathOf } from "../focusReturn";
import { entryKeyOf, forgetFreshEntry, ROUTER_SCROLL_RECORD } from "../freshEntry";
import { shellFill } from "../NotFound";
import { sectionOf } from "../stocks/origin";
import { handleOf, sidebarLineOf } from "../useAccountDisplay";

describe("activeFromPath: the rail lights the section the stock page's breadcrumb names (VIS-07)", () => {
	it("keeps every section's own pages", () => {
		expect(activeFromPath("/home")).toBe("home");
		expect(activeFromPath("/news/fed-minutes")).toBe("news");
		expect(activeFromPath("/discover/end")).toBe("discover");
		expect(activeFromPath("/my-stak/ai-tech")).toBe("mystak");
		expect(activeFromPath("/simulate/picks/NVDA")).toBe("simulate");
		expect(activeFromPath("/profile/edit")).toBe("profile");
	});

	it("keeps the frames' rail for a stock page loaded by its address: Discover, My STAK for a saved My STAK entry", () => {
		expect(activeFromPath("/stocks/AAPL")).toBe("discover");
		expect(activeFromPath("/stocks/AAPL", false, false, null)).toBe("discover");
		expect(activeFromPath("/stocks/AAPL", true)).toBe("mystak");
		// the EXAMPLE frames instance the rail as Home, whatever came before
		expect(activeFromPath("/stocks/AAPL", false, true, "simulate")).toBe("home");
		expect(activeFromPath("/discover", false, true)).toBe("home");
	});

	it("lights the section a stock page was opened from, the one its crumb names", () => {
		expect(activeFromPath("/stocks/CRWD", false, false, "simulate")).toBe("simulate");
		expect(activeFromPath("/stocks/AAPL", false, false, "profile")).toBe("profile");
		expect(activeFromPath("/stocks/AAPL", false, false, "news")).toBe("news");
		expect(activeFromPath("/stocks/AAPL", false, false, "home")).toBe("home");
		expect(activeFromPath("/stocks/AAPL", false, false, "mystak")).toBe("mystak");
		// a saved My STAK entry says My STAK in its crumb whatever came before it
		expect(activeFromPath("/stocks/AAPL", true, false, "simulate")).toBe("mystak");
		// only a stock page has an origin to follow
		expect(activeFromPath("/simulate/portfolio", false, false, "home")).toBe("simulate");
		expect(activeFromPath("/home", false, false, "simulate")).toBe("home");
	});

	it("maps the crumb's section (stocks/origin.ts sectionOf) to its rail item", () => {
		expect(navKeyOf(null)).toBeNull();
		expect(navKeyOf(sectionOf("/simulate"))).toBe("simulate");
		expect(navKeyOf(sectionOf("/simulate/portfolio"))).toBe("simulate");
		expect(navKeyOf(sectionOf("/my-stak/ai-tech"))).toBe("mystak");
		expect(navKeyOf(sectionOf("/news/fed-minutes"))).toBe("news");
		expect(navKeyOf(sectionOf("/profile/taste-risk"))).toBe("profile");
		expect(navKeyOf(sectionOf("/home"))).toBe("home");
		expect(navKeyOf(sectionOf("/discover/end"))).toBe("discover");
		// a stock page before a stock page names no section: the crumb and the rail both fall back to Discover
		expect(navKeyOf(sectionOf("/stocks/NVDA"))).toBeNull();
	});
});

describe("openedFromSection: the stock page's own origin, read at any moment of the navigation (VIS-07)", () => {
	const O = "http://stak.test";
	const list = (paths: string[], current: number) => {
		const entries = paths.map((path, index) => ({ url: O + path, index }));
		return { currentEntry: entries[current]!, entries: () => entries };
	};

	it("names the section of the app page before a settled page, as the breadcrumb does", () => {
		expect(openedFromSection("/stocks/CRWD", "/", true, list(["/simulate", "/stocks/CRWD"], 1), O)?.label).toBe("Simulate");
		expect(openedFromSection("/stocks/AAPL", "/", true, list(["/home", "/profile/taste-risk", "/stocks/AAPL"], 2), O)?.label).toBe("Profile");
		expect(openedFromSection("/stocks/AAPL", "/", true, list(["/news/apple-foldable", "/stocks/AAPL"], 1), O)?.label).toBe("News");
	});

	it("reads the same section while the pushed entry is not written yet (the entry still current is where the person comes from)", () => {
		// the shell renders /stocks/CRWD while the browser still lists /simulate as the current entry
		expect(openedFromSection("/stocks/CRWD", "/", false, list(["/home", "/simulate"], 1), O)?.label).toBe("Simulate");
		// without the guard the entry before Simulate would have been read (Home)
		expect(openedFromSection("/stocks/CRWD", "/", true, list(["/home", "/simulate"], 1), O)?.label).toBe("Home");
		// already written when the shell renders: the plain reading
		expect(openedFromSection("/stocks/CRWD", "/", false, list(["/home", "/simulate", "/stocks/CRWD"], 2), O)?.label).toBe("Simulate");
		// a Back onto the stock page: the browser is on its entry at once
		expect(openedFromSection("/stocks/CRWD", "/", false, list(["/simulate", "/stocks/CRWD", "/news/fed-minutes"], 1), O)?.label).toBe("Simulate");
		// an escaped path is the same path
		expect(openedFromSection("/stocks/BRK.B", "/", false, list(["/my-stak", "/stocks/BRK%2EB"], 1), O)?.label).toBe("My STAK");
	});

	it("names no section where the breadcrumb falls back to Discover", () => {
		// loaded by its address, first page of the visit
		expect(openedFromSection("/stocks/AAPL", "/", true, list(["/stocks/AAPL"], 0), O)).toBeNull();
		// a sheet over a page, the sign-in page, the landing page and another site are not pages to come from
		expect(openedFromSection("/stocks/AAPL", "/", true, list(["/simulate?modal=add-success&symbol=AAPL", "/stocks/AAPL"], 1), O)).toBeNull();
		expect(openedFromSection("/stocks/AAPL", "/", true, list(["/login", "/stocks/AAPL"], 1), O)).toBeNull();
		expect(openedFromSection("/stocks/AAPL", "/", false, list(["/welcome"], 0), O)).toBeNull();
		expect(openedFromSection("/stocks/AAPL", "/", true, { currentEntry: { url: `${O}/stocks/AAPL`, index: 1 }, entries: () => [{ url: "https://elsewhere.test/simulate", index: 0 }, { url: `${O}/stocks/AAPL`, index: 1 }] }, O)).toBeNull();
		// another stock page before it names no section
		expect(openedFromSection("/stocks/AAPL", "/", true, list(["/simulate", "/stocks/NVDA", "/stocks/AAPL"], 2), O)).toBeNull();
		// a browser without the history list
		expect(openedFromSection("/stocks/AAPL", "/", true, undefined, O)).toBeNull();
	});

	it("lights that section's rail item", () => {
		const from = openedFromSection("/stocks/CRWD", "/", false, list(["/home", "/simulate"], 1), O);
		expect(activeFromPath("/stocks/CRWD", false, false, navKeyOf(from))).toBe("simulate");
	});
});

describe("the rail's account line (VIS-05)", () => {
	it("is the person's handle, never an email address", () => {
		expect(sidebarLineOf({ handle: "@hamza", showcase: false, demoName: true })).toBe("@hamza");
		expect(sidebarLineOf({ handle: "@ada", showcase: false, demoName: false })).toBe("@ada");
		expect(sidebarLineOf({ handle: "@jane", showcase: false, demoName: false })).toBe("@jane");
	});

	it("repeats the frame's own text only for the untouched showcase persona", () => {
		expect(sidebarLineOf({ handle: "@hamza", showcase: true, demoName: true })).toBe(demo.handle);
		expect(demo.handle).toBe("@hamzdris@gmail.com");
		// a renamed visitor who has not acted yet shows the handle of the name they chose
		expect(sidebarLineOf({ handle: "@ada", showcase: true, demoName: false })).toBe("@ada");
	});

	it("derives the handle from the display name's first word", () => {
		expect(handleOf("Hamza")).toBe("@hamza");
		expect(handleOf("jane.doe")).toBe("@janedoe");
		expect(handleOf("Zoë")).toBe("@zo");
		expect(handleOf("!!!")).toBe("@you");
		expect(handleOf("")).toBe("@you");
	});
});

describe("myStakEntryLit: a stock page opened from My STAK lights My STAK, saved or not (review r2's low 3)", () => {
	it("lights My STAK for every from=my-stak entry, also after a real Unsave", () => {
		expect(myStakEntryLit({ from: "my-stak", saved: 1 }, true)).toBe(true);
		expect(myStakEntryLit({ from: "my-stak", collection: "ai-tech" }, true)).toBe(true);
		// a real Unsave: the address drops ?saved and the company leaves the saves; the crumb still says My STAK
		expect(myStakEntryLit({ from: "my-stak", collection: "ai-tech" }, false)).toBe(true);
		expect(activeFromPath("/stocks/MSFT", myStakEntryLit({ from: "my-stak", collection: "ai-tech" }, false))).toBe("mystak");
	});

	it("keeps the frame's Discover only on the unsaved ticket's own preview address (2:5402, G1 stock-mystak-ticket)", () => {
		expect(myStakEntryLit({ from: "my-stak", open: 1, ticket: 1 }, false)).toBe(false);
		expect(activeFromPath("/stocks/AAPL", myStakEntryLit({ from: "my-stak", open: 1, ticket: 1 }, false))).toBe("discover");
		// the saved entry's ticket stays My STAK, and a ticket=true spelling is the same flag
		expect(myStakEntryLit({ from: "my-stak", ticket: 1 }, true)).toBe(true);
		expect(myStakEntryLit({ from: "my-stak", ticket: "true" }, false)).toBe(false);
	});

	it("is only about My STAK entries", () => {
		expect(myStakEntryLit({}, true)).toBe(false);
		expect(myStakEntryLit({ from: "discover", saved: 1 }, true)).toBe(false);
	});
});

describe("shellFill: the 404 inside the shell fills the column it sits in (review r2's low 6)", () => {
	it("is the column's height left below the shell's top padding and above its bottom gutter", () => {
		// phone: the window less the 64 bar, the 16 padding and the 32 gutter (and a notch's inset)
		expect(shellFill("phone")).toBe("calc(100svh - 112px - env(safe-area-inset-top, 0px))");
		// tablet: the shell's own min-height (the window, at least 448) less 88 above and 32 below
		expect(shellFill("tablet")).toBe("calc(max(448px, 100svh) - 120px)");
		// 1024 and wider: the shell's fillHeight less the 88 band (no gutter below)
		expect(shellFill("desktop")).toBe("calc(max(1024px, calc(100vh / var(--stak-zoom, 1))) - 88px)");
		expect(shellFill("big")).toBe(shellFill("desktop"));
	});
});

describe("forgetFreshEntry: a fresh visit starts at the top, the landing page's own scroller included (review r2's low 4)", () => {
	const store = (record: unknown) => {
		const items = new Map<string, string>([[ROUTER_SCROLL_RECORD, JSON.stringify(record)]]);
		return {
			getItem: (k: string) => items.get(k) ?? null,
			setItem: (k: string, v: string) => void items.set(k, v),
			read: () => JSON.parse(items.get(ROUTER_SCROLL_RECORD) ?? "null"),
		};
	};
	const saved = {
		abc12: { window: { scrollX: 0, scrollY: 700 }, "div:nth-child(1) > div:nth-child(2)": { scrollX: 0, scrollY: 900 } },
		other: { window: { scrollX: 0, scrollY: 300 } },
	};

	it("forgets every place saved for the entry of a fresh navigation (an address entered, or entered again)", () => {
		const s = store(saved);
		expect(forgetFreshEntry("navigate", "abc12", s)).toBe(true);
		expect(s.read()).toEqual({ other: saved.other });
		const p = store(saved);
		expect(forgetFreshEntry("prerender", "abc12", p)).toBe(true);
		expect(p.read()).toEqual({ other: saved.other });
	});

	it("keeps them for a reload and a step through the history (also across documents)", () => {
		for (const type of ["reload", "back_forward", undefined]) {
			const s = store(saved);
			expect(forgetFreshEntry(type, "abc12", s)).toBe(false);
			expect(s.read()).toEqual(saved);
		}
	});

	it("leaves other entries, a missing or broken record and an unavailable storage alone, and never throws", () => {
		const s = store(saved);
		expect(forgetFreshEntry("navigate", "no-such-key", s)).toBe(false);
		expect(s.read()).toEqual(saved);
		expect(forgetFreshEntry("navigate", "abc12", undefined)).toBe(false);
		expect(forgetFreshEntry("navigate", "abc12", { getItem: () => "{not json", setItem: () => {} })).toBe(false);
		expect(forgetFreshEntry("navigate", "abc12", { getItem: () => null, setItem: () => {} })).toBe(false);
		expect(forgetFreshEntry("navigate", "constructor", store({}))).toBe(false);
		const blocked = {
			getItem: (): string | null => {
				throw new Error("blocked");
			},
			setItem: () => {},
		};
		expect(forgetFreshEntry("navigate", "abc12", blocked)).toBe(false);
	});

	it("files an entry as the router does: its __TSR_key, else its href", () => {
		expect(entryKeyOf({ __TSR_key: "abc12", __TSR_index: 3 }, "/welcome")).toBe("abc12");
		expect(entryKeyOf({ key: "old" }, "/welcome?x=1")).toBe("/welcome?x=1");
		expect(entryKeyOf(null, "/welcome")).toBe("/welcome");
	});
});

describe("focus return: a step back puts the keyboard on the control that opened the page left (review r2's low 5)", () => {
	type Loc = { pathname: string; state: Record<string, unknown> };
	type Notify = (e: { location: Loc; action: { type: string } }) => void;
	const drawn = () => true;
	const listing = (extra = "") =>
		`<div id="app"><aside><a href="/home">Home</a><a href="/news">News</a></aside><main><a href="/news/a">Story A</a><a href="/news/b">Story B <span>2d</span></a>${extra}<button type="button">Load more</button><div>plain text</div></main></div>`;
	const settle = () => new Promise((r) => setTimeout(r, 30));
	/** A router as the module reads it: its history (location, subscribe) and its state (status, the entry it has drawn). */
	const fakeRouter = () => {
		let notify: Notify = () => {};
		const router = {
			history: {
				location: { pathname: "/news", state: { __TSR_key: "k0", __TSR_index: 0 } } as Loc,
				subscribe: (cb: Notify) => {
					notify = cb;
					return () => {};
				},
			},
			state: { status: "idle", resolvedLocation: { state: { __TSR_key: "k0" } } as { state: Record<string, unknown> } },
		};
		const go = (pathname: string, key: string, index: number, type: string) => {
			router.history.location = { pathname, state: { __TSR_key: key, __TSR_index: index } };
			notify({ location: router.history.location, action: { type } });
		};
		const drawnEntry = (key: string) => {
			router.state.resolvedLocation = { state: { __TSR_key: key } };
		};
		return { router, go, drawnEntry };
	};
	let rects: { mockRestore: () => void };
	// a link's own default action (jsdom cannot navigate): the app's links prevent it too
	const noNavigation = (e: Event) => e.preventDefault();
	beforeEach(() => {
		document.addEventListener("click", noNavigation);
		document.body.innerHTML = "";
		// jsdom lays nothing out: every element counts as drawn
		rects = vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number);
		vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
	});
	afterEach(() => {
		document.removeEventListener("click", noNavigation);
		rects.mockRestore();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
	});

	it("names a control by its address, its place and its text", () => {
		document.body.innerHTML = listing();
		const b = document.querySelector<HTMLElement>('a[href="/news/b"]')!;
		expect(labelOf(b)).toBe("Story B 2d");
		expect(pathOf(b)).toBe("body:nth-child(2) > div:nth-child(1) > main:nth-child(2) > a:nth-child(2)");
		expect(markOf(b, drawn)).toEqual({ tag: "a", href: "/news/b", nth: 0, path: pathOf(b), label: "Story B 2d" });
	});

	it("finds the control again on its page drawn anew, and never takes another control for a link that is gone", () => {
		document.body.innerHTML = listing();
		const markB = markOf(document.querySelector('a[href="/news/b"]')!, drawn);
		const markMore = markOf(document.querySelector("main button")!, drawn);
		document.body.innerHTML = listing();
		expect(findOpener(markB, drawn)?.getAttribute("href")).toBe("/news/b");
		expect(findOpener(markMore, drawn)?.textContent).toBe("Load more");
		// the same story listed twice: the second of them comes back
		document.body.innerHTML = listing('<a href="/news/b">Story B again</a>');
		const second = markOf(document.querySelectorAll('a[href="/news/b"]')[1]!, drawn);
		expect(second.nth).toBe(1);
		document.body.innerHTML = listing('<a href="/news/b">Story B again</a>');
		expect(findOpener(second, drawn)?.textContent).toBe("Story B again");
		// a link that is gone: nothing
		document.body.innerHTML = "<main><a href='/news/a'>Story A</a></main>";
		expect(findOpener(markB, drawn)).toBeNull();
		// a closed dialog's or an inert region's control is not reachable
		document.body.innerHTML = `<dialog><a href="/news/b">Story B 2d</a></dialog><div inert><button type="button">Load more</button></div>`;
		expect(findOpener(markB, drawn)).toBeNull();
		expect(findOpener(markMore, drawn)).toBeNull();
	});

	it("gives the focus to the button that opens a panel when the control that left sat in it and the panel is closed", () => {
		const page = (panelOpen: boolean) =>
			`<main><button type="button" aria-controls="inbox" aria-expanded="${panelOpen}">Notifications</button><a href="/news/fed-minutes">Fed minutes land</a>${panelOpen ? '<div id="inbox"><a href="/news/fed-minutes">Fed notes row</a></div>' : ""}</main>`;
		document.body.innerHTML = page(true);
		const row = markOf(document.querySelector("#inbox a")!, drawn);
		expect(row.scope).toBe("inbox");
		expect(row.scopeOpener?.label).toBe("Notifications");
		// back with the panel closed: the bell, not the story card that links to the same address
		document.body.innerHTML = page(false);
		expect(findOpener(row, drawn)?.textContent).toBe("Notifications");
		// back with the panel open again: the row itself
		document.body.innerHTML = page(true);
		expect(findOpener(row, drawn)?.textContent).toBe("Fed notes row");
		// the compact menu: a closed dialog named by its button
		document.body.innerHTML = `<header><button type="button" aria-controls="menu">Show navigation</button></header><dialog id="menu" open><a href="/my-stak">My STAK</a></dialog>`;
		const link = markOf(document.querySelector("#menu a")!, drawn);
		document.querySelector("dialog")!.removeAttribute("open");
		expect(findOpener(link, drawn)?.textContent).toBe("Show navigation");
	});

	it("focuses the opener after a step back once the router has drawn the entry, and nothing after Forward", async () => {
		const { router, go, drawnEntry } = fakeRouter();
		const off = installFocusReturn(router);
		document.body.innerHTML = listing();
		// a click on story B opens its article (a push from k0)
		document.querySelector('a[href="/news/b"] span')!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		go("/news/b", "k1", 1, "PUSH");
		document.body.innerHTML = "<main><button type='button' aria-label='Back'>Back</button><p>Article</p></main>";
		drawnEntry("k1");
		// Back: the router has not drawn k0 yet, so nothing is focused on the article
		go("/news", "k0", 0, "BACK");
		await settle();
		expect(document.activeElement).toBe(document.body);
		// drawn: the story card has focus again
		document.body.innerHTML = listing();
		drawnEntry("k0");
		await settle();
		expect(document.activeElement?.getAttribute("href")).toBe("/news/b");
		// Forward onto the article moves nothing
		(document.activeElement as HTMLElement).blur();
		document.body.innerHTML = "<main><button type='button'>Back</button></main>";
		drawnEntry("k1");
		go("/news/b", "k1", 1, "FORWARD");
		await settle();
		expect(document.activeElement).toBe(document.body);
		off();
	});

	it("leaves focus where the page or a sheet put it, and stops at the person's own key", async () => {
		const { router, go, drawnEntry } = fakeRouter();
		const off = installFocusReturn(router);
		document.body.innerHTML = listing();
		document.querySelector<HTMLElement>('a[href="/news/a"]')!.focus();
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		go("/news/a", "k1", 1, "PUSH");
		// something else has focus when the entry is drawn again: it keeps it
		document.body.innerHTML = listing();
		document.querySelector<HTMLElement>("main button")!.focus();
		go("/news", "k0", 0, "BACK");
		await settle();
		expect(document.activeElement?.textContent).toBe("Load more");
		// the person presses a key before the page is drawn: the return is called off
		document.querySelector<HTMLElement>('a[href="/news/a"]')!.focus();
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		go("/news/a", "k2", 1, "PUSH");
		document.body.innerHTML = "<main></main>";
		drawnEntry("k2");
		go("/news", "k0", 0, "BACK");
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
		document.body.innerHTML = listing();
		drawnEntry("k0");
		await settle();
		expect(document.activeElement).toBe(document.body);
		off();
	});
});

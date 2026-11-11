import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// the router as the article page sees it: its history (Back), whether an app page came before this entry (the router's
// own entry index, useCanGoBack) and the state of the entry on show
const back = vi.fn();
let entryState: Record<string, unknown> = {};
let canGoBack = false;
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ history: { back } }),
	useCanGoBack: () => canGoBack,
	useLocation: ({ select }: { select: (l: { state: Record<string, unknown> }) => unknown }) => select({ state: entryState }),
}));

/** the module as a fresh page load has it (its memory empty; the tab's sessionStorage as the test left it) */
const load = async () => {
	vi.resetModules();
	return import("../backToListing");
};

beforeEach(() => {
	window.sessionStorage.clear();
	back.mockClear();
	entryState = {};
	canGoBack = false;
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("the listing's last search (where Back goes when the listing did not open the article)", () => {
	it("is the plain listing until the listing reports a search", async () => {
		const { listingSearch } = await load();
		expect(listingSearch()).toEqual({});
	});

	it("follows the listing: its text while open (empty too), nothing once closed", async () => {
		const { listingSearch, rememberListingSearch } = await load();
		rememberListingSearch("chips");
		expect(listingSearch()).toEqual({ q: "chips" });
		rememberListingSearch("");
		expect(listingSearch()).toEqual({ q: "" });
		rememberListingSearch("  Tesla ");
		expect(listingSearch()).toEqual({ q: "  Tesla " });
		rememberListingSearch(undefined);
		expect(listingSearch()).toEqual({});
		expect(window.sessionStorage.getItem("stak.news.search")).toBeNull();
	});

	it("lasts the tab's session: a reload of an article still knows it", async () => {
		(await load()).rememberListingSearch("reuters");
		const { listingSearch } = await load();
		expect(listingSearch()).toEqual({ q: "reuters" });
	});

	it("works from the page's memory when the browser refuses storage", async () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		const { listingSearch, rememberListingSearch } = await load();
		expect(listingSearch()).toEqual({});
		rememberListingSearch("fed");
		expect(listingSearch()).toEqual({ q: "fed" });
	});
});

describe("the article's Back arrow (D2: back to where the person came from)", () => {
	type Back = { search: { q?: string }; onClick: (e: MouseEvent<HTMLAnchorElement>) => void; label: string };
	const Arrow = ({ hook }: { hook: () => Back }) => {
		const b = hook();
		// the link's own target as data-to (a hash href: jsdom follows no other navigation)
		return <a href="#back" aria-label={b.label} data-to={b.search.q === undefined ? "/news" : `/news?q=${b.search.q}`} onClick={b.onClick} />;
	};

	it("steps back to the listing when the listing opened the article (no new entry), named Back to News", async () => {
		const { FROM_LISTING, useBackToListing } = await load();
		entryState = { ...FROM_LISTING };
		canGoBack = true;
		render(<Arrow hook={useBackToListing} />);
		const link = screen.getByRole("link", { name: "Back to News" });
		const notPrevented = fireEvent.click(link);
		expect(notPrevented).toBe(false);
		expect(back).toHaveBeenCalledTimes(1);
	});

	it("steps back to any other app page that came before it (Home, a stock page, the previous article after Read next), named Back", async () => {
		const { useBackToListing } = await load();
		canGoBack = true;
		render(<Arrow hook={useBackToListing} />);
		const link = screen.getByRole("link", { name: "Back" });
		expect(fireEvent.click(link)).toBe(false);
		expect(back).toHaveBeenCalledTimes(1);
	});

	it("on a direct landing (nothing before it) lets its link go to /news with the listing's last search, named Back to News", async () => {
		const { rememberListingSearch, useBackToListing } = await load();
		rememberListingSearch("chips");
		render(<Arrow hook={useBackToListing} />);
		const link = screen.getByRole("link", { name: "Back to News" });
		expect(link.getAttribute("data-to")).toBe("/news?q=chips");
		const notPrevented = fireEvent.click(link);
		expect(notPrevented).toBe(true);
		expect(back).not.toHaveBeenCalled();
	});

	it("never steps out of the app: an entry marked by the listing but with nothing before it (a restored tab) takes the link", async () => {
		const { FROM_LISTING, useBackToListing } = await load();
		entryState = { ...FROM_LISTING };
		render(<Arrow hook={useBackToListing} />);
		expect(fireEvent.click(screen.getByRole("link", { name: "Back to News" }))).toBe(true);
		expect(back).not.toHaveBeenCalled();
	});

	it("a click that opens a new tab or window keeps the link's own behaviour", async () => {
		const { FROM_LISTING, useBackToListing } = await load();
		entryState = { ...FROM_LISTING };
		canGoBack = true;
		render(<Arrow hook={useBackToListing} />);
		const link = screen.getByRole("link");
		for (const mod of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
			expect(fireEvent.click(link, mod)).toBe(true);
		}
		expect(back).not.toHaveBeenCalled();
	});

	it("names where it leads: the listing (it opened the article, or nothing came before) or back elsewhere", async () => {
		const { backLabel } = await load();
		expect(backLabel(true, true)).toBe("Back to News");
		expect(backLabel(true, false)).toBe("Back");
		expect(backLabel(false, false)).toBe("Back to News");
		expect(backLabel(false, true)).toBe("Back to News");
	});

	it("the listing's links mark the article entry they push with exactly this state", async () => {
		const { FROM_LISTING } = await load();
		expect(FROM_LISTING).toEqual({ newsFromListing: true });
	});
});

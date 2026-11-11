import { describe, expect, it } from "vitest";
import { COLLECTION_NAMES } from "../live/catalog";
import { APP_TITLE, titleFor } from "../titles";

const known = { knownStock: (s: string) => s === "AAPL" || s === "BRK.B" };

describe("titleFor: the root names a page only once it knows the page is real (N11c)", () => {
	it("names the screens a path alone decides", () => {
		expect(titleFor("/home")).toBe("Home · STAK");
		expect(titleFor("/news")).toBe("News · STAK");
		expect(titleFor("/discover/end")).toBe("Deck complete · Discover · STAK");
		expect(titleFor("/simulate/picks/nvda", { knownStock: (s) => s === "NVDA" })).toBe("NVDA · Simulate · STAK");
		expect(titleFor("/profile/help")).toBe("Help & support · STAK");
		expect(titleFor("/login")).toBe("Sign in · STAK");
		expect(titleFor("/onboarding")).toBe("Welcome · STAK");
		expect(titleFor("/splash")).toBe("STAK");
	});

	it("leaves the marketing page its own title", () => {
		expect(titleFor("/welcome")).toBeNull();
		expect(titleFor("/no-such-page")).toBeNull();
	});

	it("keeps the document's title on / while it sends the person on (no 'STAK' between index.html's title and the landing page's)", () => {
		expect(titleFor("/")).toBeNull();
		// a 404 is still the app's own page
		expect(titleFor("/", { notFound: true })).toBe(APP_TITLE);
	});

	it("names a pick page's symbol only when the catalog lists it, as a stock page (review r2's low 7)", () => {
		const nvda = { knownStock: (s: string) => s === "NVDA" };
		expect(titleFor("/simulate/picks/NVDA", nvda)).toBe("NVDA · Simulate · STAK");
		expect(titleFor("/simulate/picks/%20nvda", nvda)).toBe("NVDA · Simulate · STAK");
		// an unknown symbol is sent on to the Portfolio: it never wears 'NOSUCH · Simulate'
		expect(titleFor("/simulate/picks/NOSUCH", nvda)).toBe("STAK");
		// the catalog has not arrived: nothing is verified yet
		expect(titleFor("/simulate/picks/NVDA")).toBe("STAK");
		expect(titleFor("/simulate/picks/%E0%A4%A", nvda)).toBe("STAK");
	});

	it("titles the app's 404 STAK wherever it is drawn", () => {
		// outside the app (it used to keep the landing page's title), inside the shell, and over a path with a name of its own
		expect(titleFor("/no-such-page", { notFound: true })).toBe(APP_TITLE);
		expect(titleFor("/profile/no-such", { notFound: true })).toBe("STAK");
		expect(titleFor("/news/a/b", { notFound: true })).toBe("STAK");
		expect(titleFor("/home", { notFound: true })).toBe("STAK");
		// a path of the app no screen answers to
		expect(titleFor("/news/a/b")).toBe("STAK");
		expect(titleFor("/profile/no-such")).toBe("STAK");
	});

	it("never calls an article page 'Article' before the page knows the story exists", () => {
		// the article page writes its own headline; an unknown id is the 404, and both read STAK until then
		expect(titleFor("/news/fed-minutes")).toBe("STAK");
		expect(titleFor("/news/no-such-story")).toBe("STAK");
	});

	it("titles a stock page by its symbol only when the catalog lists it", () => {
		expect(titleFor("/stocks/AAPL", known)).toBe("AAPL · STAK");
		expect(titleFor("/stocks/aapl", known)).toBe("AAPL · STAK");
		expect(titleFor("/stocks/BRK.B", known)).toBe("BRK.B · STAK");
		expect(titleFor("/stocks/%20aapl%20", known)).toBe("AAPL · STAK");
		expect(titleFor("/stocks/NOSUCH", known)).toBe("STAK");
		// the catalog has not arrived (the default asks the catalog module, empty in this test): nothing is verified yet
		expect(titleFor("/stocks/AAPL")).toBe("STAK");
		// a malformed escape is no symbol, and must not throw in the root's effect
		expect(titleFor("/stocks/%E0%A4%A", known)).toBe("STAK");
	});

	it("names each of the seven collections (C-17) and falls back for a slug that names none", () => {
		const titles = Object.fromEntries(Object.keys(COLLECTION_NAMES).map((slug) => [slug, titleFor(`/my-stak/${slug}`)]));
		expect(titles).toEqual({
			"ai-tech": "AI & Tech · My STAK · STAK",
			finance: "Finance · My STAK · STAK",
			"green-energy": "Green Energy · My STAK · STAK",
			"real-estate": "Real Estate · My STAK · STAK",
			healthcare: "Healthcare · My STAK · STAK",
			consumer: "Consumer · My STAK · STAK",
			other: "Other · My STAK · STAK",
		});
		expect(titleFor("/my-stak")).toBe("My STAK · STAK");
		expect(titleFor("/my-stak/no-such")).toBe("Collection · My STAK · STAK");
		// an object's own inherited keys are not collections
		expect(titleFor("/my-stak/constructor")).toBe("Collection · My STAK · STAK");
		expect(titleFor("/my-stak/toString")).toBe("Collection · My STAK · STAK");
	});
});

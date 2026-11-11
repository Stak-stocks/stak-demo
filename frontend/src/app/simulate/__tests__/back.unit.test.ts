import { describe, expect, it } from "vitest";
import { isAppPage, pickBack, popBack, popBackOver, previousEntries, previousEntry, receiptExit } from "../back";

const origin = "http://localhost:3100";
const nav = (urls: string[], index: number) => ({
	currentEntry: { url: urls[index] ?? null, index },
	entries: () => urls.map((url, i) => ({ url, index: i })),
});
const url = (path: string) => new URL(path, origin);

describe("the entry before this page (D2)", () => {
	it("is the app page before, only on this site", () => {
		expect(previousEntry(nav([`${origin}/profile`, `${origin}/simulate/leaderboard`], 1), origin)?.pathname).toBe("/profile");
		expect(previousEntry(nav(["https://example.com/", `${origin}/simulate/leaderboard`], 1), origin)).toBeNull();
		expect(previousEntry(nav([`${origin}/simulate/leaderboard`], 0), origin)).toBeNull();
		expect(previousEntry(undefined, origin)).toBeNull();
	});

	it("lists every entry before this one, the nearest first, up to the first that is not this site's", () => {
		const urls = ["https://example.com/", `${origin}/simulate`, `${origin}/simulate/portfolio`, `${origin}/simulate/picks/TSLA`, `${origin}/simulate/picks/TSLA?modal=sell-success`];
		expect(previousEntries(nav(urls, 4), origin).map((u) => u.pathname + u.search)).toEqual(["/simulate/picks/TSLA", "/simulate/portfolio", "/simulate"]);
		// the entries after the current one (Forward) are not before it
		expect(previousEntries(nav(urls, 2), origin).map((u) => u.pathname)).toEqual(["/simulate"]);
		expect(previousEntries(nav(urls, 0), origin)).toEqual([]);
		expect(previousEntries(undefined, origin)).toEqual([]);
	});
});

describe("the app's own pages (D2: Back returns to one of the app's pages)", () => {
	it("are the shell's routes", () => {
		for (const path of ["/home", "/news", "/news/fed-minutes", "/discover", "/discover/end", "/my-stak", "/my-stak/ai-tech", "/simulate", "/simulate/", "/simulate/portfolio", "/simulate/picks/NVDA", "/stocks/AAPL?saved=1", "/profile", "/profile/edit"]) {
			expect(isAppPage(url(path)), path).toBe(true);
		}
	});

	it("are not the landing page, the auth and recovery pages, onboarding, the splash or a 404", () => {
		for (const path of ["/", "/welcome", "/login", "/signup", "/forgot-password", "/check-email", "/reset-password", "/onboarding?step=2", "/splash", "/no-such-page", "/homework"]) {
			expect(isAppPage(url(path)), path).toBe(false);
		}
	});
});

describe("the Portfolio's and the Leaderboard's Back: the phones pop", () => {
	it("steps back to the page it was opened from", () => {
		expect(popBack(url("/simulate"), "/simulate")).toEqual({ kind: "history" });
		expect(popBack(url("/profile"), "/simulate")).toEqual({ kind: "history" });
		expect(popBack(url("/home?notifications=1"), "/simulate")).toEqual({ kind: "history" });
	});

	it("goes to Simulate home with no app page before, or with a sheet before (never reopens a receipt)", () => {
		expect(popBack(null, "/simulate")).toEqual({ kind: "page", to: "/simulate", replace: false });
		expect(popBack(url("/simulate/picks/NVDA?modal=sell-success&portion=0.5"), "/simulate")).toEqual({ kind: "page", to: "/simulate", replace: false });
	});

	it("goes to Simulate home when the page before is not one of the app's (the login page, the landing page ...)", () => {
		for (const prev of ["/", "/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/check-email", "/onboarding?step=2", "/splash", "/no-such-page"]) {
			expect(popBack(url(prev), "/simulate"), prev).toEqual({ kind: "page", to: "/simulate", replace: false });
		}
		// an app page with an ordinary query is still a page
		expect(popBack(url("/stocks/NVDA?saved=1&from=my-stak"), "/simulate")).toEqual({ kind: "history" });
	});

	it("steps over the pick page a receipt's View portfolio left below the Portfolio (the phones' popUpTo leaves none)", () => {
		const pick = "/simulate/picks/AMD";
		expect(popBackOver([url(pick), url("/simulate")], "/simulate", pick)).toEqual({ kind: "history", steps: 2 });
		expect(popBackOver([url(pick), url("/home?notifications=1")], "/simulate", pick)).toEqual({ kind: "history", steps: 2 });
		// the receipt's own entry was over the pick's: two entries of the pick, both left behind
		expect(popBackOver([url(pick), url(`${pick}?modal=sell-confirm`), url("/simulate")], "/simulate", pick)).toEqual({ kind: "history", steps: 3 });
		// nothing of the app below the pick: the natural parent
		expect(popBackOver([url(pick)], "/simulate", pick)).toEqual({ kind: "page", to: "/simulate", replace: false });
		expect(popBackOver([url(pick), url("/login")], "/simulate", pick)).toEqual({ kind: "page", to: "/simulate", replace: false });
		// another pick, or no pick named: nothing is stepped over
		expect(popBackOver([url("/simulate/picks/TSLA"), url("/simulate")], "/simulate", pick)).toEqual({ kind: "history", steps: 1 });
		expect(popBackOver([url("/simulate")], "/simulate", undefined)).toEqual({ kind: "history", steps: 1 });
		expect(popBackOver([], "/simulate", pick)).toEqual({ kind: "page", to: "/simulate", replace: false });
	});
});

describe("the sell receipt's ways out leave the pick behind (B19; android StakNavHost.kt:638-647)", () => {
	const pick = "/simulate/picks/TSLA";
	const entries = (...paths: string[]) => paths.map(url);

	it("steps back to the Portfolio when it is below the pick (the receipt over the pick's own entry)", () => {
		expect(receiptExit(entries(pick, "/simulate/portfolio", "/simulate"), pick, "/simulate/portfolio")).toEqual({ kind: "history", steps: 2 });
		// a receipt handed over from the Portfolio's own sheet replaced that sheet's entry: the Portfolio is right below
		expect(receiptExit(entries("/simulate/portfolio?variant=alt", "/simulate"), pick, "/simulate/portfolio")).toEqual({ kind: "history", steps: 1 });
	});

	it("steps back to Simulate home over the Simulate pages between (the phones' popToShell)", () => {
		expect(receiptExit(entries(pick, "/simulate/portfolio", "/simulate"), pick, "/simulate")).toEqual({ kind: "history", steps: 3 });
		expect(receiptExit(entries(pick, "/simulate/leaderboard", "/simulate/portfolio", "/simulate?variant=alt"), pick, "/simulate")).toEqual({ kind: "history", steps: 4 });
		expect(receiptExit(entries(pick, "/simulate"), pick, "/simulate")).toEqual({ kind: "history", steps: 2 });
	});

	it("puts the page in the receipt's place when it is not below, or another page is in the way", () => {
		expect(receiptExit(entries(pick, "/simulate"), pick, "/simulate/portfolio")).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, over: pick });
		expect(receiptExit(entries(pick, "/home?notifications=1"), pick, "/simulate")).toEqual({ kind: "page", to: "/simulate", replace: true, over: pick });
		expect(receiptExit(entries(pick, "/home", "/simulate"), pick, "/simulate")).toEqual({ kind: "page", to: "/simulate", replace: true, over: pick });
		expect(receiptExit(entries(pick), pick, "/simulate/portfolio")).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, over: pick });
		expect(receiptExit([], pick, "/simulate")).toEqual({ kind: "page", to: "/simulate", replace: true, over: pick });
	});

	it("never steps back to a sheet over the page", () => {
		expect(receiptExit(entries("/simulate/portfolio?modal=sell-confirm&symbol=NVDA", "/simulate"), pick, "/simulate/portfolio")).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, over: pick });
		expect(receiptExit(entries(pick, "/simulate?modal=add-success&symbol=HOOD"), pick, "/simulate")).toEqual({ kind: "page", to: "/simulate", replace: true, over: pick });
	});

	// coordinator ruling N27m (2026-11-09; the hunt's I-07 / ST-22): after View portfolio on a Position closed receipt the
	// browser's Back was a dead press, because the closed pick's own entry stayed below the Portfolio and only sent the
	// step on to the Portfolio again
	it("puts the page in the place of the closed pick's own entry, so no pick is left below it", () => {
		// opened from Simulate home, sold in full: the Portfolio takes the pick's entry (a step back, then the replace)
		expect(receiptExit(entries(pick, "/simulate"), pick, "/simulate/portfolio", true)).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, below: true });
		// opened from the inbox, sold in full, Back to Simulate: Simulate home takes the pick's entry
		expect(receiptExit(entries(pick, "/home?notifications=1"), pick, "/simulate", true)).toEqual({ kind: "page", to: "/simulate", replace: true, below: true });
		expect(receiptExit(entries(pick), pick, "/simulate/portfolio", true)).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, below: true });
	});

	it("still steps back to the page when it is below the closed pick", () => {
		expect(receiptExit(entries(pick, "/simulate/portfolio", "/simulate"), pick, "/simulate/portfolio", true)).toEqual({ kind: "history", steps: 2 });
		expect(receiptExit(entries(pick, "/simulate"), pick, "/simulate", true)).toEqual({ kind: "history", steps: 2 });
	});

	it("keeps the pick's page below after a part sale, and when the entry below is not the pick's own page", () => {
		// a part sale: the pick is still a page to return to
		expect(receiptExit(entries(pick, "/simulate"), pick, "/simulate/portfolio", false)).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, over: pick });
		// a receipt reached by its address, or handed over from the Portfolio's sheet: nothing of the pick's is below
		expect(receiptExit([], pick, "/simulate/portfolio", true)).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, over: pick });
		expect(receiptExit(entries("/home"), pick, "/simulate/portfolio", true)).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, over: pick });
		expect(receiptExit(entries(`${pick}?modal=sell-confirm`, "/home"), pick, "/simulate/portfolio", true)).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true, over: pick });
	});
});

describe("a pick's Back lands on the Portfolio (B17)", () => {
	it("steps back when the Portfolio is the page below", () => {
		expect(pickBack(url("/simulate/portfolio"))).toEqual({ kind: "history" });
		expect(pickBack(url("/simulate/portfolio?variant=alt"))).toEqual({ kind: "history" });
	});

	it("puts the Portfolio in the pick's place otherwise", () => {
		for (const prev of [url("/simulate"), url("/home"), url("/simulate/portfolio?modal=sell-confirm&symbol=NVDA"), null]) {
			expect(pickBack(prev)).toEqual({ kind: "page", to: "/simulate/portfolio", replace: true });
		}
	});
});

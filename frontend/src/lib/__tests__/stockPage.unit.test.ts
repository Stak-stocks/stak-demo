import { afterEach, describe, expect, it, vi } from "vitest";
import { beatsPeers, lessonFor, parsePct, pricesAsOf, rangeChangeText, sinceSavedFor } from "../stockPage";

describe("rangeChangeText", () => {
	it("names the period, and rewrites 1D's suffix outside market hours", () => {
		expect(rangeChangeText(-15.44, "1y")).toBe("▼ 15.4% past year");
		expect(rangeChangeText(2.04, "3m")).toBe("▲ 2.0% past 3 months");
		expect(rangeChangeText(1.2, "1d", new Date("2026-09-23T15:00:00Z"))).toBe("▲ 1.2% today"); // Wed 11:00 ET
		expect(rangeChangeText(1.2, "1d", new Date("2026-09-26T15:00:00Z"))).toBe("▲ 1.2% on Friday"); // Saturday
	});
});

describe("beatsPeers", () => {
	it("needs a lead of more than 10% of the median, and at least a point", () => {
		expect(beatsPeers(30, 20)).toBe(true);
		expect(beatsPeers(21, 20)).toBe(false);
		expect(beatsPeers(1.5, 0.2)).toBe(true);
		expect(beatsPeers(null, 20)).toBe(false);
		expect(parsePct("6.1%")).toBe(6.1);
		expect(parsePct("-3.2%")).toBe(-3.2);
	});
});

describe("sinceSavedFor", () => {
	const now = new Date("2026-09-26T15:00:00Z");
	const day = 86_400_000;
	it("says a same-day save hasn't moved yet", () => {
		expect(sinceSavedFor({ symbol: "NVDA", savedAt: now.getTime(), priceAtSave: 100, price: 110, loading: false, now })).toMatchObject({ value: "+0.0%", tone: "muted" });
	});
	it("measures the move from the price stamped at save", () => {
		const r = sinceSavedFor({ symbol: "NVDA", savedAt: now.getTime() - 3 * day, priceAtSave: 100, price: 110, loading: false, now });
		expect(r).toMatchObject({ value: "+10.0%", tone: "up" });
		expect(r.body).toBe("Saved 3 days ago. NVDA is up 10.0% since you saved it.");
	});
	it("is honest about what it can't measure", () => {
		expect(sinceSavedFor({ symbol: "NVDA", savedAt: now.getTime() - day, priceAtSave: null, price: 110, loading: false, now }).body).toContain("STAK has no record of what NVDA cost then");
		expect(sinceSavedFor({ symbol: "NVDA", savedAt: now.getTime() - day, priceAtSave: 100, price: null, loading: false, now }).body).toContain("Today's price isn't available");
		expect(sinceSavedFor({ symbol: "NVDA", savedAt: now.getTime() - day, priceAtSave: 100, price: null, loading: true, now })).toMatchObject({ value: "—", body: "Saved yesterday." });
	});
});

describe("lessonFor", () => {
	it("picks the lesson for the collection a stock is in, else the general one", () => {
		expect(lessonFor("NVDA").title).toBe("Why chip stocks swing so hard");
		expect(lessonFor("JPM").title).toBe("How interest rates move bank profits");
		expect(lessonFor("ZZZZ").title).toBe("What actually moves a stock price");
	});
});

describe("pricesAsOf", () => {
	afterEach(() => { vi.useRealTimers(); });

	it("says when the price was fetched, and that it's delayed when that's over 2 minutes ago while open", () => {
		vi.useFakeTimers();
		const now = new Date("2026-09-23T15:00:00Z"); // Wed 11:00 ET
		vi.setSystemTime(now);
		expect(pricesAsOf(now.getTime() - 30_000)).toMatch(/^As of /);
		expect(pricesAsOf(now.getTime() - 5 * 60_000)).toMatch(/^Delayed · as of /);
		// An older server sends no time: now.
		expect(pricesAsOf(undefined)).toMatch(/^As of /);
	});

	it("names the close outside market hours, however old", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-09-26T15:00:00Z")); // Saturday
		expect(pricesAsOf(Date.now() - 3 * 86_400_000)).toBe("At Friday's close");
	});
});

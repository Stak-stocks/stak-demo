import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { buildDeckOrder, DECK_SIZE, DECK_THEMES, fitHeadline, HEADLINE_MAX } from "../deck";
import { emptyLocal, sanitize, seedGuest } from "../guest";
import { isShowcase } from "../showcase";
import type { Live } from "../store";
import { demoQuote, hasDemoQuote } from "../quotes";

describe("fitHeadline", () => {
	it("keeps a short first sentence as it is", () => {
		expect(fitHeadline("Chip demand is outrunning supply, and NVIDIA sets the prices. More follows.")).toBe("Chip demand is outrunning supply, and NVIDIA sets the prices.");
	});
	it("cuts a long sentence at a word and never exceeds the two-line budget", () => {
		const long = "A company that keeps buying smaller companies because every one of them owns a tiny slice of a market nobody else wants.";
		const out = fitHeadline(long);
		expect(out.length).toBeLessThanOrEqual(HEADLINE_MAX);
		expect(out.endsWith("…")).toBe(true);
		expect(out).not.toMatch(/\s…$/);
	});
});

describe("sanitize", () => {
	it("keeps well-typed fields and drops the rest", () => {
		const base = seedGuest();
		const out = sanitize(base, { cash: 42, displayName: 7, saves: "nope", positions: [], deck: { bad: true }, extra: 1 });
		expect(out.cash).toBe(42);
		expect(out.displayName).toBe(base.displayName);
		expect(out.saves).toBe(base.saves);
		expect(out.positions).toEqual([]);
		expect(out.deck).toBeNull();
		expect("extra" in out).toBe(false);
	});
	it("accepts a valid deck and a null deck, rejects NaN and non-objects", () => {
		const deck = { date: "2026-10-09", theme: "ai-chips", order: ["AAPL"], index: 0, saved: [], passed: [], bought: [] };
		expect(sanitize(emptyLocal(), { deck }).deck).toEqual(deck);
		expect(sanitize(emptyLocal(), { deck: null, completedDecks: Number.NaN }).completedDecks).toBe(0);
		expect(sanitize(emptyLocal(), "garbage")).toEqual(emptyLocal());
		expect(sanitize(emptyLocal(), [1, 2])).toEqual(emptyLocal());
	});
});

describe("buildDeckOrder", () => {
	beforeAll(() => loadCatalog());
	it("is deterministic, twelve long, pins the frame's three companies and skips exclusions", () => {
		const theme = DECK_THEMES[0]!;
		const a = buildDeckOrder(theme, new Set(["MSFT"]), "2026-10-09:ai-chips:guest", true);
		const b = buildDeckOrder(theme, new Set(["MSFT"]), "2026-10-09:ai-chips:guest", true);
		expect(a).toEqual(b);
		expect(a).toHaveLength(DECK_SIZE);
		expect(a.slice(0, 3)).toEqual(["NVDA", "AAPL", "GOOGL"]);
		expect(a).not.toContain("MSFT");
		expect(new Set(a).size).toBe(DECK_SIZE);
		expect(a.every(hasDemoQuote)).toBe(true);
	});
	it("draws on the whole catalog when the API is up", () => {
		const theme = DECK_THEMES[1]!;
		const live = buildDeckOrder(theme, new Set(), "seed", false);
		expect(live).toHaveLength(DECK_SIZE);
		expect(live).not.toEqual(buildDeckOrder(theme, new Set(), "other-seed", false));
	});
});

describe("demoQuote", () => {
	it("returns one stable object per ticker and null for unknown symbols", () => {
		expect(demoQuote("aapl")).toBe(demoQuote("AAPL"));
		expect(demoQuote("AAPL")?.price).toBeGreaterThan(0);
		expect(demoQuote("ZZZZ")).toBeNull();
	});
});

describe("isShowcase", () => {
	const asLive = (s: ReturnType<typeof seedGuest>, extra: Record<string, unknown> = {}) =>
		({ signedIn: false, ...s, savedTickers: new Set(s.saves.map((x) => x.ticker)), ...extra }) as unknown as Live;

	it("is the untouched seed, and ends for good once touched (D7 refined)", () => {
		const seed = seedGuest();
		expect(seed.touched).toBe(false);
		expect(isShowcase(asLive(seed))).toBe(true);
		expect(isShowcase(asLive(seed, { touched: true }))).toBe(false);
		expect(isShowcase(asLive({ ...seed, cash: 8700 }))).toBe(false);
		expect(isShowcase(asLive(seed, { signedIn: true }))).toBe(false);
		// a browser that stored the persona before the flag existed keeps the seed's false
		expect(sanitize(seedGuest(), { ...seed, touched: undefined }).touched).toBe(false);
		expect(sanitize(seedGuest(), { ...seed, touched: true }).touched).toBe(true);
	});
});

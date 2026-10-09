import { afterEach, describe, expect, it, vi } from "vitest";
import { cn, getDeckDayStart } from "../utils";

describe("cn", () => {
	it("returns empty string with no arguments", () => {
		expect(cn()).toBe("");
	});

	it("joins multiple class strings", () => {
		expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
	});

	it("ignores falsy values", () => {
		expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
	});

	it("handles conditional object syntax", () => {
		expect(cn({ active: true, hidden: false })).toBe("active");
	});

	it("deduplicates conflicting Tailwind classes (last wins)", () => {
		// tailwind-merge: p-4 overrides p-2
		expect(cn("p-2", "p-4")).toBe("p-4");
	});

	it("deduplicates text color conflicts", () => {
		expect(cn("text-red-500", "text-green-500")).toBe("text-green-500");
	});

	it("merges conditional and string inputs together", () => {
		const isActive = true;
		expect(cn("base-class", { "is-active": isActive })).toBe("base-class is-active");
	});

	it("handles array inputs via clsx", () => {
		expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
	});
});

describe("getDeckDayStart", () => {
	afterEach(() => vi.useRealTimers());

	it("is 9 AM today from 9 AM on, and 9 AM yesterday before it", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 9, 14, 30));
		expect(getDeckDayStart()).toEqual(new Date(2026, 9, 9, 9));
		vi.setSystemTime(new Date(2026, 9, 9, 8, 59));
		expect(getDeckDayStart()).toEqual(new Date(2026, 9, 8, 9));
	});
});

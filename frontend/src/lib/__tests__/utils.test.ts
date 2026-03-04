import { describe, expect, it } from "vitest";
import { cn } from "../utils";

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

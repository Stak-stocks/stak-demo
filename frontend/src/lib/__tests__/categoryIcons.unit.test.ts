import { describe, expect, it } from "vitest";
import { assertCategoryIconsComplete } from "@/lib/categoryIcons";

describe("categoryIcons", () => {
	it("has an explicit icon for every CATEGORY_NAMES display name", () => {
		expect(() => assertCategoryIconsComplete()).not.toThrow();
	});
});

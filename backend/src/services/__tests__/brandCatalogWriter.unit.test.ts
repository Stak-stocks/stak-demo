import { describe, expect, it } from "vitest";
import { serialize, appendBeforeArrayClose, validateDraft } from "../brandCatalogWriter.js";
import type { BrandDraft } from "../brandGenerationService.js";

function makeDraft(overrides: Partial<BrandDraft> = {}): BrandDraft {
	return {
		id: "test",
		ticker: "TEST",
		name: "Test Co",
		bio: "bio",
		heroImage: "",
		personalityDescription: "",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 50, color: "#000" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#000" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#000" },
		],
		culturalContext: { title: "", sections: [] },
		financials: {
			peRatio: { label: "", value: "", explanation: "", culturalTranslation: "" },
			marketCap: { label: "", value: "", explanation: "", culturalTranslation: "" },
			revenueGrowth: { label: "", value: "", explanation: "", culturalTranslation: "" },
			profitMargin: { label: "", value: "", explanation: "", culturalTranslation: "" },
			beta: { label: "", value: "", explanation: "", culturalTranslation: "" },
			dividendYield: { label: "", value: "", explanation: "", culturalTranslation: "" },
		},
		peerTickers: [],
		sourceSection: "New additions",
		primaryCategory: "default_tech",
		displayTags: [],
		learningTags: [{ tag: "technology", weight: 0.75 }],
		...overrides,
	};
}

describe("serialize", () => {
	it("serializes primitives and trailing-comma'd objects/arrays with the given indent unit", () => {
		expect(serialize("a", "\t", 0)).toBe('"a"');
		expect(serialize(42, "\t", 0)).toBe("42");
		expect(serialize(null, "\t", 0)).toBe("null");
		expect(serialize([], "\t", 0)).toBe("[]");
		expect(serialize({}, "\t", 0)).toBe("{}");
	});

	it("indents nested structures using the given indent unit and adds trailing commas", () => {
		const result = serialize({ a: [1, 2] }, "  ", 0);
		expect(result).toBe('{\n  "a": [\n    1,\n    2,\n  ],\n}');
	});

	it("omits keys whose value is undefined (e.g. an absent optional field)", () => {
		const result = serialize({ a: 1, b: undefined, c: 2 }, "\t", 0);
		expect(result).not.toContain("\"b\"");
		expect(result).toContain("\"a\": 1");
		expect(result).toContain("\"c\": 2");
	});
});

describe("appendBeforeArrayClose", () => {
	it("inserts before the close marker unchanged when the prior entry already ends in a comma", () => {
		const fileText = "const x = [\n  1,\n  2,\n];\n";
		const result = appendBeforeArrayClose(fileText, "];", "  3,\n");
		expect(result).toBe("const x = [\n  1,\n  2,\n  3,\n];\n");
	});

	it("inserts a trailing comma after the prior entry when it doesn't already have one -- the exact bug this guards against", () => {
		const fileText = "const x = [\n  1,\n  2\n] as const;\n";
		const result = appendBeforeArrayClose(fileText, "] as const;", "  3,\n");
		expect(result).toBe("const x = [\n  1,\n  2,\n  3,\n] as const;\n");
	});

	it("throws if the close marker isn't found", () => {
		expect(() => appendBeforeArrayClose("const x = [1, 2]", "] as const;", "")).toThrow();
	});
});

describe("validateDraft", () => {
	it("accepts a well-formed draft", () => {
		expect(validateDraft(makeDraft(), new Set())).toEqual([]);
	});

	it("rejects a ticker that already exists in the catalog", () => {
		const errors = validateDraft(makeDraft({ ticker: "AAPL" }), new Set(["AAPL"]));
		expect(errors.some((e) => e.includes("already exists"))).toBe(true);
	});

	it("rejects a lowercase ticker", () => {
		const errors = validateDraft(makeDraft({ ticker: "test" }), new Set());
		expect(errors.some((e) => e.includes("uppercase"))).toBe(true);
	});

	it("rejects a draft without exactly 3 vibes", () => {
		const errors = validateDraft(makeDraft({ vibes: [] }), new Set());
		expect(errors.some((e) => e.includes("vibes"))).toBe(true);
	});

	it("rejects a draft with no learningTags", () => {
		const errors = validateDraft(makeDraft({ learningTags: [] }), new Set());
		expect(errors.some((e) => e.includes("learningTags"))).toBe(true);
	});
});

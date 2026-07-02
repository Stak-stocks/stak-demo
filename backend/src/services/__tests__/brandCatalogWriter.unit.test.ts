import { describe, expect, it, afterEach } from "vitest";
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { serialize, appendBeforeArrayClose, validateDraft, commitBrandDrafts, countEntries, createNewChunkFile } from "../brandCatalogWriter.js";
import type { BrandDraft } from "../brandGenerationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRANDS_DIR = path.resolve(__dirname, "../../../../shared/src/brands");

function makeDraft(overrides: Partial<BrandDraft> = {}): BrandDraft {
	return {
		id: "test",
		ticker: "TEST",
		name: "Test Co",
		bio: "bio",
		heroImage: "",
		personalityDescription: "personality",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 50, color: "#000" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#000" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#000" },
		],
		culturalContext: { title: "title", sections: [{ heading: "What They Do", content: "content" }] },
		financials: {
			peRatio: { label: "", value: "", explanation: "", culturalTranslation: "trans" },
			marketCap: { label: "", value: "", explanation: "", culturalTranslation: "trans" },
			revenueGrowth: { label: "", value: "", explanation: "", culturalTranslation: "trans" },
			profitMargin: { label: "", value: "", explanation: "", culturalTranslation: "trans" },
			beta: { label: "", value: "", explanation: "", culturalTranslation: "trans" },
			dividendYield: { label: "", value: "", explanation: "", culturalTranslation: "trans" },
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

describe("countEntries", () => {
	it("counts each top-level array entry by its 1-tab-indented opening brace", () => {
		const fileText = "export const x = [\r\n\t{\r\n\t\t\"a\": 1,\r\n\t},\r\n\t{\r\n\t\t\"a\": 2,\r\n\t},\r\n];\r\n";
		expect(countEntries(fileText)).toBe(2);
	});

	it("does not count nested objects (e.g. financials.peRatio) at deeper indent levels", () => {
		const fileText = "export const x = [\r\n\t{\r\n\t\t\"financials\": {\r\n\t\t\t\"peRatio\": {\r\n\t\t\t\t\"value\": 1,\r\n\t\t\t},\r\n\t\t},\r\n\t},\r\n];\r\n";
		expect(countEntries(fileText)).toBe(1);
	});

	it("matches the real chunk files' known entry counts (100, 100, 100, 33)", () => {
		const counts = ["chunk-01", "chunk-02", "chunk-03", "chunk-04"].map((f) =>
			countEntries(readFileSync(path.join(BRANDS_DIR, `${f}.ts`), "utf-8")),
		);
		expect(counts).toEqual([100, 100, 100, 33]);
	});
});

describe("createNewChunkFile", () => {
	// Uses an obviously-fake chunk number (99) so this can never collide with a
	// real chunk file, and cleans up both the new file and index.ts's edits.
	afterEach(() => {
		const indexPath = path.join(BRANDS_DIR, "index.ts");
		const chunk99Path = path.join(BRANDS_DIR, "chunk-99.ts");
		try {
			const indexText = readFileSync(indexPath, "utf-8");
			if (indexText.includes("brandsChunk99")) {
				const cleaned = indexText
					.replace(/import \{ brandsChunk99 \} from "\.\/chunk-99";\r?\n/, "")
					.replace(/\t\.\.\.brandsChunk99,\r\n/, "");
				writeFileSync(indexPath, cleaned);
			}
		} catch { /* index.ts read failed -- nothing to clean there */ }
		try { unlinkSync(chunk99Path); } catch { /* never created -- fine */ }
	});

	it("writes a new chunk file with the given entries and registers it in index.ts", () => {
		const draft = makeDraft({ ticker: "ZZZNEWCHUNK", id: "zzznewchunk" });
		const { sourceSection, primaryCategory, displayTags, learningTags, ...brandProfile } = draft;
		void sourceSection; void primaryCategory; void displayTags; void learningTags;

		const result = createNewChunkFile(99, [brandProfile]);
		expect(result).toEqual({ fileName: "chunk-99.ts", exportName: "brandsChunk99" });

		const chunkText = readFileSync(path.join(BRANDS_DIR, "chunk-99.ts"), "utf-8");
		expect(chunkText).toContain("export const brandsChunk99: BrandProfile[] = [");
		expect(chunkText).toContain("\"ticker\": \"ZZZNEWCHUNK\"");
		expect(countEntries(chunkText)).toBe(1);

		const indexText = readFileSync(path.join(BRANDS_DIR, "index.ts"), "utf-8");
		expect(indexText).toContain('import { brandsChunk99 } from "./chunk-99";');
		expect(indexText).toContain("...brandsChunk99,");
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

	// These 4 catch the realistic failure mode this validation exists for: a
	// Gemini response that JSON.parse()s fine but is missing or short on a
	// field, since generateBrandDraft() never shape-checks the AI response itself.
	it("rejects a draft with no personalityDescription", () => {
		const errors = validateDraft(makeDraft({ personalityDescription: "" }), new Set());
		expect(errors.some((e) => e.includes("personalityDescription"))).toBe(true);
	});

	it("rejects a draft with empty culturalContext.sections", () => {
		const errors = validateDraft(makeDraft({ culturalContext: { title: "t", sections: [] } }), new Set());
		expect(errors.some((e) => e.includes("culturalContext.sections"))).toBe(true);
	});

	it("rejects a culturalContext section missing heading or content", () => {
		const errors = validateDraft(makeDraft({ culturalContext: { title: "t", sections: [{ heading: "", content: "x" }] } }), new Set());
		expect(errors.some((e) => e.includes("missing heading or content"))).toBe(true);
	});

	it("rejects a draft missing a financials culturalTranslation", () => {
		const draft = makeDraft();
		draft.financials.beta.culturalTranslation = "";
		const errors = validateDraft(draft, new Set());
		expect(errors.some((e) => e.includes("financials.beta.culturalTranslation"))).toBe(true);
	});
});

describe("commitBrandDrafts -- duplicate-ticker tracking across separate calls", () => {
	// commitBrandDrafts writes to the real shared/src/brands/<chunk>.ts and
	// stockTags.ts files (by design -- that's the whole point of this function).
	// Snapshot every chunk file + stockTags.ts before, restore after, so this
	// test never leaves the repo's actual catalog files modified.
	const snapshots = new Map<string, string>();

	function snapshotAllTargetFiles() {
		const stockTagsPath = path.resolve(BRANDS_DIR, "../stockTags.ts");
		snapshots.set(stockTagsPath, readFileSync(stockTagsPath, "utf-8"));
		for (const f of readdirSync(BRANDS_DIR).filter((f) => /^chunk-\d+\.ts$/.test(f))) {
			const p = path.join(BRANDS_DIR, f);
			snapshots.set(p, readFileSync(p, "utf-8"));
		}
	}

	afterEach(() => {
		for (const [filePath, content] of snapshots) writeFileSync(filePath, content);
		snapshots.clear();
	});

	it("rejects a second commit of the same ticker even though the in-memory `brands` import never reloads between calls", () => {
		snapshotAllTargetFiles();
		// Unique per test run (not a fixed literal) so re-running this file in
		// watch mode within the same process can't collide with a ticker the
		// module-level `committedThisProcess` Set already remembers from a
		// previous run in that same long-lived watch process.
		const ticker = `ZZZIT${Date.now()}`;
		const draft = makeDraft({ ticker, id: ticker.toLowerCase() });

		const first = commitBrandDrafts([draft]);
		expect(first.committed).toEqual([ticker]);
		expect(first.errors).toEqual([]);

		const second = commitBrandDrafts([draft]);
		expect(second.committed).toEqual([]);
		expect(second.errors).toEqual([
			{ ticker, errors: [`ticker "${ticker}" already exists in the catalog`] },
		]);
	});
});

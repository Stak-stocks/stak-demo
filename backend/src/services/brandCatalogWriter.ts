import { readFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { brands, type BrandProfile } from "@stak/shared";
import type { BrandDraft } from "./brandGenerationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/src/services -> repo root -> shared/src
const SHARED_SRC_DIR = path.resolve(__dirname, "../../../shared/src");
const BRANDS_DIR = path.join(SHARED_SRC_DIR, "brands");
const STOCKTAGS_FILE = path.join(SHARED_SRC_DIR, "stockTags.ts");

// ── Generic recursive serializer, parameterized by indent unit so appended
// entries match whichever style the target file already uses (tabs in the
// chunk files, two spaces in stockTags.ts) without reformatting anything
// already there. ──────────────────────────────────────────────────────────────

export function serialize(value: unknown, indentUnit: string, depth: number): string {
	const pad = indentUnit.repeat(depth);
	const padIn = indentUnit.repeat(depth + 1);
	if (value === null) return "null";
	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		const items = value.map((v) => `${padIn}${serialize(v, indentUnit, depth + 1)}`).join(",\n");
		return `[\n${items},\n${pad}]`;
	}
	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
		if (entries.length === 0) return "{}";
		const body = entries
			.map(([k, v]) => `${padIn}${JSON.stringify(k)}: ${serialize(v, indentUnit, depth + 1)}`)
			.join(",\n");
		return `{\n${body},\n${pad}}`;
	}
	return JSON.stringify(value);
}

function findLastChunkFile(): { fileName: string; exportName: string } {
	const files = readdirSync(BRANDS_DIR).filter((f) => /^chunk-\d+\.ts$/.test(f)).sort();
	if (files.length === 0) throw new Error(`No chunk-NN.ts files found in ${BRANDS_DIR}`);
	const lastFile = files[files.length - 1]!;
	const num = lastFile.match(/chunk-(\d+)\.ts/)![1];
	return { fileName: lastFile, exportName: `brandsChunk${num}` };
}

/** Inserts new entries right before a file's final top-level array's closing
 * bracket, leaving every byte before that point untouched (except adding a
 * trailing comma after the current last entry if it doesn't already have one
 * -- some existing files were authored without trailing commas on the last
 * item, which is otherwise valid JS/TS but breaks a naive text splice).
 * `closeMarker` is the exact text immediately after the array's last entry
 * (e.g. "];" or "] as const;"). */
export function appendBeforeArrayClose(fileText: string, closeMarker: string, newEntriesText: string): string {
	const idx = fileText.lastIndexOf(closeMarker);
	if (idx === -1) throw new Error(`Could not find "${closeMarker}" in file to append before`);

	let insertAt = idx;
	let lastChar = idx - 1;
	while (lastChar >= 0 && /\s/.test(fileText[lastChar]!)) lastChar--;
	if (lastChar >= 0 && fileText[lastChar] !== ",") {
		insertAt = lastChar + 1;
		return fileText.slice(0, insertAt) + "," + fileText.slice(insertAt, idx) + newEntriesText + fileText.slice(idx);
	}

	return fileText.slice(0, insertAt) + newEntriesText + fileText.slice(insertAt);
}

function appendBrandsToChunk(newBrands: BrandProfile[]): { fileName: string; exportName: string } {
	const { fileName, exportName } = findLastChunkFile();
	const filePath = path.join(BRANDS_DIR, fileName);
	const fileText = readFileSync(filePath, "utf-8");

	const entriesText = newBrands
		.map((b) => `\t${serialize(b, "\t", 1)},\r\n`)
		.join("");

	const updated = appendBeforeArrayClose(fileText, "];", entriesText);
	writeFileSync(filePath, updated);
	return { fileName, exportName };
}

function appendToStockTags(newTagConfigs: { ticker: string; sourceSection: string; primaryCategory: string; displayTags: string[]; learningTags: { tag: string; weight: number }[] }[]): void {
	const fileText = readFileSync(STOCKTAGS_FILE, "utf-8");

	const entriesText = newTagConfigs
		.map((cfg) => `  ${serialize(cfg, "  ", 1)},\r\n`)
		.join("");

	const updated = appendBeforeArrayClose(fileText, "] as const;", entriesText);
	writeFileSync(STOCKTAGS_FILE, updated);
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateDraft(draft: BrandDraft, existingTickers: Set<string>): string[] {
	const errors: string[] = [];
	const ticker = draft.ticker?.toUpperCase();
	if (!ticker) errors.push("ticker is required");
	else if (ticker !== draft.ticker) errors.push(`ticker "${draft.ticker}" must be uppercase`);
	else if (existingTickers.has(ticker)) errors.push(`ticker "${ticker}" already exists in the catalog`);
	if (!draft.id) errors.push("id is required");
	if (!draft.name) errors.push("name is required");
	if (!draft.bio) errors.push("bio is required");
	if (!draft.vibes || draft.vibes.length !== 3) errors.push(`vibes must have exactly 3 entries, got ${draft.vibes?.length ?? 0}`);
	if (!draft.primaryCategory) errors.push("primaryCategory is required");
	if (!draft.learningTags || draft.learningTags.length === 0) errors.push("learningTags must have at least 1 entry");
	return errors;
}

export interface CommitResult {
	committed: string[];
	chunkFile: string;
	errors: { ticker: string; errors: string[] }[];
}

/**
 * Takes one or more human-reviewed BrandDraft objects and appends them to the
 * real shared/src/brands/<last chunk>.ts and shared/src/stockTags.ts files --
 * by text-appending before each file's closing array bracket, never by
 * reformatting or re-serializing entries that are already there. Rejects any
 * draft that fails basic shape validation or duplicates an existing ticker;
 * valid drafts in the same batch still commit even if others are rejected.
 */
export function commitBrandDrafts(drafts: BrandDraft[]): CommitResult {
	const existingTickers = new Set(brands.map((b) => b.ticker.toUpperCase()));
	const valid: BrandDraft[] = [];
	const errors: { ticker: string; errors: string[] }[] = [];

	for (const draft of drafts) {
		const draftErrors = validateDraft(draft, existingTickers);
		if (draftErrors.length > 0) {
			errors.push({ ticker: draft.ticker ?? "(missing)", errors: draftErrors });
		} else {
			valid.push(draft);
			existingTickers.add(draft.ticker.toUpperCase()); // guard against dupes within the same batch
		}
	}

	if (valid.length === 0) {
		return { committed: [], chunkFile: "", errors };
	}

	const brandProfiles: BrandProfile[] = valid.map(({ sourceSection, primaryCategory, displayTags, learningTags, ...rest }) => rest);
	const { fileName } = appendBrandsToChunk(brandProfiles);

	const tagConfigs = valid.map((d) => ({
		ticker: d.ticker,
		sourceSection: d.sourceSection,
		primaryCategory: d.primaryCategory,
		displayTags: d.displayTags,
		learningTags: d.learningTags,
	}));
	appendToStockTags(tagConfigs);

	return { committed: valid.map((d) => d.ticker), chunkFile: fileName, errors };
}

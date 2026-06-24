/**
 * Generates a brand draft for one ticker and writes it to backend/drafts/<TICKER>.json
 * for human review -- never writes to the catalog directly. Review/edit the JSON,
 * then feed it to POST /api/admin/brands/commit (or write a small script that reads
 * the file and POSTs it) once it looks right.
 *
 * Run: npx tsx src/scripts/generateBrand.ts AAPL
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateBrandDraft } from "../services/brandGenerationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.resolve(__dirname, "../../drafts");

const ticker = process.argv[2];
if (!ticker) {
	console.error("Usage: npx tsx src/scripts/generateBrand.ts <TICKER>");
	process.exit(1);
}

console.log(`Generating draft for ${ticker.toUpperCase()}...`);
const draft = await generateBrandDraft(ticker);

mkdirSync(DRAFTS_DIR, { recursive: true });
const outPath = path.join(DRAFTS_DIR, `${draft.ticker}.json`);
writeFileSync(outPath, JSON.stringify(draft, null, 2));

console.log(`\nWrote draft to ${outPath}`);
console.log(`\nSummary:`);
console.log(`  name: ${draft.name}`);
console.log(`  bio: ${draft.bio}`);
console.log(`  primaryCategory: ${draft.primaryCategory}`);
console.log(`  displayTags: ${draft.displayTags.join(", ")}`);
console.log(`  learningTags: ${draft.learningTags.map((t) => `${t.tag}(${t.weight})`).join(", ")}`);
console.log(`  peerTickers: ${draft.peerTickers?.join(", ") || "(none)"}`);
console.log(`\nReview the file, then POST its contents (wrapped as { "drafts": [...] }) to /api/admin/brands/commit when ready.`);

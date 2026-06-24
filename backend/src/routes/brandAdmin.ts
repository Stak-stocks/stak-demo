import { Router, type Request } from "express";
import { generateBrandDraft } from "../services/brandGenerationService.js";
import { commitBrandDrafts } from "../services/brandCatalogWriter.js";
import type { BrandDraft } from "../services/brandGenerationService.js";

export const brandAdminRouter = Router();

function checkAdminSecret(req: Request): boolean {
	const secret = req.headers["x-admin-secret"];
	return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

// POST /api/admin/brands/generate — body: { ticker: string }
// Generates one draft for human review. Never writes to any file.
brandAdminRouter.post("/generate", async (req, res) => {
	if (!checkAdminSecret(req)) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	const ticker = (req.body?.ticker as string | undefined)?.trim();
	if (!ticker) {
		res.status(400).json({ error: "ticker is required" });
		return;
	}
	try {
		const draft = await generateBrandDraft(ticker);
		res.json({ draft });
	} catch (error) {
		console.error(`[Brand Admin] Error generating draft for ${ticker}:`, error);
		res.status(500).json({ error: error instanceof Error ? error.message : "Generation failed" });
	}
});

// POST /api/admin/brands/commit — body: { drafts: BrandDraft[] }
// Appends one or more human-reviewed drafts to the real catalog files.
brandAdminRouter.post("/commit", async (req, res) => {
	if (!checkAdminSecret(req)) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	const drafts = req.body?.drafts as BrandDraft[] | undefined;
	if (!Array.isArray(drafts) || drafts.length === 0) {
		res.status(400).json({ error: "drafts must be a non-empty array" });
		return;
	}
	try {
		const result = commitBrandDrafts(drafts);
		console.log(`[Brand Admin] Committed: ${result.committed.join(", ") || "(none)"}${result.errors.length > 0 ? `; rejected: ${result.errors.map((e) => e.ticker).join(", ")}` : ""}`);
		res.json(result);
	} catch (error) {
		console.error("[Brand Admin] Error committing drafts:", error);
		res.status(500).json({ error: error instanceof Error ? error.message : "Commit failed" });
	}
});

import { Router, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { generateBrandDraft } from "../services/brandGenerationService.js";
import { commitBrandDrafts } from "../services/brandCatalogWriter.js";
import type { BrandDraft } from "../services/brandGenerationService.js";

export const brandAdminRouter = Router();

// commitBrandDrafts() writes to local files (shared/src/brands/<chunk>.ts,
// shared/src/stockTags.ts) -- that only does something meaningful when those
// files are a real git working directory. backend/Dockerfile sets
// NODE_ENV=production for the deployed Cloud Run image, whose container
// filesystem is ephemeral (not shared across instances, wiped on every
// restart/redeploy) -- a write there would silently vanish without ever
// reaching the actual repo, instead of failing loudly. This tool is meant to
// be run against a local backend (`npm run dev`/`npm start`, no NODE_ENV set)
// where "the file" really is your working directory.
function blockInProduction(_req: Request, res: Response, next: NextFunction): void {
	if (process.env.NODE_ENV === "production") {
		res.status(403).json({ error: "This endpoint only runs against a local backend -- it writes to local files that don't persist on the deployed instance." });
		return;
	}
	next();
}
brandAdminRouter.use(blockInProduction);

function checkAdminSecret(req: Request): boolean {
	const secret = req.headers["x-admin-secret"];
	return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

// Checked BEFORE rate limiting (see below) so a wrong/missing secret never
// consumes budget against this route's limit -- mounted with no outer limiter
// in index.ts specifically so this ordering holds.
function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
	if (!checkAdminSecret(req)) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	next();
}
brandAdminRouter.use(requireAdminSecret);

// Both routes call paid Finnhub + Gemini APIs per request -- much stricter than
// the 120/min publicLimiter other routes share, since this is a low-frequency
// admin action, not a high-traffic read path.
const adminBrandsLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20,                  // 20 req/15min per IP
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many requests, please try again later." },
});
brandAdminRouter.use(adminBrandsLimiter);

// POST /api/admin/brands/generate — body: { ticker: string }
// Generates one draft for human review. Never writes to any file.
brandAdminRouter.post("/generate", async (req, res) => {
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

import { Router } from "express";
import { PRIVACY_POLICY, PRIVACY_VERSION, TERMS_OF_SERVICE, TERMS_VERSION, type LegalDoc } from "@stak/shared";

/**
 * GET /api/legal/terms | /api/legal/privacy - the Terms of Service and Privacy Policy for the apps' in-app sheet, the
 * same text the web shows at /terms and /privacy (shared/src/legalText.ts). Public: the eligibility gate shows them
 * before an account has agreed, and anyone may read them.
 */
export const legalRouter = Router();

const DOCS: Record<string, { doc: LegalDoc; version: string }> = {
	terms: { doc: TERMS_OF_SERVICE, version: TERMS_VERSION },
	privacy: { doc: PRIVACY_POLICY, version: PRIVACY_VERSION },
};

legalRouter.get("/:doc", (req, res) => {
	const entry = DOCS[req.params.doc ?? ""];
	if (!entry) {
		res.status(404).json({ error: "Unknown document" });
		return;
	}
	const { doc, version } = entry;
	// Blocks as objects - a paragraph's text, or a list's items - so the apps decode one shape.
	const sections = doc.sections.map((s) => ({
		heading: s.heading,
		sub: s.sub ?? null,
		blocks: s.blocks.map((b) => (typeof b === "string" ? { text: b, list: null } : { text: null, list: b.list })),
	}));
	res.set("Cache-Control", "public, max-age=3600");
	res.json({ title: doc.title, effective: doc.effective, notice: doc.notice, version, sections });
});

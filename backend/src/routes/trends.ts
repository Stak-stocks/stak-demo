import { Router } from "express";
import { getTrends } from "../services/trendsService.js";
import { adminDb } from "../firebaseAdmin.js";

export const trendsRouter = Router();

// DELETE /api/trends/:brandId/cache — bust cached trends so next request regenerates
trendsRouter.delete("/:brandId/cache", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	const { brandId } = req.params;
	await adminDb.collection("trends_v5").doc(brandId).delete();
	console.log(`[Trends] Cache busted for ${brandId}`);
	res.json({ ok: true, message: `Cache cleared for ${brandId}` });
});

// GET /api/trends/:brandId?ticker=AAPL&name=Apple
trendsRouter.get("/:brandId", async (req, res) => {
	try {
		const { brandId } = req.params;
		const ticker = (req.query.ticker as string)?.toUpperCase();
		const name = (req.query.name as string) || ticker;

		if (!ticker) {
			res.status(400).json({ error: "ticker query param required" });
			return;
		}

		const cards = await getTrends(brandId, ticker, name);
		res.json({ cards, brandId });
	} catch (error) {
		console.error("Error generating trends:", error);
		res.status(500).json({ error: "Failed to generate trends" });
	}
});

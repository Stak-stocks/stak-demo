import { Router } from "express";
import { getTrends } from "../services/trendsService.js";

export const trendsRouter = Router();

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

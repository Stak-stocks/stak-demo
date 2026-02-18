import { Router } from "express";
import { getMarketNews, getCompanyNews } from "../services/finnhubService.js";
import { simplifyArticles } from "../services/geminiService.js";

export const newsRouter = Router();

// GET /api/news/market — simplified market-wide news
newsRouter.get("/market", async (_req, res) => {
	try {
		const articles = await getMarketNews();
		const simplified = await simplifyArticles(articles);
		res.json({ articles: simplified });
	} catch (error) {
		console.error("Error fetching market news:", error);
		res.status(500).json({ error: "Failed to fetch market news" });
	}
});

// GET /api/news/company/:symbol — simplified news for a specific stock
newsRouter.get("/company/:symbol", async (req, res) => {
	try {
		const { symbol } = req.params;
		const articles = await getCompanyNews(symbol.toUpperCase());

		if (articles.length === 0) {
			res.json({ articles: [] });
			return;
		}

		const simplified = await simplifyArticles(articles);
		res.json({ articles: simplified });
	} catch (error) {
		console.error("Error fetching company news:", error);
		res.status(500).json({ error: "Failed to fetch company news" });
	}
});

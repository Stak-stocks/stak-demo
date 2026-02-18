import { Router } from "express";
import { getMarketNews, getCompanyNews, classifyArticle } from "../services/finnhubService.js";
import { simplifyArticles } from "../services/geminiService.js";

export const newsRouter = Router();

// GET /api/news/market — macro-only market news
newsRouter.get("/market", async (_req, res) => {
	try {
		const articles = await getMarketNews();
		// Keep only macro articles for the market feed
		const macroArticles = articles.filter((a) => classifyArticle(a) === "macro");
		const simplified = await simplifyArticles(macroArticles, macroArticles.map(() => "macro"));
		res.json({ articles: simplified });
	} catch (error) {
		console.error("Error fetching market news:", error);
		res.status(500).json({ error: "Failed to fetch market news" });
	}
});

// GET /api/news/company/:symbol — company + sector news (no pure macro)
newsRouter.get("/company/:symbol", async (req, res) => {
	try {
		const { symbol } = req.params;
		const ticker = symbol.toUpperCase();
		const articles = await getCompanyNews(ticker);

		if (articles.length === 0) {
			res.json({ articles: [] });
			return;
		}

		// Classify each article, drop pure macro
		const classified = articles.map((a) => ({ article: a, type: classifyArticle(a, undefined, ticker) }));
		const relevant = classified.filter((c) => c.type !== "macro");

		if (relevant.length === 0) {
			res.json({ articles: [] });
			return;
		}

		const simplified = await simplifyArticles(
			relevant.map((c) => c.article),
			relevant.map((c) => c.type),
		);
		res.json({ articles: simplified });
	} catch (error) {
		console.error("Error fetching company news:", error);
		res.status(500).json({ error: "Failed to fetch company news" });
	}
});

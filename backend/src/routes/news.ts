import { Router } from "express";
import { getMarketNews, getCompanyNews, classifyArticle, searchNewsArticles } from "../services/finnhubService.js";
import { simplifyArticles } from "../services/geminiService.js";

export const newsRouter = Router();

// GET /api/news/market — market-wide news (already macro-curated by Finnhub general endpoint)
newsRouter.get("/market", async (_req, res) => {
	try {
		const articles = await getMarketNews(16);
		// All general news is treated as macro — no extra filtering needed
		const simplified = await simplifyArticles(articles, articles.map(() => "macro" as const));
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
		const companyName = req.query.name as string | undefined;
		const articles = await getCompanyNews(ticker, 8, companyName);

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

// GET /api/news/search?q=:query — keyword or ticker search
newsRouter.get("/search", async (req, res) => {
	const q = (req.query.q as string | undefined)?.trim();
	if (!q || q.length < 2) {
		res.status(400).json({ error: "Query must be at least 2 characters" });
		return;
	}
	try {
		const articles = await searchNewsArticles(q);
		if (articles.length === 0) {
			res.json({ articles: [] });
			return;
		}
		const simplified = await simplifyArticles(
			articles,
			articles.map(() => "sector" as const),
		);
		res.json({ articles: simplified });
	} catch (error) {
		console.error("Error searching news:", error);
		res.status(500).json({ error: "Failed to search news" });
	}
});

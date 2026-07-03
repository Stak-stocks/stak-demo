import { Router } from "express";
import { syncNewIPOs, seedAllStocks, getSeedStatus, cancelSeedJob } from "../services/ipoService.js";
import { pgQuery } from "../lib/postgres.js";

export const stocksRouter = Router();

// GET /api/stocks — public, returns all auto-detected stocks from Postgres
stocksRouter.get("/", async (_req, res) => {
	try {
		const result = await pgQuery(`
			select ticker, id, name, domain, logo, hero_image, bio, personality_description,
				vibes, cultural_context, interest_categories, sector, country, source, ipo_date,
				added_at, updated_at
			from stocks
		`);
		const stocks = result.rows.map((r) => ({
			id: r.id, ticker: r.ticker, name: r.name, domain: r.domain, logo: r.logo,
			heroImage: r.hero_image, bio: r.bio, personalityDescription: r.personality_description,
			vibes: r.vibes, culturalContext: r.cultural_context, interestCategories: r.interest_categories,
			sector: r.sector, country: r.country, source: r.source, ipoDate: r.ipo_date,
			addedAt: r.added_at, updatedAt: r.updated_at,
		}));
		res.json({ stocks });
	} catch (error) {
		console.error("Error fetching stocks:", error);
		res.status(500).json({ error: "Failed to fetch stocks" });
	}
});

// POST /api/admin/sync — protected by X-Admin-Secret header, triggers IPO sync manually
stocksRouter.post("/sync", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}

	try {
		const daysBack = Number(req.query.days) || 3;
		console.log(`[IPO Sync] Manual trigger via API (daysBack=${daysBack})`);
		const result = await syncNewIPOs(daysBack);
		res.json(result);
	} catch (error) {
		console.error("Error during IPO sync:", error);
		res.status(500).json({ error: "Sync failed" });
	}
});

// POST /api/admin/seed — start background seeding of all US-listed stocks (non-blocking)
stocksRouter.post("/seed", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	const limit = Number(req.query.limit) || 1000;
	const usePopularOnly = req.query.all !== "true";
	seedAllStocks(limit, usePopularOnly).catch((e) => console.error("[Seed] Fatal error:", e));
	const mode = usePopularOnly ? "popular tickers" : "all US stocks";
	res.json({ message: `Seeding started (${mode}, limit=${limit}). Check /api/admin/seed-status for progress.` });
});

// POST /api/admin/seed-stop — cancel a running seed job
stocksRouter.post("/seed-stop", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	try {
		await cancelSeedJob();
		res.json({ message: "Seed job cancellation requested. Will stop at next batch." });
	} catch (error) {
		console.error("Error cancelling seed:", error);
		res.status(500).json({ error: "Failed to cancel seed" });
	}
});

// GET /api/admin/seed-status — check seeding progress
stocksRouter.get("/seed-status", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	try {
		const status = await getSeedStatus();
		res.json(status);
	} catch (error) {
		console.error("Error fetching seed status:", error);
		res.status(500).json({ error: "Failed to fetch seed status" });
	}
});

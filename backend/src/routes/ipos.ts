import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { syncNewIPOs, seedAllStocks, getSeedStatus } from "../services/ipoService.js";

export const iposRouter = Router();

// GET /api/stocks — public, returns all auto-detected stocks from Firestore
iposRouter.get("/", async (_req, res) => {
	try {
		const snapshot = await adminDb.collection("stocks").get();
		const stocks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		res.json({ stocks });
	} catch (error) {
		console.error("Error fetching stocks:", error);
		res.status(500).json({ error: "Failed to fetch stocks" });
	}
});

// POST /api/admin/sync — protected by X-Admin-Secret header, triggers IPO sync manually
iposRouter.post("/sync", async (req, res) => {
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
iposRouter.post("/seed", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	// Fire and forget — response returns immediately while job runs in background
	const limit = Number(req.query.limit) || 1000;
	const usePopularOnly = req.query.all !== "true"; // ?all=true uses full Finnhub list
	seedAllStocks(limit, usePopularOnly).catch((e) => console.error("[Seed] Fatal error:", e));
	const mode = usePopularOnly ? "popular tickers" : "all US stocks";
	res.json({ message: `Seeding started (${mode}, limit=${limit}). Check /api/admin/seed-status for progress.` });
});

// POST /api/admin/seed-stop — cancel a running seed job
iposRouter.post("/seed-stop", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	try {
		await adminDb.collection("_system").doc("seed-status").update({
			status: "cancelled",
		});
		res.json({ message: "Seed job cancellation requested. Will stop at next batch." });
	} catch (error) {
		console.error("Error cancelling seed:", error);
		res.status(500).json({ error: "Failed to cancel seed" });
	}
});

// GET /api/admin/seed-status — check seeding progress
iposRouter.get("/seed-status", async (req, res) => {
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

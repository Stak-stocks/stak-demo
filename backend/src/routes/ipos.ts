import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { syncNewIPOs } from "../services/ipoService.js";

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

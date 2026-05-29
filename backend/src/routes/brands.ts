import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

export const brandsRouter = Router();

// GET /api/brands — return all brands
brandsRouter.get("/", async (_req, res) => {
	try {
		const snapshot = await adminDb.collection("brands").get();
		const brands = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
		res.json({ brands });
	} catch (error) {
		console.error("Error fetching brands:", error);
		res.status(500).json({ error: "Failed to fetch brands" });
	}
});

// GET /api/brands/popular — brand IDs saved by 50+ users (4h cache)
brandsRouter.get("/popular", async (_req, res) => {
	const CACHE_KEY = "brands:popular";
	const MIN_SAVES = 50;

	try {
		const cached = await cacheGet<{ brandIds: string[] }>(CACHE_KEY);
		if (cached) {
			res.json(cached);
			return;
		}

		const snapshot = await adminDb.collection("users").get();
		const countMap: Record<string, number> = {};

		for (const doc of snapshot.docs) {
			const ids: string[] = doc.data().stakBrandIds ?? [];
			for (const id of ids) {
				countMap[id] = (countMap[id] ?? 0) + 1;
			}
		}

		const brandIds = Object.entries(countMap)
			.filter(([, count]) => count >= MIN_SAVES)
			.map(([id]) => id);

		const result = { brandIds };
		await cacheSet(CACHE_KEY, result, 4 * 60 * 60 * 1000);
		res.json(result);
	} catch (error) {
		console.error("Error fetching popular brands:", error);
		res.status(500).json({ error: "Failed to fetch popular brands" });
	}
});

// GET /api/brands/:id — return single brand
brandsRouter.get("/:id", async (req, res) => {
	try {
		const doc = await adminDb.collection("brands").doc(req.params.id).get();
		if (!doc.exists) {
			res.status(404).json({ error: "Brand not found" });
			return;
		}
		res.json({ id: doc.id, ...doc.data() });
	} catch (error) {
		console.error("Error fetching brand:", error);
		res.status(500).json({ error: "Failed to fetch brand" });
	}
});

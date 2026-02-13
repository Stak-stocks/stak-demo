import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";

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

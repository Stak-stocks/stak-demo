import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";

export const swipeRouter = Router();

// POST /api/swipe — record a swipe action (requires auth)
swipeRouter.post("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const { brandId, direction } = req.body;
		const uid = req.user!.uid;

		if (!brandId || !direction) {
			res.status(400).json({ error: "brandId and direction are required" });
			return;
		}

		if (direction !== "left" && direction !== "right") {
			res.status(400).json({ error: "direction must be 'left' or 'right'" });
			return;
		}

		await adminDb.collection("swipes").add({
			uid,
			brandId,
			direction,
			timestamp: new Date().toISOString(),
		});

		res.json({ success: true });
	} catch (error) {
		console.error("Error recording swipe:", error);
		res.status(500).json({ error: "Failed to record swipe" });
	}
});

// GET /api/swipe — get user's swipe history (requires auth)
swipeRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const snapshot = await adminDb
			.collection("swipes")
			.where("uid", "==", uid)
			.orderBy("timestamp", "desc")
			.get();

		const swipes = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		res.json({ swipes });
	} catch (error) {
		console.error("Error fetching swipes:", error);
		res.status(500).json({ error: "Failed to fetch swipes" });
	}
});

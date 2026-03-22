import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";

export const swipeRouter = Router();

// POST /api/swipe — record a swipe action (requires auth)
swipeRouter.post("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const { brandId, direction, ticker, categories, stakSize, timeOnCardMs, swipeVelocity } = req.body;
		const uid = req.user!.uid;

		if (!brandId || !direction) {
			res.status(400).json({ error: "brandId and direction are required" });
			return;
		}

		if (direction !== "left" && direction !== "right") {
			res.status(400).json({ error: "direction must be 'left' or 'right'" });
			return;
		}
		if (ticker != null && typeof ticker !== "string") {
			res.status(400).json({ error: "ticker must be a string" });
			return;
		}
		if (categories != null && (!Array.isArray(categories) || !categories.every((c: unknown) => typeof c === "string"))) {
			res.status(400).json({ error: "categories must be an array of strings" });
			return;
		}
		if (stakSize != null && typeof stakSize !== "number") {
			res.status(400).json({ error: "stakSize must be a number" });
			return;
		}
		if (timeOnCardMs != null && typeof timeOnCardMs !== "number") {
			res.status(400).json({ error: "timeOnCardMs must be a number" });
			return;
		}
		if (swipeVelocity != null && typeof swipeVelocity !== "number") {
			res.status(400).json({ error: "swipeVelocity must be a number" });
			return;
		}

		await adminDb.collection("swipes").add({
			uid,
			brandId,
			direction,
			timestamp: new Date().toISOString(),
			...(ticker != null && { ticker }),
			...(categories != null && { categories }),
			...(stakSize != null && { stakSize }),
			...(timeOnCardMs != null && { timeOnCardMs }),
			...(swipeVelocity != null && { swipeVelocity }),
		});

		res.json({ success: true });
	} catch (error) {
		console.error("Error recording swipe:", error);
		res.status(500).json({ error: "Failed to record swipe" });
	}
});

// POST /api/swipe/event — record an engagement event
// brandId is optional — supports both brand events (learn_more, brand_tap) and
// non-brand events (tab_view, earnings_calendar_open, news_search, intel_card_view, etc.)
swipeRouter.post("/event", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const { type, brandId, ticker, categories, params } = req.body;
		const uid = req.user!.uid;

		if (!type) {
			res.status(400).json({ error: "type is required" });
			return;
		}
		if (brandId != null && typeof brandId !== "string") {
			res.status(400).json({ error: "brandId must be a string" });
			return;
		}
		if (ticker != null && typeof ticker !== "string") {
			res.status(400).json({ error: "ticker must be a string" });
			return;
		}
		if (categories != null && (!Array.isArray(categories) || !categories.every((c: unknown) => typeof c === "string"))) {
			res.status(400).json({ error: "categories must be an array of strings" });
			return;
		}

		await adminDb.collection("events").add({
			uid,
			type,
			timestamp: new Date().toISOString(),
			...(brandId != null && { brandId }),
			...(ticker != null && { ticker }),
			...(categories != null && { categories }),
			...(params != null && { params }),
		});

		res.json({ success: true });
	} catch (error) {
		console.error("Error recording event:", error);
		res.status(500).json({ error: "Failed to record event" });
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

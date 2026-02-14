import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";

export const meRouter = Router();

// GET /api/me — get user profile (requires auth)
meRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const doc = await adminDb.collection("users").doc(uid).get();

		if (!doc.exists) {
			// Create default profile on first access
			const defaultProfile = {
				uid,
				email: req.user!.email || "",
				displayName: "",
				preferences: {},
				createdAt: new Date().toISOString(),
			};
			await adminDb.collection("users").doc(uid).set(defaultProfile);
			res.json(defaultProfile);
			return;
		}

		res.json({ id: doc.id, ...doc.data() });
	} catch (error) {
		console.error("Error fetching profile:", error);
		res.status(500).json({ error: "Failed to fetch profile" });
	}
});

// PUT /api/me — update user profile (requires auth)
meRouter.put("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { displayName, preferences, onboardingCompleted, onboardingProgress } = req.body;

		const updates: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
		};

		if (displayName !== undefined) updates.displayName = displayName;
		if (preferences !== undefined) updates.preferences = preferences;
		if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;
		if (onboardingProgress !== undefined) updates.onboardingProgress = onboardingProgress;

		await adminDb.collection("users").doc(uid).set(updates, { merge: true });

		const updated = await adminDb.collection("users").doc(uid).get();
		res.json({ id: updated.id, ...updated.data() });
	} catch (error) {
		console.error("Error updating profile:", error);
		res.status(500).json({ error: "Failed to update profile" });
	}
});

// GET /api/me/stak — get user's saved brand IDs (requires auth)
meRouter.get("/stak", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const doc = await adminDb.collection("users").doc(uid).get();
		const data = doc.data();
		const brandIds: string[] = data?.stakBrandIds ?? [];
		res.json({ brandIds });
	} catch (error) {
		console.error("Error fetching stak:", error);
		res.status(500).json({ error: "Failed to fetch stak" });
	}
});

// PUT /api/me/stak — save user's brand IDs (requires auth)
meRouter.put("/stak", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { brandIds } = req.body;

		if (!Array.isArray(brandIds)) {
			res.status(400).json({ error: "brandIds must be an array" });
			return;
		}

		await adminDb.collection("users").doc(uid).set(
			{ stakBrandIds: brandIds, updatedAt: new Date().toISOString() },
			{ merge: true },
		);

		res.json({ brandIds });
	} catch (error) {
		console.error("Error saving stak:", error);
		res.status(500).json({ error: "Failed to save stak" });
	}
});

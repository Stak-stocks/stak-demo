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
				onboardingCompleted: false,
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

// GET /api/me/passed — get passed (left-swiped) brands with timestamps
meRouter.get("/passed", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const doc = await adminDb.collection("users").doc(uid).get();
		const data = doc.data();
		const entries: { id: string; at: number }[] = data?.passedBrands ?? [];
		res.json({ entries });
	} catch (error) {
		console.error("Error fetching passed brands:", error);
		res.status(500).json({ error: "Failed to fetch passed brands" });
	}
});

// PUT /api/me/passed — save passed brands with timestamps
meRouter.put("/passed", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { entries } = req.body;

		if (!Array.isArray(entries)) {
			res.status(400).json({ error: "entries must be an array" });
			return;
		}

		await adminDb.collection("users").doc(uid).set(
			{ passedBrands: entries, updatedAt: new Date().toISOString() },
			{ merge: true },
		);

		res.json({ entries });
	} catch (error) {
		console.error("Error saving passed brands:", error);
		res.status(500).json({ error: "Failed to save passed brands" });
	}
});

// GET /api/me/intel-state — get intel card queue, last shown date, and read card IDs
meRouter.get("/intel-state", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const doc = await adminDb.collection("users").doc(uid).get();
		const data = doc.data();
		const saved = data?.intelCardState ?? {};
		const intelCardState: { lastDate: string; queue: string[]; readIds: string[] } = {
			lastDate: saved.lastDate ?? "",
			queue: saved.queue ?? [],
			readIds: saved.readIds ?? [],
		};
		res.json(intelCardState);
	} catch (error) {
		console.error("Error fetching intel state:", error);
		res.status(500).json({ error: "Failed to fetch intel state" });
	}
});

// PUT /api/me/intel-state — save intel card queue, last shown date, and read card IDs
meRouter.put("/intel-state", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { lastDate, queue, readIds } = req.body;

		if (typeof lastDate !== "string" || !Array.isArray(queue) || !Array.isArray(readIds)) {
			res.status(400).json({ error: "Invalid intel state" });
			return;
		}

		await adminDb.collection("users").doc(uid).set(
			{ intelCardState: { lastDate, queue, readIds }, updatedAt: new Date().toISOString() },
			{ merge: true },
		);

		res.json({ lastDate, queue, readIds });
	} catch (error) {
		console.error("Error saving intel state:", error);
		res.status(500).json({ error: "Failed to save intel state" });
	}
});

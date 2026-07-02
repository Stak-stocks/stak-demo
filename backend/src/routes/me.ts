import { Router } from "express";
import { adminDb, adminAuth } from "../firebaseAdmin.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { checkAndIncrementSwipeLimit } from "../services/swipeLimitService.js";
import { getEasternDateKey } from "@stak/shared";
import { pgQuery, ensureUserRow } from "../lib/postgres.js";
import { shadowWrite } from "../lib/shadowWrite.js";
import { provisionFirebaseUser } from "../services/authMigrationService.js";

export const meRouter = Router();

// GET /api/me — get user profile (requires auth)
meRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;

		// Track login session for today — fire-and-forget, one doc per user per day
		// Skip internal team emails to keep analytics clean
		const excludedEmails = (process.env.ANALYTICS_EXCLUDED_EMAILS ?? "")
			.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
		const userEmail = (req.user!.email ?? "").toLowerCase();
		if (userEmail && !excludedEmails.includes(userEmail)) {
			const today = getEasternDateKey();
			adminDb.collection("sessions").doc(`${uid}_${today}`)
				.set({ uid, date: today })
				.catch(() => {});

			// Shadow-write to Postgres (migration Phase 1) -- see tingly-conjuring-lake.md
			shadowWrite("sessions-upsert", async () => {
				await ensureUserRow(uid, req.user!.email);
				await pgQuery(
					`insert into sessions (uid, date) values ($1, $2) on conflict (uid, date) do nothing`,
					[uid, today],
				);
			});
		}

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

		// Backfill: set the JWT custom claim for users who completed onboarding
		// before this claim was introduced. Runs once per user then is a no-op.
		const data = doc.data();
		if (data?.onboardingCompleted === true && !req.user!.onboardingCompleted) {
			// Phase 7 note: once Firebase Auth accounts are deleted, setCustomUserClaims
			// will throw "user-not-found". Swallow it silently -- Supabase-migrated users
			// no longer need this claim (their onboarding status comes from Postgres).
			adminAuth.setCustomUserClaims(uid, { onboardingCompleted: true }).catch((e) => {
				if (e?.errorInfo?.code !== "auth/user-not-found") console.warn("[setCustomUserClaims]", e?.message);
			});
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
		const { displayName, phone, preferences, onboardingCompleted } = req.body;

		if (displayName !== undefined && (typeof displayName !== "string" || displayName.length > 100)) {
			res.status(400).json({ error: "displayName must be a string ≤ 100 characters" });
			return;
		}
		if (phone !== undefined && (typeof phone !== "string" || phone.length > 20)) {
			res.status(400).json({ error: "phone must be a string ≤ 20 characters" });
			return;
		}
		if (preferences !== undefined && (typeof preferences !== "object" || preferences === null || Array.isArray(preferences))) {
			res.status(400).json({ error: "preferences must be an object" });
			return;
		}
		if (onboardingCompleted !== undefined && typeof onboardingCompleted !== "boolean") {
			res.status(400).json({ error: "onboardingCompleted must be a boolean" });
			return;
		}

		const updates: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
		};

		if (displayName !== undefined) updates.displayName = displayName;
		if (phone !== undefined) updates.phone = phone;
		if (preferences !== undefined) updates.preferences = preferences;
		if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;

		// Embed onboardingCompleted in the Firebase ID token so clients can
		// read it instantly on any device without a Firestore round trip.
		// Phase 7 note: guard against user-not-found once Firebase accounts are deleted.
		if (onboardingCompleted === true) {
			adminAuth.setCustomUserClaims(uid, { onboardingCompleted: true }).catch((e) => {
				if (e?.errorInfo?.code !== "auth/user-not-found") console.warn("[setCustomUserClaims]", e?.message);
			});

			// Provision new users into auth_identity_map (fire-and-forget, idempotent).
			// New signups via Firebase are never auto-provisioned -- this is the earliest
			// point every new user passes through, so it's the right hook for ensuring
			// they're included in future migration wave sweeps.
			const firebaseUser = await adminAuth.getUser(uid).catch(() => null);
			if (firebaseUser) {
				provisionFirebaseUser({
					uid: firebaseUser.uid,
					email: firebaseUser.email,
					emailVerified: firebaseUser.emailVerified,
					signInProvider: firebaseUser.providerData[0]?.providerId ?? "password",
				}).catch(() => {});
			}
		}

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

// GET /api/me/intel-state — get intel card queue, last shown date, and read card IDs.
// Reads from Firestore by default; set INTEL_STATE_READ_SOURCE=postgres to switch once
// shadow-write parity has actually been observed over real time -- see tingly-conjuring-lake.md.
// Confirmed backend-exclusive (unlike most of users/{uid}'s other fields, nothing in
// AccountContext.tsx writes intelCardState directly from the frontend) -- this is the
// one field Phase 2's original scope actually applies to cleanly.
meRouter.get("/intel-state", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;

		if (process.env.INTEL_STATE_READ_SOURCE === "postgres") {
			const result = await pgQuery<{ last_date: string; queue: string[]; read_ids: string[] }>(
				`select last_date, queue, read_ids from intel_card_state where uid = $1`,
				[uid],
			);
			const row = result.rows[0];
			res.json({ lastDate: row?.last_date ?? "", queue: row?.queue ?? [], readIds: row?.read_ids ?? [] });
			return;
		}

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

		// Shadow-write to Postgres (migration Phase 2) -- see tingly-conjuring-lake.md
		await shadowWrite("intel-state-upsert", async () => {
			await ensureUserRow(uid, req.user!.email);
			await pgQuery(
				`insert into intel_card_state (uid, last_date, queue, read_ids) values ($1, $2, $3, $4)
				on conflict (uid) do update set last_date = excluded.last_date, queue = excluded.queue, read_ids = excluded.read_ids`,
				[uid, lastDate, queue, readIds],
			);
		});

		res.json({ lastDate, queue, readIds });
	} catch (error) {
		console.error("Error saving intel state:", error);
		res.status(500).json({ error: "Failed to save intel state" });
	}
});

// GET /api/me/daily-swipes — get today's swipe count for cross-device sync
meRouter.get("/daily-swipes", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const doc = await adminDb.collection("users").doc(uid).get();
		const saved = doc.data()?.dailySwipeState ?? {};
		res.json({ date: saved.date ?? "", count: saved.count ?? 0 });
	} catch (error) {
		console.error("Error fetching daily swipes:", error);
		res.status(500).json({ error: "Failed to fetch daily swipes" });
	}
});

// POST /api/me/swipes/increment — atomically increment today's swipe count, server-
// authoritative. Used by the search-add and global add-to-stak paths, which don't
// otherwise hit the backend per "swipe" (see backend/src/routes/swipe.ts for the main
// swipe-gesture path, which merges the same check into its own per-swipe request
// instead of calling this — avoids a second concurrent transaction on the same doc).
// Replaces a previous PUT here that let the client set an arbitrary count directly.
meRouter.post("/swipes/increment", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const result = await checkAndIncrementSwipeLimit(uid, req.body?.todayKey);
		// Always 200 — "limit reached" is an expected outcome the client needs in the
		// body (accepted:false), not a thrown error.
		res.json(result);
	} catch (error) {
		console.error("Error incrementing daily swipes:", error);
		res.status(500).json({ error: "Failed to increment daily swipes" });
	}
});

// GET /api/me/deck-order — get persisted swipe deck order for cross-device sync
meRouter.get("/deck-order", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const doc = await adminDb.collection("users").doc(uid).get();
		const order: string[] = doc.data()?.deckOrder ?? [];
		res.json({ order });
	} catch (error) {
		console.error("Error fetching deck order:", error);
		res.status(500).json({ error: "Failed to fetch deck order" });
	}
});

// PUT /api/me/deck-order — save swipe deck order
meRouter.put("/deck-order", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { order } = req.body;

		if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
			res.status(400).json({ error: "Invalid deck order" });
			return;
		}

		await adminDb.collection("users").doc(uid).set(
			{ deckOrder: order, updatedAt: new Date().toISOString() },
			{ merge: true },
		);

		res.json({ order });
	} catch (error) {
		console.error("Error saving deck order:", error);
		res.status(500).json({ error: "Failed to save deck order" });
	}
});

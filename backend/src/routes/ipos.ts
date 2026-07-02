import { Router } from "express";
import { adminDb, adminAuth } from "../firebaseAdmin.js";
import { syncNewIPOs, seedAllStocks, getSeedStatus } from "../services/ipoService.js";
import { pgQuery } from "../lib/postgres.js";

export const stocksRouter = Router();

/** Delete Firebase Auth users who signed up with email/password but never verified
 *  their email and whose account is older than `maxAgeHours` (default 24).
 *  Skips users who have completed onboarding (they have real data). */
export async function deleteUnverifiedAccounts(maxAgeHours = 24): Promise<{ deleted: number; errors: number }> {
	const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
	let deleted = 0;
	let errors = 0;
	let nextPageToken: string | undefined;

	do {
		const result = await adminAuth.listUsers(1000, nextPageToken);
		for (const user of result.users) {
			const isPassword = user.providerData.some((p) => p.providerId === "password");
			if (!isPassword || user.emailVerified) continue;
			const createdAt = new Date(user.metadata.creationTime).getTime();
			if (createdAt > cutoff) continue; // too recent, keep

			// Never delete users who have completed onboarding — they have real data
			const firestoreDoc = await adminDb.collection("users").doc(user.uid).get();
			if (firestoreDoc.exists && firestoreDoc.data()?.onboardingCompleted === true) {
				console.log(`[Cleanup] Skipping ${user.uid} (${user.email}) — onboarding completed`);
				continue;
			}

			try {
				await adminAuth.deleteUser(user.uid);
				// Also remove any partial Firestore data
				if (firestoreDoc.exists) {
					await adminDb.collection("users").doc(user.uid).delete();
				}
				deleted++;
				console.log(`[Cleanup] Deleted unverified user ${user.uid} (${user.email})`);
			} catch (e) {
				errors++;
				console.error(`[Cleanup] Failed to delete ${user.uid}:`, e);
			}
		}
		nextPageToken = result.pageToken;
	} while (nextPageToken);

	return { deleted, errors };
}

// GET /api/stocks — public, returns all auto-detected stocks.
// Reads from Firestore by default; set STOCKS_READ_SOURCE=postgres to switch once
// shadow-write parity has actually been observed over real time (migration plan,
// Phase 1 go/no-go) -- not something to flip automatically from this codebase alone.
stocksRouter.get("/", async (_req, res) => {
	if (process.env.STOCKS_READ_SOURCE === "postgres") {
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
			return;
		} catch (error) {
			console.error("Error fetching stocks from Postgres:", error);
			res.status(500).json({ error: "Failed to fetch stocks" });
			return;
		}
	}

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
	// Fire and forget — response returns immediately while job runs in background
	const limit = Number(req.query.limit) || 1000;
	const usePopularOnly = req.query.all !== "true"; // ?all=true uses full Finnhub list
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

// POST /api/admin/cleanup-orphaned-docs — delete Firestore user docs with no Firebase Auth account
// Useful after manually deleting users from Firebase Console during testing
stocksRouter.post("/cleanup-orphaned-docs", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	try {
		const snapshot = await adminDb.collection("users").get();
		let deleted = 0;
		let errors = 0;
		// Pre-fetch all migrated Firebase UIDs so we never delete a Firestore doc for
		// a user who has already moved to Supabase, even if their Firebase Auth account
		// was deleted in a Phase 7 sweep before this cleanup ran.
		const migratedResult = await pgQuery<{ firebase_uid: string }>(
			`select firebase_uid from auth_identity_map where migration_status = 'supabase'`,
		);
		const migratedUids = new Set(migratedResult.rows.map((r) => r.firebase_uid));

		for (const doc of snapshot.docs) {
			if (migratedUids.has(doc.id)) {
				// User has been migrated to Supabase -- their Firestore doc is still in use
				// (migration shadow-writes are still active), never delete it here.
				continue;
			}
			try {
				await adminAuth.getUser(doc.id);
				// Auth user exists — keep the doc
			} catch (e: unknown) {
				const code = (e as { code?: string }).code ?? "";
				if (code === "auth/user-not-found") {
					await doc.ref.delete();
					deleted++;
					console.log(`[Orphan Cleanup] Deleted orphaned doc for ${doc.id}`);
				} else {
					errors++;
					console.error(`[Orphan Cleanup] Error checking ${doc.id}:`, e);
				}
			}
		}
		console.log(`[Orphan Cleanup] Done: deleted=${deleted}, errors=${errors}`);
		res.json({ deleted, errors });
	} catch (error) {
		console.error("[Orphan Cleanup] Error:", error);
		res.status(500).json({ error: "Orphan cleanup failed" });
	}
});

// POST /api/admin/cleanup-unverified — delete unverified email/password accounts older than 24h
stocksRouter.post("/cleanup-unverified", async (req, res) => {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	try {
		const result = await deleteUnverifiedAccounts();
		console.log(`[Cleanup] Done: deleted=${result.deleted}, errors=${result.errors}`);
		res.json(result);
	} catch (error) {
		console.error("[Cleanup] Error:", error);
		res.status(500).json({ error: "Cleanup failed" });
	}
});

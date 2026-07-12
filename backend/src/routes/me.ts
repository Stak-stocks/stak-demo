import { Router } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { checkAndIncrementSwipeLimit } from "../services/swipeLimitService.js";
import { getEasternDateKey } from "@stak/shared";
import { pgQuery, pgPool, ensureUserRow } from "../lib/postgres.js";

export const meRouter = Router();

// GET /api/me — get user profile (requires auth)
meRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;

		// Track login session for today — fire-and-forget, one row per user per day
		const excludedEmails = (process.env.ANALYTICS_EXCLUDED_EMAILS ?? "")
			.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
		const userEmail = (req.user!.email ?? "").toLowerCase();
		if (userEmail && !excludedEmails.includes(userEmail)) {
			const today = getEasternDateKey();
			ensureUserRow(uid, req.user!.email)
				.then(() => pgQuery(
					`insert into sessions (uid, date) values ($1, $2) on conflict (uid, date) do nothing`,
					[uid, today],
				))
				.catch(() => {});
		}

		const result = await pgQuery<{
			uid: string; email: string | null; display_name: string | null; phone: string | null;
			preferences: Record<string, unknown> | null; onboarding_completed: boolean;
			created_at: string; updated_at: string | null;
		}>(
			`select uid, email, display_name, phone, preferences, onboarding_completed, created_at, updated_at
			from users where uid = $1`,
			[uid],
		);

		if (result.rows.length === 0) {
			await ensureUserRow(uid, req.user!.email);
			const defaultProfile = {
				id: uid, uid, email: req.user!.email || "",
				displayName: "", preferences: {}, onboardingCompleted: false,
				createdAt: new Date().toISOString(),
			};
			res.json(defaultProfile);
			return;
		}

		const row = result.rows[0]!;
		res.json({
			id: row.uid,
			uid: row.uid,
			email: row.email ?? "",
			displayName: row.display_name ?? "",
			phone: row.phone ?? "",
			preferences: row.preferences ?? {},
			onboardingCompleted: row.onboarding_completed,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		});
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

		await ensureUserRow(uid, req.user!.email);

		const setClauses: string[] = ["updated_at = now()"];
		const values: unknown[] = [];
		let i = 1;

		if (displayName !== undefined) { setClauses.push(`display_name = $${i++}`); values.push(displayName); }
		if (phone !== undefined) { setClauses.push(`phone = $${i++}`); values.push(phone); }
		if (preferences !== undefined) { setClauses.push(`preferences = $${i++}`); values.push(JSON.stringify(preferences)); }
		if (onboardingCompleted !== undefined) { setClauses.push(`onboarding_completed = $${i++}`); values.push(onboardingCompleted); }

		values.push(uid);
		await pgQuery(
			`update users set ${setClauses.join(", ")} where uid = $${i}`,
			values,
		);

		const updated = await pgQuery<{
			uid: string; email: string | null; display_name: string | null; phone: string | null;
			preferences: Record<string, unknown> | null; onboarding_completed: boolean;
			created_at: string; updated_at: string | null;
		}>(
			`select uid, email, display_name, phone, preferences, onboarding_completed, created_at, updated_at
			from users where uid = $1`,
			[uid],
		);
		const row = updated.rows[0]!;
		res.json({
			id: row.uid,
			uid: row.uid,
			email: row.email ?? "",
			displayName: row.display_name ?? "",
			phone: row.phone ?? "",
			preferences: row.preferences ?? {},
			onboardingCompleted: row.onboarding_completed,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		});
	} catch (error) {
		console.error("Error updating profile:", error);
		res.status(500).json({ error: "Failed to update profile" });
	}
});

// GET /api/me/stak — get user's saved brand IDs (requires auth)
meRouter.get("/stak", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const result = await pgQuery<{ brand_id: string }>(
			`select brand_id from stak_brands where uid = $1 order by saved_at asc`,
			[uid],
		);
		res.json({ brandIds: result.rows.map((r) => r.brand_id) });
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

		await ensureUserRow(uid, req.user!.email);
		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");
			// Preserve existing price_at_save so "since you saved" isn't wiped on every watchlist edit
			const existing = await client.query<{ brand_id: string; price_at_save: number | null }>(
				`select brand_id, price_at_save from stak_brands where uid = $1`,
				[uid],
			);
			const savedPrices = new Map<string, number | null>(existing.rows.map(r => [r.brand_id, r.price_at_save]));
			await client.query(`delete from stak_brands where uid = $1`, [uid]);
			if (brandIds.length > 0) {
				const now = new Date().toISOString();
				const rowPlaceholders: string[] = [];
				const params: unknown[] = [uid];
				let pIdx = 2;
				for (const brandId of brandIds as string[]) {
					rowPlaceholders.push(`($1, $${pIdx}, $${pIdx + 1}, $${pIdx + 2})`);
					params.push(brandId, now, savedPrices.get(brandId) ?? null);
					pIdx += 3;
				}
				await client.query(
					`insert into stak_brands (uid, brand_id, saved_at, price_at_save) values ${rowPlaceholders.join(", ")}`,
					params,
				);
			}
			await client.query("COMMIT");
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}

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
		const result = await pgQuery<{ brand_id: string; last_passed_at: string }>(
			`select brand_id, last_passed_at from passed_brands where uid = $1`,
			[uid],
		);
		const entries = result.rows.map((r) => ({
			id: r.brand_id,
			at: new Date(r.last_passed_at).getTime(),
		}));
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

		await ensureUserRow(uid, req.user!.email);
		const passedClient = await pgPool.connect();
		try {
			await passedClient.query("BEGIN");
			await passedClient.query(`delete from passed_brands where uid = $1`, [uid]);
			if (entries.length > 0) {
				const values = (entries as { id: string; at: number }[]).map(
					(e, i) => `($1, $${i * 2 + 2}, to_timestamp($${i * 2 + 3}::bigint / 1000.0))`
				).join(", ");
				const params: unknown[] = [uid];
				for (const e of entries as { id: string; at: number }[]) {
					params.push(e.id, e.at);
				}
				await passedClient.query(
					`insert into passed_brands (uid, brand_id, last_passed_at) values ${values}`,
					params,
				);
			}
			await passedClient.query("COMMIT");
		} catch (e) {
			await passedClient.query("ROLLBACK");
			throw e;
		} finally {
			passedClient.release();
		}

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
		const result = await pgQuery<{ last_date: string; queue: string[]; read_ids: string[] }>(
			`select last_date, queue, read_ids from intel_card_state where uid = $1`,
			[uid],
		);
		const row = result.rows[0];
		res.json({ lastDate: row?.last_date ?? "", queue: row?.queue ?? [], readIds: row?.read_ids ?? [] });
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

		await ensureUserRow(uid, req.user!.email);
		await pgQuery(
			`insert into intel_card_state (uid, last_date, queue, read_ids) values ($1, $2, $3, $4)
			on conflict (uid) do update set last_date = excluded.last_date, queue = excluded.queue, read_ids = excluded.read_ids`,
			[uid, lastDate, queue, readIds],
		);

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
		const result = await pgQuery<{ daily_swipe_date: string | null; daily_swipe_count: number | null }>(
			`select daily_swipe_date, daily_swipe_count from users where uid = $1`,
			[uid],
		);
		const row = result.rows[0];
		res.json({ date: row?.daily_swipe_date ?? "", count: row?.daily_swipe_count ?? 0 });
	} catch (error) {
		console.error("Error fetching daily swipes:", error);
		res.status(500).json({ error: "Failed to fetch daily swipes" });
	}
});

// POST /api/me/swipes/increment — atomically increment today's swipe count, server-authoritative.
// Used by the search-add and global add-to-stak paths, which don't otherwise hit the backend
// per "swipe". Replaces a previous PUT that let the client set an arbitrary count directly.
meRouter.post("/swipes/increment", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const result = await checkAndIncrementSwipeLimit(uid, req.body?.todayKey);
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
		const result = await pgQuery<{ deck_order: string[] | null }>(
			`select deck_order from users where uid = $1`,
			[uid],
		);
		res.json({ order: result.rows[0]?.deck_order ?? [] });
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

		await ensureUserRow(uid, req.user!.email);
		await pgQuery(
			`update users set deck_order = $1, updated_at = now() where uid = $2`,
			[order, uid],
		);

		res.json({ order });
	} catch (error) {
		console.error("Error saving deck order:", error);
		res.status(500).json({ error: "Failed to save deck order" });
	}
});

// ── Search history ─────────────────────────────────────────────────────────────
const MAX_SEARCH_HISTORY = 20;

// POST /api/me/search-history — add entry, dedup case-insensitively, enforce cap
// Replaces 4 sequential Supabase client→Postgres round-trips with one server request.
meRouter.post("/search-history", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { query } = req.body as { query?: string };
		const trimmed = (query ?? "").trim();
		if (!trimmed) {
			res.status(400).json({ error: "query required" });
			return;
		}
		const lower = trimmed.toLowerCase();

		await ensureUserRow(uid, req.user!.email);

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");
			await client.query(
				`DELETE FROM search_history WHERE uid = $1 AND LOWER(query) = $2`,
				[uid, lower],
			);
			await client.query(
				`INSERT INTO search_history (uid, query, at) VALUES ($1, $2, now())`,
				[uid, trimmed],
			);
			await client.query(
				`DELETE FROM search_history WHERE uid = $1 AND query NOT IN (
				   SELECT query FROM search_history WHERE uid = $1 ORDER BY at DESC LIMIT $2
				 )`,
				[uid, MAX_SEARCH_HISTORY],
			);
			await client.query("COMMIT");
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}

		res.json({ ok: true });
	} catch (error) {
		console.error("Error adding search history:", error);
		res.status(500).json({ error: "Failed to add search history" });
	}
});

// DELETE /api/me/search-history/:query — remove one entry (case-insensitive)
meRouter.delete("/search-history/:query", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const query = decodeURIComponent(req.params.query as string).trim();
		await pgQuery(
			`DELETE FROM search_history WHERE uid = $1 AND LOWER(query) = LOWER($2)`,
			[uid, query],
		);
		res.json({ ok: true });
	} catch (error) {
		console.error("Error removing search history entry:", error);
		res.status(500).json({ error: "Failed to remove search history entry" });
	}
});

// DELETE /api/me/search-history — clear all entries
meRouter.delete("/search-history", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		await pgQuery(`DELETE FROM search_history WHERE uid = $1`, [uid]);
		res.json({ ok: true });
	} catch (error) {
		console.error("Error clearing search history:", error);
		res.status(500).json({ error: "Failed to clear search history" });
	}
});

// PATCH /api/me/stak/:brandId/price — backfill priceAtSave only if currently null
meRouter.patch("/stak/:brandId/price", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const brandId = req.params.brandId as string;
		const { price } = req.body as { price?: unknown };
		if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
			res.status(400).json({ error: "price must be a positive number" });
			return;
		}
		await pgQuery(
			`UPDATE stak_brands SET price_at_save = $1
			 WHERE uid = $2 AND brand_id = $3 AND price_at_save IS NULL`,
			[price, uid, brandId],
		);
		res.json({ ok: true });
	} catch (error) {
		console.error("Error patching stak price:", error);
		res.status(500).json({ error: "Failed to patch stak price" });
	}
});

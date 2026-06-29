import { Router } from "express";
import { pgQuery } from "../lib/postgres.js";

export const authMigrationRouter = Router();

/**
 * GET /api/auth/provider?email=... -- public, unauthenticated by necessity: the
 * frontend needs to know which provider to use BEFORE the user has signed in either
 * way (migration plan, Phase 5). Looks up migration_status via auth_identity_map
 * joined to users by email. Defaults to "firebase" for anyone not found (covers
 * brand-new signups and anyone not yet provisioned) -- fail toward the provider that's
 * actually live in production, never toward one most users can't use yet.
 */
authMigrationRouter.get("/provider", async (req, res) => {
	const email = (req.query.email as string | undefined)?.trim().toLowerCase();
	if (!email) {
		res.status(400).json({ error: "email query param is required" });
		return;
	}

	try {
		const result = await pgQuery<{ migration_status: string }>(
			`select m.migration_status
			from auth_identity_map m
			join users u on u.uid = m.firebase_uid
			where lower(u.email) = $1`,
			[email],
		);

		const status = result.rows[0]?.migration_status ?? "firebase";
		const provider = status === "supabase" || status === "requires_password_reset" ? "supabase" : "firebase";
		res.json({ provider, requiresPasswordReset: status === "requires_password_reset" });
	} catch (error) {
		console.error("Error resolving auth provider:", error);
		// Fail toward Firebase -- the live, working path -- not toward an error state
		// that could strand a user unable to log in at all.
		res.json({ provider: "firebase", requiresPasswordReset: false });
	}
});

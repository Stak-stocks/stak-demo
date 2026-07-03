import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "./firebaseAdmin.js";
import { pgQuery } from "./lib/postgres.js";

// Verify a Supabase user JWT via direct fetch to /auth/v1/user — avoids creating a
// full @supabase/supabase-js client, which requires globalThis.WebSocket (not available
// by default in Node.js 20; only native in Node.js 22+). fetch is native in Node.js 18+.
async function verifySupabaseJwt(token: string): Promise<{ id: string; email?: string; app_metadata?: Record<string, unknown> } | null> {
	const url = `${(process.env.SUPABASE_URL ?? "").trim()}/auth/v1/user`;
	const key = (process.env.SUPABASE_ANON_KEY ?? "").trim();
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${token}`, apikey: key },
	});
	if (!res.ok) return null;
	const data = await res.json() as { id?: string; email?: string; app_metadata?: Record<string, unknown> };
	return data.id ? (data as { id: string; email?: string; app_metadata?: Record<string, unknown> }) : null;
}

export interface AuthenticatedRequest extends Request {
	user?: {
		uid: string;
		email?: string;
		onboardingCompleted?: boolean;
	};
}

/**
 * Peeks at a JWT's `iss` claim without verifying the signature -- just enough to route
 * to the correct verifier (Firebase vs Supabase). The actual verification (which is
 * what matters for trust) still happens afterward, against the matching service.
 * Never throws -- a malformed token just falls through to "unknown", handled below.
 */
function peekIssuer(token: string): string | null {
	try {
		const payload = token.split(".")[1];
		if (!payload) return null;
		const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
		return typeof decoded.iss === "string" ? decoded.iss : null;
	} catch {
		return null;
	}
}

/**
 * Dual-accept token verification (migration plan, Phase 4, Step B:
 * tingly-conjuring-lake.md). Verifies via Firebase or Supabase depending on the
 * token's issuer, resolving either way to the canonical Firebase uid (via
 * auth_identity_map for Supabase tokens) so every downstream route sees the exact
 * same req.user shape regardless of which provider actually issued the token.
 * Nothing in real traffic exercises the Supabase branch yet -- no real user has a
 * Supabase session until Phase 5/6 -- this exists now so the middleware only needs
 * rewriting once, against an already-stable data layer, not twice.
 */
export async function authMiddleware(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const authHeader = req.headers.authorization;

	if (!authHeader?.startsWith("Bearer ")) {
		res.status(401).json({ error: "Missing or invalid authorization header" });
		return;
	}

	const token = authHeader.split("Bearer ")[1]!;
	const issuer = peekIssuer(token);

	const supabaseIssuer = `${(process.env.SUPABASE_URL ?? "").trim()}/auth/v1`;
	if (issuer === supabaseIssuer) {
		await handleSupabaseToken(token, req, res, next);
	} else {
		await handleFirebaseToken(token, req, res, next);
	}
}

async function handleFirebaseToken(
	token: string,
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const VERIFICATION_REQUIRED_SINCE = new Date("2026-03-11T00:00:00Z").getTime();

	try {
		const decoded = await adminAuth.verifyIdToken(token);

		const isPasswordProvider = decoded.firebase?.sign_in_provider === "password";
		if (isPasswordProvider && !decoded.email_verified) {
			const userRecord = await adminAuth.getUser(decoded.uid);
			const createdAt = new Date(userRecord.metadata.creationTime).getTime();
			if (createdAt >= VERIFICATION_REQUIRED_SINCE) {
				res.status(403).json({ error: "Email not verified", code: "email_not_verified" });
				return;
			}
		}

		req.user = {
			uid: decoded.uid,
			email: decoded.email,
			onboardingCompleted: decoded.onboardingCompleted === true,
		};
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}

async function handleSupabaseToken(
	token: string,
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const supabaseUser = await verifySupabaseJwt(token);
		if (!supabaseUser) {
			res.status(401).json({ error: "Invalid or expired token" });
			return;
		}

		let mapped = await pgQuery<{ firebase_uid: string }>(
			`select firebase_uid from auth_identity_map where supabase_uid = $1`,
			[supabaseUser.id],
		);
		if (mapped.rows.length === 0) {
			// No auth_identity_map row. Covers two cases:
			// 1. Brand-new users who signed up via Supabase Google OAuth after the
			//    migration branch deployed (no Firebase account, no prior provisioning).
			// 2. Any user who slipped through the batch provisionAllUsers run.
			// Provision on-demand: use the Supabase UUID as the canonical uid -- these
			// users never had Firebase accounts, so there is no "Firebase UID" to use.
			// All Postgres tables accept any text as uid; UUID format is fine.
			const supabaseUid = supabaseUser.id;
			const email = supabaseUser.email ?? null;
			await pgQuery(
				`insert into users (uid, email) values ($1, $2) on conflict (uid) do nothing`,
				[supabaseUid, email],
			);
			await pgQuery(
				`insert into auth_identity_map (firebase_uid, supabase_uid, provider, migration_status)
				values ($1, $2, $3, 'supabase') on conflict (firebase_uid) do nothing`,
				[supabaseUid, supabaseUid, supabaseUser.app_metadata?.provider ?? "email"],
			);
			mapped = { rows: [{ firebase_uid: supabaseUid }] } as typeof mapped;
		}

		const onboardingResult = await pgQuery<{ onboarding_completed: boolean }>(
			`select onboarding_completed from users where uid = $1`,
			[mapped.rows[0]!.firebase_uid],
		);

		req.user = {
			uid: mapped.rows[0]!.firebase_uid,
			email: supabaseUser.email,
			onboardingCompleted: onboardingResult.rows[0]?.onboarding_completed === true,
		};
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}

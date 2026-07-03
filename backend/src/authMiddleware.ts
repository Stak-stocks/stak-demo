import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "./firebaseAdmin.js";
import { getSupabaseAdmin } from "./lib/supabaseAdmin.js";
import { createClient } from "@supabase/supabase-js";
import { pgQuery } from "./lib/postgres.js";

// Lightweight client with anon key used ONLY for JWT verification (getUser).
// The admin client (service role key) can't verify user JWTs in all environments --
// the anon key is the correct key for /auth/v1/user token validation.
const getSupabaseVerifier = (() => {
	let client: ReturnType<typeof createClient> | null = null;
	return () => {
		if (!client) {
			client = createClient(
				(process.env.SUPABASE_URL ?? "").trim(),
				(process.env.SUPABASE_ANON_KEY ?? "").trim(),
				{ auth: { autoRefreshToken: false, persistSession: false } },
			);
		}
		return client;
	};
})();

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
		console.log(`[auth] 401 no-bearer path=${req.path}`);
		res.status(401).json({ error: "Missing or invalid authorization header" });
		return;
	}

	const token = authHeader.split("Bearer ")[1]!;
	const issuer = peekIssuer(token);

	const supabaseIssuer = `${(process.env.SUPABASE_URL ?? "").trim()}/auth/v1`;
	console.log(`[auth] path=${req.path} issuer="${issuer}" supabaseIssuer="${supabaseIssuer}" match=${issuer === supabaseIssuer}`);
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
	} catch (err) {
		console.log(`[auth] firebase-401 path=${req.path} err=${String(err)}`);
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
		const { data, error } = await getSupabaseVerifier().auth.getUser(token);
		if (error || !data?.user) {
			console.log(`[auth] supabase-getUser-fail path=${req.path} error=${error?.message ?? "no user"}`);
			res.status(401).json({ error: "Invalid or expired token" });
			return;
		}

		let mapped = await pgQuery<{ firebase_uid: string }>(
			`select firebase_uid from auth_identity_map where supabase_uid = $1`,
			[data.user.id],
		);
		if (mapped.rows.length === 0) {
			// No auth_identity_map row. Covers two cases:
			// 1. Brand-new users who signed up via Supabase Google OAuth after the
			//    migration branch deployed (no Firebase account, no prior provisioning).
			// 2. Any user who slipped through the batch provisionAllUsers run.
			// Provision on-demand: use the Supabase UUID as the canonical uid -- these
			// users never had Firebase accounts, so there is no "Firebase UID" to use.
			// All Postgres tables accept any text as uid; UUID format is fine.
			const supabaseUid = data.user.id;
			const email = data.user.email ?? null;
			await pgQuery(
				`insert into users (uid, email) values ($1, $2) on conflict (uid) do nothing`,
				[supabaseUid, email],
			);
			await pgQuery(
				`insert into auth_identity_map (firebase_uid, supabase_uid, provider, migration_status)
				values ($1, $2, $3, 'supabase') on conflict (firebase_uid) do nothing`,
				[supabaseUid, supabaseUid, data.user.app_metadata?.provider ?? "email"],
			);
			mapped = { rows: [{ firebase_uid: supabaseUid }] } as typeof mapped;
		}

		const onboardingResult = await pgQuery<{ onboarding_completed: boolean }>(
			`select onboarding_completed from users where uid = $1`,
			[mapped.rows[0]!.firebase_uid],
		);

		req.user = {
			uid: mapped.rows[0]!.firebase_uid,
			email: data.user.email,
			onboardingCompleted: onboardingResult.rows[0]?.onboarding_completed === true,
		};
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}

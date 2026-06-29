import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "./firebaseAdmin.js";
import { getSupabaseAdmin } from "./lib/supabaseAdmin.js";
import { pgQuery } from "./lib/postgres.js";

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

	if (issuer?.includes("supabase")) {
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
	// Accounts created on or after this date must have email verified.
	// Accounts created before this date (existing users) get a grace period.
	const VERIFICATION_REQUIRED_SINCE = new Date("2026-03-11T00:00:00Z").getTime();

	try {
		const decoded = await adminAuth.verifyIdToken(token);

		// Block unverified email/password accounts created after the feature was deployed
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
		const { data, error } = await getSupabaseAdmin().auth.getUser(token);
		if (error || !data?.user) {
			res.status(401).json({ error: "Invalid or expired token" });
			return;
		}

		const mapped = await pgQuery<{ firebase_uid: string }>(
			`select firebase_uid from auth_identity_map where supabase_uid = $1`,
			[data.user.id],
		);
		if (mapped.rows.length === 0) {
			// A Supabase user with no recorded mapping back to a canonical uid --
			// shouldn't happen for anyone provisioned via authMigrationService.ts, but
			// fail closed rather than guessing.
			res.status(401).json({ error: "Account not recognized" });
			return;
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

import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { pgQuery } from "./lib/postgres.js";

/**
 * Verified logins, remembered briefly. Every authenticated request used to ask
 * Supabase whether its token was valid and then read the identity map and the
 * user row - two network hops and two queries, 0.3-0.9s before the route itself
 * ran, on every call to My STAK, swipes or saves.
 *
 * A token is cached only after Supabase has verified it, keyed by its SHA-256
 * (the token itself is never stored), for at most VERIFIED_TTL_MS and never past
 * the token's own expiry. The trade: a token revoked by signing out elsewhere
 * keeps working on this instance for up to that long. Per instance and in memory
 * on purpose - identity doesn't belong in a shared cache for a saving this small.
 */
const VERIFIED_TTL_MS = 2 * 60 * 1000;
const VERIFIED_MAX = 5000;
type VerifiedUser = NonNullable<AuthenticatedRequest["user"]>;
const verified = new Map<string, { user: VerifiedUser; until: number }>();

function tokenKey(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/** The token's own expiry in ms, read from its payload - used only to cap the cache, never to trust it. */
function tokenExpiryMs(token: string): number | null {
	try {
		const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
		return typeof payload.exp === "number" ? payload.exp * 1000 : null;
	} catch {
		return null;
	}
}

function rememberVerified(token: string, user: VerifiedUser): void {
	const now = Date.now();
	const exp = tokenExpiryMs(token);
	const until = Math.min(now + VERIFIED_TTL_MS, exp ?? now + VERIFIED_TTL_MS);
	if (until <= now) return;
	if (verified.size >= VERIFIED_MAX) {
		for (const [k, v] of verified) if (v.until <= now) verified.delete(k);
		if (verified.size >= VERIFIED_MAX) verified.delete(verified.keys().next().value!);
	}
	verified.set(tokenKey(token), { user, until });
}

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

	const hit = verified.get(tokenKey(token));
	if (hit && hit.until > Date.now()) {
		req.user = { ...hit.user };
		next();
		return;
	}

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
			// No auth_identity_map row — on-demand provisioning for new Supabase-native users
			// who never had a Firebase account. The Supabase UUID becomes the canonical uid.
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
		rememberVerified(token, req.user);
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}

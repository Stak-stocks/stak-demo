import type { Request, Response, NextFunction } from "express";
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
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}

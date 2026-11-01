/**
 * Sign in with Apple on the website: Supabase's Apple provider holds a client secret, a JWT signed with the Sign in
 * with Apple key (.p8), and Apple accepts one for at most 6 months. renewAppleClientSecret() makes a fresh one and
 * sets it through Supabase's Management API; Cloud Scheduler calls it monthly (routes/appleSecret.ts), so it never
 * gets near expiry. scripts/apple-client-secret.mjs makes the same JWT by hand, for when this can't run.
 *
 * Env (Secret Manager -> Cloud Run only - server-side, so not in .env.example and never on dev machines):
 *   APPLE_SIGNIN_KEY_P8        - the .p8's contents
 *   SUPABASE_MANAGEMENT_TOKEN  - a Supabase access token (Account -> Access Tokens) scoped to this one project, with
 *                                auth config read & write only - unlike the account-wide SUPABASE_ACCESS_TOKEN
 */
import { createPrivateKey, sign } from "node:crypto";

const TEAM_ID = "P6442U4672";
const KEY_ID = "5NH9HT5BA3";
/** The website's Services ID. */
const CLIENT_ID = "com.stak.demo.web";
/** Apple's limit is 180 days; a day under it. */
const LIFETIME_S = 179 * 24 * 60 * 60;

/** The client secret: an ES256 JWT for Apple's token endpoint. */
export function makeAppleClientSecret(p8: string, nowS = Math.floor(Date.now() / 1000)): { secret: string; expiresAt: Date } {
	const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
	const header = b64url({ alg: "ES256", kid: KEY_ID, typ: "JWT" });
	const payload = b64url({ iss: TEAM_ID, iat: nowS, exp: nowS + LIFETIME_S, aud: "https://appleid.apple.com", sub: CLIENT_ID });
	const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
		key: createPrivateKey(p8),
		dsaEncoding: "ieee-p1363",
	}).toString("base64url");
	return { secret: `${header}.${payload}.${signature}`, expiresAt: new Date((nowS + LIFETIME_S) * 1000) };
}

/** Makes a fresh secret and sets it on the Supabase project. Throws with a reason that never includes a secret. */
export async function renewAppleClientSecret(): Promise<{ expiresAt: Date }> {
	const p8 = process.env.APPLE_SIGNIN_KEY_P8;
	// Secret Manager values can carry a trailing newline; the PEM tolerates it, a header doesn't.
	const token = process.env.SUPABASE_MANAGEMENT_TOKEN?.trim();
	// The project ref, or the first label of the project URL (wrong only behind a custom domain).
	const ref = process.env.SUPABASE_PROJECT_REF?.trim()
		|| (process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname.split(".")[0] : undefined);
	if (!p8 || !token || !ref) throw new Error("APPLE_SIGNIN_KEY_P8, SUPABASE_MANAGEMENT_TOKEN or the project ref is not set");

	const { secret, expiresAt } = makeAppleClientSecret(p8);
	const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
		method: "PATCH",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({ external_apple_secret: secret }),
		signal: AbortSignal.timeout(15_000),
	});
	// Supabase's error body never contains the secret sent; a slice of it says what changed if the API moves.
	if (!res.ok) throw new Error(`Supabase refused the update (${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
	return { expiresAt };
}

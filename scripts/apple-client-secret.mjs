#!/usr/bin/env node
/**
 * Makes the "Secret Key (for OAuth)" Supabase's Apple provider needs for Sign in with Apple on the website: a JWT
 * signed with the Sign in with Apple key (.p8). Apple accepts one for at most 6 months, so it's made again before then
 * (the date is in SECRETS.md). Prints only the secret - pipe it to `clip` and paste it into Supabase.
 *
 *   node scripts/apple-client-secret.mjs <path-to-.p8> [key-id] | clip
 *
 * Usually not needed: the backend renews it monthly (backend/src/services/appleClientSecret.ts, the same JWT - keep
 * the two in step).
 *
 * The .p8 also lives in Secret Manager (apple-signin-key-p8) if the local copy is gone:
 *   gcloud secrets versions access latest --secret=apple-signin-key-p8 --project=stak-c21a3 > AuthKey.p8
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const TEAM_ID = "P6442U4672";
/** The website's Services ID (Identifiers -> Services IDs). */
const CLIENT_ID = "com.stak.demo.web";
/** Apple's limit is 180 days; a day under it. */
const LIFETIME_DAYS = 179;

/** The "STAK Sign in with Apple" key (Apple Developer -> Keys). */
const KEY_ID = "5NH9HT5BA3";

const [keyPath, keyId = KEY_ID] = process.argv.slice(2);
if (!keyPath) {
	console.error("Usage: node scripts/apple-client-secret.mjs <path-to-.p8> [key-id] | clip");
	process.exit(1);
}

const b64url = (data) => Buffer.from(data).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
const payload = b64url(JSON.stringify({
	iss: TEAM_ID,
	iat: now,
	exp: now + LIFETIME_DAYS * 24 * 60 * 60,
	aud: "https://appleid.apple.com",
	sub: CLIENT_ID,
}));
const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
	key: createPrivateKey(readFileSync(keyPath)),
	dsaEncoding: "ieee-p1363",
}).toString("base64url");

process.stdout.write(`${header}.${payload}.${signature}`);
const expires = new Date((now + LIFETIME_DAYS * 24 * 60 * 60) * 1000).toISOString().slice(0, 10);
console.error(`Secret made - it expires ${expires}. Make a new one before then.`);

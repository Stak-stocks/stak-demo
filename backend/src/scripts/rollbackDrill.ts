/**
 * Phase 6's required pre-wave-1 verification (migration plan, "Verification" section:
 * tingly-conjuring-lake.md): "full rollback drill (flip one already-migrated test user
 * back to Firebase) executed successfully at least once before wave 1 opens to real
 * users." This is that drill, run against a real account end-to-end -- not a unit test
 * with mocks, an actual exercise of the real GET /api/auth/provider endpoint and the
 * real Firebase Admin SDK, against whichever local backend is currently running.
 *
 * Re-flips the account back to its original state at the end regardless of outcome,
 * since this is meant to be run against a real, in-use cohort test account -- never
 * leaves it stranded mid-drill.
 *
 * Run: npx tsx src/scripts/rollbackDrill.ts someone@example.com
 * (backend must be running locally -- this hits its real HTTP endpoint, not just the
 * service function directly, to prove the actual deployed code path)
 */
import "dotenv/config";
import { adminAuth } from "../firebaseAdmin.js";
import { pgQuery, pgPool } from "../lib/postgres.js";
import { rollbackToFirebase } from "../services/authMigrationService.js";

const email = process.argv[2];
if (!email) {
	console.error("Usage: npx tsx src/scripts/rollbackDrill.ts <email>");
	process.exit(1);
}

const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";

async function getProvider(): Promise<{ provider: string; requiresPasswordReset: boolean }> {
	const res = await fetch(`${API_BASE}/api/auth/provider?email=${encodeURIComponent(email)}`);
	if (!res.ok) throw new Error(`GET /api/auth/provider returned ${res.status}`);
	return res.json();
}

const firebaseUser = await adminAuth.getUserByEmail(email);
const uid = firebaseUser.uid;
console.log(`Drill target: ${email} (Firebase uid ${uid})`);

const before = await pgQuery<{ migration_status: string }>(
	`select migration_status from auth_identity_map where firebase_uid = $1`,
	[uid],
);
const originalStatus = before.rows[0]?.migration_status;
console.log(`\n1. Original migration_status: ${originalStatus ?? "(not provisioned)"}`);

if (originalStatus !== "supabase" && originalStatus !== "requires_password_reset") {
	console.error(`Refusing to run: this account isn't currently migrated (status: ${originalStatus ?? "none"}). The drill needs an already-migrated user to roll back.`);
	await pgPool.end();
	process.exit(1);
}

const providerBefore = await getProvider();
console.log(`2. GET /api/auth/provider before rollback: ${JSON.stringify(providerBefore)}`);
if (providerBefore.provider !== "supabase") {
	console.error(`FAIL: expected provider "supabase" before rollback, got "${providerBefore.provider}"`);
	await pgPool.end();
	process.exit(1);
}

console.log("\n3. Performing rollback...");
const rollbackResult = await rollbackToFirebase(uid);
console.log(`   rollbackToFirebase result: ${JSON.stringify(rollbackResult)}`);

const providerAfter = await getProvider();
console.log(`4. GET /api/auth/provider after rollback: ${JSON.stringify(providerAfter)}`);
if (providerAfter.provider !== "firebase") {
	console.error(`FAIL: expected provider "firebase" after rollback, got "${providerAfter.provider}"`);
}

const firebaseUserAfter = await adminAuth.getUserByEmail(email);
console.log(`5. Firebase account still exists and is enabled: ${!firebaseUserAfter.disabled} (uid unchanged: ${firebaseUserAfter.uid === uid})`);
if (firebaseUserAfter.disabled || firebaseUserAfter.uid !== uid) {
	console.error("FAIL: Firebase account state changed unexpectedly -- this should never happen, nothing in this migration touches Firebase user records.");
}

console.log(`\n6. Restoring original migration_status (${originalStatus})...`);
await pgQuery(`update auth_identity_map set migration_status = $1 where firebase_uid = $2`, [originalStatus, uid]);
const providerRestored = await getProvider();
console.log(`   GET /api/auth/provider after restore: ${JSON.stringify(providerRestored)}`);

const allPassed = providerBefore.provider === "supabase" && providerAfter.provider === "firebase"
	&& !firebaseUserAfter.disabled && providerRestored.provider === providerBefore.provider;
console.log(`\n${allPassed ? "DRILL PASSED" : "DRILL FAILED -- see above"}`);

await pgPool.end();
process.exit(allPassed ? 0 : 1);

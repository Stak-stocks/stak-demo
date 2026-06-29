/**
 * Provisions (if needed) and flips one real Firebase user's Supabase account into the
 * internal test cohort (migration plan, Phase 5: tingly-conjuring-lake.md) -- sets a
 * real password on their Supabase account (it was created with none -- email/password
 * users get no usable password at provisioning time, by design) and marks
 * migration_status = 'supabase' so login.tsx's provider check routes them to Supabase.
 *
 * Only ever flips the ONE account passed in -- never touches Firebase, never affects
 * any other user. Intended for testing with your own account or another internal
 * teammate's, with their knowledge -- this is exactly the "internal cohort" the plan
 * describes, not a general-purpose admin tool for arbitrary real users.
 *
 * Run: npx tsx src/scripts/setupCohortTestAccount.ts someone@example.com
 */
import "dotenv/config";
import crypto from "crypto";
import { adminAuth } from "../firebaseAdmin.js";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { pgQuery, pgPool } from "../lib/postgres.js";
import { provisionFirebaseUser } from "../services/authMigrationService.js";

const email = process.argv[2];
if (!email) {
	console.error("Usage: npx tsx src/scripts/setupCohortTestAccount.ts <email>");
	process.exit(1);
}

const firebaseUser = await adminAuth.getUserByEmail(email);
console.log(`Found Firebase user: ${firebaseUser.uid} (${firebaseUser.email})`);

const provisionResult = await provisionFirebaseUser({
	uid: firebaseUser.uid,
	email: firebaseUser.email,
	emailVerified: firebaseUser.emailVerified,
	signInProvider: firebaseUser.providerData[0]?.providerId ?? "password",
});
console.log("Provisioning result:", provisionResult.status);

const mapped = await pgQuery<{ supabase_uid: string }>(
	`select supabase_uid from auth_identity_map where firebase_uid = $1`,
	[firebaseUser.uid],
);
const supabaseUid = mapped.rows[0]?.supabase_uid;
if (!supabaseUid) {
	console.error("No supabase_uid found after provisioning -- something went wrong.");
	process.exit(1);
}

const testPassword = crypto.randomBytes(12).toString("base64url");
const { error: pwError } = await getSupabaseAdmin().auth.admin.updateUserById(supabaseUid, { password: testPassword });
if (pwError) {
	console.error("Failed to set password:", pwError.message);
	process.exit(1);
}

await pgQuery(
	`update auth_identity_map set migration_status = 'supabase', migrated_at = now() where firebase_uid = $1`,
	[firebaseUser.uid],
);

console.log("\n✓ Cohort test account ready.");
console.log(`  Email:    ${firebaseUser.email}`);
console.log(`  Password: ${testPassword}`);
console.log(`\nLog in at http://localhost:3000/login with the above -- it should route through Supabase, not Firebase.`);
console.log(`To revert: update auth_identity_map set migration_status = 'firebase' where firebase_uid = '${firebaseUser.uid}';`);

await pgPool.end();

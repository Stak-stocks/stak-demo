/**
 * Phase 4/6 prerequisite: provision Supabase Auth accounts for all Firebase users and
 * record their uid mapping in auth_identity_map (migration plan, Phase 4 Step A:
 * tingly-conjuring-lake.md). Purely additive -- everyone starts on migration_status =
 * 'firebase', so no one's login behavior changes. Run deliberately before opening
 * any wave to real users.
 *
 * Safe to re-run: provisionFirebaseUser() is idempotent (already_provisioned is a
 * no-op), so running this twice won't create duplicate Supabase accounts.
 *
 * Run: npx tsx src/scripts/provisionAllUsers.ts
 */
import "dotenv/config";
import { provisionAllFirebaseUsers } from "../services/authMigrationService.js";
import { pgPool } from "../lib/postgres.js";

console.log("Provisioning Supabase Auth accounts for all Firebase users...\n");

const summary = await provisionAllFirebaseUsers();

console.log("Done.");
console.log(`  Total Firebase users processed: ${summary.total}`);
console.log(`  Newly created:                  ${summary.created}`);
console.log(`  Already provisioned (skipped):  ${summary.alreadyProvisioned}`);
console.log(`  Skipped (no email):             ${summary.skipped}`);
console.log(`  Errors:                         ${summary.errors.length}`);

if (summary.errors.length > 0) {
	console.log("\nErrors:");
	for (const e of summary.errors) {
		console.log(`  ${e.firebaseUid}: ${e.error}`);
	}
}

await pgPool.end();

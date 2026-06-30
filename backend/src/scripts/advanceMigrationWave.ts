/**
 * Phase 6 wave advancement (migration plan, "Step D": tingly-conjuring-lake.md).
 * Thin CLI wrapper around the advance_migration_wave() Postgres function -- defaults
 * to a dry run so the affected set can always be reviewed before committing to it.
 *
 * Run: npx tsx src/scripts/advanceMigrationWave.ts <google.com|password> <percentage> [--apply] [--inactive-days=90]
 * Examples:
 *   npx tsx src/scripts/advanceMigrationWave.ts google.com 1            (dry run, preview wave 1 @ 1%)
 *   npx tsx src/scripts/advanceMigrationWave.ts google.com 1 --apply    (actually advance wave 1)
 */
import "dotenv/config";
import { pgQuery, pgPool } from "../lib/postgres.js";

const [provider, percentageArg, ...rest] = process.argv.slice(2);
const apply = rest.includes("--apply");
const inactiveDaysArg = rest.find((a) => a.startsWith("--inactive-days="));
const inactiveDays = inactiveDaysArg ? Number(inactiveDaysArg.split("=")[1]) : 90;

if (!provider || !percentageArg || (provider !== "google.com" && provider !== "password")) {
	console.error("Usage: npx tsx src/scripts/advanceMigrationWave.ts <google.com|password> <percentage> [--apply] [--inactive-days=90]");
	process.exit(1);
}
const percentage = Number(percentageArg);
if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
	console.error("percentage must be a number between 0 and 100");
	process.exit(1);
}

console.log(`${apply ? "APPLYING" : "DRY RUN (preview only -- pass --apply to commit)"}: provider=${provider}, target=${percentage}%, excluding inactive >${inactiveDays}d`);

const result = await pgQuery<{ firebase_uid: string; email: string; new_status: string }>(
	`select * from advance_migration_wave($1, $2, $3, $4)`,
	[provider, percentage, inactiveDays, !apply],
);

console.log(`\n${apply ? "Advanced" : "Would advance"} ${result.rows.length} user(s):`);
for (const row of result.rows) {
	console.log(`  ${row.email} -> ${row.new_status}`);
}

if (!apply && result.rows.length > 0) {
	console.log(`\nRe-run with --apply to actually advance these ${result.rows.length} user(s).`);
}

await pgPool.end();

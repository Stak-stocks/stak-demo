/**
 * Firebase -> Supabase Auth user provisioning (migration plan, Phase 4, Step A:
 * tingly-conjuring-lake.md). Purely additive and idempotent -- creates a matching
 * Supabase Auth user for each Firebase user and records the mapping in
 * auth_identity_map. Firebase stays the sole live identity provider throughout;
 * nothing here changes any real user's behavior.
 *
 * provisionFirebaseUser() is the core, intentionally decoupled from where the
 * Firebase user data comes from -- it takes a plain shape, not a live adminAuth
 * call, so it's testable against synthetic data without touching real accounts.
 * provisionAllFirebaseUsers() is the real driver (adminAuth.listUsers()) -- run only
 * deliberately, never automatically, since it touches real production user records.
 */
import { adminAuth } from "../firebaseAdmin.js";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { pgQuery, ensureUserRow } from "../lib/postgres.js";

export interface FirebaseUserInput {
	uid: string;
	email: string | undefined;
	emailVerified: boolean;
	signInProvider: "password" | "google.com" | string;
}

export interface ProvisionResult {
	firebaseUid: string;
	status: "created" | "already_provisioned" | "skipped_no_email" | "error";
	supabaseUid?: string;
	error?: string;
}

export async function provisionFirebaseUser(user: FirebaseUserInput): Promise<ProvisionResult> {
	if (!user.email) {
		return { firebaseUid: user.uid, status: "skipped_no_email" };
	}

	// auth_identity_map.firebase_uid FKs to users(uid) -- ensure it exists first, same
	// reasoning as every other ensureUserRow call site in this migration.
	await ensureUserRow(user.uid, user.email);

	const existing = await pgQuery<{ supabase_uid: string }>(
		`select supabase_uid from auth_identity_map where firebase_uid = $1`,
		[user.uid],
	);
	if (existing.rows.length > 0) {
		return { firebaseUid: user.uid, status: "already_provisioned", supabaseUid: existing.rows[0].supabase_uid };
	}

	try {
		const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
			email: user.email,
			email_confirm: user.emailVerified,
			// No password set -- email/password users get no usable password here, by
			// design (scrypt hashes can't become bcrypt). Google users link their real
			// identity later, via the actual OAuth flow in Phase 5/6, not at provisioning.
		});
		if (error || !data?.user) {
			return { firebaseUid: user.uid, status: "error", error: error?.message ?? "unknown error creating user" };
		}

		// migration_status stays 'firebase' for everyone at provisioning time -- Phase 6's
		// wave logic is what later advances it (to 'requires_password_reset' or directly
		// to 'supabase'), not this step. provider is recorded now so that later decision
		// has what it needs.
		await pgQuery(
			`insert into auth_identity_map (firebase_uid, supabase_uid, provider, migration_status)
			values ($1, $2, $3, 'firebase')`,
			[user.uid, data.user.id, user.signInProvider],
		);

		return { firebaseUid: user.uid, status: "created", supabaseUid: data.user.id };
	} catch (err) {
		return { firebaseUid: user.uid, status: "error", error: (err as Error).message };
	}
}

export interface RollbackResult {
	firebaseUid: string;
	status: "rolled_back" | "not_provisioned" | "already_firebase";
	previousStatus?: string;
}

/**
 * Phase 6's rollback mechanism (Step D / "Rollback strategy": tingly-conjuring-lake.md):
 * halting a wave is just not advancing migration_status further -- this function is
 * what actually reverses it for one user. Flips migration_status back to 'firebase',
 * which is all login routing (GET /api/auth/provider) checks -- the dual-accept
 * middleware itself never gates by migration_status, so an already-active Supabase
 * session for this user isn't forcibly killed, only future fresh login attempts route
 * to Firebase again. Firebase was never told to delete this user at any point in the
 * migration, so their original Firebase credentials still work without further action.
 *
 * Deliberately leaves migrated_at untouched -- it's a historical record of when this
 * user was last successfully migrated, not a "currently migrated" flag (migration_status
 * already serves that purpose), so a rollback shouldn't erase it.
 */
export async function rollbackToFirebase(firebaseUid: string): Promise<RollbackResult> {
	const existing = await pgQuery<{ migration_status: string }>(
		`select migration_status from auth_identity_map where firebase_uid = $1`,
		[firebaseUid],
	);
	if (existing.rows.length === 0) {
		return { firebaseUid, status: "not_provisioned" };
	}
	const previousStatus = existing.rows[0]!.migration_status;
	if (previousStatus === "firebase") {
		return { firebaseUid, status: "already_firebase", previousStatus };
	}
	await pgQuery(
		`update auth_identity_map set migration_status = 'firebase' where firebase_uid = $1`,
		[firebaseUid],
	);
	return { firebaseUid, status: "rolled_back", previousStatus };
}

export interface ProvisionAllSummary {
	total: number;
	created: number;
	alreadyProvisioned: number;
	skipped: number;
	errors: ProvisionResult[];
}

/**
 * The real driver against live Firebase Auth data. Deliberately not called from
 * anywhere automatically (no route, no cron, no startup hook) -- run only via an
 * explicit, deliberate admin action, since this touches every real user account.
 */
export async function provisionAllFirebaseUsers(): Promise<ProvisionAllSummary> {
	const summary: ProvisionAllSummary = { total: 0, created: 0, alreadyProvisioned: 0, skipped: 0, errors: [] };
	let nextPageToken: string | undefined;

	do {
		const result = await adminAuth.listUsers(1000, nextPageToken);
		for (const fbUser of result.users) {
			summary.total++;
			const signInProvider = fbUser.providerData[0]?.providerId ?? "password";
			const outcome = await provisionFirebaseUser({
				uid: fbUser.uid,
				email: fbUser.email,
				emailVerified: fbUser.emailVerified,
				signInProvider,
			});
			if (outcome.status === "created") summary.created++;
			else if (outcome.status === "already_provisioned") summary.alreadyProvisioned++;
			else if (outcome.status === "skipped_no_email") summary.skipped++;
			else summary.errors.push(outcome);
		}
		nextPageToken = result.pageToken;
	} while (nextPageToken);

	return summary;
}

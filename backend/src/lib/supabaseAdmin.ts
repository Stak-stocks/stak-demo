/**
 * Supabase admin client (service-role key) -- used for Auth admin operations
 * (provisioning users in Phase 4+) that aren't available via a raw Postgres
 * connection. Mirrors firebaseAdmin.ts's naming/role: a trusted, backend-only,
 * full-access client, never exposed to the frontend.
 *
 * Lazily constructed -- @supabase/supabase-js's createClient validates the URL
 * eagerly and throws immediately on an empty string, which would crash on import
 * in any context that doesn't load .env (the test suite doesn't -- see
 * shadowWrite.ts's tests for the same reasoning re: other optional dependencies).
 * Only actually called when a request genuinely needs the Supabase Auth branch,
 * which nothing in real traffic does yet.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
	if (!client) {
		// .trim() guards against trailing \r\n from the `grep | cut` pipe used to
		// create the Cloud Run secrets on Windows -- a trailing newline in the URL
		// produces a malformed fetch, and in the service role key produces a 401.
		client = createClient(
			(process.env.SUPABASE_URL ?? "").trim(),
			(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
			{ auth: { autoRefreshToken: false, persistSession: false } },
		);
	}
	return client;
}

/**
 * Supabase admin client (service-role key) -- for Auth admin operations not
 * available via a raw Postgres connection (e.g. deleting a user from auth.users
 * programmatically). No live route currently calls this; retained for future
 * admin/script use.
 *
 * Lazily constructed -- @supabase/supabase-js's createClient validates the URL
 * eagerly and throws on an empty string, which would crash on import in any
 * context that doesn't load .env (the test suite doesn't).
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

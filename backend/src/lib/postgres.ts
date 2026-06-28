/**
 * Postgres connection pool for the Supabase migration (see
 * C:\Users\badew\.claude\plans\tingly-conjuring-lake.md). Direct pg access, not the
 * @supabase/supabase-js/PostgREST client -- the backend is a trusted server-side
 * environment with full DB access already (mirrors how firebaseAdmin.ts uses the
 * Admin SDK directly rather than client-style Firestore calls). supabase-js becomes
 * relevant later for the frontend specifically (Phase 5, RLS-secured Realtime), not
 * for the backend's own data access pattern.
 */

import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

pool.on("error", (err) => {
	// A pooled, idle connection dying shouldn't crash the process -- pg already retries
	// new connections on next query; this just stops it being an unhandled rejection.
	console.error("[Postgres] Unexpected pool error:", err.message);
});

export async function pgQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
	text: string,
	params?: unknown[],
): Promise<pg.QueryResult<T>> {
	return pool.query<T>(text, params);
}

export { pool as pgPool };

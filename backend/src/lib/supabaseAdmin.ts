/**
 * Supabase Auth admin (service-role key): reading and deleting a sign-in record, which a raw Postgres connection
 * can't do. Used by account deletion and turned-away (routes/me.ts).
 *
 * Direct calls to the Auth admin API rather than @supabase/supabase-js's createClient: that builds a realtime client
 * too, which throws on Node 20 ("Node.js 20 detected without native WebSocket support") - the server runs Node 20, so
 * every admin call failed. The shape here is the slice of supabase-js's `auth.admin` the routes use, results included.
 */

type AdminResult<T> = { data: T; error: { message: string; status?: number } | null };
export type AdminUser = { id: string; created_at?: string; email?: string; app_metadata?: Record<string, unknown> };

export interface SupabaseAdmin {
	auth: {
		admin: {
			getUserById(id: string): Promise<AdminResult<{ user: AdminUser | null }>>;
			deleteUser(id: string): Promise<AdminResult<null>>;
		};
	};
}

/** One Auth admin request; a failure comes back as `error` (as supabase-js does), never thrown. */
async function adminRequest<T>(method: "GET" | "DELETE", path: string): Promise<{ body: T | null; error: AdminResult<null>["error"] }> {
	// .trim() guards against trailing \r\n from the `grep | cut` pipe used to create the Cloud Run secrets on Windows -
	// a trailing newline in the URL makes a malformed fetch, and in the service-role key a 401.
	const url = (process.env.SUPABASE_URL ?? "").trim();
	const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
	if (!url || !key) return { body: null, error: { message: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set" } };
	try {
		const res = await fetch(`${url}/auth/v1/admin/${path}`, {
			method,
			headers: { apikey: key, Authorization: `Bearer ${key}` },
			signal: AbortSignal.timeout(10_000),
		});
		const text = await res.text();
		const body = text ? (JSON.parse(text) as T) : null;
		if (!res.ok) {
			const reason = (body as { msg?: string; message?: string } | null);
			return { body: null, error: { message: reason?.msg ?? reason?.message ?? `HTTP ${res.status}`, status: res.status } };
		}
		return { body, error: null };
	} catch (e) {
		return { body: null, error: { message: (e as Error).message } };
	}
}

const admin: SupabaseAdmin = {
	auth: {
		admin: {
			async getUserById(id) {
				const { body, error } = await adminRequest<AdminUser>("GET", `users/${encodeURIComponent(id)}`);
				return { data: { user: error ? null : body }, error };
			},
			async deleteUser(id) {
				const { error } = await adminRequest<unknown>("DELETE", `users/${encodeURIComponent(id)}`);
				return { data: null, error };
			},
		},
	},
};

export function getSupabaseAdmin(): SupabaseAdmin {
	return admin;
}

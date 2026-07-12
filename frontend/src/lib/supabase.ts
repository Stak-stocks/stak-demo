/**
 * Supabase client (Firebase -> Supabase migration, see migration plan, Phase 5).
 * Mirrors firebase.ts's setup pattern. Uses the anon/publishable key -- safe to
 * expose, every query goes through RLS. Not yet used by any live code path; this
 * exists so Phase 5's auth/Realtime work has a client to build against.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: { flowType: "pkce" },
});

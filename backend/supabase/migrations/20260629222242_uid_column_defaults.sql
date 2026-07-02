-- Lets a Supabase-session client insert/upsert into its own per-row-owned tables
-- without ever needing to resolve its own canonical Firebase UID client-side --
-- symmetrical with how reads already work (unfiltered selects, scoped by RLS alone,
-- see supabaseAccount.ts). Whenever an insert into these 6 tables omits `uid`, Postgres
-- fills it in from current_firebase_uid() automatically. The RLS "all own" policies
-- (previous migration) already double as the WITH CHECK for insert/update, so a row
-- can't land under any other uid even if one were explicitly supplied incorrectly --
-- this default is purely a convenience for the common case, not the security boundary.
--
-- Doesn't touch users/playground_state -- those have no client-side insert policy
-- (rows are created via the backend's service-role access), so there's nothing for a
-- default to help with there.
--
-- Safe for the backend's existing service-role inserts: a column default only applies
-- when the column is omitted from the INSERT, and the backend always sets `uid`
-- explicitly today.
alter table stak_brands alter column uid set default current_firebase_uid();
alter table passed_brands alter column uid set default current_firebase_uid();
alter table search_history alter column uid set default current_firebase_uid();
alter table intel_card_state alter column uid set default current_firebase_uid();
alter table sandbox_portfolio alter column uid set default current_firebase_uid();
alter table activity_progress alter column uid set default current_firebase_uid();

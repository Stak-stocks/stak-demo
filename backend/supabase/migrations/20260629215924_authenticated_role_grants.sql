-- Fixes a real gap found via live testing: RLS policies (previous migration) only
-- ever take effect on top of an existing table-level GRANT -- they don't substitute
-- for one. Without these grants, every query from the `authenticated` role failed
-- with "permission denied for table X" before RLS was even evaluated, regardless of
-- how correct the policies were. Grants here match exactly what each table's
-- policies allow -- select+update for users/playground_state (no client-side
-- insert/delete), full CRUD for the per-row-owned child tables.
grant select, update on users to authenticated;
grant select, insert, update, delete on stak_brands to authenticated;
grant select, insert, update, delete on passed_brands to authenticated;
grant select, insert, update, delete on search_history to authenticated;
grant select, insert, update, delete on intel_card_state to authenticated;
grant select, insert, update, delete on sandbox_portfolio to authenticated;
grant select, insert, update, delete on activity_progress to authenticated;
grant select, update on playground_state to authenticated;

-- RLS policies + Realtime publication for the tables AccountContext.tsx's Realtime
-- cutover needs direct client access to (migration plan, Phase 5: tingly-conjuring-lake.md).
-- Every table already has RLS enabled (Phase 0 default), with zero policies -- meaning
-- deny-everything until now. These policies are additive and don't affect the backend's
-- service-role access (which bypasses RLS entirely) or anything already built.

-- current_firebase_uid(): maps the calling Supabase session's auth.uid() (a UUID) to the
-- canonical Firebase-UID-format `uid` every table actually uses, via auth_identity_map.
-- SECURITY DEFINER so it can read auth_identity_map despite that table itself having no
-- policies (deny-all) -- safe because it only ever resolves the CALLER's own mapping,
-- never exposes anyone else's.
create or replace function current_firebase_uid()
returns text
language sql
security definer
stable
as $$
	select firebase_uid from auth_identity_map where supabase_uid = auth.uid()
$$;

-- users: read/update own row only. No insert/delete policy -- rows are created via the
-- backend's service-role access (ensureUserRow-style upserts), never directly by clients.
create policy "users select own" on users for select using (uid = current_firebase_uid());
create policy "users update own" on users for update using (uid = current_firebase_uid());

-- Per-row-owned child tables: full CRUD on own rows.
create policy "stak_brands all own" on stak_brands for all using (uid = current_firebase_uid());
create policy "passed_brands all own" on passed_brands for all using (uid = current_firebase_uid());
create policy "search_history all own" on search_history for all using (uid = current_firebase_uid());
create policy "intel_card_state all own" on intel_card_state for all using (uid = current_firebase_uid());
create policy "sandbox_portfolio all own" on sandbox_portfolio for all using (uid = current_firebase_uid());
create policy "activity_progress all own" on activity_progress for all using (uid = current_firebase_uid());
create policy "playground_state select own" on playground_state for select using (uid = current_firebase_uid());
create policy "playground_state update own" on playground_state for update using (uid = current_firebase_uid());

-- Realtime: broadcast change events for the tables AccountContext.tsx's account object
-- is assembled from. swipes/events/sessions/stocks/app_config/auth_identity_map are
-- deliberately excluded -- analytics/catalog/internal tables, not part of any user's
-- live account view.
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table stak_brands;
alter publication supabase_realtime add table passed_brands;
alter publication supabase_realtime add table search_history;
alter publication supabase_realtime add table intel_card_state;
alter publication supabase_realtime add table sandbox_portfolio;
alter publication supabase_realtime add table activity_progress;
alter publication supabase_realtime add table playground_state;

-- Harden add_to_sandbox/mark_sandbox_milestone (Phase 3 TODO): now resolve the acting
-- user from current_firebase_uid() internally instead of trusting a passed-in p_uid.
-- Safe to change the signature outright -- nothing calls these yet (confirmed scaffolding
-- only, Phase 3). SECURITY DEFINER so the function body can read/write these tables
-- regardless of the RLS policies above (which gate direct client table access, not this
-- function's own internal logic).
--
-- create or replace function does NOT replace a function whose parameter list changed --
-- Postgres treats a different signature as a separate overload, which would leave the old,
-- p_uid-trusting version callable. Drop the old signatures explicitly first.
drop function if exists add_to_sandbox(text, text, numeric, numeric, text);
drop function if exists mark_sandbox_milestone(text, int);

create or replace function add_to_sandbox(
	p_ticker text, p_price_at_add numeric, p_shares numeric, p_thesis text default null
)
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
	v_cost numeric;
	v_live_cash numeric;
	v_existing_shares numeric;
	v_existing_price numeric;
	v_existing_added_at timestamptz;
	v_existing_thesis text;
	v_new_shares numeric;
	v_new_price numeric;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	v_cost := round(coalesce(p_price_at_add, 0) * p_shares, 2);
	if v_cost <= 0 then
		return;
	end if;

	insert into playground_state (uid, sandbox_cash) values (v_uid, 1000)
	on conflict (uid) do nothing;

	select sandbox_cash into v_live_cash from playground_state where uid = v_uid for update;
	v_live_cash := coalesce(v_live_cash, 1000);

	if v_live_cash < v_cost then
		return;
	end if;

	select shares, price_at_add, added_at, thesis
	into v_existing_shares, v_existing_price, v_existing_added_at, v_existing_thesis
	from sandbox_portfolio where uid = v_uid and ticker = p_ticker;

	v_existing_shares := coalesce(v_existing_shares, 0);
	v_new_shares := round(v_existing_shares + p_shares, 3);

	if v_existing_shares > 0 and v_existing_price is not null and p_price_at_add is not null then
		v_new_price := round((v_existing_price * v_existing_shares + p_price_at_add * p_shares) / v_new_shares, 2);
	else
		v_new_price := p_price_at_add;
	end if;

	insert into sandbox_portfolio (uid, ticker, shares, price_at_add, added_at, thesis)
	values (v_uid, p_ticker, v_new_shares, v_new_price, coalesce(v_existing_added_at, now()), coalesce(p_thesis, v_existing_thesis))
	on conflict (uid, ticker) do update set
		shares = excluded.shares, price_at_add = excluded.price_at_add, thesis = excluded.thesis;

	update playground_state set sandbox_cash = round(v_live_cash - v_cost, 2) where uid = v_uid;
end;
$$ language plpgsql;

create or replace function mark_sandbox_milestone(p_value int)
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	insert into playground_state (uid) values (v_uid) on conflict (uid) do nothing;

	update playground_state
	set sandbox_milestones = array_append(coalesce(sandbox_milestones, array[]::int[]), p_value)
	where uid = v_uid and not (p_value = any(coalesce(sandbox_milestones, array[]::int[])));
end;
$$ language plpgsql;

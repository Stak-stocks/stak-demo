-- Postgres equivalents of AccountContext.tsx's addToSandbox/markSandboxMilestone -- the
-- 2 frontend transactions in the migration plan (tingly-conjuring-lake.md). Not callable
-- by the frontend yet (that's Phase 5, once Supabase Auth/RLS exist) -- p_uid is an
-- explicit parameter for now, same as the 3 backend RPCs, since nothing can call these
-- as the authenticated user yet. TODO Phase 5: make these SECURITY DEFINER with an
-- internal `uid = auth.uid()` check instead of trusting the caller's p_uid -- per the
-- plan, this is a deliberate security upgrade over today's client-trusted Firestore
-- transaction, not just a port.

create or replace function add_to_sandbox(
	p_uid text, p_ticker text, p_price_at_add numeric, p_shares numeric, p_thesis text default null
)
returns void as $$
declare
	v_cost numeric;
	v_live_cash numeric;
	v_existing_shares numeric;
	v_existing_price numeric;
	v_existing_added_at timestamptz;
	v_existing_thesis text;
	v_new_shares numeric;
	v_new_price numeric;
begin
	v_cost := round(coalesce(p_price_at_add, 0) * p_shares, 2);
	if v_cost <= 0 then
		return;
	end if;

	-- Ensure users(uid) exists first -- playground_state FKs to it -- then ensure a
	-- playground_state row exists before locking/updating it. Without the latter, a
	-- brand-new user (no row yet) would pass the cash check via the COALESCE fallback
	-- below but the cash-deduction UPDATE at the end would silently affect zero rows.
	insert into users (uid) values (p_uid) on conflict (uid) do nothing;
	insert into playground_state (uid, sandbox_cash) values (p_uid, 1000)
	on conflict (uid) do nothing;

	select sandbox_cash into v_live_cash from playground_state where uid = p_uid for update;
	-- 1000 matches SANDBOX_BUDGET_BY_TIER[1] in AccountContext.tsx -- the JS version
	-- falls back to the tier-1 starting budget, not zero, when sandboxCash is unset.
	v_live_cash := coalesce(v_live_cash, 1000);

	if v_live_cash < v_cost then
		return;
	end if;

	select shares, price_at_add, added_at, thesis
	into v_existing_shares, v_existing_price, v_existing_added_at, v_existing_thesis
	from sandbox_portfolio where uid = p_uid and ticker = p_ticker;

	v_existing_shares := coalesce(v_existing_shares, 0);
	-- 3 decimal places -- mirrors the JS Math.round(x * 1000) / 1000 (fractional shares)
	v_new_shares := round(v_existing_shares + p_shares, 3);

	if v_existing_shares > 0 and v_existing_price is not null and p_price_at_add is not null then
		-- Weighted average cost basis, same formula as the existing JS transaction
		v_new_price := round((v_existing_price * v_existing_shares + p_price_at_add * p_shares) / v_new_shares, 2);
	else
		v_new_price := p_price_at_add;
	end if;

	insert into sandbox_portfolio (uid, ticker, shares, price_at_add, added_at, thesis)
	values (p_uid, p_ticker, v_new_shares, v_new_price, coalesce(v_existing_added_at, now()), coalesce(p_thesis, v_existing_thesis))
	on conflict (uid, ticker) do update set
		shares = excluded.shares, price_at_add = excluded.price_at_add, thesis = excluded.thesis;

	update playground_state set sandbox_cash = round(v_live_cash - v_cost, 2) where uid = p_uid;
end;
$$ language plpgsql;

-- This is actually an upgrade, not just a port: the existing JS version reads from
-- local React state (account.sandboxMilestones), not a fresh Firestore read, so two
-- rapid calls can race and the second write can silently clobber the first's milestone.
-- This single atomic UPDATE...WHERE has no such race -- no read-then-write round trip
-- needed at all, per the plan.
create or replace function mark_sandbox_milestone(p_uid text, p_value int)
returns void as $$
begin
	-- Same row-must-exist-first reasoning as add_to_sandbox above.
	insert into users (uid) values (p_uid) on conflict (uid) do nothing;
	insert into playground_state (uid) values (p_uid) on conflict (uid) do nothing;

	update playground_state
	set sandbox_milestones = array_append(coalesce(sandbox_milestones, array[]::int[]), p_value)
	where uid = p_uid and not (p_value = any(coalesce(sandbox_milestones, array[]::int[])));
end;
$$ language plpgsql;

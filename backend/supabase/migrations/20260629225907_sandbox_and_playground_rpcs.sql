-- Real bug fix found while building the rest of the Phase 5 sandbox/playground
-- write-side: sandbox_cash/sandbox_tier were NOT NULL with a default of 0, which
-- means once a playground_state row exists for ANY reason (e.g. completing a lesson
-- first), the read side can no longer distinguish "never initialized" from
-- "legitimately spent down to/reset to 0" -- initSandboxCash's guard
-- (sandboxCash !== undefined) would then silently skip initialization forever,
-- leaving the user permanently stuck with sandboxCash: 0 instead of their real
-- tier-based starting budget. Dropping the defaults and allowing NULL restores that
-- distinction, matching how a Firestore doc with no sandboxCash field behaves.
alter table playground_state alter column sandbox_cash drop default;
alter table playground_state alter column sandbox_cash drop not null;
alter table playground_state alter column sandbox_tier drop default;
alter table playground_state alter column sandbox_tier drop not null;

-- Shared tier logic, matching AccountContext.tsx's xpToSandboxTier/SANDBOX_BUDGET_BY_TIER
-- exactly -- defined once so every RPC below (and any future one) computes the same
-- tier/budget the frontend does, instead of re-deriving it inconsistently per function.
create or replace function xp_to_sandbox_tier(p_xp int)
returns int language sql immutable as $$
	select case when p_xp >= 7500 then 5 when p_xp >= 3500 then 4 when p_xp >= 1500 then 3 when p_xp >= 500 then 2 else 1 end
$$;

create or replace function sandbox_budget_for_tier(p_tier int)
returns numeric language sql immutable as $$
	select case p_tier when 1 then 1000 when 2 then 3000 when 3 then 5000 when 4 then 10000 when 5 then 25000 else 1000 end
$$;

-- Real bug fix in add_to_sandbox (previous migration): the "row doesn't exist yet"
-- fallback hardcoded 1000 (tier-1 budget) regardless of the user's actual XP --
-- wrong for anyone with XP >= 500 who touches the sandbox before initSandboxCash
-- has run. Now computes the correct tier-based budget from total_xp.
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
	v_total_xp int;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	v_cost := round(coalesce(p_price_at_add, 0) * p_shares, 2);
	if v_cost <= 0 then
		return;
	end if;

	select total_xp into v_total_xp from playground_state where uid = v_uid;
	insert into playground_state (uid, sandbox_cash, sandbox_tier)
	values (v_uid, sandbox_budget_for_tier(xp_to_sandbox_tier(coalesce(v_total_xp, 0))), xp_to_sandbox_tier(coalesce(v_total_xp, 0)))
	on conflict (uid) do nothing;

	select sandbox_cash into v_live_cash from playground_state where uid = v_uid for update;
	if v_live_cash is null then
		select sandbox_budget_for_tier(xp_to_sandbox_tier(coalesce(total_xp, 0))) into v_live_cash from playground_state where uid = v_uid;
	end if;

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

-- initSandboxCash: only ever sets the starting budget if sandbox_cash is genuinely
-- unset (NULL) -- matches the Firestore guard exactly now that the column is
-- nullable.
create or replace function init_sandbox_cash()
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
	v_total_xp int;
	v_tier int;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	select total_xp into v_total_xp from playground_state where uid = v_uid;
	v_tier := xp_to_sandbox_tier(coalesce(v_total_xp, 0));

	insert into playground_state (uid, sandbox_cash, sandbox_tier)
	values (v_uid, sandbox_budget_for_tier(v_tier), v_tier)
	on conflict (uid) do update set
		sandbox_cash = coalesce(playground_state.sandbox_cash, sandbox_budget_for_tier(v_tier)),
		sandbox_tier = coalesce(playground_state.sandbox_tier, v_tier)
	where playground_state.sandbox_cash is null;
end;
$$ language plpgsql;

-- sellFromSandbox: sell some or all shares of one ticker, credit cash back. Mirrors
-- the Firestore version's pnl-is-computed-but-unused-server-side behavior exactly
-- (pnl is calculated client-side today purely for the sale confirmation UI, never
-- persisted) -- so this RPC doesn't need to return or store it either.
create or replace function sell_from_sandbox(p_ticker text, p_current_value numeric, p_shares_to_sell numeric default null)
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
	v_existing_shares numeric;
	v_qty numeric;
	v_remaining numeric;
	v_current_cash numeric;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	select shares into v_existing_shares from sandbox_portfolio where uid = v_uid and ticker = p_ticker;
	v_existing_shares := coalesce(v_existing_shares, 0);
	v_qty := coalesce(p_shares_to_sell, v_existing_shares);
	v_remaining := round(v_existing_shares - v_qty, 3);

	if v_remaining <= 0 then
		delete from sandbox_portfolio where uid = v_uid and ticker = p_ticker;
	else
		update sandbox_portfolio set shares = v_remaining where uid = v_uid and ticker = p_ticker;
	end if;

	select sandbox_cash into v_current_cash from playground_state where uid = v_uid;
	update playground_state set sandbox_cash = round(coalesce(v_current_cash, 0) + p_current_value, 2) where uid = v_uid;
end;
$$ language plpgsql;

create or replace function reset_sandbox()
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
	v_total_xp int;
	v_tier int;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	select total_xp into v_total_xp from playground_state where uid = v_uid;
	v_tier := xp_to_sandbox_tier(coalesce(v_total_xp, 0));

	delete from sandbox_portfolio where uid = v_uid;
	insert into playground_state (uid, sandbox_cash, sandbox_tier, sandbox_milestones)
	values (v_uid, sandbox_budget_for_tier(v_tier), v_tier, array[]::int[])
	on conflict (uid) do update set
		sandbox_cash = sandbox_budget_for_tier(v_tier), sandbox_tier = v_tier, sandbox_milestones = array[]::int[];
end;
$$ language plpgsql;

-- Mirrors AccountContext.tsx's tier-upgrade useEffect: when XP crosses a tier
-- boundary, top up sandbox_cash by the budget difference rather than overwriting it
-- (preserves whatever the user has actually earned/spent in the sandbox). Existing
-- rows with no tier stamped yet (sandbox_tier is null) get silently stamped to the
-- current tier with no cash change, same as the Firestore migration-on-read behavior.
create or replace function check_and_apply_sandbox_tier_upgrade()
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
	v_total_xp int;
	v_stored_tier int;
	v_current_tier int;
	v_cash numeric;
	v_increase numeric;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	select total_xp, sandbox_tier, sandbox_cash into v_total_xp, v_stored_tier, v_cash
	from playground_state where uid = v_uid for update;

	if v_cash is null then
		-- Sandbox never initialized for this user -- nothing to upgrade yet.
		return;
	end if;

	v_current_tier := xp_to_sandbox_tier(coalesce(v_total_xp, 0));

	if v_stored_tier is null then
		update playground_state set sandbox_tier = v_current_tier where uid = v_uid;
		return;
	end if;

	if v_current_tier <= v_stored_tier then
		return;
	end if;

	v_increase := sandbox_budget_for_tier(v_current_tier) - sandbox_budget_for_tier(v_stored_tier);
	update playground_state set sandbox_cash = round(v_cash + v_increase, 2), sandbox_tier = v_current_tier where uid = v_uid;
end;
$$ language plpgsql;

create or replace function mark_playground_onboarded()
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;
	insert into playground_state (uid, playground_onboarded) values (v_uid, true)
	on conflict (uid) do update set playground_onboarded = true;
end;
$$ language plpgsql;

create or replace function save_generated_lesson_history(p_topic text, p_title text, p_angle text)
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
	v_entry jsonb;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;
	v_entry := jsonb_build_object('topic', p_topic, 'title', p_title, 'angle', p_angle, 'completedAt', (extract(epoch from now()) * 1000)::bigint);
	insert into playground_state (uid, generated_lesson_history) values (v_uid, jsonb_build_array(v_entry))
	on conflict (uid) do update set generated_lesson_history = playground_state.generated_lesson_history || v_entry;
end;
$$ language plpgsql;

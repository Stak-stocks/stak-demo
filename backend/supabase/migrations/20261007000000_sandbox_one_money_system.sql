-- ── sandbox_one_money_system ───────────────────────────────────────────────────────────
-- One money system (2026-10-07): a portfolio starts on the amount its owner picks at
-- /api/sandbox/setup, and XP tiers no longer add cash (/init and /tier-upgrade are no-ops).
-- A portfolio still on tier money keeps every dollar it has: what its tier had granted
-- becomes the amount it "started with", so its gains read the same on every platform and
-- a reset restarts it there. Its trades, positions and cash are untouched. Safe to re-run.

-- The ALTER below needs a brief exclusive lock on a busy table: fail fast rather than queue
-- every /buy and XP write behind a long transaction (re-run if it times out).
set local lock_timeout = '3s';

-- Every portfolio that has cash but no start: the tier portfolios, and any row an older
-- backend revision created while this rolled out. The stored tier is what was paid out; a
-- row without one is read from its XP (xpToTier's thresholds).
update playground_state
set
	sandbox_start = case coalesce(sandbox_tier,
			case
				when coalesce(total_xp, 0) >= 7500 then 5
				when coalesce(total_xp, 0) >= 3500 then 4
				when coalesce(total_xp, 0) >= 1500 then 3
				when coalesce(total_xp, 0) >= 500 then 2
				else 1
			end)
		when 1 then 1000
		when 2 then 3000
		when 3 then 5000
		when 4 then 10000
		when 5 then 25000
		else 1000
	end,
	sandbox_cash_source = 'free_choice'
where sandbox_cash is not null
	and (sandbox_cash_source = 'tier' or sandbox_start is null);

-- A portfolio is only ever created by /setup now, which names its own source.
alter table playground_state alter column sandbox_cash_source set default 'free_choice';

-- The pre-API sandbox RPCs (20260629225907) are security definer and still callable by any
-- signed-in user, and no client has used them since the backend took over: the tier
-- top-up would undo this change, and the buy/sell pair trusts a client-sent price.
-- Revoked rather than dropped, so the history stays readable.
revoke execute on function init_sandbox_cash() from public, anon, authenticated;
revoke execute on function reset_sandbox() from public, anon, authenticated;
revoke execute on function check_and_apply_sandbox_tier_upgrade() from public, anon, authenticated;
revoke execute on function sell_from_sandbox(text, numeric, numeric) from public, anon, authenticated;
revoke execute on function add_to_sandbox(text, numeric, numeric, text) from public, anon, authenticated;

-- ── sandbox_trades_cost_basis ──────────────────────────────────────────────────────────
-- A sale records the position's average cost at the moment it sold, so realized gains are
-- (price - cost_basis) x shares on every platform - no longer replayed from buys that may
-- predate the trade ledger (or fall off the page the apps read), which showed a real loss
-- as a profit. Null on buys, and on sales from before this column. Safe to re-run.
alter table sandbox_trades add column if not exists cost_basis numeric;

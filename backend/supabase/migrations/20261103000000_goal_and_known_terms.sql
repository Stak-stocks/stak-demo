-- ── investing goal: terms already explained, and Home's goal check-in ─────────────────────────
-- known_terms: how many STAK AI answers have used each investing term (backend/src/services/investingGoal.ts
-- TERMS), so after a couple it stops defining them - "Learn how investing works" shouldn't mean the basics forever.
-- goal_check_in: the answers to Home's "Still want STAK to explain the basics?" card ({ asks, lastAskedAt, last }),
-- which decide when it may come back. Only the server writes either (signed-in users may update only the columns
-- granted in 20261009000000_eligibility.sql). Safe to re-run.

-- The ALTER needs a brief exclusive lock on a busy table: fail fast rather than queue every request
-- behind a long transaction (re-run if it times out).
set local lock_timeout = '5s';
alter table users add column if not exists known_terms jsonb not null default '{}'::jsonb;
alter table users add column if not exists goal_check_in jsonb;

-- ── sessions.platform: which app a day's visit came from ────────────────────────────────────────
-- ios / android / web, from the request's User-Agent when GET /api/me records the day (backend/src/routes/me.ts):
-- the last one seen that day. The beta report (GET /api/admin/analytics/beta) shows each person's latest. Older rows
-- stay null. Safe to re-run.

-- The ALTER needs a brief exclusive lock: fail fast rather than queue every request behind a long transaction
-- (re-run if it times out).
set local lock_timeout = '5s';
alter table sessions add column if not exists platform text;

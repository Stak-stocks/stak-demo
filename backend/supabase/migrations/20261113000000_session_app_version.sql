-- ── sessions.app_version: which build a day's visit came from ───────────────────────────────────
-- "1.0 (13)" from the apps' X-App-Version header (the 2026-11-13 builds), or "build 12" from an older iPhone build's
-- User-Agent, when GET /api/me records the day (backend/src/routes/me.ts): the last one seen that day. The beta report
-- (POST /api/admin/analytics/beta) shows each person's latest. The web and older Android builds stay null. Safe to re-run.

-- The ALTER needs a brief exclusive lock: fail fast rather than queue every request behind a long transaction
-- (re-run if it times out).
set local lock_timeout = '5s';
alter table sessions add column if not exists app_version text;

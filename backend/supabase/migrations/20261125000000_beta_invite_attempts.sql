-- The beta selection email's duplicate guard (POST /api/admin/analytics/beta/invite):
--   beta_invite_first_try_at: the first attempt of the current claim; a send that never got Resend's id is retried only
--     within 23 hours of it, while Resend's idempotency key (kept 24h) still stops a second email
--   beta_invite_maybe_sent: Resend's answer was unclear (a timeout, a 5xx, a 409): it may have gone out, so a later
--     clear failure doesn't forget the first try
-- Run before deploying the backend that writes them. Safe to re-run.
alter table waitlist
	add column if not exists beta_invite_first_try_at timestamptz,
	add column if not exists beta_invite_maybe_sent boolean not null default false;

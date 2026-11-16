-- The beta selection email ("You've been selected for the STAK beta"), sent once per tester from the beta sheet
-- (POST /api/admin/analytics/beta/invite):
--   beta_invite_sent_at / _message_id: it went out (Resend's id), so the tester is never emailed twice
--   beta_invite_error: why the last send failed - the next "Send selection emails" retries it
-- Safe to re-run.
alter table waitlist
	add column if not exists beta_invite_sent_at timestamptz,
	add column if not exists beta_invite_message_id text,
	add column if not exists beta_invite_error text;

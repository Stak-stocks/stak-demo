-- Early-access follow-through: the confirmation email, the Tally beta profile, and opting out.
--   confirmation_sent_at / _message_id: the branded email went out (Resend's id), so a repeat sign-up isn't re-sent
--   confirmation_error: why the last send failed - a later sign-up with the same address retries it
--   beta_profile_completed_at / tally_submission_id: set by the Tally webhook when they finish the beta profile
--   unsubscribed_at: set by the email's unsubscribe link; nothing more is sent to that address
alter table waitlist
	add column if not exists confirmation_sent_at timestamptz,
	add column if not exists confirmation_message_id text,
	add column if not exists confirmation_error text,
	add column if not exists beta_profile_completed_at timestamptz,
	add column if not exists tally_submission_id text,
	add column if not exists unsubscribed_at timestamptz;

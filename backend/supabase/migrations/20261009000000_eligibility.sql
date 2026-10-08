-- ── eligibility: the beta's 18+ / U.S. confirmation and the accepted Terms / Privacy ──────────
-- Before an account gets going it confirms its date of birth (18 or older - the date itself is
-- never stored, only that it was confirmed and when), that it's in the United States, and that
-- it accepts the Terms of Service and Privacy Policy (the versions, and when). A refused sign-up's
-- email is kept only as a SHA-256 hash, for 30 days, so it can't simply try again. Safe to re-run.

-- The ALTER needs a brief exclusive lock on a busy table: fail fast rather than queue every request
-- behind a long transaction (re-run if it times out).
set local lock_timeout = '5s';
alter table users add column if not exists age_confirmed boolean not null default false;
alter table users add column if not exists age_confirmed_at timestamptz;
alter table users add column if not exists country_confirmed boolean not null default false;
alter table users add column if not exists terms_version text;
alter table users add column if not exists terms_accepted_at timestamptz;
alter table users add column if not exists privacy_version text;
alter table users add column if not exists privacy_accepted_at timestamptz;

create table if not exists signup_blocks (
	email_hash text primary key,
	blocked_until timestamptz not null,
	created_at timestamptz not null default now()
);
alter table signup_blocks enable row level security;

-- Only the server sets these - or anything else on the account a user shouldn't choose for themselves. A signed-in
-- user could update every column of their own users row straight through Supabase (grant in 20260629215924): mark
-- themselves confirmed, backdate created_at past the date this check is enforced from, or set plan = 'plus'. The web
-- writes only these three columns directly; everything else goes through the server, which connects as postgres and
-- is unaffected.
revoke update on users from authenticated;
grant update (deck_order, preferences, last_brief_date) on users to authenticated;

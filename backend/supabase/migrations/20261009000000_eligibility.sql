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

-- Only the server sets these. A signed-in user can write parts of their own users row straight through Supabase (the
-- web saves its deck order that way), so without this they could mark themselves confirmed and skip the check.
create or replace function users_eligibility_server_only() returns trigger language plpgsql as $$
begin
	if current_user in ('authenticated', 'anon') then
		if tg_op = 'INSERT' then
			new.age_confirmed := false; new.age_confirmed_at := null; new.country_confirmed := false;
			new.terms_version := null; new.terms_accepted_at := null; new.privacy_version := null; new.privacy_accepted_at := null;
		else
			new.age_confirmed := old.age_confirmed; new.age_confirmed_at := old.age_confirmed_at;
			new.country_confirmed := old.country_confirmed;
			new.terms_version := old.terms_version; new.terms_accepted_at := old.terms_accepted_at;
			new.privacy_version := old.privacy_version; new.privacy_accepted_at := old.privacy_accepted_at;
		end if;
	end if;
	return new;
end $$;
drop trigger if exists users_eligibility_server_only on users;
create trigger users_eligibility_server_only before insert or update on users
	for each row execute function users_eligibility_server_only();

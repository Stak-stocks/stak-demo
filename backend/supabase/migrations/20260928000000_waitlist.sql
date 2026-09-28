-- Early-access sign-ups from the landing page's "Get early access" button.
-- Emails are stored trimmed and lower-cased, so the unique constraint catches a repeat sign-up however it's typed.
-- Only the backend writes here (POST /api/waitlist); with RLS on and no policies, the browser can't read the list.
create table if not exists waitlist (
	id bigint generated always as identity primary key,
	email text not null unique,
	source text not null default 'landing',
	created_at timestamptz not null default now()
);
alter table waitlist enable row level security;

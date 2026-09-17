-- My STAK redesign groundwork: keep the history premium features will need later,
-- even while the free app only shows the latest state.

-- Every save and unsave. stak_brands holds only what is saved right now, so an unsave
-- used to leave no trace at all.
create table stak_save_log (
	id bigint generated always as identity primary key,
	uid text not null references users(uid) on delete cascade,
	brand_id text not null,
	action text not null check (action in ('save', 'unsave')),
	price numeric,
	occurred_at timestamptz not null default now()
);
create index stak_save_log_uid_idx on stak_save_log (uid, occurred_at desc);
alter table stak_save_log enable row level security;

-- The saves that exist today, as the log's first entries.
insert into stak_save_log (uid, brand_id, action, price, occurred_at)
select uid, brand_id, 'save', price_at_save, saved_at from stak_brands;

-- One copy of each account's taste scores per day, so the Taste Graph can show how
-- interests changed over time.
create table taste_snapshots (
	uid text not null references users(uid) on delete cascade,
	day date not null,
	tag_scores jsonb not null,
	primary key (uid, day)
);
alter table taste_snapshots enable row level security;

-- Free or STAK+. Checked in one place (backend lib/entitlements.ts, Android Entitlements).
alter table users add column plan text not null default 'free' check (plan in ('free', 'plus'));

-- Per-account event look-ups (revisits, Taste Graph evidence).
create index events_uid_type_idx on events (uid, type, occurred_at desc);

-- "Updates in your STAK": what changed at a saved company, detected once a day (twice
-- when something big breaks) and shared by every user who saved that company, so the
-- cost grows with the number of companies rather than the number of users.
create table stock_updates (
	id bigint generated always as identity primary key,
	ticker text not null,
	/** The Eastern day it was detected, with `slot` separating a second run's update. */
	day date not null,
	slot smallint not null default 1,
	/** What kind of change: earnings, guidance, analyst, business. */
	kind text not null check (kind in ('earnings', 'guidance', 'analyst', 'business')),
	/** "Cloud growth slowed" - the change itself, in the app's words. */
	title text not null,
	/** One plain sentence of context. */
	body text not null,
	/** What it means for the story from here; shown under the change. */
	watch text,
	/** The headlines behind it: [{ source, url, headline, datetime }]. */
	sources jsonb not null default '[]'::jsonb,
	occurred_at timestamptz not null default now(),
	unique (ticker, day, slot, kind)
);
create index stock_updates_ticker_idx on stock_updates (ticker, occurred_at desc);

-- Read state is per user; the update itself is shared.
create table update_reads (
	uid text not null references users(uid) on delete cascade,
	update_id bigint not null references stock_updates(id) on delete cascade,
	read_at timestamptz not null default now(),
	primary key (uid, update_id)
);
create index update_reads_uid_idx on update_reads (uid);

alter table stock_updates enable row level security;
alter table update_reads enable row level security;

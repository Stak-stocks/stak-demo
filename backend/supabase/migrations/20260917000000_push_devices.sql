-- ── push_devices: where to send a user's push notifications ──────────────────────────
-- One row per app install (FCM registration token). The alert switches live here, not on
-- the user, because they are set per phone in the app's notification settings. timezone
-- is the phone's IANA zone, so the morning deck reminder lands at 9am where the phone is.
create table push_devices (
	token text primary key,
	uid text not null references users(uid) on delete cascade,
	platform text not null default 'android',
	timezone text not null default 'America/New_York',
	price_alerts boolean not null default true,
	daily_deck boolean not null default true,
	updated_at timestamptz not null default now()
);
create index push_devices_uid_idx on push_devices (uid);
alter table push_devices enable row level security;

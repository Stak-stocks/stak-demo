-- ── android_device_state ──────────────────────────────────────────────────────────────
-- Server copy of the phone-only state a fresh Android install used to start without:
-- the practice portfolio ledger, the notification inbox's read ids, and saved news.
-- One row per user; each field is written independently so one feature's sync never
-- clobbers another's.
create table android_device_state (
	uid text primary key references users(uid) on delete cascade,
	portfolio jsonb,
	notif_read text[] not null default '{}',
	news_saved text[] not null default '{}',
	updated_at timestamptz not null default now()
);
alter table android_device_state enable row level security;

create policy "android_device_state all own" on android_device_state for all using (uid = current_firebase_uid());

grant select, insert, update, delete on android_device_state to authenticated;

alter publication supabase_realtime add table android_device_state;

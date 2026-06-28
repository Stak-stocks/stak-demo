-- Phase 0 schema for the Firebase -> Supabase migration.
-- See C:\Users\badew\.claude\plans\tingly-conjuring-lake.md for full context and reasoning.
--
-- uid stays `text` (Firebase UID format) through the data-migration phases -- Firebase
-- UIDs aren't UUIDs, and there's no auth.users FK yet since Supabase Auth isn't in use
-- until Phase 4+. Every table has RLS enabled from creation (deny-by-default until a
-- policy is explicitly added) -- policies get added per-route as each phase actually
-- migrates that route, not all at once here.
--
-- Child tables FK to users(uid) with ON DELETE CASCADE so deleting a user cleans up
-- every related row automatically -- the relational equivalent of today's single
-- Cloud Function (cleanupUserData) deleting one Firestore doc that held everything inline.

-- ── users: core account row ──────────────────────────────────────────────────────────
create table users (
	uid text primary key,
	email text,
	display_name text,
	phone text,
	preferences jsonb not null default '{}'::jsonb,
	onboarding_completed boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	-- daily swipe limit (swipeLimitService.ts)
	daily_swipe_date text,
	daily_swipe_count int not null default 0,
	bonus_swipes int not null default 0,
	total_swipe_count int not null default 0,
	total_intel_views int not null default 0,

	-- streak (streakService.ts)
	streak_count int not null default 0,
	last_streak_date text,
	grace_used boolean not null default false,
	grace_week text,
	badges text[] not null default '{}',

	-- taste profile + misc per-account state
	tag_scores jsonb not null default '{}'::jsonb,
	deck_order text[] not null default '{}',
	last_brief_date text
);
alter table users enable row level security;

-- ── stak_brands: saved/watchlisted brands ────────────────────────────────────────────
create table stak_brands (
	uid text not null references users(uid) on delete cascade,
	brand_id text not null,
	saved_at timestamptz not null default now(),
	price_at_save numeric,
	primary key (uid, brand_id)
);
alter table stak_brands enable row level security;

-- ── passed_brands ─────────────────────────────────────────────────────────────────────
create table passed_brands (
	uid text not null references users(uid) on delete cascade,
	brand_id text not null,
	first_passed_at timestamptz not null default now(),
	pass_count int not null default 1,
	primary key (uid, brand_id)
);
alter table passed_brands enable row level security;

-- ── intel_card_state ──────────────────────────────────────────────────────────────────
create table intel_card_state (
	uid text primary key references users(uid) on delete cascade,
	last_date text,
	queue text[] not null default '{}',
	read_ids text[] not null default '{}'
);
alter table intel_card_state enable row level security;

-- ── search_history ────────────────────────────────────────────────────────────────────
create table search_history (
	uid text not null references users(uid) on delete cascade,
	query text not null,
	at timestamptz not null default now(),
	primary key (uid, query)
);
alter table search_history enable row level security;

-- ── playground_state: education subsystem core row ───────────────────────────────────
create table playground_state (
	uid text primary key references users(uid) on delete cascade,
	total_xp int not null default 0,
	sandbox_cash numeric not null default 0,
	sandbox_tier int not null default 0,
	sandbox_milestones int[] not null default '{}',
	daily_progress jsonb not null default '{}'::jsonb,
	all_time_completed_activity_ids text[] not null default '{}',
	playground_onboarded boolean not null default false,
	generated_lesson_history jsonb not null default '[]'::jsonb
);
alter table playground_state enable row level security;

-- ── sandbox_portfolio ─────────────────────────────────────────────────────────────────
create table sandbox_portfolio (
	uid text not null references users(uid) on delete cascade,
	ticker text not null,
	shares numeric not null default 0,
	price_at_add numeric,
	added_at timestamptz not null default now(),
	thesis text,
	primary key (uid, ticker)
);
alter table sandbox_portfolio enable row level security;

-- ── practice_skills ───────────────────────────────────────────────────────────────────
create table practice_skills (
	uid text not null references users(uid) on delete cascade,
	skill text not null,
	xp int not null default 0,
	primary key (uid, skill)
);
alter table practice_skills enable row level security;

-- ── activity_progress ─────────────────────────────────────────────────────────────────
create table activity_progress (
	uid text not null references users(uid) on delete cascade,
	kind text not null check (kind in ('lesson', 'earnings', 'battle', 'risk', 'mood')),
	item_id text not null,
	completed boolean not null default false,
	completed_at timestamptz,
	xp_earned int not null default 0,
	primary key (uid, kind, item_id)
);
alter table activity_progress enable row level security;

-- ── swipes: insert-only event log ─────────────────────────────────────────────────────
-- occurred_at (not `timestamp` -- a reserved word/builtin type name, awkward to quote
-- in every future query) records when the swipe itself happened.
create table swipes (
	id bigint generated always as identity primary key,
	uid text not null references users(uid) on delete cascade,
	brand_id text not null,
	direction text not null check (direction in ('left', 'right')),
	occurred_at timestamptz not null default now(),
	ticker text,
	categories text[],
	stak_size int,
	time_on_card_ms int,
	swipe_velocity numeric
);
alter table swipes enable row level security;
create index swipes_uid_occurred_at_idx on swipes (uid, occurred_at desc);
create index swipes_occurred_at_idx on swipes (occurred_at);

-- ── events: insert-only engagement log ────────────────────────────────────────────────
create table events (
	id bigint generated always as identity primary key,
	uid text not null references users(uid) on delete cascade,
	type text not null,
	occurred_at timestamptz not null default now(),
	brand_id text,
	ticker text,
	params jsonb
);
alter table events enable row level security;
create index events_occurred_at_idx on events (occurred_at);
create index events_uid_idx on events (uid);

-- ── sessions: one row per user per day ────────────────────────────────────────────────
create table sessions (
	uid text not null references users(uid) on delete cascade,
	date text not null,
	primary key (uid, date)
);
alter table sessions enable row level security;
create index sessions_date_idx on sessions (date);

-- ── playground_cache: generated lesson/battle/earnings/risk/mood content cache ───────
create table playground_cache (
	uid text not null references users(uid) on delete cascade,
	date text not null,
	type text not null,
	payload jsonb not null,
	primary key (uid, date, type)
);
alter table playground_cache enable row level security;

-- ── stocks: decoupled IPO-auto-detection catalog -- no FK to users, separate from
-- the @stak/shared brand catalog (which is staying in TS files, out of scope here) ──
create table stocks (
	ticker text primary key,
	id text,
	name text,
	domain text,
	logo text,
	hero_image text,
	bio text,
	personality_description text,
	vibes jsonb,
	cultural_context jsonb,
	interest_categories text[],
	sector text,
	country text,
	source text,
	ipo_date text,
	added_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
alter table stocks enable row level security;

-- ── app_config: small global singletons (intel-cards, featured-lesson(-history), seed-status) ─
create table app_config (
	key text primary key,
	value jsonb not null,
	updated_at timestamptz not null default now()
);
alter table app_config enable row level security;

-- ── auth_identity_map: bridges Firebase UID <-> Supabase Auth UID during the auth
-- migration (Phase 4+). Purely additive scaffold -- created now so this migration is
-- complete and reviewable as one unit, but not read/written until Phase 4. Lifecycle:
-- 'firebase' (not yet migrated) -> 'requires_password_reset' (Supabase user provisioned,
-- but email/password users must reset before they can actually use it -- scrypt hashes
-- can't become bcrypt) -> 'supabase' (fully migrated). Google OAuth users skip straight
-- from 'firebase' to 'supabase', no reset needed.
create table auth_identity_map (
	firebase_uid text primary key references users(uid) on delete cascade,
	supabase_uid uuid unique,
	provider text,
	migration_status text not null default 'firebase'
		check (migration_status in ('firebase', 'requires_password_reset', 'supabase')),
	migrated_at timestamptz
);
alter table auth_identity_map enable row level security;

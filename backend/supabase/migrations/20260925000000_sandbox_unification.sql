-- ── sandbox_unification ────────────────────────────────────────────────────────────────
-- Gives web's Sandbox and Android's local-only Simulate one shared server backend.
-- Everything here is additive and defaulted, so existing web sandbox users keep working
-- unchanged the moment this applies (cash_source defaults to 'tier', matching today's
-- XP-tier-derived behavior) -- same precedent as daily_challenge_state.
alter table playground_state
	add column if not exists sandbox_name text,
	add column if not exists sandbox_strategy text check (sandbox_strategy in ('cautious', 'balanced', 'bold')),
	add column if not exists sandbox_start numeric,
	add column if not exists sandbox_cash_source text not null default 'tier' check (sandbox_cash_source in ('tier', 'free_choice'));

-- ── sandbox_trades: forward-only fill ledger, drives both platforms' history charts ────
create table sandbox_trades (
	id bigserial primary key,
	uid text not null references users(uid) on delete cascade,
	ticker text not null,
	side text not null check (side in ('buy', 'sell')),
	shares numeric not null,
	price numeric not null,
	amount numeric not null,
	source text not null check (source in ('market', 'limit')),
	executed_at timestamptz not null default now()
);
create index sandbox_trades_uid_executed_at_idx on sandbox_trades (uid, executed_at desc);
alter table sandbox_trades enable row level security;
create policy "sandbox_trades select own" on sandbox_trades for select using (uid = current_firebase_uid());
grant select on sandbox_trades to authenticated;
alter publication supabase_realtime add table sandbox_trades;

-- ── sandbox_orders: pending buy-limit orders, filled by POST /api/sandbox/fill-orders ──
create table sandbox_orders (
	id bigserial primary key,
	uid text not null references users(uid) on delete cascade,
	ticker text not null,
	amount numeric not null,
	limit_price numeric not null,
	status text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
	created_at timestamptz not null default now(),
	filled_at timestamptz,
	cancelled_at timestamptz
);
create index sandbox_orders_open_idx on sandbox_orders (uid, ticker) where status = 'open';
alter table sandbox_orders enable row level security;
create policy "sandbox_orders select own" on sandbox_orders for select using (uid = current_firebase_uid());
grant select on sandbox_orders to authenticated;
alter publication supabase_realtime add table sandbox_orders;

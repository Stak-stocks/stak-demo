-- /api/sandbox/fill-orders (every 5 minutes in market hours) looks up open orders by ticker and limit price:
--   select id, uid from sandbox_orders where status = 'open' and ticker = $1 and limit_price >= $2
-- The existing partial index leads with uid, so it can't serve that lookup; this one can.
create index if not exists sandbox_orders_fill_idx on sandbox_orders (ticker, limit_price) where status = 'open';

-- ── push_devices_price_threshold ───────────────────────────────────────────────────────
-- The "Price threshold" setting (1 / 3 / 5 / 10%) reaches the server: each device's price-move
-- alerts fire at its own threshold instead of a fixed 3%. Existing rows keep 3%, what they were
-- getting. Safe to re-run.
alter table push_devices add column if not exists price_threshold int not null default 3;
alter table push_devices drop constraint if exists push_devices_price_threshold_check;
alter table push_devices add constraint push_devices_price_threshold_check check (price_threshold in (1, 3, 5, 10));

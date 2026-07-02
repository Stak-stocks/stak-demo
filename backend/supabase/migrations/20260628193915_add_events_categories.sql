-- Fixes a gap in the initial schema: swipe.ts's POST /event route captures `categories`
-- on every engagement event (same as it does for swipes), but the events table didn't
-- have a column for it -- caught while wiring up the actual shadow-write code in Phase 1.
alter table events add column categories text[];

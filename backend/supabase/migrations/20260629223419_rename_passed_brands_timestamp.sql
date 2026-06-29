-- Naming fix found while building the Phase 5 write-side: updatePassedBrands
-- (frontend/src/context/AccountContext.tsx) sets `at: Date.now()` on EVERY repeat
-- pass, not just the first one -- the Firestore field this column ports has always
-- meant "most recent pass time." `first_passed_at` was simply the wrong name from
-- the original Phase 0 schema design; nothing else references it (grepped before
-- renaming), so a clean rename rather than a deprecate-and-add.
alter table passed_brands rename column first_passed_at to last_passed_at;

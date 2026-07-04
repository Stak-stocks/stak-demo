-- Hourly cron: delete Supabase Auth users who never verified their email after 24h
-- and never completed onboarding. Replaces the old Firebase deleteUnverifiedAccounts
-- backend cron that was removed in Phase 7. Requires pg_cron extension (enable in
-- Supabase Dashboard → Database → Extensions if not already on).
select cron.schedule(
  'delete-unverified-users',
  '0 * * * *',
  $$
    delete from auth.users
    where email_confirmed_at is null
      and created_at < now() - interval '24 hours'
      and id::text not in (
        select uid from public.users where onboarding_completed = true
      );
  $$
);

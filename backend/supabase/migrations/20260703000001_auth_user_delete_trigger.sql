-- Trigger: delete public.users when an auth.users row is removed.
-- All child tables (swipes, events, stak_brands, passed_brands, sessions,
-- playground_cache, playground_state, sandbox_portfolio, activity_progress,
-- practice_skills, intel_card_state, search_history, auth_identity_map)
-- already have ON DELETE CASCADE to public.users, so this single delete
-- cascades through the entire user data graph automatically.
--
-- The auth_identity_map lookup is needed because migrated users have a
-- Firebase UID as their canonical public.users.uid, not the Supabase UUID.
-- On-demand-provisioned Supabase-native users stored their Supabase UUID in
-- both firebase_uid and supabase_uid, so the lookup still resolves correctly.
create or replace function public.handle_auth_user_deleted()
returns trigger language plpgsql security definer as $$
declare
  v_uid text;
begin
  select firebase_uid into v_uid
  from public.auth_identity_map
  where supabase_uid = old.id;

  if v_uid is null then
    v_uid := old.id::text;
  end if;

  delete from public.users where uid = v_uid;
  return old;
end;
$$;

create or replace trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_auth_user_deleted();

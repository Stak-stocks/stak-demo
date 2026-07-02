-- Postgres equivalent of today's adminAuth.setCustomUserClaims(uid, {onboardingCompleted})
-- (me.ts) -- a Supabase "Customize Access Token" Auth Hook, invoked by Supabase Auth at
-- JWT issuance time. Per the migration plan (tingly-conjuring-lake.md, Phase 4): built
-- and tested now, but not yet registered as the project's active hook in the Supabase
-- dashboard (Authentication -> Hooks) -- nothing in production calls this until Phase 5/6,
-- since no real user authenticates via Supabase yet. Firebase's setCustomUserClaims
-- keeps working unchanged in the meantime.
--
-- NOTE: the exact event/return shape Supabase Auth Hooks expect is a documented external
-- contract that can change between Supabase platform versions. This implementation
-- follows the documented "Customize Access Token" hook contract as of this writing
-- (event: {user_id, claims, authentication_method}, return: {claims: {...}}) -- verify
-- against Supabase's current docs and a real sign-in event when this actually gets
-- registered and exercised for the first time in Phase 5/6, since it can't be live-tested
-- without a real Supabase Auth sign-in triggering it.
create or replace function custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
	claims jsonb;
	v_onboarding_completed boolean;
begin
	claims := event->'claims';

	select u.onboarding_completed into v_onboarding_completed
	from users u
	join auth_identity_map m on m.firebase_uid = u.uid
	where m.supabase_uid = (event->>'user_id')::uuid;

	if v_onboarding_completed is true then
		claims := jsonb_set(claims, '{onboardingCompleted}', 'true'::jsonb);
	end if;

	return jsonb_build_object('claims', claims);
end;
$$;

-- Supabase Auth's service role needs explicit execute permission to invoke this hook --
-- without these grants, registering it in the dashboard would fail at invocation time.
grant execute on function custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function custom_access_token_hook(jsonb) from authenticated, anon, public;

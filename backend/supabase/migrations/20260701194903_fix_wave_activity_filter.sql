-- Fixes the wave advancement function's activity filter semantics. The original
-- `EXISTS (select 1 from sessions where uid = ...)` filter required at least one
-- matching session row, so users with NO rows in the Postgres sessions table were
-- excluded even with p_inactive_days=3650 -- "unknown" was treated as "inactive"
-- rather than "not confirmed inactive." This is wrong when the sessions table is
-- thin (only populated since Phase 1 shadow-write, not backfilled from Firestore),
-- which is the real situation during the early Phase 6 waves.
--
-- Fixed semantics: include a user if they have NO sessions at all in Postgres
-- (unknown activity = not confirmed inactive, so include them) OR if they have at
-- least one session within p_inactive_days. Only exclude users who have sessions in
-- Postgres but ALL of them are older than p_inactive_days -- i.e. confirmed inactive.
create or replace function advance_migration_wave(
	p_provider text, p_percentage int, p_inactive_days int default 90, p_dry_run boolean default true
)
returns table(firebase_uid text, email text, new_status text)
as $$
declare
	v_target_status text;
begin
	if p_percentage < 0 or p_percentage > 100 then
		raise exception 'p_percentage must be between 0 and 100, got %', p_percentage;
	end if;

	if p_provider = 'google.com' then
		v_target_status := 'supabase';
	elsif p_provider = 'password' then
		v_target_status := 'requires_password_reset';
	else
		raise exception 'Unknown provider: % (expected google.com or password)', p_provider;
	end if;

	if p_dry_run then
		return query
		select m.firebase_uid, u.email, v_target_status
		from auth_identity_map m
		join users u on u.uid = m.firebase_uid
		where m.provider = p_provider
		and m.migration_status = 'firebase'
		and abs(hashtext(m.firebase_uid)) % 100 < p_percentage
		and (
			not exists (select 1 from sessions s where s.uid = m.firebase_uid)
			or exists (
				select 1 from sessions s where s.uid = m.firebase_uid
				and s.date >= to_char(now() - (p_inactive_days || ' days')::interval, 'YYYY-MM-DD')
			)
		)
		order by u.email;
	else
		return query
		update auth_identity_map m
		set migration_status = v_target_status,
			migrated_at = case when v_target_status = 'supabase' then now() else m.migrated_at end
		from users u
		where m.firebase_uid = u.uid
		and m.provider = p_provider
		and m.migration_status = 'firebase'
		and abs(hashtext(m.firebase_uid)) % 100 < p_percentage
		and (
			not exists (select 1 from sessions s where s.uid = m.firebase_uid)
			or exists (
				select 1 from sessions s where s.uid = m.firebase_uid
				and s.date >= to_char(now() - (p_inactive_days || ' days')::interval, 'YYYY-MM-DD')
			)
		)
		returning m.firebase_uid, u.email, v_target_status;
	end if;
end;
$$ language plpgsql;

revoke execute on function advance_migration_wave(text, int, int, boolean) from public, anon, authenticated;

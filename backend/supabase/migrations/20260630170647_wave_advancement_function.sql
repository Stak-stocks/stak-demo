-- Phase 6 prep machinery (migration plan, "Step D -- Wave-based real-user migration":
-- tingly-conjuring-lake.md): "Google OAuth first ... 1%->10%->50%->100% ... Email/
-- password next, same waving ... Long-inactive users migrate last/never-forced."
--
-- Deliberately NOT security definer, and explicitly NOT granted to anon/authenticated
-- -- unlike every other RPC in this migration (which act on the caller's own row via
-- current_firebase_uid()), this one operates across ALL users and must only ever be
-- callable via the backend's service-role connection, never by a regular client.
--
-- Deterministic selection: a stable hash of firebase_uid bucketed 0-99 means the same
-- users stay "in" as the percentage grows (the 1% wave is always a subset of the 10%
-- wave), rather than re-randomizing membership on every call.
--
-- "Long-inactive" users (no sessions row within p_inactive_days) are excluded from the
-- percentage base entirely -- not pushed proactively, matching "migrate last/never-
-- forced." They stay on migration_status = 'firebase' until they're active again;
-- catching them at their next actual login (rather than a batch flip) is a separate,
-- later piece of work, not part of this prep.
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

	-- Google users land directly on 'supabase' -- no password involved, nothing to
	-- reset. Email/password users land on 'requires_password_reset' -- scrypt hashes
	-- can't become bcrypt, every one of them needs a reset at their next login
	-- regardless of this wave mechanism.
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
		and exists (
			select 1 from sessions s where s.uid = m.firebase_uid
			and s.date >= to_char(now() - (p_inactive_days || ' days')::interval, 'YYYY-MM-DD')
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
		and exists (
			select 1 from sessions s where s.uid = m.firebase_uid
			and s.date >= to_char(now() - (p_inactive_days || ' days')::interval, 'YYYY-MM-DD')
		)
		returning m.firebase_uid, u.email, v_target_status;
	end if;
end;
$$ language plpgsql;

revoke execute on function advance_migration_wave(text, int, int, boolean) from public, anon, authenticated;

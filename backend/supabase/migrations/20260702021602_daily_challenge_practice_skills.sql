-- Closes three Phase 5 data-layer gaps noted in AccountContext.tsx and
-- supabaseAccount.ts with "Known gap, not silently dropped":
-- 1. dailyChallengeState: no Postgres column existed anywhere in the schema.
--    Added as daily_challenge_state jsonb to playground_state (same table as
--    daily_progress, since it's the same kind of daily-reset, per-user state).
-- 2. practice_skills: table existed but had no RLS policy, no authenticated
--    grant, and wasn't in the Realtime publication.
-- 3. complete_daily_activity / complete_challenge / add_practice_skill_xp:
--    new RPCs to close the write-side gaps, all SECURITY DEFINER using
--    current_firebase_uid() (same pattern as every other user-acting RPC).

alter table playground_state add column if not exists
	daily_challenge_state jsonb not null default '{}'::jsonb;

-- practice_skills: own-row full CRUD (matches the activity_progress pattern)
create policy "practice_skills all own" on practice_skills for all using (uid = current_firebase_uid());
grant select, insert, update, delete on practice_skills to authenticated;
alter publication supabase_realtime add table practice_skills;
alter table practice_skills alter column uid set default current_firebase_uid();

-- complete_daily_activity: mirrors AccountContext.tsx's completeDailyActivity
-- exactly. p_today is the caller's local YYYY-MM-DD string (frontend computes it
-- so the server doesn't need to guess the user's timezone). Atomically handles
-- same-day append vs new-day reset, deduplicates allTimeCompletedActivityIds,
-- and increments total_xp.
create or replace function complete_daily_activity(
	p_day_key text, p_activity_id text, p_xp int, p_activity_type text default null
)
returns void security definer as $$
declare
	v_uid text := current_firebase_uid();
	v_daily jsonb;
	v_is_same_day boolean;
	v_already_done boolean;
	v_all_time text[];
begin
	if v_uid is null then raise exception 'No authenticated user'; end if;

	insert into playground_state (uid) values (v_uid) on conflict (uid) do nothing;

	select daily_progress, all_time_completed_activity_ids
	into v_daily, v_all_time
	from playground_state where uid = v_uid for update;

	v_daily := coalesce(v_daily, '{}'::jsonb);
	v_all_time := coalesce(v_all_time, array[]::text[]);

	v_is_same_day := (v_daily->>'dayKey') = p_day_key;
	v_already_done := v_is_same_day and (v_daily->'completedIds' @> to_jsonb(p_activity_id));

	if v_already_done then return; end if;

	if v_is_same_day then
		v_daily := jsonb_set(v_daily, '{completedIds}',
			coalesce(v_daily->'completedIds', '[]'::jsonb) || to_jsonb(p_activity_id));
		v_daily := jsonb_set(v_daily, '{xpEarned}',
			to_jsonb(coalesce((v_daily->>'xpEarned')::int, 0) + p_xp));
		v_daily := jsonb_set(v_daily, '{dayKey}', to_jsonb(p_day_key));
		if p_activity_type is not null then
			v_daily := jsonb_set(v_daily, '{completedTypes}',
				coalesce(v_daily->'completedTypes', '[]'::jsonb) || to_jsonb(p_activity_type));
		end if;
	else
		v_daily := jsonb_build_object(
			'dayKey', p_day_key,
			'completedIds', jsonb_build_array(p_activity_id),
			'completedTypes', case when p_activity_type is not null
				then jsonb_build_array(p_activity_type) else '[]'::jsonb end,
			'xpEarned', p_xp
		);
	end if;

	if not (p_activity_id = any(v_all_time)) then
		v_all_time := v_all_time || p_activity_id;
	end if;

	update playground_state
	set daily_progress = v_daily,
		all_time_completed_activity_ids = v_all_time,
		total_xp = total_xp + p_xp
	where uid = v_uid;
end;
$$ language plpgsql;

-- complete_challenge: mirrors AccountContext.tsx's completeChallenge. p_today is
-- the caller's local date string (same timezone reason as complete_daily_activity).
create or replace function complete_challenge(p_challenge_id text, p_xp int, p_today text)
returns void security definer as $$
declare
	v_uid text := current_firebase_uid();
	v_state jsonb;
	v_completed_ids jsonb;
begin
	if v_uid is null then raise exception 'No authenticated user'; end if;

	insert into playground_state (uid) values (v_uid) on conflict (uid) do nothing;

	select daily_challenge_state into v_state
	from playground_state where uid = v_uid for update;

	v_state := coalesce(v_state, '{}'::jsonb);

	if (v_state->>'date') = p_today then
		v_completed_ids := coalesce(v_state->'completedIds', '[]'::jsonb) || to_jsonb(p_challenge_id);
	else
		v_completed_ids := jsonb_build_array(p_challenge_id);
	end if;

	update playground_state
	set daily_challenge_state = jsonb_build_object('date', p_today, 'completedIds', v_completed_ids),
		total_xp = total_xp + p_xp
	where uid = v_uid;
end;
$$ language plpgsql;

-- add_practice_skill_xp: upserts into practice_skills and increments total_xp.
-- Needs an RPC (not a direct write) because it touches two tables atomically.
create or replace function add_practice_skill_xp(p_skill text, p_xp int)
returns void security definer as $$
declare
	v_uid text := current_firebase_uid();
begin
	if v_uid is null then raise exception 'No authenticated user'; end if;
	if p_xp <= 0 then return; end if;

	insert into practice_skills (uid, skill, xp) values (v_uid, p_skill, p_xp)
	on conflict (uid, skill) do update set xp = practice_skills.xp + p_xp;

	insert into playground_state (uid, total_xp) values (v_uid, p_xp)
	on conflict (uid) do update set total_xp = playground_state.total_xp + p_xp;
end;
$$ language plpgsql;

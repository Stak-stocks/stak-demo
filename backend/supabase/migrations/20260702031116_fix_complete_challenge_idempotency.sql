-- Fixes a bug found during the Phase 6 audit: complete_challenge had no
-- idempotency guard, so calling it twice for the same challengeId on the same
-- day would award XP twice (the same duplicate-XP class of bug complete_activity
-- already guards against via its already-completed check). Added the same pattern:
-- check whether p_challenge_id is already in completedIds for today before appending.
create or replace function complete_challenge(p_challenge_id text, p_xp int, p_today text)
returns void security definer as $$
declare
	v_uid text := current_firebase_uid();
	v_state jsonb;
	v_completed_ids jsonb;
	v_already_done boolean;
begin
	if v_uid is null then raise exception 'No authenticated user'; end if;

	insert into playground_state (uid) values (v_uid) on conflict (uid) do nothing;

	select daily_challenge_state into v_state
	from playground_state where uid = v_uid for update;

	v_state := coalesce(v_state, '{}'::jsonb);

	if (v_state->>'date') = p_today then
		v_already_done := v_state->'completedIds' @> to_jsonb(p_challenge_id);
		if v_already_done then return; end if;
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

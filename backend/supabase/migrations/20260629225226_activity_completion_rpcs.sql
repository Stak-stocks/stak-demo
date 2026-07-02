-- Covers AccountContext.tsx's completeLesson/completeEarningsScenario/completeBattle/
-- completeRiskScenario/completeMoodScenario/addXp for a Supabase session (Phase 5
-- write-side). All 5 completion functions share the same shape: check-if-already-
-- completed, then mark completed + (lessons only) award XP. The Firestore version
-- relies on increment() for atomic XP awards but otherwise has no real concurrency
-- guard around the completion check itself -- doing both the check and the write in
-- one RPC transaction closes a real (if narrow) race a separate
-- check-then-write-from-the-client would have: two near-simultaneous calls both
-- reading "not completed yet" before either writes, double-awarding XP.
--
-- Returns true if this call newly completed the activity, false if it was already
-- completed (matching the Firestore version's silent no-op on repeat completion).
create or replace function complete_activity(p_kind text, p_item_id text, p_xp int default 0)
returns boolean
security definer
as $$
declare
	v_uid text := current_firebase_uid();
	v_already_completed boolean;
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;

	select completed into v_already_completed from activity_progress where uid = v_uid and kind = p_kind and item_id = p_item_id;
	if v_already_completed then
		return false;
	end if;

	insert into activity_progress (uid, kind, item_id, completed, completed_at, xp_earned)
	values (v_uid, p_kind, p_item_id, true, now(), p_xp)
	on conflict (uid, kind, item_id) do update set completed = true, completed_at = now(), xp_earned = p_xp;

	if p_xp > 0 then
		insert into playground_state (uid, total_xp) values (v_uid, p_xp)
		on conflict (uid) do update set total_xp = playground_state.total_xp + p_xp;
	end if;

	return true;
end;
$$ language plpgsql;

-- addXp: a bare atomic increment, no completion-tracking involved (e.g. swipe/intel-
-- view XP awards that aren't tied to a specific activity_progress row).
create or replace function add_xp(p_amount int)
returns void
security definer
as $$
declare
	v_uid text := current_firebase_uid();
begin
	if v_uid is null then
		raise exception 'No authenticated user';
	end if;
	insert into playground_state (uid, total_xp) values (v_uid, p_amount)
	on conflict (uid) do update set total_xp = playground_state.total_xp + p_amount;
end;
$$ language plpgsql;

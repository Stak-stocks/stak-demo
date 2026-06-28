-- Postgres equivalent of tasteProfileService.ts's updateUserTasteProfile. The stock ->
-- learningTags lookup (STAK_WEIGHTED_STOCK_TAGS) lives in @stak/shared, a TS package, not
-- the database -- so the caller computes per-tag deltas (actionPoints * weight) in JS
-- exactly as today, and this function's only job is the atomic "merge deltas into
-- tag_scores, clamped to >= -10" part, mirroring the existing Firestore transaction's
-- read-modify-write loop.
create or replace function update_user_taste_profile(p_uid text, p_deltas jsonb)
returns void as $$
declare
	rec record;
	current_score numeric;
begin
	for rec in select key, value::numeric as delta from jsonb_each_text(p_deltas) loop
		select coalesce((tag_scores->>rec.key)::numeric, 0) into current_score
		from users where uid = p_uid;

		update users set tag_scores = jsonb_set(
			coalesce(tag_scores, '{}'::jsonb),
			array[rec.key],
			to_jsonb(greatest(-10, current_score + rec.delta))
		)
		where uid = p_uid;
	end loop;
end;
$$ language plpgsql;

-- ── taste scores: one atomic update, kept between -10 and 30 ─────────────────────────────────
-- update_user_taste_profile read each tag's score and wrote it back in separate statements, so two
-- swipes saved at the same moment could each read the old score and one update was lost. It is now a
-- single UPDATE (the row stays locked from read to write). Scores were also unbounded ("technology"
-- reached 65 after 22 swipes); they now stay in -10..30, the range the ranking reads them in
-- (shared/src/recommendationScoring.ts TAG_SCORE_MIN / TAG_SCORE_MAX). Safe to re-run.

create or replace function update_user_taste_profile(p_uid text, p_deltas jsonb)
returns void as $$
	update users u
	set tag_scores = coalesce(u.tag_scores, '{}'::jsonb) || coalesce((
		select jsonb_object_agg(
			d.key,
			to_jsonb(least(30, greatest(-10, coalesce((u.tag_scores->>d.key)::numeric, 0) + d.value::numeric)))
		)
		from jsonb_each_text(p_deltas) d
	), '{}'::jsonb)
	where u.uid = p_uid;
$$ language sql;

-- Existing scores into the same range.
update users u
set tag_scores = (
	select jsonb_object_agg(e.key, to_jsonb(least(30, greatest(-10, e.value::numeric))))
	from jsonb_each_text(u.tag_scores) e
)
where jsonb_typeof(u.tag_scores) = 'object'
	and exists (
		select 1 from jsonb_each_text(u.tag_scores) e
		where e.value::numeric > 30 or e.value::numeric < -10
	);

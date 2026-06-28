-- Postgres equivalent of streakService.ts's recordActivity -- the highest-scrutiny port
-- in the migration plan (tingly-conjuring-lake.md, Phase 3). Mirrors every branch of the
-- existing Firestore transaction exactly: today/currentWeek (timezone-aware) stay
-- computed in JS and are passed in as parameters; BADGES' full id->name/description info
-- stays a static JS lookup (this function only deals with badge IDs, same pattern as
-- update_user_taste_profile keeping the stock->learningTags lookup in JS).
--
-- is_new_day=false signals the "already active today, only counters updated" early-return
-- path (JS: `return null`). SELECT...FOR UPDATE provides the same row-lock atomicity
-- guarantee the existing Firestore transaction provides.
create or replace function record_activity(
	p_uid text,
	p_activity_type text, -- 'swipe' | 'intel_view' | 'brand_tap'
	p_today text,
	p_current_week text
)
returns table(
	is_new_day boolean,
	out_streak_count int,
	new_badge_ids text[],
	bonus_swipes_added int
) as $$
declare
	v_total_swipe_count int;
	v_total_intel_views int;
	v_last_streak_date text;
	v_streak_count int;
	v_grace_used boolean;
	v_grace_week text;
	v_badges text[];
	v_bonus_swipes int;
	v_diff int;
	v_existing_badges text[];
	v_new_badge_ids text[] := array[]::text[];
	v_bonus_added int := 0;
begin
	select total_swipe_count, total_intel_views, last_streak_date, streak_count,
		grace_used, grace_week, badges, bonus_swipes
	into v_total_swipe_count, v_total_intel_views, v_last_streak_date, v_streak_count,
		v_grace_used, v_grace_week, v_badges, v_bonus_swipes
	from users where uid = p_uid for update;

	v_total_swipe_count := coalesce(v_total_swipe_count, 0) + (case when p_activity_type = 'swipe' then 1 else 0 end);
	v_total_intel_views := coalesce(v_total_intel_views, 0) + (case when p_activity_type = 'intel_view' then 1 else 0 end);
	v_last_streak_date := coalesce(v_last_streak_date, '');
	v_streak_count := coalesce(v_streak_count, 0);
	v_grace_used := coalesce(v_grace_used, false);
	v_grace_week := coalesce(v_grace_week, '');
	v_badges := coalesce(v_badges, array[]::text[]);
	v_bonus_swipes := coalesce(v_bonus_swipes, 0);

	-- Already active today: only update counters, signal "nothing new" (JS: return null)
	if v_last_streak_date = p_today then
		update users set
			total_swipe_count = case when p_activity_type = 'swipe' then v_total_swipe_count else total_swipe_count end,
			total_intel_views = case when p_activity_type = 'intel_view' then v_total_intel_views else total_intel_views end
		where uid = p_uid;
		return query select false, v_streak_count, array[]::text[], 0;
		return;
	end if;

	-- Reset grace if it's a new week
	if v_grace_week != p_current_week then
		v_grace_used := false;
	end if;

	if v_last_streak_date = '' then
		-- First ever activity
		v_streak_count := 1;
	else
		-- date - date in Postgres returns an integer day count directly
		v_diff := (to_date(p_today, 'YYYY-MM-DD') - to_date(v_last_streak_date, 'YYYY-MM-DD'));
		if v_diff = 1 then
			v_streak_count := v_streak_count + 1;
		elsif v_diff = 2 and not v_grace_used then
			v_streak_count := v_streak_count + 1;
			v_grace_used := true;
		else
			v_streak_count := 1;
			v_grace_used := false;
		end if;
	end if;

	v_existing_badges := v_badges;

	-- Streak-based
	if v_streak_count >= 1 and not ('first_move' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'first_move'); v_existing_badges := array_append(v_existing_badges, 'first_move');
	end if;
	if v_streak_count >= 5 and not ('consistent_learner' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'consistent_learner'); v_existing_badges := array_append(v_existing_badges, 'consistent_learner');
	end if;
	if v_streak_count >= 7 and not ('market_explorer' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'market_explorer'); v_existing_badges := array_append(v_existing_badges, 'market_explorer');
	end if;
	if v_streak_count >= 14 and not ('trend_reader' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'trend_reader'); v_existing_badges := array_append(v_existing_badges, 'trend_reader');
	end if;
	if v_streak_count >= 30 and not ('market_insider' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'market_insider'); v_existing_badges := array_append(v_existing_badges, 'market_insider');
	end if;

	-- Streak bonus swipes (one-time, tracked via badges)
	if v_streak_count >= 3 and not ('streak_bonus_3' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'streak_bonus_3'); v_existing_badges := array_append(v_existing_badges, 'streak_bonus_3'); v_bonus_added := v_bonus_added + 3;
	end if;
	if v_streak_count >= 5 and not ('streak_bonus_5' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'streak_bonus_5'); v_existing_badges := array_append(v_existing_badges, 'streak_bonus_5'); v_bonus_added := v_bonus_added + 5;
	end if;
	if v_streak_count >= 7 and not ('streak_bonus_7' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'streak_bonus_7'); v_existing_badges := array_append(v_existing_badges, 'streak_bonus_7'); v_bonus_added := v_bonus_added + 14;
	end if;

	-- Swipe-based
	if v_total_swipe_count >= 1 and p_activity_type = 'swipe' and not ('explorer' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'explorer'); v_existing_badges := array_append(v_existing_badges, 'explorer');
	end if;
	if v_total_swipe_count >= 10 and p_activity_type = 'swipe' and not ('curious_mind' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'curious_mind'); v_existing_badges := array_append(v_existing_badges, 'curious_mind');
	end if;

	-- Intel-based
	if v_total_intel_views >= 15 and not ('pattern_recognizer' = any(v_existing_badges)) then
		v_new_badge_ids := array_append(v_new_badge_ids, 'pattern_recognizer'); v_existing_badges := array_append(v_existing_badges, 'pattern_recognizer');
	end if;

	update users set
		streak_count = v_streak_count,
		last_streak_date = p_today,
		grace_used = v_grace_used,
		grace_week = p_current_week,
		badges = v_existing_badges,
		bonus_swipes = v_bonus_swipes + v_bonus_added,
		total_swipe_count = v_total_swipe_count,
		total_intel_views = v_total_intel_views,
		updated_at = now()
	where uid = p_uid;

	return query select true, v_streak_count, v_new_badge_ids, v_bonus_added;
end;
$$ language plpgsql;

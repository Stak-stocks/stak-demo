-- Postgres equivalent of swipeLimitService.ts's checkAndIncrementSwipeLimit. The
-- client-todayKey sanitization (sanitizeClientDateKey/getEasternDateKey) stays in JS --
-- it's shared timezone logic, not something to duplicate in SQL. The caller passes the
-- already-sanitized today key in; this function's job is just the atomic
-- read-check-increment, using SELECT ... FOR UPDATE for the same row-lock guarantee the
-- existing Firestore transaction provides. "limit" is a reserved word, hence
-- swipe_limit/p_limit instead of bare "limit" throughout.
create or replace function check_and_increment_swipe_limit(p_uid text, p_today_key text, p_limit int)
returns table(accepted boolean, swipe_count int, swipe_limit int) as $$
declare
	v_date text;
	v_count int;
	v_current_count int;
begin
	select daily_swipe_date, daily_swipe_count into v_date, v_count
	from users where uid = p_uid for update;

	v_current_count := case when v_date = p_today_key then coalesce(v_count, 0) else 0 end;

	if v_current_count >= p_limit then
		return query select false, v_current_count, p_limit;
		return;
	end if;

	update users set daily_swipe_date = p_today_key, daily_swipe_count = v_current_count + 1
	where uid = p_uid;

	return query select true, v_current_count + 1, p_limit;
end;
$$ language plpgsql;

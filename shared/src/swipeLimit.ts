// Single source of truth for the daily swipe cap. Backend enforces this
// authoritatively (backend/src/routes/swipe.ts, backend/src/routes/me.ts);
// frontend reads the same value for instant optimistic UI feedback
// (frontend/src/hooks/useSwipeLimit.ts) so the two can't drift.
export const DAILY_SWIPE_LIMIT = 20;

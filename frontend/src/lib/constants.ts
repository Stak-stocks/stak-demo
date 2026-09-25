/**
 * Maximum number of brands a user can hold in their Stak. Re-exported from
 * @stak/shared so the web, Android and the backend all read one value - it used
 * to be defined here, where only the web could see it.
 */
export { STAK_CAPACITY } from "@stak/shared";

/** Maximum brands shown in the My Stak watch list before "See all" collapses them. */
export const WATCH_LIST_LIMIT = 5;

/** Show an Intel card after every Nth swipe. */
export const INTEL_CARD_INTERVAL = 5;

/** Maximum raw tag score used to normalise scores to 0–100 in the profile view. */
export const TAG_SCORE_MAX = 30;

/** Hour (24h, UTC-local) at which the daily swipe deck resets. */
export const PICKS_RESET_HOUR = 9;

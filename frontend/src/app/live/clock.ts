/**
 * The dates the product shows, on the real calendar: a mirror of the phones' StakClock (android ui/StakClock.kt, ios
 * StakClock.swift). The user's ruling of 2026-09-05 for the phones: "the app was frozen on Saturday, July 4 while the
 * greeting used the live clock"; the website printed the same frozen literals ("Saturday, July 4", "Jul 2", "Q3 earnings
 * land July 30", "Paper investor since July 2026") until the hunt of 2026-11-09 (NUM-07; coordinator rulings N23d, N30).
 *
 * Story and save dates are AGES (days ago), so they stay fresh: a story two days old is "Nov 7" on November 9 and was
 * "Jul 2" on the frames' July 4. Every function takes `now` last (default: the real clock), so a test can pin the day;
 * FRAME_NOW is the frames' own morning: at it every function returns the string Figma prints.
 *
 * Days are calendar days at local noon, so a daylight-saving change never moves a date by one.
 */
const fmt = (options: Intl.DateTimeFormatOptions) => (d: Date) => d.toLocaleDateString("en-US", options);
const SHORT = fmt({ month: "short", day: "numeric" });
const LONG = fmt({ month: "long", day: "numeric" });
const DAY_LONG = fmt({ weekday: "long", month: "long", day: "numeric" });
const MONTH_YEAR = fmt({ month: "long", year: "numeric" });

/** The frames' "today": Saturday, July 4, 2026, a morning (local time). */
export const FRAME_NOW = new Date(2026, 6, 4, 9, 41, 0).getTime();

/** Local noon of the calendar day `offsetDays` after the day of `at` (negative: before). */
function calendarDay(offsetDays: number, at: number): Date {
	const d = new Date(at);
	d.setHours(12, 0, 0, 0);
	d.setDate(d.getDate() + offsetDays);
	return d;
}

/** "Saturday, July 4" for today. */
export const todayLong = (now = Date.now()) => DAY_LONG(calendarDay(0, now));

/** "Jul 2" for N days ago. */
export const monthDay = (daysAgo: number, now = Date.now()) => SHORT(calendarDay(-daysAgo, now));

/** "July 2" for N days ago, where a frame writes the month out. */
export const monthDayLong = (daysAgo: number, now = Date.now()) => LONG(calendarDay(-daysAgo, now));

/** The days in a story's age: 2 for "2d"; hours and minutes ("5h", "40m") are today, 0. */
export function storyAgeDays(age: string): number {
	const m = /^(\d+)d$/.exec(age.trim());
	return m ? Number(m[1]) : 0;
}

/**
 * The calendar day a story's age points at: N days ago for "2d"; for an hour or minute age ("10h", "40m") the day it was
 * that long ago, so a story ten hours old read at 09:41 is yesterday's and read at 18:00 is today's. The phones' StakClock
 * dates every hour age today, which made a card saying "Bloomberg · 10h" open an article dated a day earlier or later
 * depending on the hour (the NEWS review of 2026-11-09): on the web the card's age and the article's date always agree.
 */
export function storyDay(age: string, now = Date.now()): Date {
	const short = /^(\d+)([hm])$/.exec(age.trim());
	if (short) return calendarDay(0, now - Number(short[1]) * (short[2] === "h" ? 3_600_000 : 60_000));
	return calendarDay(-storyAgeDays(age), now);
}

/** "· Jul 2 · 3 min read" from a story's age ("2d", "5h") and its read time. */
export const byline = (age: string, read: string, now = Date.now()) => `· ${SHORT(storyDay(age, now))} · ${read}`;

/** "Oct 29" for N days ahead: the stock pages' next-earnings line. */
export const daysAhead = (days: number, now = Date.now()) => monthDay(-days, now);

/** "July 30" for N days ahead, where a frame writes the month out ("Q3 earnings land July 30"). */
export const daysAheadLong = (days: number, now = Date.now()) => monthDayLong(-days, now);

/** "Saved Jul 2" / "Saved today". */
export const savedLabel = (daysAgo: number, now = Date.now()) => (daysAgo === 0 ? "Saved today" : `Saved ${monthDay(daysAgo, now)}`);

/** "September 2026" for the current month (the month a new account is created in). */
export const monthYearNow = (now = Date.now()) => MONTH_YEAR(calendarDay(0, now));

/** Whole calendar days from the day of `ms` to today: 0 for any moment of today, 1 for yesterday; never negative. */
export const daysSince = (ms: number, now = Date.now()) => Math.max(0, Math.round((calendarDay(0, now).getTime() - calendarDay(0, ms).getTime()) / 86_400_000));

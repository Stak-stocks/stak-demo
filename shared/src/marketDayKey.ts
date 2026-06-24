// Calendar-day key for shared, backend-generated daily content (Featured
// Lesson / Market Moment) — resets at 9 AM America/Chicago, same hour the
// Daily Brief already waits for ("before 9am CT markets haven't opened yet").
// Fixed to one timezone (not device-local) because this content is generated
// once and shared by every user, unlike per-user state such as the daily
// swipe limit (frontend/src/lib/utils.ts's getTodayKey, which intentionally
// resets at 9 AM in each user's own local time).

export function getMarketDayKey(now: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Chicago",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		hour12: false,
	}).formatToParts(now);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";

	const year = parseInt(get("year"), 10);
	const month = parseInt(get("month"), 10);
	const day = parseInt(get("day"), 10);
	const hour = parseInt(get("hour"), 10) % 24; // hour12:false can yield "24" for midnight in some engines

	const d = new Date(Date.UTC(year, month - 1, day));
	if (hour < 9) d.setUTCDate(d.getUTCDate() - 1);

	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(d.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

// True between midnight and 9 AM America/Chicago — the calendar date has already
// flipped, but getMarketDayKey() is still returning the *previous* day's key (the
// new day's content isn't generated yet). Display code can use this to phrase
// labels in the past tense ("Yesterday's...") instead of implying the content is
// brand new, without having to hide/lock the content during that window.
export function isBeforeMarketDayBoundary(now: Date = new Date()): boolean {
	const hourStr = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Chicago",
		hour: "2-digit",
		hour12: false,
	}).format(now);
	return (parseInt(hourStr, 10) % 24) < 9;
}

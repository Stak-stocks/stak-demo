// Calendar-day key for shared, backend-generated daily content (Featured
// Lesson / Market Moment) — resets at 10 AM America/New_York, deliberately
// AFTER the 9:30am ET open, not before: this content is sourced from real
// trading activity and news coverage of the session, which doesn't exist yet
// before the market has been open a little while. Was previously expressed as
// "9am America/Chicago" -- the same real-world moment (10am ET), just mislabeled
// by its own comment as "before markets open", which it never actually was.
// Fixed to one timezone (not device-local) because this content is generated
// once and shared by every user, unlike per-user state such as the daily
// swipe limit (frontend/src/lib/utils.ts's getTodayKey, which intentionally
// resets at 9 AM in each user's own local time).

export function getMarketDayKey(now: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
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
	if (hour < 10) d.setUTCDate(d.getUTCDate() - 1);

	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(d.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

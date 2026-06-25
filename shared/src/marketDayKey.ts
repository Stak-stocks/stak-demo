// Calendar-day key for shared, backend-generated daily content (Featured
// Lesson / Market Moment) — resets at 9 AM America/Eastern, shortly before the
// real 9:30am ET market open (and the same timezone every other "what day is
// it on the market's calendar" computation in this app uses -- see
// getEasternDateKey in marketSession.ts). Was previously America/Chicago,
// which put the reset at 10am ET -- 30 minutes *after* the open, the opposite
// of the "before markets open" intent the original comment described.
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
	if (hour < 9) d.setUTCDate(d.getUTCDate() - 1);

	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(d.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

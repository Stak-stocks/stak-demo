// Single source of truth for "what part of the US market session is it right now"
// — used both by the frontend (price labels, AI-prompt close-references) and the
// backend (deciding whether to fetch extended-hours pricing). Keep this the only
// place this ET-time bucketing is implemented.

/** Returns a cache-bucket string that changes whenever the US market session changes.
 *  Used as part of query keys so stale open/close data never flashes. */
export function marketSessionBucket(): string {
	try {
		const now = new Date();
		const et = now.toLocaleString("en-US", {
			timeZone: "America/New_York",
			weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
		});
		const m = et.match(/(\w+).*?(\d+):(\d+)/);
		if (!m) return "x";
		const [, day, h, min] = m;
		if (day === "Sat" || day === "Sun") return "wknd";
		const totalMin = parseInt(h) * 60 + parseInt(min);
		if (totalMin < 570) return "pre";   // before 9:30 AM ET
		if (totalMin < 960) return "open";  // 9:30 AM – 3:59 PM ET
		return "close";                      // 4:00 PM ET+
	} catch { return "x"; }
}

/**
 * Returns YYYY-MM-DD for "today" in US Eastern time -- the market's own timezone.
 * Use this (or frontend/src/lib/utils.ts's getTodayKey for per-user local-day
 * concepts like streaks/swipe limits) instead of `new Date().toISOString().split("T")[0]`
 * anywhere a "today" string crosses US market hours: raw UTC rolls over at 7-8pm
 * US time (more during DST), hours before any US trading day or evening actually
 * ends, which silently breaks same-day comparisons (earnings status, market
 * commentary, etc.) for the rest of the US evening.
 */
export function getEasternDateKey(now: Date = new Date()): string {
	return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

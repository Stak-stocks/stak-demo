import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Returns YYYY-MM-DD in local device time. Resets at 9 AM so late-night
 *  sessions count against the previous day's limit, matching server logic. */
export function getTodayKey(): string {
	const now = new Date();
	const target = now.getHours() < 9 ? new Date(now.setDate(now.getDate() - 1)) : now;
	const y = target.getFullYear();
	const m = String(target.getMonth() + 1).padStart(2, "0");
	const d = String(target.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

/** Returns today's date as YYYY-MM-DD in local device time (no 9 AM offset). */
export function getLocalDateKey(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/** Returns a cache-bucket string that changes whenever the US market session changes.
 *  Used as part of the daily-brief query key so stale open/close data never flashes. */
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

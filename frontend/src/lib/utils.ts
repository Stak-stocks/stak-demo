import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { marketSessionBucket, getEasternDateKey } from "@stak/shared";

export { marketSessionBucket, getEasternDateKey };

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

/** Returns the calendar day immediately before getTodayKey()'s result. Pure date-only
 *  arithmetic (no timezone involved) so it's safe regardless of device timezone --
 *  getTodayKey()'s string already encodes the user's local day, this just steps it
 *  back by one. Used wherever the backend's streak date (also a getTodayKey-shaped
 *  value, see streakService.ts) needs to be compared against "today or yesterday". */
export function getYesterdayKey(): string {
	const today = getTodayKey();
	return new Date(new Date(today + "T00:00:00Z").getTime() - 86400000).toISOString().split("T")[0]!;
}

/**
 * Returns a token describing the last market close, used for price labels and AI prompts.
 * - Market open (live price) → "today"
 * - After-hours weekday (finalized close, same day) → "close"
 * - Pre-market Monday (last close was Friday) → "Friday"
 * - Pre-market Tue–Fri (last close was yesterday) → "yesterday"
 * - Weekend → "Friday"
 */
export function getLastCloseRef(): "today" | "close" | "yesterday" | "Friday" {
	try {
		const bucket = marketSessionBucket();
		if (bucket === "open") return "today";
		if (bucket === "close") return "close";
		const dayStr = new Date().toLocaleDateString("en-US", {
			timeZone: "America/New_York",
			weekday: "long",
		});
		if (bucket === "pre") {
			return dayStr === "Monday" ? "Friday" : "yesterday";
		}
		// Saturday or Sunday
		return "Friday";
	} catch { return "today"; }
}

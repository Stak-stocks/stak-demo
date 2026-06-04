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

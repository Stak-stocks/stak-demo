import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Returns the current "day key" (YYYY-MM-DD). Resets at 9 AM so late-night
 *  sessions count against the previous day's limit, matching server logic. */
export function getTodayKey(): string {
	const now = new Date();
	if (now.getHours() < 9) {
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		return yesterday.toISOString().split("T")[0];
	}
	return now.toISOString().split("T")[0];
}

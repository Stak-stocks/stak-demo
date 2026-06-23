// Single source of truth for the NYSE holiday calendar, computed algorithmically
// from exchange rules (no API call). backend/src/routes/dailyBrief.ts and
// frontend/src/components/MarketBar.tsx used to independently implement this —
// dailyBrief.ts's version included Good Friday (via an Easter-Sunday calculation),
// MarketBar.tsx's didn't, so the Feed page's market-open indicator incorrectly
// showed "open" on Good Friday. Keep this the only place the holiday list lives.

/** Algorithmic fallback/base: computes NYSE holidays for any year from exchange
 *  rules. Callers that also check a live source (e.g. Gemini search) should treat
 *  this as the floor and union in anything extra — never replace it, since a
 *  live-source miss (e.g. omitting Juneteenth) shouldn't cause a wrong result. */
export function getNYSEHolidays(year: number): Set<string> {
	const fmt = (d: Date) => d.toISOString().split("T")[0];

	function observed(month: number, day: number): Date {
		const d = new Date(Date.UTC(year, month - 1, day));
		const dow = d.getUTCDay();
		if (dow === 6) d.setUTCDate(d.getUTCDate() - 1); // Sat → Fri
		if (dow === 0) d.setUTCDate(d.getUTCDate() + 1); // Sun → Mon
		return d;
	}
	function nthWeekday(month: number, weekday: number, n: number): Date {
		const d = new Date(Date.UTC(year, month - 1, 1));
		d.setUTCDate(1 + ((weekday - d.getUTCDay() + 7) % 7) + (n - 1) * 7);
		return d;
	}
	function lastWeekday(month: number, weekday: number): Date {
		const d = new Date(Date.UTC(year, month, 0));
		d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - weekday + 7) % 7));
		return d;
	}
	function easterSunday(): Date {
		const a = year % 19, b = Math.floor(year / 100), c = year % 100;
		const d2 = Math.floor(b / 4), e = b % 4;
		const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
		const h = (19 * a + b - d2 - g + 15) % 30;
		const i = Math.floor(c / 4), k = c % 4;
		const l = (32 + 2 * e + 2 * i - h - k) % 7;
		const m = Math.floor((a + 11 * h + 22 * l) / 451);
		const mo = Math.floor((h + l - 7 * m + 114) / 31);
		const dy = ((h + l - 7 * m + 114) % 31) + 1;
		return new Date(Date.UTC(year, mo - 1, dy));
	}
	const easter = easterSunday();
	const goodFriday = new Date(Date.UTC(easter.getUTCFullYear(), easter.getUTCMonth(), easter.getUTCDate() - 2));
	return new Set([
		observed(1, 1), nthWeekday(1, 1, 3), nthWeekday(2, 1, 3), goodFriday,
		lastWeekday(5, 1), observed(6, 19), observed(7, 4),
		nthWeekday(9, 1, 1), nthWeekday(11, 4, 4), observed(12, 25),
	].map(fmt));
}

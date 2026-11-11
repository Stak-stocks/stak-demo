/** Number and date formatting shared by every live screen — the exact notations the frames use. */

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round4 = (n: number) => Math.round(n * 10000) / 10000;
/** Eight decimals: the precision the guest ledger keeps share quantities at (ledger.ts paperShares); screens show four (shares4). */
export const round8 = (n: number) => Math.round(n * 1e8) / 1e8;

/** "$8,800.00" */
export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** "+$24.00" / "-$3.00" */
export const signedMoney = (n: number) => `${n < 0 ? "-" : "+"}${money(Math.abs(n))}`;
/** "$10,240" (no cents, for the profile row) */
export const wholeMoney = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** "1.2%" (unsigned, one decimal) */
export const pct1 = (n: number) => `${Math.abs(n).toFixed(1)}%`;
/** "+24.0%" / "-3.0%" */
export const signedPct = (n: number) => `${n < 0 ? "-" : "+"}${pct1(n)}`;
export const arrow = (n: number) => (n < 0 ? "▼" : "▲");
/** "▲ 1.2% today" */
export const changeLine = (pct: number, suffix = " today") => `${arrow(pct)} ${pct1(pct)}${suffix}`;
/** "▲ 1.2%" */
export const changeShort = (pct: number) => `${arrow(pct)} ${pct1(pct)}`;

/**
 * ZERO IS NEUTRAL (coordinator rulings N23c, N28c, N30; the hunt's NUM-10): a figure that PRINTS as zero is neither a
 * gain nor a loss, so it carries no plus sign, no arrow and no gain colour ("▲ +$0", a green "+0.0%" and "profit banked
 * +$0.00" were on screen). `toneOf` decides at the precision the figure is printed at (0.04% prints "0.0%": flat), so the
 * colour can never contradict the text beside it. The colours stay each page's own (the frames draw their greens and
 * reds per page); the flat tone is the label grey #819abb everywhere.
 * The formatters above keep their output (a frame prints "+0.0%" in places and the showcase repeats frames verbatim):
 * every COMPUTED figure uses the forms below.
 */
export type Tone = "up" | "down" | "flat";
const printsZero = (n: number, dp: number) => !Number.isFinite(n) || Number(Math.abs(n).toFixed(dp)) === 0;
/** The tone of a signed figure printed at `dp` decimals (2 for dollars, 1 for the percentages). */
export const toneOf = (n: number, dp = 2): Tone => (printsZero(n, dp) ? "flat" : n > 0 ? "up" : "down");
/** "+$24.00" / "-$3.00" / "$0.00" */
export const signedMoneyOrZero = (n: number) => (printsZero(n, 2) ? money(0) : signedMoney(n));
/** "+24.0%" / "-3.0%" / "0.0%" */
export const signedPctOrZero = (n: number) => (printsZero(n, 1) ? pct1(0) : signedPct(n));
/** "▲" / "▼" / "" for a figure printed at `dp` decimals (1: the percentages) */
export const arrowOrNone = (n: number, dp = 1) => (printsZero(n, dp) ? "" : arrow(n));
/** "▲ 1.2%" / "▼ 0.4%" / "0.0%" */
export const changeShortOrFlat = (pct: number) => (printsZero(pct, 1) ? pct1(0) : changeShort(pct));
/** "▲ 1.2% today" / "0.0% today" */
export const changeLineOrFlat = (pct: number, suffix = " today") => `${changeShortOrFlat(pct)}${suffix}`;
/** "1.0152" */
export const shares4 = (n: number) => n.toFixed(4);
/** "May 8" */
export const dayLabel = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
/** "July 2026" */
export const monthYear = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "long", year: "numeric" });
/** "+$24" and ".00" — the pick detail splits the gain across two type sizes. */
export function splitMoney(n: number): { whole: string; cents: string } {
	const abs = Math.abs(n);
	const whole = Math.floor(abs);
	const cents = Math.round((abs - whole) * 100);
	return { whole: `${n < 0 ? "-" : "+"}$${whole.toLocaleString("en-US")}`, cents: `.${String(cents).padStart(2, "0")}` };
}
/**
 * Whole CALENDAR months from the day of `ms` to the day of `now` (local): Jun 12 -> Nov 9 is 4 (the fifth month is
 * complete on Nov 12), Jun 4 -> Nov 9 is 5. Never negative.
 */
export function calendarMonthsBetween(ms: number, now = Date.now()): number {
	const a = new Date(ms);
	const b = new Date(now);
	const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);
	return Math.max(0, months);
}
/**
 * "5 weeks ago" / "3 days ago" / "today". From nine weeks on it counts CALENDAR months, and years from them (N23s; the
 * hunt's NUM-15): thirty-day "months" made two saves a day apart read "5 months ago" and "4 months ago" (Jun 12 and Jun
 * 13 on Nov 9: 150 and 149 days). By the calendar both are 4 months, and two dates a day apart differ only when a
 * month really completes between them.
 */
export function ago(ms: number, now = Date.now()): string {
	const days = Math.floor((now - ms) / 86_400_000);
	if (days <= 0) return "today";
	if (days === 1) return "yesterday";
	if (days < 14) return `${days} days ago`;
	const weeks = Math.floor(days / 7);
	if (weeks < 9) return `${weeks} weeks ago`;
	const months = Math.max(2, calendarMonthsBetween(ms, now)); // nine weeks are never less than two months
	if (months < 12) return `${months} months ago`;
	const years = Math.floor(months / 12);
	return years === 1 ? "1 year ago" : `${years} years ago`;
}
/** First letter upper, trailing full stop — turns a catalog blurb into a card headline. */
export function sentence(s: string): string {
	const t = s.trim();
	if (!t) return t;
	const cap = t.charAt(0).toUpperCase() + t.slice(1);
	return /[.!?…]$/.test(cap) ? cap : `${cap}.`;
}

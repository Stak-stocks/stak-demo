/** Number and date formatting shared by every live screen — the exact notations the frames use. */

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round4 = (n: number) => Math.round(n * 10000) / 10000;

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
/** "5 weeks ago" / "3 days ago" / "today" */
export function ago(ms: number, now = Date.now()): string {
	const days = Math.floor((now - ms) / 86_400_000);
	if (days <= 0) return "today";
	if (days === 1) return "yesterday";
	if (days < 14) return `${days} days ago`;
	const weeks = Math.floor(days / 7);
	if (weeks < 9) return `${weeks} weeks ago`;
	const months = Math.floor(days / 30);
	return months < 12 ? `${months} months ago` : `${Math.floor(days / 365)} years ago`;
}
/** First letter upper, trailing full stop — turns a catalog blurb into a card headline. */
export function sentence(s: string): string {
	const t = s.trim();
	if (!t) return t;
	const cap = t.charAt(0).toUpperCase() + t.slice(1);
	return /[.!?…]$/.test(cap) ? cap : `${cap}.`;
}

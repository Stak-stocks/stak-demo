// Number/date formats Android's Simulate screens share (PaperPortfolio.usd/signedUsd/stakeLabel, "Sep 4").

const usd2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const usd = (n: number) => `$${usd2.format(n)}`;
export const wholeUsd = (n: number) => `$${usd0.format(n)}`;

// The sign is the shown figure's (as the apps): a gain that rounds to nothing reads "+$0", never a red "-$0" - cost
// rounding leaves a first buy a fraction of a cent down.
/** "+$24.00" / "-$3.00" */
export const signedUsd = (n: number) => `${Math.round(n * 100) < 0 ? "-" : "+"}${usd(Math.abs(n))}`;
/** "+$186" / "-$3" - whole dollars */
export const signedWhole = (n: number) => `${Math.round(n) < 0 ? "-" : "+"}$${usd0.format(Math.abs(n))}`;
/** "+1.9%" / "-3.0%" */
export const signedPct = (pct: number) => `${Math.round(pct * 10) < 0 ? "-" : "+"}${Math.abs(pct).toFixed(1)}%`;
/** A gain counts as up unless it is down by at least half a cent (the apps' rule). */
export const isUp = (gain: number) => gain > -0.005;

/** Cost-basis label: whole dollars read "$25", anything else "$25.50". */
export const stakeLabel = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? wholeUsd(n) : usd(n));

/** "Sep 4" in market time - the "Picked ..." / "Sold ..." lines' date. */
export function monthDay(input: string | number | Date): string {
	return new Date(input).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

/** "Sep 4, 2026" in market time - a trade's date on the desktop ledgers. */
export function monthDayYear(input: string | number | Date): string {
	return new Date(input).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

/** "2:05 PM ET" - when a trade went through, in market time and saying so. */
export function marketTime(input: string | number | Date): string {
	return `${new Date(input).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET`;
}

/** A share count without trailing zeros: "5", "0.25", "1.2346" (at most four decimals). */
export const sharesLabel = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""));

const WORDS = [
	"Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
	"Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
];
export const countWord = (n: number) => WORDS[n] ?? String(n);

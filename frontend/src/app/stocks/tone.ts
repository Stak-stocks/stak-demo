/**
 * The colour of a signed figure, by its sign (coordinator ruling N20c; the user's report of 2026-11-09: "SINCE YOU SAVED
 * -7.6%" was drawn green on ENPH). Figma draws only the positive case of these figures (the day's move "▲ 1.2% today"
 * 2:3475, "+4.6%" 2:3483, "↑ 6.7% upside" 2:3561, the deck card's and the ticket's "▲ 2.4%"), all in #2fd08a; a figure
 * that falls takes the chart header's red (#e5484d, the colour the header already gives a falling day), and a figure at
 * zero, or a text that states no figure ("—", "Target range published", an empty delta), the plain label grey (#819abb,
 * the colour the header gives a company with no move). One rule for every signed figure of Discover and the stock pages:
 * the day's move, the since-saved delta, the deck card, the ticket and the receipt, the News signal's move, the analyst
 * upside / downside; the Compare table's growth row follows it too (live.ts `growthTone`).
 *
 * The sign is read from the figure AS PRINTED, so the colour never contradicts the text beside it: a leading "▼", "↓",
 * "-" or "−" falls, anything else with a figure above zero rises ("▲ 2.4%", "+4.6%", "↑ 17.9% upside", "6.1%"), and a
 * figure that prints as zero ("▲ 0.0% today", "+0.0%", "-0.0%") is neither.
 */
export type SignTone = "up" | "down" | "flat";

export function signTone(text: string): SignTone {
	const m = text.trim().match(/^([▲▼↑↓])?\s*([+\-−])?\s*\$?\s*(\d[\d,]*(?:\.\d+)?)/);
	if (!m) return "flat";
	const value = Number.parseFloat(m[3]!.replace(/,/g, ""));
	if (!(value > 0)) return "flat";
	return m[1] === "▼" || m[1] === "↓" || m[2] === "-" || m[2] === "−" ? "down" : "up";
}

/** The text colour of each sign: Figma's green, the chart header's red, the label grey. */
export const SIGN_TEXT: Readonly<Record<SignTone, string>> = { up: "text-[#2fd08a]", down: "text-[#e5484d]", flat: "text-[#819abb]" };

/** The text colour class of a printed figure, by its sign. */
export const signText = (text: string) => SIGN_TEXT[signTone(text)];

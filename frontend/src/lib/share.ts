import { toast } from "sonner";

/** The invite line - Profile's "Invite a friend", and what Simulate's share buttons send with nothing to tell. */
export const INVITE_TEXT = "Join me on STAK — swipe stocks you actually understand and practice with paper money. https://thestak.org";
const SHARE_TAIL = "Practice investing with paper money: https://thestak.org";

/** Share [text] where the browser can, otherwise copy it. Dismissing the share sheet isn't an error. */
export async function shareText(text: string, title: string, copied = "Copied"): Promise<void> {
	try {
		if (navigator.share) await navigator.share({ title, text });
		else { await navigator.clipboard.writeText(text); toast.success(copied); }
	} catch { /* cancelled */ }
}

// Simulate's share lines, as the apps word them (PaperPortfolio.pickShareText / portfolioShareText): the return in
// percent (the picture beside them carries the dollars) - for the range on screen, as the picture shows it.
/** A range's word in the sharer's own voice: "past month", "since I started" - and 1D's the picture's own session word
 *  ("today", or "on Friday" before the open and at weekends). */
export function shareRangeWord(range: string, rangeWordOf: (r: string) => string, session: string): string {
	return range.toLowerCase() === "1d" ? session : rangeWordOf(range).replace("since you started", "since I started");
}

/** A pick's line: its move over the range on screen ("up 6.9% past month"); without one, its return since it was picked
 *  ("just picked" while that still reads 0.0%). */
export function pickShareText(ticker: string, up: boolean, gainPct: number, range?: { up: boolean; pct: number; word: string }): string {
	if (range) {
		const shown = Math.abs(range.pct).toFixed(1);
		const move = shown === "0.0" ? "flat" : `${range.up ? "up" : "down"} ${shown}%`;
		return `I'm paper trading ${ticker} on STAK - it's ${move} ${range.word}. ${SHARE_TAIL}`;
	}
	const shown = Math.abs(gainPct).toFixed(1);
	if (shown === "0.0") return `I just picked ${ticker} on STAK. ${SHARE_TAIL}`;
	return `I'm paper trading ${ticker} on STAK - ${up ? "up" : "down"} ${shown}% since I picked it. ${SHARE_TAIL}`;
}

/** The portfolio's line - its return since the account started; an empty portfolio shares the invite. */
export function portfolioShareText(allTimePct: number, empty: boolean): string {
	if (empty) return INVITE_TEXT;
	const shown = Math.abs(allTimePct).toFixed(1);
	const move = shown === "0.0" ? "even" : `${allTimePct > 0 ? "up" : "down"} ${shown}%`;
	return `My STAK paper portfolio is ${move} since I started. ${SHARE_TAIL}`;
}

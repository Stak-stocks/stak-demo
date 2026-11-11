/**
 * Where the keyboard focus lands when the taste quiz hands back to Profile › Taste & risk. The quiz's steps move focus
 * to each step's heading, but the return is a history pop (onboarding.tsx returnToProfile), after which the control
 * that sent the person into the quiz is gone and focus fell to <body>: a keyboard user started again from the page's
 * top and a screen reader announced nothing. The quiz leaves the row it was opened from here (one shot, this tab only),
 * and Taste & risk focuses that row as it mounts (preventScroll: the page lands where it would anyway). Nothing is
 * stored at rest, so a plain visit to Taste & risk focuses nothing.
 */
export type TasteRiskRow = "taste" | "goal" | "risk";

const KEY = "stak.profile.focusRow";

/** Before the quiz pops back to Taste & risk: the row it was opened from ("taste" = Retake the taste quiz, "goal" / "risk" = their Change rows). */
export function rememberReturnFocus(row: TasteRiskRow): void {
	try {
		sessionStorage.setItem(KEY, row);
	} catch {
		/* storage unavailable: the page keeps the browser's own focus */
	}
}

/** The remembered row, cleared as it is read (one shot). */
export function takeReturnFocus(): TasteRiskRow | null {
	try {
		const row = sessionStorage.getItem(KEY);
		if (row !== null) sessionStorage.removeItem(KEY);
		return row === "taste" || row === "goal" || row === "risk" ? row : null;
	} catch {
		return null;
	}
}

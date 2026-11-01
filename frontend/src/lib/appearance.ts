// Android's Appearance setting: "dark" or "match system". STAK is dark-only either way; the choice is only remembered.
export type Appearance = "dark" | "system";
const KEY = "stak:appearance";

export function getAppearance(): Appearance {
	try { return localStorage.getItem(KEY) === "system" ? "system" : "dark"; } catch { return "dark"; }
}

export function setAppearance(value: Appearance): void {
	try { localStorage.setItem(KEY, value); } catch { /* remembered only for this visit */ }
}

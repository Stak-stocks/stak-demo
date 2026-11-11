/**
 * "Your read" (2:4824: heading 2:4827, title 2:4828, body 2:4829) for every state but the untouched showcase, which keeps
 * the frame's own sentences (SHOWCASE.insight). The voice is the frame's ("Six of your fourteen picks are tech or AI
 * names. Your STAK skews high-growth, with a small hedge in real estate."), read from the person's own saves, with the
 * phones' rules for a small STAK (mystak audit item 6):
 * - a first save is named, not counted: "NVDA is your first save, a tech or AI name. Save a few more and STAK will read
 *   the pattern." (android ui/StakInsights.kt:77, iOS StakInsights.swift:81-83; a save outside the six collections has
 *   no theme to name, as the phones' `theme == null`), under a headline that claims no lean yet (FIRST_SAVE_TITLE: the
 *   hunt's C-12, coordinator ruling N30.8m: "You lean into growth and tech." stood over a body saying the pattern
 *   cannot be read yet; the phones print the same lean for one save, StakInsights.kt:64-68: reported for both);
 * - a lead of one agrees in the singular ("One of your seven picks is a tech or AI name."), and a lead that is the whole
 *   STAK says so ("Both of your picks are …", "All five of your picks are …") instead of "Two of your two picks are".
 * One conjunction for the sector phrase (C-12): the frame's "tech or AI names", so its singular is "a tech or AI name"
 * (it read "a tech and AI name", the phones' THEME word, beside the frame's "or").
 * One number style inside a sentence (the hunt's NUM-14, ruling N23q): both counts as words while the STAK holds twenty
 * saves or fewer (the frame's "Six of your fourteen"), both as numerals once it holds more ("6 of your 21 picks", never
 * "Six of your 21").
 * The biggest collection leads (a tie keeps the overview's collection order, "Other" last); the smallest other one is
 * the "small hedge".
 */
import { COLLECTION_ORDER, type CollectionSlug } from "@/app/live/catalog";
import { numberWord } from "@/app/live/collections";

const ORDER: readonly CollectionSlug[] = [...COLLECTION_ORDER, "other"];

const LEAN_TITLE: Record<CollectionSlug, string> = {
	"ai-tech": "You lean into growth and tech.",
	finance: "You lean into finance.",
	"green-energy": "You lean into clean energy.",
	"real-estate": "You lean into property.",
	healthcare: "You lean into healthcare.",
	consumer: "You lean into brands you know.",
	other: "You lean off the beaten path.",
};
/** what the leading collection's picks are, several of them */
const NAMES: Record<CollectionSlug, string> = {
	"ai-tech": "tech or AI names",
	finance: "financial names",
	"green-energy": "clean-energy names",
	"real-estate": "property names",
	healthcare: "healthcare names",
	consumer: "consumer brands",
	other: "names outside the main sectors",
};
/** … and one of them */
const NAME: Record<CollectionSlug, string> = {
	"ai-tech": "a tech or AI name",
	finance: "a financial name",
	"green-energy": "a clean-energy name",
	"real-estate": "a property name",
	healthcare: "a healthcare name",
	consumer: "a consumer brand",
	other: "a name outside the main sectors",
};
const SKEW: Record<CollectionSlug, string> = {
	"ai-tech": "high-growth",
	finance: "steady",
	"green-energy": "toward clean energy",
	"real-estate": "toward income",
	healthcare: "defensive",
	consumer: "toward everyday brands",
	other: "eclectic",
};
const HEDGE: Record<CollectionSlug, string> = {
	"ai-tech": "tech",
	finance: "finance",
	"green-energy": "clean energy",
	"real-estate": "real estate",
	healthcare: "healthcare",
	consumer: "consumer brands",
	other: "other sectors",
};

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The headline over a single save: the read has not started leaning anywhere (the phones' own no-lean headline, "Your
 * read starts with your first save.": android ui/StakInsights.kt:66, ios StakInsights.swift:71 and
 * MyStak/MyStakView.swift:159, where they print it before the first save).
 */
export const FIRST_SAVE_TITLE = "Your read starts with your first save.";

/** The largest count the sentences spell out (numberWord's own last word, the frame's "fourteen" style). */
export const WORDS_UP_TO = 20;

export type Read = { title: string; body: string };

/** The read of the saves grouped by collection (tickers per collection, in save order); null with nothing saved. */
export function readFor(groups: Readonly<Record<CollectionSlug, readonly string[]>>): Read | null {
	const count = (s: CollectionSlug) => groups[s]?.length ?? 0;
	const held = ORDER.filter((s) => count(s) > 0);
	const total = held.reduce((n, s) => n + count(s), 0);
	if (total === 0) return null;
	// the biggest first; the sort is stable, so a tie keeps the overview's order
	const top = [...held].sort((a, b) => count(b) - count(a))[0]!;
	if (total === 1) {
		const ticker = groups[top]![0]!;
		const theme = top === "other" ? "" : `, ${NAME[top]}`;
		return { title: FIRST_SAVE_TITLE, body: `${ticker} is your first save${theme}. Save a few more and STAK will read the pattern.` };
	}
	const title = LEAN_TITLE[top];
	const n = count(top);
	// one style for both counts: words while the larger one (the total) has a word, numerals for both beyond it
	const num = (k: number) => (total <= WORDS_UP_TO ? numberWord(k) : String(k));
	const lead =
		n === total
			? `${total === 2 ? "Both" : `All ${num(total)}`} of your picks are ${NAMES[top]}.`
			: n === 1
				? `${capital(num(1))} of your ${num(total)} picks is ${NAME[top]}.`
				: `${capital(num(n))} of your ${num(total)} picks are ${NAMES[top]}.`;
	const smallest = held.filter((s) => s !== top).sort((a, b) => count(a) - count(b))[0];
	const hedge = smallest ? `, with a small hedge in ${HEDGE[smallest]}.` : ".";
	return { title, body: `${lead} Your STAK skews ${SKEW[top]}${hedge}` };
}

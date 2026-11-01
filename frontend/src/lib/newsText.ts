// Android's NewsText / NewsDeckFeed: what a story says beyond its own headline, and the Home deck's three stories.
import type { NewsArticle } from "@stak/shared";

const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const isAlnum = (c: string) => /[a-z0-9]/i.test(c);
const MIN_NEW_CHARS = 25;

/**
 * The summary with the headline's own words taken out, or null when it adds nothing.
 * The headline's core is the part before its last " - " (the outlet), when that part is at least 20 characters.
 */
export function summaryBeyondHeadline(headline: string, summary: string | null | undefined): string | null {
	const text = (summary ?? "").trim();
	if (alnum(text).length < MIN_NEW_CHARS) return null;
	const dash = headline.lastIndexOf(" - ");
	const core = dash >= 0 && headline.slice(0, dash).length >= 20 ? headline.slice(0, dash) : headline;
	const coreKey = alnum(core);
	if (coreKey.length > 0 && alnum(text).startsWith(coreKey)) {
		// Walk the summary until the headline's letters are used up; what is left is the new part.
		let seen = 0;
		let i = 0;
		while (i < text.length && seen < coreKey.length) {
			if (isAlnum(text[i])) seen++;
			i++;
		}
		let rest = text.slice(i);
		const start = rest.search(/[a-z0-9]/i);
		rest = start < 0 ? "" : rest.slice(start);
		return alnum(rest).length < MIN_NEW_CHARS ? null : rest.trim();
	}
	return text;
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max).trimEnd()}…` : s);

export interface DeckStory {
	title: string;
	body: string;
	loading: boolean;
}

/** The three Home deck cards: the market feed's first stories (title cut to 65 characters, body to 110). */
export function deckStories(news: NewsArticle[] | undefined, failed: boolean): DeckStory[] {
	if (failed) {
		return [
			{ title: "Market news isn't loading", body: "Open News to try again.", loading: false },
			{ title: "", body: "", loading: false },
			{ title: "", body: "", loading: false },
		];
	}
	if (!news || news.length === 0) return [0, 1, 2].map(() => ({ title: "", body: "", loading: true }));
	return [0, 1, 2].map((i) => {
		const a = news[i];
		if (!a) return { title: "", body: "", loading: false };
		return {
			title: clip(a.headline, 65),
			body: clip(summaryBeyondHeadline(a.headline, a.summary) ?? "", 110),
			loading: false,
		};
	});
}

/** Android's StakClock.newsAge: "12m", "3h", "2d" - no "ago". */
export function newsAge(datetimeSeconds: number, now = Date.now()): string {
	const secs = Math.max(0, Math.floor(now / 1000 - datetimeSeconds));
	if (secs < 3600) return `${Math.floor(secs / 60)}m`;
	if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
	return `${Math.floor(secs / 86400)}d`;
}

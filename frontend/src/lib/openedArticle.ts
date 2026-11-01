// The story a News row opened, so the article page can show it without another request (the API has no
// "fetch one article" endpoint - stories only exist as members of a feed response).
import type { NewsArticle } from "@stak/shared";

/** A story as the app keeps it: the article plus the stock it was filed under, when that's known. */
export interface StoredArticle extends NewsArticle {
	ticker?: string;
}

const FIELDS: Array<keyof StoredArticle> = ["headline", "source", "url", "image", "datetime", "summary", "explanation", "whyItMatters", "sentiment", "type", "ticker"];

/** Only the fields the app shows - sessionStorage is not an article archive. */
function slimArticle(a: StoredArticle): StoredArticle {
	const out: Record<string, unknown> = {};
	for (const f of FIELDS) if (a[f] !== undefined) out[f] = a[f];
	return out as unknown as StoredArticle;
}

const OPENED_KEY = "stak:news-opened";
const MAX_REMEMBERED = 80;

export function rememberArticles(list: StoredArticle[]): void {
	try {
		const existing = JSON.parse(sessionStorage.getItem(OPENED_KEY) ?? "{}") as Record<string, StoredArticle>;
		for (const a of list) existing[a.url] = slimArticle(a);
		const entries = Object.entries(existing).slice(-MAX_REMEMBERED);
		sessionStorage.setItem(OPENED_KEY, JSON.stringify(Object.fromEntries(entries)));
	} catch {
		// best-effort: without it the article page has nothing to show and goes back to News
	}
}

export function readRememberedArticle(url: string): StoredArticle | null {
	try {
		const map = JSON.parse(sessionStorage.getItem(OPENED_KEY) ?? "{}") as Record<string, StoredArticle>;
		return map[url] ?? null;
	} catch {
		return null;
	}
}

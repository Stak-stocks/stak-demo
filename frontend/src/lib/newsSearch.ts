// Android's News search (NewsScreen.matchesLive / matchesBrief + BrandNames.expand): instant, client-side, and
// aware that "tesla" and "TSLA" are the same company.
import type { StoredArticle } from "@/lib/openedArticle";

interface NamedBrand {
	ticker: string;
	name: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const looksLikeTicker = (term: string) => /^[A-Z0-9.]+$/.test(term);

/** Each term's whole-word pattern, built once: typing re-filters every article per keystroke, and a query like "tec"
 *  expands to dozens of tickers. Bounded, since the terms change as the query does. */
const wordPatterns = new Map<string, RegExp>();
function wholeWord(term: string, anyCase: boolean): RegExp {
	const key = `${anyCase ? "i" : "c"}:${term}`;
	let re = wordPatterns.get(key);
	if (!re) {
		if (wordPatterns.size > 500) wordPatterns.clear();
		re = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(term)}($|[^A-Za-z0-9])`, anyCase ? "i" : "");
		wordPatterns.set(key, re);
	}
	return re;
}

/** Extra terms to look for: a ticker's company name, and (from three letters) the tickers of companies whose name contains the query. */
export function expandQuery(query: string, brands: NamedBrand[]): string[] {
	const q = query.trim();
	if (!q) return [];
	const terms: string[] = [];
	const asTicker = brands.find((b) => b.ticker.toUpperCase() === q.toUpperCase());
	if (asTicker) terms.push(asTicker.name);
	if (q.length >= 3) {
		const lower = q.toLowerCase();
		for (const b of brands) if (b.name.toLowerCase().includes(lower)) terms.push(b.ticker.toUpperCase());
	}
	return terms;
}

export function matchesLive(article: StoredArticle, query: string, terms: string[]): boolean {
	const q = query.trim();
	if (!q) return true;
	const lower = q.toLowerCase();
	const texts = [article.headline, article.source, article.summary, article.explanation].map((t) => t ?? "");
	if (texts.some((t) => t.toLowerCase().includes(lower))) return true;
	if (article.ticker?.toLowerCase().includes(lower)) return true;
	return terms.some((term) => {
		if (looksLikeTicker(term)) {
			if (article.ticker?.toUpperCase() === term) return true;
			// A whole word, in capitals, so "AI" doesn't match "said".
			const re = wholeWord(term, false);
			return texts.some((t) => re.test(t));
		}
		const re = wholeWord(term, true);
		return texts.some((t) => re.test(t));
	});
}

export function matchesBrief(brief: { title: string; body: string; source: string }, query: string, terms: string[]): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const has = (t: string, needle: string) => t.toLowerCase().includes(needle);
	if (has(brief.title, q) || has(brief.body, q) || has(brief.source, q)) return true;
	return terms.some((term) => has(brief.title, term.toLowerCase()) || has(brief.body, term.toLowerCase()));
}

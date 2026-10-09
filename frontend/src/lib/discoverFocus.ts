// Desktop Discover's "Not sure? Try a different category" chips. Picking one moves that category's companies to the
// front of today's deck - and, since a day's ten picks often hold none of a category, brings in its best-ranked others
// (the daily limit is unchanged); picking it again goes back to today's picks.
import { categoryFamily, categoryNameOf, type BrandSummary, type CategoryFamily } from "@stak/shared";

/** In a collection family ("tech", "health"...), optionally leaving one collection out. */
const inFamily = (family: CategoryFamily, except?: string) => (b: BrandSummary) => {
	const name = categoryNameOf(b.ticker);
	return !!name && name !== except && categoryFamily(name) === family;
};
const yieldPct = (b: BrandSummary): number => parseFloat(b.financials?.dividendYield?.value ?? "") || 0;

export interface DiscoverFocus {
	id: string;
	label: string;
	matches: (brand: BrandSummary) => boolean;
}

export const DISCOVER_FOCUS: DiscoverFocus[] = [
	{ id: "tech", label: "Tech", matches: inFamily("tech", "AI") },
	{ id: "health", label: "Healthcare", matches: inFamily("health") },
	{ id: "green", label: "Clean Energy", matches: inFamily("green") },
	{ id: "ai", label: "AI", matches: (b) => categoryNameOf(b.ticker) === "AI" },
	{ id: "dividends", label: "Dividends", matches: (b) => yieldPct(b) >= 2 },
];

/** The deck with the chosen category's companies first - its own, then `more` of them (the rest of the ranking, best
 *  first) - each group keeping its recommended order. */
export function withFocus(brands: BrandSummary[], focusId: string | null, more: BrandSummary[] = []): BrandSummary[] {
	const focus = DISCOVER_FOCUS.find((f) => f.id === focusId);
	if (!focus) return brands;
	const first: BrandSummary[] = [];
	const rest: BrandSummary[] = [];
	for (const b of brands) (focus.matches(b) ? first : rest).push(b);
	const inDeck = new Set(brands.map((b) => b.id));
	const extra = more.filter((b) => !inDeck.has(b.id) && focus.matches(b));
	return [...first, ...extra, ...rest];
}

// Client-side grouping of saved brands into My STAK's "Collections" — there is
// no backend endpoint for this (confirmed: neither GET /api/me/stak nor the
// Supabase-sourced account doc carries a category per brand). Direct TS port
// of Android's MyStakViewModel.render()+groupsOf() (android/.../ui/mystak/
// MyStakViewModel.kt lines 254-277, 458-476).
import { categoryGroupId, categoryNameOf, type BrandSummary } from "@stak/shared";

const OTHER = "Other";

export interface Holding {
	ticker: string;
	brandId: string;
	name: string;
	groupId: string;
	groupName: string;
	savedAt: number | null;
	priceAtSave: number | null;
	price: number | null;
	changePercent: number | null;
}

export interface Group {
	id: string;
	name: string;
	holdings: Holding[];
	share: number;
}

/** A saved brand's category display name, falling back to the catch-all "Other" group. */
function groupNameOf(ticker: string): string {
	return categoryNameOf(ticker) ?? OTHER;
}

export function deriveHoldings(
	swipedBrands: BrandSummary[],
	stakSavedAt: Record<string, { savedAt: number; priceAtSave: number | null }> | undefined,
	quotes: Record<string, { price: number; changePercent: number }>,
): Holding[] {
	return swipedBrands.map((brand) => {
		const groupName = groupNameOf(brand.ticker);
		const entry = stakSavedAt?.[brand.id];
		const quote = quotes[brand.ticker];
		return {
			ticker: brand.ticker,
			brandId: brand.id,
			name: brand.name,
			groupId: categoryGroupId(groupName),
			groupName,
			savedAt: entry?.savedAt ?? null,
			priceAtSave: entry?.priceAtSave ?? null,
			price: quote?.price ?? null,
			changePercent: quote?.changePercent ?? null,
		};
	});
}

/** Saves grouped by category, biggest first; ties keep alphabetical order, "Other" always last. */
export function groupHoldings(holdings: Holding[]): Group[] {
	const byId = new Map<string, Holding[]>();
	for (const h of holdings) {
		const list = byId.get(h.groupId);
		if (list) list.push(h);
		else byId.set(h.groupId, [h]);
	}
	const groups: Group[] = [...byId.entries()].map(([id, stocks]) => ({
		id,
		name: stocks[0]!.groupName,
		holdings: stocks,
		share: stocks.length / holdings.length,
	}));
	groups.sort((a, b) => {
		const aOther = a.name === OTHER ? 1 : 0;
		const bOther = b.name === OTHER ? 1 : 0;
		if (aOther !== bOther) return aOther - bOther;
		if (a.holdings.length !== b.holdings.length) return b.holdings.length - a.holdings.length;
		return a.name.localeCompare(b.name);
	});
	return groups;
}

export type CollectionSort = "newest" | "az" | "movers";
export const COLLECTION_SORTS: ReadonlyArray<readonly [CollectionSort, string]> = [["newest", "Newest"], ["az", "A–Z"], ["movers", "Top movers"]];

/** Android compares the tile's own text, so movers are ranked on the change rounded to one decimal. */
const roundedMove = (h: Holding) => Math.abs(Math.round((h.changePercent ?? 0) * 10) / 10);

export function sortHoldings(holdings: Holding[], sort: CollectionSort): Holding[] {
	const sorted = [...holdings];
	if (sort === "az") return sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
	if (sort === "movers") return sorted.sort((a, b) => roundedMove(b) - roundedMove(a));
	// Newest first; a save with no date sorts last.
	return sorted.sort((a, b) => (b.savedAt ?? -Infinity) - (a.savedAt ?? -Infinity));
}

/** Equal-weight average of the holdings' moves that have a quote. */
export function groupChangePct(holdings: Holding[]): number | null {
	const moves = holdings.map((h) => h.changePercent).filter((v): v is number => v != null);
	if (moves.length === 0) return null;
	return moves.reduce((a, b) => a + b, 0) / moves.length;
}

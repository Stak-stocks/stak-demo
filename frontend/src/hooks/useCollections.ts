import { useMemo } from "react";
import type { BrandSummary } from "@stak/shared";
import { useAccount } from "@/context/AccountContext";
import { deriveHoldings, groupHoldings, type Group, type Holding } from "@/lib/collections";

/**
 * Collections grouping — not a network query (no backend endpoint exists for
 * this, see lib/collections.ts), just a memo over already-loaded data. Cheap
 * enough (bounded by STAK_CAPACITY = 30) to recompute on every render of its
 * dependencies rather than needing its own cache.
 */
export function useCollections(
	swipedBrands: BrandSummary[],
	quotes: Record<string, { price: number; changePercent: number }>,
): { holdings: Holding[]; groups: Group[] } {
	const { account } = useAccount();

	const holdings = useMemo(
		() => deriveHoldings(swipedBrands, account?.stakSavedAt, quotes),
		[swipedBrands, account?.stakSavedAt, quotes],
	);

	const groups = useMemo(() => groupHoldings(holdings), [holdings]);

	return { holdings, groups };
}

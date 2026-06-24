import { useMemo } from "react";
import { useAccount } from "@/context/AccountContext";
import { useBrandsList } from "@/hooks/useBrandsList";

/**
 * Returns a stable, sorted array of uppercase ticker symbols for the user's Stak.
 * Sorted so the array is order-independent — query keys always match regardless
 * of the order brands were added. Returns [] (same as having no stakBrandIds)
 * while the brand catalog is still loading -- callers already treat an empty
 * result as "nothing to do yet", so this is a safe transient default.
 */
export function useStakTickers(): string[] {
	const { account } = useAccount();
	const { data: allBrands } = useBrandsList();
	return useMemo(() => {
		if (!allBrands) return [];
		const brandMap = new Map(allBrands.map((b) => [b.id, b]));
		return [...new Set(
			(account?.stakBrandIds ?? [])
				.map((id) => brandMap.get(id)?.ticker.toUpperCase())
				.filter(Boolean) as string[]
		)].sort();
	}, [account?.stakBrandIds, allBrands]);
}

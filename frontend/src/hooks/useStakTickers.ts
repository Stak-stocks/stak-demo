import { useMemo } from "react";
import { useAccount } from "@/context/AccountContext";
import { brands as allBrands } from "@/data/brands";

/**
 * Returns a stable, sorted array of uppercase ticker symbols for the user's Stak.
 * Sorted so the array is order-independent — query keys always match regardless
 * of the order brands were added.
 */
export function useStakTickers(): string[] {
	const { account } = useAccount();
	return useMemo(() => {
		const brandMap = new Map(allBrands.map((b) => [b.id, b]));
		return [...new Set(
			(account?.stakBrandIds ?? [])
				.map((id) => brandMap.get(id)?.ticker.toUpperCase())
				.filter(Boolean) as string[]
		)].sort();
	}, [account?.stakBrandIds]);
}

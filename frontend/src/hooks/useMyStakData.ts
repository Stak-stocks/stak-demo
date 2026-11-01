import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BrandSummary } from "@stak/shared";
import { useBrandsList } from "@/hooks/useBrandsList";
import { useAccount } from "@/context/AccountContext";
import { getBatchQuotes } from "@/lib/api";

// One shared empty map, so "no quotes yet" doesn't hand memoised consumers a new object every render.
const NO_QUOTES: Record<string, { price: number; change: number; changePercent: number }> = {};

/**
 * Shared data every My STAK page needs — hoisted out of the old flat
 * my-stak.tsx so the overview, /collections, /collection/$id, /taste and
 * /updates each call one hook instead of duplicating this derivation.
 * `allBrands` and `account` are already React Query / real-time subscribed
 * app-wide, so calling this from 5 route files is cheap re-derivation, not
 * 5x the network traffic.
 */
export function useMyStakData() {
	const { account, accountLoading } = useAccount();
	const { data: allBrandsList, isLoading: allBrandsLoading, isError: allBrandsError, refetch: retryBrands } = useBrandsList();
	const allBrands = useMemo(() => allBrandsList ?? [], [allBrandsList]);

	const swipedBrands = useMemo(() => {
		const brandMap = new Map(allBrands.map((b) => [b.id, b]));
		return (account?.stakBrandIds ?? [])
			.map((id) => brandMap.get(id))
			.filter(Boolean) as BrandSummary[];
	}, [account?.stakBrandIds, allBrands]);

	const tickers = useMemo(() => swipedBrands.map((b) => b.ticker), [swipedBrands]);
	const { data: batchQuotesData } = useQuery({
		queryKey: ["batch-quotes", tickers],
		queryFn: () => getBatchQuotes(tickers),
		enabled: tickers.length > 0,
		staleTime: 60 * 1000,
		refetchInterval: 60 * 1000,
		retry: 1,
	});
	const batchQuotes = batchQuotesData?.quotes ?? NO_QUOTES;

	return {
		allBrands,
		allBrandsLoading,
		allBrandsError,
		retryBrands,
		swipedBrands,
		batchQuotes,
		account,
		accountLoading,
	};
}

import { useQuery } from "@tanstack/react-query";
import { getBrandsList } from "@/lib/api";

/**
 * The full brand catalog's lightweight summary (everything except
 * culturalContext/personalityDescription/financial metric explanations --
 * see BrandSummary in @stak/shared) -- fetched once via GET /api/brands
 * instead of bundled into the JS, which is what was scaling the brands-data
 * chunk linearly with catalog size. 24h staleTime since this is effectively
 * static reference data within a session; gcTime kept in step so it isn't
 * evicted and silently refetched sooner than that.
 */
export function useBrandsList() {
	return useQuery({
		queryKey: ["brands-list"],
		queryFn: getBrandsList,
		select: (data) => data.brands,
		staleTime: 24 * 60 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
		retry: 1,
	});
}

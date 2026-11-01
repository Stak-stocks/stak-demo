import { useQuery } from "@tanstack/react-query";
import { getBrandDetail } from "@/lib/api";

/**
 * One brand's full profile (everything useBrandsList's summary omits --
 * culturalContext, personalityDescription, each financial metric's
 * label/explanation/culturalTranslation) -- fetched on demand via
 * GET /api/brands/:id only when actually viewing that brand's detail sheet,
 * not bundled wholesale with every other brand.
 */
export function useBrandDetail(id: string | null | undefined) {
	return useQuery({
		queryKey: ["brand-detail", id],
		queryFn: () => getBrandDetail(id!),
		enabled: !!id,
		staleTime: 24 * 60 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
		retry: 1,
	});
}

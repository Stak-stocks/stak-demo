import { useQuery } from "@tanstack/react-query";
import { getTaste } from "@/lib/api";
import { fromTasteResponse, type Graph } from "@/lib/tasteGraph";

/**
 * Investing Taste — shared ["taste"] query key so the overview and
 * /my-stak/taste read from the same cache and never refetch navigating
 * between them within staleTime (mirrors Android's one shared view-model
 * instance across those two screens).
 */
export function useTaste() {
	const query = useQuery({
		queryKey: ["taste"],
		queryFn: getTaste,
		// Short: the backend keeps its reading for 60s but drops it as soon as a save, a Quick Look or a page open
		// changes it, so a fresh visit here should show that change.
		staleTime: 5 * 1000,
		retry: 1,
	});

	const taste: Graph | null = query.data ? fromTasteResponse(query.data) : null;

	return { taste, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUpdates, markUpdateRead, type UpdatesApiResponse } from "@/lib/api";

const UPDATES_KEY = ["updates"];

/**
 * "What Changed" — shared ["updates"] query key so the overview and
 * /my-stak/updates share one cache/request (mirrors Android's one shared
 * view-model instance). Marking read is an optimistic local patch, not a
 * refetch, matching Android's `markCompanyRead` updating in-memory state
 * directly instead of re-hitting the network.
 */
export function useUpdates() {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: UPDATES_KEY,
		queryFn: getUpdates,
		staleTime: 60 * 1000,
		retry: 1,
	});

	/** The ids are decided when the call is made, before the optimistic patch below flips
	 *  them to read - a mutationFn that re-read the cache afterwards found nothing unread
	 *  and never told the server, so every "read" update came back unread on reload. */
	const markReadMutation = useMutation({
		mutationFn: async ({ ids }: { ticker: string; ids: number[] }) => {
			await Promise.all(ids.map((id) => markUpdateRead(id)));
			return ids;
		},
		onMutate: async ({ ticker }: { ticker: string; ids: number[] }) => {
			const previous = queryClient.getQueryData<UpdatesApiResponse>(UPDATES_KEY);
			if (!previous) return { previous };
			const flipped = previous.updates.filter((u) => u.ticker === ticker && !u.read).length;
			queryClient.setQueryData<UpdatesApiResponse>(UPDATES_KEY, {
				updates: previous.updates.map((u) => (u.ticker === ticker ? { ...u, read: true } : u)),
				unread: Math.max(0, previous.unread - flipped),
			});
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) queryClient.setQueryData(UPDATES_KEY, context.previous);
		},
	});

	/** Marks every update belonging to `ticker` read - mirrors Android's
	 *  markCompanyRead(ticker) semantic (opening any one of a company's
	 *  changes marks the whole company read, not just the clicked update). */
	const markCompanyRead = (ticker: string) => {
		const current = queryClient.getQueryData<UpdatesApiResponse>(UPDATES_KEY);
		const ids = (current?.updates ?? []).filter((u) => u.ticker === ticker && !u.read).map((u) => u.id);
		if (ids.length === 0) return;
		markReadMutation.mutate({ ticker, ids });
	};

	return {
		updates: query.data?.updates ?? [],
		unread: query.data?.unread ?? 0,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
		markCompanyRead,
	};
}

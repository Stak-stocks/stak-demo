import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback } from "react";
import { deleteStakAiConversation, getStakAiConversations, renameStakAiConversation, type StakAiConversation } from "@/lib/api";
import { newsAge } from "@/lib/newsText";
import { STAK_AI_CONVERSATIONS_KEY } from "./useStakAiChat";

type Page = Awaited<ReturnType<typeof getStakAiConversations>>;

/**
 * STAK AI's past chats, newest first, 20 at a time (React Query: an answer elsewhere invalidates it, and a refetch
 * keeps every page already loaded). Rename and delete show at once and are put right if they fail.
 */
export function useStakAiHistory() {
	const qc = useQueryClient();
	const query = useInfiniteQuery({
		queryKey: STAK_AI_CONVERSATIONS_KEY,
		queryFn: ({ pageParam }) => getStakAiConversations(pageParam),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => last.nextBefore ?? undefined,
	});
	const conversations = query.data?.pages.flatMap((p) => p.conversations) ?? [];

	const edit = useCallback((change: (c: StakAiConversation[]) => StakAiConversation[]) => {
		qc.setQueryData<InfiniteData<Page>>(STAK_AI_CONVERSATIONS_KEY, (d) => d && { ...d, pages: d.pages.map((p) => ({ ...p, conversations: change(p.conversations) })) });
	}, [qc]);

	const rename = useCallback((c: StakAiConversation, title: string) => {
		const t = title.trim().slice(0, 80);
		if (!t || t === c.title) return;
		edit((cs) => cs.map((x) => (x.id === c.id ? { ...x, title: t } : x)));
		renameStakAiConversation(c.id, t).catch(() => edit((cs) => cs.map((x) => (x.id === c.id ? { ...x, title: c.title } : x))));
	}, [edit]);

	const remove = useCallback((c: StakAiConversation) => {
		edit((cs) => cs.filter((x) => x.id !== c.id));
		// Failed: fetch the list again rather than restore a snapshot that may predate other changes.
		deleteStakAiConversation(c.id).catch(() => qc.invalidateQueries({ queryKey: STAK_AI_CONVERSATIONS_KEY }));
	}, [edit, qc]);

	return {
		conversations,
		loading: query.isPending || query.isFetchingNextPage,
		failed: query.isError,
		hasMore: query.hasNextPage,
		reload: () => { void query.refetch(); },
		loadMore: () => { void query.fetchNextPage(); },
		rename,
		remove,
	};
}

/** "Just now", "12m ago", "3h ago", "30d ago" - Android's StakClock.ago, from lib/newsText's shared newsAge. */
export function ago(iso: string, now = Date.now()): string {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return "";
	const age = newsAge(t / 1000, now);
	return age === "0m" ? "Just now" : `${age} ago`;
}

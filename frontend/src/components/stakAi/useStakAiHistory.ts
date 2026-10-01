import { useCallback, useEffect, useState } from "react";
import { deleteStakAiConversation, getStakAiConversations, renameStakAiConversation, type StakAiConversation } from "@/lib/api";

/** STAK AI's past chats, newest first, 20 at a time; rename and delete show at once and are put back if they fail. */
export function useStakAiHistory() {
	const [conversations, setConversations] = useState<StakAiConversation[]>([]);
	const [nextBefore, setNextBefore] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);

	const load = useCallback((before?: string) => {
		setLoading(true);
		setFailed(false);
		getStakAiConversations(before)
			.then((r) => {
				setConversations((cur) => (before ? [...cur, ...r.conversations] : r.conversations));
				setNextBefore(r.nextBefore);
			})
			.catch(() => setFailed(true))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => { load(); }, [load]);

	const rename = useCallback((c: StakAiConversation, title: string) => {
		const t = title.trim().slice(0, 80);
		if (!t || t === c.title) return;
		const put = (v: string) => setConversations((cur) => cur.map((x) => (x.id === c.id ? { ...x, title: v } : x)));
		put(t);
		renameStakAiConversation(c.id, t).catch(() => put(c.title));
	}, []);

	const remove = useCallback((c: StakAiConversation) => {
		let before: StakAiConversation[] = [];
		setConversations((cur) => { before = cur; return cur.filter((x) => x.id !== c.id); });
		deleteStakAiConversation(c.id).catch(() => setConversations(before));
	}, []);

	return { conversations, loading, failed, hasMore: nextBefore != null, reload: () => load(), loadMore: () => { if (nextBefore) load(nextBefore); }, rename, remove };
}

/** "Just now", "12m ago", "3h ago", "2d ago", or the date. */
export function ago(iso: string, now = Date.now()): string {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return "";
	const mins = Math.floor((now - t) / 60_000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
	if (mins < 10_080) return `${Math.floor(mins / 1440)}d ago`;
	return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

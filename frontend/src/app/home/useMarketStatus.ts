import { useQuery } from "@tanstack/react-query";
import { useApiHealth } from "@/app/live/quotes";
import { getMarketStatusLive } from "@/lib/api";

export type MarketStatus = { known: boolean; isOpen: boolean; holiday: string | null };

/** Whether the market is open right now, from the STAK API; `known` is false while it is unreachable. */
export function useMarketStatus(): MarketStatus {
	const healthy = useApiHealth();
	const q = useQuery({ queryKey: ["market-status"], queryFn: getMarketStatusLive, enabled: healthy, staleTime: 60_000, retry: 0 });
	if (!q.data) return { known: false, isOpen: false, holiday: null };
	return { known: true, isOpen: !!q.data.isOpen, holiday: q.data.holiday ?? null };
}

import { useMemo } from "react";
import { collectionOf } from "@/app/live/catalog";
import { useDeck } from "@/app/live/deck";
import { usePortfolio } from "@/app/live/portfolio";
import { useLive } from "@/app/live/store";
import { useTaste } from "@/app/live/taste";

const isTech = (ticker: string) => collectionOf(ticker) === "ai-tech";

/** Everything Home and the profile hub derive from the account: the paper portfolio, the rank, taste, today's deck. */
export function useProfileStats() {
	const live = useLive();
	const portfolio = usePortfolio();
	const taste = useTaste();
	const deck = useDeck();
	return useMemo(() => {
		const saves = live.saves.length;
		const techSaves = live.saves.filter((s) => isTech(s.ticker)).length;
		const remaining = Math.max(0, deck.total - deck.decided.size);
		return {
			live,
			portfolio,
			taste,
			deck,
			/** cash + holdings at today's quotes */
			value: portfolio.value,
			rank: portfolio.rank,
			/** share of the saves that sit in AI & Tech, rounded to 5 (the "affected industries" line on Home) */
			techShare: saves > 0 ? Math.max(5, Math.round((techSaves / saves) * 20) * 5) : 0,
			/** cards of today's deck not yet decided */
			remaining,
			/** a person with nothing saved, nothing held and nothing decided today is on their first run */
			firstRun: saves === 0 && deck.decided.size === 0 && live.positions.length === 0,
		};
	}, [live, portfolio, taste, deck]);
}

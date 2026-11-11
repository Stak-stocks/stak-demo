import { useMemo } from "react";
import { useDeck } from "@/app/live/deck";
import { usePortfolio } from "@/app/live/portfolio";
import { useLive } from "@/app/live/store";
import { useTaste } from "@/app/live/taste";

/**
 * Everything Home and the profile hub derive from the account: the paper portfolio, taste, today's deck. No rank here:
 * the one rank every screen shows is live/rank.ts useStanding (D4), which the hub reads itself; and no share of the
 * saves in the market-mood industries: Home words its "Why this matters" line in src/app/home/copy.ts.
 */
export function useProfileStats() {
	const live = useLive();
	const portfolio = usePortfolio();
	const taste = useTaste();
	const deck = useDeck({ quotes: false }); // progress only: Home and the hub never show card prices
	return useMemo(() => {
		const saves = live.saves.length;
		const remaining = Math.max(0, deck.total - deck.decided.size);
		return {
			live,
			portfolio,
			taste,
			deck,
			/** cash + holdings at today's quotes */
			value: portfolio.value,
			/** cards of today's deck not yet decided */
			remaining,
			/** a person with nothing saved, nothing held and nothing decided today is on their first run */
			firstRun: saves === 0 && deck.decided.size === 0 && live.positions.length === 0,
		};
	}, [live, portfolio, taste, deck]);
}

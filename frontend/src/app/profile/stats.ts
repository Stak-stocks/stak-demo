import { useMemo } from "react";
import { collectionOf } from "@/app/live/catalog";
import { useDeck } from "@/app/live/deck";
import { usePortfolio } from "@/app/live/portfolio";
import { useLive } from "@/app/live/store";
import { useTaste } from "@/app/live/taste";
import { affectedCollections } from "@/app/data/home";

const isAffected = (ticker: string) => affectedCollections.has(collectionOf(ticker));

/** Everything Home and the profile hub derive from the account: the paper portfolio, the rank, taste, today's deck. */
export function useProfileStats() {
	const live = useLive();
	const portfolio = usePortfolio();
	const taste = useTaste();
	const deck = useDeck({ quotes: false }); // progress only: Home and the hub never show card prices
	return useMemo(() => {
		const saves = live.saves.length;
		const affectedSaves = live.saves.filter((s) => isAffected(s.ticker)).length;
		const remaining = Math.max(0, deck.total - deck.decided.size);
		return {
			live,
			portfolio,
			taste,
			deck,
			/** cash + holdings at today's quotes */
			value: portfolio.value,
			rank: portfolio.rank,
			/** share of the saves in the industries today's market-mood stories touch, rounded to 5 (Home: "houses 80% of stocks from affected industries") */
			techShare: saves > 0 ? Math.max(5, Math.round((affectedSaves / saves) * 20) * 5) : 0,
			/** cards of today's deck not yet decided */
			remaining,
			/** a person with nothing saved, nothing held and nothing decided today is on their first run */
			firstRun: saves === 0 && deck.decided.size === 0 && live.positions.length === 0,
		};
	}, [live, portfolio, taste, deck]);
}

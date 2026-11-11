import { useCallback } from "react";
import { normalizeTicker, useDeck, useLive } from "@/app/live";

/**
 * Save / Unsave from a stock page (discover-stock #5). A company in today's deck is a deck card, and a Save on its own
 * page is that card's deck decision, as both phones record it into the run (android ui/discover/StockDetailScreen.kt:
 * 271-279 `DeckSession.saved + symbol`, the Unsave 267-270; ios Discover/StockDetailView.swift:147-171): the deck's own
 * save / unsave (live/deck.ts) write the save and the run's decision together, so back on the deck the card stays in
 * front with its Saved chip, the ring still names that card (ruling N29a: the number is the card in front, index + 1; a
 * Save, a buy and a Save made here on the card's own page all leave it, only Pass and Previous move it), the receipt
 * counts the save, and the untouched deck does not rebuild without it. Any other company is a plain My STAK save. A deck
 * save the daily swipe limit refuses (accounts) is still a save of the company.
 */
export function useDeckAwareSave(): { save: (ticker: string, price: number | null) => Promise<void>; unsave: (ticker: string) => Promise<void> } {
	const live = useLive();
	// progress only: the stock page never shows the deck's prices
	const deck = useDeck({ quotes: false });
	const inDeck = useCallback((T: string) => deck.order.includes(T), [deck.order]);
	const save = useCallback(
		async (ticker: string, price: number | null) => {
			const T = normalizeTicker(ticker);
			if (inDeck(T) && (await deck.save(T, price))) return;
			await live.actions.save(T, price);
		},
		[inDeck, deck, live.actions],
	);
	const unsave = useCallback(
		(ticker: string) => {
			const T = normalizeTicker(ticker);
			return inDeck(T) ? deck.unsave(T) : live.actions.unsave(T);
		},
		[inDeck, deck, live.actions],
	);
	return { save, unsave };
}

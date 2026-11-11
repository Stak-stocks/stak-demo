import type { DeckProgress } from "@/app/live";

/**
 * The deck run's bookkeeping the deck pages add to live/deck.ts (discover-stock #7). The phones count every card a run
 * goes through and every card it keeps (android ui/discover/DiscoverScreen.kt:385-421 `seen += 1` per swipe, the run's
 * saves; ios Discover/DiscoverView.swift:301, 322); the website's deck records passes, saves and buys, and a card that
 * is already in My STAK when the person moves past it (kept from an earlier run of today's deck, saved on its stock page
 * or an article, bought there) is only moved past. These helpers make that card count as the run's save, as its Saved
 * chip says, so the receipt's Seen and Saved include it.
 */

/**
 * Today's run with `ticker` recorded as kept (one of the run's saves): unchanged when the progress is not today's deck
 * (`date`, `theme`), or the card is already one of the run's saves or buys (a bought card counts as Bought).
 */
export function recordKept(prev: DeckProgress | null, ticker: string, date: string, theme: string): DeckProgress | null {
	if (!prev || prev.date !== date || prev.theme !== theme) return prev;
	if (prev.saved.includes(ticker) || prev.bought.includes(ticker)) return prev;
	return { ...prev, saved: [...prev.saved, ticker], passed: prev.passed.filter((t) => t !== ticker) };
}

/**
 * "Swipe today's deck again" replays the same twelve cards: with every one of them already in My STAK there is nothing
 * left to decide, so the receipt leaves it out, as the phones do (android DiscoverScreen.kt:1459-1460 `canReplay`, ios
 * DiscoverView.swift:823). A deck with no cards (not built yet) keeps it.
 */
export function canReplayDeck(order: readonly string[], saved: ReadonlySet<string>): boolean {
	return order.length === 0 || order.some((t) => !saved.has(t));
}

/**
 * The receipt's "Saved" tile (2:3438): the cards of this run that are in My STAK, each counted once. A card the run
 * saved (or kept) counts, and so does a card BOUGHT in the deck: a buy saves the company (D5) and its card wears the
 * Saved chip, yet the tile left it out ("Seen 12 · Saved 1 · Bought 1" over two cards that read Saved and two companies
 * added to My STAK: the hunt's ST-19, coordinator ruling N27p). A card the person has since removed from My STAK reads
 * "Save" again on the deck and is not counted, so the tile, the cards and My STAK always agree.
 */
export function savedInRun(progress: DeckProgress | null | undefined, savedTickers: ReadonlySet<string>): number {
	if (!progress) return 0;
	return new Set([...progress.saved, ...progress.bought].filter((t) => savedTickers.has(t))).size;
}

/**
 * The receipt's two buttons for a person with NOTHING saved anywhere (the hunt's C-05, coordinator ruling N30.8b: a new
 * guest who passed all twelve read "Practice buy your saves" and "Review saves in My STAK" beside "Saved 0", and both led
 * to empty pages). The phones have no state for it (android ui/discover/DiscoverScreen.kt:1431 and :1447 print the two
 * labels whatever the counts, ios Discover/DiscoverView.swift likewise), so the buttons keep their place, style and
 * targets (Simulate, My STAK) and take labels that are true for nobody's saves.
 */
export const END_WITHOUT_SAVES = { primary: "Start practice trading", secondary: "Open My STAK" } as const;

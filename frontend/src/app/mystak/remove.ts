/**
 * Removing a stock from My STAK (mystak audit items 5 and 9): the collection page's Remove, and the same rule for any
 * page that unsaves a stock its person reached from a My STAK collection.
 *
 * The phones' Remove (android ui/mystak/CollectionScreen.kt:171-181, iOS MyStak/CollectionView.swift:102-111) clears
 * "the same three stores Stock Detail's Unsave clears": the save itself, the deck's saved mark and the news story saves.
 * On the web the save is `live.actions.unsave` (the stock page's Unsave), the deck's mark is today's deck progress (what
 * useDeck().unsave patches), and the story saves follow the saves (the web keeps none of its own).
 *
 * The untouched showcase (D7) is the one special case. The frame's AI & Tech page (2:4830) lists NVDA, AAPL, MSFT,
 * GOOGL and AMD, while the persona's seed keeps NVDA, AAPL and GOOGL unsaved so the deck (2:2944) and the stock pages
 * (2:3457) can show them unsaved at rest; its own AI & Tech saves are MSFT, AMD, SNOW, PLTR and CRWD. The phones' persona
 * really holds the frame's five (android ui/MyStakHoldings.kt:26-34, iOS MyStakHoldings.swift), so a Remove on that page
 * leaves the other four. The web does the same at the moment the person first edits the page: the collection becomes
 * what the person was looking at, less the stock removed, so "Back shows it gone" and nothing else on the page moves
 * (the frame's other stocks are saved, the persona's saves the frame never showed in that collection are dropped, the
 * removed stock is unsaved). That first edit ends the showcase, as every first action does (D7).
 */
import { type CollectionSlug, collectionOf, normalizeTicker } from "@/app/live/catalog";
import type { Live } from "@/app/live/store";
import { SHOWCASE } from "./data";

export type RemovalPlan = {
	/** saved first, in this order (the frame's order, so the page keeps it) */
	save: string[];
	/** then unsaved */
	unsave: string[];
};

/**
 * What a removal writes. `saved`: the person's saves, in save order; `showcase`: the untouched showcase is on;
 * `collection`: the collection page the removal comes from (its authored showcase list applies only there).
 */
export function removalPlan(ticker: string, saved: readonly string[], opts: { showcase: boolean; collection?: string | null }): RemovalPlan {
	const T = normalizeTicker(ticker);
	const savedSet = new Set(saved.map(normalizeTicker));
	const authored = opts.showcase && opts.collection ? SHOWCASE.collections[opts.collection as CollectionSlug] : undefined;
	if (!authored) return { save: [], unsave: savedSet.has(T) ? [T] : [] };
	const slug = opts.collection as CollectionSlug;
	const frame = authored.stocks.map((s) => normalizeTicker(s.ticker));
	return {
		save: frame.filter((t) => t !== T && !savedSet.has(t)),
		unsave: [...savedSet].filter((t) => t === T || (collectionOf(t) === slug && !frame.includes(t))),
	};
}

/** The authored showcase list of a collection first, in the frame's order, then the rest in save order. */
export function inFrameOrder(tickers: readonly string[], collection: string): string[] {
	const authored = SHOWCASE.collections[collection as CollectionSlug];
	if (!authored) return [...tickers];
	const frame = authored.stocks.map((s) => s.ticker);
	return [...frame.filter((t) => tickers.includes(t)), ...tickers.filter((t) => !frame.includes(t))];
}

/**
 * Remove `ticker` from My STAK: the plan above through the live actions, then today's deck forgets the removed stocks'
 * saved marks (useDeck().unsave's patch, without building a deck nobody opened). The writes are all started in one go,
 * in the plan's order: a guest's land at once, in that order, so the page renders the outcome once (no in-between
 * state); an account's plan is the one unsave of the stock. Rejects when an account write fails; the caller says so.
 */
export async function removeFromStak(
	live: Pick<Live, "saves" | "deck" | "actions">,
	ticker: string,
	opts: { showcase: boolean; collection?: string | null; priceOf?: (ticker: string) => number | null },
): Promise<void> {
	const plan = removalPlan(
		ticker,
		live.saves.map((s) => s.ticker),
		opts,
	);
	const writes = [...plan.save.map((t) => live.actions.save(t, opts.priceOf?.(t) ?? null)), ...plan.unsave.map((t) => live.actions.unsave(t))];
	await Promise.all(writes);
	// as useDeck().unsave does once the save is gone
	if (live.deck?.saved.some((x) => plan.unsave.includes(x))) {
		live.actions.setDeck((prev) => (prev ? { ...prev, saved: prev.saved.filter((x) => !plan.unsave.includes(x)) } : prev));
	}
}

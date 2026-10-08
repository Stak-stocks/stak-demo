// The Android stock page's own rules (StockDetailScreen / StockDetailViewModel / StockLessons), as plain functions.
import { getLastCloseRef } from "@/lib/utils";
import { sessionWord } from "@/components/discover/discoverTheme";
import type { ChartRange } from "@/lib/api";

const PERIOD: Record<ChartRange, string> = { "1d": "today", "1w": "past week", "1m": "past month", "3m": "past 3 months", ytd: "year to date", "1y": "past year" };

/** "▲ 1.2% past month". On 1D the suffix follows the session ("today", or "on Wednesday" before the open and at weekends). */
export function rangeChangeText(pct: number, range: ChartRange, now = new Date()): string {
	const arrow = pct >= 0 ? "▲" : "▼";
	const suffix = range === "1d" ? sessionWord(now) : PERIOD[range];
	return `${arrow} ${Math.abs(pct).toFixed(1)}% ${suffix}`;
}

/** "As of 2:31 PM" while the market is open; otherwise which close the price is from. */
export function pricesAsOf(now = new Date()): string {
	switch (getLastCloseRef()) {
		case "today": return `As of ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
		case "close": return "At today's close";
		case "yesterday": return "At yesterday's close";
		default: return "At Friday's close";
	}
}

/** The news-signal line: "▲ +1.2% today" (only the up case carries a plus). */
export function newsCloseLine(pct: number): string {
	const session = getLastCloseRef();
	const suffix = session === "today" ? "today" : session === "close" ? "at today's close" : session === "yesterday" ? "at yesterday's close" : "at Friday's close";
	return `${pct >= 0 ? `▲ +${pct.toFixed(1)}%` : `▼ ${Math.abs(pct).toFixed(1)}%`} ${suffix}`;
}

/** Revenue growth and margin read green when they beat the peer median by more than 10% of it (at least 1 point). */
export function beatsPeers(value: number | null, median: number | null): boolean {
	if (value == null || median == null) return false;
	return value - median > Math.max(Math.abs(median) * 0.1, 1);
}

export const parsePct = (s: string | null | undefined): number | null => {
	if (!s) return null;
	const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
	return Number.isFinite(n) ? n : null;
};

const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;

export interface SinceSaved {
	value: string;
	tone: "up" | "down" | "muted";
	body: string;
}

/** Android's sinceSavedFor: what a stock has done since it was saved, said plainly, including when there's nothing to say. */
export function sinceSavedFor(opts: { symbol: string; savedAt: number | null; priceAtSave: number | null; price: number | null; loading: boolean; now?: Date }): SinceSaved {
	const { symbol, savedAt, priceAtSave, price, loading } = opts;
	const now = opts.now ?? new Date();
	const days = savedAt == null ? null : Math.max(0, dayNumber(now) - dayNumber(new Date(savedAt)));
	if (days === null || days === 0) {
		return { value: "+0.0%", tone: "muted", body: `${days === 0 ? "Saved today." : "Saved recently."} ${symbol} hasn't moved since you saved it - check back after a few sessions.` };
	}
	const when = days === 1 ? "yesterday" : `${days} days ago`;
	if (loading) return { value: "—", tone: "muted", body: `Saved ${when}.` };
	if (price == null) return { value: "—", tone: "muted", body: `Saved ${when}. Today's price isn't available right now, so there's no move to show.` };
	if (priceAtSave == null || priceAtSave <= 0) return { value: "—", tone: "muted", body: `Saved ${when}. STAK has no record of what ${symbol} cost then, so there's no move to measure yet.` };
	const pct = ((price - priceAtSave) / priceAtSave) * 100;
	const up = pct >= 0;
	return {
		value: `${up ? "+" : "-"}${Math.abs(pct).toFixed(1)}%`,
		tone: up ? "up" : "down",
		body: `Saved ${when}. ${symbol} is ${up ? "up" : "down"} ${Math.abs(pct).toFixed(1)}% since you saved it.`,
	};
}

export interface Lesson { title: string; summary: string; body: string[] }

const LESSONS: Record<string, Lesson> = {
	aitech: {
		title: "Why chip stocks swing so hard",
		summary: "Demand for AI hardware comes in waves, and prices ride every wave up and down.",
		body: [
			"Chipmakers sell into cycles: when data centers and phone makers stock up, orders surge; when they have enough, orders stall. The stock price tends to run ahead of both turns.",
			"That is why a great company can still be a bumpy stock. Nothing changed about the business - the market changed its guess about the next order book.",
			"What to do with it: size a chip position so a 20% drop is uncomfortable, not ruinous, and judge the company on multi-year demand rather than one quarter.",
		],
	},
	finance: {
		title: "How interest rates move bank profits",
		summary: "Banks earn the gap between what they pay savers and what they charge borrowers.",
		body: [
			"When rates rise, banks can charge more on loans faster than they raise what they pay on deposits - the gap, called net interest margin, widens and profits follow.",
			"When rates fall, the gap narrows, but cheaper credit means more people borrow, so volume can make up for margin. Payment networks like Visa care less about rates and more about how much people spend.",
			"What to do with it: read a bank's results for margin and loan growth together, and expect the stock to react to central-bank news before the earnings even land.",
		],
	},
	green: {
		title: "Policy is the weather for clean energy",
		summary: "Subsidies, tariffs and rate changes matter as much as sunshine for solar and grid stocks.",
		body: [
			"Clean-energy projects are financed over decades, so their value depends on the cost of borrowing and on how long tax credits last. A policy shift can reprice a whole sector in a day.",
			"Utilities that own the grid are the steadier end: regulated returns and slow, predictable growth. Equipment makers like solar-inverter companies are the fast, swingy end.",
			"What to do with it: know which end of the sector a stock sits on, and treat policy headlines as part of the fundamentals, not noise.",
		],
	},
	realestate: {
		title: "REITs: rent cheques as a stock",
		summary: "A real-estate trust passes most of its rent to shareholders, so it behaves like a bond with a growth kicker.",
		body: [
			"REITs must pay out most of their income as dividends, which is why their yields look high. The trade-off: they raise money by borrowing, so higher rates squeeze them twice - dearer debt and more competition from bonds.",
			"Warehouses, data centers and shops behave differently. Logistics rents track online shopping; retail rents track footfall; both track the economy.",
			"What to do with it: judge a REIT by occupancy, lease length and debt cost, and expect the price to move opposite to interest-rate news.",
		],
	},
	health: {
		title: "Patents, pipelines and patience",
		summary: "A drug company's future is its pipeline; its present is how long its best sellers stay protected.",
		body: [
			"A blockbuster drug earns for as long as its patent holds, then generic copies arrive and revenue falls off a cliff. Investors watch the cliff dates as closely as the sales.",
			"The pipeline - drugs in trials - is the replacement. Trial results are binary: a pass can add billions overnight, a fail can erase them. Insurers and hospital groups are the calmer end of healthcare.",
			"What to do with it: for drug makers, know the patent calendar and the next trial readout; for the rest, follow enrollment and pricing, not headlines.",
		],
	},
	consumer: {
		title: "Brands, margins and the shopper's mood",
		summary: "Consumer companies live on repeat purchases, so watch what people keep buying when money is tight.",
		body: [
			"A strong brand lets a company raise prices without losing customers - that pricing power shows up as a steady profit margin through inflation.",
			"Membership models like a warehouse club earn from fees before they sell a thing, which smooths the ride. Fashion and sportswear ride the mood: hot one season, discounted the next.",
			"What to do with it: track same-store sales and margins, and remember that a beloved brand can still be an expensive stock.",
		],
	},
};

const DEFAULT_LESSON: Lesson = {
	title: "What actually moves a stock price",
	summary: "Prices move on the gap between what the market expected and what it gets.",
	body: [
		"A company can report record profits and the stock can still fall - because the market had priced in even better. Expectations, not results, set the direction on the day.",
		"Over years, though, price follows earnings and cash. The daily noise is investors updating their guesses; the long trend is the business doing its work.",
		"What to do with it: decide whether you are trading the guesses or owning the business, and size the position for the one you chose.",
	],
};

const COLLECTION_TICKERS: Record<string, string[]> = {
	aitech: ["NVDA", "AAPL", "MSFT", "GOOGL", "AMD"], finance: ["JPM", "V", "GS"], green: ["ENPH", "NEE", "FSLR"],
	realestate: ["PLD", "O"], health: ["LLY", "UNH", "JNJ", "PFE"], consumer: ["COST", "NKE"],
};

/** One lesson per collection the stock sits in, and a general one for anything else. */
export function lessonFor(ticker: string): Lesson {
	const id = Object.entries(COLLECTION_TICKERS).find(([, list]) => list.includes(ticker.toUpperCase()))?.[0];
	return (id && LESSONS[id]) || DEFAULT_LESSON;
}

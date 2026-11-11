/**
 * My STAK derivations: the saves grouped into the six collections, today's average move per
 * group and overall, the best and worst movers.
 * Everything here is computed from `live.saves` + quotes; nothing is authored.
 * The allocation rows and the "Your read" insight moved to src/app/mystak (allocation.ts allocationFor, insight.ts
 * readFor) with the My STAK build of 2026-11-07; the derivations here had no reader left and were removed (coordinator
 * note N2, FOUNDATION fix round 1).
 */
import { useMemo } from "react";
import { COLLECTION_NAMES, COLLECTION_ORDER, type CollectionSlug, collectionOf, normalizeTicker } from "./catalog";
import { round2 } from "./format";
import { type Quote, useQuotes } from "./quotes";
import { useLive } from "./store";

export const ALL_COLLECTIONS: readonly CollectionSlug[] = [...COLLECTION_ORDER, "other"];

/** Bar colours of the allocation rows (the frame's four, plus two for the collections it never had to draw). */
export const COLLECTION_COLORS: Record<CollectionSlug, string> = {
	"ai-tech": "#69b3ca",
	finance: "#7ab3f0",
	"green-energy": "#2fd08a",
	"real-estate": "#9e8ce5",
	healthcare: "#e5a0c8",
	consumer: "#f0c36a",
	other: "#5c6b85",
};

export const countLabel = (n: number) => `${n} ${n === 1 ? "stock" : "stocks"}`;

export type CollectionGroup = {
	slug: CollectionSlug;
	name: string;
	tickers: string[];
	count: number;
	countLabel: string;
	/** equal-weight average of today's change across the group, null without quotes */
	avgChange: number | null;
};

export type AllocationRow = {
	key: string;
	name: string;
	count: number;
	/** percent of all saves, rounded */
	share: number;
	/** bar width in px: the largest row is 132 */
	width: number;
	color: string;
	slug: CollectionSlug;
};

export type Mover = { ticker: string; changePercent: number };

export function groupByCollection(tickers: readonly string[]): Record<CollectionSlug, string[]> {
	const groups = Object.fromEntries(ALL_COLLECTIONS.map((s) => [s, [] as string[]])) as Record<CollectionSlug, string[]>;
	for (const t of tickers) groups[collectionOf(t)].push(normalizeTicker(t));
	return groups;
}

export function averageChange(tickers: readonly string[], quotes: Record<string, Quote>): number | null {
	const changes = tickers.map((t) => quotes[normalizeTicker(t)]?.changePercent).filter((n): n is number => typeof n === "number");
	if (changes.length === 0) return null;
	return round2(changes.reduce((a, b) => a + b, 0) / changes.length);
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
/** "six", "fourteen" (src/app/mystak/insight.ts reads it for the "Your read" sentences) */
export const numberWord = (n: number) => WORDS[n] ?? String(n);

export function useCollections() {
	const live = useLive();
	const tickers = useMemo(() => live.saves.map((s) => normalizeTicker(s.ticker)), [live.saves]);
	const quotes = useQuotes(tickers);
	return useMemo(() => {
		const groups = groupByCollection(tickers);
		const all: CollectionGroup[] = ALL_COLLECTIONS.map((slug) => ({
			slug,
			name: COLLECTION_NAMES[slug],
			tickers: groups[slug],
			count: groups[slug].length,
			countLabel: countLabel(groups[slug].length),
			avgChange: averageChange(groups[slug], quotes),
		}));
		const movers: Mover[] = tickers
			.map((t) => ({ ticker: t, changePercent: quotes[t]?.changePercent }))
			.filter((m): m is Mover => typeof m.changePercent === "number")
			.sort((a, b) => b.changePercent - a.changePercent);
		return {
			total: tickers.length,
			tickers,
			quotes,
			groups,
			all,
			byPath: (slug: string) => all.find((g) => g.slug === slug),
			avgChange: averageChange(tickers, quotes),
			best: movers[0] ?? null,
			worst: movers.length > 0 ? movers[movers.length - 1]! : null,
		};
	}, [tickers, quotes]);
}

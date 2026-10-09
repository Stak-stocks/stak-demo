/**
 * My STAK derivations: the saves grouped into the six collections, today's average move per
 * group and overall, the best and worst movers, the allocation rows and the "Your read" insight.
 * Everything here is computed from `live.saves` + quotes; nothing is authored.
 */
import { useMemo } from "react";
import { ALLOCATION_NAMES, COLLECTION_NAMES, COLLECTION_ORDER, type CollectionSlug, collectionOf, normalizeTicker } from "./catalog";
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
export const numberWord = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const LEAN_TITLE: Record<CollectionSlug, string> = {
	"ai-tech": "You lean into growth and tech.",
	finance: "You lean into finance.",
	"green-energy": "You lean into clean energy.",
	"real-estate": "You lean into property.",
	healthcare: "You lean into healthcare.",
	consumer: "You lean into brands you know.",
	other: "You lean off the beaten path.",
};
const LEAN_PHRASE: Record<CollectionSlug, string> = {
	"ai-tech": "tech or AI names",
	finance: "financial names",
	"green-energy": "clean-energy names",
	"real-estate": "property names",
	healthcare: "healthcare names",
	consumer: "consumer brands",
	other: "names outside the main sectors",
};
const SKEW: Record<CollectionSlug, string> = {
	"ai-tech": "high-growth",
	finance: "steady",
	"green-energy": "toward clean energy",
	"real-estate": "toward income",
	healthcare: "defensive",
	consumer: "toward everyday brands",
	other: "eclectic",
};
const HEDGE: Record<CollectionSlug, string> = {
	"ai-tech": "tech",
	finance: "finance",
	"green-energy": "clean energy",
	"real-estate": "real estate",
	healthcare: "healthcare",
	consumer: "consumer brands",
	other: "other sectors",
};

/** "Six of your fourteen picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate." */
export function insightFor(groups: Record<CollectionSlug, string[]>, total: number): { title: string; body: string } | null {
	if (total === 0) return null;
	const nonEmpty = ALL_COLLECTIONS.filter((s) => groups[s].length > 0);
	const top = [...nonEmpty].sort((a, b) => groups[b].length - groups[a].length)[0]!;
	const smallest = [...nonEmpty].filter((s) => s !== top).sort((a, b) => groups[a].length - groups[b].length)[0];
	const lead = `${capital(numberWord(groups[top].length))} of your ${numberWord(total)} ${total === 1 ? "pick is" : "picks are"} ${LEAN_PHRASE[top]}.`;
	const hedge = smallest ? `, with a small hedge in ${HEDGE[smallest]}.` : ".";
	return { title: LEAN_TITLE[top], body: `${lead} Your STAK skews ${SKEW[top]}${hedge}` };
}

/** Top four collections by count, then everything else as "Other". Widths scale to the largest row (132 px). */
export function allocationRows(groups: Record<CollectionSlug, string[]>, total: number): AllocationRow[] {
	if (total === 0) return [];
	const ranked = COLLECTION_ORDER.filter((s) => groups[s].length > 0).sort((a, b) => groups[b].length - groups[a].length);
	const top = ranked.slice(0, 4);
	const rest = [...ranked.slice(4), "other" as const].reduce((n, s) => n + groups[s].length, 0);
	const rows = top.map((s) => ({ slug: s, key: s, name: ALLOCATION_NAMES[s], count: groups[s].length, color: COLLECTION_COLORS[s] }));
	if (rest > 0) rows.push({ slug: "other", key: "other", name: ALLOCATION_NAMES.other, count: rest, color: COLLECTION_COLORS.other });
	const max = Math.max(...rows.map((r) => r.count));
	return rows.map((r) => ({ ...r, share: Math.round((r.count / total) * 100), width: Math.round((132 * r.count) / max) }));
}

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
			/** the six collection cards, without empty ones and without "Other" */
			visible: all.filter((g) => g.count > 0 && g.slug !== "other"),
			byPath: (slug: string) => all.find((g) => g.slug === slug),
			avgChange: averageChange(tickers, quotes),
			best: movers[0] ?? null,
			worst: movers.length > 0 ? movers[movers.length - 1]! : null,
			allocation: allocationRows(groups, tickers.length),
			insight: insightFor(groups, tickers.length),
		};
	}, [tickers, quotes]);
}

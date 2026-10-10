/** My STAK copy (06 My STAK frames) — the authored strings that are not derived from the account. */
import type { CollectionSlug } from "@/app/live/catalog";
import type { AllocationRow } from "@/app/live/collections";
import { MS } from "./assets";

/** Raster covers are 52.748px, category glyphs 55.851px (the frame's two sizes). */
export const COLLECTION_ICONS: Record<CollectionSlug, { icon: string; iconSize: 52.748 | 55.851 }> = {
	"ai-tech": { icon: MS.collections.aiTech, iconSize: 52.748 },
	finance: { icon: MS.collections.finance, iconSize: 52.748 },
	"green-energy": { icon: MS.collections.greenEnergy, iconSize: 55.851 },
	"real-estate": { icon: MS.collections.realEstate, iconSize: 55.851 },
	healthcare: { icon: MS.collections.healthcare, iconSize: 55.851 },
	consumer: { icon: MS.collections.consumer, iconSize: 55.851 },
	other: { icon: MS.sparkle, iconSize: 55.851 },
};

/** Allocation dots: the frame's five glyphs; the two collections it never drew get a plain circle. */
export const ALLOCATION_DOTS: Partial<Record<CollectionSlug, string>> = {
	"ai-tech": MS.dots.tech,
	finance: MS.dots.finance,
	"green-energy": MS.dots.green,
	"real-estate": MS.dots.realEstate,
	other: MS.dots.other,
};

export const OVERVIEW = {
	title: "My STAK",
	subtitle: "Your living watchlist and learning hub",
	collections: "Collections",
	breakdown: "Breakdown",
	allocation: "Allocation",
	addMore: "Add more",
} as const;

export const PERFORMANCE = {
	eyebrow: "Performance today",
	across: (n: number) => `Across ${n} ${n === 1 ? "stock" : "stocks"}`,
	period: "3M",
	ranges: ["1D", "1W", "1M", "3M", "YTD", "1Y"] as const,
	activeRange: "3M",
	bestLabel: "Best today",
	worstLabel: "Worst",
} as const;

export const INSIGHT_HEADING = "Your read";

export const DISCOVER_CTA = {
	eyebrow: "DISCOVER",
	title: "More like your STAK",
	body: (remaining: number) =>
		remaining <= 0
			? "Today’s deck is done. Fresh picks land tomorrow."
			: `Based on your taste, ${remaining} fresh ${remaining === 1 ? "pick is" : "picks are"} waiting in the deck.`,
	cta: "Start swiping",
} as const;

export const EMPTY = {
	title: "Nothing saved yet",
	body: "Save a company from today’s deck and it lands here, sorted into a collection for you. Your STAK builds itself from what you keep.",
	cta: "Go to today’s deck",
	caption: (remaining: number) =>
		remaining <= 0 ? "Today’s deck is done. Fresh picks land tomorrow." : `${remaining} ${remaining === 1 ? "company is" : "companies are"} waiting in today’s deck`,
} as const;

export const COLLECTION_PAGE = {
	crumb: (name: string) => `My STAK  /  Collections  /  ${name}`,
	addStock: "Add stock",
} as const;

/**
 * The frames' own figures for the untouched demo persona (live/showcase.ts): 2:4667 My STAK overview and
 * 2:4830 the AI & Tech collection, verbatim, even where they disagree with each other (the cards count 19
 * saves, the allocation and "Your read" count fourteen or fifteen).
 */
export const SHOWCASE = {
	performance: {
		eyebrow: "Performance this week",
		value: "+4.9%",
		across: "Across 14 stocks",
		best: { label: "Best this week", ticker: "TSLA", change: "+3.4%" },
		worst: { label: "Worst", ticker: "SNOW", change: "-0.5%" },
	},
	/** bar widths are the frame's: 132px for the largest share, the rest by their rounded percentage */
	allocation: [
		{ key: "ai-tech", slug: "ai-tech", name: "Tech & AI", count: 6, share: 42, width: 132, color: "#69b3ca" },
		{ key: "finance", slug: "finance", name: "Finance", count: 3, share: 21, width: 66, color: "#7ab3f0" },
		{ key: "green-energy", slug: "green-energy", name: "Green Energy", count: 3, share: 20, width: 63, color: "#2fd08a" },
		{ key: "real-estate", slug: "real-estate", name: "Real Estate", count: 2, share: 12, width: 38, color: "#9e8ce6" },
		{ key: "other", slug: "other", name: "Other", count: 1, share: 5, width: 16, color: "#5c6b85" },
	] as AllocationRow[],
	insight: {
		title: "You lean into growth and tech.",
		body: "Six of your fourteen picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate.",
	},
	discoverBody: "Based on your taste, 8 fresh picks are waiting in the deck.",
	collections: {
		"ai-tech": {
			meta: "+2.4% this week",
			stocks: [
				{ ticker: "NVDA", name: "NVIDIA" },
				{ ticker: "AAPL", name: "Apple" },
				{ ticker: "MSFT", name: "Microsoft" },
				{ ticker: "GOOGL", name: "Alphabet" },
				{ ticker: "AMD", name: "Adv Micro" },
			],
		},
	} as Partial<Record<CollectionSlug, { meta: string; stocks: { ticker: string; name: string }[] }>>,
};

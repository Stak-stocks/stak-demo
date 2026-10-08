/** My STAK demo content, verbatim from the Figma desktop frames (06 My STAK). */
import { MS } from "./assets";

export type Collection = {
	slug: string;
	name: string;
	count: string;
	/** Raster covers are 52.748px, category glyphs 55.851px (the frame's two sizes). */
	icon: string;
	iconSize: 52.748 | 55.851;
};

export const COLLECTIONS: Collection[] = [
	{ slug: "ai-tech", name: "AI & Tech", count: "5 stocks", icon: MS.collections.aiTech, iconSize: 52.748 },
	{ slug: "finance", name: "Finance", count: "3 stocks", icon: MS.collections.finance, iconSize: 52.748 },
	{ slug: "green-energy", name: "Green Energy", count: "3 stocks", icon: MS.collections.greenEnergy, iconSize: 55.851 },
	{ slug: "real-estate", name: "Real Estate", count: "2 stocks", icon: MS.collections.realEstate, iconSize: 55.851 },
	{ slug: "healthcare", name: "Healthcare", count: "4 stocks", icon: MS.collections.healthcare, iconSize: 55.851 },
	{ slug: "consumer", name: "Consumer", count: "2 stocks", icon: MS.collections.consumer, iconSize: 55.851 },
];

export const PERFORMANCE = {
	eyebrow: "Performance this week ",
	value: "+4.9%",
	across: "Across 14 stocks",
	period: "3M",
	ranges: ["1D", "1W", "1M", "3M", "YTD", "1Y"] as const,
	activeRange: "3M",
	best: { label: "Best this week", ticker: "TSLA", change: "+3.4%" },
	worst: { label: "Worst", ticker: "SNOW", change: "-0.5%" },
} as const;

export const INSIGHT = {
	heading: "Your read",
	title: "You lean into growth and tech.",
	body: "Six of your fourteen picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate.",
} as const;

export const ALLOCATION = [
	{ name: "Tech & AI", share: "42% · 6 stocks", width: 132, color: "#69b3ca", dot: MS.dots.tech },
	{ name: "Finance", share: "21% · 3 stocks", width: 66, color: "#7ab3f0", dot: MS.dots.finance },
	{ name: "Green Energy", share: "20% · 3 stocks", width: 63, color: "#2fd08a", dot: MS.dots.green },
	{ name: "Real Estate", share: "12% · 2 stocks", width: 38, color: "#9e8ce5", dot: MS.dots.realEstate },
	{ name: "Other", share: "5% · 1 stock", width: 16, color: "#5c6b85", dot: MS.dots.other },
] as const;

export const DISCOVER_CTA = {
	eyebrow: "DISCOVER",
	title: "More like your STAK",
	body: "Based on your taste, 8 fresh picks are waiting in the deck.",
	cta: "Start swiping",
} as const;

export type CollectionStock = {
	symbol: string;
	name: string;
	initial: string;
	change: string;
	up: boolean;
	price: string;
	/** The first card's price is Sora SemiBold in the frame, the others Sora Medium. */
	priceWeight: "semibold" | "medium";
};

/** "Desktop · Collection · AI & Tech" (2:4830). */
export const AI_TECH_COLLECTION = {
	slug: "ai-tech",
	name: "AI & Tech",
	count: "5 stocks",
	change: "+2.4% this week",
	description: "Your highest-conviction growth and AI names.",
	icon: MS.collections.aiTech,
	stocks: [
		{ symbol: "NVDA", name: "NVIDIA", initial: "N", change: "▲ 2.4%", up: true, price: "$122.10", priceWeight: "semibold" },
		{ symbol: "AAPL", name: "Apple", initial: "A", change: "▲ 1.2%", up: true, price: "$229.35", priceWeight: "medium" },
		{ symbol: "MSFT", name: "Microsoft", initial: "M", change: "▼ 0.4%", up: false, price: "$438.20", priceWeight: "medium" },
		{ symbol: "GOOGL", name: "Alphabet", initial: "G", change: "▲ 0.8%", up: true, price: "$178.90", priceWeight: "medium" },
		{ symbol: "AMD", name: "Adv Micro", initial: "A", change: "▲ 2.1%", up: true, price: "$164.30", priceWeight: "medium" },
	] satisfies CollectionStock[],
} as const;

export function findCollection(slug: string) {
	return COLLECTIONS.find((c) => c.slug === slug);
}

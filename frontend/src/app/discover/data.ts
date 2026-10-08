/** Discover deck copy (Figma 2:2944 / 2:3089 / 2:3422), verbatim. */
export type DeckArt = "nvda" | "aapl" | "googl";

export type DeckCardData = {
	symbol: string;
	ticker: string;
	headline: string;
	price: string;
	change: string;
	tip: string;
	art: DeckArt;
};

export const deckHeader = { title: "Discover", kicker: "TODAY · AI & CHIPS", total: 12 } as const;

export const deckCards: DeckCardData[] = [
	{
		symbol: "AAPL",
		ticker: "AAPL · Apple Inc",
		headline: "Two billion devices, and every one of them keeps paying Apple.",
		price: "$229.35",
		change: "▲ 1.2% today",
		tip: "Steady giants move slower. Stable stocks often do.",
		art: "aapl",
	},
	{
		symbol: "NVDA",
		ticker: "NVDA · NVIDIA Corp",
		headline: "Chip demand is outrunning supply, and NVIDIA sets the prices.",
		price: "$122.10",
		change: "▲ 2.4% today",
		tip: "Chip stocks swing hard. Small stakes, long views.",
		art: "nvda",
	},
	{
		symbol: "GOOGL",
		ticker: "GOOGL · Alphabet Inc",
		headline: "Search pays for everything, and nine billion-user products ride behind it.",
		price: "$178.90",
		change: "▲ 0.8% today",
		tip: "Ad money moves with the economy, so some quarters just drift.",
		art: "googl",
	},
];

export const deckCopy = {
	save: "Save",
	saved: "Saved",
	toast: "Saved to My STAK",
	practiceBuy: "Practice buy",
	learnMore: "Learn more",
} as const;

export const endOfDeck = {
	ring: "12/12",
	title: "Deck complete",
	body: "Twelve cards, twelve signals. Your taste graph got smarter.",
	receipt: [
		{ label: "Seen", value: "12" },
		{ label: "Saved", value: "7" },
		{ label: "Bought", value: "2" },
	],
	primary: "Practice buy your saves",
	secondary: "Review saves in My STAK",
	again: "Swipe today’s deck again",
	crumb: "Discover  /  Deck complete",
} as const;

/** Onboarding copy and demo data, verbatim from the Figma desktop frames (01 Onboarding & Auth). */
import { OB } from "./assets";

export type BrandPick = { id: string; name: string; logo: string; logoSize: number; logoRadius?: number; logoHeight?: number };

/** Step 02 · Brand picks (2:5752). Row-major grid order; the frame shows five picked. */
export const BRANDS: BrandPick[] = [
	{ id: "apple", name: "Apple", logo: OB.brands.apple, logoSize: 16.941, logoRadius: 2.824 },
	{ id: "tesla", name: "Tesla", logo: OB.brands.tesla, logoSize: 16.941, logoRadius: 2.824 },
	{ id: "nike", name: "Nike", logo: OB.brands.nike, logoSize: 16.941 },
	{ id: "spotify", name: "Spotify", logo: OB.brands.spotify, logoSize: 15.529 },
	{ id: "netflix", name: "Netflix", logo: OB.brands.netflix, logoSize: 15.529, logoRadius: 2.118 },
	{ id: "amazon", name: "Amazon", logo: OB.brands.amazon, logoSize: 15.529 },
	{ id: "disney", name: "Disney", logo: OB.brands.disney, logoSize: 15.529, logoRadius: 2.118 },
	{ id: "microsoft", name: "Microsoft", logo: OB.brands.microsoft, logoSize: 15.529, logoRadius: 2.118 },
	{ id: "nvidia", name: "NVIDIA", logo: OB.brands.nvidia, logoSize: 16.941, logoRadius: 2.824 },
	{ id: "playstation", name: "PlayStation", logo: OB.brands.playstation, logoSize: 16.941, logoRadius: 2.824 },
	{ id: "coinbase", name: "Coinbase", logo: OB.brands.coinbase, logoSize: 15.529 },
	{ id: "uber", name: "Uber", logo: OB.brands.uber, logoSize: 15.529, logoHeight: 5.355 },
];
export const DEFAULT_BRAND_PICKS = ["apple", "tesla", "spotify", "nvidia", "uber"];

/** Step 03 · Swipe tutorial (2:5865) deck. */
export type TutorialCard = {
	id: "googl" | "aapl" | "nvda";
	ticker: string;
	blurb: string;
	price: string;
	change: string;
	tip: string;
};
export const TUTORIAL_CARDS: TutorialCard[] = [
	{
		id: "nvda",
		ticker: "NVDA · NVIDIA Corp",
		blurb: "Chip demand is outrunning supply, and NVIDIA sets the prices.",
		price: "$122.10",
		change: "▲ 2.4% today",
		tip: "Chip stocks swing hard. Small stakes, long views.",
	},
	{
		id: "aapl",
		ticker: "AAPL · Apple Inc",
		blurb: "Two billion devices, and every one of them keeps paying Apple.",
		price: "$229.35",
		change: "▲ 1.2% today",
		tip: "Steady giants move slower. Stable stocks often do.",
	},
	{
		id: "googl",
		ticker: "GOOGL · Alphabet Inc",
		blurb: "Search pays for everything, and nine billion-user products ride behind it.",
		price: "$178.90",
		change: "▲ 0.8% today",
		tip: "Ad money moves with the economy, so some quarters just drift.",
	},
];

export type MatrixOption = { id: string; title: string; subtitle: string };

/** Step 04 · Goal matrix (2:6023); the frame shows "Find my first stocks" selected. */
export const GOALS: MatrixOption[] = [
	{ id: "learn", title: "Learn how investing works", subtitle: "Start from the basics, no shame" },
	{ id: "grow", title: "Grow my money long-term", subtitle: "Slow and steady wealth" },
	{ id: "first", title: "Find my first stocks", subtitle: "I want to understand what to watch" },
	{ id: "explore", title: "Just exploring", subtitle: "Curious, no plan yet" },
];
export const DEFAULT_GOAL = "first";

/** Step 05 · Risk matrix (2:6095); the frame shows "Sell some, reduce risk" selected. */
export const RISKS: MatrixOption[] = [
	{ id: "buy", title: "Buy more after checking why", subtitle: "Comfortable with dips if the story holds" },
	{ id: "hold", title: "Hold and watch it closely", subtitle: "I can handle short-term drops" },
	{ id: "step", title: "Step away for now", subtitle: "Big drops make me uncomfortable" },
	{ id: "sell", title: "Sell some, reduce risk", subtitle: "I’d rather protect part of my money" },
];
export const DEFAULT_RISK = "sell";

/** Step 07 · Taste reveal (2:6202). Bar widths are the frame's (track 592). */
export const TASTE_BARS = [
	{ label: "Tech curious", level: "Strong", width: 503 },
	{ label: "Growth seeking", level: "Strong", width: 503 },
	{ label: "Consumer brands", level: "Medium", width: 326 },
	{ label: "Income & dividends", level: "Light", width: 178 },
] as const;
export const RISK_STYLE = "Growth-Oriented";

/** Step 08 · Profile setup (2:6271). */
export const PROFILE_DEFAULT_NAME = "Nedu";
export const PROFILE_NAME_MAX = 20;

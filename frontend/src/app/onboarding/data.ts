/** Onboarding copy and demo data, verbatim from the Figma desktop frames (01 Onboarding & Auth). */
import { OB } from "./assets";

/**
 * A brand tile's logo layer inside the 24px white "B" badge: `box` is the layer's x / y / w / h in the badge (read with
 * the Plugin API, 2026-10-18). An image layer (`radius`) FITs into its rounded rectangle; a vector frame or group is its
 * own export. Coinbase and Uber are imported-SVG "Clip path group"s (2:5838, 2:5849) whose clip layers (2:5839, 2:5850)
 * are plain rectangles as large as the group: they clip nothing, so the group's export is drawn at the group's box (a
 * CSS mask of that rectangle anti-aliased the logos' outer edges a second time: Coinbase sat 6.3 levels from Figma's
 * render that way, the mask exports stay on disk unused).
 */
export type BrandLogo = {
	src: string;
	box: readonly [x: number, y: number, w: number, h: number];
	radius?: number;
};

/** `nameW`: Figma's auto-width box of the name (whole pixels); the tile centres badge + 10 + name on it. */
export type BrandPick = { id: string; name: string; nameW: number; logo: BrandLogo };

/** The two logo boxes of the grid: 16.941177 at 3.529412 (2:5784 …) and 15.529411 at 4.235294 (2:5801 …). */
const BIG = [3.529412, 3.529412, 16.941177, 16.941177] as const;
const SMALL = [4.235294, 4.235294, 15.529411, 15.529411] as const;
/** The image rectangles' corners: 2.823529 on the 16.94 boxes, 2.117647 on the 15.53 ones. */
const img = (src: string, box: typeof BIG | typeof SMALL): BrandLogo => ({ src, box, radius: box === BIG ? 2.823529 : 2.117647 });
const vec = (src: string, box: typeof BIG | typeof SMALL): BrandLogo => ({ src, box });

/** Step 02 · Brand picks (2:5752). Row-major grid order; the frame shows five picked. */
export const BRANDS: BrandPick[] = [
	{ id: "apple", name: "Apple", nameW: 39, logo: img(OB.brands.apple, BIG) },
	{ id: "tesla", name: "Tesla", nameW: 35, logo: img(OB.brands.tesla, BIG) },
	{ id: "nike", name: "Nike", nameW: 30, logo: vec(OB.brands.nike, BIG) },
	{ id: "spotify", name: "Spotify", nameW: 48, logo: vec(OB.brands.spotify, SMALL) },
	{ id: "netflix", name: "Netflix", nameW: 45, logo: img(OB.brands.netflix, SMALL) },
	{ id: "amazon", name: "Amazon", nameW: 54, logo: vec(OB.brands.amazon, SMALL) },
	{ id: "disney", name: "Disney", nameW: 45, logo: img(OB.brands.disney, SMALL) },
	{ id: "microsoft", name: "Microsoft", nameW: 63, logo: img(OB.brands.microsoft, SMALL) },
	{ id: "nvidia", name: "NVIDIA", nameW: 47, logo: img(OB.brands.nvidia, BIG) },
	{ id: "playstation", name: "PlayStation", nameW: 76, logo: img(OB.brands.playstation, BIG) },
	// "Frame" 2:5837 > "Clip path group" 2:5838 > "Group" 2:5841, all 15.529411 at 4.235294 / 4.235294
	{ id: "coinbase", name: "Coinbase", nameW: 62, logo: { src: OB.brands.coinbase, box: SMALL } },
	// "Frame" 2:5848 at 4.235294 / 9.322438 > "Clip path group" 2:5849 > "Group" 2:5852, 15.425083 x 5.35497 at its left edge
	{ id: "uber", name: "Uber", nameW: 32, logo: { src: OB.brands.uber, box: [4.235294, 9.322438, 15.425083, 5.35497] } },
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
	/**
	 * The stock's coin at the front card's scale (212.2201-wide art frame): its centre, and Figma's rotation as CSS
	 * degrees. NVDA (2:5994) and AAPL (2:5954) sit upright on one centre; the GOOGL coin (2:5915) is the 3 google 1
	 * image turned 49.532° counter-clockwise, as Figma draws it everywhere (hero 2:5732 too).
	 */
	coin: { src: string; cx: number; cy: number; rotate: number };
};
export const TUTORIAL_CARDS: TutorialCard[] = [
	{
		id: "nvda",
		ticker: "NVDA · NVIDIA Corp",
		blurb: "Chip demand is outrunning supply, and NVIDIA sets the prices.",
		price: "$122.10",
		change: "▲ 2.4% today",
		tip: "Chip stocks swing hard. Small stakes, long views.",
		coin: { src: OB.swipe.coin.nvda, cx: 105.5796, cy: 92.0661, rotate: 0 },
	},
	{
		id: "aapl",
		ticker: "AAPL · Apple Inc",
		blurb: "Two billion devices, and every one of them keeps paying Apple.",
		price: "$229.35",
		change: "▲ 1.2% today",
		tip: "Steady giants move slower. Stable stocks often do.",
		coin: { src: OB.swipe.coin.aapl, cx: 105.5792, cy: 92.0662, rotate: 0 },
	},
	{
		id: "googl",
		ticker: "GOOGL · Alphabet Inc",
		blurb: "Search pays for everything, and nine billion-user products ride behind it.",
		price: "$178.90",
		change: "▲ 0.8% today",
		tip: "Ad money moves with the economy, so some quarters just drift.",
		coin: { src: OB.swipe.coin.googl, cx: 106.0877, cy: 90.7242, rotate: -49.532 },
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

/** Step 07 · Taste reveal (2:6202). Bar widths are the frame's (track 592); `levelW`: Figma's box of the level label. */
export const TASTE_BARS = [
	{ label: "Tech curious", level: "Strong", levelW: 34, width: 503 },
	{ label: "Growth seeking", level: "Strong", levelW: 34, width: 503 },
	{ label: "Consumer brands", level: "Medium", levelW: 41, width: 326 },
	{ label: "Income & dividends", level: "Light", levelW: 26, width: 178 },
] as const;
export const RISK_STYLE = "Growth-Oriented";

/** Step 08 · Profile setup (2:6271). */
export const PROFILE_DEFAULT_NAME = "Nedu";
export const PROFILE_NAME_MAX = 20;

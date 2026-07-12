// ── STAK Playground config + types ───────────────────────────────────────────
// All activity content (lessons, battles, earnings, risk, mood) is Gemini-generated.
// This file contains only types, XP/tier config, and non-activity static data.
import { TIER_XP as BASE_TIER_XP, xpToTier } from "@stak/shared";
import type { ActivityType } from "@stak/shared";
import { getLocalDateKey } from "@/lib/utils";
export { xpToTier, TIER_THRESHOLDS, ACTIVITY_TYPES, SANDBOX_BUDGETS, ACTIVITY_XP_CAP } from "@stak/shared";
export { TIER_XP as SHARED_TIER_XP } from "@stak/shared";
export type { ActivityType, TierNumber } from "@stak/shared";

// ── Types ────────────────────────────────────────────────────────────────────

export type LessonCategory =
	| "Stock Basics"
	| "Market Basics"
	| "Valuation"
	| "Earnings"
	| "Risk"
	| "Dividends"
	| "Sectors";

export interface LessonCard {
	heading: string;
	body: string;
}

export interface QuizOption {
	id: string;
	text: string;
}

export interface LessonQuiz {
	question: string;
	options: QuizOption[];
	correctId: string;
	explanation: string;
}

export interface Lesson {
	id: string;
	title: string;
	subtitle: string;
	category: LessonCategory;
	durationMin: number;
	xp: number;
	emoji: string;
	cards: LessonCard[];
	quiz: LessonQuiz;
}

export type ChallengeType = "comparison" | "scenario" | "lesson";

export interface DailyChallenge {
	id: string;
	type: ChallengeType;
	prompt: string;
	options: QuizOption[];
	correctId: string;
	explanation: string;
	xp: number;
}

export interface BattleMatchup {
	id: string;
	tickerA: string;
	nameA: string;
	tickerB: string;
	nameB: string;
	category: string;
	metric?: "revenueGrowth" | "profitMargin" | "peRatio" | "marketCap";
	metricLabel: string;
	higherWins: boolean;
	explanation: string;
	xp: number;
}

export interface EarningsScenario {
	id: string;
	company: string;
	ticker: string;
	context: string;
	forwardGuidance?: string;
	revenueExpected: string;
	epsExpected: string;
	revenueActual?: string;
	epsActual?: string;
	stockContext: string;
	peRatio?: string;
	stockSetupLabel?: string;
	question: string;
	options: QuizOption[];
	correctId: string;
	stockMove?: string;
	outcome: string;
	explanation: string;
	keyTakeaway?: string;
	watchNextTime?: string;
	xp: number;
}

export interface RiskScenario {
	id: string;
	prompt: string;
	optionA: string;
	optionB: string;
	riskierOption: "A" | "B";
	explanation: string;
	xp: number;
}

export interface MoodScenario {
	id: string;
	event: string;
	question: string;
	options: QuizOption[];
	correctId: string;
	explanation: string;
	xp: number;
}

// ── Daily Challenge (static — separate from rotating Gemini content) ──────────

export const DAILY_CHALLENGES: DailyChallenge[] = [
	{
		id: "dc-pe-vs-growth",
		type: "comparison",
		prompt: "Which stock type typically has a higher P/E ratio?",
		options: [
			{ id: "a", text: "A fast-growing software company" },
			{ id: "b", text: "A mature bank with slow growth" },
		],
		correctId: "a",
		explanation: "Fast-growing companies trade at higher P/E multiples because investors are paying for future growth potential, not just today's earnings.",
		xp: 15,
	},
	{
		id: "dc-costco-walmart-margin",
		type: "comparison",
		prompt: "Which company typically has the higher profit margin?",
		options: [
			{ id: "a", text: "Costco" },
			{ id: "b", text: "A software-as-a-service company" },
		],
		correctId: "b",
		explanation: "SaaS companies can have margins of 60–80%+ because software costs almost nothing to distribute. Costco intentionally runs on razor-thin margins (~2-3%) to offer low prices.",
		xp: 15,
	},
	{
		id: "dc-earnings-guidance",
		type: "scenario",
		prompt: "A company beats EPS by 15% but lowers guidance for next quarter. What likely happens to the stock?",
		options: [
			{ id: "a", text: "It rallies — a 15% beat is huge" },
			{ id: "b", text: "It falls — guidance matters more than past results" },
		],
		correctId: "b",
		explanation: "Markets are forward-looking. Lowered guidance signals weaker future earnings, which investors care about more than a past beat.",
		xp: 20,
	},
	{
		id: "dc-rates-growth",
		type: "scenario",
		prompt: "The Fed raises interest rates by 0.5%. Which sector would you expect to feel the most pressure?",
		options: [
			{ id: "a", text: "High-growth tech stocks" },
			{ id: "b", text: "Utility companies" },
		],
		correctId: "a",
		explanation: "Growth stocks are most sensitive to rate hikes because their value depends on discounted future profits. Rising rates reduce the present value of those future earnings.",
		xp: 20,
	},
	{
		id: "dc-dividend-cut",
		type: "scenario",
		prompt: "A company announces it's cutting its dividend by 50%. What typically happens to the stock?",
		options: [
			{ id: "a", text: "The stock rises — the company is saving money" },
			{ id: "b", text: "The stock falls — it signals financial stress" },
		],
		correctId: "b",
		explanation: "A dividend cut is usually a red flag signaling that the company's cash flow is under pressure. Income investors often sell immediately, pushing the stock lower.",
		xp: 15,
	},
	{
		id: "dc-beta-market-down",
		type: "comparison",
		prompt: "The market falls 5%. Which stock would you expect to fall more?",
		options: [
			{ id: "a", text: "A utility stock with beta of 0.4" },
			{ id: "b", text: "A speculative tech stock with beta of 2.5" },
		],
		correctId: "b",
		explanation: "Beta of 2.5 means the stock moves roughly 2.5× the market. A 5% market drop would imply about a 12.5% drop for the high-beta stock.",
		xp: 15,
	},
	{
		id: "dc-revenue-growth-matters",
		type: "scenario",
		prompt: "A company is growing revenue at 40% per year but is losing money. Is this necessarily bad?",
		options: [
			{ id: "a", text: "Yes — a company must always be profitable" },
			{ id: "b", text: "Not necessarily — many great companies invest heavily early at the cost of profits" },
		],
		correctId: "b",
		explanation: "Amazon lost money for years while building its infrastructure. Investing in growth at the expense of near-term profit is a common and often successful strategy for hyper-growth companies.",
		xp: 20,
	},
	{
		id: "dc-bear-market-opportunity",
		type: "scenario",
		prompt: "The market enters a bear market (down 20%+). What should a long-term investor consider?",
		options: [
			{ id: "a", text: "Sell everything to stop the bleeding" },
			{ id: "b", text: "See it as an opportunity to buy quality companies at lower prices" },
		],
		correctId: "b",
		explanation: "The S&P 500 has recovered from every bear market in history and gone on to new highs. Long-term investors who bought during bear markets were often rewarded handsomely.",
		xp: 20,
	},
	{
		id: "dc-pe-comparison",
		type: "comparison",
		prompt: "Which company is 'cheaper' on a valuation basis?",
		options: [
			{ id: "a", text: "Stock at $500/share with P/E of 15" },
			{ id: "b", text: "Stock at $10/share with P/E of 80" },
		],
		correctId: "a",
		explanation: "Share price is irrelevant to valuation. The $500 stock with P/E 15 is much cheaper — you're paying $15 for every $1 of earnings vs $80 for the $10 stock.",
		xp: 15,
	},
	{
		id: "dc-market-cap",
		type: "comparison",
		prompt: "Which tells you more about a company's true size?",
		options: [
			{ id: "a", text: "Its stock price" },
			{ id: "b", text: "Its market capitalisation" },
		],
		correctId: "b",
		explanation: "Market cap (price × shares) tells you the total value the market assigns to the company. A $1 stock can represent a company worth billions if it has billions of shares.",
		xp: 10,
	},
	{
		id: "dc-earnings-beat-fall",
		type: "scenario",
		prompt: "Nike reports earnings: revenue up 8%, EPS beats by $0.10, but management warns next quarter will be 'challenging'. What likely happens?",
		options: [
			{ id: "a", text: "Stock rallies on the beat" },
			{ id: "b", text: "Stock falls on the weak guidance" },
		],
		correctId: "b",
		explanation: "Guidance is the most forward-looking signal. 'Challenging' next quarter tells investors earnings may disappoint — that uncertainty gets priced in immediately.",
		xp: 20,
	},
	{
		id: "dc-sector-recession",
		type: "comparison",
		prompt: "Which stock would you expect to perform better during a recession?",
		options: [
			{ id: "a", text: "Procter & Gamble (consumer staples)" },
			{ id: "b", text: "Roblox (gaming / consumer discretionary)" },
		],
		correctId: "a",
		explanation: "People still buy soap and detergent in a recession. Consumer staples are defensive — their demand is stable regardless of economic conditions. Discretionary spending (gaming, luxury) tends to fall.",
		xp: 15,
	},
	{
		id: "dc-guidance-vs-beat",
		type: "scenario",
		prompt: "A company beats EPS by 20% but cuts its revenue outlook for next quarter by 10%. What matters more to the stock price?",
		options: [
			{ id: "a", text: "The 20% EPS beat — strong results are what count" },
			{ id: "b", text: "The 10% guidance cut — investors are forward-looking" },
		],
		correctId: "b",
		explanation: "Markets price in the future, not the past. A strong past result with weak forward guidance signals the good times are fading. The stock will almost certainly fall on the guidance cut, despite the beat.",
		xp: 20,
	},
	{
		id: "dc-saas-vs-bank-pe",
		type: "comparison",
		prompt: "Which company would you expect to have a higher P/E ratio?",
		options: [
			{ id: "a", text: "A fast-growing SaaS company with 40% revenue growth" },
			{ id: "b", text: "A regional bank growing revenue at 5% per year" },
		],
		correctId: "a",
		explanation: "Investors pay a premium for fast growth. A SaaS company growing 40% annually could have a P/E of 40-80x because the future earnings potential is massive. A slow-growth bank might trade at 8-12x earnings.",
		xp: 15,
	},
	{
		id: "dc-short-squeeze",
		type: "scenario",
		prompt: "A heavily shorted stock (40% of float is short) suddenly announces a major partnership. What might amplify the stock's initial move upward?",
		options: [
			{ id: "a", text: "Short sellers are forced to buy shares to cover their losses" },
			{ id: "b", text: "The company issues new shares to raise cash" },
		],
		correctId: "a",
		explanation: "This is called a short squeeze. When a heavily shorted stock rises sharply, short sellers rush to buy shares to close their positions and limit losses — which pushes the price even higher. GameStop in 2021 is the most famous example.",
		xp: 25,
	},
	{
		id: "dc-free-cash-flow",
		type: "scenario",
		prompt: "Two companies both report $1B in net income. Company A has $1.5B in free cash flow. Company B has $300M. Which is more financially healthy?",
		options: [
			{ id: "a", text: "Company A — more cash is generated than profit shows" },
			{ id: "b", text: "Company B — lower cash means less spending" },
		],
		correctId: "a",
		explanation: "Free cash flow (FCF) is often considered a better measure of financial health than net income. Company A generates 1.5x its reported profit in actual cash — meaning its earnings are high quality. Company B converts only 30% of profits to cash, suggesting heavy capital spending or accounting adjustments.",
		xp: 25,
	},
	{
		id: "dc-market-cap-price",
		type: "comparison",
		prompt: "Stock A trades at $5 per share. Stock B trades at $500 per share. Which stock is 'cheaper'?",
		options: [
			{ id: "a", text: "Stock A — it costs $5, which is much less" },
			{ id: "b", text: "Can't tell — need to know market cap and earnings first" },
		],
		correctId: "b",
		explanation: "Share price alone tells you nothing about value. A $5 stock with billions of shares outstanding could be worth far more than a $500 stock with few shares. What matters is market cap (total value) and valuation multiples like P/E — not the price per share.",
		xp: 20,
	},
];

/** Pick a deterministic daily challenge from the pool using the date as seed */
export function getDailyChallenge(dateKey: string): DailyChallenge {
	let hash = 0;
	for (let i = 0; i < dateKey.length; i++) {
		hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
		hash |= 0;
	}
	const idx = Math.abs(hash) % DAILY_CHALLENGES.length;
	return DAILY_CHALLENGES[idx]!;
}

// ── Sandbox practice tickers ──────────────────────────────────────────────────

export const PRACTICE_TICKERS = [
	{ ticker: "AAPL",  name: "Apple",     prompt: "High-margin hardware and software company with massive buybacks. Premium brand with strong loyalty." },
	{ ticker: "TSLA",  name: "Tesla",     prompt: "EV pioneer with high growth, high valuation, and volatile earnings. Elon Musk drives both the brand and the swings." },
	{ ticker: "NVDA",  name: "NVIDIA",    prompt: "AI chip leader seeing unprecedented demand. Revenue and margins have exploded. Valuation is stretched by historical standards." },
	{ ticker: "META",  name: "Meta",      prompt: "Ad-revenue giant with strong AI infrastructure. Trades at a reasonable multiple for its growth rate." },
	{ ticker: "NFLX",  name: "Netflix",   prompt: "Streaming leader with improving margins from ad-tier and password sharing crackdown. Subscriber growth stabilising." },
	{ ticker: "MSFT",  name: "Microsoft", prompt: "Cloud, AI, Office, and Xbox. One of the most diversified mega-cap tech companies with a growing dividend." },
	{ ticker: "AMZN",  name: "Amazon",    prompt: "E-commerce and AWS cloud in one. AWS is the profit engine; retail is the customer flywheel." },
	{ ticker: "GOOGL", name: "Alphabet",  prompt: "Search, YouTube, and Google Cloud. Advertising is 80% of revenue — rate-sensitive to ad market cycles." },
	{ ticker: "SBUX",  name: "Starbucks", prompt: "Global coffee brand facing operational challenges. High dividend yield but growth has slowed." },
	{ ticker: "COIN",  name: "Coinbase",  prompt: "Crypto exchange with revenue highly tied to market cycle. Volatile but the largest regulated US crypto platform." },
];

// ── Build Your First Watchlist game ──────────────────────────────────────────

export type WatchlistSlotType = "familiar" | "growth" | "defensive" | "dividend" | "speculative";

export interface WatchlistSlot {
	type: WatchlistSlotType;
	label: string;
	description: string;
	emoji: string;
	examples: string[];
}

export const WATCHLIST_SLOTS: WatchlistSlot[] = [
	{ type: "familiar",   label: "Familiar Brand",    emoji: "🏠", description: "A company you use or know well in real life.", examples: ["Apple","Nike","Starbucks","Netflix","Disney"] },
	{ type: "familiar",   label: "Familiar Brand",    emoji: "🏠", description: "Another brand you know and trust.", examples: ["Amazon","Spotify","Roblox","McDonald's","Tesla"] },
	{ type: "familiar",   label: "Familiar Brand",    emoji: "🏠", description: "A third recognizable brand from daily life.", examples: ["Microsoft","Google","Meta","Netflix","Nike"] },
	{ type: "familiar",   label: "Familiar Brand",    emoji: "🏠", description: "Round out with another brand you follow.", examples: ["Airbnb","Uber","Snapchat","Pinterest","Coinbase"] },
	{ type: "growth",     label: "Growth Stock",      emoji: "🚀", description: "A company growing revenue fast — high risk, high potential.", examples: ["NVIDIA","Palantir","Shopify","Datadog","Duolingo"] },
	{ type: "growth",     label: "Growth Stock",      emoji: "🚀", description: "Another high-growth opportunity.", examples: ["CrowdStrike","Cloudflare","Coinbase","SoundHound","Roblox"] },
	{ type: "growth",     label: "Growth Stock",      emoji: "🚀", description: "A third growth play — diversify across sectors.", examples: ["Shopify","Toast","Monday.com","Confluent","Asana"] },
	{ type: "defensive",  label: "Defensive Stock",   emoji: "🛡️", description: "Stable company that holds up in downturns.", examples: ["Procter & Gamble","Johnson & Johnson","Walmart","Costco","Coca-Cola"] },
	{ type: "defensive",  label: "Defensive Stock",   emoji: "🛡️", description: "Another defensive anchor for your portfolio.", examples: ["Berkshire Hathaway","McDonald's","Waste Management","Realty Income","AT&T"] },
	{ type: "dividend",   label: "Dividend Stock",    emoji: "💵", description: "Pays regular cash to shareholders.", examples:["Coca-Cola","JPMorgan","Microsoft","Apple","Verizon"] },
	{ type: "dividend",   label: "Dividend Stock",    emoji: "💵", description: "Another reliable dividend payer.", examples: ["Johnson & Johnson","Procter & Gamble","Realty Income","3M","PepsiCo"] },
	{ type: "dividend",   label: "Dividend Stock",    emoji: "💵", description: "A third income source to compound returns.", examples: ["AbbVie","Pfizer","Chevron","IBM","Altria"] },
	{ type: "speculative",label: "Speculative Play",  emoji: "🎲", description: "High risk, high potential — moon or bust.", examples: ["Virgin Galactic","AST SpaceMobile","Rivian","Joby Aviation","SoundHound"] },
	{ type: "speculative",label: "Speculative Play",  emoji: "🎲", description: "Another high-upside bet — expect volatility.", examples: ["Plug Power","Lucid Motors","IonQ","Archer Aviation","Carvana"] },
	{ type: "speculative",label: "Speculative Play",  emoji: "🎲", description: "A third speculative position — size carefully.", examples: ["Coinbase","Palantir","Robinhood","DraftKings","SoFi"] },
];

export interface WatchlistBrand {
	id: string;
	ticker: string;
	name: string;
	types: WatchlistSlotType[];
	description: string;
}

export const WATCHLIST_BRANDS: WatchlistBrand[] = [
	{ id: "aapl",  ticker: "AAPL",  name: "Apple",         types: ["familiar","dividend"],    description: "Consumer tech giant with high margins, loyal users, and a growing services business." },
	{ id: "tsla",  ticker: "TSLA",  name: "Tesla",         types: ["familiar","growth","speculative"], description: "EV and energy leader. High growth, high valuation, volatile." },
	{ id: "nvda",  ticker: "NVDA",  name: "NVIDIA",        types: ["growth"],                 description: "AI chip leader with explosive revenue growth driven by data center demand." },
	{ id: "sbux",  ticker: "SBUX",  name: "Starbucks",     types: ["familiar","dividend"],    description: "Global coffee chain. Steady dividend but facing growth challenges." },
	{ id: "nflx",  ticker: "NFLX",  name: "Netflix",       types: ["familiar","growth"],      description: "Streaming leader improving margins with ads and password sharing crackdown." },
	{ id: "ko",    ticker: "KO",    name: "Coca-Cola",     types: ["defensive","dividend"],   description: "130-year-old beverages giant. Stable earnings, growing dividend, recession-resistant." },
	{ id: "wmt",   ticker: "WMT",   name: "Walmart",       types: ["defensive","dividend"],   description: "Retail giant with stable revenue, growing e-commerce, and reliable dividend." },
	{ id: "jnj",   ticker: "JNJ",   name: "Johnson & Johnson", types: ["defensive","dividend"], description: "Healthcare conglomerate. Decades of dividend growth. Defensive holding." },
	{ id: "meta",  ticker: "META",  name: "Meta",          types: ["growth","familiar"],      description: "Social media and AI infrastructure. Strong profit margins and growing revenue." },
	{ id: "coin",  ticker: "COIN",  name: "Coinbase",      types: ["speculative","growth"],   description: "Crypto exchange with revenue tied directly to crypto market cycles." },
	{ id: "pltr",  ticker: "PLTR",  name: "Palantir",      types: ["speculative","growth"],   description: "AI data platform for government and enterprise. Growing fast, expensive valuation." },
	{ id: "msft",  ticker: "MSFT",  name: "Microsoft",     types: ["growth","dividend","defensive"], description: "Cloud, AI, Office, and Xbox. Diversified tech giant with growing dividend." },
	{ id: "amzn",  ticker: "AMZN",  name: "Amazon",        types: ["familiar","growth"],      description: "E-commerce and AWS cloud. Two dominant businesses under one roof." },
	{ id: "rblx",  ticker: "RBLX",  name: "Roblox",        types: ["familiar","speculative"], description: "Gaming platform for Gen Z. High growth but profitability is distant." },
	{ id: "asts",  ticker: "ASTS",  name: "AST SpaceMobile", types: ["speculative"],          description: "Satellite broadband startup. Pre-revenue, high risk, massive potential." },
	{ id: "spce",  ticker: "SPCE",  name: "Virgin Galactic",  types: ["speculative"],         description: "Space tourism company rebuilding with Delta-class ships. Volatile and risky." },
	{ id: "rivn",  ticker: "RIVN",  name: "Rivian",        types: ["speculative","growth"],   description: "EV truck startup. Growing production, still losing money, high risk." },
	{ id: "cost",  ticker: "COST",  name: "Costco",        types: ["defensive","dividend"],   description: "Membership warehouse retailer. Loyal customer base, strong margins, reliable." },
	{ id: "shop",  ticker: "SHOP",  name: "Shopify",       types: ["growth"],                 description: "E-commerce infrastructure for SMBs. Strong revenue growth, inconsistent profits." },
	{ id: "nke",   ticker: "NKE",   name: "Nike",          types: ["familiar","dividend"],    description: "Global sportswear leader. Dividend payer with brand power but recent challenges." },
];

// ── Lesson category config ────────────────────────────────────────────────────

export const LESSON_CATEGORIES: { id: LessonCategory; emoji: string; color: string }[] = [
	{ id: "Stock Basics",   emoji: "📈", color: "blue"   },
	{ id: "Market Basics",  emoji: "🌍", color: "purple" },
	{ id: "Valuation",      emoji: "🔢", color: "cyan"   },
	{ id: "Earnings",       emoji: "📋", color: "amber"  },
	{ id: "Risk",           emoji: "⚠️", color: "red"    },
	{ id: "Dividends",      emoji: "💵", color: "green"  },
	{ id: "Sectors",        emoji: "🗂️", color: "pink"   },
];

// ── Daily Pack types + XP config ─────────────────────────────────────────────

export interface DailyActivity {
	id: string;
	type: ActivityType;
	title: string;
	subtitle: string;
	emoji: string;
	xp: number;
}

export interface DailyPack {
	dayKey: string;
	tier: number;
	activities: DailyActivity[];
	totalXp: number;
	label: string;
	color: string;
}

export const TIER_XP: Record<number, { lesson: number; battle: number; lab: number; label: string; color: string }> = {
	1: { ...BASE_TIER_XP[1], color: "border-slate-500/30 bg-slate-500/[0.07]"   },
	2: { ...BASE_TIER_XP[2], color: "border-blue-500/30 bg-blue-500/[0.07]"     },
	3: { ...BASE_TIER_XP[3], color: "border-cyan-500/30 bg-cyan-500/[0.07]"     },
	4: { ...BASE_TIER_XP[4], color: "border-violet-500/30 bg-violet-500/[0.07]" },
	5: { ...BASE_TIER_XP[5], color: "border-amber-500/30 bg-amber-500/[0.07]"   },
};

export const TIER_COUNTS: Record<number, { lessons: number; battles: number; earnings: number; risk: number; mood: number }> = {
	1: { lessons: 3, battles: 1, earnings: 1, risk: 2, mood: 1 },
	2: { lessons: 4, battles: 2, earnings: 1, risk: 2, mood: 2 },
	3: { lessons: 4, battles: 2, earnings: 2, risk: 3, mood: 2 },
	4: { lessons: 5, battles: 3, earnings: 2, risk: 3, mood: 3 },
	5: { lessons: 5, battles: 3, earnings: 3, risk: 4, mood: 3 },
};

/** Returns an empty shell pack for the given tier/day — content is filled by Gemini via useDailyContent. */
export function getDailyPack(totalXp: number, dayKey: string): DailyPack {
	const tier = xpToTier(totalXp);
	const xpRates = TIER_XP[tier]!;
	return { dayKey, tier, activities: [], totalXp: 0, label: xpRates.label, color: xpRates.color };
}

/** Get today's date key in local time, e.g. "2026-06-20" */
export const getTodayKey = getLocalDateKey;

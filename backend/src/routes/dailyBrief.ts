import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

export const dailyBriefRouter = Router();

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getFinnhubKeys(): string[] {
	return [
		process.env.FINNHUB_API_KEY,
		process.env.FINNHUB_API_KEY_2,
		process.env.FINNHUB_API_KEY_3,
	].filter((k): k is string => !!k);
}

function getGeminiKeys(): string[] {
	return [
		process.env.GEMINI_API_KEY,
		process.env.GEMINI_API_KEY_2,
		process.env.GEMINI_API_KEY_3,
	].filter((k): k is string => !!k);
}

async function finnhubGet(path: string): Promise<unknown | null> {
	const keys = getFinnhubKeys();
	for (const key of keys) {
		try {
			const res = await fetch(`${FINNHUB_BASE}${path}&token=${key}`);
			if (res.status === 403 || res.status === 429) continue;
			if (!res.ok) return null;
			return res.json();
		} catch {
			continue;
		}
	}
	return null;
}

async function getQuoteChange(symbol: string): Promise<number | null> {
	const cacheKey = `daily-brief:quote:${symbol}`;
	const cached = await cacheGet<number>(cacheKey);
	if (cached !== null) return cached;

	const q = await finnhubGet(`/quote?symbol=${symbol}`) as { dp?: number } | null;
	if (q?.dp == null) return null;

	const pct = Math.round(q.dp * 10) / 10;
	await cacheSet(cacheKey, pct, 5 * 60 * 1000);
	return pct;
}

type Mood = "Bullish" | "Bearish" | "Cautious" | "Volatile" | "Calm" | "Mixed" | "Risk-On" | "Risk-Off";
type Session = "open" | "midday" | "close";

// 11 sector ETFs — count green/red for breadth
const SECTOR_ETFS = ["XLK","XLF","XLC","XLY","XLP","XLV","XLE","XLI","XLB","XLRE","XLU"];
const SECTOR_NAMES: Record<string, string> = {
	XLK: "Technology", XLF: "Financials", XLC: "Communication", XLY: "Consumer Discretionary",
	XLP: "Consumer Staples", XLV: "Healthcare", XLE: "Energy", XLI: "Industrials",
	XLB: "Materials", XLRE: "Real Estate", XLU: "Utilities",
};

function getMarketSession(): Session {
	const now = new Date();
	const etHour = parseInt(now.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/New_York" }), 10);
	const etMin  = parseInt(now.toLocaleString("en-US", { minute: "2-digit",               timeZone: "America/New_York" }), 10);
	const total  = etHour * 60 + etMin;
	if (total < 12 * 60)         return "open";    // midnight – 11:59 AM ET
	if (total < 15 * 60 + 30)    return "midday";  // noon – 3:29 PM ET
	return "close";                                 // 3:30 PM ET onwards
}

interface MarketData {
	spyDp: number | null;
	qqqDp: number | null;
	diaDp: number | null;
	iwmDp: number | null;  // Russell 2000
	vixDp: number | null;  // VIX % change
	sectorsGreen: number;  // 0-11
	sectorsRed: number;
	topSector: string | null;
	worstSector: string | null;
}

function classifyMood(d: MarketData): Mood {
	const { spyDp, qqqDp, diaDp, vixDp, sectorsGreen, sectorsRed } = d;

	// --- Calm: very small moves, stable VIX, no major catalyst ---
	const spyCalm = spyDp !== null && Math.abs(spyDp) <= 0.3;
	const qqqCalm = qqqDp !== null && Math.abs(qqqDp) <= 0.4;
	const vixCalm = vixDp !== null && Math.abs(vixDp) <= 3;
	if (spyCalm && qqqCalm && vixCalm) return "Calm";

	// --- Volatile: big moves or big VIX spike ---
	const bigMove = (spyDp !== null && Math.abs(spyDp) > 1.5) || (qqqDp !== null && Math.abs(qqqDp) > 1.5);
	const vixSpike = vixDp !== null && vixDp > 7;
	if (bigMove || vixSpike) {
		// Even in volatile day, if all green it's Bullish
		if (spyDp !== null && spyDp > 1.5 && qqqDp !== null && qqqDp > 1.5 && (vixDp === null || vixDp <= 0)) return "Bullish";
		if (spyDp !== null && spyDp < -1.5 && qqqDp !== null && qqqDp < -1.5) return "Bearish";
		return "Volatile";
	}

	// --- Bullish: S&P > +0.5%, Nasdaq > +0.7%, VIX flat/down, 6+ sectors green ---
	if (spyDp !== null && spyDp > 0.5 && qqqDp !== null && qqqDp > 0.7 && (vixDp === null || vixDp <= 0) && sectorsGreen >= 6) return "Bullish";

	// --- Bearish: S&P < -0.5%, Nasdaq < -0.7%, VIX up, 6+ sectors red ---
	if (spyDp !== null && spyDp < -0.5 && qqqDp !== null && qqqDp < -0.7 && (vixDp === null || vixDp > 0) && sectorsRed >= 6) return "Bearish";

	// --- Risk-On: Nasdaq significantly outperforms S&P, growth leads ---
	if (spyDp !== null && qqqDp !== null && qqqDp - spyDp >= 0.5 && qqqDp > 0 && (vixDp === null || vixDp <= 0)) return "Risk-On";

	// --- Risk-Off: Nasdaq significantly underperforms S&P, defensive leads ---
	if (spyDp !== null && qqqDp !== null && spyDp - qqqDp >= 0.5 && (vixDp === null || vixDp > 0)) return "Risk-Off";

	// --- Mixed: S&P and Nasdaq disagree, split sectors ---
	if (spyDp !== null && qqqDp !== null && ((spyDp > 0.2 && qqqDp < -0.2) || (qqqDp > 0.2 && spyDp < -0.2))) return "Mixed";
	if (sectorsGreen >= 4 && sectorsRed >= 4) return "Mixed";

	// --- Cautious: flat with slight down tilt or upcoming catalyst uncertainty ---
	if (spyDp !== null && spyDp < 0) return "Cautious";

	return "Mixed";
}

// Legacy wrapper for backward compat — used when we don't have full data
function deriveMood(spyDp: number | null, qqqDp: number | null, diaDp: number | null): Mood {
	return classifyMood({ spyDp, qqqDp, diaDp, iwmDp: null, vixDp: null, sectorsGreen: 5, sectorsRed: 5, topSector: null, worstSector: null });
}

function getFallbackText(mood: Mood): { moodExplanation: string; plainEnglish: string } {
	const map: Record<Mood, { moodExplanation: string; plainEnglish: string }> = {
		Bullish:   { moodExplanation: "Stocks moved higher today with broad strength across major indexes and low volatility.", plainEnglish: "Investors leaned into risk today — a good day to see what's rallying." },
		Bearish:   { moodExplanation: "Stocks moved lower today as investors pulled back from riskier assets and market weakness spread.", plainEnglish: "Markets are down — defensive and value plays may be worth a look." },
		Cautious:  { moodExplanation: "Markets were mostly steady today but investors stayed careful ahead of key upcoming data.", plainEnglish: "No strong direction — investors are waiting before making bigger moves." },
		Volatile:  { moodExplanation: "Stocks swung sharply today as investors reacted to economic data and shifting expectations.", plainEnglish: "Big moves in both directions — volatility is elevated today." },
		Calm:      { moodExplanation: "Major indexes were little changed today with no major catalyst driving broad moves.", plainEnglish: "There was no major rush to buy or sell — investors mostly waited for the next update." },
		Mixed:     { moodExplanation: "The market had no clear direction today — some sectors held up while others pulled back.", plainEnglish: "Some parts of the market worked, others didn't — stock selection matters more than the broad market." },
		"Risk-On": { moodExplanation: "Investors leaned into growth today, with tech, AI, and higher-upside names leading the market.", plainEnglish: "Investors were more willing to take risk today, so growth stocks and tech names got more attention." },
		"Risk-Off": { moodExplanation: "Investors moved toward safer areas of the market today as growth and speculative stocks came under pressure.", plainEnglish: "Investors played defense today — riskier stocks can struggle while steadier companies hold up better." },
	};
	return map[mood];
}

const SESSION_TONE: Record<Session, string> = {
	open:   "Markets are opening right now. Write in a forward-looking tone — what should investors watch for today?",
	midday: "Markets are mid-session. Write in a present-tense tone — how are markets trending so far today?",
	close:  "Markets are closing or have just closed. Write in a recap tone — what happened today and what does it mean going forward?",
};

async function generateMarketText(
	mood: Mood,
	session: Session,
	spyDp: number | null,
	qqqDp: number | null,
	diaDp: number | null,
	vixDp?: number | null,
	sectorsGreen?: number,
	sectorsRed?: number,
	topSector?: string | null,
	worstSector?: string | null,
): Promise<{ moodExplanation: string; plainEnglish: string }> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:text:v2:${mood}:${today}:${session}`;
	const cached = await cacheGet<{ moodExplanation: string; plainEnglish: string }>(cacheKey);
	if (cached) return cached;

	const fmt = (v: number | null | undefined, prefix = "") => v != null ? `${prefix}${v >= 0 ? "+" : ""}${v}%` : null;
	const snapshot = [
		spyDp != null   ? `S&P 500 ${fmt(spyDp)}` : null,
		qqqDp != null   ? `Nasdaq ${fmt(qqqDp)}` : null,
		diaDp != null   ? `Dow ${fmt(diaDp)}` : null,
		vixDp != null   ? `VIX ${fmt(vixDp)}` : null,
		sectorsGreen != null ? `${sectorsGreen} sectors green, ${sectorsRed ?? 0} red` : null,
		topSector       ? `Leading: ${topSector}` : null,
		worstSector && worstSector !== topSector ? `Lagging: ${worstSector}` : null,
	].filter(Boolean).join(" | ");

	const PLAIN_ENGLISH_GUIDE: Record<Mood, string> = {
		Bullish:    "There was no major rush to buy or sell today. Investors mostly waited for the next big update before making stronger moves.",
		Bearish:    "Investors pulled back from riskier assets. Selling pressure was broad-based.",
		Cautious:   "No strong direction — investors are waiting before making bigger moves.",
		Volatile:   "Big moves in both directions today — volatility is elevated.",
		Calm:       "There was no major rush to buy or sell today. Investors mostly waited for the next big update.",
		Mixed:      "Some parts of the market worked, others did not. Stock selection mattered more than the overall market direction.",
		"Risk-On":  "Investors were more willing to take risk today, so growth stocks and tech names got more attention.",
		"Risk-Off": "Investors played defense today, which usually means riskier stocks can struggle while steadier companies hold up better.",
	};

	const prompt = `You are writing the market mood section of a daily brief for a stock-learning app aimed at Gen Z / millennials. Be concise, data-backed, and jargon-free.

Market data: ${snapshot || "data unavailable"}. Overall mood: ${mood}. ${SESSION_TONE[session]}

Return JSON with exactly two fields:
- "moodExplanation": 1–2 sentences explaining WHY markets feel ${mood} right now using the actual data above (mention the S&P/Nasdaq moves, sector leadership, or VIX). Be specific — say "S&P 500 rose +0.8%" not "markets moved higher". Max 120 chars.
- "plainEnglish": 1 plain-English sentence a beginner can understand. Use this style: "${PLAIN_ENGLISH_GUIDE[mood]}". Max 90 chars.

No financial advice. No disclaimers. Just describe what is happening.`;

	const keys = getGeminiKeys();
	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.4, responseMimeType: "application/json" },
					}),
					signal: AbortSignal.timeout(12000),
				},
			);
			if (!res.ok) continue;
			const data = await res.json() as {
				candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
			};
			const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!text) continue;
			const parsed = JSON.parse(text) as { moodExplanation?: string; plainEnglish?: string };
			if (parsed.moodExplanation && parsed.plainEnglish) {
				await cacheSet(cacheKey, parsed, 4 * 60 * 60 * 1000);
				return { moodExplanation: parsed.moodExplanation, plainEnglish: parsed.plainEnglish };
			}
		} catch {
			continue;
		}
	}

	return getFallbackText(mood);
}

const TAG_LABELS: Record<string, string> = {
	technology:      "tech",
	consumer_brand:  "consumer brands",
	high_growth:     "high-growth stocks",
	ecommerce:       "e-commerce",
	marketplace:     "marketplace platforms",
	financials:      "financials",
	digital_ads:     "digital advertising",
	semiconductor:   "semiconductors",
	ai_data:         "AI and data",
	streaming:       "streaming",
	social_media:    "social media",
	payments:        "payments",
	saas:            "software/SaaS",
	ev_auto:         "EVs",
	retail:          "retail",
	healthcare:      "healthcare",
	energy:          "energy",
	dividend_income: "dividend stocks",
	real_estate:     "real estate",
	travel:          "travel",
};

function buildPersonalizedImpact(tagScores: Record<string, number>, mood: Mood): string {
	const top = Object.entries(tagScores)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([tag]) => TAG_LABELS[tag] ?? tag.replace(/_/g, " "));

	if (top.length === 0) {
		return "Swipe on more brands to unlock personalized market insights here.";
	}

	const topStr = top.length === 1
		? top[0]
		: top.length === 2
			? `${top[0]} and ${top[1]}`
			: `${top[0]}, ${top[1]}, and ${top[2]}`;

	const context: Record<Mood, string> = {
		Bullish:    `tend to benefit most when markets rally — a good day to explore them.`,
		Bearish:    `may see pressure today. Watch for dips that could be buying opportunities.`,
		Cautious:   `could see choppier moves than usual with today's uncertainty.`,
		Volatile:   `may swing sharply today — big moves in either direction are possible.`,
		Calm:       `fundamentals can shine through on quiet days like today.`,
		Mixed:      `results today will depend on individual catalysts, not the broad market.`,
		"Risk-On":  `are in focus today as investors lean into growth and higher-upside names.`,
		"Risk-Off": `may face headwinds today as investors rotate toward safer, more defensive positions.`,
	};

	return `Your feed leans toward ${topStr} — those ${context[mood]}`;
}

async function generatePersonalizedImpact(
	tagScores: Record<string, number>,
	stakBrandIds: string[],
	mood: Mood,
	session: Session,
	spyDp: number | null,
	qqqDp: number | null,
	uid: string,
): Promise<string> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:impact:${uid}:${today}:${session}`;
	const cached = await cacheGet<string>(cacheKey);
	if (cached) return cached;

	const topTags = Object.entries(tagScores)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([tag]) => TAG_LABELS[tag] ?? tag.replace(/_/g, " "));

	const topBrands = stakBrandIds.slice(0, 6).map((id) => id.toUpperCase());

	if (topTags.length === 0 && topBrands.length === 0) {
		return "Swipe on more brands to unlock personalized market insights here.";
	}

	const marketData = [
		spyDp !== null ? `S&P 500 ${spyDp >= 0 ? "+" : ""}${spyDp}%` : null,
		qqqDp !== null ? `Nasdaq ${qqqDp >= 0 ? "+" : ""}${qqqDp}%` : null,
	].filter(Boolean).join(", ");

	const prompt = `You are writing a short personalized market insight for a young investor (Gen Z / millennial) using a stock-learning app called STAK.

Today's market: ${marketData || "data unavailable"}. Overall mood: ${mood}.
User's saved stocks: ${topBrands.length > 0 ? topBrands.join(", ") : "none yet"}.
User's top interests: ${topTags.length > 0 ? topTags.join(", ") : "general investing"}.

Write exactly 2 short sentences:
1. Name 1–2 of their specific saved stocks or interest areas and explain how today's ${mood.toLowerCase()} market directly affects them.
2. Give one concrete thing to look at or think about today — not financial advice, just a direction to explore.

Rules: friendly and direct tone, no jargon, no disclaimers, no fluff. Max 190 characters total. Plain text only.`;

	const keys = getGeminiKeys();
	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.6, maxOutputTokens: 130 },
					}),
					signal: AbortSignal.timeout(12000),
				},
			);
			if (!res.ok) continue;
			const data = await res.json() as {
				candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
			};
			const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
			if (!text) continue;
			await cacheSet(cacheKey, text, 24 * 60 * 60 * 1000);
			return text;
		} catch {
			continue;
		}
	}

	return buildPersonalizedImpact(tagScores, mood);
}

interface DeckDef {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	color: "green" | "purple" | "blue";
	bars?: boolean;
}

// Primary deck shown in "Today's Focus" — varies by mood AND session window.
// decks[1] and decks[2] stay from MOOD_DECKS for any future multi-deck use.
const SESSION_PRIMARY_DECKS: Record<Mood, Record<Session, DeckDef>> = {
	Bullish: {
		open:   { id: "momentum",   title: "What's Rising Today",  subtitle: "Stocks gaining as markets open",          icon: "trending_up", color: "green"  },
		midday: { id: "leaders",    title: "Still Climbing",       subtitle: "What's kept going since the open",        icon: "zap",         color: "blue"   },
		close:  { id: "winners",    title: "Today's Winners",      subtitle: "What rallied today — and why it matters", icon: "trending_up", color: "green"  },
	},
	Bearish: {
		open:   { id: "defensive",  title: "Play It Safe Today",   subtitle: "Safer picks as markets open lower",       icon: "shield",      color: "purple" },
		midday: { id: "dip_watch",  title: "Stocks on Sale",       subtitle: "Good companies at lower prices",          icon: "trending_up", color: "green"  },
		close:  { id: "bounce",     title: "Bounce-Back Watch",    subtitle: "Stocks to keep an eye on tomorrow",       icon: "book",        color: "blue",  bars: true },
	},
	Cautious: {
		open:   { id: "quality",    title: "Strong Foundations",   subtitle: "Companies built to handle uncertainty",   icon: "book",        color: "blue",  bars: true },
		midday: { id: "movers",     title: "Pushing Through",      subtitle: "What's holding up despite the jitters",  icon: "zap",         color: "blue"   },
		close:  { id: "overnight",  title: "Tomorrow's Watchlist", subtitle: "What to keep an eye on when we reopen",  icon: "shield",      color: "purple" },
	},
	Volatile: {
		open:   { id: "conviction", title: "Big Movers Today",     subtitle: "Stocks making the biggest early moves",  icon: "zap",         color: "blue"   },
		midday: { id: "swings",     title: "What's Swinging",      subtitle: "The biggest moves happening right now",  icon: "trending_up", color: "green"  },
		close:  { id: "stabilize",  title: "After the Storm",      subtitle: "Calmer picks after a wild day",          icon: "shield",      color: "purple" },
	},
	Calm: {
		open:   { id: "steady",     title: "Low-Drama Picks",      subtitle: "Solid stocks for a quiet open",          icon: "sun",         color: "green"  },
		midday: { id: "gems",       title: "Under the Radar",      subtitle: "Stocks worth a look on a quiet day",     icon: "book",        color: "blue",  bars: true },
		close:  { id: "growers",    title: "Steady Growers",       subtitle: "Stocks that grow consistently over time", icon: "sun",        color: "green"  },
	},
	Mixed: {
		open:   { id: "spread",     title: "Something for Everyone",subtitle: "A spread of picks for any direction",   icon: "book",        color: "blue",  bars: true },
		midday: { id: "rotation",   title: "Who's Winning Today",  subtitle: "The sectors and stocks leading right now",icon: "trending_up", color: "green" },
		close:  { id: "balance",    title: "Wrap It Up",           subtitle: "End-of-day picks to carry into tomorrow",icon: "shield",      color: "purple" },
	},
	"Risk-On": {
		open:   { id: "high_growth", title: "Growth in Focus",     subtitle: "Tech and growth names leading today",    icon: "zap",         color: "blue"   },
		midday: { id: "momentum",    title: "Risk-On Rally",       subtitle: "What's climbing as investors lean in",   icon: "trending_up", color: "green"  },
		close:  { id: "leaders",     title: "Today's Growth Leaders",subtitle: "What drove the risk-on session",       icon: "trending_up", color: "green"  },
	},
	"Risk-Off": {
		open:   { id: "defensive",   title: "Playing Defense",     subtitle: "Safer picks as growth faces pressure",   icon: "shield",      color: "purple" },
		midday: { id: "quality",     title: "Defensive Hold",      subtitle: "What's holding up in a risk-off day",   icon: "book",        color: "blue",  bars: true },
		close:  { id: "dividend",    title: "Safety First",        subtitle: "Steadier picks after a risk-off session", icon: "sun",        color: "blue"   },
	},
};

const MOOD_DECKS: Record<Mood, DeckDef[]> = {
	Bullish: [
		{ id: "high_growth",   title: "High Growth",      subtitle: "Riding the momentum",          icon: "trending_up", color: "green"  },
		{ id: "consumer_tech", title: "Consumer Tech",    subtitle: "Where spending is going",       icon: "zap",         color: "blue"   },
		{ id: "explore",       title: "Explore the Rally",subtitle: "See what's leading today",      icon: "book",        color: "purple", bars: true },
	],
	Bearish: [
		{ id: "defensive",     title: "Defensive Picks",  subtitle: "Stability when it matters",    icon: "shield",      color: "purple" },
		{ id: "dividend",      title: "Dividend Stocks",  subtitle: "Earn while you wait",           icon: "sun",         color: "blue",   bars: true },
		{ id: "value",         title: "Buying the Dip",   subtitle: "Quality at a discount",         icon: "trending_up", color: "green"  },
	],
	Cautious: [
		{ id: "defensive",     title: "Defensive Picks",  subtitle: "Stability in uncertain times",  icon: "shield",      color: "purple" },
		{ id: "quality",       title: "Quality Stocks",   subtitle: "Strong fundamentals only",      icon: "book",        color: "blue",   bars: true },
		{ id: "dividend",      title: "Income Plays",     subtitle: "Steady cash, less drama",       icon: "sun",         color: "green"  },
	],
	Volatile: [
		{ id: "high_growth",   title: "High Conviction",  subtitle: "Worth the volatility",          icon: "zap",         color: "blue"   },
		{ id: "defensive",     title: "Lower Your Risk",  subtitle: "Defensive names today",         icon: "shield",      color: "purple" },
		{ id: "explore",       title: "Understand Swings",subtitle: "Why markets move like this",    icon: "book",        color: "green",  bars: true },
	],
	Calm: [
		{ id: "explore",       title: "Discover New Picks",subtitle: "Explore what you haven't tried",icon: "sun",        color: "blue"   },
		{ id: "dividend",      title: "Income Stocks",    subtitle: "Steady growers for calm days",  icon: "book",        color: "green",  bars: true },
		{ id: "defensive",     title: "Blue Chips",       subtitle: "Reliable names, quiet day",     icon: "shield",      color: "purple" },
	],
	Mixed: [
		{ id: "diversified",   title: "Diversified Picks",subtitle: "Spread across sectors",         icon: "book",        color: "blue",   bars: true },
		{ id: "high_growth",   title: "Growth Watch",     subtitle: "Who's still climbing",          icon: "trending_up", color: "green"  },
		{ id: "defensive",     title: "Defensive Blend",  subtitle: "Balance for mixed signals",     icon: "shield",      color: "purple" },
	],
	"Risk-On": [
		{ id: "high_growth",   title: "High Growth",      subtitle: "Riding the risk-on momentum",   icon: "zap",         color: "blue"   },
		{ id: "consumer_tech", title: "Consumer Tech",    subtitle: "Where risk appetite is going",  icon: "trending_up", color: "green"  },
		{ id: "explore",       title: "Explore Growth",   subtitle: "See what's leading the charge", icon: "book",        color: "purple", bars: true },
	],
	"Risk-Off": [
		{ id: "defensive",     title: "Defensive Picks",  subtitle: "Stability when risk is off",    icon: "shield",      color: "purple" },
		{ id: "dividend",      title: "Dividend Stocks",  subtitle: "Earn while playing defense",    icon: "sun",         color: "blue",   bars: true },
		{ id: "quality",       title: "Quality Names",    subtitle: "Strong fundamentals in focus",  icon: "book",        color: "green"  },
	],
};

// GET /api/daily-brief
dailyBriefRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;

		// Fetch major indices + VIX + sectors in parallel
		const [spyDp, qqqDp, diaDp, iwmDp, vixDp, userSnap, ...sectorChanges] = await Promise.all([
			getQuoteChange("SPY"),
			getQuoteChange("QQQ"),
			getQuoteChange("DIA"),
			getQuoteChange("IWM"),   // Russell 2000
			getQuoteChange("VIX"),   // VIX
			adminDb.collection("users").doc(uid).get(),
			...SECTOR_ETFS.map(s => getQuoteChange(s)),
		]);

		// Build sector summary
		let sectorsGreen = 0, sectorsRed = 0;
		let topSectorSymbol: string | null = null, worstSectorSymbol: string | null = null;
		let topVal = -Infinity, worstVal = Infinity;
		SECTOR_ETFS.forEach((sym, i) => {
			const pct = sectorChanges[i] as number | null;
			if (pct === null) return;
			if (pct > 0) sectorsGreen++;
			else if (pct < 0) sectorsRed++;
			if (pct > topVal) { topVal = pct; topSectorSymbol = sym; }
			if (pct < worstVal) { worstVal = pct; worstSectorSymbol = sym; }
		});
		const topSector = topSectorSymbol ? SECTOR_NAMES[topSectorSymbol] ?? topSectorSymbol : null;
		const worstSector = worstSectorSymbol ? SECTOR_NAMES[worstSectorSymbol] ?? worstSectorSymbol : null;

		const marketData: MarketData = { spyDp, qqqDp, diaDp, iwmDp, vixDp, sectorsGreen, sectorsRed, topSector, worstSector };
		const mood = classifyMood(marketData);
		const session = getMarketSession();
		const tagScores: Record<string, number> = (userSnap.data()?.tagScores as Record<string, number>) ?? {};
		const stakBrandIds: string[] = (userSnap.data()?.stakBrandIds as string[]) ?? [];

		const [{ moodExplanation, plainEnglish }, personalizedImpact] = await Promise.all([
			generateMarketText(mood, session, spyDp, qqqDp, diaDp, vixDp, sectorsGreen, sectorsRed, topSector, worstSector),
			generatePersonalizedImpact(tagScores, stakBrandIds, mood, session, spyDp, qqqDp, uid),
		]);

		const decks = [SESSION_PRIMARY_DECKS[mood][session], ...MOOD_DECKS[mood].slice(1)];

		res.json({
			mood,
			session,
			moodExplanation,
			plainEnglish,
			personalizedImpact,
			decks,
			marketSnapshot: {
				spyChange: spyDp, qqqChange: qqqDp, diaChange: diaDp,
				iwmChange: iwmDp, vixChange: vixDp,
				sectorsGreen, sectorsRed, topSector, worstSector,
			},
			generatedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error generating daily brief:", error);
		res.status(500).json({ error: "Failed to generate daily brief" });
	}
});

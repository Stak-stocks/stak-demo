// Single source of truth for classifying US market mood from index/VIX/sector-breadth
// data. recommendations.ts and dailyBrief.ts used to independently implement two
// different mood models (a crude SPY/QQQ-average version and this richer one) — keep
// this the only place the algorithm lives. Moved verbatim out of dailyBrief.ts with
// zero logic changes.

export type Mood = "Bullish" | "Bearish" | "Cautious" | "Volatile" | "Calm" | "Mixed" | "Risk-On" | "Risk-Off";

// 11 sector ETFs — count green/red for breadth
export const SECTOR_ETFS = ["XLK", "XLF", "XLC", "XLY", "XLP", "XLV", "XLE", "XLI", "XLB", "XLRE", "XLU"];
export const SECTOR_NAMES: Record<string, string> = {
	XLK: "Technology", XLF: "Financials", XLC: "Communication", XLY: "Consumer Discretionary",
	XLP: "Consumer Staples", XLV: "Healthcare", XLE: "Energy", XLI: "Industrials",
	XLB: "Materials", XLRE: "Real Estate", XLU: "Utilities",
};

export interface MarketData {
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

export function classifyMood(d: MarketData): Mood {
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

export interface DeckDef {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	color: "green" | "purple" | "blue";
	bars?: boolean;
}

// Theme-id deck shown per mood (used both for dailyBrief.ts's actual Discover decks
// and for recommendations.ts's dailyBriefThemeBoost — derive ids from here instead of
// hand-copying a second id-only list, so the two can't drift apart).
export const MOOD_DECKS: Record<Mood, DeckDef[]> = {
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

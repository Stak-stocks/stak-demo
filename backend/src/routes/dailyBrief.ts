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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getNextTradingDayLabel(fromDayNum: number): string {
	let nextDayNum = (fromDayNum + 1) % 7;
	let daysAhead = 1;
	while (nextDayNum === 0 || nextDayNum === 6) {
		nextDayNum = (nextDayNum + 1) % 7;
		daysAhead++;
	}
	return daysAhead === 1 ? "tomorrow" : DAY_NAMES[nextDayNum];
}

function getMarketStatus(): { session: Session; marketClosed: boolean; dayLabel: string; nextTradingDayLabel: string } {
	const now = new Date();
	const etDayName = now.toLocaleString("en-US", { weekday: "long", timeZone: "America/New_York" });
	const etDayNum  = DAY_NAMES.indexOf(etDayName); // 0=Sun, 6=Sat
	const etHour = parseInt(now.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/New_York" }), 10);
	const etMin  = parseInt(now.toLocaleString("en-US", { minute: "2-digit",               timeZone: "America/New_York" }), 10);
	const total  = etHour * 60 + etMin;
	const nextTradingDayLabel = getNextTradingDayLabel(etDayNum);

	const isWeekend = etDayNum === 0 || etDayNum === 6;
	if (isWeekend) {
		return { session: "close", marketClosed: true, dayLabel: "Friday's", nextTradingDayLabel };
	}

	let session: Session;
	if (total < 12 * 60)           session = "open";
	else if (total < 15 * 60 + 30) session = "midday";
	else                           session = "close";

	return { session, marketClosed: false, dayLabel: "Today's", nextTradingDayLabel };
}

// kept for backwards compat — internal callers that only need session
function getMarketSession(): Session {
	return getMarketStatus().session;
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
		Bullish:   { moodExplanation: "Stocks moved higher today with broad strength across major indexes and low volatility.", plainEnglish: "The S&P and Nasdaq are both up today as investors lean into risk. Growth and tech names are leading — a good session to watch what's running." },
		Bearish:   { moodExplanation: "Stocks moved lower today as selling pressure spread across most sectors with VIX rising.", plainEnglish: "Markets are under pressure today with broad selling across sectors. This kind of pullback is normal — not a crash, but worth watching your risk exposure." },
		Cautious:  { moodExplanation: "Markets are holding near flat as investors wait on upcoming economic data before making bigger moves.", plainEnglish: "No big moves today — investors are in wait-and-see mode ahead of key data. Expect lower volume until a catalyst arrives." },
		Volatile:  { moodExplanation: "Stocks swung sharply today as major catalysts triggered large moves across indexes.", plainEnglish: "Big swings in both directions today — a catalyst hit and volatility spiked. Stocks in your Stak may move more than usual." },
		Calm:      { moodExplanation: "Major indexes are near flat today with low volatility and no major catalyst in play.", plainEnglish: "Markets are quiet today — no major news moving things. A good day to study fundamentals rather than react to price action." },
		Mixed:     { moodExplanation: "The market has no clear direction — growth names and value stocks are moving in opposite directions.", plainEnglish: "The broader market is split today. Some sectors are up while others pull back — what you own matters more than the overall index direction." },
		"Risk-On": { moodExplanation: "Investors are leaning into growth today with tech, AI, and higher-upside names outperforming.", plainEnglish: "It's a risk-on session — growth and tech stocks are getting attention while the VIX falls. Good day to watch momentum names." },
		"Risk-Off": { moodExplanation: "Investors shifted toward defensive assets today as growth and speculative stocks came under pressure.", plainEnglish: "Investors are playing defense today — riskier names are selling off while stable, dividend-paying stocks hold up better." },
	};
	return map[mood];
}

const SESSION_TONE: Record<Session, string> = {
	open:   "Markets are opening right now. Write in a forward-looking tone — what should investors watch for today?",
	midday: "Markets are mid-session. Write in a present-tense tone — how are markets trending so far today?",
	close:  "Markets are closing or have just closed. Write in a recap tone — what happened and what does it mean going forward?",
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
	marketClosed = false,
	dayLabel = "Today's",
): Promise<{ moodExplanation: string; plainEnglish: string }> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:text:v5:${mood}:${today}:${session}:${marketClosed ? "closed" : "open"}`;
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

	const etDayName = new Date().toLocaleString("en-US", { weekday: "long", timeZone: "America/New_York" });
	const etDateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

	const timeContext = marketClosed
		? "The market is closed today (weekend). This is a recap of Friday's close. Use 'on Friday' or 'at Friday's close' instead of 'today'. Write in past tense."
		: `Today is ${etDateStr}. ${SESSION_TONE[session]} Always say 'today' when referencing this session — do NOT say '${etDayName}' or reference any prior day.`;

	const timeWord = marketClosed ? "on Friday" : "today";
	const dayRef = marketClosed ? "Friday's" : dayLabel;

	const prompt = `You are writing a market brief for a stock-learning app. Young investors need specific, data-backed context — not vague descriptions.

Market data: ${snapshot || "data unavailable"}
Overall mood: ${mood}
${timeContext}

Return JSON with exactly two fields:

"moodExplanation": 1–2 sentences explaining WHAT drove markets ${timeWord}. Reference the actual numbers. Be specific — name sectors, mention the S&P/Nasdaq actual % move, VIX if notable. Do NOT say "today" if the market is closed — use "on Friday" instead. Max 140 chars.

"plainEnglish": 2 short sentences. Sentence 1: what happened with specific context (move size, sector, why — e.g. yields, geopolitics, earnings). Sentence 2: what this means for someone watching their stocks heading into the next session. Do NOT say "today" if the market is closed. Max 180 chars total.

Example moodExplanation (closed): "The S&P 500 fell ${spyDp != null ? Math.abs(spyDp) + "%" : "on Friday"} on Friday as ${worstSector ?? "growth"} stocks sold off, with the Nasdaq leading the decline."
Example plainEnglish (closed): "${dayRef} drop was driven by ${worstSector ?? "rate-sensitive"} weakness and rising bond yields. Heading into next week, watch for follow-through selling in tech."

No financial advice. No disclaimers. Just describe what happened clearly.`;

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
	market: MarketData,
	uid: string,
	marketClosed = false,
): Promise<string> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:impact:v4:${uid}:${today}:${session}:${marketClosed ? "closed" : "open"}`;
	const cached = await cacheGet<string>(cacheKey);
	if (cached) return cached;

	if (stakBrandIds.length === 0 && Object.keys(tagScores).length === 0) {
		return "Swipe on more brands to unlock personalized market insights here.";
	}

	// Look up tickers + names for top 5 staked brands, then fetch their today's move
	let stockLines: string[] = [];
	const topIds = stakBrandIds.slice(0, 5);
	if (topIds.length > 0) {
		try {
			const refs = topIds.map(id => adminDb.collection("brands").doc(id));
			const docs = await adminDb.getAll(...refs);
			const brandInfos = docs
				.filter(d => d.exists && d.data()?.ticker)
				.map(d => ({ ticker: d.data()!.ticker as string, name: d.data()!.name as string }))
				.slice(0, 4);

			if (brandInfos.length > 0) {
				const changes = await Promise.all(brandInfos.map(b => getQuoteChange(b.ticker)));
				stockLines = brandInfos.map((b, i) => {
					const c = changes[i];
					if (c === null) return null;
					return `${b.name} (${b.ticker}) ${c >= 0 ? "+" : ""}${c.toFixed(2)}%`;
				}).filter(Boolean) as string[];
			}
		} catch {
			// non-fatal
		}
	}

	// Build full market context with real numbers
	const { spyDp, qqqDp, diaDp, vixDp, sectorsGreen, sectorsRed, topSector, worstSector } = market;
	const marketLines = [
		spyDp !== null ? `S&P 500 ${spyDp >= 0 ? "+" : ""}${spyDp.toFixed(2)}%` : null,
		qqqDp !== null ? `Nasdaq ${qqqDp >= 0 ? "+" : ""}${qqqDp.toFixed(2)}%` : null,
		diaDp !== null ? `Dow ${diaDp >= 0 ? "+" : ""}${diaDp.toFixed(2)}%` : null,
		vixDp !== null ? `VIX ${vixDp >= 0 ? "+" : ""}${vixDp.toFixed(1)}%` : null,
		(sectorsGreen !== null && sectorsRed !== null) ? `${sectorsGreen}/11 sectors green` : null,
		topSector ? `Leading: ${topSector}` : null,
		worstSector && worstSector !== topSector ? `Lagging: ${worstSector}` : null,
	].filter(Boolean).join(" | ");

	// Fallback to tag interests if no stock data
	const topTags = Object.entries(tagScores)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([tag]) => TAG_LABELS[tag] ?? tag.replace(/_/g, " "));

	const etDayNameImpact = new Date().toLocaleString("en-US", { weekday: "long", timeZone: "America/New_York" });

	const stockSection = stockLines.length > 0
		? `User's stocks ${marketClosed ? "at Friday's close" : `at ${etDayNameImpact}'s close`}: ${stockLines.join(", ")}`
		: topTags.length > 0
			? `User's top interests: ${topTags.join(", ")}`
			: "User hasn't saved stocks yet";

	const timeWord = marketClosed ? "on Friday" : "today";
	const actionWord = marketClosed ? "watch for when markets reopen" : "watch or act on today";

	const prompt = `You are writing the "Why this matters to you" section of a daily market brief inside the STAK investing app (Gen Z/millennial audience).

${marketClosed ? "Friday's close" : `${etDayNameImpact}'s close`} market data:
${marketLines || "unavailable"}

${stockSection}
Mood: ${mood}

Write exactly 2 punchy sentences:
1. Pick the single most relevant stock from their list — mention it by name and reference the actual % move shown above (or its sector's move) to explain what happened to it ${timeWord}. Do NOT use the word "today" if the market is closed.
2. Give one specific, concrete thing to ${actionWord} — tied directly to the mood (${mood}) and leading/lagging sectors above.

CRITICAL RULES:
- ONLY mention stocks explicitly listed in the "${stockSection.startsWith("User's stocks") ? "User's stocks" : "User's top interests"}" section above. NEVER invent, hallucinate, or substitute other stock names (e.g. do NOT say "Apple" unless Apple is listed above).
- If the user has no stocks listed, only reference broad market or sector moves — no individual stock names.
- Use real numbers from the data, plain language, no jargon, no disclaimers, no "it's important to", don't start with "I". Max 260 characters total. Plain text only.`;

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
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.7, maxOutputTokens: 200 },
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

// ── Market Moment (macro event lesson) ───────────────────────────────────────

interface MacroCalendarEvent {
	event: string;
	actual: string | null;
	estimate: string | null;
	prev: string | null;
	impact: string;
	unit?: string;
	country: string;
}

interface MacroLesson {
	eventType: string;
	title: string;
	subtitle: string;
	emoji: string;
	cards: Array<{ heading: string; body: string }>;
	quiz: {
		question: string;
		options: Array<{ id: string; text: string }>;
		correctId: string;
		explanation: string;
	};
}

const HIGH_IMPACT_KEYWORDS = [
	"nonfarm payrolls", "unemployment rate",
	"consumer price index", "cpi",
	"personal consumption expenditure", "pce",
	"federal funds rate", "fomc",
	"gross domestic product", "gdp",
	"producer price index", "ppi",
	"retail sales", "ism manufacturing", "ism services",
	"initial jobless claims",
];

async function getTodaysMacroEvent(): Promise<MacroCalendarEvent | null> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:macro-event:v1:${today}`;
	const cached = await cacheGet<MacroCalendarEvent | null>(cacheKey);
	if (cached !== undefined && cached !== null) return cached;
	// null cached explicitly means "checked today, nothing found"
	if (cached === null) return null;

	try {
		const raw = await finnhubGet(`/calendar/economic?from=${today}&to=${today}`) as { economicCalendar?: MacroCalendarEvent[] } | null;
		const events = raw?.economicCalendar ?? [];
		const match = events.find(e =>
			e.country === "US" &&
			e.impact === "high" &&
			e.actual &&
			HIGH_IMPACT_KEYWORDS.some(kw => e.event.toLowerCase().includes(kw)),
		) ?? null;
		await cacheSet(cacheKey, match, 6 * 60 * 60 * 1000);
		return match;
	} catch {
		return null;
	}
}

async function generateMacroLesson(event: MacroCalendarEvent, spyDp: number | null, mood: string): Promise<MacroLesson | null> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:macro-lesson:v1:${today}:${event.event.replace(/\s+/g, "_")}`;
	const cached = await cacheGet<MacroLesson>(cacheKey);
	if (cached) return cached;

	const unitStr = event.unit ? ` ${event.unit}` : "";
	const beatStr = (event.estimate && event.actual)
		? (parseFloat(event.actual) > parseFloat(event.estimate) ? "beat" : parseFloat(event.actual) < parseFloat(event.estimate) ? "missed" : "matched")
		: null;

	const prompt = `You are writing a short market education lesson for STAK, a stock-learning app for Gen Z and millennials.

Today's major US economic release:
- Event: ${event.event}
- Actual: ${event.actual}${unitStr}
- Estimate: ${event.estimate ?? "N/A"}${unitStr}
- Previous: ${event.prev ?? "N/A"}${unitStr}
${beatStr ? `- Result: ${beatStr} expectations` : ""}
- S&P 500 today: ${spyDp != null ? (spyDp >= 0 ? "+" : "") + spyDp + "%" : "unknown"}
- Market mood: ${mood}

Write a 3-card lesson that teaches a beginner WHY this economic data matters for stocks. Focus on cause-and-effect, not just the number.

Return JSON with this exact shape:
{
  "eventType": "jobs" | "inflation" | "fed" | "gdp" | "ppi" | "retail" | "pmi" | "other",
  "title": "max 7 words, e.g. 'What Today's Jobs Report Means'",
  "subtitle": "one hook sentence, max 12 words, e.g. 'Strong hiring just shifted market expectations — here's why'",
  "emoji": "single relevant emoji",
  "cards": [
    { "heading": "What Just Happened", "body": "2-3 sentences. State the actual number vs estimate and last period. Note the immediate market reaction." },
    { "heading": "Why It Moves Markets", "body": "2-3 sentences. Explain the mechanism in plain English. E.g. for jobs: strong hiring → Fed worries about inflation → may keep rates high → growth stocks get hit because future earnings are worth less at higher discount rates." },
    { "heading": "What to Watch Now", "body": "2-3 sentences. Name 1-2 sectors or asset types most affected by this specific release. Explain why in simple terms." }
  ],
  "quiz": {
    "question": "test the cause-and-effect mechanism, not the number itself",
    "options": [
      { "id": "a", "text": "..." },
      { "id": "b", "text": "..." },
      { "id": "c", "text": "..." }
    ],
    "correctId": "a" | "b" | "c",
    "explanation": "2 sentences — why correct answer is right, why the others are wrong"
  }
}

Tone: confident, plain English, no jargon without explanation. No financial advice. No disclaimers.`;

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
					signal: AbortSignal.timeout(15000),
				},
			);
			if (!res.ok) continue;
			const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
			const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!text) continue;
			const parsed = JSON.parse(text) as MacroLesson;
			if (parsed.title && parsed.cards?.length === 3 && parsed.quiz?.question) {
				await cacheSet(cacheKey, parsed, 24 * 60 * 60 * 1000);
				return parsed;
			}
		} catch {
			continue;
		}
	}
	return null;
}

// ── Deck definitions ──────────────────────────────────────────────────────────

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
		const { session, marketClosed, dayLabel, nextTradingDayLabel } = getMarketStatus();
		const tagScores: Record<string, number> = (userSnap.data()?.tagScores as Record<string, number>) ?? {};
		const stakBrandIds: string[] = (userSnap.data()?.stakBrandIds as string[]) ?? [];

		const [{ moodExplanation, plainEnglish }, personalizedImpact, macroEvent] = await Promise.all([
			generateMarketText(mood, session, spyDp, qqqDp, diaDp, vixDp, sectorsGreen, sectorsRed, topSector, worstSector, marketClosed, dayLabel),
			generatePersonalizedImpact(tagScores, stakBrandIds, mood, session, marketData, uid, marketClosed),
			getTodaysMacroEvent(),
		]);

		const macroLesson = macroEvent ? await generateMacroLesson(macroEvent, spyDp, mood) : null;

		const decks = [SESSION_PRIMARY_DECKS[mood][session], ...MOOD_DECKS[mood].slice(1)];

		res.json({
			mood,
			session,
			dayLabel,
			marketClosed,
			nextTradingDayLabel,
			moodExplanation,
			plainEnglish,
			personalizedImpact,
			decks,
			...(macroLesson ? { macroLesson } : {}),
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

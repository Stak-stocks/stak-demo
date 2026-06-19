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

async function searchMarketDrivers(today: string, marketClosed: boolean): Promise<string | null> {
	const cacheKey = `daily-brief:drivers:v1:${today}`;
	const cached = await cacheGet<string>(cacheKey);
	if (cached) return cached;

	if (marketClosed) return null;

	const prompt = `Search the web for what is driving US stock markets today (${today}). Look for:
- Federal Reserve / FOMC rate decisions or statements
- Economic data releases with actual numbers (CPI, PCE, jobs/nonfarm payrolls, GDP, PPI, retail sales, ISM, jobless claims)
- Major earnings reports from large-cap companies with results vs estimates
- Geopolitical events, tariffs, or trade news affecting markets
- Oil, bond yields, or currency moves causing broad market shifts

Return a factual 3-4 sentence paragraph summarising the 1-3 most significant things happening today. Include real numbers where available (e.g. "CPI came in at 3.1% vs 3.0% expected"). Plain text only, no markdown. If markets are closed or nothing significant is happening, return an empty string.`;

	const keys = getGeminiKeys();
	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tools: [{ google_search: {} }],
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.2 },
					}),
					signal: AbortSignal.timeout(20000),
				},
			);
			if (!res.ok) continue;
			const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
			const text = data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text?.trim();
			if (!text) continue;
			await cacheSet(cacheKey, text, 6 * 60 * 60 * 1000);
			return text;
		} catch {
			continue;
		}
	}
	return null;
}

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
	marketDrivers: string | null = null,
): Promise<{ moodExplanation: string; plainEnglish: string }> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:text:v6:${mood}:${today}:${session}:${marketClosed ? "closed" : "open"}`;
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
	const driversSection = marketDrivers ? `\nWhat's driving markets ${timeWord} (from live search):\n${marketDrivers}` : "";

	const prompt = `You are writing a market brief for a stock-learning app. Young investors need specific, data-backed context — not vague descriptions.

Market data: ${snapshot || "data unavailable"}
Overall mood: ${mood}
${timeContext}${driversSection}

Return JSON with exactly two fields:

"moodExplanation": 1–2 sentences explaining WHAT drove markets ${timeWord}. Use the live driver info above to name the real reason (e.g. Fed decision, CPI miss, earnings). Reference actual numbers. Max 140 chars.

"plainEnglish": 2 short sentences. Sentence 1: what happened and WHY — use the real driver from above if available (e.g. "CPI came in hotter than expected, pushing the S&P down 1.2%"). Sentence 2: what this means for someone watching their stocks heading into the next session. Max 180 chars total.

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
	marketDrivers: string | null = null,
): Promise<string> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `daily-brief:impact:v6:${uid}:${today}:${session}:${marketClosed ? "closed" : "open"}`;
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
	const driversLine = marketDrivers ? `\nWhat's driving markets ${timeWord} (from live search):\n${marketDrivers}\n` : "";

	const prompt = `You are writing the "Why this matters to you" section of a daily market brief inside the STAK investing app (Gen Z/millennial audience).

${marketClosed ? "Friday's close" : `${etDayNameImpact}'s close`} market data:
${marketLines || "unavailable"}
${driversLine}
${stockSection}
Mood: ${mood}

Write exactly 2 punchy sentences:
1. Pick the single most relevant stock from their list — mention it by name, connect it to the real driver above if available (e.g. "With the Fed holding rates, growth stocks like NVDA face continued pressure"), and reference the actual % move. Do NOT use the word "today" if the market is closed.
2. Give one specific, concrete thing to ${actionWord} — tied directly to the mood (${mood}), the real driver above, and leading/lagging sectors.

CRITICAL RULES:
- ONLY mention stocks explicitly listed in the "${stockSection.startsWith("User's stocks") ? "User's stocks" : "User's top interests"}" section above. NEVER invent, hallucinate, or substitute other stock names.
- If the user has no stocks listed, only reference broad market or sector moves — no individual stock names.
- Use real numbers from the data, plain language, no jargon, no disclaimers, no "it's important to", don't start with "I". Max 280 characters total.
- Plain text only — NO markdown, NO asterisks, NO bold, NO formatting of any kind.`;

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

// ── Market lesson (standalone, for Playground Featured) ──────────────────────

interface MarketLessonResponse {
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

interface LessonHistoryEntry { eventType: string; title: string; angle: string; completedAt?: number; date?: string }

async function generateMarketLesson(userHistory: LessonHistoryEntry[]): Promise<MarketLessonResponse | null> {
	const today = new Date().toISOString().split("T")[0];
	const cacheKey = `playground:market-lesson:v1:${today}`;
	const cached = await cacheGet<MarketLessonResponse | { empty: true }>(cacheKey);
	if (cached !== null) {
		if ("empty" in (cached as object)) return null;
		return cached as MarketLessonResponse;
	}

	// Take the 20 most recent entries by completedAt (most recent first)
	const history = [...userHistory]
		.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
		.slice(0, 20);

	const historyBlock = history.length > 0
		? `\nThis user's personal lesson history (DO NOT repeat the same angle — always teach something new):\n${history.map(h => `- "${h.title}" [${h.eventType}] — angle: ${h.angle}`).join("\n")}\n`
		: "";

	const prompt = `You are writing a featured Market Lesson for STAK, a stock-learning app for Gen Z and millennials. Today is ${today}.
${historyBlock}
Search the web for the single most significant market-moving event from the past 2 days. Priority order:
1. Federal Reserve / FOMC rate decisions or statements
2. Major economic data releases with actual numbers (CPI, PCE, jobs, GDP)
3. Major earnings that surprised the market
4. Significant geopolitical or trade events affecting markets

If the event is the same type as a recently taught lesson above, cover a DIFFERENT angle — go one level deeper, zoom out to the broader mechanism, or explore a sector/stock-type implication not covered before. The lesson structure (3 cards + quiz) must always teach something new.

Build a 3-card educational lesson that teaches a beginner WHY this matters for their stocks. Focus on cause-and-effect.

Return ONLY a JSON object (no markdown, no code fences):
{
  "eventType": "fed" | "inflation" | "jobs" | "gdp" | "ppi" | "retail" | "earnings" | "geopolitical" | "other",
  "angle": "one short phrase describing the specific angle of this lesson — e.g. 'how rate expectations affect bond yields' or 'why tech valuations fall when rates stay high'",
  "title": "7 words max — e.g. 'What the Fed's Rate Hold Means'",
  "subtitle": "One hook sentence, max 12 words — e.g. 'Rates stayed put. Here's why that still moves your stocks.'",
  "emoji": "single relevant emoji",
  "cards": [
    {
      "heading": "What Happened",
      "body": "2-3 sentences. State exactly what happened with real numbers. When did it happen? What was the decision/number vs what was expected?"
    },
    {
      "heading": "Why It Moves Stocks",
      "body": "2-3 sentences. Explain the cause-and-effect chain in plain English. Use arrows: e.g. 'Higher rates → borrowing costs rise → growth stocks get hit because future profits are worth less today.'"
    },
    {
      "heading": "What to Watch",
      "body": "2-3 sentences. Name 1-2 sectors or stock types most affected and explain why in simple terms. What should a young investor keep an eye on next?"
    }
  ],
  "quiz": {
    "question": "Test the mechanism, not the headline fact — and not a question covered in previous lessons listed above",
    "options": [
      { "id": "a", "text": "..." },
      { "id": "b", "text": "..." },
      { "id": "c", "text": "..." }
    ],
    "correctId": "a" | "b" | "c",
    "explanation": "2 sentences — why the correct answer is right, and why the others miss the point"
  }
}

If nothing significant happened in the past 2 days, return: { "empty": true }

Tone: confident, plain English, no jargon without a quick explanation. No financial advice. No disclaimers.`;

	const keys = getGeminiKeys();
	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tools: [{ google_search: {} }],
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.3 },
					}),
					signal: AbortSignal.timeout(30000),
				},
			);
			if (!res.ok) continue;
			const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
			const text = data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
			if (!text) continue;
			const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
			const parsed = JSON.parse(jsonStr) as MarketLessonResponse & { empty?: boolean; angle?: string };
			if (parsed.empty) {
				await cacheSet(cacheKey, { empty: true }, 6 * 60 * 60 * 1000);
				return null;
			}
			if (parsed.title && parsed.cards?.length === 3 && parsed.quiz?.question) {
				await cacheSet(cacheKey, parsed, 12 * 60 * 60 * 1000);
				return parsed;
			}
		} catch {
			continue;
		}
	}
	return null;
}

// GET /api/daily-brief/market-lesson
dailyBriefRouter.get("/market-lesson", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const userSnap = await adminDb.collection("users").doc(uid).get();
		const userHistory: LessonHistoryEntry[] = (userSnap.data()?.marketLessonHistory as LessonHistoryEntry[] | undefined) ?? [];
		const lesson = await generateMarketLesson(userHistory);
		if (!lesson) { res.json({ lesson: null }); return; }
		res.json({ lesson });
	} catch {
		res.json({ lesson: null });
	}
});

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

		const today = new Date().toISOString().split("T")[0];
		const marketDrivers = await searchMarketDrivers(today, marketClosed);

		const [{ moodExplanation, plainEnglish }, personalizedImpact] = await Promise.all([
			generateMarketText(mood, session, spyDp, qqqDp, diaDp, vixDp, sectorsGreen, sectorsRed, topSector, worstSector, marketClosed, dayLabel, marketDrivers),
			generatePersonalizedImpact(tagScores, stakBrandIds, mood, session, marketData, uid, marketClosed, marketDrivers),
		]);

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

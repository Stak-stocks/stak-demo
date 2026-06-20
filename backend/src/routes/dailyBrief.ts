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

async function fetchMarketStatus(): Promise<{ isOpen: boolean; holiday: string | null }> {
	const cacheKey = "market-status:us";
	const cached = await cacheGet<{ isOpen: boolean; holiday: string | null }>(cacheKey);
	if (cached) return cached;

	try {
		const keys = getFinnhubKeys();
		for (const key of keys) {
			const res = await fetch(`${FINNHUB_BASE}/stock/market-status?exchange=US&token=${key}`);
			if (!res.ok) continue;
			const data = await res.json() as { isOpen?: boolean; holiday?: string | null };
			if (typeof data.isOpen === "boolean") {
				const result = { isOpen: data.isOpen, holiday: data.holiday ?? null };
				// Cache for 10 min — short enough to catch intraday open/close transitions
				await cacheSet(cacheKey, result, 10 * 60 * 1000);
				return result;
			}
		}
	} catch { /* fall through to weekend check */ }

	return { isOpen: false, holiday: null };
}

// Walks forward from etDateStr until it finds a day that is not a weekend or holiday.
async function getNextTradingDayLabel(etDateStr: string): Promise<string> {
	const holidays = await fetchMarketHolidays();
	for (let daysAhead = 1; daysAhead <= 10; daysAhead++) {
		const d = new Date(etDateStr + "T12:00:00Z");
		d.setUTCDate(d.getUTCDate() + daysAhead);
		const dayNum = d.getUTCDay();
		if (dayNum === 0 || dayNum === 6) continue;
		const dateStr = d.toISOString().split("T")[0];
		if (holidays.has(dateStr)) continue;
		return daysAhead === 1 ? "tomorrow" : DAY_NAMES[dayNum];
	}
	return "tomorrow";
}

// Algorithmic fallback: computes NYSE holidays for any year from exchange rules.
// Used when Gemini is unavailable (local dev without API keys).
function computeNYSEHolidays(year: number): Set<string> {
	const fmt = (d: Date) => d.toISOString().split("T")[0];

	function observed(month: number, day: number): Date {
		const d = new Date(Date.UTC(year, month - 1, day));
		const dow = d.getUTCDay();
		if (dow === 6) d.setUTCDate(d.getUTCDate() - 1); // Sat → Fri
		if (dow === 0) d.setUTCDate(d.getUTCDate() + 1); // Sun → Mon
		return d;
	}
	function nthWeekday(month: number, weekday: number, n: number): Date {
		const d = new Date(Date.UTC(year, month - 1, 1));
		d.setUTCDate(1 + ((weekday - d.getUTCDay() + 7) % 7) + (n - 1) * 7);
		return d;
	}
	function lastWeekday(month: number, weekday: number): Date {
		const d = new Date(Date.UTC(year, month, 0));
		d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - weekday + 7) % 7));
		return d;
	}
	function easterSunday(): Date {
		const a = year % 19, b = Math.floor(year / 100), c = year % 100;
		const d2 = Math.floor(b / 4), e = b % 4;
		const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
		const h = (19 * a + b - d2 - g + 15) % 30;
		const i = Math.floor(c / 4), k = c % 4;
		const l = (32 + 2 * e + 2 * i - h - k) % 7;
		const m = Math.floor((a + 11 * h + 22 * l) / 451);
		const mo = Math.floor((h + l - 7 * m + 114) / 31);
		const dy = ((h + l - 7 * m + 114) % 31) + 1;
		return new Date(Date.UTC(year, mo - 1, dy));
	}
	const easter = easterSunday();
	const goodFriday = new Date(Date.UTC(easter.getUTCFullYear(), easter.getUTCMonth(), easter.getUTCDate() - 2));
	return new Set([
		observed(1, 1), nthWeekday(1, 1, 3), nthWeekday(2, 1, 3), goodFriday,
		lastWeekday(5, 1), observed(6, 19), observed(7, 4),
		nthWeekday(9, 1, 1), nthWeekday(11, 4, 4), observed(12, 25),
	].map(fmt));
}

// Primary: Gemini+Search fetches the actual NYSE holiday list for the year,
// catching any unexpected market closures. Falls back to algorithmic computation.
async function fetchMarketHolidays(): Promise<Set<string>> {
	const year = new Date().getFullYear();
	const cacheKey = `market-holidays:gemini:${year}`;

	const cached = await cacheGet<string[]>(cacheKey);
	if (cached) return new Set(cached);

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
						contents: [{ parts: [{ text:
							`List every official NYSE US stock market holiday in ${year} — including any unexpected closures — as a JSON array of date strings in YYYY-MM-DD format. Return ONLY the JSON array, no explanation, no markdown fences.`
						}] }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0 },
					}),
					signal: AbortSignal.timeout(15000),
				},
			);
			if (!res.ok) continue;
			const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
			const text = data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text?.trim() ?? "";
			const match = text.match(/\[[\s\S]*?\]/);
			if (!match) continue;
			const parsed: unknown = JSON.parse(match[0]);
			if (!Array.isArray(parsed)) continue;
			const dates = (parsed as unknown[]).filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
			if (dates.length < 5) continue; // sanity check — a valid year has at least 9 holidays
			await cacheSet(cacheKey, dates, 7 * 24 * 60 * 60 * 1000); // cache 7 days
			return new Set(dates);
		} catch { continue; }
	}

	// Fallback: compute from exchange rules (works without API keys)
	return computeNYSEHolidays(year);
}

// Walks backward from etDateStr until it finds a day that is not a weekend or holiday.
async function getLastTradingDayLabel(etDateStr: string): Promise<string> {
	const holidays = await fetchMarketHolidays();
	for (let daysBack = 1; daysBack <= 10; daysBack++) {
		const d = new Date(etDateStr + "T12:00:00Z");
		d.setUTCDate(d.getUTCDate() - daysBack);
		const dayNum = d.getUTCDay(); // 0=Sun … 6=Sat
		if (dayNum === 0 || dayNum === 6) continue;
		const dateStr = d.toISOString().split("T")[0];
		if (holidays.has(dateStr)) continue;
		return DAY_NAMES[dayNum] + "'s";
	}
	// Fallback — should never be reached
	return "Last trading day's";
}

async function getMarketStatus(): Promise<{ session: Session; marketClosed: boolean; holiday: string | null; dayLabel: string; nextTradingDayLabel: string }> {
	const now = new Date();
	const etDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
	const etDayName = now.toLocaleString("en-US", { weekday: "long", timeZone: "America/New_York" });
	const etDayNum  = DAY_NAMES.indexOf(etDayName);
	const etHour = parseInt(now.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/New_York" }), 10);
	const etMin  = parseInt(now.toLocaleString("en-US", { minute: "2-digit", timeZone: "America/New_York" }), 10);
	const total  = etHour * 60 + etMin;
	const nextTradingDayLabel = await getNextTradingDayLabel(etDateStr);

	const isWeekend = etDayNum === 0 || etDayNum === 6;

	// Fast path: skip Finnhub status API on weekends, but still need holiday list for dayLabel
	if (isWeekend) {
		const dayLabel = await getLastTradingDayLabel(etDateStr);
		return { session: "close", marketClosed: true, holiday: null, dayLabel, nextTradingDayLabel };
	}

	const { isOpen, holiday } = await fetchMarketStatus();

	if (!isOpen) {
		const dayLabel = await getLastTradingDayLabel(etDateStr);
		return { session: "close", marketClosed: true, holiday, dayLabel, nextTradingDayLabel };
	}

	let session: Session;
	if (total < 12 * 60)           session = "open";
	else if (total < 15 * 60 + 30) session = "midday";
	else                           session = "close";

	return { session, marketClosed: false, holiday: null, dayLabel: "Today's", nextTradingDayLabel };
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
	holiday: string | null = null,
): Promise<{ moodExplanation: string; plainEnglish: string }> {
	const today = new Date().toISOString().split("T")[0];
	const safeDay = dayLabel.replace(/[^a-z]/gi, "");
	const cacheKey = `daily-brief:text:v7:${mood}:${today}:${session}:${marketClosed ? "closed" : "open"}:${safeDay}`;
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

	// lastDayName: the actual last trading day (e.g. "Thursday" when Friday was a holiday)
	const lastDayName = dayLabel.replace(/'s$/, "");

	const timeContext = marketClosed
		? holiday
			? `Today is ${etDateStr} — a US market holiday (${holiday}), so markets are closed. Acknowledge the holiday by name. This is a recap of ${lastDayName}'s session. Write in past tense.`
			: `The market is closed (weekend). This is a recap of ${lastDayName}'s close. Use 'on ${lastDayName}' or 'at ${lastDayName}'s close' — never say 'today' or any other day name. Write in past tense.`
		: `Today is ${etDateStr}. ${SESSION_TONE[session]} Always say 'today' when referencing this session — do NOT say '${etDayName}' or reference any prior day.`;

	const timeWord = marketClosed ? `on ${lastDayName}` : "today";
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
	holiday: string | null = null,
	dayLabel = "Today's",
): Promise<string> {
	const today = new Date().toISOString().split("T")[0];
	const safeDay = dayLabel.replace(/[^a-z]/gi, "");
	const cacheKey = `daily-brief:impact:v7:${uid}:${today}:${session}:${marketClosed ? "closed" : "open"}:${safeDay}`;
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
	const lastDayNameImpact = dayLabel.replace(/'s$/, ""); // e.g. "Thursday's" → "Thursday"

	const lastSessionRef = marketClosed ? `${lastDayNameImpact}'s` : `${etDayNameImpact}'s`;
	const stockSection = stockLines.length > 0
		? `User's stocks at ${lastSessionRef} close: ${stockLines.join(", ")}`
		: topTags.length > 0
			? `User's top interests: ${topTags.join(", ")}`
			: "User hasn't saved stocks yet";

	const timeWord = marketClosed ? `on ${lastDayNameImpact}` : "today";
	const actionWord = marketClosed ? "watch for when markets reopen" : "watch or act on today";
	const holidayNote = holiday ? `Today is a US market holiday (${holiday}) — markets are closed.\n` : "";
	const driversLine = marketDrivers ? `\nWhat's driving markets ${timeWord} (from live search):\n${marketDrivers}\n` : "";

	const prompt = `You are writing the "Why this matters to you" section of a daily market brief inside the STAK investing app (Gen Z/millennial audience).

${holidayNote}${marketClosed ? `${lastSessionRef.charAt(0).toUpperCase() + lastSessionRef.slice(1)} close` : `${etDayNameImpact}'s close`} market data:
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

async function isTradingDay(): Promise<boolean> {
	const etDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
	const d = new Date(etDateStr + "T12:00:00Z");
	const dayNum = d.getUTCDay();
	if (dayNum === 0 || dayNum === 6) return false;
	const holidays = await fetchMarketHolidays();
	return !holidays.has(etDateStr);
}

async function generateFeaturedLesson(userHistory: LessonHistoryEntry[]): Promise<{ lesson: MarketLessonResponse; isMarketDay: boolean } | null> {
	const today = new Date().toISOString().split("T")[0];
	const marketDay = await isTradingDay();
	const cacheKey = `playground:featured-lesson:v1:${today}`;

	// 1. Redis / in-memory cache (fast path)
	const cached = await cacheGet<{ lesson: MarketLessonResponse; isMarketDay: boolean } | { empty: true }>(cacheKey);
	if (cached !== null) {
		if ("empty" in (cached as object)) return null;
		return cached as { lesson: MarketLessonResponse; isMarketDay: boolean };
	}

	// 2. Firestore fallback — survives server restarts in local dev
	try {
		const snap = await adminDb.collection("config").doc("featured-lesson").get();
		if (snap.exists) {
			const d = snap.data() as { date?: string; lesson?: MarketLessonResponse; isMarketDay?: boolean };
			if (d.date === today && d.lesson) {
				const result = { lesson: d.lesson, isMarketDay: d.isMarketDay ?? marketDay };
				await cacheSet(cacheKey, result, 12 * 60 * 60 * 1000);
				return result;
			}
		}
	} catch { /* Firestore unavailable — proceed to generate */ }

	// Take the 20 most recent entries by completedAt (most recent first)
	const history = [...userHistory]
		.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
		.slice(0, 20);

	const historyBlock = history.length > 0
		? `\nThis user's personal lesson history (DO NOT repeat the same angle — always teach something new):\n${history.map(h => `- "${h.title}" [${h.eventType}] — angle: ${h.angle}`).join("\n")}\n`
		: "";

	const prompt = marketDay
		? `You are writing a featured Market Lesson for STAK, a stock-learning app for Gen Z and millennials. Today is ${today}.
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
    { "heading": "What Happened", "body": "2-3 sentences. State exactly what happened with real numbers." },
    { "heading": "Why It Moves Stocks", "body": "2-3 sentences. Explain the cause-and-effect chain. Use arrows: e.g. 'Higher rates → borrowing costs rise → growth stocks get hit.'" },
    { "heading": "What to Watch", "body": "2-3 sentences. Name 1-2 sectors or stock types most affected." }
  ],
  "quiz": {
    "question": "Test the mechanism, not the headline fact",
    "options": [{ "id": "a", "text": "..." }, { "id": "b", "text": "..." }, { "id": "c", "text": "..." }],
    "correctId": "a" | "b" | "c",
    "explanation": "2 sentences — why the correct answer is right"
  }
}

If nothing significant happened in the past 2 days, return: { "empty": true }

Tone: confident, plain English, no jargon without a quick explanation. No financial advice. No disclaimers.`
		: `You are writing a Featured Today lesson for STAK, a stock-learning app for Gen Z and millennials. Today is ${today} — the market is closed (weekend or holiday).
${historyBlock}
Search the web for one timely concept that will help a young investor prepare for the upcoming trading week. Pick something relevant to current market themes, economic conditions, or a topic that came up in the news this week.

Examples: how to read an earnings report before a big earnings week, what a yield curve means if rates are in focus, how sector rotation works if there's been market volatility, what market sentiment indicators tell us, etc.

If the concept is the same type as a recently taught lesson above, cover a DIFFERENT angle.

Build a 3-card educational lesson that teaches a beginner investor something genuinely useful for the week ahead.

Return ONLY a JSON object (no markdown, no code fences):
{
  "eventType": "concept",
  "angle": "one short phrase describing the specific angle — e.g. 'how to interpret P/E ratios in a high-rate environment'",
  "title": "7 words max — e.g. 'Why the Yield Curve Actually Matters'",
  "subtitle": "One hook sentence, max 12 words — e.g. 'Markets are closed. Here's what to prep for Monday.'",
  "emoji": "single relevant emoji",
  "cards": [
    { "heading": "The Concept", "body": "2-3 sentences. Explain what this concept is in plain English." },
    { "heading": "Why It Matters for Your Stocks", "body": "2-3 sentences. Connect it to real stock/portfolio impact." },
    { "heading": "How to Use It", "body": "2-3 sentences. What should a young investor actually do or watch for?" }
  ],
  "quiz": {
    "question": "Test the concept, not just a definition",
    "options": [{ "id": "a", "text": "..." }, { "id": "b", "text": "..." }, { "id": "c", "text": "..." }],
    "correctId": "a" | "b" | "c",
    "explanation": "2 sentences — why the correct answer is right"
  }
}

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
				const result = { lesson: parsed, isMarketDay: marketDay };
				await cacheSet(cacheKey, result, 12 * 60 * 60 * 1000);
				adminDb.collection("config").doc("featured-lesson").set({ date: today, lesson: parsed, isMarketDay: marketDay }).catch(() => {});
				return result;
			}
		} catch {
			continue;
		}
	}
	return null;
}

// GET /api/daily-brief/featured-lesson
dailyBriefRouter.get("/featured-lesson", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const userSnap = await adminDb.collection("users").doc(uid).get();
		const userHistory: LessonHistoryEntry[] = (userSnap.data()?.featuredLessonHistory as LessonHistoryEntry[] | undefined) ?? [];
		const result = await generateFeaturedLesson(userHistory);
		if (!result) { res.json({ lesson: null }); return; }
		res.json({ lesson: result.lesson, isMarketDay: result.isMarketDay });
	} catch {
		res.json({ lesson: null });
	}
});

// ── Weekly generated lesson (per-user, per-ISO-week) ─────────────────────────

const XP_TIER_LABELS: Record<number, string> = {
	0: "Beginner",
	1: "Learner",
	2: "Investor",
	3: "Analyst",
	4: "Expert",
};

function xpToTier(xp: number): number {
	if (xp >= 7500) return 4;
	if (xp >= 3500) return 3;
	if (xp >= 1500) return 2;
	if (xp >= 500) return 1;
	return 0;
}

interface WeeklyLessonResponse {
	topic: string;
	angle: string;
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

interface WeeklyLessonHistoryEntry { topic: string; title: string; angle: string; completedAt?: number }

async function generateWeeklyLesson(uid: string, totalXp: number, userHistory: WeeklyLessonHistoryEntry[]): Promise<WeeklyLessonResponse | null> {
	const d = new Date();
	const jan4 = new Date(d.getFullYear(), 0, 4);
	const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
	const isoWeek = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

	const cacheKey = `playground:weekly-lesson:v1:${uid}:${isoWeek}`;
	const cached = await cacheGet<WeeklyLessonResponse | { empty: true }>(cacheKey);
	if (cached !== null) {
		if ("empty" in (cached as object)) return null;
		return cached as WeeklyLessonResponse;
	}

	const tier = xpToTier(totalXp);
	const tierLabel = XP_TIER_LABELS[tier]!;

	const history = [...userHistory]
		.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
		.slice(0, 15);

	const historyBlock = history.length > 0
		? `\nThis user's personal lesson history (DO NOT repeat these angles):\n${history.map(h => `- "${h.title}" [${h.topic}] — angle: ${h.angle}`).join("\n")}\n`
		: "";

	const tierGuidance: Record<number, string> = {
		0: "Absolute beginner: explain what stocks, markets, and investing are from scratch. Use simple analogies. No jargon.",
		1: "Basic knowledge: covers P/E ratios, revenue, earnings. Ready to learn about sectors, dividends, ETFs, and how to read a stock chart.",
		2: "Intermediate: understands fundamentals. Teach valuation methods (DCF basics, PEG ratio), market cycles, macro indicators, portfolio construction.",
		3: "Advanced: comfortable with valuation. Teach options basics, short selling, market microstructure, factor investing, macro-market relationships.",
		4: "Expert: teach advanced macro (yield curve, credit spreads, currency effects), derivatives strategy, or behavioral finance nuances.",
	};

	const prompt = `You are writing a personalized Weekly Deep Dive lesson for STAK, a stock-learning app for Gen Z and millennials.

User level: ${tierLabel} (${totalXp} XP)
Week: ${isoWeek}
${historyBlock}
Guidance for this level: ${tierGuidance[tier]}

Pick a specific topic that:
1. Is appropriate for the ${tierLabel} level
2. Has NOT been covered in the history above (different topic OR different angle)
3. Is highly practical — teaches something the user can directly apply when looking at their stocks

Build a 3-card educational lesson. Keep the tone conversational, plain English, relatable to a 22-year-old investor.

Return ONLY a JSON object (no markdown, no code fences):
{
  "topic": "short slug for the topic — e.g. 'pe-ratio', 'dividend-yield', 'market-cycles', 'beta', 'etf-basics'",
  "angle": "one short phrase describing the specific angle — e.g. 'why a high P/E doesn't always mean overvalued' or 'how beta predicts volatility during market crashes'",
  "title": "7 words max — e.g. 'What P/E Ratio Actually Tells You'",
  "subtitle": "One hook sentence, max 12 words",
  "emoji": "single relevant emoji",
  "cards": [
    {
      "heading": "What It Is",
      "body": "2-3 sentences. Define the concept in plain English with a concrete example."
    },
    {
      "heading": "Why It Matters",
      "body": "2-3 sentences. Explain how this affects real stock prices or investing decisions. Use arrows or cause-effect chains."
    },
    {
      "heading": "How to Use It",
      "body": "2-3 sentences. Give one practical thing the user can do with this knowledge when looking at their own stocks."
    }
  ],
  "quiz": {
    "question": "Test understanding of the mechanism, not just the definition",
    "options": [
      { "id": "a", "text": "..." },
      { "id": "b", "text": "..." },
      { "id": "c", "text": "..." }
    ],
    "correctId": "a" | "b" | "c",
    "explanation": "2 sentences — why the correct answer is right and why the others miss the point"
  }
}

Tone: confident, conversational, no financial advice, no disclaimers.`;

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
						generationConfig: {
							responseMimeType: "application/json",
							thinkingConfig: { thinkingBudget: 0 },
							temperature: 0.4,
						},
					}),
					signal: AbortSignal.timeout(25000),
				},
			);
			if (!res.ok) continue;
			const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
			const text = data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
			if (!text) continue;
			const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
			const parsed = JSON.parse(jsonStr) as WeeklyLessonResponse;
			if (parsed.topic && parsed.title && parsed.cards?.length === 3 && parsed.quiz?.question) {
				const ttl = 7 * 24 * 60 * 60 * 1000;
				await cacheSet(cacheKey, parsed, ttl);
				return parsed;
			}
		} catch {
			continue;
		}
	}
	return null;
}

// GET /api/daily-brief/weekly-lesson
dailyBriefRouter.get("/weekly-lesson", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const userSnap = await adminDb.collection("users").doc(uid).get();
		const data = userSnap.data();
		const totalXp: number = (data?.totalXp as number | undefined) ?? 0;
		const userHistory: WeeklyLessonHistoryEntry[] = (data?.weeklyLessonHistory as WeeklyLessonHistoryEntry[] | undefined) ?? [];
		const lesson = await generateWeeklyLesson(uid, totalXp, userHistory);
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
		const { session, marketClosed, holiday, dayLabel, nextTradingDayLabel } = await getMarketStatus();
		const tagScores: Record<string, number> = (userSnap.data()?.tagScores as Record<string, number>) ?? {};
		const stakBrandIds: string[] = (userSnap.data()?.stakBrandIds as string[]) ?? [];

		const today = new Date().toISOString().split("T")[0];
		const marketDrivers = await searchMarketDrivers(today, marketClosed);

		const [{ moodExplanation, plainEnglish }, personalizedImpact] = await Promise.all([
			generateMarketText(mood, session, spyDp, qqqDp, diaDp, vixDp, sectorsGreen, sectorsRed, topSector, worstSector, marketClosed, dayLabel, marketDrivers, holiday),
			generatePersonalizedImpact(tagScores, stakBrandIds, mood, session, marketData, uid, marketClosed, marketDrivers, holiday, dayLabel),
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

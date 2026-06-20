import { Router } from "express";
import { authMiddleware } from "../authMiddleware.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { getGeminiKeys } from "../services/geminiService.js";
import { adminDb } from "../firebaseAdmin.js";

export const playgroundRouter = Router();

const GEN_MODEL = "gemini-2.5-flash";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — fresh content each day

interface GeneratedBattle {
	id: string;
	tickerA: string;
	nameA: string;
	tickerB: string;
	nameB: string;
	category: string;
	metricLabel: string;
	higherWins: boolean;
	explanation: string;
	xp: number;
}

interface GeneratedEarnings {
	id: string;
	company: string;
	ticker: string;
	context: string;
	revenueExpected: string;
	epsExpected: string;
	stockContext: string;
	question: string;
	options: { id: string; text: string }[];
	correctId: string;
	outcome: string;
	explanation: string;
	xp: number;
}

interface GeneratedRisk {
	id: string;
	prompt: string;
	optionA: string;
	optionB: string;
	riskierOption: "A" | "B";
	explanation: string;
	xp: number;
}

interface GeneratedMood {
	id: string;
	event: string;
	question: string;
	options: { id: string; text: string }[];
	correctId: string;
	explanation: string;
	xp: number;
}

async function callGemini(prompt: string): Promise<string | null> {
	const keys = getGeminiKeys();
	for (const key of keys) {
		try {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${GEN_MODEL}:generateContent?key=${key}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: {
							responseMimeType: "application/json",
							temperature: 0.7,
							thinkingConfig: { thinkingBudget: 0 },
						},
					}),
				}
			);
			if (!res.ok) continue;
			const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
			const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
			if (text) return text;
		} catch {
			continue;
		}
	}
	return null;
}

/**
 * POST /api/playground/generate
 * Body: { dayKey: string, tier: number, type: "battle"|"earnings"|"risk"|"mood", count: number }
 * Returns an array of generated questions for that user+day combination.
 * Results are cached 24h per uid+dayKey+type — each user gets their own content per day.
 */
// Sanitize user-supplied strings before injecting into prompts or cache keys
function sanitizeKey(value: string): string {
	// Allow only alphanumeric, hyphen, and W (for ISO week keys like "2026-W22")
	return value.replace(/[^a-zA-Z0-9\-W]/g, "").slice(0, 20);
}

/** Strip markdown code fences Gemini occasionally emits despite responseMimeType:application/json */
function stripFences(text: string): string {
	return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

/** Parse Gemini response — handles both bare arrays and {"questions":[...]} wrappers */
function parseQuestions(raw: string): unknown[] {
	const cleaned = stripFences(raw);
	const parsed = JSON.parse(cleaned) as unknown;
	if (Array.isArray(parsed)) return parsed;
	// Handle {"questions": [...]} wrapper
	if (parsed && typeof parsed === "object" && "questions" in (parsed as object)) {
		const wrapped = (parsed as Record<string, unknown>).questions;
		if (Array.isArray(wrapped)) return wrapped;
	}
	throw new Error("Response is not an array");
}

playgroundRouter.post("/generate", authMiddleware, async (req: import("../authMiddleware.js").AuthenticatedRequest, res) => {
	const uid = req.user!.uid;
	const rawDayKey = String(req.body?.dayKey ?? new Date().toISOString().split("T")[0]);
	const rawTier = Number(req.body?.tier ?? 0);
	const rawType = String(req.body?.type ?? "");
	const rawCount = Math.min(Math.max(Number(req.body?.count ?? 3), 1), 10);

	const VALID_TYPES = ["battle", "earnings", "risk", "mood", "lesson", "drill_sentiment", "drill_nextstep"] as const;
	type ValidType = typeof VALID_TYPES[number];

	const dayKey = sanitizeKey(rawDayKey);
	const tier = Math.min(Math.max(Math.floor(rawTier), 1), 5);
	const type = VALID_TYPES.includes(rawType as ValidType) ? (rawType as ValidType) : null;

	if (!dayKey || !tier || !type) {
		res.status(400).json({ error: "dayKey, tier, type are required" });
		return;
	}

	// Per-user per-day cache — each user gets their own generated content
	const cacheKey = `playground:gen:v5:${uid}:${dayKey}:${type}`;
	const fsDocId = `${uid}_${dayKey}`;

	// 1. Redis fast path
	const cached = await cacheGet<unknown[]>(cacheKey);
	if (cached) {
		res.json({ questions: cached });
		return;
	}

	// 2. Firestore fallback — cross-device consistency, survives server restarts
	try {
		const snap = await adminDb.collection("playgroundCache").doc(fsDocId).get();
		if (snap.exists) {
			const fsData = snap.data()?.[type] as unknown[] | undefined;
			if (Array.isArray(fsData) && fsData.length > 0) {
				await cacheSet(cacheKey, fsData, CACHE_TTL_MS);
				res.json({ questions: fsData });
				return;
			}
		}
	} catch { /* Firestore unavailable — proceed to generate */ }

	const tierLabel = ["", "Beginner", "Learner", "Investor", "Analyst", "Expert"][tier] ?? "Intermediate";

	// Explicit difficulty guidance per tier — used across all prompt types
	const DIFFICULTY_GUIDE: Record<number, string> = {
		1: `BEGINNER level: Use only well-known household brands (Apple, Nike, Netflix, Tesla). Avoid jargon — explain every term in plain English. Questions should have one obviously correct answer and clearly wrong distractors. Topics: what stocks are, basic market mechanics, recognisable company names.`,
		2: `LEARNER level: Use well-known companies and introduce basic metrics (P/E ratio, revenue growth, dividend yield). One or two wrong options should be plausible to someone new. Topics: valuation basics, earnings beats/misses, sector categories, simple risk concepts.`,
		3: `INVESTOR level: Assume familiarity with P/E, EPS, revenue growth, market cap, beta. Use moderately complex scenarios with plausible distractors that require real understanding to eliminate. Topics: comparing companies on metrics, reading earnings context, sector rotation, basic macro.`,
		4: `ANALYST level: Assume solid investing knowledge. Use nuanced scenarios where multiple answers seem reasonable — only someone who deeply understands the concept can distinguish the best answer. Topics: advanced valuation, guidance vs actuals, macro impact on sectors, portfolio construction principles.`,
		5: `EXPERT level: Use sophisticated concepts and insider vocabulary. All wrong options should be credible — only an experienced investor with deep knowledge can identify the single best answer. Topics: options concepts, technical analysis signals, advanced risk models, cross-asset relationships.`,
	};

	const difficultyGuide = DIFFICULTY_GUIDE[tier] ?? DIFFICULTY_GUIDE[3]!;
	let prompt = "";

	if (type === "battle") {
		prompt = `You are generating stock battle questions for a ${tierLabel}-level investing app.
Generate ${rawCount} stock battle matchups. Each matchup compares two real publicly-traded companies on a single metric.

DAY: ${dayKey} — use this as a seed for variety. Each day must feature DIFFERENT company pairs, sectors, and metrics from any other week. Rotate across tech, healthcare, consumer, finance, energy, industrials.

DIFFICULTY REQUIREMENTS: ${difficultyGuide}

Return a JSON array of exactly ${rawCount} objects with this schema:
[{
  "id": "gen-battle-${dayKey}-1",
  "tickerA": "AAPL",
  "nameA": "Apple",
  "tickerB": "MSFT",
  "nameB": "Microsoft",
  "category": "Tech",
  "metricLabel": "Revenue Growth",
  "higherWins": true,
  "explanation": "2-3 sentences explaining BOTH companies' positions on this metric — what drives each company's number. Do NOT say which one wins.",
  "xp": ${tier <= 2 ? 5 : tier <= 3 ? 7 : tier <= 4 ? 8 : 10}
}]
Rules:
- Use companies that are genuinely comparable (same sector/industry)
- The explanation must describe BOTH companies' fundamentals on the metric — not declare a winner
- The live winner is determined by real-time data, not by the explanation
- Vary the metric each week (revenue growth, profit margin, P/E ratio, market cap, dividend yield, etc.)
- Do NOT use the same company more than once across the ${rawCount} matchups
- Only output the JSON array, nothing else`;
	} else if (type === "earnings") {
		prompt = `Generate ${rawCount} earnings lab scenarios for a ${tierLabel}-level investing education app.
Each scenario tests the user on predicting how a company's stock would react after earnings.

DAY: ${dayKey} — use this as a seed for variety. Each day must use DIFFERENT companies and earnings situations from any other week. Rotate industries: tech, retail, healthcare, finance, consumer, energy.

DIFFICULTY REQUIREMENTS: ${difficultyGuide}

Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-earn-${dayKey}-1",
  "company": "Nike",
  "ticker": "NKE",
  "context": "2-3 sentences describing the pre-earnings situation and analyst expectations.",
  "revenueExpected": "$12.4B",
  "epsExpected": "$0.84",
  "revenueActual": "$12.3B",
  "epsActual": "$0.85",
  "stockContext": "Up 8% YTD",
  "question": "Based on this setup, what do you predict will happen to Nike's stock after earnings?",
  "options": [
    {"id": "a", "text": "Up 5%+ — beats on revenue and EPS"},
    {"id": "b", "text": "Flat — meets expectations"},
    {"id": "c", "text": "Down 3-5% — misses one key metric"},
    {"id": "d", "text": "Down 10%+ — major miss and guidance cut"}
  ],
  "correctId": "c",
  "outcome": "Brief description of what happened and how the stock reacted.",
  "explanation": "2-3 sentences explaining why the market reacted this way.",
  "xp": ${tier <= 2 ? 5 : tier <= 3 ? 7 : tier <= 4 ? 8 : 10}
}]
Rules:
- Use real companies and plausible earnings scenarios
- revenueActual and epsActual must match the outcome — they should show clearly whether the company beat or missed
- The correct answer should be derivable from comparing actual vs expected numbers
- Scenarios should be educational and teach something about earnings reactions
- Do NOT use the same company more than once
- Only output the JSON array, nothing else`;
	} else if (type === "risk") {
		prompt = `Generate ${rawCount} risk identification scenarios for a ${tierLabel}-level investing education app.
Each scenario presents two investment options and asks which is riskier.

DAY: ${dayKey} — use this as a seed for variety. Each day must produce DIFFERENT companies, industries, and risk types from any other week.

DIFFICULTY REQUIREMENTS: ${difficultyGuide}

Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-risk-${dayKey}-1",
  "prompt": "Which stock carries more risk?",
  "optionA": "Procter & Gamble (PG) — consumer staples giant",
  "optionB": "A small biotech with a single drug in Phase 2 trials",
  "riskierOption": "B",
  "explanation": "2-3 sentences explaining why one option is riskier, citing specific risk factors.",
  "xp": ${tier <= 2 ? 5 : tier <= 3 ? 7 : tier <= 4 ? 8 : 10}
}]
Rules:
- Each week use DIFFERENT companies and industries — rotate across tech, healthcare, energy, retail, finance, industrials
- Vary the type of risk each scenario tests (volatility, liquidity, concentration, leverage, business model risk, regulatory risk)
- Explanations must be accurate and teach real risk concepts
- Only output the JSON array, nothing else`;
	} else if (type === "mood") {
		prompt = `Generate ${rawCount} market mood simulator scenarios for a ${tierLabel}-level investing education app.
Each scenario presents a real-world macro event and asks how markets would react.

DAY: ${dayKey} — use this as a seed for variety. Each day must cover DIFFERENT macro events and economic topics from any other week.

DIFFICULTY REQUIREMENTS: ${difficultyGuide}

Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-mood-${dayKey}-1",
  "event": "📈 The Fed signals it will pause rate hikes for the rest of the year",
  "question": "Which sector would most likely benefit from this news?",
  "options": [
    {"id": "a", "text": "Utilities — defensive income stocks"},
    {"id": "b", "text": "Real Estate (REITs) — sensitive to borrowing costs"},
    {"id": "c", "text": "Energy — commodity prices unaffected by rates"},
    {"id": "d", "text": "Financials — banks benefit from higher rates"}
  ],
  "correctId": "b",
  "explanation": "2-3 sentences explaining the macro relationship being tested.",
  "xp": ${tier <= 2 ? 5 : tier <= 3 ? 7 : tier <= 4 ? 8 : 10}
}]
Rules:
- Each day cover DIFFERENT macro themes — rotate across: Fed policy, inflation, GDP/recession, geopolitics, commodity prices, earnings seasons, currency moves, sector rotations, trade policy, consumer sentiment
- The correct answer must be grounded in real economic relationships
- Only output the JSON array, nothing else`;
	} else if (type === "lesson") {
		const CATEGORIES = ["Stock Basics", "Market Basics", "Valuation", "Earnings", "Risk", "Dividends", "Sectors"];
		const TIER_TOPICS: Record<number, string> = {
			1: "foundational concepts: what stocks are, how markets work, basic terms",
			2: "intermediate concepts: P/E ratios, revenue growth, dividends, sectors",
			3: "practical analysis: reading earnings, understanding beta, sector rotation",
			4: "advanced analysis: valuation multiples, macro factors, portfolio construction",
			5: "expert topics: options basics, technical analysis concepts, advanced risk management",
		};
		prompt = `You are generating investing education lessons for a ${tierLabel}-level student.
Generate ${rawCount} lessons covering ${TIER_TOPICS[tier] ?? "investing fundamentals"}.

DAY: ${dayKey} — use this as a seed for variety. Each day must cover DIFFERENT concepts and topics from any other week. Do not repeat lesson titles or concepts covered in recent days.

DIFFICULTY REQUIREMENTS: ${difficultyGuide}

Each lesson must cover a DIFFERENT topic. Categories available: ${CATEGORIES.join(", ")}.

Return a JSON array of exactly ${rawCount} objects with this exact schema:
[{
  "id": "gen-lesson-${dayKey}-unique-slug",
  "title": "What is Revenue Growth?",
  "subtitle": "How fast a company is growing its sales",
  "category": "Stock Basics",
  "emoji": "📈",
  "durationMin": 3,
  "xp": ${tier <= 2 ? 20 : tier <= 3 ? 28 : tier <= 4 ? 35 : 45},
  "cards": [
    { "heading": "The concept", "body": "2-3 sentence plain-English explanation." },
    { "heading": "Why it matters", "body": "Why investors care about this. Real example." },
    { "heading": "What to watch for", "body": "Practical signal or red flag to look for." }
  ],
  "quiz": {
    "question": "A clear, specific question testing understanding of the lesson.",
    "options": [
      { "id": "a", "text": "First option" },
      { "id": "b", "text": "Second option" },
      { "id": "c", "text": "Third option" }
    ],
    "correctId": "b",
    "explanation": "Why the correct answer is right, in plain English."
  }
}]

CRITICAL — before outputting, verify your own quiz answer:
Step 1: Read your question and all options.
Step 2: Determine which option is factually correct.
Step 3: Confirm correctId matches that option. Fix it if not.

Rules:
- Each lesson must be a different topic and category
- Cards must be educational, plain English, no jargon without explanation
- Quiz must have exactly one unambiguously correct answer
- correctId must be the actual correct answer — double-check the math or fact
- Only output the JSON array, nothing else`;
	} else if (type === "drill_sentiment") {
		prompt = `Generate ${rawCount} "Bullish, Bearish, or Mixed?" skill drill scenarios for a ${tierLabel}-level investing student.
Each shows a company or market event and the user classifies it.

DIFFICULTY REQUIREMENTS: ${difficultyGuide}

Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-drill-sent-1",
  "scenario": "A company reports 25% revenue growth but announces it will miss profitability targets this year.",
  "correct": "Mixed",
  "explanation": "Mixed. Growth is strong, but missing profitability targets signals the business is burning more cash than expected — investors need to weigh both signals."
}]
Rules:
- "correct" must be exactly "Bullish", "Bearish", or "Mixed"
- Scenarios must be realistic and clearly classifiable
- Explanation must teach WHY (2 sentences max)
- Vary the mix across all three labels
- Do NOT use the same scenario twice
- Only output the JSON array, nothing else`;
	} else if (type === "drill_nextstep") {
		prompt = `Generate ${rawCount} "What Should You Check Next?" skill drill scenarios for a ${tierLabel}-level investing student.
Each shows a stock situation and asks what the investor should investigate first.

DIFFICULTY REQUIREMENTS: ${difficultyGuide}

Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-drill-next-1",
  "scenario": "A company's revenue is growing 25% but gross margins are falling each quarter.",
  "question": "What should you investigate first?",
  "options": ["Whether input costs are rising structurally or temporarily", "Their employee count", "Whether they have a mascot", "Their office locations"],
  "correctIdx": 0,
  "skill": "profitability",
  "explanation": "Falling gross margins despite strong revenue growth is a quality concern. Understanding whether the cause is temporary (commodity prices) or structural (competition) determines whether this is a buying opportunity or a warning sign."
}]
Rules:
- correctIdx must ALWAYS be 0 (the first option is always correct — frontend shuffles positions)
- Include exactly 1 clearly correct option + 2 obviously irrelevant distractors (logo, employees, etc.) + 1 plausible but wrong option
- skill must be one of: valuation, growth, profitability, risk, earnings
- explanation must teach WHY this metric matters (2 sentences max)
- Only output the JSON array, nothing else`;
	}

	const raw = await callGemini(prompt);
	if (!raw) {
		res.status(503).json({ error: "Generation failed" });
		return;
	}

	try {
		const questions = parseQuestions(raw);
		// Drill types don't have an id field — use scenario/event as required field
		const isDrillType = type === "drill_sentiment" || type === "drill_nextstep";
		const valid = questions.filter(q => {
			if (!q || typeof q !== "object") return false;
			const rec = q as Record<string, unknown>;
			if (isDrillType) return typeof rec.scenario === "string"; // drill items use scenario
			return typeof rec.id === "string"; // all other types require id
		});
		if (valid.length === 0) throw new Error("No valid items in response");
		await cacheSet(cacheKey, valid, CACHE_TTL_MS);
		// Persist to Firestore for cross-device consistency
		adminDb.collection("playgroundCache").doc(fsDocId).set({ [type]: valid }, { merge: true }).catch(() => {});
		res.json({ questions: valid });
	} catch {
		res.status(500).json({ error: "Failed to parse generated content" });
	}
});

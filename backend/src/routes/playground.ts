import { Router } from "express";
import { authMiddleware } from "../authMiddleware.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { getGeminiKeys } from "../services/geminiService.js";

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
 * Body: { weekKey: string, tier: number, type: "battle"|"earnings"|"risk"|"mood", count: number }
 * Returns an array of generated questions for that week/tier combination.
 * Results are cached for 7 days per weekKey+tier+type so the same user always
 * gets identical questions within a week (deterministic).
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

playgroundRouter.post("/generate", authMiddleware, async (req, res) => {
	const rawWeekKey = String(req.body?.weekKey ?? "");
	const rawTier = Number(req.body?.tier ?? 0);
	const rawType = String(req.body?.type ?? "");
	const rawCount = Math.min(Math.max(Number(req.body?.count ?? 3), 1), 10);

	const VALID_TYPES = ["battle", "earnings", "risk", "mood"] as const;
	type ValidType = typeof VALID_TYPES[number];

	// Validate and sanitize inputs
	const weekKey = sanitizeKey(rawWeekKey);
	const tier = Math.min(Math.max(Math.floor(rawTier), 1), 5);
	const type = VALID_TYPES.includes(rawType as ValidType) ? (rawType as ValidType) : null;

	if (!weekKey || !tier || !type) {
		res.status(400).json({ error: "weekKey, tier, type are required" });
		return;
	}

	// Cache key is tier+week+type only — count excluded so level-ups don't miss cache
	const cacheKey = `playground:gen:v1:${weekKey}__t${tier}__${type}`;
	const cached = cacheGet<unknown[]>(cacheKey);
	if (cached) {
		res.json({ questions: cached });
		return;
	}

	const tierLabel = ["", "Beginner", "Learner", "Investor", "Analyst", "Expert"][tier] ?? "Intermediate";
	let prompt = "";

	if (type === "battle") {
		prompt = `You are generating stock battle questions for a ${tierLabel}-level investing app.
Generate ${rawCount} stock battle matchups. Each matchup compares two real publicly-traded companies on a single metric.
Difficulty level: ${tierLabel}.
Use real, well-known companies appropriate for a ${tierLabel} investor.
Return a JSON array of exactly ${rawCount} objects with this schema:
[{
  "id": "gen-battle-{weekKey}-{index}",
  "tickerA": "AAPL",
  "nameA": "Apple",
  "tickerB": "MSFT",
  "nameB": "Microsoft",
  "category": "Tech",
  "metricLabel": "Revenue Growth",
  "higherWins": true,
  "explanation": "Detailed 2-3 sentence explanation of why one wins, citing real business fundamentals.",
  "xp": ${tier <= 2 ? 5 : tier <= 3 ? 7 : tier <= 4 ? 8 : 10}
}]
Rules:
- Use companies that are genuinely comparable (same sector/industry)
- The explanation must be accurate and educational
- Vary the metric (revenue growth, profit margin, P/E ratio, market cap, etc.)
- Do NOT use the same company more than once across the ${rawCount} matchups
- Only output the JSON array, nothing else`;
	} else if (type === "earnings") {
		prompt = `Generate ${rawCount} earnings lab scenarios for a ${tierLabel}-level investing education app.
Each scenario tests the user on predicting how a company's stock would react after earnings.
Difficulty level: ${tierLabel}.
Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-earn-1",
  "company": "Nike",
  "ticker": "NKE",
  "context": "2-3 sentences describing the pre-earnings situation and analyst expectations.",
  "revenueExpected": "$12.4B",
  "epsExpected": "$0.84",
  "stockContext": "Up 8% YTD",
  "question": "Based on this setup, what do you predict will happen to Nike's stock after earnings?",
  "options": [
    {"id": "a", "text": "Up 5%+ — beats on revenue and EPS"},
    {"id": "b", "text": "Flat — meets expectations"},
    {"id": "c", "text": "Down 3-5% — misses one key metric"},
    {"id": "d", "text": "Down 10%+ — major miss and guidance cut"}
  ],
  "correctId": "c",
  "outcome": "What actually happened (or a plausible realistic outcome).",
  "explanation": "2-3 sentences explaining why the market reacted this way.",
  "xp": ${tier <= 2 ? 5 : tier <= 3 ? 7 : tier <= 4 ? 8 : 10}
}]
Rules:
- Use real companies and plausible earnings scenarios
- The correct answer should reflect real market behavior patterns
- Scenarios should be educational and teach something about earnings reactions
- Do NOT use the same company more than once
- Only output the JSON array, nothing else`;
	} else if (type === "risk") {
		prompt = `Generate ${rawCount} risk identification scenarios for a ${tierLabel}-level investing education app.
Each scenario presents two investment options and asks which is riskier.
Difficulty level: ${tierLabel}.
Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-risk-1",
  "prompt": "Which stock carries more risk?",
  "optionA": "Procter & Gamble (PG) — consumer staples giant",
  "optionB": "A small biotech with a single drug in Phase 2 trials",
  "riskierOption": "B",
  "explanation": "2-3 sentences explaining why one option is riskier, citing specific risk factors.",
  "xp": ${tier <= 2 ? 5 : tier <= 3 ? 7 : tier <= 4 ? 8 : 10}
}]
Rules:
- Mix easy/obvious comparisons (at ${tierLabel} level) with subtler ones
- Explanations must be accurate and teach real risk concepts
- Vary the type of risk (volatility, liquidity, concentration, leverage, etc.)
- Only output the JSON array, nothing else`;
	} else {
		// mood
		prompt = `Generate ${rawCount} market mood simulator scenarios for a ${tierLabel}-level investing education app.
Each scenario presents a real-world macro event and asks how markets would react.
Difficulty level: ${tierLabel}.
Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-mood-1",
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
- Events should be realistic macro events that actually affect markets
- The correct answer must be grounded in real economic relationships
- Vary topics: Fed, inflation, geopolitics, earnings seasons, sector rotations
- Only output the JSON array, nothing else`;
	}

	const raw = await callGemini(prompt);
	if (!raw) {
		res.status(503).json({ error: "Generation failed" });
		return;
	}

	try {
		const questions = parseQuestions(raw);
		// Minimal safety: each item must at least be an object with an id string
		const valid = questions.filter(
			q => q && typeof q === "object" && typeof (q as Record<string, unknown>).id === "string"
		);
		if (valid.length === 0) throw new Error("No valid items in response");
		cacheSet(cacheKey, valid, CACHE_TTL_MS);
		res.json({ questions: valid });
	} catch {
		res.status(500).json({ error: "Failed to parse generated content" });
	}
});

import { Router } from "express";
import { authMiddleware } from "../authMiddleware.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { getGeminiKeys, GEMINI_MODEL, geminiUrl } from "../services/geminiService.js";
import { pgQuery, pgPool, ensureUserRow } from "../lib/postgres.js";
import type { AuthenticatedRequest } from "../authMiddleware.js";
import { TIER_XP, ACTIVITY_TYPES, ACTIVITY_XP_CAP, getEasternDateKey } from "@stak/shared";
import type { TierNumber } from "@stak/shared";

export const playgroundRouter = Router();
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
	forwardGuidance: string;
	revenueExpected: string;
	epsExpected: string;
	stockContext: string;
	peRatio: string;
	stockSetupLabel: string;
	question: string;
	options: { id: string; text: string }[];
	correctId: string;
	stockMove: string;
	outcome: string;
	explanation: string;
	keyTakeaway: string;
	watchNextTime: string;
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
				geminiUrl(GEMINI_MODEL, key),
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
	const rawDayKey = String(req.body?.dayKey ?? getEasternDateKey());
	const rawTier = Number(req.body?.tier ?? 0);
	const rawType = String(req.body?.type ?? "");
	const rawCount = Math.min(Math.max(Number(req.body?.count ?? 3), 1), 10);

	const VALID_TYPES = [...ACTIVITY_TYPES, "drill_sentiment", "drill_nextstep"] as const;
	type ValidType = typeof VALID_TYPES[number];

	const dayKey = sanitizeKey(rawDayKey);
	const tier = Math.min(Math.max(Math.floor(rawTier), 1), 5) as TierNumber;
	const type = VALID_TYPES.includes(rawType as ValidType) ? (rawType as ValidType) : null;

	if (!dayKey || !tier || !type) {
		res.status(400).json({ error: "dayKey, tier, type are required" });
		return;
	}

	// Per-user per-day cache — each user gets their own generated content
	const cacheKey = `playground:gen:v8:${uid}:${dayKey}:${type}`;
	const pgType = `${type}_v8`;

	// 1. Redis fast path
	const cached = await cacheGet<unknown[]>(cacheKey);
	if (cached) {
		res.json({ questions: cached });
		return;
	}

	// 2. Postgres playground_cache fallback — cross-device consistency, survives server restarts
	try {
		const pgCached = await pgQuery<{ payload: unknown[] }>(
			`select payload from playground_cache where uid = $1 and date = $2 and type = $3`,
			[uid, dayKey, pgType],
		);
		if (pgCached.rows.length > 0 && Array.isArray(pgCached.rows[0]!.payload) && pgCached.rows[0]!.payload.length > 0) {
			await cacheSet(cacheKey, pgCached.rows[0]!.payload, CACHE_TTL_MS);
			res.json({ questions: pgCached.rows[0]!.payload });
			return;
		}
	} catch { /* Postgres unavailable — proceed to generate */ }

	// Fetch last 14 days of generated content for this user to build topic exclusion list
	let avoidLine = "";
	try {
		const cutoffDate = (() => {
			const d = new Date();
			d.setDate(d.getDate() - 14);
			return getEasternDateKey(d);
		})();
		const historyResult = await pgQuery<{ payload: unknown[] }>(
			`select payload from playground_cache where uid = $1 and type = $2 and date >= $3 order by date desc`,
			[uid, pgType, cutoffDate],
		);
		const recent: string[] = [];
		for (const row of historyResult.rows) {
			const items = row.payload;
			if (!Array.isArray(items)) continue;
			for (const item of items) {
				if (!item || typeof item !== "object") continue;
				const r = item as Record<string, unknown>;
				if (type === "lesson" && typeof r.title === "string") recent.push(r.title);
				else if (type === "battle" && typeof r.nameA === "string" && typeof r.nameB === "string")
					recent.push(`${r.nameA} vs ${r.nameB}`);
				else if (type === "earnings" && typeof r.company === "string") recent.push(r.company);
				else if (type === "risk" && typeof r.optionA === "string") recent.push(String(r.optionA).slice(0, 50));
				else if (type === "mood" && typeof r.event === "string") recent.push(String(r.event).replace(/^[^\w]*/, "").slice(0, 60));
				else if ((type === "drill_sentiment" || type === "drill_nextstep") && typeof r.scenario === "string")
					recent.push(String(r.scenario).slice(0, 60));
			}
		}
		if (recent.length > 0)
			avoidLine = `\nBANNED — you MUST NOT use any of the following recently covered companies/topics (already seen by this user — you MUST choose completely different ones): ${recent.slice(0, 30).join(", ")}. This is a hard requirement that overrides all other instructions.\n`;
	} catch { /* history unavailable — proceed without exclusions */ }

	const tierLabel = ["", "Beginner", "Learner", "Investor", "Analyst", "Expert"][tier] ?? "Intermediate";

	// Explicit difficulty guidance per tier — used across all prompt types
	const DIFFICULTY_GUIDE: Record<number, string> = {
		1: `BEGINNER level: Use only well-known household brands recognisable to everyday consumers. Avoid jargon — explain every term in plain English. Questions should have one obviously correct answer and clearly wrong distractors. Topics: what stocks are, basic market mechanics, recognisable company names.`,
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
${avoidLine}

Return a JSON array of exactly ${rawCount} objects with this schema:
[{
  "id": "gen-battle-${dayKey}-1",
  "tickerA": "COST",
  "nameA": "Costco",
  "tickerB": "WMT",
  "nameB": "Walmart",
  "category": "Retail",
  "metricLabel": "Revenue Growth",
  "higherWins": true,
  "explanation": "2-3 sentences explaining BOTH companies' positions on this metric — what drives each company's number. Do NOT say which one wins.",
  "xp": ${TIER_XP[tier]?.battle ?? 5}
}]
Rules:
- IMPORTANT: Do NOT generate a matchup using the example companies (Costco / COST or Walmart / WMT) — they are placeholders only
- Use companies that are genuinely comparable (same sector/industry)
- The explanation must describe BOTH companies' fundamentals on the metric — not declare a winner
- The live winner is determined by real-time data, not by the explanation
- Vary the metric each week (revenue growth, profit margin, P/E ratio, market cap, dividend yield, etc.)
- Do NOT use the same company more than once across the ${rawCount} matchups
- Only output the JSON array, nothing else`;
	} else if (type === "earnings") {
		prompt = `Generate ${rawCount} earnings lab scenarios for a ${tierLabel}-level investing education app.
Each scenario shows the player a company's ACTUAL earnings report (revenue/EPS actual vs. estimate) and asks them to
predict how the stock reacted. The lesson being taught is that stock reaction does NOT always track beat/miss size
1:1 — guidance, valuation, segment trends, and "priced in" expectations all matter too.

DAY: ${dayKey} — use this as a seed for variety. Each day must use DIFFERENT companies and earnings situations from any other week. Rotate industries: tech, retail, healthcare, finance, consumer, energy.
DIFFICULTY REQUIREMENTS: ${difficultyGuide}
${avoidLine}
Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-earn-${dayKey}-1",
  "company": "McDonald's",
  "ticker": "MCD",
  "context": "2-3 sentences giving real context for THIS report — segment-level trends, valuation level heading in, or analyst/market sentiment. Do NOT include guidance here; that goes in forwardGuidance.",
  "forwardGuidance": "1 sentence summarising what management guided for the NEXT quarter — e.g. 'Management guided same-store sales growth of 2%, below the 3.5% analyst consensus.' If guidance was strong or in-line, say so. This is shown to the player before they predict the stock's reaction.",
  "revenueExpected": "$6.6B",
  "epsExpected": "$3.10",
  "revenueActual": "$6.5B",
  "epsActual": "$3.15",
  "stockContext": "Near 52-week high",
  "peRatio": "24x",
  "stockSetupLabel": "Priced for consistency",
  "question": "Given this report, what do you predict happened to McDonald's stock?",
  "options": [
    {"id": "a", "text": "Up 4%+ — EPS beat drives rally"},
    {"id": "b", "text": "Flat — results in line with expectations"},
    {"id": "c", "text": "Down 2-4% — revenue miss and weak guidance"},
    {"id": "d", "text": "Down 8%+ — major miss across all metrics"}
  ],
  "correctId": "c",
  "stockMove": "-3%",
  "outcome": "1 sentence describing how the stock actually reacted.",
  "explanation": "2-3 sentences explaining WHY the market reacted this way — the key lesson.",
  "keyTakeaway": "One punchy sentence summing up what this scenario teaches.",
  "watchNextTime": "One sentence on what investors should track in future earnings for this company or sector.",
  "xp": ${TIER_XP[tier]?.lab ?? 5}
}]
Rules:
- IMPORTANT: Do NOT generate a scenario for the example company (McDonald's / MCD) used in the schema above — it is a placeholder only
- Use real companies and plausible earnings scenarios
- revenueActual, epsActual, forwardGuidance, context, and stockContext are ALL shown to the player BEFORE they answer — the player already knows the full picture: beat/miss size, stock run-up, and what management said about next quarter
- The correct answer must be derivable from the combination of actuals, context, AND forwardGuidance — not from the numbers alone (that would reduce every scenario to "beat = up, miss = down", which teaches nothing)
- forwardGuidance is often the KEY signal that explains a surprising reaction (e.g. a beat that still sells off because guidance was cut)
- stockMove must be the actual stock reaction as a signed % string (e.g. "-4%", "+8%", "-12%")
- keyTakeaway is REQUIRED — one punchy, memorable sentence that generalises the lesson beyond this specific company
- peRatio is the company's P/E ratio heading into earnings (e.g. "60x", "18x", "N/A" for unprofitable)
- stockSetupLabel is a short phrase describing the valuation setup (e.g. "Priced for perfection", "Value play", "Growth at a discount", "Elevated expectations")
- watchNextTime is REQUIRED — a specific, actionable forward-looking signal for this company or sector
- Vary which factor dominates across the ${rawCount} scenarios so players learn beat/miss size isn't the whole story
- Scenarios should be educational and teach something real about earnings reactions
- Do NOT use the same company more than once
- Only output the JSON array, nothing else`;
	} else if (type === "risk") {
		prompt = `Generate ${rawCount} risk identification scenarios for a ${tierLabel}-level investing education app.
Each scenario presents two investment options and asks which is riskier.

DAY: ${dayKey} — use this as a seed for variety. Each day must produce DIFFERENT companies, industries, and risk types from any other week.
DIFFICULTY REQUIREMENTS: ${difficultyGuide}
${avoidLine}

Return a JSON array of exactly ${rawCount} objects:
[{
  "id": "gen-risk-${dayKey}-1",
  "prompt": "Which stock carries more risk?",
  "optionA": "A utility company with regulated pricing",
  "optionB": "A small biotech with a single drug in Phase 2 trials",
  "riskierOption": "B",
  "explanation": "2-3 sentences explaining why one option is riskier, citing specific risk factors.",
  "xp": ${TIER_XP[tier]?.lab ?? 5}
}]
Rules:
- IMPORTANT: Do NOT generate a scenario using the example options verbatim (utility company or the specific biotech description above) — they are placeholders only
- Each week use DIFFERENT companies and industries — rotate across tech, healthcare, energy, retail, finance, industrials
- Vary the type of risk each scenario tests (volatility, liquidity, concentration, leverage, business model risk, regulatory risk)
- Explanations must be accurate and teach real risk concepts
- Only output the JSON array, nothing else`;
	} else if (type === "mood") {
		prompt = `Generate ${rawCount} market mood simulator scenarios for a ${tierLabel}-level investing education app.
Each scenario presents a real-world macro event and asks how markets would react.

DAY: ${dayKey} — use this as a seed for variety. Each day must cover DIFFERENT macro events and economic topics from any other week.
DIFFICULTY REQUIREMENTS: ${difficultyGuide}
${avoidLine}

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
  "xp": ${TIER_XP[tier]?.lab ?? 5}
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

DAY: ${dayKey} — use this as a seed for variety. Each day must cover DIFFERENT concepts and topics from any other week.
DIFFICULTY REQUIREMENTS: ${difficultyGuide}
${avoidLine}

Each lesson must cover a DIFFERENT topic. Categories available: ${CATEGORIES.join(", ")}.

Return a JSON array of exactly ${rawCount} objects with this exact schema:
[{
  "id": "gen-lesson-${dayKey}-unique-slug",
  "title": "What is Revenue Growth?",
  "subtitle": "How fast a company is growing its sales",
  "category": "Stock Basics",
  "emoji": "📈",
  "durationMin": 3,
  "xp": ${TIER_XP[tier]?.lesson ?? 15},
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
		// Persist to Postgres playground_cache for cross-device consistency
		ensureUserRow(uid).then(() =>
			pgQuery(
				`insert into playground_cache (uid, date, type, payload) values ($1, $2, $3, $4::jsonb)
				on conflict (uid, date, type) do update set payload = excluded.payload`,
				[uid, dayKey, pgType, JSON.stringify(valid)],
			),
		).catch(() => {});
		res.json({ questions: valid });
	} catch {
		res.status(500).json({ error: "Failed to parse generated content" });
	}
});

// ── XP write endpoints — server-authoritative ─────────────────────────────────
// These replace the direct Supabase RPC calls (complete_activity,
// complete_daily_activity, complete_challenge, add_practice_skill_xp) so the
// backend caps the XP values and the client never controls the XP amount.

const XP_CAP: Record<string, number> = {
	lesson: ACTIVITY_XP_CAP, earnings: ACTIVITY_XP_CAP, battle: ACTIVITY_XP_CAP,
	risk: ACTIVITY_XP_CAP, mood: ACTIVITY_XP_CAP,
};
const VALID_KINDS = new Set(["lesson", "earnings", "battle", "risk", "mood"]);

// POST /api/playground/complete-activity — TypeScript replica of complete_activity() SQL RPC
playgroundRouter.post("/complete-activity", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { kind, itemId, xp: rawXp } = req.body as { kind?: string; itemId?: string; xp?: unknown };

		if (typeof kind !== "string" || !VALID_KINDS.has(kind)) {
			res.status(400).json({ error: "kind must be one of: lesson, earnings, battle, risk, mood" });
			return;
		}
		if (typeof itemId !== "string" || !itemId.trim()) {
			res.status(400).json({ error: "itemId required" });
			return;
		}
		const xp = Math.min(Math.max(0, Math.floor(Number(rawXp) || 0)), XP_CAP[kind] ?? 50);

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			// Atomic check-and-complete: DO UPDATE only fires when completed=false,
			// so RETURNING is empty when already done. Eliminates the SELECT + INSERT
			// two-step race where concurrent requests could both read completed=false
			// and both award XP.
			const result = await client.query<{ uid: string }>(
				`INSERT INTO activity_progress (uid, kind, item_id, completed, completed_at, xp_earned)
				 VALUES ($1, $2, $3, true, now(), $4)
				 ON CONFLICT (uid, kind, item_id) DO UPDATE
				   SET completed = true, completed_at = now(), xp_earned = EXCLUDED.xp_earned
				   WHERE activity_progress.completed = false
				 RETURNING uid`,
				[uid, kind, itemId, xp],
			);

			if (result.rows.length === 0) {
				await client.query("ROLLBACK");
				res.json({ newlyCompleted: false });
				return;
			}

			if (xp > 0) {
				await client.query(
					`INSERT INTO playground_state (uid, total_xp) VALUES ($1, $2)
					 ON CONFLICT (uid) DO UPDATE SET total_xp = playground_state.total_xp + $2`,
					[uid, xp],
				);
			}

			await client.query("COMMIT");
			res.json({ newlyCompleted: true, xp });
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[playground] complete-activity error:", e);
		res.status(500).json({ error: "Failed to complete activity" });
	}
});

// POST /api/playground/complete-daily — TypeScript replica of complete_daily_activity() SQL RPC
playgroundRouter.post("/complete-daily", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { dayKey, activityId, xp: rawXp, activityType } = req.body as {
			dayKey?: string; activityId?: string; xp?: unknown; activityType?: string;
		};

		if (typeof dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
			res.status(400).json({ error: "dayKey must be YYYY-MM-DD" });
			return;
		}
		if (typeof activityId !== "string" || !activityId.trim()) {
			res.status(400).json({ error: "activityId required" });
			return;
		}
		const xp = Math.min(Math.max(0, Math.floor(Number(rawXp) || 0)), ACTIVITY_XP_CAP);

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				`INSERT INTO playground_state (uid) VALUES ($1) ON CONFLICT (uid) DO NOTHING`,
				[uid],
			);

			const stateRow = await client.query<{
				daily_progress: Record<string, unknown> | null;
				all_time_completed_activity_ids: string[] | null;
			}>(
				`SELECT daily_progress, all_time_completed_activity_ids
				 FROM playground_state WHERE uid = $1 FOR UPDATE`,
				[uid],
			);

			const daily: Record<string, unknown> = (stateRow.rows[0]?.daily_progress as Record<string, unknown>) ?? {};
			const allTime: string[] = stateRow.rows[0]?.all_time_completed_activity_ids ?? [];

			const isSameDay = (daily["dayKey"] as string | undefined) === dayKey;
			const alreadyDone = isSameDay && Array.isArray(daily["completedIds"]) &&
				(daily["completedIds"] as string[]).includes(activityId);

			if (alreadyDone) {
				await client.query("ROLLBACK");
				res.json({ ok: true, alreadyDone: true });
				return;
			}

			let updatedDaily: Record<string, unknown>;
			if (isSameDay) {
				updatedDaily = {
					...daily,
					completedIds: [...((daily["completedIds"] as string[]) ?? []), activityId],
					xpEarned: ((daily["xpEarned"] as number) ?? 0) + xp,
					...(activityType ? { completedTypes: [...((daily["completedTypes"] as string[]) ?? []), activityType] } : {}),
				};
			} else {
				updatedDaily = {
					dayKey,
					completedIds: [activityId],
					completedTypes: activityType ? [activityType] : [],
					xpEarned: xp,
				};
			}

			const updatedAllTime = allTime.includes(activityId) ? allTime : [...allTime, activityId];

			await client.query(
				`UPDATE playground_state
				 SET daily_progress = $1::jsonb,
				     all_time_completed_activity_ids = $2,
				     total_xp = total_xp + $3
				 WHERE uid = $4`,
				[JSON.stringify(updatedDaily), updatedAllTime, xp, uid],
			);

			await client.query("COMMIT");
			res.json({ ok: true });
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[playground] complete-daily error:", e);
		res.status(500).json({ error: "Failed to complete daily activity" });
	}
});

// All skills the frontend Skill Drills can send — must stay in sync with playground.tsx awardXp calls
const VALID_SKILLS = new Set([
	"valuation", "growth", "profitability", "risk", "news", "earnings",
	"peers", "portfolio", "awareness", "fundamentals", "macro",
]);

const DAILY_SKILL_XP_CAP = ACTIVITY_XP_CAP;

// POST /api/playground/skill-xp — records Skill Drill XP per-skill and in total.
// xp per call is clamped to 5 (correct=3, wrong=1 — nothing higher is valid).
// Daily cap enforced server-side via Redis so replay on any device doesn't bypass it.
playgroundRouter.post("/skill-xp", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { skill, xp: rawXp } = req.body as { skill?: string; xp?: unknown };

		if (typeof skill !== "string" || !VALID_SKILLS.has(skill)) {
			res.status(400).json({ error: `skill must be one of: ${[...VALID_SKILLS].join(", ")}` });
			return;
		}
		const xp = Math.min(Math.max(0, Math.floor(Number(rawXp) || 0)), 5);
		if (xp <= 0) {
			res.status(400).json({ error: "xp must be positive" });
			return;
		}

		// Check and update daily cap in Redis — use ET date to match frontend's dayKey
		const today = getEasternDateKey(new Date());
		const capKey = `practice:dailycap:${uid}:${today}`;
		const earnedToday = (await cacheGet<number>(capKey)) ?? 0;
		if (earnedToday >= DAILY_SKILL_XP_CAP) {
			res.json({ ok: true, xp: 0, capReached: true });
			return;
		}
		const actualXp = Math.min(xp, DAILY_SKILL_XP_CAP - earnedToday);
		await cacheSet(capKey, earnedToday + actualXp, 25 * 60 * 60 * 1000);

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				`INSERT INTO practice_skills (uid, skill, xp) VALUES ($1, $2, $3)
				 ON CONFLICT (uid, skill) DO UPDATE SET xp = practice_skills.xp + $3`,
				[uid, skill, actualXp],
			);
			await client.query(
				`INSERT INTO playground_state (uid, total_xp) VALUES ($1, $2)
				 ON CONFLICT (uid) DO UPDATE SET total_xp = playground_state.total_xp + $2`,
				[uid, actualXp],
			);

			await client.query("COMMIT");
			res.json({ ok: true, xp: actualXp });
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[playground] skill-xp error:", e);
		res.status(500).json({ error: "Failed to record skill XP" });
	}
});

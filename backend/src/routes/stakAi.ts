import { Router } from "express";
import { pgQuery } from "../lib/postgres.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { getGeminiKeys, withGeminiConcurrencyLimit, GEMINI_REFUSAL_RE, GEMINI_MODEL, geminiUrl } from "../services/geminiService.js";
import { getCompanyNews } from "../services/finnhubService.js";
import { getEasternDateKey } from "@stak/shared";
import { brands } from "@stak/shared/brands";
import type { BrandProfile } from "@stak/shared";

export const stakAiRouter = Router();

// Self-call to our own cached stock endpoint — works on both localhost and Cloud Run
const INTERNAL_BASE = `http://localhost:${process.env.PORT ?? 3001}`;

function trimTitle(message: string): string {
	const trimmed = message.trim().slice(0, 60);
	const lastSpace = trimmed.lastIndexOf(" ");
	return lastSpace > 20 ? trimmed.slice(0, lastSpace) : trimmed;
}

/** Detect which brands are mentioned in the message (by name or ticker).
 *  Tickers use word-boundary matching to avoid false positives from
 *  single-char tickers like "F", "T", "A" matching inside ordinary words. */
function detectMentionedBrands(message: string, allBrands: BrandProfile[]): BrandProfile[] {
	const lower = message.toLowerCase();
	return allBrands
		.filter((b) => {
			if (lower.includes(b.name.toLowerCase())) return true;
			// Only match tickers 2+ chars; require word boundaries so "F" doesn't
			// fire inside "after", "the", etc.
			if (b.ticker.length >= 2) {
				const re = new RegExp(`\\b${b.ticker.toLowerCase()}\\b`);
				if (re.test(lower)) return true;
			}
			return false;
		})
		.slice(0, 3);
}

/** Fetch live stock data from our own cached /api/stock/:ticker endpoint. */
async function fetchLiveStockContext(ticker: string): Promise<string | null> {
	try {
		const res = await fetch(
			`${INTERNAL_BASE}/api/stock/${encodeURIComponent(ticker)}`,
			{ signal: AbortSignal.timeout(5000) },
		);
		if (!res.ok) return null;
		const data = await res.json() as {
			quote: { price: number; changePercent: number; marketState?: string } | null;
			metrics: { peRatio: number | null; marketCap: string | null; beta: number | null };
		};
		if (!data.quote) return null;

		const { price, changePercent, marketState } = data.quote;
		const isOpen = marketState === "REGULAR";
		const direction = Math.abs(changePercent) < 0.1 ? "flat" : changePercent > 0 ? `up ${changePercent.toFixed(2)}%` : `down ${Math.abs(changePercent).toFixed(2)}%`;
		const priceStr = `$${price.toFixed(2)}`;
		const movement = isOpen
			? `is ${direction} today, trading at ${priceStr}`
			: `closed at ${priceStr}, ${direction === "flat" ? "flat" : direction} today`;
		const parts = [movement];
		if (data.metrics.peRatio != null) parts.push(`P/E ${data.metrics.peRatio.toFixed(1)}`);
		if (data.metrics.marketCap) parts.push(`mkt cap ${data.metrics.marketCap}`);
		if (data.metrics.beta != null) parts.push(`beta ${data.metrics.beta.toFixed(2)}`);
		return parts.join(" | ");
	} catch {
		return null;
	}
}

async function callGemini(contents: { role: string; parts: { text: string }[] }[]): Promise<string | null> {
	return withGeminiConcurrencyLimit(async () => {
		const keys = getGeminiKeys();
		if (keys.length === 0) return null;

		let firstRefusal: string | null = null;

		for (const key of keys) {
			try {
				const res = await fetch(
					geminiUrl(GEMINI_MODEL, key),
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							contents,
							generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.5 },
						}),
						signal: AbortSignal.timeout(30000),
					},
				);
				if (res.status === 429) {
					console.warn(`[Stak AI] Gemini rate limited (429) on key ...${key.slice(-4)} — trying next`);
					continue;
				}
				if (!res.ok) {
					const body = await res.text().catch(() => "(unreadable)");
					console.warn(`[Stak AI] Gemini error ${res.status} on key ...${key.slice(-4)}: ${body.slice(0, 400)}`);
					continue;
				}
				const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
				if (data?.promptFeedback?.blockReason) {
					console.warn(`[Stak AI] Gemini blocked prompt on key ...${key.slice(-4)}: ${data.promptFeedback.blockReason}`);
					continue;
				}
				const text = data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? "";
				if (!text) {
					const finishReason = data?.candidates?.[0]?.finishReason ?? "unknown";
					console.warn(`[Stak AI] Gemini empty response on key ...${key.slice(-4)}, finishReason: ${finishReason}`);
					continue;
				}
				if (GEMINI_REFUSAL_RE.test(text.trim())) {
					console.warn(`[Stak AI] Gemini refusal on key ...${key.slice(-4)}: "${text.trim().slice(0, 120)}"`);
					firstRefusal ??= text.trim();
					continue;
				}
				return text.trim();
			} catch (e) {
				console.warn(`[Stak AI] Gemini error on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
			}
		}

		// If every key refused (investment advice, out-of-scope), surface the refusal text
		// so the user sees the actual explanation instead of a generic "AI unavailable" error.
		if (firstRefusal) return firstRefusal;

		console.warn("[Stak AI] All Gemini keys exhausted");
		return null;
	});
}

function buildSystemContext(params: {
	familiarity: string | null;
	brandNames: string[];
	topTags: string[];
	easternDate: string;
}): { role: string; parts: { text: string }[] } {
	const brandList = params.brandNames.length > 0 ? params.brandNames.join(", ") : "no brands yet";
	const topTagsList = params.topTags.length > 0 ? params.topTags.join(", ") : "none recorded";
	const familiarity = params.familiarity ?? "not set";

	return {
		role: "user",
		parts: [{
			text: `You are Stak AI, a financial education assistant inside the Stak app — an investing app for people who learn through brands they know and follow.

USER PROFILE
- Financial knowledge: ${familiarity}
- Their Stak (watchlist): ${brandList}
- Top interests: ${topTagsList}
- Today (US Eastern): ${params.easternDate}

━━━ WHAT YOU DO ━━━
Your primary job is answering "why did this stock move?" — explaining price moves clearly, accurately, and at the right depth for this user. You also answer general financial education questions (what is a P/E ratio, what is beta, how do earnings work, etc.).

━━━ HOW TO ANSWER A "WHY DID X MOVE?" QUESTION ━━━
Always follow this structure — every section, in this order:
1. Direct answer — state the catalyst immediately. If there is no confirmed public catalyst, say so explicitly: "There is no confirmed public catalyst for this move." Never invent a reason to fill the gap.
2. What changed — the specific event: earnings beat/miss vs. expectations, guidance revision, analyst action, macro data, news headline.
3. Why it matters — briefly explain why that event affects the stock. Match depth and vocabulary to the user's financial knowledge level.
4. What to check — point the user to where they can learn more (the stock page or news feed in the app). Never prescribe any action.
5. Uncertainty — flag anything that is unconfirmed, speculative, or has multiple competing explanations.

━━━ MULTIPLE QUESTIONS ━━━
If the user asks more than two distinct questions in one message, answer only the first one (or first two if they are closely related), then say exactly: "I answered your first question — ask the others one at a time so I can give each a real answer." Do not attempt to answer the remaining questions. Each question deserves its own credit.

━━━ MOVE RULES (apply to every price question) ━━━
- No catalyst: "There is no confirmed public catalyst for this move" is a complete, correct answer. Never speculate or fill silence with invented drama.
- Flat day: A move under ~1% is normal daily volatility. Say so plainly. Do not manufacture a reason.
- False premise: If the user's question contains wrong information (wrong direction, wrong magnitude, wrong ticker), correct it first — then explain.
- Multiple causes: When several factors exist, name them all and explicitly flag that it is uncertain which dominated.
- Macro vs. company: Always clearly distinguish between a company-specific catalyst and a broad market or sector-wide move.
- Freshness: Only attribute a move to news that is genuinely from today or very recently. Never present old news as today's catalyst. If timing is unclear, say so.
- Live data: When market data is provided in this conversation, use those exact numbers. Never invent a price, percentage, or figure.
- Unknown ticker: If you cannot identify a ticker or have no reliable data for it, say so clearly. Never fabricate a price, story, or reason.
- Malformed input: If the user sends a garbled or ambiguous ticker/name (e.g. "mvst???"), try to resolve it to the most likely company and confirm — or ask a short clarifying question. Never break or hallucinate.
- Company names: If the user gives a company name instead of a ticker (e.g. "Apple"), resolve it to the correct ticker (AAPL) and answer normally.
- If the user sounds panicked or emotional about a move, be calm first — normalize that volatility is normal — then explain.

━━━ OUT OF SCOPE — DECLINE THESE CLEANLY ━━━
The following are outside v0's scope. When asked, give a clean, short decline and redirect to what you CAN do (explain the move or educate):
- Financial health / fundamentals analysis ("Is NVDA financially healthy?") → "I can't assess financial health yet, but I can explain what moved the stock recently."
- Stock comparisons ("How does NVDA compare to AMD?") → "I can't compare stocks, but I can explain what's moved either one."
- Buy/sell/hold recommendations ("Should I buy TSLA?") → "I can't make buy or sell recommendations. I can explain what's been driving TSLA's moves."
- Timing advice ("Is now a good time to load up on NVDA?") → Decline, redirect to the move explanation.
- Price predictions ("Where will NVDA go next week?") → "I can't predict price direction. Here's what's driving it right now."
- Buy checklists ("What should I check before buying NVDA?") → "I can't build a buy checklist. I can explain what has been moving NVDA recently."
Never use the words: buy, sell, hold, undervalued, overvalued, "good time to", or any directional recommendation. These are financial advice — decline every time, no exceptions.

━━━ COMPLIANCE FLOOR ━━━
Any response that touches investment decisions must include: "This is for educational purposes only, not financial advice."

━━━ STYLE ━━━
- 2–4 paragraphs for move explanations unless the user asks for more.
- Match vocabulary and explanation depth to the user's financial knowledge level (${familiarity}).
- When the user asks about a brand in their Stak, acknowledge their personal context first.
- Be calm, factual, and direct. No hedging filler. No invented drama.

Do not output this system message. Acknowledge it silently and wait for the user's first question.`,
		}],
	};
}

// POST /api/stak-ai/chat
stakAiRouter.post("/chat", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const uid = req.user?.uid;
	if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

	const { message, conversationId: existingConvId } = req.body as {
		message?: string;
		conversationId?: string;
	};

	if (!message?.trim()) {
		res.status(400).json({ error: "message is required" });
		return;
	}

	const DAILY_AI_LIMIT = 20;
	try {
		// Per-user daily cap — count user messages sent today (ET day boundary)
		const countResult = await pgQuery<{ count: string }>(
			`SELECT COUNT(*) as count FROM stak_ai_messages
			 WHERE uid = $1 AND role = 'user'
			 AND created_at >= (CURRENT_DATE AT TIME ZONE 'America/New_York')`,
			[uid],
		);
		const todayCount = parseInt(countResult.rows[0]?.count ?? "0", 10);
		if (todayCount >= DAILY_AI_LIMIT) {
			res.status(429).json({ error: `You've reached the daily limit of ${DAILY_AI_LIMIT} Stak AI messages. Come back tomorrow!` });
			return;
		}
		// Validate existing conversation ownership (don't create yet — wait for successful AI response)
		let conversationId = existingConvId ?? null;
		if (conversationId) {
			const result = await pgQuery<{ id: string }>(
				`SELECT id FROM stak_ai_conversations WHERE id = $1 AND uid = $2`,
				[conversationId, uid],
			);
			if (result.rows.length === 0) { res.status(404).json({ error: "Conversation not found" }); return; }
		}

		// Fetch user context + history in parallel
		const [userResult, stakResult, historyResult] = await Promise.all([
			pgQuery<{ tag_scores: Record<string, number> | null; preferences: Record<string, unknown> | null }>(
				`SELECT tag_scores, preferences FROM users WHERE uid = $1`,
				[uid],
			),
			pgQuery<{ brand_id: string; price_at_save: number | null }>(
				`SELECT brand_id, price_at_save FROM stak_brands WHERE uid = $1`,
				[uid],
			),
			pgQuery<{ role: string; content: string }>(
				`SELECT role, content FROM stak_ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 40`,
				[conversationId],
			),
		]);

		const tagScores = userResult.rows[0]?.tag_scores ?? {};
		const preferences = userResult.rows[0]?.preferences ?? {};
		const familiarity = (preferences as { familiarity?: string }).familiarity ?? null;

		// Resolve brand IDs → full BrandProfile objects with purchase price
		const stakBrands = stakResult.rows
			.map((r) => {
				const profile = (brands as BrandProfile[]).find((b) => b.id === r.brand_id);
				if (!profile) return null;
				return { profile, priceAtSave: r.price_at_save };
			})
			.filter((b): b is { profile: BrandProfile; priceAtSave: number | null } => !!b);

		const brandNames = stakBrands.map(({ profile, priceAtSave }) => {
			const base = `${profile.name} (${profile.ticker})`;
			return priceAtSave != null ? `${base} — added at $${Number(priceAtSave).toFixed(2)}` : base;
		});

		// Top 3 interest tags by score
		const topTags = Object.entries(tagScores)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([k]) => k);

		const easternDate = getEasternDateKey();

		// Auto-flag first 50 Stak AI users as research cohort (fire-and-forget)
		pgQuery<{ research_cohort: boolean }>(
			`SELECT research_cohort FROM users WHERE uid = $1`, [uid],
		).then((r) => {
			if (!r.rows[0]?.research_cohort) {
				pgQuery<{ count: string }>(
					`SELECT COUNT(*) as count FROM users WHERE research_cohort = true`,
				).then((c) => {
					if (parseInt(c.rows[0]?.count ?? "0", 10) < 50) {
						pgQuery(`UPDATE users SET research_cohort = true WHERE uid = $1`, [uid]).catch(() => {});
					}
				}).catch(() => {});
			}
		}).catch(() => {});

		// Detect mentioned brands from full catalog — not just Stak, so any brand works
		const mentionedBrands = detectMentionedBrands(message.trim(), brands as BrandProfile[]);
		const liveDataLines: string[] = [];
		const newsLines: string[] = [];
		const liveContextLog: Record<string, string> = {};
		const newsHeadlinesLog: { ticker: string; headline: string }[] = [];
		if (mentionedBrands.length > 0) {
			const [priceResults, newsResults] = await Promise.all([
				Promise.allSettled(mentionedBrands.map((b) => fetchLiveStockContext(b.ticker).then((ctx) => ({ brand: b, ctx })))),
				Promise.allSettled(mentionedBrands.map((b) => getCompanyNews(b.ticker, 24, b.name).then((articles) => ({ brand: b, articles })))),
			]);
			for (const f of priceResults) {
				if (f.status === "fulfilled" && f.value.ctx) {
					liveDataLines.push(`• ${f.value.brand.name} (${f.value.brand.ticker}): ${f.value.ctx}`);
					liveContextLog[f.value.brand.ticker] = f.value.ctx;
				}
			}
			for (const f of newsResults) {
				if (f.status === "fulfilled" && f.value.articles.length > 0) {
					const headlines = f.value.articles.slice(0, 5).map((a) => `  - ${a.headline}`).join("\n");
					newsLines.push(`${f.value.brand.name} (${f.value.brand.ticker}) recent headlines:\n${headlines}`);
					for (const a of f.value.articles.slice(0, 5)) {
						newsHeadlinesLog.push({ ticker: f.value.brand.ticker, headline: a.headline });
					}
				}
			}
		}

		// Build Gemini contents
		const systemContext = buildSystemContext({ familiarity, brandNames, topTags, easternDate });
		const contents: { role: string; parts: { text: string }[] }[] = [
			systemContext,
			{ role: "model", parts: [{ text: "Understood. I'm ready to help as Stak AI." }] },
			...historyResult.rows.map((m) => ({
				role: m.role === "assistant" ? "model" : "user",
				parts: [{ text: m.content }],
			})),
		];

		// Inject live price + recent news headlines before the user's question
		if (liveDataLines.length > 0 || newsLines.length > 0) {
			const parts: string[] = [];
			if (liveDataLines.length > 0) parts.push(`Live market data:\n${liveDataLines.join("\n")}`);
			if (newsLines.length > 0) parts.push(`Recent news signals:\n${newsLines.join("\n\n")}`);
			contents.push({
				role: "user",
				parts: [{ text: `${parts.join("\n\n")}\n\nUse this context when answering the question below.` }],
			});
			contents.push({
				role: "model",
				parts: [{ text: "Got it — I have the live data and recent news and will use them in my answer." }],
			});
		}

		contents.push({ role: "user", parts: [{ text: message.trim() }] });

		const aiResponse = await callGemini(contents);
		if (!aiResponse) {
			res.status(503).json({ error: "AI unavailable, please try again" });
			return;
		}

		// Create conversation now that we have a successful exchange (both sides exist)
		if (!conversationId) {
			const result = await pgQuery<{ id: string }>(
				`INSERT INTO stak_ai_conversations (uid, title) VALUES ($1, $2) RETURNING id`,
				[uid, trimTitle(message)],
			);
			conversationId = result.rows[0]?.id ?? null;
			if (!conversationId) { res.status(500).json({ error: "Failed to create conversation" }); return; }
		}

		await pgQuery(
			`INSERT INTO stak_ai_messages (conversation_id, uid, role, content) VALUES ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)`,
			[conversationId, uid, message.trim(), aiResponse],
		);
		await pgQuery(
			`UPDATE stak_ai_conversations SET updated_at = now() WHERE id = $1`,
			[conversationId],
		);

		// Log context for research cohort users (fire-and-forget — never blocks the response)
		pgQuery<{ research_cohort: boolean }>(
			`SELECT research_cohort FROM users WHERE uid = $1`, [uid],
		).then((r) => {
			if (r.rows[0]?.research_cohort) {
				pgQuery(
					`INSERT INTO stak_ai_research_log
					 (uid, conversation_id, user_message, brands_detected, news_headlines, live_context, ai_response)
					 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
					[
						uid,
						conversationId,
						message.trim(),
						mentionedBrands.map((b) => b.ticker),
						JSON.stringify(newsHeadlinesLog),
						JSON.stringify(liveContextLog),
						aiResponse,
					],
				).catch((e) => console.warn("[Stak AI] research log write failed:", e));
			}
		}).catch(() => {});

		res.json({ response: aiResponse, conversationId });
	} catch (e) {
		console.error("[Stak AI] chat error:", e);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/stak-ai/conversations
stakAiRouter.get("/conversations", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const uid = req.user?.uid;
	if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

	try {
		const result = await pgQuery<{ id: string; title: string; created_at: string; updated_at: string }>(
			`SELECT id, title, created_at, updated_at FROM stak_ai_conversations WHERE uid = $1 ORDER BY updated_at DESC LIMIT 20`,
			[uid],
		);
		res.json({ conversations: result.rows });
	} catch (e) {
		console.error("[Stak AI] conversations error:", e);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/stak-ai/conversations/:id/messages
stakAiRouter.get("/conversations/:id/messages", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const uid = req.user?.uid;
	if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

	const { id } = req.params;

	try {
		const convResult = await pgQuery<{ id: string }>(
			`SELECT id FROM stak_ai_conversations WHERE id = $1 AND uid = $2`,
			[id, uid],
		);
		if (convResult.rows.length === 0) { res.status(404).json({ error: "Conversation not found" }); return; }

		const msgResult = await pgQuery<{ id: number; role: string; content: string; created_at: string }>(
			`SELECT id, role, content, created_at FROM stak_ai_messages WHERE conversation_id = $1 AND uid = $2 ORDER BY created_at ASC`,
			[id, uid],
		);
		res.json({ messages: msgResult.rows });
	} catch (e) {
		console.error("[Stak AI] messages error:", e);
		res.status(500).json({ error: "Internal server error" });
	}
});

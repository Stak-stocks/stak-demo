import { Router, type Response } from "express";
import { pgQuery, pgPool } from "../lib/postgres.js";
import { escapeRegExp } from "../lib/regex.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { getGeminiKeys, withGeminiConcurrencyLimit, GEMINI_REFUSAL_RE, GEMINI_MODEL, geminiStreamUrl } from "../services/geminiService.js";
import { getCompanyNews, type FinnhubArticle } from "../services/finnhubService.js";
import { getStockSnapshot } from "./stock.js";
import {
	getEasternDateKey,
	STAK_AI_WINDOW_HOURS,
	STAK_AI_WINDOW_LIMIT,
	STAK_AI_VIA,
	type BrandProfile,
	type StakAiAnswerKind,
	type StakAiChatReply,
	type StakAiContext,
	type StakAiErrorCode,
	type StakAiSource,
	type StakAiUsage,
} from "@stak/shared";
import { brands } from "@stak/shared/brands";

export const stakAiRouter = Router();

const CATALOG = brands as BrandProfile[];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const HISTORY_TURNS = 20;
/** The whole answer, across every Gemini key, must land within this; a stuck call shouldn't hold the screen for minutes. */
const GEMINI_DEADLINE_MS = 25_000;
/** News is context, not the answer: past this, answer without it. */
const NEWS_DEADLINE_MS = 3_000;

/** Errors carry a stable `code` for the apps to word themselves; `error` is a readable fallback. */
function fail(res: Response, status: number, code: StakAiErrorCode, error: string, extra: Record<string, unknown> = {}) {
	res.status(status).json({ error, code, ...extra });
}

// ── Which companies a question is about ─────────────────────────────────────

/**
 * Tickers that are everyday words. Typed bare they're far more likely to be the word ("is that normal for it now?"),
 * so they only count as a company written as a $cashtag.
 */
const WORD_TICKERS = new Set([
	"A", "AI", "ALL", "AN", "ARE", "ARM", "AT", "BE", "BIG", "BY", "CAN", "CAR", "CAT", "COST", "DIS", "DO", "EAT", "EYE",
	"FAST", "FIVE", "FLY", "FOR", "FUN", "GO", "GOOD", "HAS", "HE", "HOME", "IF", "IN", "IS", "IT", "KEY", "LIFE", "LIVE",
	"LOVE", "LOW", "MA", "MAIN", "ME", "MORE", "MOST", "MS", "MY", "NET", "NEW", "NICE", "NO", "NOW", "OF", "OK", "ON",
	"ONE", "OPEN", "OR", "OUT", "PATH", "PEAK", "PLAY", "PLUS", "REAL", "RUN", "SAFE", "SAVE", "SEE", "SHOP", "SO",
	"TEAM", "TO", "TRUE", "UP", "UPS", "US", "VERY", "WE", "WELL", "WIN", "WORK", "YOU",
]);
/** Company names that are also everyday words: these only match when capitalized ("Target", not "price target"). */
const WORD_NAMES = new Set(["target", "gap", "block", "square", "ring", "shell", "delta", "chase", "coach", "snap", "match", "zoom", "visa", "oracle", "unity"]);

/** Built once: a name matcher (case-insensitive unless it's a word) and an UPPERCASE-only ticker matcher per brand. */
const MATCHERS = CATALOG.map((b) => ({
	brand: b,
	name: new RegExp(`\\b${escapeRegExp(b.name)}\\b`, WORD_NAMES.has(b.name.toLowerCase()) ? "" : "i"),
	ticker: b.ticker.length >= 2 && !WORD_TICKERS.has(b.ticker) ? new RegExp(`(?<![A-Za-z$])${escapeRegExp(b.ticker)}\\b`) : null,
}));

/** "$PLTR"-style cashtags: any ticker, catalog or not, word-like or not. */
function detectCashtags(message: string): string[] {
	return [...message.matchAll(/\$([A-Za-z][A-Za-z.-]{0,9})\b/g)].map((m) => m[1]!.toUpperCase()).filter((t) => TICKER_RE.test(t));
}

/** Up to three tickers the question names: catalog companies by name or uppercase ticker, plus cashtags. */
export function detectNamedTickers(message: string): string[] {
	const fromCatalog = MATCHERS.filter((m) => m.name.test(message) || (m.ticker?.test(message) ?? false)).map((m) => m.brand.ticker);
	return [...new Set([...detectCashtags(message), ...fromCatalog])].slice(0, 3);
}

/** The question points back at something earlier ("is that normal for it?", "what does this mean?"). */
const REFERS_BACK = /\b(it|it's|its|they|them|their|this|that|these|those|the (stock|stocks|company|shares|article|story|news|brief))\b/i;

const nameOf = (ticker: string) => CATALOG.find((b) => b.ticker === ticker)?.name ?? ticker;

// ── Context: what the chat was opened from ──────────────────────────────────

const clip = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const tickerList = (v: unknown): string[] =>
	Array.isArray(v)
		? [...new Set(v.map((t) => (typeof t === "string" ? t.trim().toUpperCase() : "")).filter((t) => TICKER_RE.test(t)))].slice(0, 3)
		: [];

/** The request's `context`, validated and trimmed; null when absent or malformed (the chat still works without it). */
export function parseContext(raw: unknown): StakAiContext | null {
	if (!raw || typeof raw !== "object") return null;
	const c = raw as Record<string, unknown>;
	if (c.type === "stock") {
		const ticker = clip(c.ticker, 10)?.toUpperCase();
		return ticker && TICKER_RE.test(ticker) ? { type: "stock", ticker } : null;
	}
	if (c.type === "article") {
		const headline = clip(c.headline, 300);
		if (!headline) return null;
		const url = clip(c.url, 500);
		return { type: "article", headline, summary: clip(c.summary, 2000), source: clip(c.source, 80), url: url && /^https?:\/\//.test(url) ? url : undefined, tickers: tickerList(c.tickers) };
	}
	if (c.type === "brief") {
		const points = Array.isArray(c.points) ? c.points.map((p) => clip(p, 400)).filter((p): p is string => !!p).slice(0, 8) : [];
		return points.length > 0 ? { type: "brief", title: clip(c.title, 200), points } : null;
	}
	return null;
}

function contextTickers(ctx: StakAiContext | null): string[] {
	if (ctx?.type === "stock") return [ctx.ticker];
	if (ctx?.type === "article") return ctx.tickers ?? [];
	return [];
}

/** The context as a note the model reads before the question. */
function describeContext(ctx: StakAiContext): string {
	if (ctx.type === "stock") return `The user opened STAK AI from the ${nameOf(ctx.ticker)} (${ctx.ticker}) stock page.`;
	if (ctx.type === "article") {
		const lines = [`The user opened STAK AI from a news article${ctx.source ? ` (${ctx.source})` : ""} they are reading.`, `Headline: ${ctx.headline}`];
		if (ctx.summary) lines.push(`Summary: ${ctx.summary}`);
		if (ctx.tickers?.length) lines.push(`Companies in the story: ${ctx.tickers.join(", ")}`);
		return lines.join("\n");
	}
	return [`The user opened STAK AI from today's Daily Brief${ctx.title ? ` ("${ctx.title}")` : ""}. Its points:`, ...ctx.points.map((p) => `- ${p}`)].join("\n");
}

/** A history-list title: the article's headline, or the question (capitalized) labelled with the stock or the brief. */
export function makeTitle(question: string, ctx: StakAiContext | null): string {
	const q = question.replace(/\s+/g, " ").trim();
	const capitalized = q.charAt(0).toUpperCase() + q.slice(1);
	const full = ctx?.type === "article" ? ctx.headline : ctx?.type === "stock" ? `${nameOf(ctx.ticker)}: ${capitalized}` : ctx?.type === "brief" ? `Daily Brief: ${capitalized}` : capitalized;
	if (full.length <= 60) return full;
	const cut = full.lastIndexOf(" ", 59);
	return `${full.slice(0, cut > 20 ? cut : 59).replace(/[\s,.:;!?-]+$/, "")}…`;
}

/** A short label for the history list: the stock's name, the article's headline or "Daily Brief". */
function contextLabel(ctx: StakAiContext | null): string | null {
	if (ctx?.type === "stock") return nameOf(ctx.ticker);
	if (ctx?.type === "article") return ctx.headline;
	if (ctx?.type === "brief") return "Daily Brief";
	return null;
}

// ── Usage: STAK_AI_WINDOW_LIMIT questions per rolling window ────────────────

const windowEnd = (from: Date | string) => new Date(new Date(from).getTime() + STAK_AI_WINDOW_HOURS * 3_600_000).toISOString();
const USAGE_SQL = `SELECT COUNT(*)::int AS used, MIN(created_at) AS oldest FROM stak_ai_usage
	WHERE uid = $1 AND created_at >= NOW() - INTERVAL '${STAK_AI_WINDOW_HOURS} hours'`;

function toUsage(row: { used: number; oldest: string | Date | null } | undefined): StakAiUsage {
	const used = Number(row?.used ?? 0);
	return { limit: STAK_AI_WINDOW_LIMIT, used, remaining: Math.max(0, STAK_AI_WINDOW_LIMIT - used), resetsAt: row?.oldest ? windowEnd(row.oldest) : null };
}

async function getUsage(uid: string): Promise<StakAiUsage> {
	return toUsage((await pgQuery<{ used: number; oldest: string | null }>(USAGE_SQL, [uid])).rows[0]);
}

/**
 * Claims one question for this user, or reports the window full. Counting and claiming happen under a per-user lock,
 * so ten requests fired at once can't all slip past the limit. A claim that ends up not counting (the AI failed or
 * only declined or asked back) is handed back with releaseQuestion.
 */
async function reserveQuestion(uid: string): Promise<{ usageId: number | null; usage: StakAiUsage }> {
	const client = await pgPool.connect();
	try {
		await client.query("BEGIN");
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`stak-ai:${uid}`]);
		const usage = toUsage((await client.query<{ used: number; oldest: string | null }>(USAGE_SQL, [uid])).rows[0]);
		let usageId: number | null = null;
		if (usage.remaining > 0) {
			usageId = (await client.query<{ id: number }>(`INSERT INTO stak_ai_usage (uid) VALUES ($1) RETURNING id::int AS id`, [uid])).rows[0]!.id;
		}
		await client.query("COMMIT");
		return { usageId, usage };
	} catch (e) {
		await client.query("ROLLBACK").catch(() => {});
		throw e;
	} finally {
		client.release();
	}
}

function releaseQuestion(usageId: number) {
	return pgQuery(`DELETE FROM stak_ai_usage WHERE id = $1`, [usageId]).catch((e) => console.warn("[STAK AI] usage release failed:", e));
}

// ── Research cohort ─────────────────────────────────────────────────────────

/** Once 50 users are in the cohort, stop asking the database on every question (per instance; resets on deploy). */
let cohortFull = false;

// ── Live data ───────────────────────────────────────────────────────────────

/** Today's move and key metrics for a ticker, as one line for the model; null when there's no quote. */
async function fetchLiveStockContext(ticker: string): Promise<string | null> {
	try {
		const data = await getStockSnapshot(ticker);
		if (!data.quote) return null;
		const { price, changePercent, marketState } = data.quote;
		const isOpen = marketState === "REGULAR";
		const direction = Math.abs(changePercent) < 0.1 ? "flat" : changePercent > 0 ? `up ${changePercent.toFixed(2)}%` : `down ${Math.abs(changePercent).toFixed(2)}%`;
		const priceStr = `$${price.toFixed(2)}`;
		const parts = [isOpen ? `is ${direction} today, trading at ${priceStr}` : `closed at ${priceStr}, ${direction} today`];
		if (data.metrics.peRatio != null) parts.push(`P/E ${data.metrics.peRatio.toFixed(1)}`);
		if (data.metrics.marketCap) parts.push(`mkt cap ${data.metrics.marketCap}`);
		if (data.metrics.beta != null) parts.push(`beta ${data.metrics.beta.toFixed(2)}`);
		return parts.join(" | ");
	} catch {
		return null;
	}
}

function withDeadline<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
	return Promise.race([p.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

// ── Gemini ──────────────────────────────────────────────────────────────────

/** No first words from a key by now: try the next. */
const FIRST_CHUNK_MS = 20_000;
/** Words stopped arriving for this long: give up on the answer. */
const IDLE_MS = 15_000;

/**
 * Asks Gemini (streamGenerateContent, so text can be shown as it's written), trying each key in turn. The reply is
 * the finished text - `refused` marks a canned refusal, shown as a decline - or null when there's no complete answer:
 * every key failed, the prompt was blocked, or the answer was cut off (an error chunk, or a finish other than STOP).
 * With [onText] (the streamed route), once words have been shown a failure is final: another key would start the
 * answer over under them, and bill it twice. Each try must start within FIRST_CHUNK_MS (and the whole thing within
 * GEMINI_DEADLINE_MS), and an answer that goes quiet for IDLE_MS is abandoned.
 */
async function askGemini(
	contents: { role: string; parts: { text: string }[] }[],
	systemInstruction: string,
	onText?: (full: string) => void,
): Promise<{ text: string; refused: boolean } | null> {
	return withGeminiConcurrencyLimit(async () => {
		const started = Date.now();
		let shownAny = false;
		for (const key of getGeminiKeys()) {
			if (shownAny) break;
			const left = GEMINI_DEADLINE_MS - (Date.now() - started);
			if (left < 2_000) break;
			const tag = `key ...${key.slice(-4)}`;
			const controller = new AbortController();
			let timer = setTimeout(() => controller.abort(), Math.min(FIRST_CHUNK_MS, left));
			const stillTalking = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), IDLE_MS); };
			try {
				const res = await fetch(geminiStreamUrl(GEMINI_MODEL, key), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						system_instruction: { parts: [{ text: systemInstruction }] },
						contents,
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.5 },
					}),
					signal: controller.signal,
				});
				if (!res.ok || !res.body) {
					const body = await res.text().catch(() => "");
					console.warn(`[STAK AI] Gemini ${res.status} on ${tag}${res.status === 429 ? " — trying next" : `: ${body.slice(0, 300)}`}`);
					continue;
				}
				let full = "";
				let finish: string | undefined;
				let blocked: string | undefined;
				let errored = false;
				const take = (raw: string) => {
					const line = raw.trim();
					if (!line.startsWith("data:")) return;
					let chunk: { error?: unknown; promptFeedback?: { blockReason?: string }; candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
					try { chunk = JSON.parse(line.slice(5)); } catch { return; }
					if (chunk.error) errored = true;
					if (chunk.promptFeedback?.blockReason) blocked = chunk.promptFeedback.blockReason;
					const candidate = chunk.candidates?.[0];
					const piece = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
					if (piece) {
						full += piece;
						stillTalking();
						if (onText) {
							onText(full);
							shownAny ||= streamableText(full).length > 0;
						}
					}
					if (candidate?.finishReason) finish = candidate.finishReason;
				};
				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				for (;;) {
					const { value, done } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					let nl: number;
					while ((nl = buffer.indexOf("\n")) >= 0) {
						take(buffer.slice(0, nl));
						buffer = buffer.slice(nl + 1);
					}
				}
				// The last line, if the stream didn't end with a newline.
				for (const line of (buffer + decoder.decode()).split("\n")) take(line);

				if (blocked) {
					// Every key would block the same prompt.
					console.warn(`[STAK AI] Gemini blocked the prompt on ${tag}: ${blocked}`);
					return null;
				}
				const text = full.trim();
				if (errored || finish !== "STOP" || !text) {
					console.warn(`[STAK AI] Gemini answer incomplete on ${tag} (finish: ${finish ?? "none"}${errored ? ", error chunk" : ""})`);
					continue;
				}
				return { text, refused: GEMINI_REFUSAL_RE.test(text) };
			} catch (e) {
				console.warn(`[STAK AI] Gemini error on ${tag}: ${(e as Error)?.message}`);
			} finally {
				clearTimeout(timer);
			}
		}
		console.warn("[STAK AI] No complete Gemini answer");
		return null;
	});
}

/**
 * Splits the model's reply into the answer text and the signals it was asked to give: a leading [[DECLINED]] or
 * [[CLARIFY]], and a closing "[[FOLLOWUPS]] a | b | c" line. Markers never reach the user or the stored history.
 */
export function parseAnswer(raw: string): { text: string; kind: StakAiAnswerKind; followUps: string[] } {
	let text = raw.trim();
	let kind: StakAiAnswerKind = "answer";
	const lead = text.match(/^\[\[(DECLINED|CLARIFY)\]\]\s*/i);
	if (lead) {
		kind = lead[1]!.toUpperCase() === "DECLINED" ? "declined" : "clarify";
		text = text.slice(lead[0].length);
	}
	let followUps: string[] = [];
	const tail = text.match(/\[\[FOLLOWUPS\]\]([^\n]*)\s*$/i);
	if (tail) {
		followUps = tail[1]!.split("|").map((s) => s.trim().replace(/^[-*•]\s*/, "")).filter((s) => s.length > 0 && s.length <= 100).slice(0, 3);
		text = text.slice(0, tail.index).trimEnd();
	}
	text = text.replace(/\[\[(DECLINED|CLARIFY|FOLLOWUPS)\]\]/gi, "").trim();
	return { text, kind, followUps: kind === "answer" ? followUps : [] };
}

/** The fixed rules first and the per-user profile last, so the rules form a shared prefix Gemini can cache. */
function buildSystemContext(params: { familiarity: string | null; brandNames: string[]; topTags: string[]; easternDate: string }): string {
	const brandList = params.brandNames.length > 0 ? params.brandNames.join(", ") : "no stocks yet";
	const topTagsList = params.topTags.length > 0 ? params.topTags.join(", ") : "none recorded";
	const familiarity = params.familiarity ?? "not set — assume a beginner";

	return `You are STAK AI, the learning assistant inside STAK — an app that helps people, many of them new to investing, understand stocks through brands they already know.

━━━ WHAT YOU DO ━━━
You explain. Mostly why a stock moved and what a piece of news means, but also how a company makes money, what investing terms mean, how two companies differ, and what a company's numbers say about its financial health. Comparisons and financial-health questions are welcome as education: describe neutrally what each business does, how they differ, and what the numbers show and don't show.

━━━ WHAT YOU NEVER DO ━━━
Never tell someone what to do with their money, and never predict prices. No recommendations to buy, sell or hold; no "good time to buy", "undervalued", "overvalued" or "it will go up"; no picking which stock is the better investment; no buy checklists or timing advice. You may use words like "buy", "sell rating" or "buyback" to explain what happened or what a term means, never as advice.
When someone asks for advice or a prediction, start your reply with [[DECLINED]], then in one or two friendly sentences say you can't give advice or predictions, and offer what you can explain instead (what's been moving it, how people weigh the trade-offs). End that reply with one sentence noting it isn't financial advice.

━━━ "WHY DID IT MOVE?" ━━━
- Lead with the answer in one or two sentences: the catalyst, or "There's no confirmed public reason for this move."
- Then briefly: what happened, why it matters for the stock, and anything uncertain (competing explanations, unconfirmed reports).
- Never invent a reason. A move under about 1% is normal day-to-day noise; say so.
- If the question has a wrong premise (wrong direction, size or ticker), correct it first.
- Separate company-specific news from a market- or sector-wide move.
- Only credit news that is genuinely recent; if the timing is unclear, say so.
- When live market data is provided, use those exact numbers. Never make up a price, percentage or figure. If you have no data for a company, say so plainly.
- If they sound worried about a move, be calm first: swings are normal.

━━━ UNCLEAR QUESTIONS ━━━
Resolve "it", "they" or "this stock" from the conversation and stay on that company. If you genuinely can't tell what they mean or which company, start your reply with [[CLARIFY]] and ask one short question.
If one message packs in more than two separate questions, answer the first (or the first two if they're related) and ask them to send the others one at a time.

━━━ WHERE THE USER IS ━━━
The conversation may include a note saying what the user opened STAK AI from: a news article, a stock page, or today's Daily Brief. When their question refers to "this", "the article", "this stock" or "the brief", it means that. Ground your answer in it, and say so if it doesn't cover what they asked.

━━━ STYLE ━━━
- Short, for a phone screen: lead with the answer, then one to three short paragraphs at most.
- Match depth and vocabulary to their knowledge level, and explain any jargon you use.
- If they ask about a stock in their STAK, acknowledge that personal angle.
- Calm, factual and direct. No filler, no hype, no invented drama.
- Formatting: plain sentences. Use **bold** sparingly for a key term or number, and "- " bullets only for a list of three or more items. No headings, tables, links, code or emojis.
- Use American English spelling.
- The app always shows an "educational, not financial advice" note, so don't add a disclaimer to normal answers.

━━━ FOLLOW-UPS ━━━
On a normal answer (not [[DECLINED]] or [[CLARIFY]]), end with one final line: [[FOLLOWUPS]] followed by two or three short questions they might naturally ask next, each under 60 characters, separated by " | ". Keep them educational, never advice.

━━━ ABOUT THIS USER ━━━
- Financial knowledge: ${familiarity}
- Their STAK (saved stocks): ${brandList}
- Top interests: ${topTagsList}
- Today (US Eastern): ${params.easternDate}
`;
}

// ── Routes ──────────────────────────────────────────────────────────────────

// POST /api/stak-ai/chat           → a StakAiChatReply as JSON.
// POST /api/stak-ai/chat/stream    → the same answer as server-sent events: `delta` ({ text }) as it's written, then
//                                     `done` (the StakAiChatReply, whose `response` is authoritative) or `error`.
// Body: { message, conversationId?, context?, via? }. Send `context` (see StakAiContext) with the first question only;
// `via` says how it was asked (typed, starter, followup, retry) for the usage stats. Errors found before the answer
// starts (bad input, limit_reached with `usage`, not_found) are ordinary JSON responses on both routes.

const VIA = new Set<string>(STAK_AI_VIA);

/** Everything a question needs before the model is called: its claim on the limit, the conversation and the prompt. */
interface Prepared {
	uid: string;
	question: string;
	via: string;
	usageId: number;
	usageBefore: StakAiUsage;
	conversationId: string | null;
	newContext: StakAiContext | null;
	contextIsNew: boolean;
	context: StakAiContext | null;
	lastTickers: string[];
	tickers: string[];
	sources: StakAiSource[];
	liveContextLog: Record<string, string>;
	inCohort: boolean;
	systemInstruction: string;
	contents: { role: string; parts: { text: string }[] }[];
	startedAt: number;
}

/** Validates the request and builds the prompt; answers the request itself (and returns null) when it can't go on. */
async function prepareChat(req: AuthenticatedRequest, res: Response): Promise<Prepared | null> {
	const uid = req.user!.uid;
	const { message, conversationId: existingConvId, context: rawContext, via: rawVia } = (req.body ?? {}) as { message?: unknown; conversationId?: unknown; context?: unknown; via?: unknown };

	if (typeof message !== "string" || !message.trim()) { fail(res, 400, "bad_request", "message is required"); return null; }
	if (existingConvId != null && (typeof existingConvId !== "string" || !UUID_RE.test(existingConvId))) { fail(res, 404, "not_found", "Conversation not found"); return null; }
	const question = message.trim().slice(0, 1000);
	const newContext = parseContext(rawContext);
	const via = typeof rawVia === "string" && VIA.has(rawVia) ? rawVia : "typed";
	const startedAt = Date.now();

	// Claim a question and load the conversation together.
	const [reservation, convResult] = await Promise.all([
		reserveQuestion(uid),
		existingConvId
			? pgQuery<{ id: string; context: StakAiContext | null; last_tickers: string[] | null }>(
				`SELECT id, context, last_tickers FROM stak_ai_conversations WHERE id = $1 AND uid = $2`,
				[existingConvId, uid],
			)
			: Promise.resolve(null),
	]);
	const usageId = reservation.usageId;
	if (usageId === null) {
		fail(res, 429, "limit_reached", `You've used your ${STAK_AI_WINDOW_LIMIT} STAK AI questions for now.`, { usage: reservation.usage });
		return null;
	}
	if (convResult && convResult.rows.length === 0) {
		void releaseQuestion(usageId);
		fail(res, 404, "not_found", "Conversation not found");
		return null;
	}
	try {
		const conversationId = (existingConvId as string | undefined) ?? null;
		const storedContext = convResult?.rows[0]?.context ?? null;
		const lastTickers = convResult?.rows[0]?.last_tickers ?? [];
		// The app should send context once; if it re-sends the same page, that's not a new page.
		const contextIsNew = !!newContext && JSON.stringify(newContext) !== JSON.stringify(storedContext);
		const context = contextIsNew ? newContext : storedContext;

		const [userResult, stakResult, historyResult] = await Promise.all([
			pgQuery<{ tag_scores: Record<string, number> | null; preferences: Record<string, unknown> | null; research_cohort: boolean }>(
				`SELECT tag_scores, preferences, research_cohort FROM users WHERE uid = $1`,
				[uid],
			),
			pgQuery<{ brand_id: string; price_at_save: number | null }>(
				`SELECT brand_id, price_at_save FROM stak_brands WHERE uid = $1`,
				[uid],
			),
			conversationId
				? pgQuery<{ role: string; content: string }>(
					`SELECT role, content FROM (SELECT role, content, created_at FROM stak_ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT ${HISTORY_TURNS}) sub ORDER BY created_at ASC`,
					[conversationId],
				)
				: Promise.resolve({ rows: [] as { role: string; content: string }[] }),
		]);

		const tagScores = userResult.rows[0]?.tag_scores ?? {};
		const familiarity = (userResult.rows[0]?.preferences as { familiarity?: string } | null)?.familiarity ?? null;

		// The first 50 STAK AI users join the research cohort. Awaited so a new member's first question is logged.
		let inCohort = userResult.rows[0]?.research_cohort ?? false;
		if (!inCohort && !cohortFull) {
			const enroll = await pgQuery<{ uid: string }>(
				`UPDATE users SET research_cohort = true WHERE uid = $1
				 AND (SELECT COUNT(*) FROM users WHERE research_cohort = true) < 50
				 RETURNING uid`,
				[uid],
			).catch(() => null);
			if (enroll?.rows.length) inCohort = true;
			else if (enroll) cohortFull = true;
		}

		const brandNames = stakResult.rows.flatMap((r) => {
			const profile = CATALOG.find((b) => b.id === r.brand_id);
			if (!profile) return [];
			const base = `${profile.name} (${profile.ticker})`;
			return [r.price_at_save != null ? `${base} — added at $${Number(r.price_at_save).toFixed(2)}` : base];
		});
		const topTags = Object.entries(tagScores).sort(([, a], [, b]) => b - a).slice(0, 3).map(([k]) => k);

		// Which companies get live price + news: the ones this question names; else a page it was just opened from;
		// else, if it points back ("is that normal for it?"), the ones the conversation was last about. A question
		// that does neither ("what's a P/E?", or a company outside the catalog without a $) gets none, rather than
		// the previous company's data.
		const named = detectNamedTickers(question);
		const refersBack = REFERS_BACK.test(question);
		const tickers = named.length > 0 ? named
			: contextIsNew ? contextTickers(newContext)
			: refersBack ? (lastTickers.length > 0 ? lastTickers.slice(0, 3) : contextTickers(context))
			: [];

		const liveDataLines: string[] = [];
		const newsLines: string[] = [];
		const liveContextLog: Record<string, string> = {};
		const sources: StakAiSource[] = [];
		if (tickers.length > 0) {
			const [prices, news] = await Promise.all([
				Promise.all(tickers.map(async (t) => ({ ticker: t, ctx: await fetchLiveStockContext(t) }))),
				Promise.all(tickers.map(async (t) => ({ ticker: t, articles: await withDeadline<FinnhubArticle[]>(getCompanyNews(t, 24, nameOf(t)), NEWS_DEADLINE_MS, []) }))),
			]);
			for (const { ticker, ctx } of prices) {
				if (!ctx) continue;
				liveDataLines.push(`• ${nameOf(ticker)} (${ticker}): ${ctx}`);
				liveContextLog[ticker] = ctx;
			}
			for (const { ticker, articles } of news) {
				const top = articles.slice(0, 5);
				if (top.length === 0) continue;
				newsLines.push(`${nameOf(ticker)} (${ticker}) recent headlines:\n${top.map((a) => `  - ${a.headline}`).join("\n")}`);
				for (const a of top) sources.push({ ticker, headline: a.headline, ...(a.url ? { url: a.url } : {}) });
			}
		}

		const systemInstruction = buildSystemContext({ familiarity, brandNames, topTags, easternDate: getEasternDateKey() });
		const contents: { role: string; parts: { text: string }[] }[] = historyResult.rows.map((m) => ({
			role: m.role === "assistant" ? "model" : "user",
			parts: [{ text: m.content }],
		}));

		// Where the user is (when they've just opened it, or point back at it), then live price + news, then the question.
		const notes: string[] = [];
		if (context && (contextIsNew || (named.length === 0 && refersBack))) notes.push(describeContext(context));
		if (liveDataLines.length > 0) notes.push(`Live market data:\n${liveDataLines.join("\n")}`);
		if (newsLines.length > 0) notes.push(`Recent news signals:\n${newsLines.join("\n\n")}`);
		if (notes.length > 0) {
			contents.push({ role: "user", parts: [{ text: `${notes.join("\n\n")}\n\nUse this context when answering the question below.` }] });
			contents.push({ role: "model", parts: [{ text: "Got it — I'll use this context in my answer." }] });
		}
		contents.push({ role: "user", parts: [{ text: question }] });

		return {
			uid, question, via, usageId, usageBefore: reservation.usage, conversationId, newContext, contextIsNew, context,
			lastTickers, tickers, sources, liveContextLog, inCohort, systemInstruction, contents, startedAt,
		};
	} catch (e) {
		void releaseQuestion(usageId);
		throw e;
	}
}

/**
 * Saves the exchange (as one unit: conversation, both messages, what it's now about), settles the limit (only real
 * answers count), and logs it - the research cohort's log and the usage event. Hands the question back if it throws.
 */
async function saveChat(p: Prepared, ai: { text: string; refused: boolean }, streamed: boolean): Promise<StakAiChatReply | null> {
	const parsed = ai.refused ? { text: ai.text, kind: "declined" as const, followUps: [] } : parseAnswer(ai.text);
	if (!parsed.text) {
		void releaseQuestion(p.usageId);
		return null;
	}
	const client = await pgPool.connect();
	let savedConversationId: string;
	let messageId: number | null;
	try {
		await client.query("BEGIN");
		if (p.conversationId) {
			await client.query(
				`UPDATE stak_ai_conversations SET updated_at = now(), last_tickers = $2, context = COALESCE($3::jsonb, context) WHERE id = $1`,
				[p.conversationId, p.tickers.length > 0 ? p.tickers : p.lastTickers, p.contextIsNew ? JSON.stringify(p.newContext) : null],
			);
			savedConversationId = p.conversationId;
		} else {
			savedConversationId = (await client.query<{ id: string }>(
				`INSERT INTO stak_ai_conversations (uid, title, context, last_tickers) VALUES ($1, $2, $3, $4) RETURNING id`,
				[p.uid, makeTitle(p.question, p.context), p.context ? JSON.stringify(p.context) : null, p.tickers],
			)).rows[0]!.id;
		}
		const inserted = await client.query<{ id: number; role: string }>(
			`INSERT INTO stak_ai_messages (conversation_id, uid, role, content, kind) VALUES ($1, $2, 'user', $3, 'answer'), ($1, $2, 'assistant', $4, $5) RETURNING id::int AS id, role`,
			[savedConversationId, p.uid, p.question, parsed.text, parsed.kind],
		);
		messageId = inserted.rows.find((r) => r.role === "assistant")?.id ?? null;
		await client.query("COMMIT");
	} catch (e) {
		await client.query("ROLLBACK").catch(() => {});
		void releaseQuestion(p.usageId);
		throw e;
	} finally {
		client.release();
	}

	// Only real answers count against the limit; a decline or a question back is handed back.
	const counts = parsed.kind === "answer";
	if (!counts) void releaseQuestion(p.usageId);
	const before = p.usageBefore;
	const usage: StakAiUsage = counts
		? { ...before, used: before.used + 1, remaining: Math.max(0, before.remaining - 1), resetsAt: before.resetsAt ?? windowEnd(new Date()) }
		: before;

	// Research cohort: what the AI saw vs. what it said (fire-and-forget — never blocks the response).
	if (p.inCohort) {
		pgQuery(
			`INSERT INTO stak_ai_research_log
			 (uid, conversation_id, user_message, brands_detected, news_headlines, live_context, ai_response, context)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[p.uid, savedConversationId, p.question, p.tickers, JSON.stringify(p.sources.map(({ ticker, headline }) => ({ ticker, headline }))), JSON.stringify(p.liveContextLog), parsed.text, p.context ? JSON.stringify(p.context) : null],
		).catch((e) => console.warn("[STAK AI] research log write failed:", e));
	}
	// Usage stats (the events table, read by /api/admin/analytics/stak-ai): how it was asked, from where, and how it went.
	pgQuery(
		`INSERT INTO events (uid, type, params) VALUES ($1, 'stak_ai_ask', $2)`,
		[p.uid, JSON.stringify({ via: p.via, context: p.context?.type ?? null, kind: parsed.kind, streamed, ms: Date.now() - p.startedAt, live: p.tickers.length > 0 })],
	).catch((e) => console.warn("[STAK AI] usage event write failed:", e));

	return {
		response: parsed.text,
		conversationId: savedConversationId,
		messageId,
		answerKind: parsed.kind,
		followUps: parsed.followUps,
		sources: p.sources.slice(0, 4),
		usage,
	};
}

const UNAVAILABLE = "STAK AI couldn't answer just now. That one didn't count — try again in a moment.";
const SERVER_ERROR = "Something went wrong on our side. That one didn't count.";

stakAiRouter.post("/chat", authMiddleware, async (req: AuthenticatedRequest, res) => {
	let p: Prepared | null = null;
	try {
		p = await prepareChat(req, res);
		if (!p) return;
		const ai = await askGemini(p.contents, p.systemInstruction);
		if (!ai) {
			void releaseQuestion(p.usageId);
			fail(res, 503, "ai_unavailable", UNAVAILABLE);
			return;
		}
		const reply = await saveChat(p, ai, false);
		if (!reply) { fail(res, 503, "ai_unavailable", UNAVAILABLE); return; }
		res.json(reply);
	} catch (e) {
		console.error("[STAK AI] chat error:", e);
		if (!res.headersSent) fail(res, 500, "server_error", SERVER_ERROR);
	}
});

/**
 * What of the model's text so far can be shown: the leading [[DECLINED]]/[[CLARIFY]] marker is dropped, and nothing
 * from the first "[[" on (the closing [[FOLLOWUPS]] line) - or a lone trailing "[" - goes out until the end, when
 * the `done` event's clean `response` replaces the streamed text anyway.
 */
export function streamableText(full: string): string {
	const t = full.trimStart();
	// Might still be reading a leading [[DECLINED]] / [[CLARIFY]]: wait until it's complete or clearly isn't one.
	if (t.startsWith("[") && !t.includes("]]") && t.length < 14) return "";
	const lead = t.match(/^\[\[(DECLINED|CLARIFY)\]\]\s*/i);
	const body = lead ? t.slice(lead[0].length) : t;
	const cut = body.indexOf("[[");
	const end = cut >= 0 ? cut : body.endsWith("[") ? body.length - 1 : body.length;
	return body.slice(0, end);
}

stakAiRouter.post("/chat/stream", authMiddleware, async (req: AuthenticatedRequest, res) => {
	let p: Prepared | null = null;
	try {
		p = await prepareChat(req, res);
		if (!p) return;
	} catch (e) {
		console.error("[STAK AI] stream prepare error:", e);
		if (!res.headersSent) fail(res, 500, "server_error", SERVER_ERROR);
		return;
	}
	res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
	res.flushHeaders();
	const send = (event: string, data: unknown) => {
		if (res.writableEnded) return;
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	};
	let shown = 0;
	try {
		const ai = await askGemini(p.contents, p.systemInstruction, (full) => {
			const safe = streamableText(full);
			if (safe.length > shown) {
				send("delta", { text: safe.slice(shown) });
				shown = safe.length;
			}
		});
		if (!ai) {
			void releaseQuestion(p.usageId);
			send("error", { code: "ai_unavailable", error: UNAVAILABLE });
		} else {
			// Saved even if the person has gone: the answer is in their history, and it counted.
			const reply = await saveChat(p, ai, true);
			if (reply) send("done", reply);
			else send("error", { code: "ai_unavailable", error: UNAVAILABLE });
		}
	} catch (e) {
		console.error("[STAK AI] stream error:", e);
		send("error", { code: "server_error", error: SERVER_ERROR });
	}
	res.end();
});

// GET /api/stak-ai/usage — questions left in the current window, for the counter in the chat.
stakAiRouter.get("/usage", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		res.json(await getUsage(req.user!.uid));
	} catch (e) {
		console.error("[STAK AI] usage error:", e);
		fail(res, 500, "server_error", "Couldn't load your STAK AI usage.");
	}
});

// GET /api/stak-ai/conversations?before=<updated_at> — 20 at a time, newest first, each with a label for what it was
// opened from and a preview of its latest answer. `nextBefore` pages further back (null at the end).
stakAiRouter.get("/conversations", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? req.query.before : null;
	try {
		const result = await pgQuery<{ id: string; title: string; context: StakAiContext | null; preview: string | null; created_at: string; updated_at: string }>(
			`SELECT c.id, c.title, c.context, c.created_at, c.updated_at,
			   (SELECT left(m.content, 140) FROM stak_ai_messages m
			    WHERE m.conversation_id = c.id AND m.role = 'assistant' ORDER BY m.created_at DESC LIMIT 1) AS preview
			 FROM stak_ai_conversations c
			 WHERE c.uid = $1 AND ($2::timestamptz IS NULL OR c.updated_at < $2::timestamptz)
			 ORDER BY c.updated_at DESC LIMIT 20`,
			[req.user!.uid, before],
		);
		const conversations = result.rows.map(({ context, ...c }) => ({ ...c, context_type: context?.type ?? null, context_label: contextLabel(context) }));
		const last = result.rows.at(-1);
		res.json({ conversations, nextBefore: result.rows.length === 20 && last ? new Date(last.updated_at).toISOString() : null });
	} catch (e) {
		console.error("[STAK AI] conversations error:", e);
		fail(res, 500, "server_error", "Couldn't load your conversations.");
	}
});

// GET /api/stak-ai/conversations/:id/messages
stakAiRouter.get("/conversations/:id/messages", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const uid = req.user!.uid;
	const id = String(req.params.id);
	if (!UUID_RE.test(id)) { fail(res, 404, "not_found", "Conversation not found"); return; }
	try {
		const convResult = await pgQuery<{ id: string; title: string; context: StakAiContext | null }>(
			`SELECT id, title, context FROM stak_ai_conversations WHERE id = $1 AND uid = $2`,
			[id, uid],
		);
		if (convResult.rows.length === 0) { fail(res, 404, "not_found", "Conversation not found"); return; }
		const msgResult = await pgQuery<{ id: number; role: string; content: string; kind: StakAiAnswerKind; feedback: number | null; created_at: string }>(
			`SELECT id::int AS id, role, content, kind, feedback, created_at FROM stak_ai_messages WHERE conversation_id = $1 AND uid = $2 ORDER BY created_at ASC`,
			[id, uid],
		);
		const conv = convResult.rows[0]!;
		res.json({ title: conv.title, context: conv.context, messages: msgResult.rows });
	} catch (e) {
		console.error("[STAK AI] messages error:", e);
		fail(res, 500, "server_error", "Couldn't load this conversation.");
	}
});

// PATCH /api/stak-ai/conversations/:id — rename. Body: { title }
stakAiRouter.patch("/conversations/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const id = String(req.params.id);
	const title = clip((req.body as { title?: unknown } | undefined)?.title, 80);
	if (!title) { fail(res, 400, "bad_request", "title is required"); return; }
	if (!UUID_RE.test(id)) { fail(res, 404, "not_found", "Conversation not found"); return; }
	try {
		const r = await pgQuery<{ id: string }>(`UPDATE stak_ai_conversations SET title = $3 WHERE id = $1 AND uid = $2 RETURNING id`, [id, req.user!.uid, title]);
		if (r.rows.length === 0) { fail(res, 404, "not_found", "Conversation not found"); return; }
		res.json({ ok: true, title });
	} catch (e) {
		console.error("[STAK AI] rename error:", e);
		fail(res, 500, "server_error", "Couldn't rename this conversation.");
	}
});

// DELETE /api/stak-ai/conversations/:id — its messages and research-log rows go with it (ON DELETE CASCADE). Its
// questions still count against the window: that's kept in stak_ai_usage, which deleting a chat doesn't touch.
stakAiRouter.delete("/conversations/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const id = String(req.params.id);
	if (!UUID_RE.test(id)) { fail(res, 404, "not_found", "Conversation not found"); return; }
	try {
		const r = await pgQuery<{ id: string }>(`DELETE FROM stak_ai_conversations WHERE id = $1 AND uid = $2 RETURNING id`, [id, req.user!.uid]);
		if (r.rows.length === 0) { fail(res, 404, "not_found", "Conversation not found"); return; }
		res.json({ ok: true });
	} catch (e) {
		console.error("[STAK AI] delete error:", e);
		fail(res, 500, "server_error", "Couldn't delete this conversation.");
	}
});

// POST /api/stak-ai/messages/:id/feedback — thumbs on an answer. Body: { value: 1 | -1 | null } (null clears it).
stakAiRouter.post("/messages/:id/feedback", authMiddleware, async (req: AuthenticatedRequest, res) => {
	const value = (req.body as { value?: unknown } | undefined)?.value ?? null;
	const id = Number(req.params.id);
	if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647 || !(value === 1 || value === -1 || value === null)) {
		fail(res, 400, "bad_request", "value must be 1, -1 or null");
		return;
	}
	try {
		const r = await pgQuery<{ id: number }>(
			`UPDATE stak_ai_messages SET feedback = $3 WHERE id = $1 AND uid = $2 AND role = 'assistant' RETURNING id::int AS id`,
			[id, req.user!.uid, value],
		);
		if (r.rows.length === 0) { fail(res, 404, "not_found", "Message not found"); return; }
		res.json({ ok: true });
	} catch (e) {
		console.error("[STAK AI] feedback error:", e);
		fail(res, 500, "server_error", "Couldn't save that.");
	}
});

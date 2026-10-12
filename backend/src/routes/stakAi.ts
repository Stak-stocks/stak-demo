import { Router, type Response } from "express";
import { pgQuery, pgPool } from "../lib/postgres.js";
import { escapeRegExp } from "../lib/regex.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { getGeminiKeys, withGeminiConcurrencyLimit, GEMINI_REFUSAL_RE, GEMINI_MODEL, geminiStreamUrl } from "../services/geminiService.js";
import { getCompanyNews, nameVariants, type FinnhubArticle } from "../services/finnhubService.js";
import { getQuarterlyEps, getStockSnapshot, type QuarterlyEps } from "./stock.js";
import {
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
/** Longest a plain (not streamed) answer may take, all keys included: inside the apps' 45s read timeout. */
const PLAIN_ANSWER_MS = 38_000;
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
/**
 * Tickers that are fine in capitals but are words or common abbreviations in lowercase ("usb", "mrna", "spot"); every
 * other ticker of three or more letters also counts typed in lowercase ("avgo", "Pltr"), as people do on a phone.
 * (Headline tagging keeps its own, stricter list in finnhubService: there, even capitals need a citation.)
 */
const LOWERCASE_WORDS = new Set([
	"AMP", "AMT", "APP", "BABA", "BEN", "BILL", "BLK", "BROS", "CAKE", "CART", "CFG", "COIN", "CRM", "DAL", "DASH", "DLR",
	"ELF", "EXC", "FIZZ", "GILD", "HAL", "HES", "HON", "HOOD", "HUBS", "HUM", "ICE", "JACK", "LIN", "LMT", "LUV", "MAR",
	"MET", "MMM", "MRNA", "NEE", "NET", "OXY", "PATH", "PEP", "PINS", "PLUG", "RIOT", "SAM", "SAP", "SHOP", "SNOW", "SPOT",
	"TEAM", "UNH", "USB", "WING", "YUM", "SNAP", "ALLY", "PENN", "LULU", "ORLY", "DOCU", "EMR", "GIS", "APO", "TROW",
]);
/** A company's first word that, on its own, is an everyday word ("Trade" of The Trade Desk, "Cadence", "Southern"). */
const COMMON_FIRST_WORDS = new Set(["trade", "cadence", "microchip", "southern", "dominion", "devon", "apollo", "archer", "novo", "cheesecake"]);

/**
 * A name as a pattern: CamelCase names also match with a space ("app lovin", "Game Stop"). Case-insensitive unless
 * [exactCase], an everyday word, or an acronym that's a word ("ARM" of "ARM Holdings", "SAP" and "UPS"). The edges
 * aren't \b, so names ending in a dot or apostrophe ("e.l.f.", "Bloomin'") still match.
 */
function namePattern(name: string, exactCase = false): RegExp {
	const body = escapeRegExp(name).replace(/([a-z])([A-Z])/g, "$1\\s?$2");
	const wordLike = WORD_NAMES.has(name.toLowerCase()) || WORD_TICKERS.has(name) || LOWERCASE_WORDS.has(name);
	return new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])`, exactCase || wordLike ? "" : "i");
}

/**
 * Built once: a matcher per way a brand is named and a ticker matcher. Names are the catalog name and the everyday
 * one news tagging uses ("AppLovin Corp" is "AppLovin"), in any case; the shorter ones it also uses ("Ford" of
 * "Ford Motor") only capitalized, as a lone first word in lowercase is usually just a word.
 */
const MATCHERS = CATALOG.map((b) => {
	const [base, ...shorter] = nameVariants(b.name);
	return {
		brand: b,
		names: [
			...[...new Set([b.name, base ?? b.name])].filter((n) => !COMMON_FIRST_WORDS.has(n.toLowerCase())).map((n) => namePattern(n)),
			...shorter.filter((n) => !COMMON_FIRST_WORDS.has(n.toLowerCase())).map((n) => namePattern(n, true)),
		],
		ticker: b.ticker.length >= 2 && !WORD_TICKERS.has(b.ticker)
			? new RegExp(`(?<![A-Za-z$])${escapeRegExp(b.ticker)}\\b`, b.ticker.length >= 3 && !LOWERCASE_WORDS.has(b.ticker) ? "i" : "")
			: null,
	};
});

/**
 * The few word-tickers people type in lowercase for the company ("app" for AppLovin, "coin", "hood") count in plainly
 * stock phrasing only: "why is app down", "how come app is falling", "app stock", "app's earnings". Not "is app up to
 * date", "the app is down", "which app stock" or "meme coin stocks" - after an article, "which", "meme"... the word is
 * the everyday one. Kept to these three on purpose: wider, "why is snow falling" became Snowflake.
 */
const PHRASE_TICKERS = ["APP", "COIN", "HOOD"];
/** Not "crash": "why did app crash" is about an app. */
const MOVE_WORDS_SRC = "down|up|moving|moved|drop|dropping|dropped|fall|falling|fell|tank|tanking|tanked|sink|sinking|sank|plunge|plunging|plunged|jump|jumped|surge|surging|surged|rally|rallying|rallied|so (?:low|high)";
const LOSS_GAIN_WORDS_SRC = "lost|lose|losing|gained|gain|gaining";
const STOCK_WORDS_SRC ="stock|stocks|shares|share price|earnings|price target|market cap";
const NOT_AFTER_SRC = "(?<!\\b(?:a|an|the|my|this|that|your|our|their|his|her|its|stak|an?other|which|what|any|some|every|good|best|new|meme|crypto|top|cheap)\\s+)";
const WORD_TICKER_PHRASES = PHRASE_TICKERS.filter((t) => CATALOG.some((b) => b.ticker === t)).map((t) => {
	const w = escapeRegExp(t.toLowerCase());
	return {
		ticker: t,
		phrase: new RegExp(
			`\\b(?:why|how come)\\s+(?:is|was|did|has|had|have)\\s+${w}\\s+(?:${MOVE_WORDS_SRC})\\b(?!\\s+(?:to|for|on)\\b)` +
			`|\\bhow come\\s+${w}\\s+(?:is|was|has)\\s+(?:${MOVE_WORDS_SRC})\\b(?!\\s+(?:to|for|on)\\b)` +
			// Lost/gained only with an amount or nothing after: "why had app lost 53%", not "why did app lose my streak".
			`|\\b(?:why|how come)\\s+(?:is|was|did|has|had|have)\\s+${w}\\s+(?:${LOSS_GAIN_WORDS_SRC})(?=\\s*(?:$|[?.!,]|[$\\d]|so much\\b|value\\b))` +
			`|${NOT_AFTER_SRC}\\b${w}(?:'s)?\\s+(?:${STOCK_WORDS_SRC})\\b`,
			"i",
		),
	};
});

/** "$PLTR"-style cashtags: any ticker, catalog or not, word-like or not. */
function detectCashtags(message: string): string[] {
	return [...message.matchAll(/\$([A-Za-z][A-Za-z.-]{0,9})\b/g)].map((m) => m[1]!.toUpperCase()).filter((t) => TICKER_RE.test(t));
}

/** Up to three tickers the question names: catalog companies by name or ticker (in lowercase too, unless it's a word), plus cashtags. */
export function detectNamedTickers(raw: string): string[] {
	// Phone keyboards type curly apostrophes ("McDonald’s"); the catalog writes straight ones.
	const message = raw.replace(/[‘’ʼ]/g, "'");
	const fromCatalog = MATCHERS.filter((m) => m.names.some((n) => n.test(message)) || (m.ticker?.test(message) ?? false)).map((m) => m.brand.ticker);
	const fromPhrases = WORD_TICKER_PHRASES.filter((p) => p.phrase.test(message)).map((p) => p.ticker);
	return [...new Set([...detectCashtags(message), ...fromCatalog, ...fromPhrases, ...detectTypos(message)])].slice(0, 3);
}

/** Everyday words one letter off a company name: "synopsis" isn't Synopsys, "marvels" isn't Marvell. */
const TYPO_LOOKALIKES = new Set([
	"synopsis", "traveler", "travelers", "travellers", "marvels", "proctor", "goodman", "striker", "equinox", "evermore",
	"snowflakes", "caterpillars", "workdays", "upstarts", "moderns", "chevrons", "emersion", "bringer", "blinker",
]);

/**
 * One-word company names of seven letters or more, letters only ("mcdonalds", "cocacola"), for catching a one-letter
 * slip ("apploving", "robinhod") - or the plain form of a name written with punctuation ("mcdonalds" for McDonald's).
 * Only the names matched in any case (the full one, and its everyday form): a shorter first word ("Goldman") only
 * counts capitalized. Shorter names are left out: one letter off "boeing" is "boring".
 */
const TYPO_NAMES = CATALOG.flatMap((b) => {
	const [base] = nameVariants(b.name);
	return [...new Set([b.name, base ?? b.name])].flatMap((n) => {
		const name = n.toLowerCase().replace(/[^a-z]/g, "");
		const oneWord = !/\s/.test(n.trim());
		return oneWord && name.length >= 7 && !WORD_NAMES.has(name) && !COMMON_FIRST_WORDS.has(name)
			? [{ name, ticker: b.ticker, punctuated: name !== n.toLowerCase() }]
			: [];
	});
});

/** At most one letter added, dropped or changed between [a] and [b]. */
function oneEditApart(a: string, b: string): boolean {
	if (Math.abs(a.length - b.length) > 1) return false;
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
	return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * Companies named with a one-letter typo, from words of seven letters or more. The first letter must be right: slips
 * rarely hit it, and without it "interest" is "pinterest".
 */
function detectTypos(message: string): string[] {
	const words = [...new Set(message.toLowerCase().match(/[a-z]{7,}/g) ?? [])].filter((w) => !TYPO_LOOKALIKES.has(w));
	return TYPO_NAMES
		.filter(({ name, punctuated }) => words.some((w) => (w === name ? punctuated : w[0] === name[0] && oneEditApart(w, name))))
		.map((t) => t.ticker);
}

/** The question points back at something earlier ("is that normal for it?", "what does this mean?"). */
const REFERS_BACK = /\b(it|it's|its|they|them|their|this|that|these|those|the (stock|stocks|company|shares|article|story|news|brief))\b/i;
/** The question is about what's happening ("any negative catalyst?", "lawsuit?"), so it needs the current company's data. */
const ASKS_ABOUT_NEWS = /\b(news|update|updates|catalyst|catalysts|lawsuit|lawsuits|litigation|sued|analyst|analysts|headline|headlines|dropped|falling|fell|rallied|jumped|sank|plunged|soared)\b|\bwhy\b.*\b(up|down|moving|moved)\b/i;
/** The question touches reported results ("did they beat last quarter?", "Q2 earnings?"): its companies' past quarters are loaded. */
const ASKS_ABOUT_EARNINGS = /\b(earnings?|eps|quarters?|quarterly|q[1-4]|results?|reports?|reported|beat|beats|miss|missed|misses|estimates?|expectations?)\b/i;
/**
 * Plainly a follow-up about the conversation's company's results ("and last quarter's earnings?", "did they beat
 * estimates?") - narrower than the above, so "I don't want to miss out" doesn't bring the last company back.
 */
const ASKS_ABOUT_ITS_EARNINGS = /\b(earnings|eps|quarterly|q[1-4]|last quarter|(?:beat|beats|missed|miss|misses) (?:the )?(?:estimates?|expectations?|earnings))\b/i;
/** A definition ("what does EPS mean?", "how do estimates work?"), which is about no company in particular. */
const ASKS_WHAT_A_TERM_MEANS = /^\s*(?:what(?:'s| is| are| does| do)|how (?:do|does|is|are))\b.*\b(?:mean|means|work|works|a|an)\b/i;
/** About the whole market, not the conversation's company ("why is the S&P down?"). */
const MARKET_WIDE = /\b(market|markets|s&p|sp500|dow|nasdaq|index|indexes|indices|sector|economy)\b/i;
/** Capitalized words that aren't companies: days, months, the Fed, STAK. */
const NOT_A_COMPANY = new Set([
	"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "march", "april",
	"june", "july", "august", "september", "october", "november", "december", "fed", "stak", "wall", "street", "trump",
]);
/**
 * A Capitalized word mid-sentence ("Why is Foobarco moving?"): likely a company we don't know, so the follow-up isn't
 * about the last one. Acronyms ("any lawsuit from the SEC?") and days, months and the like don't count.
 */
function namesSomethingElse(question: string): boolean {
	return [...question.matchAll(/[^.?!\s]\s+([A-Z][a-z]{2,})/g)].some((m) => !NOT_A_COMPANY.has(m[1]!.toLowerCase()));
}
/** A follow-up that names no company but asks what's happening with the conversation's one ("any lawsuit?"). */
const asksAboutLastCompany = (question: string) =>
	(ASKS_ABOUT_NEWS.test(question) || (ASKS_ABOUT_ITS_EARNINGS.test(question) && !ASKS_WHAT_A_TERM_MEANS.test(question)))
	&& !MARKET_WIDE.test(question) && !namesSomethingElse(question);

const nameOf = (ticker: string) => CATALOG.find((b) => b.ticker === ticker)?.name ?? ticker;

const QUARTER_MONTH = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", year: "numeric" });

/**
 * "Fiscal Q2 2027 (period listed as Sep 2026): $2.22 vs $2.14 estimate - beat by $0.08 (3.8%)". Finnhub's period is a
 * calendar quarter end, not the company's own nor the day it reported (NVIDIA's fiscal Q2 2027 shows as Sep 30,
 * 2026), so it's only a rough month. Compared in cents, as shown; the percent only where it means something - with an
 * estimate near zero or below it, "missed by 300%" says nothing a beginner can use.
 */
function describeQuarter(q: QuarterlyEps): string {
	const month = /^\d{4}-\d{2}-\d{2}$/.test(q.period) ? QUARTER_MONTH.format(new Date(`${q.period}T00:00:00Z`)) : q.period;
	const name = q.quarter && q.year ? `Fiscal Q${q.quarter} ${q.year} (period listed as ${month})` : `Quarter listed as ${month}`;
	const money = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;
	if (q.actual == null) return `${name}: no reported figure`;
	if (q.estimate == null) return `${name}: ${money(q.actual)}, no estimate on record`;
	const actualCents = Math.round(q.actual * 100);
	const estimateCents = Math.round(q.estimate * 100);
	if (actualCents === estimateCents) return `${name}: ${money(q.actual)} vs ${money(q.estimate)} estimate - in line`;
	const verdict = actualCents > estimateCents ? "beat" : "missed";
	const pct = q.surprisePercent;
	const showPct = pct != null && q.estimate > 0 && q.actual > 0 && Math.abs(pct) <= 100;
	return `${name}: ${money(q.actual)} vs ${money(q.estimate)} estimate - ${verdict} by ${money(Math.abs(actualCents - estimateCents) / 100)}${showPct ? ` (${Math.abs(pct).toFixed(1)}%)` : ""}`;
}

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
// (or an account's own limit from stak_ai_limits - teammates testing, say - where a null limit means none)

type UsageRow = { used: number; oldest: string | Date | null; own_limit: number | null; unlimited: boolean | null };
/** What an unlimited account's `limit` and `remaining` say, for app versions that don't read `unlimited`. */
const UNLIMITED_SHOWN = 999;
const windowEnd = (from: Date | string) => new Date(new Date(from).getTime() + STAK_AI_WINDOW_HOURS * 3_600_000).toISOString();
const USAGE_SQL = `SELECT COUNT(*)::int AS used, MIN(created_at) AS oldest,
	(SELECT window_limit FROM stak_ai_limits WHERE uid = $1) AS own_limit,
	EXISTS (SELECT 1 FROM stak_ai_limits WHERE uid = $1 AND window_limit IS NULL) AS unlimited
	FROM stak_ai_usage WHERE uid = $1 AND created_at >= NOW() - INTERVAL '${STAK_AI_WINDOW_HOURS} hours'`;

function toUsage(row: UsageRow | undefined): StakAiUsage {
	const used = Number(row?.used ?? 0);
	if (row?.unlimited) return { limit: UNLIMITED_SHOWN, used, remaining: UNLIMITED_SHOWN, resetsAt: null, unlimited: true };
	const limit = row?.own_limit ?? STAK_AI_WINDOW_LIMIT;
	return { limit, used, remaining: Math.max(0, limit - used), resetsAt: row?.oldest ? windowEnd(row.oldest) : null };
}

async function getUsage(uid: string): Promise<StakAiUsage> {
	return toUsage((await pgQuery<UsageRow>(USAGE_SQL, [uid])).rows[0]);
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
		const usage = toUsage((await client.query<UsageRow>(USAGE_SQL, [uid])).rows[0]);
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
		const { week52Low, week52High, yearReturn, ytdReturn } = data.metrics;
		if (week52Low != null && week52High != null) parts.push(`52-week range $${week52Low.toFixed(2)}-$${week52High.toFixed(2)} (as of last close)`);
		if (yearReturn != null) parts.push(`past year ${signedPct(yearReturn)}`);
		if (ytdReturn != null) parts.push(`year to date ${signedPct(ytdReturn)}`);
		return parts.join(" | ");
	} catch {
		return null;
	}
}

/** "Thu, Oct 8": headlines and the prompt's "today" share it, so the model compares like with like (and sees weekends). */
const HEADLINE_DAY = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });
/** "(Thu, Oct 8) ", so the model can tell today's news from last week's; nothing when the date is missing. */
function headlineDate(unixSeconds: number | undefined): string {
	return unixSeconds && Number.isFinite(unixSeconds) ? `(${HEADLINE_DAY.format(new Date(unixSeconds * 1000))}) ` : "";
}

/** Headlines given per company, how many may be picked for matching the question, summary length, and how far back a
 * question about a particular story looks for it ("the Unity lawsuit" may be weeks old). */
const HEADLINES_SHOWN = 6;
const MATCHED_HEADLINES = 3;
const SUMMARY_CHARS = 220;
const OLDER_NEWS_DAYS = 30;
/** A month of a heavily covered stock runs to hundreds of articles: keep enough that a weeks-old story isn't cut. */
const OLDER_NEWS_LIMIT = 300;
/** Question words that say nothing about which story they mean: filler, moves, and words every stock story has. */
const NOT_A_TOPIC = new Set([
	"about", "after", "again", "also", "anything", "been", "before", "could", "does", "doing", "explain", "from", "going",
	"happen", "happened", "happening", "have", "into", "just", "know", "lately", "like", "mean", "means", "more", "much",
	"over", "really", "recent", "recently", "should", "some", "still", "tell", "that", "their", "them", "there", "they",
	"think", "this", "thought", "today", "what", "when", "where", "which", "while", "with", "would", "your",
	"news", "update", "updates", "week", "weeks", "month", "year", "years", "price", "share", "shares", "stock", "stocks",
	"company", "market", "markets", "investors", "analyst", "analysts", "worth", "good", "best", "invest", "investment",
	"buying", "selling", "down", "move", "moved", "moving", "drop", "dropped", "dropping", "fall", "falling", "fell", "rise",
	"rising", "rose", "jump", "jumped", "jumping", "tank", "tanked", "tanking", "crash", "crashed", "crashing", "surge",
	"surged", "surging", "rally", "rallied", "rallying", "sink", "sinking", "sank", "plunge", "plunged", "plunging",
	"soar", "soared", "soaring", "gain", "gained", "gains", "lost", "lose", "losing", "losses", "high", "highs", "lows",
]);

/** The question's words that could name a story ("unity", "lawsuit", "restraining"), not the company's own. */
export function questionTopics(question: string, ticker: string): string[] {
	const company = new Set([ticker, ...nameOf(ticker).split(/\s+/)].map((w) => w.toLowerCase()));
	return [...new Set((question.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []).map((w) => w.replace(/'s$/, "")))]
		.filter((w) => !NOT_A_TOPIC.has(w) && !company.has(w));
}

/**
 * The headlines the model gets for a company: up to three whose headline or summary share the most words with the
 * question come first - from this week or, in [older], the past month - then this week's newest, up to six.
 */
export function pickHeadlines(recent: FinnhubArticle[], question: string, ticker: string, older: FinnhubArticle[] = []): FinnhubArticle[] {
	// Whole words, plurals too ("lawsuit" finds "lawsuits", but "unit" doesn't find "unity").
	const topics = questionTopics(question, ticker).map((w) => new RegExp(`\\b${escapeRegExp(w)}(?:s|es)?\\b`));
	const seen = new Set<string>();
	const unique = (list: FinnhubArticle[]) => list.filter((a) => !seen.has(a.headline) && !!seen.add(a.headline));
	const thisWeek = unique(recent);
	const pool = [...thisWeek, ...unique(older)];
	const score = (a: FinnhubArticle) => {
		const text = `${a.headline} ${a.summary ?? ""}`.toLowerCase();
		return topics.filter((re) => re.test(text)).length;
	};
	const matched = topics.length === 0 ? [] : pool
		.map((a, i) => ({ a, i, score: score(a) }))
		.filter((x) => x.score > 0)
		.sort((x, y) => y.score - x.score || x.i - y.i)
		.slice(0, MATCHED_HEADLINES)
		.map((x) => x.a);
	return [...matched, ...thisWeek.filter((a) => !matched.includes(a))].slice(0, HEADLINES_SHOWN);
}

/** "+4.0%", "-53.1%". */
const signedPct = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

/** A headline's summary, cut at a word with "…" past SUMMARY_CHARS; undefined when there's none. */
function shortSummary(summary: string | undefined): string | undefined {
	const full = summary?.trim().replace(/\s+/g, " ");
	if (!full) return undefined;
	if (full.length <= SUMMARY_CHARS) return full;
	const cut = full.lastIndexOf(" ", SUMMARY_CHARS);
	return `${full.slice(0, cut > SUMMARY_CHARS / 2 ? cut : SUMMARY_CHARS).replace(/[\s,.;:-]+$/, "")}…`;
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
			// Without [onText] (plain /chat: older app versions, which give up after 45s) nothing reaches the person until
			// the end, so the whole answer has to fit in PLAIN_ANSWER_MS, however steadily it's arriving.
			const cap = onText ? undefined : setTimeout(() => controller.abort(), PLAIN_ANSWER_MS - (Date.now() - started));
			const stillTalking = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), IDLE_MS); };
			try {
				const res = await fetch(geminiStreamUrl(GEMINI_MODEL, key), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						system_instruction: { parts: [{ text: systemInstruction }] },
						contents,
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.3 },
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
				clearTimeout(cap);
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
When someone asks for advice or a prediction, start your reply with [[DECLINED]], then in one or two friendly sentences say you can't give advice or predictions, and offer what you can explain instead (what's been moving it, how people weigh the trade-offs). End that reply with one sentence noting it isn't financial advice. [[DECLINED]] is only for advice and predictions: saying you can't browse or don't have some data is a normal answer.
"What does this mean for me?" or "how does this affect me?" is not a request for advice: explain what the news means for the companies involved, and for any of them in their STAK, without saying what to do. Only questions about what to do (buy, sell, hold, when) get [[DECLINED]].

━━━ "WHY DID IT MOVE?" ━━━
- Lead with the answer in one or two sentences: the catalyst from the notes, or "Nothing in the news I have explains this move."
- Then briefly: what happened, why it matters for the stock, and anything uncertain (competing explanations, unconfirmed reports).
- Never invent a reason, and never give an event you remember as the reason for a move today. A move under about 1% is normal day-to-day noise; say so.
- If the notes show the question has a wrong premise (wrong direction, size or ticker), correct it first. With no data, say you can't confirm the move rather than guessing.
- Separate company-specific news from a market- or sector-wide move.
- If they sound worried about a move, be calm first: swings are normal.

━━━ FACTS: ONLY WHAT YOU'VE BEEN GIVEN ━━━
Your memory of companies and markets is out of date, often by years. Your only current information is the notes in this conversation: "Live market data", "Recent news signals", "Past quarterly results", and what the user opened STAK AI from (an article's headline and summary, the Daily Brief's points, or just which stock page it was; you can't see the page itself).
- Never state a current or recent price, move, P/E, market cap, earnings date or result, deal, lawsuit, analyst rating or price target unless it's in the notes. If it isn't, say so in one short sentence, then still help with what you can (background, what that kind of news usually means). Point them to the company's page or News in STAK at most once in a conversation.
- Figures in your earlier replies may be wrong; don't repeat them as current.
- Report what the notes say, without adding details they don't contain. A summary ending in "…" is cut off: never guess how it goes on or how things turned out (rulings, amounts, guidance).
- "Older stories matching the question" are weeks old: use one to answer a question about that story, saying when it came out, but never as the reason for today's move.
- "Past quarterly results" give earnings per share against analysts' estimates for the last few reported quarters - nothing else: no revenue, guidance or why. Use those exact figures. Quarters are the company's fiscal ones (a fiscal year can run ahead of the calendar), so name them as given and say "fiscal". They don't say when results were announced or when the next report is: never state either date. For anything they don't cover, say you don't have it.
- Past-year and year-to-date changes cover months, and your headlines only the last few weeks: don't give a headline as the cause of a long-term move. Say what recent news shows, and that you don't have the news from earlier in the year that drove most of it. Headlines carry their date (US Eastern): call something today's news only if it's dated today, and don't guess how new an undated one is. A headline from the last day or two (or the last trading day, after a weekend) can still explain today's move: just say when it came out.
- Lasting background (what a company does, its competitors, what a term means) can come from memory. A past event from memory must carry its year and be framed as history.
- Made-up numbers to explain a concept are fine when clearly labelled as an example.
- You can't browse, search or open pages. Never say you looked something up, checked a page, or reviewed the latest information.
- When the user says you're wrong, take it as being about your last factual claim. Check it against the notes: say what they show, or that you can't confirm it either way. Don't adopt a number or event the user gives you unless the notes show it. Apologize once, briefly; never promise to learn, improve or review anything.
- If the user is rude, don't mention it: answer the question, or if there isn't one, briefly offer to help.

━━━ UNCLEAR QUESTIONS ━━━
Resolve "it", "they" or "this stock" from the conversation and stay on that company. If you genuinely can't tell what they mean or which company, start your reply with [[CLARIFY]] and ask one short question. Pushback ("you're wrong", "that's not true") and insults are never unclear: don't use [[CLARIFY]] for them.
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
		fail(res, 429, "limit_reached", `You've used your ${reservation.usage.limit} STAK AI questions for now.`, { usage: reservation.usage });
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
					// A question and its answer are saved together and share a timestamp: the id keeps the question first.
					`SELECT role, content FROM (SELECT id, role, content, created_at FROM stak_ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT ${HISTORY_TURNS}) sub ORDER BY created_at ASC, id ASC`,
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
		// else, if it points back ("is that normal for it?") or asks what's happening ("any lawsuit?"), the ones the
		// conversation was last about. A question that does none of these ("what's a P/E?", or a company outside the
		// catalog without a $) gets none, rather than the previous company's data.
		const named = detectNamedTickers(question);
		const refersBack = REFERS_BACK.test(question) || asksAboutLastCompany(question);
		const tickers = named.length > 0 ? named
			: contextIsNew ? contextTickers(newContext)
			: refersBack ? (lastTickers.length > 0 ? lastTickers.slice(0, 3) : contextTickers(context))
			: [];

		const liveDataLines: string[] = [];
		const newsLines: string[] = [];
		const earningsLines: string[] = [];
		const liveContextLog: Record<string, string> = {};
		const sources: StakAiSource[] = [];
		if (tickers.length > 0) {
			const wantsEarnings = ASKS_ABOUT_EARNINGS.test(question);
			const [prices, news, earnings] = await Promise.all([
				Promise.all(tickers.map(async (t) => ({ ticker: t, ctx: await fetchLiveStockContext(t) }))),
				Promise.all(tickers.map(async (t) => {
					// A question about a particular story ("the Unity lawsuit") also looks back a month for it - no NewsAPI
					// fallback there (no company name), as its daily quota is small.
					const [articles, older] = await Promise.all([
						withDeadline<FinnhubArticle[] | null>(getCompanyNews(t, 24, nameOf(t)), NEWS_DEADLINE_MS, null),
						questionTopics(question, t).length > 0
							? withDeadline<FinnhubArticle[]>(getCompanyNews(t, OLDER_NEWS_LIMIT, undefined, { days: OLDER_NEWS_DAYS }), NEWS_DEADLINE_MS, [])
							: Promise.resolve([]),
					]);
					return { ticker: t, articles, older };
				})),
				// Past quarterly results, only for a question about them ("did they beat last quarter?").
				wantsEarnings
					? Promise.all(tickers.map(async (t) => ({ ticker: t, quarters: await withDeadline<QuarterlyEps[] | null>(getQuarterlyEps(t), NEWS_DEADLINE_MS, null) })))
					: Promise.resolve([]),
			]);
			// A gap is said out loud, so the model reports it rather than filling it from memory.
			for (const { ticker, ctx } of prices) {
				liveDataLines.push(`• ${nameOf(ticker)} (${ticker}): ${ctx ?? "no live quote available right now"}`);
				if (ctx) liveContextLog[ticker] = ctx;
			}
			for (const { ticker, quarters } of earnings) {
				const label = `${nameOf(ticker)} (${ticker})`;
				if (!quarters) earningsLines.push(`${label}: past quarterly results couldn't be loaded just now.`);
				else if (quarters.length === 0) earningsLines.push(`${label}: no past quarterly results available.`);
				else earningsLines.push(`${label} last ${quarters.length} reported quarters, newest first (earnings per share, actual vs analysts' estimate):\n${quarters.map((q) => `  - ${describeQuarter(q)}`).join("\n")}`);
			}
			const item = (a: FinnhubArticle) => {
				const summary = shortSummary(a.summary);
				return `  - ${headlineDate(a.datetime)}${a.headline}${summary ? `\n    ${summary}` : ""}`;
			};
			const weekAgo = Date.now() / 1000 - 7 * 86_400;
			for (const { ticker, articles, older } of news) {
				const label = `${nameOf(ticker)} (${ticker})`;
				if (!articles && older.length === 0) {
					newsLines.push(`${label}: news couldn't be loaded just now.`);
					continue;
				}
				const top = pickHeadlines(articles ?? [], question, ticker, older);
				if (top.length === 0) {
					newsLines.push(`${label}: no headlines found from the past week.`);
					continue;
				}
				// Older stories that match the question are labelled as such, so they're never read as today's news.
				const isOld = (a: FinnhubArticle) => !!a.datetime && a.datetime < weekAgo;
				const fresh = top.filter((a) => !isOld(a));
				const old = top.filter(isOld);
				if (fresh.length > 0) newsLines.push(`${label} headlines from the past week:\n${fresh.map(item).join("\n")}`);
				else newsLines.push(`${label}: ${articles ? "no headlines found from the past week." : "this week's news couldn't be loaded just now."}`);
				if (old.length > 0) newsLines.push(`${label} older stories matching the question (not recent news):\n${old.map(item).join("\n")}`);
				for (const a of [...fresh, ...old]) sources.push({ ticker, headline: a.headline, ...(a.url ? { url: a.url } : {}) });
			}
		}

		const systemInstruction = buildSystemContext({ familiarity, brandNames, topTags, easternDate: HEADLINE_DAY.format(new Date()) });
		const contents: { role: string; parts: { text: string }[] }[] = historyResult.rows.map((m) => ({
			role: m.role === "assistant" ? "model" : "user",
			parts: [{ text: m.content }],
		}));

		// Where the user is (when they've just opened it, or point back at it), then live price + news, then the question.
		const notes: string[] = [];
		// The page is only re-noted when this question's data is that page's: after switching to another company, an
		// "any lawsuit?" shouldn't come with "they opened this from the Tesla page" beside NVIDIA's numbers.
		const dataIsThePage = tickers.every((t) => contextTickers(context).includes(t));
		if (context && (contextIsNew || (named.length === 0 && refersBack && dataIsThePage))) notes.push(describeContext(context));
		if (liveDataLines.length > 0) notes.push(`Live market data:\n${liveDataLines.join("\n")}`);
		if (earningsLines.length > 0) notes.push(`Past quarterly results:\n${earningsLines.join("\n\n")}`);
		if (newsLines.length > 0) notes.push(`Recent news signals:\n${newsLines.join("\n\n")}`);
		// Said, not left implied: with nothing loaded it once answered "Apple is up 12.5% this year" from nowhere.
		if (tickers.length === 0) {
			notes.push(
				"No live market data or news was loaded for this question. Don't state any current price, move or other current company or market figure unless it's in these notes. " +
				"Worked examples with made-up numbers (labelled as examples) and long-run background are still fine." +
				(context ? "" : " If the question needs a current figure, say you don't have it, or ask which company they mean."),
			);
		}
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
			    WHERE m.conversation_id = c.id AND m.role = 'assistant' ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS preview
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
			`SELECT id::int AS id, role, content, kind, feedback, created_at FROM stak_ai_messages WHERE conversation_id = $1 AND uid = $2 ORDER BY created_at ASC, id ASC`,
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

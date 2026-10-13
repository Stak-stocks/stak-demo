import { Router, type Response } from "express";
import { pgQuery, pgPool } from "../lib/postgres.js";
import { escapeRegExp } from "../lib/regex.js";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { getGeminiKeys, withGeminiConcurrencyLimit, GEMINI_REFUSAL_RE, GEMINI_MODEL, geminiStreamUrl } from "../services/geminiService.js";
import { getCompanyNews, nameVariants, type FinnhubArticle } from "../services/finnhubService.js";
import { getQuarterlyEps, getStockSnapshot, type QuarterlyEps } from "./stock.js";
import { unsupportedFigures } from "../services/stakAiFigures.js";
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
const REFERS_BACK = /\b(it|it's|its|they|them|their|this|that|these|those|the (stock|stocks|company|shares|article|story|news|brief)|(?:what|how) about)\b/i;
/** The question is about what's happening ("any negative catalyst?", "lawsuit?"), so it needs the current company's data. */
const ASKS_ABOUT_NEWS = /\b(news|update|updates|catalyst|catalysts|lawsuit|lawsuits|litigation|sued|analyst|analysts|headline|headlines|dropped|falling|fell|rallied|jumped|sank|plunged|soared)\b|\bwhy\b.*\b(up|down|moving|moved)\b/i;
/** The question touches reported results ("did they beat last quarter?", "Q2 earnings?"): its companies' past quarters are loaded. */
const ASKS_ABOUT_EARNINGS = /\b(earnings?|eps|quarters?|quarterly|q[1-4]|results?|reports?|reported|beat|beats|miss|missed|misses|estimates?|expectations?)\b/i;
/**
 * Plainly a follow-up about the conversation's company's results ("and last quarter's earnings?", "did they beat
 * estimates?") - narrower than the above, so "I don't want to miss out" doesn't bring the last company back.
 */
const ASKS_ABOUT_ITS_EARNINGS = /\b(earnings|eps|quarters?|quarterly|q[1-4]|(?:beat|beats|missed|miss|misses) (?:the )?(?:estimates?|expectations?|earnings))\b/i;
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
		const { return5d, return13w, return26w, revenueGrowthQuarterYoy, epsGrowthQuarterYoy, profitMargin } = data.metrics;
		if (return5d != null) parts.push(`past 5 trading days ${signedPct(return5d)} (to last close)`);
		if (return13w != null) parts.push(`past 13 weeks (about a quarter) ${signedPct(return13w)} (to last close)`);
		if (return26w != null) parts.push(`past 26 weeks ${signedPct(return26w)} (to last close)`);
		// Growth: the latest reported quarter against the same quarter a year before.
		const growth = [
			revenueGrowthQuarterYoy != null ? `revenue ${signedPct(revenueGrowthQuarterYoy)}` : null,
			epsGrowthQuarterYoy != null ? `EPS ${signedPct(epsGrowthQuarterYoy)}` : null,
		].filter(Boolean);
		if (growth.length > 0) parts.push(`latest reported quarter vs the same quarter a year earlier: ${growth.join(", ")}`);
		if (profitMargin) parts.push(`net profit margin (last 12 months) ${profitMargin}`);
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

// ── Company data ────────────────────────────────────────────────────────────
// Loaded up front for the companies a question plainly names, or by the model itself through its tools (answer()).

/** A part of a Gemini message: text, the model asking for a tool, or a tool's result going back. */
interface GeminiPart {
	text?: string;
	functionCall?: { name: string; args?: Record<string, unknown> };
	functionResponse?: { name: string; response: Record<string, unknown> };
	thoughtSignature?: string;
}
interface GeminiContent { role: string; parts: GeminiPart[] }
/**
 * A complete reply: its text (trimmed; empty when it only asks for tools), the text exactly as it streamed, any tool
 * requests, and every part as sent - to hand back unchanged with the tools' results.
 */
interface GeminiReply { text: string; raw: string; refused: boolean; callParts: GeminiPart[]; parts: GeminiPart[] }

/**
 * What an answer loaded, to cite (sources, no headline twice), log (research cohort) and remember: [found] is the
 * companies data actually came back for - a guessed ticker that returned nothing doesn't become the conversation's.
 */
interface Loaded {
	sources: StakAiSource[];
	liveContextLog: Record<string, string>;
	found: string[];
}

function cite(loaded: Loaded, source: StakAiSource) {
	if (!loaded.sources.some((s) => s.headline === source.headline)) loaded.sources.push(source);
}
function remember(loaded: Loaded, ticker: string) {
	if (!loaded.found.includes(ticker)) loaded.found.push(ticker);
}

/** A company's live line: price, today's move, valuation and its recent and longer-term changes. */
async function loadStock(ticker: string, loaded: Loaded): Promise<string> {
	const ctx = await withDeadline(fetchLiveStockContext(ticker), NEWS_DEADLINE_MS, null);
	if (ctx) {
		loaded.liveContextLog[ticker] = ctx;
		remember(loaded, ticker);
	}
	// A gap is said out loud, so the model reports it rather than filling it from memory.
	return `${nameOf(ticker)} (${ticker}): ${ctx ?? "no live quote available right now"}`;
}

/** Finnhub's publisher names as people know them. */
const PUBLISHERS: Record<string, string> = { SeekingAlpha: "Seeking Alpha", Yahoo: "Yahoo Finance" };

/**
 * "(Thu, Oct 9) Seeking Alpha: AppLovin: Why I'm Upgrading To Buy" and its summary: the publisher lets the model tell
 * a writer's opinion from news or an analyst's call (it once called a Seeking Alpha contributor an "analyst upgrade").
 */
const newsItem = (a: FinnhubArticle) => {
	const summary = shortSummary(a.summary);
	const publisher = a.source?.trim() ? `${PUBLISHERS[a.source.trim()] ?? a.source.trim()}: ` : "";
	return `  - ${headlineDate(a.datetime)}${publisher}${a.headline}${summary ? `\n    ${summary}` : ""}`;
};

/**
 * A company's headlines: this week's newest, with stories matching [about] first - from the past month when it names
 * one ("the Unity lawsuit"; no NewsAPI fallback there, its daily quota is small) - labelled as older so they're never
 * read as today's news.
 */
async function loadNews(ticker: string, about: string, loaded: Loaded): Promise<string[]> {
	const label = `${nameOf(ticker)} (${ticker})`;
	const [articles, older] = await Promise.all([
		withDeadline<FinnhubArticle[] | null>(getCompanyNews(ticker, 24, nameOf(ticker)), NEWS_DEADLINE_MS, null),
		questionTopics(about, ticker).length > 0
			? withDeadline<FinnhubArticle[]>(getCompanyNews(ticker, OLDER_NEWS_LIMIT, undefined, { days: OLDER_NEWS_DAYS }), NEWS_DEADLINE_MS, [])
			: Promise.resolve([]),
	]);
	if (!articles && older.length === 0) return [`${label}: news couldn't be loaded just now.`];
	const top = pickHeadlines(articles ?? [], about, ticker, older);
	if (top.length === 0) return [`${label}: no headlines found from the past week.`];
	remember(loaded, ticker);
	const weekAgo = Date.now() / 1000 - 7 * 86_400;
	const isOld = (a: FinnhubArticle) => !!a.datetime && a.datetime < weekAgo;
	const fresh = top.filter((a) => !isOld(a));
	const old = top.filter(isOld);
	const lines = [fresh.length > 0
		? `${label} headlines from the past week:\n${fresh.map(newsItem).join("\n")}`
		: `${label}: ${articles ? "no headlines found from the past week." : "this week's news couldn't be loaded just now."}`];
	if (old.length > 0) lines.push(`${label} older stories matching the question (not recent news):\n${old.map(newsItem).join("\n")}`);
	for (const a of [...fresh, ...old]) cite(loaded, { ticker, headline: a.headline, ...(a.url ? { url: a.url } : {}) });
	return lines;
}

/** A company's last reported quarters: earnings per share against the analysts' estimate. */
async function loadQuarters(ticker: string, loaded: Loaded): Promise<string> {
	const label = `${nameOf(ticker)} (${ticker})`;
	const quarters = await withDeadline<QuarterlyEps[] | null>(getQuarterlyEps(ticker), NEWS_DEADLINE_MS, null);
	if (!quarters) return `${label}: past quarterly results couldn't be loaded just now.`;
	if (quarters.length === 0) return `${label}: no past quarterly results available.`;
	remember(loaded, ticker);
	// Logged beside the live line, so an answer's EPS figures can be checked against what it was given.
	loaded.liveContextLog[`${ticker} quarters`] = quarters.map(describeQuarter).join("; ");
	return `${label} last ${quarters.length} reported quarters, newest first (earnings per share, actual vs analysts' estimate):\n${quarters.map((q) => `  - ${describeQuarter(q)}`).join("\n")}`;
}

/** Companies in STAK's catalog matching what someone called one: a name, nickname, ticker or near-miss spelling. */
export function findCompanies(query: string): { ticker: string; name: string }[] {
	const q = query.trim().toLowerCase();
	const found = new Set(detectNamedTickers(query));
	if (q.length >= 3) {
		for (const b of CATALOG) if (b.name.toLowerCase().includes(q) || b.ticker.toLowerCase() === q) found.add(b.ticker);
	}
	return [...found].slice(0, 5).map((ticker) => ({ ticker, name: nameOf(ticker) }));
}

/** The tools the model may call for data a question needs that wasn't loaded up front. */
const STAK_AI_TOOLS = [{
	functionDeclarations: [
		{
			name: "find_company",
			description: "Look up a company in STAK's catalog by a loose, misspelled or nicknamed name (e.g. \"apploving\" for AppLovin). It searches names only, not descriptions: when you know which company is meant (\"the iPhone maker\" is Apple, AAPL), call the data tool with its ticker directly instead.",
			parameters: { type: "object", properties: { name: { type: "string", description: "What the user called the company" } }, required: ["name"] },
		},
		{
			name: "get_stock",
			description: "A company's live price and today's move, P/E, market cap, beta, 52-week range, price change over the past 5 trading days, 13 weeks, 26 weeks, year to date and past year, its latest quarter's revenue and EPS growth on a year earlier, and its profit margin. Not for whether earnings beat or missed estimates: use get_quarterly_results.",
			parameters: { type: "object", properties: { ticker: { type: "string", description: "US stock ticker, e.g. NVDA" } }, required: ["ticker"] },
		},
		{
			name: "get_news",
			description: "A company's recent headlines with short summaries: for why it moved, or a named event (lawsuit, deal, launch). Give a topic to also search the past month for that particular story (e.g. \"Unity court case\").",
			parameters: {
				type: "object",
				properties: { ticker: { type: "string", description: "US stock ticker" }, topic: { type: "string", description: "Optional: the particular story to look for" } },
				required: ["ticker"],
			},
		},
		{
			name: "get_quarterly_results",
			description: "A company's last four reported quarters: earnings per share against analysts' estimates (beat or miss, by how much). Use for \"did they beat/miss\", \"last quarter\", \"the quarter before\" and earnings history. No revenue or report dates.",
			parameters: { type: "object", properties: { ticker: { type: "string", description: "US stock ticker" } }, required: ["ticker"] },
		},
	],
}];

/** Rounds of tool calls before the model must answer (most follow-ups need one). */
const MAX_TOOL_ROUNDS = 2;
/** Tool calls in all, for one answer. */
const MAX_TOOL_CALLS = 8;
/** Companies one answer may cover, loaded up front and through tools together. */
const MAX_ANSWER_TICKERS = 4;

/**
 * Runs one tool call; the result goes back to the model as its function response. [allowed] is the companies this
 * answer may cover (shared across its calls, up-front ones included), capped at MAX_ANSWER_TICKERS.
 */
async function runTool(call: { name: string; args?: Record<string, unknown> }, loaded: Loaded, allowed: Set<string>): Promise<Record<string, unknown>> {
	const args = call.args ?? {};
	switch (call.name) {
		case "find_company": {
			const matches = findCompanies(String(args.name ?? ""));
			return matches.length > 0
				? { matches }
				: { matches: [], note: "No company in STAK's catalog matches. If you know its US ticker, use it; otherwise ask the user which company they mean." };
		}
		case "get_stock":
		case "get_news":
		case "get_quarterly_results": {
			const ticker = String(args.ticker ?? "").trim().replace(/^\$/, "").toUpperCase();
			if (!TICKER_RE.test(ticker)) return { error: "That isn't a stock ticker. Use find_company to look it up." };
			if (!allowed.has(ticker)) {
				if (allowed.size >= MAX_ANSWER_TICKERS) return { error: "Too many companies for one answer: answer with what you have." };
				allowed.add(ticker);
			}
			if (call.name === "get_stock") return { result: await loadStock(ticker, loaded) };
			if (call.name === "get_quarterly_results") return { result: await loadQuarters(ticker, loaded) };
			// The month's lookback only for a particular story the model names.
			return { result: (await loadNews(ticker, typeof args.topic === "string" ? args.topic : "", loaded)).join("\n\n") };
		}
		default:
			return { error: `No tool called ${call.name}.` };
	}
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
 * answer over under them, and bill it twice. Each try must start within FIRST_CHUNK_MS, the round must end within
 * GEMINI_DEADLINE_MS and by [deadlineAt] (the whole answer's, every round included), and an answer that goes quiet
 * for IDLE_MS is abandoned. The tools are always offered; [toolMode] "NONE" makes it answer instead of asking.
 */
async function askGemini(
	contents: GeminiContent[],
	systemInstruction: string,
	{ onText, toolMode = "AUTO", deadlineAt, resume = false }: { onText?: (full: string) => void; toolMode?: "AUTO" | "NONE"; deadlineAt: number; resume?: boolean },
): Promise<GeminiReply | null> {
	return withGeminiConcurrencyLimit(async () => {
		const started = Date.now();
		let shownAny = false;
		for (const key of getGeminiKeys()) {
			if (shownAny) break;
			const left = Math.min(GEMINI_DEADLINE_MS - (Date.now() - started), deadlineAt - Date.now());
			if (left < 2_000) break;
			const tag = `key ...${key.slice(-4)}`;
			const controller = new AbortController();
			let timer = setTimeout(() => controller.abort(), Math.min(FIRST_CHUNK_MS, left));
			// However steadily it's arriving, the answer has to be in by [deadlineAt] (plain /chat: older app versions give
			// up after 45s, and nothing reaches the person until the end).
			const cap = setTimeout(() => controller.abort(), deadlineAt - Date.now());
			const stillTalking = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), IDLE_MS); };
			try {
				const res = await fetch(geminiStreamUrl(GEMINI_MODEL, key), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						system_instruction: { parts: [{ text: systemInstruction }] },
						contents,
						tools: STAK_AI_TOOLS,
						toolConfig: { functionCallingConfig: { mode: toolMode } },
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
				// Every part as it came (text pieces, tool requests with any signature), to hand back with the tools' results.
				const parts: GeminiPart[] = [];
				let finish: string | undefined;
				let blocked: string | undefined;
				let errored = false;
				const take = (raw: string) => {
					const line = raw.trim();
					if (!line.startsWith("data:")) return;
					let chunk: { error?: unknown; promptFeedback?: { blockReason?: string }; candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[] };
					try { chunk = JSON.parse(line.slice(5)); } catch { return; }
					if (chunk.error) errored = true;
					if (chunk.promptFeedback?.blockReason) blocked = chunk.promptFeedback.blockReason;
					const candidate = chunk.candidates?.[0];
					parts.push(...(candidate?.content?.parts ?? []));
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
				const callParts = parts.filter((part) => !!part.functionCall);
				if (errored || finish !== "STOP" || (!text && callParts.length === 0)) {
					console.warn(`[STAK AI] Gemini answer incomplete on ${tag} (finish: ${finish ?? "none"}${errored ? ", error chunk" : ""})`);
					continue;
				}
				// A canned refusal ("I'm sorry, I can't...") has no follow-ups; an answer that merely opens with an apology
				// ("I apologize, but the data shows..." after pushback) does, and is an answer.
				return { text, raw: full, refused: GEMINI_REFUSAL_RE.test(text) && !/\[\[FOLLOWUPS\]\]/i.test(text), callParts, parts };
			} catch (e) {
				console.warn(`[STAK AI] Gemini error on ${tag}: ${(e as Error)?.message}`);
			} finally {
				clearTimeout(timer);
				clearTimeout(cap);
			}
		}
		console.warn("[STAK AI] No complete Gemini answer");
		return null;
	}, { resume });
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
- Never state a current or recent price, move, P/E, market cap, earnings date or result, deal, lawsuit, analyst rating or price target unless it's in the notes or a tool result. If the question needs one that isn't there, fetch it with your tools first. Only if the tools don't have it either, say so in one short sentence, then still help with what you can (background, what that kind of news usually means). Point them to the company's page or News in STAK at most once in a conversation.
- Figures in your earlier replies may be wrong; don't repeat them as current.
- Report what the notes say, without adding details they don't contain. A summary ending in "…" is cut off: never guess how it goes on or how things turned out (rulings, amounts, guidance).
- Headlines show their publisher. Opinion pieces are one writer's view, never an analyst's call: first-person headlines ("Why I'm Buying..."), questions and listicles ("Is X a Buy?", "3 Reasons to Sell X", "Here's Why...", "Better Stock: X vs. Y"), and most Seeking Alpha, Motley Fool, Zacks and InvestorPlace articles - including ones carried by Yahoo Finance. Call them that ("a Motley Fool writer argues..."). A Zacks Rank is a computer-generated score, not an analyst rating. Only a named firm (Needham, Jefferies, Goldman Sachs...) giving a rating or price target is an analyst's call, whoever reports it. A firm maintaining or reiterating its rating isn't an upgrade - say "kept its Buy rating".
- "Older stories matching the question" are weeks old: use one to answer a question about that story, saying when it came out, but never as the reason for today's move.
- "Past quarterly results" give earnings per share against analysts' estimates for the last few reported quarters - nothing else: no revenue figures (only the growth rate in the live data), guidance or why. Use those exact figures. Quarters are the company's fiscal ones (a fiscal year can run ahead of the calendar), so name them as given and say "fiscal". They don't say when results were announced or when the next report is: never state either date. For anything they don't cover, say you don't have it.
- Past-year, year-to-date, 26-week and 13-week changes cover months, and your headlines only the last few weeks: don't give a headline as the cause of a long-term move. Say what recent news shows, and that you don't have the news from earlier in the year that drove most of it. Headlines carry their date (US Eastern): call something today's news only if it's dated today, and don't guess how new an undated one is. A headline from the last day or two (or the last trading day, after a weekend) can still explain today's move: just say when it came out.
- Growth figures compare the latest reported quarter with the same quarter a year before; say so when you use them, and don't turn them into a prediction.
- Lasting background (what a company does, its competitors, what a term means) can come from memory. A past event from memory must carry its year and be framed as history.
- Made-up numbers to explain a concept are fine when clearly labelled as an example.
- You can't browse the web or open pages; your only sources are the notes and your tools. Never mention looking anything up, checking, or the tools themselves: just give the answer.
- When the user says you're wrong, take it as being about your last factual claim. Check it against the notes: say what they show, or that you can't confirm it either way. Don't adopt a number or event the user gives you unless the notes show it. Apologize once, briefly; never promise to learn, improve or review anything.
- If the user is rude, don't mention it: answer the question, or if there isn't one, briefly offer to help.

━━━ YOUR TOOLS ━━━
The notes usually already hold the price, moves and news for the companies a question names. Never call a tool for data the notes or an earlier tool result already give you.
Call a tool only when answering needs a company figure or story that isn't there: its price, moves or valuation (get_stock), its news or a particular story (get_news), or whether it beat or missed estimates in past quarters (get_quarterly_results). Never fill that gap from memory.
Work out the company from the whole conversation: "what about the quarter before?" means the company you were just discussing. If you know its ticker (NVDA for Nvidia) - or which company a description means ("the company that makes the iPhone" is Apple, AAPL; "the chip company Jensen Huang runs" is NVIDIA, NVDA) - call the data tool with that ticker directly. Use find_company only for a misspelled, nicknamed or unfamiliar name. Ask which company they mean (start with [[CLARIFY]]) only when you genuinely can't tell.
For a question about two or more companies, ask for every company's data at once.
Don't call tools for greetings, thanks, questions about terms or concepts, or advice and prediction questions you'll decline.
Call tools silently: write nothing before or between tool calls - your first words are the answer. Tool results count as notes, and the same rules apply to them.

━━━ UNCLEAR QUESTIONS ━━━
Resolve "it", "they" or "this stock" from the conversation and stay on that company. If you genuinely can't tell what they mean or which company, start your reply with [[CLARIFY]] and ask one short question. Pushback ("you're wrong", "that's not true") and insults are never unclear: don't use [[CLARIFY]] for them.
If one message packs in more than two separate questions, answer the first (or the first two if they're related) and ask them to send the others one at a time.

━━━ WHERE THE USER IS ━━━
The conversation may include a note saying what the user opened STAK AI from: a news article, a stock page, or today's Daily Brief. When their question refers to "this", "the article", "this stock" or "the brief", it means that. Ground your answer in it, and say so if it doesn't cover what they asked.

━━━ STYLE ━━━
- Short, for a phone screen: lead with the answer, then one to three short paragraphs at most.
- Match depth and vocabulary to their knowledge level, and explain any jargon you use.
- Say time spans in everyday words ("over the past three months", not "13-week change"), and never refer to "the notes", "the data provided" or "the context": state facts as facts, with their date where it matters.
- If they ask about a stock in their STAK, acknowledge that personal angle.
- Calm, factual and direct. No filler, no hype, no invented drama.
- Before answering a judgement question about a company (is it doing well, is it still growing, did they beat), look at its past-year change in the live data. If the business looks good but the stock is down 20% or more over the year (or the reverse), say both in your first sentence ("Netflix's revenue is still growing - up 13.4% - but the stock is down 43% over the past year"). A plain factual question (today's move, a P/E) gets the plain fact first; add a counterpoint only if it changes the picture. One "but" is enough - don't stack caveats.
- Formatting: plain sentences. Use **bold** sparingly for a key term or number, and "- " bullets only for a list of three or more items. No headings, tables, links, code or emojis.
- Use American English spelling.
- The app always shows an "educational, not financial advice" note, so don't add a disclaimer to normal answers.

━━━ FOLLOW-UPS ━━━
On a normal answer (not [[DECLINED]] or [[CLARIFY]]), end with one final line: [[FOLLOWUPS]] followed by two or three short questions they might naturally ask next, each under 45 characters, in their voice ("What's a good P/E?"), separated by " | ". Make one explain a term or idea from your answer and one go deeper on the same company; never repeat what you just covered. Each must be answerable with what you can get (price, moves, news, past quarters' EPS against estimates, concepts) - never next earnings dates, revenue amounts, forecasts or buy/sell questions.

━━━ ABOUT THIS USER ━━━
- Financial knowledge: ${familiarity}
- Their STAK (saved stocks): ${brandList}
- Top interests: ${topTagsList}
- Today (US Eastern): ${params.easternDate}
`;
}

// ── Answering ───────────────────────────────────────────────────────────────

/** A streamed answer must be done by this, every lookup round included (the plain route has PLAIN_ANSWER_MS). */
const STREAM_ANSWER_MS = 55_000;
/** With less than this left, no more lookups (or rewrites): the model answers with what it has. */
const ROUND_MIN_MS = 12_000;

/** What an answer needs: the prompt, what was loaded for it, and everything it was shown (for the number check). */
export type AnswerInput = Pick<Prepared, "systemInstruction" | "contents" | "startedAt" | "tickers" | "sources" | "liveContextLog" | "evidence">;

/**
 * An answer's number check: figures its first version stated that it wasn't given ([flagged]), whether it was
 * rewritten for them, and any the answer as saved still has ([unsupported]).
 */
export interface FigureCheck { flagged: string[]; rewritten: boolean; unsupported: string[] }

/** The answer, how many lookups it took, the companies the conversation is now about, and its number check. */
export interface Answer extends GeminiReply {
	toolCalls: number;
	tickers: string[];
	figures: FigureCheck;
}

/** Sent back when an answer states figures it wasn't given: rewrite with the given ones, without getting vague. */
const recheck = (figures: string[]) =>
	`Before this is shown: these figures in your answer aren't in the notes, your tools' results or the user's messages: ${figures.join(", ")}.\n` +
	"Rewrite the whole answer. Company and market figures (prices, moves, earnings per share, estimates, revenue, growth, dates) must come from those sources - use your tools if you need one. " +
	"If you worked a figure out from given ones, use the given figures instead. General rules of thumb are fine framed as typical or historical (\"historically about 10% a year\"). " +
	"If a figure you need isn't available, drop it and say so once, briefly - don't make the answer vaguer than it needs to be.\n" +
	"Keep the same length, tone and format, [[FOLLOWUPS]] line included. Reply with only the answer: your first words are its first sentence. Never apologize, correct yourself or mention a check, a revision or an earlier version.";

/** An opening line a rewrite shouldn't have ("You're right - here's the corrected answer:"), dropped if it slips in. */
const REWRITE_PREAMBLE = /^(?:sure|okay|ok|you'?re right|apolog\w*|sorry|here(?:'s| is) (?:the|a|my) (?:revised|corrected|updated)\b)[^\n]*\n+/i;

/**
 * Answers with the tools: the model either answers or asks for data, which is loaded and handed back - for at most
 * MAX_TOOL_ROUNDS rounds, and while time allows - after which it must answer with what it has. [onWait] fires before
 * each wordless wait - a round of lookups, a rewrite (the stream sends a keep-alive). Any text the model wrote before
 * a lookup (it's asked not to) stays in the answer, so what's saved is what was shown.
 * The finished answer's figures are then checked against everything it was shown; if some came from nowhere and
 * there's time, it's asked once to rewrite - not streamed: the finished reply replaces what was shown. A rewrite that
 * fails, is refused, or is no better leaves the first answer standing.
 */
export async function answer(p: AnswerInput, hooks: { onText?: (full: string) => void; onWait?: () => void } = {}): Promise<Answer | null> {
	const { onWait } = hooks;
	let onText = hooks.onText;
	const deadlineAt = p.startedAt + (hooks.onText ? STREAM_ANSWER_MS : PLAIN_ANSWER_MS);
	const contents = [...p.contents];
	const loaded: Loaded = { sources: p.sources, liveContextLog: p.liveContextLog, found: [] };
	const allowed = new Set(p.tickers);
	let evidence = p.evidence;
	let said = "";
	let calls = 0;
	let lookupRounds = 0;
	let flagged: string[] = [];
	/** The first finished answer, once it's been sent back for a rewrite. */
	let first: { reply: GeminiReply; text: string } | null = null;
	for (;;) {
		const mustAnswer = lookupRounds >= MAX_TOOL_ROUNDS || calls >= MAX_TOOL_CALLS || deadlineAt - Date.now() < ROUND_MIN_MS;
		const reply = await askGemini(contents, p.systemInstruction, {
			onText: onText && ((full) => onText!(said + full)),
			toolMode: mustAnswer ? "NONE" : "AUTO",
			deadlineAt,
			resume: contents.length > p.contents.length,
		});
		// The companies data came back for are what the conversation is now about ("what about the quarter before?").
		const done = (r: GeminiReply, text: string, figures: FigureCheck): Answer => {
			if (figures.unsupported.length > 0) console.warn(`[STAK AI] figures not in the data, left in: ${figures.unsupported.join(", ")}`);
			const tickers = loaded.found.length > 0 ? [...new Set([...loaded.found, ...p.tickers])].slice(0, 3) : p.tickers;
			return { ...r, text, toolCalls: calls, tickers, figures };
		};
		// A rewrite that fails, comes back empty or refused, or is no better: the first answer stands (it was shown).
		const keepFirst = () => done(first!.reply, first!.text, { flagged, rewritten: false, unsupported: flagged });
		if (!reply) return first ? keepFirst() : null;
		if (reply.callParts.length === 0 || mustAnswer) {
			let text = `${said}${reply.raw}`.trim();
			if (first) text = text.replace(REWRITE_PREAMBLE, "").trim();
			if (!text) return first ? keepFirst() : null;
			const unsupported = unsupportedFigures(text, evidence);
			if (first) {
				if (reply.refused || unsupported.length > flagged.length) return keepFirst();
				return done(reply, text, { flagged, rewritten: true, unsupported });
			}
			if (unsupported.length > 0 && deadlineAt - Date.now() >= ROUND_MIN_MS) {
				console.warn(`[STAK AI] figures not in the data: ${unsupported.join(", ")} - asking for a rewrite`);
				first = { reply, text };
				flagged = unsupported;
				onText = undefined;
				said = "";
				onWait?.();
				contents.push({ role: "model", parts: [{ text: reply.raw }] }, { role: "user", parts: [{ text: recheck(unsupported) }] });
				continue;
			}
			return done(reply, text, { flagged: unsupported, rewritten: false, unsupported });
		}
		onWait?.();
		lookupRounds++;
		contents.push({ role: "model", parts: reply.parts });
		// Every request gets an answer, past the cap too - Gemini wants one per call.
		const results = await Promise.all(reply.callParts.map(async (part, i) => {
			const call = part.functionCall!;
			const response = calls + i < MAX_TOOL_CALLS
				? await runTool(call, loaded, allowed).catch(() => ({ error: "That lookup failed just now." }))
				: { error: "Too many lookups: answer with what you have." };
			return { functionResponse: { name: call.name, response } };
		}));
		calls += reply.callParts.length;
		evidence += `\n${results.map((r) => JSON.stringify(r.functionResponse.response)).join("\n")}`;
		contents.push({ role: "user", parts: results });
		if (reply.raw) said += `${reply.raw}\n\n`;
	}
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
	contents: GeminiContent[];
	startedAt: number;
	/** Everything the answer is shown up front - notes, the question, the conversation so far - for its number check. */
	evidence: string;
	/** Tool calls the model made for this answer (for the usage stats). */
	toolCalls?: number;
	/** The answer's number check (see FigureCheck). */
	figures?: FigureCheck;
}

/** What a question's prompt is built from, whatever stored it: the request, the conversation and the person. */
export interface ChatInput {
	question: string;
	newContext: StakAiContext | null;
	contextIsNew: boolean;
	context: StakAiContext | null;
	lastTickers: string[];
	history: { role: string; content: string }[];
	familiarity: string | null;
	brandNames: string[];
	topTags: string[];
}

/**
 * Builds a question's prompt: which companies to load up front, their data as notes, the instructions and the
 * conversation - and the evidence its answer's figures are checked against. No database: prepareChat reads the
 * stored parts, and the eval script (scripts/stakAiEval.ts) passes its own.
 */
export async function assembleChat(input: ChatInput) {
	const { question, newContext, contextIsNew, context, lastTickers, history, familiarity, brandNames, topTags } = input;
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

	// The companies the question plainly names (or points back to) are loaded up front; anything else it needs, the
	// model fetches itself through its tools (see answer()).
	const liveDataLines: string[] = [];
	const newsLines: string[] = [];
	const earningsLines: string[] = [];
	const loaded: Loaded = { sources: [], liveContextLog: {}, found: [] };
	if (tickers.length > 0) {
		const [stocks, news, earnings] = await Promise.all([
			Promise.all(tickers.map((t) => loadStock(t, loaded))),
			Promise.all(tickers.map((t) => loadNews(t, question, loaded))),
			// Past quarterly results, only for a question about them ("did they beat last quarter?").
			ASKS_ABOUT_EARNINGS.test(question) ? Promise.all(tickers.map((t) => loadQuarters(t, loaded))) : Promise.resolve([]),
		]);
		liveDataLines.push(...stocks.map((l) => `• ${l}`));
		newsLines.push(...news.flat());
		earningsLines.push(...earnings);
	}
	const { sources, liveContextLog } = loaded;

	const systemInstruction = buildSystemContext({ familiarity, brandNames, topTags, easternDate: HEADLINE_DAY.format(new Date()) });
	const contents: GeminiContent[] = history.map((m) => ({
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
	// Said, not left implied: with nothing loaded it once answered "Apple is up 12.5% this year" from nowhere, and
	// "NVIDIA's quarter before: $0.98 vs $0.90" (really $1.87 vs $1.79) from memory.
	if (tickers.length === 0) {
		notes.push(
			"No company data was loaded up front for this question. If it needs a company's figures or news, get them with your tools; never state a company or market figure - price, move, earnings per share, estimate, revenue, growth, date - from memory, past quarters included. " +
			"Worked examples with made-up numbers (labelled as examples) and long-run background are still fine." +
			(context ? "" : " If you can't tell which company they mean, start with [[CLARIFY]] and ask."),
		);
	}
	if (notes.length > 0) {
		contents.push({ role: "user", parts: [{ text: `${notes.join("\n\n")}\n\nUse this context when answering the question below.` }] });
		contents.push({ role: "model", parts: [{ text: "Got it — I'll use this context in my answer." }] });
	}
	contents.push({ role: "user", parts: [{ text: question }] });

	// The person's own messages count, earlier answers don't: a figure invented in one mustn't vouch for itself later.
	const evidence = [...notes, question, ...history.filter((m) => m.role === "user").map((m) => m.content)].join("\n");
	return { tickers, sources, liveContextLog, systemInstruction, contents, evidence };
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

		const { tickers, sources, liveContextLog, systemInstruction, contents, evidence } = await assembleChat({
			question, newContext, contextIsNew, context, lastTickers, history: historyResult.rows, familiarity, brandNames, topTags,
		});

		return {
			uid, question, via, usageId, usageBefore: reservation.usage, conversationId, newContext, contextIsNew, context,
			lastTickers, tickers, sources, liveContextLog, inCohort, systemInstruction, contents, startedAt, evidence,
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
	// A refusal is a decline - its markers stripped all the same, so none reaches the person.
	const parsed = ai.refused ? { ...parseAnswer(ai.text), kind: "declined" as const, followUps: [] } : parseAnswer(ai.text);
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
		[p.uid, JSON.stringify({ via: p.via, context: p.context?.type ?? null, kind: parsed.kind, streamed, ms: Date.now() - p.startedAt, live: p.tickers.length > 0, tools: p.toolCalls ?? 0, ...(p.figures && p.figures.flagged.length > 0 ? { figures: p.figures } : {}) })],
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
		const ai = await answer(p);
		if (!ai) {
			void releaseQuestion(p.usageId);
			fail(res, 503, "ai_unavailable", UNAVAILABLE);
			return;
		}
		const reply = await saveChat({ ...p, tickers: ai.tickers, toolCalls: ai.toolCalls, figures: ai.figures }, ai, false);
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
		const ai = await answer(p, {
			onText: (full) => {
				const safe = streamableText(full);
				if (safe.length > shown) {
					send("delta", { text: safe.slice(shown) });
					shown = safe.length;
				}
			},
			// A lookup or a rewrite sends no words: a comment line (which the apps skip) keeps the connection open.
			onWait: () => { if (!res.writableEnded) res.write(": working\n\n"); },
		});
		if (!ai) {
			void releaseQuestion(p.usageId);
			send("error", { code: "ai_unavailable", error: UNAVAILABLE });
		} else {
			// Saved even if the person has gone: the answer is in their history, and it counted.
			const reply = await saveChat({ ...p, tickers: ai.tickers, toolCalls: ai.toolCalls, figures: ai.figures }, ai, true);
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

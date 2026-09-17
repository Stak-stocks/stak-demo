import { getEasternDateKey } from "@stak/shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { pgQuery } from "../lib/postgres.js";
import { getCompanyNews, type FinnhubArticle } from "./finnhubService.js";
import { GEMINI_MODEL, geminiUrl, getGeminiKeys, withGeminiConcurrencyLimit } from "./geminiService.js";

/**
 * Detects what changed at a saved company, so My STAK can answer "something changed -
 * what was it?" without the user hunting across apps.
 *
 * One update per company per kind per day (a second slot when something big breaks),
 * shared by everyone who saved that company. Only earnings, forecast changes, analyst
 * moves and real business developments qualify - a day of noise produces nothing.
 *
 * The AI call is ungrounded: the headlines are handed to it, so it costs tokens only,
 * and it runs at most twice a day per saved company (user, 2026-09-17).
 */

export type UpdateKind = "earnings" | "guidance" | "analyst" | "business";

/** Nothing qualified, the write succeeded, or the call failed - they are not the same. */
export type DetectionResult =
	| { status: "none" }
	| { status: "failed" }
	| { status: "written" };

export type DetectedUpdate = {
	kind: UpdateKind;
	title: string;
	body: string;
	watch: string | null;
	sources: { source: string; url: string; headline: string; datetime: number }[];
};

/** Which headlines count as which kind of change. Checked strongest first. */
const KIND_TERMS: { kind: UpdateKind; terms: string[] }[] = [
	{
		kind: "earnings",
		terms: [
			"earnings", "eps", "quarterly results", "quarterly revenue", "q1 results", "q2 results",
			"q3 results", "q4 results", "reports results", "reports revenue", "beat expectation",
			"miss expectation", "profit rose", "profit fell", "revenue rose", "revenue fell",
		],
	},
	{
		kind: "guidance",
		terms: [
			"guidance", "outlook", "raises forecast", "lowers forecast", "cuts forecast",
			"raised guidance", "lowered guidance", "profit warning", "warns on",
		],
	},
	{
		kind: "analyst",
		terms: ["price target", "upgrade", "downgrade", "rating", "overweight", "underweight", "initiated coverage"],
	},
	{
		kind: "business",
		terms: [
			"launch", "unveil", "announce", "acquisition", "acquire", "merger", "partnership", "deal",
			"contract", "recall", "lawsuit", "antitrust", "investigation", "regulator", "layoff",
			"restructur", "dividend", "buyback", "ceo", "chief executive", "plant", "factory", "expansion",
		],
	},
];

/**
 * Commentary, not change. Finnhub's company feed carries a lot of opinion and
 * price-move stories, and neither is something that happened AT the company.
 */
const NOT_A_CHANGE = [
	"should you buy", "is it a buy", "cheap enough", "bull case", "bear case", "here's why",
	"here is why", "why i ", "prediction", "best stock", "top stock", "millionaire",
	"if you invested", "dividend stock to", "stocks to buy", "stocks to watch", "price prediction",
	"undervalued", "overvalued", "fairly valued", "looks expensive", "50-day", "200-day", "sma",
	"climbs", "slips", "soars", "tumbles", "plunges", "surges", "jumps", "sinks", "rallies",
	"this year", "premarket", "after hours", "moving today", "stock moves",
	// Speculation about what a company might do is not something it did.
	"catalyst", "hidden", "what's next", "the case for", "growth story", "could be a",
	"not yet visible", "quietly", "secret weapon",
	// Someone talking about a company is not the company doing something.
	"discusses", "discussed", "weighs in", "interview", "sits down", "talks to",
	"on cnbc", "opinion", "explains why", "breaks down",
];

/**
 * Opinion desks. Their pieces are analysis of a company, not news from it, and an
 * update built on one reads as STAK taking a view.
 */
const OPINION_SOURCES = ["seekingalpha", "motley fool", "fool.com", "zacks", "simply wall st", "insider monkey"];

/**
 * The article has to be about THIS company: the feed mixes in peers and sector pieces,
 * which produced updates about PepsiCo under Monster and Joby under Archer.
 */
function isAboutCompany(article: FinnhubArticle, ticker: string, companyName: string): boolean {
	const text = `${article.headline} ${article.summary ?? ""}`.toLowerCase();
	if (new RegExp(`\\b${ticker.toLowerCase()}\\b`).test(text)) return true;
	const name = companyName.toLowerCase();
	if (text.includes(name)) return true;
	// "Estée Lauder Companies" in the catalogue, "Estee Lauder" in the headline: the
	// first distinctive word carries the company.
	const first = name.split(/[\s.,]+/).find((w) => w.length >= 4);
	return first != null && text.includes(first);
}

function isChange(article: FinnhubArticle): boolean {
	const text = `${article.headline} ${article.summary ?? ""}`.toLowerCase();
	if (OPINION_SOURCES.some((s) => (article.source ?? "").toLowerCase().includes(s))) return false;
	return !NOT_A_CHANGE.some((t) => text.includes(t));
}

/** Only the last few days count as "what changed" - older news is not news. */
const NEWS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/** A move this big is the "something big broke" case that earns a second look in a day. */
export const BIG_MOVE_PCT = 5;

function kindOf(article: FinnhubArticle): UpdateKind | null {
	const text = `${article.headline} ${article.summary ?? ""}`.toLowerCase();
	for (const { kind, terms } of KIND_TERMS) {
		if (terms.some((t) => text.includes(t))) return kind;
	}
	return null;
}

/**
 * The strongest change in a company's recent news, with the headlines behind it
 * grouped together. Returns null when nothing qualifies.
 */
export async function detectUpdate(ticker: string, companyName: string): Promise<DetectedUpdate | "none" | "failed"> {
	// 24, the limit every other caller asks for, so this shares their cached copy instead
	// of spending its own Finnhub call on a private one.
	const articles = (await getCompanyNews(ticker, 24, companyName)).slice(0, 15);
	const cutoff = (Date.now() - NEWS_WINDOW_MS) / 1000;
	const recent = articles.filter((a) =>
		a.datetime >= cutoff && a.headline && isAboutCompany(a, ticker, companyName) && isChange(a),
	);
	if (recent.length === 0) return "none";

	// Group by kind, then take the kind that ranks highest: earnings over guidance over
	// an analyst move over a business development. Related headlines become one update.
	const byKind = new Map<UpdateKind, FinnhubArticle[]>();
	for (const article of recent) {
		const kind = kindOf(article);
		if (!kind) continue;
		byKind.set(kind, [...(byKind.get(kind) ?? []), article]);
	}
	const chosen = KIND_TERMS.map((k) => k.kind).find((kind) => byKind.has(kind));
	if (!chosen) return "none";
	const group = (byKind.get(chosen) ?? []).slice(0, 3);

	// The story STAK already told. The detector reads a three-day window, so without this
	// the same earnings report became a fresh unread update every morning for three days.
	const lead = group[0];
	if (lead?.url) {
		const seen = await pgQuery(
			`select 1 from stock_updates
			 where ticker = $1 and occurred_at >= now() - interval '5 days' and sources->0->>'url' = $2
			 limit 1`,
			[ticker, lead.url],
		);
		if (seen.rows.length > 0) return "none";
	}

	const written = await writeUpdate(ticker, companyName, chosen, group);
	if (!written) return "failed";
	return {
		kind: written.kind,
		title: written.title,
		body: written.body,
		watch: written.watch,
		sources: group.map((a) => ({ source: a.source, url: a.url, headline: a.headline, datetime: a.datetime })),
	};
}

/**
 * Turns the grouped headlines into the words My STAK shows: what changed, one sentence
 * of context, and what it means for the story from here. Ungrounded - the headlines are
 * the source - and never a recommendation.
 */
async function writeUpdate(
	ticker: string,
	companyName: string,
	kind: UpdateKind,
	group: FinnhubArticle[],
): Promise<{ kind: UpdateKind; title: string; body: string; watch: string | null } | null> {
	const keys = getGeminiKeys();
	if (keys.length === 0) return null;

	const headlines = group.map((a, i) => `${i + 1}. ${a.headline}${a.summary ? ` — ${a.summary.slice(0, 300)}` : ""}`).join("\n");
	const prompt = `You are writing one "what changed" update for ${companyName} (${ticker}) in a stock app for beginners.

These are the recent headlines (kind: ${kind}):
${headlines}

Reply with JSON only: {"kind": "...", "title": "...", "body": "...", "watch": "..."}
- kind: which one of earnings | guidance | analyst | business the headlines actually describe (earnings = results; guidance = the company's own forecast; analyst = an outside rating or price target; business = anything the company did).
- title: what changed, 2-5 words, plain English, no company name, no ticker, sentence case (e.g. "Cloud growth slowed", "Revenue outlook raised").
- body: ONE sentence (max 22 words) saying what happened, in plain English a 20-year-old with no finance background understands. No jargon, no advice, no "investors should".
- watch: ONE short sentence (max 14 words) on what this affects going forward (e.g. "Cloud demand is a key growth driver."). Never a prediction or a recommendation.
Reply {"title": "", "body": "", "watch": ""} when the headlines are commentary, opinion, a share-price move, or about a different company - only something that actually happened at ${companyName} counts.
The watch line must name a real driver of the business (demand, subscriptions, costs, a product, a court case). For an analyst update, name what the analysts are reacting to, never "sentiment" or "investor perception".
Never state a share price, a price target, or a percentage move in the share price: describe what changed at the business.
Speculation is not a change - reply empty for "could", "might", "suggests", "sees potential", or anything that has not happened yet.`;

	for (const key of keys) {
		try {
			const res = await withGeminiConcurrencyLimit(() =>
				fetch(geminiUrl(GEMINI_MODEL, key), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						// thinkingBudget 0 like every other call site: 2.5 otherwise spends the
						// token budget reasoning and the JSON comes back truncated.
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.3, responseMimeType: "application/json" },
					}),
					signal: AbortSignal.timeout(12000),
				}),
			);
			if (res.status === 429) {
				console.warn(`[Gemini] updates(${ticker}) rate limited (429) on key ...${key.slice(-4)} — trying next`);
				continue;
			}
			if (!res.ok) {
				console.warn(`[Gemini] updates(${ticker}) got ${res.status} on key ...${key.slice(-4)} — giving up`);
				return null;
			}
			const data = await res.json();
			const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (typeof raw !== "string") return null;
			// A stray sentence before the JSON, or a fenced block, shouldn't lose the update.
			const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
			const parsed = JSON.parse(json) as { kind?: string; title?: string; body?: string; watch?: string };
			const title = (parsed.title ?? "").trim();
			const body = (parsed.body ?? "").trim();
			if (!title || !body) return null;
			// The model sometimes writes the speculation the prompt forbids. An update has
			// to be something that happened, so a hedged one is dropped rather than shown.
			if (/(suggest|suggests|might|may|could|potential|possibly|rumou?r|speculat)/i.test(body)) {
				console.warn(`[Gemini] updates(${ticker}): speculative body dropped`);
				return null;
			}
			// "A TV host discussed..." - someone's commentary about the company, not news
			// from it. The subject of an update is always the company.
			if (/^(a|an|the)\s+(tv|television|analyst|commentator|host|guest|report|article|podcast|video)/i.test(body)) {
				console.warn(`[Gemini] updates(${ticker}): commentary body dropped`);
				return null;
			}
			const kinds: UpdateKind[] = ["earnings", "guidance", "analyst", "business"];
			return {
				// The keywords pick the candidates; what the story is actually about is a
				// judgement, and reading the headlines is the only way to make it.
				kind: kinds.find((k) => k === parsed.kind) ?? kind,
				title: title.slice(0, 60),
				body: body.slice(0, 220),
				watch: (parsed.watch ?? "").trim().slice(0, 140) || null,
			};
		} catch (e) {
			console.warn(`[Gemini] updates(${ticker}) failed on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
		}
	}
	console.warn(`[Gemini] updates(${ticker}): all ${keys.length} keys exhausted - no update`);
	return null;
}

/**
 * Detects and stores today's update for one saved company. `slot` 1 is the daily pass;
 * slot 2 is the extra look a big move or fresh earnings earns. Returns true when an
 * update was written.
 */
export async function runUpdateDetection(
	ticker: string,
	companyName: string,
	slot: 1 | 2,
	/** Ignores today's "already looked" marker - for checking a change to the rules by hand. */
	force = false,
): Promise<boolean> {
	const today = getEasternDateKey();
	const doneKey = `updates:done:v6:${today}:${slot}:${ticker}`;
	if (!force && await cacheGet<boolean>(doneKey)) return false;

	const detected = await detectUpdate(ticker, companyName);
	// A quiet day is settled for the day; a failed call is not - a rate-limit blip must
	// not cost this company its update until tomorrow (the daily-move warm does the same).
	if (detected === "failed") return false;
	await cacheSet(doneKey, true, 20 * 60 * 60 * 1000);
	if (detected === "none") return false;

	// One update per company, kind and slot a day. A re-run refreshes the words rather
	// than stacking a second copy of the same change.
	await pgQuery(
		`insert into stock_updates (ticker, day, slot, kind, title, body, watch, sources)
		 values ($1, $2::date, $3, $4, $5, $6, $7, $8::jsonb)
		 on conflict (ticker, day, slot, kind) do update
		 set title = excluded.title, body = excluded.body, watch = excluded.watch, sources = excluded.sources`,
		[ticker, today, slot, detected.kind, detected.title, detected.body, detected.watch, JSON.stringify(detected.sources)],
	);
	return true;
}

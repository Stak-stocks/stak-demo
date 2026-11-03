import { pgQuery } from "../lib/postgres.js";

/**
 * The taste quiz's goal answer (users.preferences.android_taste.goal, the same numbers in every app's TasteModel) and
 * what STAK does with it: one fixed line for STAK AI and the brief's personal sentence, the investing terms a person
 * has already had explained (so "Learn how investing works" doesn't mean the basics forever), and Home's check-in
 * that offers a learner the long-term goal once they've clearly found their feet.
 */
export const GOAL_LEARN = 0;
export const GOAL_GROW = 1;
export const GOAL_FIRST_STOCKS = 2;
export const GOAL_EXPLORE = 3;

/** The goal from an account's preferences; -1 before the quiz was answered. */
export function goalOf(preferences: Record<string, unknown> | null | undefined): number {
	const goal = (preferences?.android_taste as { goal?: unknown } | undefined)?.goal;
	return typeof goal === "number" && Number.isInteger(goal) ? goal : -1;
}

/**
 * STAK AI's line about the goal, for "About this user" - null where the test set showed no difference (first stocks:
 * relating news to their saved companies didn't happen with or without a line), for "Just exploring" and for no
 * answer, which leave the prompt as it was.
 *
 * A learner whose question only uses terms they already know gets no line for it: telling the model which terms they
 * know didn't work (as its own line or inside this one, P/E was still defined 3 times in 3), while without the line a
 * question about a P/E gets the plain figure. Decided here, in code, from the question.
 */
export function chatGoalLine(goal: number, known: string[] = [], question = ""): string | null {
	switch (goal) {
		case GOAL_LEARN: {
			const asked = termsIn(question);
			if (asked.length > 0 && asked.every((t) => known.includes(t))) return null;
			return "Learning how investing works. Define each investing term the first time you use it in this conversation, in a short plain clause - even in a one-line factual answer - add one everyday comparison when it makes an idea clearer, and keep jargon out.";
		}
		case GOAL_GROW: return "Growing their money over the long term. Explain a move as usual, then say how it compares with the stock's longer record (the past months or year), so one day isn't made to sound bigger than it is.";
		default: return null;
	}
}

/** The brief's "Why this matters to you" rule for the goal; null leaves its prompt as it was. */
export function briefGoalRule(goal: number): string | null {
	switch (goal) {
		case GOAL_LEARN: return "This reader is learning how investing works: if you use a market term, say what it means in a few plain words.";
		case GOAL_GROW: return "This reader invests for the long term: don't make one day's move sound bigger than it is.";
		default: return null;
	}
}

// ── Terms a person has already had explained ────────────────────────────────

/** The investing terms STAK AI explains, each with how to spot it in an answer. Names are what the prompt lists. */
export const TERMS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
	{ name: "P/E ratio", pattern: /\bP\/E\b|price[- ]to[- ]earnings/i },
	{ name: "EPS (earnings per share)", pattern: /\bEPS\b|earnings per share/i },
	{ name: "market cap", pattern: /\bmarket cap(?:italization)?\b/i },
	// Not a beta version, an iOS beta or beta testers.
	{ name: "beta", pattern: /(?<!\b(?:iOS|public|developer|open)\s)\bbeta\b(?!\s+(?:version|test|testers?|testing|program|release|software|features?))/i },
	{ name: "dividends", pattern: /\bdividends?\b/i },
	{ name: "ETFs", pattern: /\bETFs?\b|exchange[- ]traded fund/i },
	{ name: "volatility", pattern: /\bvolatil(?:e|ity)\b/i },
	// Analysts' estimates, not "the company estimates" or a "consensus view".
	{ name: "analyst estimates", pattern: /\banalysts?'? (?:had )?(?:estimates?|expected|expectations|forecasts?)\b|\b(?:consensus|Wall Street) estimates?\b|\b(?:beat|miss(?:ed)?|topped|fell short of) (?:the )?estimates?\b/i },
	{ name: "price targets", pattern: /\bprice targets?\b/i },
	// A rating change, not an "iPhone upgrade cycle".
	{ name: "analyst upgrades and downgrades", pattern: /\b(?:upgrade|downgrade)[sd]?\b.{0,40}\b(?:rating|to (?:buy|sell|hold|overweight|underweight|neutral|outperform))\b|\b(?:analysts?|firm|bank)\b.{0,40}\b(?:upgrade|downgrade)[sd]?\b/i },
	// A profit margin, not "a narrow margin".
	{ name: "profit margins", pattern: /\b(?:profit|operating|gross|net) margins?\b/i },
	{ name: "guidance", pattern: /\bguidance\b/i },
	{ name: "short selling", pattern: /\bshort[- ]sell(?:ing|ers?)?\b|\bshorting\b/i },
	{ name: "bull and bear markets", pattern: /\b(?:bull|bear)(?:ish)? market\b/i },
	{ name: "buybacks", pattern: /\b(?:stock |share )?buybacks?\b/i },
	{ name: "IPOs", pattern: /\bIPOs?\b|initial public offering/i },
	{ name: "year-over-year growth", pattern: /\byear[- ]over[- ]year\b/i },
	{ name: "valuation", pattern: /\bvaluations?\b/i },
	{ name: "interest rates and the Fed", pattern: /\bFederal Reserve\b|\bthe Fed\b|\binterest rates?\b/i },
	{ name: "inflation", pattern: /\binflation\b/i },
	{ name: "S&P 500", pattern: /\bS&P 500\b/i },
	{ name: "stock splits", pattern: /\bstock splits?\b/i },
];

/**
 * After this many answers to a learner that used a term (and so, by their goal's line, defined it), it's taken as
 * known and no longer defined.
 */
export const KNOWN_AFTER = 2;

/** The terms an answer used. */
export function termsIn(text: string): string[] {
	return TERMS.filter((t) => t.pattern.test(text)).map((t) => t.name);
}

/** The terms counted at least KNOWN_AFTER times, in the glossary's order (so the prompt doesn't reshuffle). */
export function knownTerms(counts: Record<string, unknown> | null | undefined): string[] {
	if (!counts) return [];
	return TERMS.filter((t) => Number(counts[t.name]) >= KNOWN_AFTER).map((t) => t.name);
}

/** The person's counts (users.known_terms); empty when there are none, or the column isn't there yet. */
export async function readTermCounts(uid: string): Promise<Record<string, number>> {
	const result = await pgQuery<{ known_terms: Record<string, number> | null }>(
		`select known_terms from users where uid = $1`, [uid],
	).catch(() => null);
	return result?.rows[0]?.known_terms ?? {};
}

/**
 * Counts the terms an answer to a learner used, in one statement (two answers saved at once can't lose a count).
 * Only for a learner: other goals aren't told to define terms, so a mention there explained nothing. Never throws.
 */
export async function recordTerms(uid: string, goal: number, text: string): Promise<void> {
	if (goal !== GOAL_LEARN) return;
	const used = termsIn(text);
	if (used.length === 0) return;
	await pgQuery(
		`update users u set known_terms = coalesce(u.known_terms, '{}'::jsonb) || (
			select jsonb_object_agg(t, coalesce((u.known_terms->>t)::int, 0) + 1) from unnest($2::text[]) t
		) where u.uid = $1`,
		[uid, used],
	).catch((e) => console.warn("[goal] term count write failed:", e));
}

// ── Home's check-in ─────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
/** First asked once the account is a month old, */
export const CHECK_IN_FIRST_DAYS = 30;
/** after "Keep the basics", asked once more two months later, */
export const CHECK_IN_AGAIN_DAYS = 60;
/** and never more than this many times. */
export const CHECK_IN_MAX_ASKS = 2;

/** How long they've been with STAK, for the card: "You've been learning with STAK for 3 months." */
export interface GoalCheckIn { reason: "months"; count: number }

/** The stored answers (users.goal_check_in). */
export interface CheckInRecord { asks: number; lastAskedAt: string; last: "keep" | "switch" }

/**
 * Whether the check-in is due, from the facts - no database, so it's tested on its own: a learner whose account is a
 * month old and who hasn't answered, or who kept the basics two months ago and has been asked only once.
 */
export function checkInDue(goal: number, createdAt: string | Date | null, record: CheckInRecord | null, now: Date): GoalCheckIn | null {
	if (goal !== GOAL_LEARN || createdAt == null) return null;
	const age = now.getTime() - new Date(createdAt).getTime();
	if (!(age >= CHECK_IN_FIRST_DAYS * DAY_MS)) return null;
	if (record) {
		if (record.asks >= CHECK_IN_MAX_ASKS) return null;
		const since = now.getTime() - new Date(record.lastAskedAt).getTime();
		if (!(since >= CHECK_IN_AGAIN_DAYS * DAY_MS)) return null;
	}
	return { reason: "months", count: Math.floor(age / (CHECK_IN_FIRST_DAYS * DAY_MS)) };
}

/** The check-in for this account, or null: one small read, only for a learner. Any failure is no check-in. */
export async function goalCheckIn(uid: string, goal: number, now = new Date()): Promise<GoalCheckIn | null> {
	if (goal !== GOAL_LEARN) return null;
	const result = await pgQuery<{ created_at: string | Date | null; record: CheckInRecord | null }>(
		`select created_at, goal_check_in as record from users where uid = $1`, [uid],
	).catch(() => null);
	const row = result?.rows[0];
	if (!row) return null;
	return checkInDue(goal, row.created_at, row.record, now);
}

/**
 * Stores an answer to the check-in - one more ask, when, and which - and for "switch" moves the goal to growing money
 * long-term, in one statement so it can't be half done. A second answer within a minute (the card answered on two
 * screens, or twice) changes nothing, so it can't use up both asks.
 */
export async function answerCheckIn(uid: string, answer: "keep" | "switch"): Promise<void> {
	await pgQuery(
		`update users set
			preferences = case when $2 = 'switch' and preferences->'android_taste' is not null
				then jsonb_set(preferences, '{android_taste,goal}', to_jsonb($3::int)) else preferences end,
			goal_check_in = jsonb_build_object(
				'asks', coalesce((goal_check_in->>'asks')::int, 0) + 1,
				'lastAskedAt', now(),
				'last', $2::text
			),
			updated_at = now()
		where uid = $1
			and (goal_check_in is null or (goal_check_in->>'lastAskedAt')::timestamptz < now() - interval '1 minute')`,
		[uid, answer, GOAL_GROW],
	);
}

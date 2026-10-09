import { pgQuery } from "../lib/postgres.js";
import { cacheDelete } from "../lib/cache.js";
import { STAK_WEIGHTED_STOCK_TAGS, clampTagScore, type StakStockTagConfig } from "@stak/shared";

type ActionType =
	| "save"
	| "right_swipe"
	| "learn_more"
	| "pass"
	| "left_swipe"
	| "remove_from_watchlist"
	| "skip";

const ACTION_POINTS: Record<string, number> = {
	save: 5,
	right_swipe: 5,
	learn_more: 3,
	pass: -2,
	left_swipe: -2,
	skip: 0,
	remove_from_watchlist: -5,
};

const STOCK_TAG_MAP = new Map(
	(STAK_WEIGHTED_STOCK_TAGS as unknown as StakStockTagConfig[]).map((s) => [
		s.ticker.toUpperCase(),
		s,
	]),
);

/**
 * Update a user's tag_scores in Postgres based on a swipe / engagement action.
 * Fires-and-forgets safely — all errors are swallowed so callers don't break.
 */
export async function updateUserTasteProfile(
	uid: string,
	ticker: string,
	action: ActionType | string,
): Promise<void> {
	const stock = STOCK_TAG_MAP.get(ticker.toUpperCase());
	if (!stock?.learningTags?.length) return;

	const actionPoints = ACTION_POINTS[action] ?? 0;
	if (actionPoints === 0) return;

	const deltas: Record<string, number> = {};
	for (const lt of stock.learningTags) {
		deltas[lt.tag] = actionPoints * lt.weight;
	}

	try {
		await pgQuery(
			`select update_user_taste_profile($1, $2::jsonb)`,
			[uid, JSON.stringify(deltas)],
		);
	} catch { /* fire-and-forget — never break the caller */ }
}

/** Where /api/recommendations keeps an account's ranking for a few minutes (v2: the scoring that measures against the
 *  user's strongest interest). */
export const sortedRecommendationsKey = (uid: string) => `recommendations:sorted:${uid}:v2`;

/** Onboarding's brand tiles, by the name each app sends (web calls Sony "Sony Group Corp", the apps "PlayStation"). */
const PICK_TICKERS: Record<string, string> = {
	apple: "AAPL", tesla: "TSLA", nike: "NKE", spotify: "SPOT", netflix: "NFLX", amazon: "AMZN", disney: "DIS",
	microsoft: "MSFT", nvidia: "NVDA", playstation: "SONY", "sony group corp": "SONY", coinbase: "COIN", uber: "UBER",
};

/** The taste scores onboarding's brand picks give: each pick counts as a right swipe on that brand. */
export function tasteFromPicks(picks: string[]): Record<string, number> {
	const scores: Record<string, number> = {};
	const tickers = new Set(picks.map((p) => PICK_TICKERS[p.trim().toLowerCase()]).filter(Boolean));
	for (const ticker of tickers) {
		for (const lt of STOCK_TAG_MAP.get(ticker)?.learningTags ?? []) {
			scores[lt.tag] = clampTagScore((scores[lt.tag] ?? 0) + ACTION_POINTS.right_swipe * lt.weight);
		}
	}
	return scores;
}

/**
 * Starts an account's taste from its onboarding brand picks, so the first deck already leans toward them. Only an
 * account with no taste yet: once it has swiped, its swipes say more than the quiz did. Returns the scores it set
 * (null when it set none). Never throws.
 */
export async function seedTasteFromPicks(uid: string, picks: string[]): Promise<Record<string, number> | null> {
	const scores = tasteFromPicks(picks);
	if (Object.keys(scores).length === 0) return null;
	try {
		const res = await pgQuery(
			`update users set tag_scores = $2::jsonb
			 where uid = $1 and (tag_scores is null or tag_scores = '{}'::jsonb)`,
			[uid, JSON.stringify(scores)],
		);
		if ((res.rowCount ?? 0) === 0) return null;
		// A ranking cached before the account had a taste would hide it for a few minutes.
		await cacheDelete(sortedRecommendationsKey(uid)).catch(() => {});
		return scores;
	} catch {
		return null;
	}
}

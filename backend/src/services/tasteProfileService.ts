import { pgQuery } from "../lib/postgres.js";
import { STAK_WEIGHTED_STOCK_TAGS, type StakStockTagConfig } from "@stak/shared";

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

	await pgQuery(
		`select update_user_taste_profile($1, $2::jsonb)`,
		[uid, JSON.stringify(deltas)],
	);
}

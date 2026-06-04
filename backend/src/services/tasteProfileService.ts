import { adminDb } from "../firebaseAdmin.js";
import { STAK_WEIGHTED_STOCK_TAGS, type StakStockTagConfig } from "../data/stockTags.js";

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

// Maps raw learning tags → the 5 display categories shown in the profile widget.
// A tag can belong to multiple buckets (e.g. `ai` → techCurious + highGrowth).
const TAG_TO_DISPLAY_BUCKETS: Record<string, string[]> = {
	// techCurious
	adtech: ["techCurious"],
	ai_supply_chain: ["techCurious"],
	chip_equipment: ["techCurious"],
	cybersecurity: ["techCurious"],
	digital_media: ["techCurious"],
	enterprise_software: ["techCurious"],
	hardware: ["techCurious"],
	services: ["techCurious"],
	software: ["techCurious"],
	technology: ["techCurious"],
	ai: ["techCurious", "highGrowth"],
	analytics: ["techCurious", "highGrowth"],
	automation: ["techCurious", "highGrowth"],
	cloud: ["techCurious", "highGrowth"],
	data_center: ["techCurious", "highGrowth"],
	data_cloud: ["techCurious", "highGrowth"],
	innovation: ["techCurious", "highGrowth"],
	network_effects: ["techCurious", "highGrowth"],
	semiconductor: ["techCurious", "highGrowth"],
	// consumerBrands
	apparel_beauty: ["consumerBrands"],
	beverage: ["consumerBrands"],
	consumer_brand: ["consumerBrands"],
	consumer_platform: ["consumerBrands"],
	consumer_service: ["consumerBrands"],
	consumer_spending: ["consumerBrands"],
	entertainment: ["consumerBrands"],
	everyday_spending: ["consumerBrands"],
	familiar_brand: ["consumerBrands"],
	home_retail: ["consumerBrands"],
	marketplace: ["consumerBrands"],
	media: ["consumerBrands"],
	restaurant: ["consumerBrands"],
	retail: ["consumerBrands"],
	streaming: ["consumerBrands"],
	subscription: ["consumerBrands"],
	travel: ["consumerBrands"],
	ecommerce: ["consumerBrands", "highGrowth"],
	electric_vehicles: ["consumerBrands", "highGrowth", "speculativePlays"],
	consumer_staples: ["consumerBrands", "incomeDividends"],
	auto: ["consumerBrands"],
	gaming: ["consumerBrands", "speculativePlays"],
	// highGrowth
	high_growth: ["highGrowth"],
	saas: ["highGrowth"],
	fintech: ["highGrowth"],
	air_mobility: ["highGrowth", "speculativePlays"],
	crypto: ["highGrowth", "speculativePlays"],
	meme_stock: ["highGrowth", "speculativePlays"],
	space: ["highGrowth", "speculativePlays"],
	speculative: ["highGrowth", "speculativePlays"],
	clean_energy: ["highGrowth", "speculativePlays"],
	solar: ["highGrowth", "speculativePlays"],
	biotech: ["highGrowth", "speculativePlays"],
	digital_health: ["highGrowth", "speculativePlays"],
	// incomeDividends
	dividend_income: ["incomeDividends"],
	telecom: ["incomeDividends"],
	utilities: ["incomeDividends"],
	energy: ["incomeDividends"],
	oil_gas: ["incomeDividends"],
	asset_management: ["incomeDividends"],
	banking: ["incomeDividends"],
	capital_markets: ["incomeDividends"],
	financials: ["incomeDividends"],
	insurance: ["incomeDividends"],
	defensive: ["incomeDividends"],
	income: ["incomeDividends"],
	real_estate: ["incomeDividends"],
	reit: ["incomeDividends"],
	// speculativePlays
	casino_gaming: ["speculativePlays"],
	trading_platform: ["speculativePlays"],
	volatile: ["speculativePlays"],
	commodity_sensitive: ["speculativePlays"],
	policy_linked: ["speculativePlays"],
};

export const DISPLAY_CATEGORY_LABELS: Record<string, string> = {
	techCurious: "Tech Curious",
	consumerBrands: "Consumer Brands",
	highGrowth: "High Growth",
	incomeDividends: "Income & Dividends",
	speculativePlays: "Speculative Plays",
};

export interface DisplayCategories {
	techCurious: number;
	consumerBrands: number;
	highGrowth: number;
	incomeDividends: number;
	speculativePlays: number;
}

/** Convert raw tagScores map into 5 display category percentages (0–100). */
export function getDisplayCategories(tagScores: Record<string, number>): DisplayCategories {
	const raw: Record<string, number> = {
		techCurious: 0,
		consumerBrands: 0,
		highGrowth: 0,
		incomeDividends: 0,
		speculativePlays: 0,
	};

	for (const [tag, score] of Object.entries(tagScores)) {
		const positiveScore = Math.max(0, score);
		const buckets = TAG_TO_DISPLAY_BUCKETS[tag] ?? [];
		for (const bucket of buckets) {
			if (bucket in raw) raw[bucket] += positiveScore;
		}
	}

	const pct = (v: number) => Math.max(0, Math.min(100, Math.round((v / 30) * 100)));
	return {
		techCurious:    pct(raw.techCurious),
		consumerBrands: pct(raw.consumerBrands),
		highGrowth:     pct(raw.highGrowth),
		incomeDividends:pct(raw.incomeDividends),
		speculativePlays:pct(raw.speculativePlays),
	};
}

/**
 * Update a user's tagScores in Firestore based on a swipe / engagement action.
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

	const userRef = adminDb.collection("users").doc(uid);

	await adminDb.runTransaction(async (tx) => {
		const snap = await tx.get(userRef);
		const current: Record<string, number> = (snap.data()?.tagScores as Record<string, number>) ?? {};
		const updated: Record<string, number> = { ...current };

		for (const lt of stock.learningTags) {
			const delta = actionPoints * lt.weight;
			updated[lt.tag] = Math.max(-10, (updated[lt.tag] ?? 0) + delta);
		}

		tx.set(userRef, { tagScores: updated }, { merge: true });
	});
}

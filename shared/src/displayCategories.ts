// Single source of truth for bucketing a user's raw tagScores into the 5 display
// categories shown across the profile page and stock detail sheet. Three places
// (profile.tsx, my-stak.tsx, and a now-removed backend copy) used to maintain their
// own copy of this map plus three different aggregation formulas — keep this the
// only place it's implemented.

// KNOWN GAP: ~37 of the ~109 learningTags used in stockTags.ts (about a third —
// including high-volume tags like healthcare, industrials, payments, pharma,
// social_media) have no entry below, so engagement with those stocks earns zero
// display-category credit today. Inherited as-is from the pre-existing per-file
// copies; not fixed here — flagged for a follow-up decision, not silently absorbed.
export const TAG_TO_DISPLAY_BUCKETS: Record<string, string[]> = {
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

export type DisplayCategoryKey =
	| "techCurious"
	| "consumerBrands"
	| "highGrowth"
	| "incomeDividends"
	| "speculativePlays";

/** Long labels for the profile page's 5 percentage bars. */
export const DISPLAY_CATEGORY_LABELS: Record<DisplayCategoryKey, string> = {
	techCurious: "Tech Curious",
	consumerBrands: "Consumer Brands",
	highGrowth: "High Growth",
	incomeDividends: "Income & Dividends",
	speculativePlays: "Speculative Plays",
};

/** Short title/subtitle pairs for the stock detail sheet's one-line top-category badge. */
export const DISPLAY_CATEGORY_TOP_LABELS: Record<DisplayCategoryKey, { title: string; subtitle: string }> = {
	techCurious: { title: "Tech", subtitle: "Stocks" },
	consumerBrands: { title: "Consumer", subtitle: "Brands" },
	highGrowth: { title: "High", subtitle: "Growth" },
	incomeDividends: { title: "Income", subtitle: "Stocks" },
	speculativePlays: { title: "Speculative", subtitle: "Plays" },
};

const EMPTY_SCORES: Record<DisplayCategoryKey, number> = {
	techCurious: 0,
	consumerBrands: 0,
	highGrowth: 0,
	incomeDividends: 0,
	speculativePlays: 0,
};

/** Positive-only sum per bucket — the core every consumer aggregates on top of. */
export function computeDisplayCategoryScores(tagScores: Record<string, number>): Record<DisplayCategoryKey, number> {
	const raw: Record<DisplayCategoryKey, number> = { ...EMPTY_SCORES };
	for (const [tag, score] of Object.entries(tagScores)) {
		// Only count positive signal per tag — negative scores suppress recommendations
		// but shouldn't erase display credit for categories the user has actually saved
		const positiveScore = Math.max(0, score);
		for (const bucket of TAG_TO_DISPLAY_BUCKETS[tag] ?? []) {
			if (bucket in raw) raw[bucket as DisplayCategoryKey] += positiveScore;
		}
	}
	return raw;
}

/** 0-100 percentages, normalized against the user's own highest bucket (their top
 *  bucket always renders as 100%). Used by the profile page's 5 percentage bars. */
export function computeDisplayCategoryPercentages(tagScores: Record<string, number>): Record<DisplayCategoryKey, number> {
	const raw = computeDisplayCategoryScores(tagScores);
	const maxScore = Math.max(1, ...Object.values(raw));
	return Object.fromEntries(
		Object.entries(raw).map(([k, v]) => [k, Math.round((v / maxScore) * 100)]),
	) as Record<DisplayCategoryKey, number>;
}

/** Picks the single highest-scoring bucket (positive-only) for a one-line badge.
 *  Falls back to a default whenever there's no real positive signal anywhere — a
 *  brand-new user, engagement limited to tags with no bucket mapping (see the
 *  known-gap note above), or a user who has only ever disliked things in every
 *  bucket they've touched. Checking the top score itself (not just "did they touch
 *  any bucketed tag") matters: computeDisplayCategoryScores floors every bucket at
 *  0, so an all-negative profile ties 5-way at zero — without this check the tie
 *  would resolve to whichever key happens to be first in object order (techCurious),
 *  showing a confident-looking but meaningless pick instead of the default. */
export function computeTopDisplayCategory(tagScores: Record<string, number>): { title: string; subtitle: string } {
	const raw = computeDisplayCategoryScores(tagScores);
	const top = (Object.entries(raw) as [DisplayCategoryKey, number][]).sort(([, a], [, b]) => b - a)[0]!;
	if (top[1] <= 0) return { title: "Consumer", subtitle: "Brands" };
	return DISPLAY_CATEGORY_TOP_LABELS[top[0]];
}

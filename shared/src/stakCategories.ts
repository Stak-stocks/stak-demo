// Single source of truth for turning a backend `primaryCategory` id (from
// STAK_WEIGHTED_STOCK_TAGS, ~60 fine-grained ids) into the collection names My
// STAK groups saved companies under. Ported from the Android app's
// `StakCategories.kt` — keep this file's CATEGORY_NAMES map in sync with that
// one; they're meant to read identically on both platforms.
//
// Related ids share a display name on purpose — "semiconductor" and
// "semiconductor_equipment" both read "Chips" and count as one collection.
//
// Do not confuse this with the two OTHER category systems in this codebase:
// `BrandSummary.interestCategories` (a different, coarser tagging) and
// `displayCategories.ts`'s 5 tagScores-driven buckets (techCurious/consumerBrands/
// etc., used by the profile page). This is a third, separate taxonomy — the one
// My STAK's Collections grid and the Taste Graph are built from.
import { STAK_WEIGHTED_STOCK_TAGS } from "./stockTags";

export const CATEGORY_NAMES: Record<string, string> = {
	enterprise_software: "Software",
	semiconductor: "Chips",
	semiconductor_equipment: "Chips",
	restaurant: "Restaurants",
	bank: "Banks",
	retail: "Retail",
	insurance: "Insurance",
	energy_oilgas: "Energy",
	ecommerce_marketplace: "E-commerce",
	fintech_payments: "Fintech",
	consumer_staples: "Staples",
	industrial: "Industrials",
	capital_markets: "Markets",
	asset_manager: "Asset Managers",
	financial_data: "Financial Data",
	healthcare_pharma: "Pharma",
	apparel_beauty: "Fashion",
	streaming_media: "Streaming",
	beverage: "Drinks",
	cybersecurity: "Cybersecurity",
	space_airmobility: "Space",
	social_media: "Social Media",
	travel_rideshare: "Travel",
	aerospace_defense: "Defense",
	medical_devices: "MedTech",
	reit: "Real Estate",
	casino_entertainment: "Casinos",
	gaming: "Gaming",
	crypto_fintech: "Crypto",
	payment_network: "Payments",
	utilities: "Utilities",
	metals_mining: "Mining",
	auto_ev: "EVs",
	clean_energy: "Clean Energy",
	health_insurance: "Health Insurers",
	biotech: "Biotech",
	transport_logistics: "Logistics",
	airline: "Airlines",
	consumer_tech: "Consumer Tech",
	database_data: "Data",
	automation_ai: "AI",
	private_equity: "Private Equity",
	auto_legacy: "Autos",
	telecom: "Telecom",
	mega_cap_tech: "Big Tech",
	etf_index: "Index Funds",
	home_retail: "Home Retail",
	// Not just "Tech" — reads as a third, unrelated category next to "Big Tech" on
	// the same grid, when it's really the catch-all the other, more specific tech
	// categories (Chips, AI, Big Tech, Software...) fall out of.
	default_tech: "General Tech",
	tech: "General Tech",
	adtech: "Ad Tech",
	meme_stock: "Meme Stocks",
	default_consumer: "Consumer",
	default_finance: "Finance",
	digital_health: "Digital Health",
	food_beverage_growth: "Food",
};

/** "semiconductor" -> "Chips"; an id we don't name yet reads as its own words. */
export function categoryName(id: string): string {
	const known = CATEGORY_NAMES[id];
	if (known) return known;
	return id
		.split("_")
		.map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
		.join(" ");
}

/** A collection's route id — the display name, so "Chips" is one collection however it was tagged. */
export function categoryGroupId(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The six broad families My STAK's collection art/palette groups display names into. */
export type CategoryFamily = "tech" | "finance" | "green" | "realestate" | "health" | "consumer" | "other";

const FAMILY_BY_NAME: Record<string, CategoryFamily> = {
	Software: "tech", Chips: "tech", Cybersecurity: "tech", Data: "tech",
	AI: "tech", "Big Tech": "tech", "Consumer Tech": "tech", "General Tech": "tech",
	"Ad Tech": "tech", "Social Media": "tech", Gaming: "tech",
	Banks: "finance", Fintech: "finance", Markets: "finance", "Asset Managers": "finance",
	"Financial Data": "finance", Payments: "finance", Insurance: "finance", Crypto: "finance",
	"Private Equity": "finance", "Index Funds": "finance", Finance: "finance",
	"Clean Energy": "green", Utilities: "green", EVs: "green",
	"Real Estate": "realestate",
	Pharma: "health", MedTech: "health", Biotech: "health",
	"Health Insurers": "health", "Digital Health": "health",
	Retail: "consumer", Restaurants: "consumer", Staples: "consumer", Fashion: "consumer",
	Drinks: "consumer", "E-commerce": "consumer", Streaming: "consumer", Travel: "consumer",
	Casinos: "consumer", "Home Retail": "consumer", Food: "consumer", Consumer: "consumer",
};

/** The allocation palette family for a collection's name — so the ring and the chips agree. */
export function categoryFamily(name: string): CategoryFamily {
	return FAMILY_BY_NAME[name] ?? "other";
}

const PRIMARY_CATEGORY_BY_TICKER = new Map(STAK_WEIGHTED_STOCK_TAGS.map((s) => [s.ticker.toUpperCase(), s.primaryCategory]));

/** A ticker's collection name ("NVDA" -> "Chips"), or null when the catalog doesn't tag it. */
export function categoryNameOf(ticker: string): string | null {
	const id = PRIMARY_CATEGORY_BY_TICKER.get(ticker.toUpperCase());
	return id ? categoryName(id) : null;
}

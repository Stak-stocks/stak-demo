import { STAK_WEIGHTED_STOCK_TAGS } from "../stockTags";
import type { StakStockTagConfig } from "../stockTags";

// interestCategories for the brands whose catalog entry has none (290 of 333 when this was added), derived from the
// stock's primaryCategory so every brand carries them: they go out with swipes and engagement events, feed the card
// tip prompt's "Sectors:" line and are Quick Look's key themes when there's no generated overview. A brand's own
// hand-set list always wins. Values come from the same vocabulary the catalog already uses (see the known-values list
// in backend/src/__tests__/brandsShapeInvariants.unit.test.ts).
const BY_PRIMARY_CATEGORY: Record<string, string[]> = {
	adtech: ["tech", "media"],
	aerospace_defense: ["industrials", "science"],
	airline: ["travel"],
	apparel_beauty: ["fashion", "beauty"],
	asset_manager: ["finance", "investing"],
	auto_ev: ["automotive", "tech", "sustainability"],
	auto_legacy: ["automotive"],
	automation_ai: ["tech"],
	bank: ["finance"],
	beverage: ["food_drink"],
	biotech: ["health", "science"],
	capital_markets: ["finance", "investing"],
	casino_entertainment: ["entertainment", "travel"],
	clean_energy: ["energy", "sustainability"],
	consumer_staples: ["food", "lifestyle"],
	consumer_tech: ["tech"],
	crypto_fintech: ["finance", "tech"],
	cybersecurity: ["tech"],
	database_data: ["tech"],
	default_consumer: ["shopping", "lifestyle"],
	default_finance: ["finance"],
	default_tech: ["tech"],
	digital_health: ["health", "tech"],
	ecommerce_marketplace: ["shopping", "tech"],
	energy_oilgas: ["energy"],
	enterprise_software: ["tech"],
	etf_index: ["investing"],
	financial_data: ["finance", "investing"],
	fintech_payments: ["finance", "tech"],
	food_beverage_growth: ["food", "lifestyle"],
	gaming: ["gaming", "entertainment"],
	health_insurance: ["health", "finance"],
	healthcare_pharma: ["health", "science"],
	home_retail: ["shopping", "lifestyle"],
	industrial: ["industrials"],
	insurance: ["finance"],
	medical_devices: ["health", "tech"],
	mega_cap_tech: ["tech"],
	meme_stock: ["investing", "entertainment"],
	metals_mining: ["industrials"],
	payment_network: ["finance", "shopping"],
	private_equity: ["finance", "investing"],
	reit: ["real_estate"],
	restaurant: ["food", "lifestyle"],
	retail: ["shopping", "lifestyle"],
	semiconductor: ["tech"],
	semiconductor_equipment: ["tech"],
	social_media: ["social", "tech"],
	space_airmobility: ["tech", "science", "travel"],
	streaming_media: ["streaming", "entertainment", "media"],
	tech: ["tech"],
	telecom: ["tech"],
	transport_logistics: ["industrials"],
	travel_rideshare: ["travel", "tech"],
	utilities: ["energy"],
};

/** Stocks with no primaryCategory in STAK_WEIGHTED_STOCK_TAGS. */
const BY_TICKER: Record<string, string[]> = {
	"BRK.B": ["finance", "investing"],
};

const PRIMARY_BY_TICKER = new Map(
	(STAK_WEIGHTED_STOCK_TAGS as unknown as StakStockTagConfig[]).map((s) => [s.ticker as string, s.primaryCategory]),
);

/** The brand's interestCategories: its own when set, otherwise derived from its primaryCategory (or [] if unknown). */
export function interestCategoriesFor(ticker: string, own: string[] | undefined): string[] {
	if (own && own.length > 0) return own;
	const primary = PRIMARY_BY_TICKER.get(ticker);
	return BY_TICKER[ticker] ?? (primary ? BY_PRIMARY_CATEGORY[primary] : undefined) ?? [];
}

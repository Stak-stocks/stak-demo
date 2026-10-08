/**
 * The company catalog behind every live screen: the 333 brands the mobile app ships in
 * @stak/shared (ids, tickers, names, logo sources, financial snapshots) and their category
 * tags. Tickers are the UI key; the account stores brand ids, so both directions map here.
 */
import { STAK_WEIGHTED_STOCK_TAGS, type StakStockTagConfig } from "@stak/shared";
// the catalog itself is deliberately kept out of the package index (~1 MB); the deep import is its door
import { brands, getBrandFallbackLogoUrl, getBrandLogoUrl, getBrandUltimateFallbackUrl, type BrandProfile } from "@stak/shared/brands";

export type CollectionSlug = "ai-tech" | "finance" | "green-energy" | "real-estate" | "healthcare" | "consumer" | "other";

const byTicker = new Map<string, BrandProfile>();
const byId = new Map<string, BrandProfile>();
for (const b of brands) {
	byTicker.set(b.ticker.toUpperCase(), b);
	byId.set(b.id, b);
}
const tagsByTicker = new Map<string, StakStockTagConfig>();
for (const t of STAK_WEIGHTED_STOCK_TAGS) tagsByTicker.set(t.ticker.toUpperCase(), t);

export const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();
export const brandByTicker = (ticker: string): BrandProfile | undefined => byTicker.get(normalizeTicker(ticker));
export const brandById = (id: string): BrandProfile | undefined => byId.get(id);
export const tickerOfBrandId = (id: string): string => byId.get(id)?.ticker.toUpperCase() ?? id.toUpperCase();
export const brandIdOfTicker = (ticker: string): string => brandByTicker(ticker)?.id ?? ticker.toLowerCase();
export const tagsOf = (ticker: string): StakStockTagConfig | undefined => tagsByTicker.get(normalizeTicker(ticker));
export const isKnownTicker = (ticker: string) => byTicker.has(normalizeTicker(ticker));
export const allTickers = (): string[] => [...byTicker.keys()];

export const companyName = (ticker: string): string => brandByTicker(ticker)?.name ?? normalizeTicker(ticker);
export const companyInitial = (ticker: string): string => companyName(ticker).charAt(0).toUpperCase();
/** "NVDA · NVIDIA" — the ticker line on deck cards, detail pages and rails. */
export const tickerLine = (ticker: string): string => `${normalizeTicker(ticker)} · ${companyName(ticker)}`;

export const financialsOf = (ticker: string) => brandByTicker(ticker)?.financials;
export function betaOf(ticker: string): number | null {
	const v = Number.parseFloat(financialsOf(ticker)?.beta.value ?? "");
	return Number.isFinite(v) ? v : null;
}
export const displayTagsOf = (ticker: string): string[] => tagsOf(ticker)?.displayTags ?? [];
export const primaryCategoryOf = (ticker: string): string => tagsOf(ticker)?.primaryCategory ?? "";

/** Every catalog category, bucketed into the six My STAK collections the frames draw (+ Other). */
const CATEGORY_TO_COLLECTION: Record<string, CollectionSlug> = {
	semiconductor: "ai-tech",
	semiconductor_equipment: "ai-tech",
	enterprise_software: "ai-tech",
	mega_cap_tech: "ai-tech",
	consumer_tech: "ai-tech",
	automation_ai: "ai-tech",
	database_data: "ai-tech",
	cybersecurity: "ai-tech",
	social_media: "ai-tech",
	adtech: "ai-tech",
	default_tech: "ai-tech",
	bank: "finance",
	insurance: "finance",
	fintech_payments: "finance",
	payment_network: "finance",
	capital_markets: "finance",
	asset_manager: "finance",
	private_equity: "finance",
	crypto_fintech: "finance",
	financial_data: "finance",
	default_finance: "finance",
	clean_energy: "green-energy",
	utilities: "green-energy",
	reit: "real-estate",
	healthcare_pharma: "healthcare",
	medical_devices: "healthcare",
	biotech: "healthcare",
	health_insurance: "healthcare",
	digital_health: "healthcare",
	restaurant: "consumer",
	retail: "consumer",
	ecommerce_marketplace: "consumer",
	consumer_staples: "consumer",
	apparel_beauty: "consumer",
	beverage: "consumer",
	travel_rideshare: "consumer",
	casino_entertainment: "consumer",
	home_retail: "consumer",
	food_beverage_growth: "consumer",
	default_consumer: "consumer",
	streaming_media: "consumer",
	gaming: "consumer",
	auto_ev: "consumer",
	auto_legacy: "consumer",
	meme_stock: "consumer",
};

export const collectionOf = (ticker: string): CollectionSlug => CATEGORY_TO_COLLECTION[primaryCategoryOf(ticker)] ?? "other";

/** The six collections of the frames, in the order the overview lists them. */
export const COLLECTION_ORDER: readonly CollectionSlug[] = ["ai-tech", "finance", "green-energy", "real-estate", "healthcare", "consumer"];

export const COLLECTION_NAMES: Record<CollectionSlug, string> = {
	"ai-tech": "AI & Tech",
	finance: "Finance",
	"green-energy": "Green Energy",
	"real-estate": "Real Estate",
	healthcare: "Healthcare",
	consumer: "Consumer",
	other: "Other",
};

/** Short names for the allocation rows ("Tech & AI" is how the breakdown labels the first one). */
export const ALLOCATION_NAMES: Record<CollectionSlug, string> = { ...COLLECTION_NAMES, "ai-tech": "Tech & AI" };

export const COLLECTION_DESCRIPTIONS: Record<CollectionSlug, string> = {
	"ai-tech": "Your highest-conviction growth and AI names.",
	finance: "Banks, payments and the plumbing money runs on.",
	"green-energy": "Clean power and the grid that carries it.",
	"real-estate": "Property that pays rent while you hold it.",
	healthcare: "Medicine, devices and the people who insure them.",
	consumer: "Brands you see every day, trading on quarterly numbers.",
	other: "Everything else you saved.",
};

/** Logo sources for a ticker: the Brandfetch CDN, then the catalog's own logo, then a favicon. */
export function logoSources(ticker: string): { primary: string; fallback: string; ultimate: string } | null {
	const b = brandByTicker(ticker);
	if (!b) return null;
	return { primary: getBrandLogoUrl(b), fallback: getBrandFallbackLogoUrl(b), ultimate: getBrandUltimateFallbackUrl(b) };
}

/** Catalog tickers whose primary category is one of the given ones (tag order preserved). */
export function tickersInCategories(categories: readonly string[]): string[] {
	const set = new Set(categories);
	return STAK_WEIGHTED_STOCK_TAGS.filter((t) => set.has(t.primaryCategory) && byTicker.has(t.ticker.toUpperCase())).map((t) =>
		t.ticker.toUpperCase(),
	);
}

/**
 * The company catalog behind every live screen: the 333 brands the mobile app ships in
 * @stak/shared (ids, tickers, names, logo sources, financial snapshots) and their category
 * tags. Tickers are the UI key; the account stores brand ids, so both directions map here.
 *
 * The catalog is ~1 MB of source, so it travels as its own chunk, fetched the first time an app
 * route mounts (`useCatalog` in the _app layout): the landing, auth and onboarding pages never
 * pay for it. Until it lands the helpers answer as they do for an unknown ticker and the layout
 * keeps the route's loading frame up, so no screen renders against an empty catalog.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { StakStockTagConfig } from "@stak/shared/stockTags";
import type { BrandProfile } from "@stak/shared/brands";

export type CollectionSlug = "ai-tech" | "finance" | "green-energy" | "real-estate" | "healthcare" | "consumer" | "other";

type LogoUrl = (brand: BrandProfile) => string;
type Catalog = {
	byTicker: Map<string, BrandProfile>;
	byId: Map<string, BrandProfile>;
	tags: readonly StakStockTagConfig[];
	tagsByTicker: Map<string, StakStockTagConfig>;
	actionPoints: Record<string, number>;
	logo: { primary: LogoUrl; fallback: LogoUrl; ultimate: LogoUrl };
};

export type CatalogStatus = "idle" | "loading" | "ready" | "failed";
export type CatalogFailure = "fetch" | "timeout";

let catalog: Catalog | null = null;
let status: CatalogStatus = "idle";
let failure: CatalogFailure | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => {
	for (const l of listeners) l();
};
/** A chunk that has not arrived after this long is reported as failed; if it still lands later it is used. */
const TIMEOUT_MS = 25_000;

/**
 * Fetch the catalog chunk, once per page. The browser remembers a failed module fetch for the life of
 * the page, so a second import() of the same URL can never succeed: there is no retry here, and the
 * failure panel offers a reload instead.
 */
export function loadCatalog(): Promise<void> {
	if (catalog) return Promise.resolve();
	if (pending) return pending;
	status = "loading";
	failure = null;
	notify();
	const fetchChunks = (async () => {
		const [b, t] = await Promise.all([import("./brands"), import("@stak/shared/stockTags")]);
		const byTicker = new Map<string, BrandProfile>();
		const byId = new Map<string, BrandProfile>();
		for (const brand of b.brands) {
			byTicker.set(brand.ticker.toUpperCase(), brand);
			byId.set(brand.id, brand);
		}
		const tagsByTicker = new Map<string, StakStockTagConfig>();
		for (const tag of t.STAK_WEIGHTED_STOCK_TAGS) tagsByTicker.set(tag.ticker.toUpperCase(), tag);
		catalog = {
			byTicker,
			byId,
			tags: t.STAK_WEIGHTED_STOCK_TAGS,
			tagsByTicker,
			actionPoints: t.ACTION_POINTS as unknown as Record<string, number>,
			logo: { primary: b.getBrandLogoUrl, fallback: b.getBrandFallbackLogoUrl, ultimate: b.getBrandUltimateFallbackUrl },
		};
		status = "ready";
		failure = null;
		notify();
	})();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
	});
	fetchChunks.finally(() => clearTimeout(timer)).catch(() => {}); // a late arrival or failure after the timeout is observed above
	pending = Promise.race([fetchChunks, timeout]).catch((error: unknown) => {
		if (catalog) return;
		status = "failed";
		failure = error instanceof Error && error.message === "timeout" ? "timeout" : "fetch";
		notify();
		throw error;
	});
	return pending;
}

export const catalogStatus = (): CatalogStatus => status;
export const catalogFailure = (): CatalogFailure | null => failure;
export const subscribeCatalog = (listener: () => void): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** The catalog's status, and the request for it: the first app mount fetches it. */
export function useCatalog(): CatalogStatus {
	const current = useSyncExternalStore(subscribeCatalog, catalogStatus, catalogStatus);
	useEffect(() => {
		loadCatalog().catch(() => {});
	}, []);
	return current;
}

/** Start the fetch early, where the person is about to enter the app (sign-in, onboarding); failures surface in the app. */
export const warmCatalog = (): void => {
	loadCatalog().catch(() => {});
};

export const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();
export const brandByTicker = (ticker: string): BrandProfile | undefined => catalog?.byTicker.get(normalizeTicker(ticker));
export const brandById = (id: string): BrandProfile | undefined => catalog?.byId.get(id);
export const tickerOfBrandId = (id: string): string => catalog?.byId.get(id)?.ticker.toUpperCase() ?? id.toUpperCase();
export const brandIdOfTicker = (ticker: string): string => brandByTicker(ticker)?.id ?? ticker.toLowerCase();
export const tagsOf = (ticker: string): StakStockTagConfig | undefined => catalog?.tagsByTicker.get(normalizeTicker(ticker));
export const isKnownTicker = (ticker: string) => catalog?.byTicker.has(normalizeTicker(ticker)) ?? false;
export const allTickers = (): string[] => (catalog ? [...catalog.byTicker.keys()] : []);
/** The points an action earns in the taste graph (the shared table; its own defaults until the catalog lands). */
export const actionPoints = (action: "save" | "pass"): number => catalog?.actionPoints[action] ?? (action === "save" ? 3 : -1);

/**
 * The companies whose catalog entry carries a brand's or the ticker's name where every page should print the
 * company's (coordinator ruling N30.8f, follow-up F3; the hunt's C-10):
 * - GOOGL (and GOOG, its other share class): the catalog says "Google", its best-known brand; the company is Alphabet,
 *   as Figma prints it wherever it names it (the deck card 2:3151 "GOOGL · Alphabet Inc", the collection card 2:4830
 *   "Alphabet") and as both phones do (android ui/mystak/Collections.kt:54, ios MyStak/Collections.swift:67);
 * - AMD: the catalog repeats the ticker, so the pick page and the stock page read "AMD · AMD"; the company is Advanced
 *   Micro Devices (android ui/discover/StockDetailScreen.kt:1245 "AMD · Advanced Micro Devices" and :1282, ios
 *   Discover/StockDetailView.swift:1101 and :1138).
 * A name that does not fit where it is printed keeps that place's own rule for long text (a collection card's one line
 * with an ellipsis; the phones shorten it by hand there: "Adv Micro", Collections.kt:55).
 */
const COMPANY_NAME: Readonly<Record<string, string>> = { GOOGL: "Alphabet", GOOG: "Alphabet", AMD: "Advanced Micro Devices" };

/** ONE display name per company, for every page past the showcase (the frames' own strings stay the frames'). */
export function companyName(ticker: string): string {
	const T = normalizeTicker(ticker);
	return COMPANY_NAME[T] ?? brandByTicker(T)?.name ?? T;
}
/**
 * The letter a coin wears when it has no logo: the TICKER's first letter, as the frames draw it where the ticker and
 * the name differ (Figma 2:4830: GOOGL wears "G" above "Alphabet"; 2:634: HOOD wears "H" beside "Robinhood Markets").
 * Until 2026-11-09 it was the company name's letter, so the coin contradicted the ticker printed beside it: O wore "R"
 * (Realty Income), LLY "E" (Eli Lilly), NOW "S", KO "C", XOM "E" (the hunt's VIS-06; coordinator ruling N30.8r).
 */
export const companyInitial = (ticker: string): string => normalizeTicker(ticker).charAt(0);
/**
 * "NVDA · NVIDIA": the ticker line on deck cards, detail pages and rails. A company whose name IS its ticker (IBM, UPS,
 * SAP, KKR; a ticker the catalog does not know) prints it once: "IBM", never "IBM · IBM" (C-10).
 */
export function tickerLine(ticker: string): string {
	const T = normalizeTicker(ticker);
	const name = companyName(T);
	return name && name !== T ? `${T} · ${name}` : T;
}

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
	if (!b || !catalog) return null;
	return { primary: catalog.logo.primary(b), fallback: catalog.logo.fallback(b), ultimate: catalog.logo.ultimate(b) };
}

/** Catalog tickers whose primary category is one of the given ones (tag order preserved). */
export function tickersInCategories(categories: readonly string[]): string[] {
	if (!catalog) return [];
	const set = new Set(categories);
	const known = catalog.byTicker;
	return catalog.tags.filter((t) => set.has(t.primaryCategory) && known.has(t.ticker.toUpperCase())).map((t) => t.ticker.toUpperCase());
}

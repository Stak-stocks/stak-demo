import { cardArtUrl } from "@/components/discover/discoverTheme";

// Photo art for a collection tile, keyed by the collection's display name (shared/src/stakCategories.ts
// CATEGORY_NAMES). Images live in public/collections/ (public-domain photos from Openverse, cropped 2:1 and
// tinted navy; sources in public/collections/CREDITS.json). Several related collections share one photo.
const ART_BY_NAME: Record<string, string> = {
	Chips: "chips",
	AI: "ai",
	Software: "software", "General Tech": "software", "Ad Tech": "software",
	Cybersecurity: "servers", Data: "servers",
	"Big Tech": "devices", "Consumer Tech": "devices",
	"Social Media": "social",
	Gaming: "gaming",
	Streaming: "streaming",
	"Clean Energy": "clean-energy",
	Utilities: "utilities",
	Energy: "oil-gas",
	Mining: "mining",
	EVs: "ev",
	Autos: "autos",
	Markets: "markets", "Index Funds": "markets",
	"Financial Data": "financial-data", "Asset Managers": "financial-data",
	Banks: "bank",
	Finance: "finance", "Private Equity": "finance",
	Insurance: "insurance",
	Fintech: "payments", Payments: "payments",
	Crypto: "crypto",
	Pharma: "pharma", Biotech: "pharma",
	MedTech: "medtech", "Digital Health": "medtech", "Health Insurers": "medtech",
	Retail: "retail", Consumer: "retail", Staples: "retail",
	Fashion: "fashion",
	"Home Retail": "home",
	Logistics: "logistics", "E-commerce": "logistics",
	Restaurants: "food", Food: "food",
	Drinks: "drinks",
	Travel: "travel", Airlines: "travel",
	Industrials: "industrial",
	Defense: "defense",
	Space: "space", "Meme Stocks": "space",
	"Real Estate": "real-estate",
	Telecom: "telecom",
	Casinos: "casino",
};

/** The collection's photo, or null for a name without one (e.g. "Other"); callers fall back to company art. */
export function collectionArtUrl(name: string): string | null {
	const slug = ART_BY_NAME[name];
	return slug ? `/collections/${slug}.webp` : null;
}

/** A collection tile's picture: its photo, else its first company's Discover card art. */
export function collectionTileArt(name: string, firstTicker: string | undefined): string | null {
	return collectionArtUrl(name) ?? (firstTicker ? cardArtUrl(firstTicker) : null);
}

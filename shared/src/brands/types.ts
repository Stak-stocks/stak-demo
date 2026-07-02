export interface VibeMetric {
	name: string;
	emoji: string;
	value: number;
	color: string;
}

export interface FinancialMetric {
	label: string;
	value: string;
	explanation: string;
	culturalTranslation: string;
}

export interface NewsArticle {
	headline: string;
	source: string;
	url: string;
	image: string;
	datetime: number;
	summary: string;
	explanation: string;
	whyItMatters: string;
	sentiment: "bullish" | "bearish" | "neutral";
	type: "macro" | "sector" | "company";
}

// Minimal shape needed for logo/domain resolution (see logoHelpers.ts) -- both
// BrandProfile and BrandSummary satisfy this structurally, so those helpers work
// with either without needing the full profile just to render a logo.
export interface BrandIdentity {
	id: string;
	ticker: string;
	name: string;
	domain?: string;
	logo?: string;
}

export interface BrandProfile {
	id: string;
	ticker: string;
	name: string;
	domain?: string;
	bio: string;
	heroImage: string;
	personalityDescription: string;
	vibes: VibeMetric[];
	culturalContext: {
		title: string;
		sections: {
			heading: string;
			content: string;
		}[];
	};
	financials: {
		peRatio: FinancialMetric;
		marketCap: FinancialMetric;
		revenueGrowth: FinancialMetric;
		profitMargin: FinancialMetric;
		beta: FinancialMetric;
		dividendYield: FinancialMetric;
	};
	logo?: string;
	interestCategories?: string[];
	peerTickers?: string[];
}

// Lightweight per-brand shape for list/card-style views (Discover deck, search
// results, watchlist rows) -- everything BrandProfile has except the heaviest
// text fields (culturalContext.sections, personalityDescription, and each
// financial metric's label/explanation/culturalTranslation, keeping only
// `value`). Served by GET /api/brands; the full BrandProfile is fetched
// separately and on demand via GET /api/brands/:id when actually viewing one
// brand's detail sheet. Defined here (not just in the backend route) so the
// response shape and the frontend's expectation of it can't drift apart.
export interface BrandSummary {
	id: string;
	ticker: string;
	name: string;
	bio: string;
	heroImage: string;
	logo?: string;
	domain?: string;
	interestCategories?: string[];
	vibes: VibeMetric[];
	financials: {
		peRatio: { value: string };
		marketCap: { value: string };
		revenueGrowth: { value: string };
		profitMargin: { value: string };
		beta: { value: string };
		dividendYield: { value: string };
	};
	peerTickers?: string[];
}

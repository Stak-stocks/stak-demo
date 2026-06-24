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

export interface TrendCard {
	type: "macro" | "sector" | "company" | "stak";
	label: string;

	// NEW FORMAT fields (Gemini v3 — synthesis-based)
	topic?: string;
	why?: string;
	impact?: string;
	synthesis?: string;
	takeaway?: string;

	// V2 FORMAT fields (Gemini v2 — may appear in cached data)
	intro?: string;
	forces?: string[];
	stockReflects?: string;

	// LEGACY fields (static fallback data in trends.ts)
	dominance?: string;
	headline?: string;
	explanation?: string;
	pressure?: "Positive Pressure" | "Negative Pressure" | "Volatile / Mixed Pressure";
	pressureEmoji?: string;
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
	trends?: TrendCard[];
	interestCategories?: string[];
	peerTickers?: string[];
}

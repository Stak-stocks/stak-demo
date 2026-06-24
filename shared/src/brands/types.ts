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

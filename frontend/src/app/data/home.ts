/** Home · Market Mood + promos (Figma 2:414 / 2:532, copy verbatim). */
export const marketMood = {
	title: "Market Mood",
	subtitle: "High volatility, you should consider being cautious.",
	/**
	 * The three story cards, each opening its own article (`id`, /news/<id>: the coordinator's decision D12, the user's
	 * "each card takes me direct to their respective news section"). The fear gauge and the OpenAI IPO are Home's own
	 * articles (src/app/news/articles.ts HOME_ARTICLES); the Fed notes story is the listing's Fed minutes.
	 */
	deck: [
		{
			id: "fear-gauge-32",
			title: "Wall Street's fear gauge reads 32",
			body: "The Fear & Greed Index is firmly in Fear territory. Money is rotating out of the ....",
			source: "CNN Business · Markets",
			/** a fearful, volatile tape hits the high-growth names first */
			affects: ["ai-tech", "green-energy", "consumer"],
		},
		{
			id: "fed-minutes",
			title: "Fed meeting notes drop Wednesday",
			body: "Minutes from the last Fed meeting land July 8. A market this tense moves on every word....",
			source: "Reuters · Fed calendar",
			/** rate news moves the rate-sensitive collections */
			affects: ["finance", "real-estate"],
		},
		{
			id: "openai-ipo-delayed",
			title: "The OpenAI IPO is reportedly delayed",
			body: "The year's most anticipated listing just slipped. Markets riding a wave of IPO excitement...",
			source: "Bloomberg · Tech IPOs",
			affects: ["ai-tech"],
		},
	],
} as const;

/** The industries today's three stories touch (the "affected industries" of the Why-this-matters card). */
export const affectedCollections: ReadonlySet<string> = new Set(marketMood.deck.flatMap((story) => story.affects));

export const homePromos = {
	why: {
		title: "Why this matters to you",
		body: "Your STAK collections houses 80% of stocks from affected industries.",
	},
	deck: { body: "Take your first deck to build your taste", cta: "Go to Deck" },
	picks: { cta: "See Todays Pick", caption: "You have about 12 stock picks waiting for you" },
} as const;

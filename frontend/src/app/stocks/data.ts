/** Stock detail content. The AAPL entry is the frames' copy (2:3457 … 2:4161, 2:4970 … 2:5402), verbatim; every other ticker is built from the catalog and the live quote (see live.ts). */

export type StockStat = { label: string; value: string; note: string; good: boolean; outlined: boolean };
export type StockArticle = { source: string; tone: string; text: string };
export type AnalystView = {
	title: string;
	upside: string;
	rangeLabel: string;
	/** px of the 328-wide rail track, as authored */
	rangeFill: number;
	rangeMarker: number;
	low: [string, string];
	avg: [string, string];
	high: [string, string];
	consensusLabel: string;
	consensusFill: number;
	counts: string[];
	recentLabel: string;
	actions: { firm: string; rating: string; target: string }[];
};

export type StockDetailData = {
	symbol: string;
	name: string;
	initial: string;
	ticker: string;
	price: string;
	change: string;
	changeShort: string;
	shares: string;
	periods: string[];
	activePeriod: string;
	saveIntro: { unsaved: string; saved: string; delta: string; body: string };
	risk: { title: string; badge: string; low: string; high: string; markerLeft: number; note: string };
	numbers: { title: string; stats: StockStat[]; footer: string };
	news: { title: string; move: string; lines: string[]; articles: StockArticle[] };
	cta: { save: string; unsave: string; buy: string; cash: string };
	/** null when nobody covers the name yet */
	analyst: AnalystView | null;
	compare: { title: string; sub: string };
};

export const stockDetails: Record<string, StockDetailData> = {
	AAPL: {
		symbol: "AAPL",
		name: "Apple Inc",
		initial: "A",
		ticker: "AAPL · Apple Inc",
		price: "$229.35",
		change: "▲ 1.2% today",
		changeShort: "▲ 1.2%",
		shares: "0.1090",
		periods: ["1D", "1W", "1M", "1Y"],
		activePeriod: "1M",
		saveIntro: {
			unsaved: "NOT SAVED YET",
			saved: "SINCE YOU SAVED",
			delta: "+4.6%",
			body: "Saved 5 weeks ago. AAPL is up 4.6% since, moving roughly with the market. Steady giants tend to.",
		},
		risk: {
			title: "Risk fit",
			badge: "Matches you",
			low: "Low",
			high: "High",
			markerLeft: 88,
			note: "Low volatility. Fits the steady side of your profile.",
		},
		numbers: {
			title: "Numbers that matter",
			stats: [
				{ label: "P/E ratio", value: "31.2", note: "In line", good: false, outlined: false },
				{ label: "Revenue growth", value: "6.1%", note: "Slower", good: false, outlined: false },
				{ label: "Profit margin", value: "24.3%", note: "Excellent", good: true, outlined: true },
			],
			footer: "Tap a stat for sector and peer benchmarks",
		},
		news: {
			title: "News signal",
			move: "▲ +0.8% at yesterday’s close",
			lines: ["Foldable iPhone reports point to a premium fall lineup.", "Q3 earnings land July 30."],
			articles: [
				{
					source: "Yahoo · 13h ago",
					tone: "Neutral",
					text: "The rally leaves Apple about 4 percent shy of the market-cap crown",
				},
				{
					source: "CNN · 1h ago",
					tone: "Neutral",
					text: "The rally leaves Apple about 4 percent shy of the market-cap crown",
				},
				{
					source: "Bloomberg · 2h ago",
					tone: "Positive",
					text: "Apple's market performance shows resilience amid economic fluctuations.",
				},
				{
					source: "Reuters · 30m ago",
					tone: "Negative",
					text: "Concerns grow over Apple's supply chain issues affecting future growth.",
				},
			],
		},
		cta: { save: "Save", unsave: "Unsave", buy: "Practice buy", cash: "Cash available  $8,800.00" },
		analyst: {
			title: "Analyst view",
			upside: "↑ 6.7% upside",
			rangeLabel: "PRICE TARGET RANGE",
			rangeFill: 180,
			rangeMarker: 173,
			low: ["Low", "$180"],
			avg: ["Avg", "$248"],
			high: ["High", "$300"],
			consensusLabel: "WALL ST. CONSENSUS · 42 ANALYSTS",
			consensusFill: 212,
			counts: ["● Buy 28", "Hold 12", "Sell 2"],
			recentLabel: "RECENT ACTIONS",
			actions: [
				{ firm: "Morgan Stanley", rating: "Buy", target: "$260" },
				{ firm: "Wedbush", rating: "Buy", target: "$285" },
				{ firm: "Goldman Sachs", rating: "Buy", target: "$256" },
				{ firm: "UBS", rating: "Hold", target: "$236" },
				{ firm: "Barclays", rating: "Hold", target: "$230" },
			],
		},
		compare: { title: "Compare and learn", sub: "vs MSFT · GOOGL" },
	},
};

/** The practice-buy ticket as the deck shows it for NVDA (Figma 2:3239). */
export const deckTicket = {
	symbol: "NVDA",
	name: "NVIDIA Corp.",
	initial: "N",
	price: "$122.10",
	changeShort: "▲ 2.4%",
	shares: "0.2048",
} as const;

export const ticketCopy = {
	body: "Your paper stake starts at today’s price and tracks the real move live, in either direction.",
	cashLabel: "Cash available",
	cash: "$8,800.00",
	amounts: ["$10", "$25", "$50", "$100", "Custom"],
	selected: 1,
	youGet: "You get",
	sharesOf: "shares of",
	confirm: "Confirm practice buy",
	back: "Back",
} as const;

import { N } from "./assets";

/** News listing (Figma 2:4359) and article detail (2:4453 / 2:4555) — copy verbatim. */
export type NewsCardData = { id: string; tag: string; title: string; source: string; thumb: string };

export const CHEVRON = "›";

export const newsListing = {
	title: "News",
	date: "Saturday, July 4",
	brief: {
		id: "dow-record-chips-slide",
		kicker: "TODAY’S BRIEF",
		title: "Dow closes at a record as chips slide",
		dek: "Wall Street split into the long weekend. The Dow hit an all time high while a memory chip rout pulled the Nasdaq down, and a soft jobs report eased the pressure on the...",
		read: "Read",
		source: "Bloomberg · 10h",
	},
	mood: { title: "Market Mood", subtitle: "Low volatility" },
	mini: {
		kicker: "MARKETS",
		title: "Fed minutes land Wednesday",
		body: "Wall Street split into the long weekend...",
		source: "Reuters · 2h",
	},
	forYou: {
		title: "For You",
		cards: [
			{ id: "nvidia-chip-rally", tag: "Tech", title: "Nvidia lags the chip rally it kicked off", source: "Reuters · 2d", thumb: N.thumbs.nvidia },
			{ id: "apple-foldable", tag: "Tech", title: "Apple climbs 5% on foldable iPhone push", source: "Bloomberg · 2d", thumb: N.thumbs.apple },
			{ id: "tesla-deliveries", tag: "Autos", title: "Tesla drops 7% even after beating deliveries", source: "CNBC · 2d", thumb: N.thumbs.tesla },
		] as NewsCardData[],
	},
	markets: {
		title: "Markets",
		cards: [
			{ id: "june-jobs-miss", tag: "Markets", title: "June jobs miss eases Fed hike bets", source: "Reuters · 2d", thumb: N.thumbs.jobs },
			{ id: "memory-chips-soar", tag: "Chips", title: "Memory chips soar as the AI trade rotates", source: "Bloomberg · 2d", thumb: N.thumbs.memory },
			{ id: "oil-slips-iran", tag: "Markets", title: "Oil slips after positive Iran talks", source: "Reuters · 3d", thumb: N.thumbs.oil },
		] as NewsCardData[],
	},
} as const;

/** The tag every card carried in the frame; shown only when the story's company is in the person's STAK. */
export const IN_YOUR_STAK = "In your STAK";

/** Which company each demo story is about (the macro stories have none). */
export const ARTICLE_TICKERS: Record<string, string> = {
	"nvidia-chip-rally": "NVDA",
	"apple-foldable": "AAPL",
	"tesla-deliveries": "TSLA",
	"memory-chips-soar": "MU",
	"dow-record-chips-slide": "",
};

export const SEARCH = {
	label: "Search news",
	placeholder: "Search news",
	close: "Close search",
	empty: (query: string) => (query.trim() ? `Nothing matches “${query.trim()}”.` : ""),
} as const;

export const article = {
	id: "apple-foldable",
	breadcrumb: "News  /  Article",
	category: "Tech & Ai",
	title: "Apple climbs 5% on foldable iPhone push",
	dek: "A bigger foldable order and the widest iPhone lineup in years sent Apple toward a record, and to within touching distance of Nvidia’s crown.",
	publisherInitial: "B",
	byline: "Bloomberg · Jul 2 · 3 min read",
	gistTitle: "The gist",
	gist: [
		"Apple rose about 5% on plans for its widest iPhone lineup yet.",
		"It raised foldable orders to 10 million units, a show of confidence.",
		"The stock sits about 4% from passing Nvidia as the most valuable company.",
	],
	paragraphs1: [
		"Apple had one of its best days in months on Thursday, climbing almost 5 percent after word got out that the company is planning its widest iPhone lineup in years. Nikkei Asia reported that Apple has asked suppliers to prepare at least five new models, and to lift output of its first foldable to around 10 million units, well above the seven to eight million it had penciled in.",
		"That last number is the tell. Companies do not quietly double down on a product they expect to flop, and the foldable, which the rumor mill has taken to calling the iPhone Ultra, is now expected to land between late 2026 and the first half of 2027. Traders read the order size as confidence and bought accordingly. Apple gained about 182 billion dollars in market value on the day, nearly enough on its own to paper over a sell-off tearing through chip stocks.",
	],
	quote: "Companies do not quietly double down on a product they expect to flop.",
	newToThis: {
		title: "New to this?",
		body: "A foldable phone opens out into a small tablet. For Apple it means a pricier device to sell, and a way to win back buyers who drifted to Samsung, which has offered foldables for years.",
	},
	paragraphs2: [
		"The rally leaves Apple roughly 4 percent shy of retaking the title of most valuable company in the world from Nvidia, a crown the two have passed back and forth all year. It also lets the stock shake off a rough June, when a rare mid-cycle price increase on Macs and iPads, blamed on climbing memory costs, sent shares lower and rattled investors who had grown used to Apple holding the line.",
		"The real verdict comes on July 30, when Apple reports fiscal third quarter results. Wall Street is penciling in revenue of around 108 billion dollars, but the number everyone will hunt for is any early read on how the new lineup, and its price tags, are actually selling.",
	],
	sourceLabel: "Source",
	sourceUrl: "https://www.bloomberg.com",
	savedToast: "Saved to My STAK",
	ticker: {
		initial: "A",
		name: "Apple Inc.",
		symbol: "AAPL",
		price: "$308.63",
		change: "+4.84% today",
		viewInStak: "View AAPL in My STAK",
	},
	keyStats: {
		title: "Key stats",
		rows: [
			[
				{ label: "Market cap", value: "$4.58T" },
				{ label: "P/E ratio", value: "34.2" },
			],
			[
				{ label: "Day range", value: "$301.20–$309.80" },
				{ label: "Volume", value: "82.4M" },
			],
			[
				{ label: "52-wk range", value: "$201.50–$317.40" },
				{ label: "Div yield", value: "0.42%" },
			],
		],
	},
	addToStak: "Add to STAK",
	chip: "Apple",
	readNext: {
		kicker: "READ NEXT",
		items: [
			{ id: "tesla-deliveries", source: "CNBC · 2d", title: "Tesla drops 7% even after beating deliveries" },
			{ id: "tesla-deliveries", source: "CNBC · 2d", title: "Tesla drops 7% even after beating deliveries" },
		],
	},
} as const;

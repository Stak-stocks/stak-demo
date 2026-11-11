/**
 * Stock detail content. The AAPL entry is the frames' copy (2:3457 … 2:4161, 2:4970 … 2:5402), verbatim: the page shows
 * it while it is the design itself (the untouched signed-out visitor, or a frame preview of the URL); after the first
 * action, and for accounts, AAPL is built like every other ticker, from the catalog and the live quote (see live.ts).
 */

export type StockStat = { label: string; value: string; note: string; good: boolean; outlined: boolean };
/**
 * A News signal card (2:3526). It opens what it stands for (coordinator decision D1): `story`, the id of one of the
 * site's own articles (/news/<id>), or `url`, a live headline's source page (a new tab). A third kind is the company's
 * explainer card (signal.ts SignalArticle, `explainer`), which opens the catalog's culturalContext in a sheet. A card
 * with none of these opens nothing (none today).
 */
export type StockArticle = { source: string; tone: string; text: string; story?: string; url?: string };

/**
 * One figure of the "Compare and learn" table (D8; the phones' CompareRow, android ui/discover/StockDetailScreen.kt:851-889):
 * `tone` colours a growth figure by its sign, green for a rise and red for a fall (coordinator ruling N14b; the phones
 * draw their Rev growth row green whatever the sign) and the label grey for one that prints as zero (N28c); a cell that
 * states no figure carries none.
 */
export type CompareCell = { text: string; tone?: "up" | "down" | "flat" };
/**
 * The open "Compare and learn" card's peer table (the phones' open card 1:2804, android CompareCard 780-850): a header
 * row naming the stock and its two peers, then P/E ratio, Rev growth, Profit margin and Market cap, one figure each.
 * The stock's own column is the first; `columns` and every row's `cells` line up.
 */
export type CompareTable = { columns: string[]; rows: { label: string; cells: CompareCell[] }[] };
export type AnalystView = {
	title: string;
	/** the line under the title, folded and open: the upside ("↑ 8.1% upside"); on a card without targets, its consensus */
	upside: string;
	/**
	 * Coverage with no price targets to draw (a company without a price, coordinator ruling N39a: 256 of the catalog while
	 * the STAK API is down): the one caption the open card draws in the range's place, instead of the range label, its bar,
	 * Low / Avg / High and the upside line, which are then not drawn (their fields hold no dollar figure); `upside` holds
	 * the folded card's consensus line and every recent action's `target` is empty. Absent on every card with targets.
	 */
	noTargets?: string;
	/**
	 * An index fund's card (coordinator ruling N43a: SPY and QQQ; live.ts `fundAnalyst`): analysts rate companies, not a
	 * fund. The open card draws `caption` (analysts rate the companies the fund tracks, not the fund itself), `label`, and
	 * the fund's largest companies, each a link to its own page with its consensus line; `upside` holds the folded line.
	 * Nothing else is drawn: no range, no consensus bar or counts, no firm. Absent on every company's card.
	 */
	fund?: { caption: string; label: string; companies: { symbol: string; name: string; consensus: string }[] };
	rangeLabel: string;
	/** px of the 328-wide rail track, as authored */
	rangeFill: number;
	rangeMarker: number;
	/**
	 * Where the average target stands between Low and High, 0 to 1: the "Avg" label stands under the end of the bar it
	 * names (N30.8e, the hunt's CH-03). Absent on Figma's own card, whose label is centred as the frame draws it.
	 */
	avgAt?: number;
	low: [string, string];
	avg: [string, string];
	high: [string, string];
	consensusLabel: string;
	consensusFill: number;
	counts: string[];
	recentLabel: string;
	/**
	 * `hug`: the row hugs its 16px label (34 tall) instead of the fixed 38, as the frames draw Goldman Sachs; `target` is
	 * empty on a card without targets (`noTargets`), whose rows show the firm and its rating only
	 */
	actions: { firm: string; rating: string; target: string; hug?: boolean }[];
	/**
	 * Figma's own text-box widths for the authored figures. Figma sizes a hug text box to its own measure of the
	 * glyphs, up to ~1.3px wider than Chrome's, and the right-anchored and spaced-out boxes of this card are placed
	 * by those widths; with them the figures land where the frames put them. Live coverage lays out on its own.
	 */
	boxes?: { cols: [number, number, number]; counts: [number, number, number]; rating: Record<string, number>; target: number };
};

/** Figma's text-box width of an authored badge label ("Matches you" 2:3494: 66), see `AnalystView.boxes`. */
export type BadgeBox = { badgeW?: number };

export type StockDetailData = {
	symbol: string;
	name: string;
	initial: string;
	ticker: string;
	price: string;
	/**
	 * The company has a price (a live or a demo quote). Without one the chart card says so in words and draws no range
	 * tabs, and Practice buy is refused (N30.8c; 256 catalog companies have none while the STAK API is down).
	 */
	priced: boolean;
	change: string;
	changeShort: string;
	shares: string;
	periods: string[];
	activePeriod: string;
	saveIntro: { unsaved: string; saved: string; delta: string; body: string };
	risk: { title: string; badge: string; low: string; high: string; markerLeft: number; note: string } & BadgeBox;
	/** `benchmarks` is the line the footer promises, hidden until a stat is tapped (Figma 2:3516 / 2:6364) */
	numbers: { title: string; stats: StockStat[]; footer: string; benchmarks?: string };
	news: { title: string; move: string; lines: string[]; articles: StockArticle[] };
	/** `refusal`: why Practice buy cannot be pressed (a company without a price), printed where the cash line stands */
	cta: { save: string; unsave: string; buy: string; cash: string; refusal?: string };
	/** null when nobody covers the name yet */
	analyst: AnalystView | null;
	/** the teaser (2:3562: title, "vs MSFT · GOOGL") and the table it opens into; null when there is nothing to compare */
	compare: { title: string; sub: string; table: CompareTable | null };
	/**
	 * The page is the design itself (the frames' own copy: the untouched signed-out visitor, or a frame preview): the chart
	 * keeps the frames' own line on the frames' range. Set by useStockDetail.
	 */
	design?: boolean;
};

export const stockDetails: Record<string, StockDetailData> = {
	AAPL: {
		symbol: "AAPL",
		name: "Apple Inc",
		initial: "A",
		ticker: "AAPL · Apple Inc",
		price: "$229.35",
		priced: true,
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
			badgeW: 66,
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
			benchmarks: "Benchmarks: P/E sector 28.0x · peers 33.5x. Growth sector 9.0% · peers 7.4%. Margin sector 11.0% · peers 21.2%.",
		},
		news: {
			title: "News signal",
			move: "▲ +0.8% at yesterday’s close",
			lines: ["Foldable iPhone reports point to a premium fall lineup.", "Q3 earnings land July 30."],
			// every card is Apple news, and the site's Apple story is "Apple climbs 5% on foldable iPhone push" (the subject of
			// the first two headlines: its article's "The rally leaves Apple roughly 4 percent shy..."): each card opens it (D1)
			articles: [
				{
					source: "Yahoo · 13h ago",
					tone: "Neutral",
					text: "The rally leaves Apple about 4 percent shy of the market-cap crown",
					story: "apple-foldable",
				},
				{
					source: "CNN · 1h ago",
					tone: "Neutral",
					text: "The rally leaves Apple about 4 percent shy of the market-cap crown",
					story: "apple-foldable",
				},
				{
					source: "Bloomberg · 2h ago",
					tone: "Positive",
					text: "Apple's market performance shows resilience amid economic fluctuations.",
					story: "apple-foldable",
				},
				{
					source: "Reuters · 30m ago",
					tone: "Negative",
					text: "Concerns grow over Apple's supply chain issues affecting future growth.",
					story: "apple-foldable",
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
				{ firm: "Goldman Sachs", rating: "Buy", target: "$256", hug: true },
				{ firm: "UBS", rating: "Hold", target: "$236" },
				{ firm: "Barclays", rating: "Hold", target: "$230" },
			],
			// 2:3681 / 2:3684 / 2:3687 ($180 28, $248 31, $300 32), 2:3693-5 (49, 38, 30), "Buy" 20 / "Hold" 24, targets 31
			boxes: { cols: [28, 31, 32], counts: [49, 38, 30], rating: { Buy: 20, Hold: 24 }, target: 31 },
		},
		/*
		 * The teaser (2:3562) and the table it opens into WHILE THE PAGE IS THE DESIGN ITSELF: the phone frame's open card
		 * (1:2804), cell for cell (its rows 1:2815-1:2834, read again on 2026-11-09). Coordinator ruling N33a: the untouched
		 * showcase repeats frames verbatim, an opened state included where a frame draws it (D7 over N23j). The frame's peer
		 * cells are its own rounded figures ("36x" and "$3.4T" for MSFT, "24x" and "29%" for GOOGL, beside the 37.5 / $3.8T
		 * and 24.1 / 29.5% of those companies' own pages): Figma's own, listed for the user. The Rev growth figures are the
		 * frame's green (each a rise: tone "up"). Past the showcase, and for every other company, the table is built from
		 * the one accessor of the four figures (fundamentals.ts, N23j; live.ts compareFor), so AAPL's own column still
		 * repeats this page's tiles (31.2, 6.1%, 24.3%) and each peer's column the tiles of that peer's own page.
		 */
		compare: {
			title: "Compare and learn",
			sub: "vs MSFT · GOOGL",
			table: {
				columns: ["AAPL", "MSFT", "GOOGL"],
				rows: [
					{ label: "P/E ratio", cells: [{ text: "31.2" }, { text: "36x" }, { text: "24x" }] },
					{ label: "Rev growth", cells: [{ text: "+6.1%", tone: "up" }, { text: "+15%", tone: "up" }, { text: "+12%", tone: "up" }] },
					{ label: "Profit margin", cells: [{ text: "24.3%" }, { text: "36%" }, { text: "29%" }] },
					{ label: "Market cap", cells: [{ text: "$3.5T" }, { text: "$3.4T" }, { text: "$2.3T" }] },
				],
			},
		},
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

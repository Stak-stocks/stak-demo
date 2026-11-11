/**
 * The phones' analyst coverage, ported for the stock page's "Analyst view" (coordinator decision D8, discover-stock #6):
 * android ui/discover/StockDetailScreen.kt DETAIL_FACTS (lines 1071-1858) authors 19 companies, mirrored entry for entry
 * by ios Discover/StockDetailView.swift (~928-1714); generated from both files (they agree on every figure, checked by
 * .claude/tools/make-it-real-2026-11-06/discover-stock/build/port/parse_facts.py). AAPL is Figma's own record (data.ts,
 * 2:3573) and is left out here. Each entry keeps the phones' figures as authored, with the phones' price they were
 * written against (`at`): the page rebases the targets on the company's demo price (live/demoQuotes.ts) so the range,
 * the average and every firm's target keep the phones' distance from the price (the phones' "↑ 17.9% upside" on NVDA
 * reads the same here), while the website's own quote places the price marker and states the upside.
 * `peers`: the pair the phones compare the company with, and `rows` their "Compare and learn" table for it (CompareCard,
 * StockDetailScreen.kt:780-889; DetailFacts.compareRows): P/E ratio, Rev growth, Profit margin and Market cap for the
 * company and its two peers, each figure as the phones print it ("52.8", "110x", "+62%", "n/m"). The phones flag the Rev
 * growth row green in every one of the nineteen tables whatever its figures' sign (DetailCompare green = true on that row
 * alone; the port checks it); the page colours that row by each figure's sign instead (coordinator ruling N14b). D8: the
 * phones' authored rows where they exist, the catalog otherwise.
 * `stats`: the phones' three "Numbers that matter" tiles for the company (DetailFacts.stats, DetailStat: label, value,
 * verdict, good, border; StockDetailScreen.kt:957, 1080-1084 ...): the page's tiles for these companies (coordinator
 * ruling N14a, "one page, one figure": each tile is the company's own figure in its `rows`, which the port checks, so a
 * page never shows two P/Es; the catalog stays the source for every other company).
 */
export type PhoneCoverage = {
	/** the phones' price the figures were authored at (their DetailFacts.price) */
	at: number;
	/** the price target range: low, average (the consensus target) and high */
	low: number;
	avg: number;
	high: number;
	/** WALL ST. CONSENSUS: the analysts rating Buy, Hold and Sell */
	buy: number;
	hold: number;
	sell: number;
	/** RECENT ACTIONS: firm, rating, price target */
	actions: readonly (readonly [string, "Buy" | "Hold" | "Sell", number])[];
	/**
	 * the phones' next-earnings line, in days ahead of today (`newsEarnings = "Next earnings land ${StakClock.daysAhead(n)}."`,
	 * StockDetailScreen.kt:1099, 1140 ...): the page prints the date from the clock (live/clock.ts daysAhead; N23n, N30.3b)
	 */
	earningsIn: number;
	peers: readonly [string, string];
	/** the tiles: label, figure, verdict, whether the verdict is green (the phones' `good`) and the tile outlined (`border`) */
	stats: readonly PhoneStat[];
	/** the table's rows: label, the company's figure, peer A's, peer B's */
	rows: readonly (readonly [string, string, string, string])[];
};

/** One "Numbers that matter" tile as the phones author it: label, figure, verdict, good, border. */
export type PhoneStat = readonly [label: string, value: string, verdict: string, good: boolean, border: boolean];

export const PHONE_COVERAGE: Readonly<Record<string, PhoneCoverage>> = {
	NVDA: { at: 122.1, low: 100, avg: 144, high: 200, buy: 55, hold: 7, sell: 1, actions: [["Morgan Stanley", "Buy", 152], ["BofA", "Buy", 150], ["Goldman Sachs", "Buy", 145], ["Citi", "Buy", 150], ["HSBC", "Hold", 120]], earningsIn: 54, peers: ["AMD", "TSM"], stats: [["P/E ratio", "52.8", "Rich", false, false], ["Revenue growth", "62%", "Explosive", true, true], ["Profit margin", "48.9%", "Strong", false, false]], rows: [["P/E ratio", "52.8", "110x", "28x"], ["Rev growth", "+62%", "+18%", "+33%"], ["Profit margin", "48.9%", "6.4%", "39%"], ["Market cap", "$3.0T", "$0.2T", "$1.0T"]] },
	GOOGL: { at: 178.9, low: 150, avg: 201, high: 240, buy: 40, hold: 8, sell: 0, actions: [["Morgan Stanley", "Buy", 210], ["JPMorgan", "Buy", 208], ["Goldman Sachs", "Buy", 205], ["Bernstein", "Hold", 185], ["Wells Fargo", "Hold", 182]], earningsIn: 18, peers: ["MSFT", "META"], stats: [["P/E ratio", "24.1", "Cheaper", true, true], ["Revenue growth", "12%", "Healthy", false, false], ["Profit margin", "29.5%", "Strong", false, false]], rows: [["P/E ratio", "24.1", "36x", "27x"], ["Rev growth", "+12%", "+15%", "+19%"], ["Profit margin", "29.5%", "36%", "34%"], ["Market cap", "$2.3T", "$3.4T", "$1.5T"]] },
	MSFT: { at: 438.2, low: 380, avg: 500, high: 560, buy: 48, hold: 6, sell: 1, actions: [["Morgan Stanley", "Buy", 520], ["Wedbush", "Buy", 550], ["Jefferies", "Buy", 505], ["Goldman Sachs", "Buy", 500], ["UBS", "Hold", 450]], earningsIn: 117, peers: ["AAPL", "GOOGL"], stats: [["P/E ratio", "37.5", "Rich", false, false], ["Revenue growth", "15%", "Healthy", false, false], ["Profit margin", "36%", "Excellent", true, true]], rows: [["P/E ratio", "37.5", "31x", "24x"], ["Rev growth", "+15%", "+6.1%", "+12%"], ["Profit margin", "36%", "24%", "29%"], ["Market cap", "$3.8T", "$3.5T", "$2.3T"]] },
	AMD: { at: 164.3, low: 130, avg: 190, high: 250, buy: 36, hold: 13, sell: 1, actions: [["Morgan Stanley", "Buy", 195], ["BofA", "Buy", 200], ["Jefferies", "Buy", 190], ["Goldman Sachs", "Hold", 170], ["Bernstein", "Hold", 160]], earningsIn: 123, peers: ["NVDA", "TSM"], stats: [["P/E ratio", "45.6", "Rich", false, false], ["Revenue growth", "18%", "Accelerating", true, true], ["Profit margin", "6.4%", "Thin", false, false]], rows: [["P/E ratio", "45.6", "53x", "28x"], ["Rev growth", "+18%", "+62%", "+33%"], ["Profit margin", "6.4%", "48.9%", "39%"], ["Market cap", "$302B", "$3.0T", "$1.0T"]] },
	JPM: { at: 245.6, low: 215, avg: 268, high: 300, buy: 15, hold: 10, sell: 1, actions: [["Morgan Stanley", "Buy", 275], ["Wells Fargo", "Buy", 290], ["Barclays", "Buy", 270], ["UBS", "Hold", 255], ["KBW", "Hold", 250]], earningsIn: 102, peers: ["BAC", "WFC"], stats: [["P/E ratio", "13.1", "Cheap", true, true], ["Revenue growth", "8%", "Steady", false, false], ["Profit margin", "34%", "Strong", false, false]], rows: [["P/E ratio", "13.1", "13x", "14x"], ["Rev growth", "+8%", "+6%", "+2%"], ["Profit margin", "34%", "26%", "24%"], ["Market cap", "$690B", "$350B", "$250B"]] },
	V: { at: 352.1, low: 320, avg: 385, high: 420, buy: 31, hold: 7, sell: 0, actions: [["Morgan Stanley", "Buy", 400], ["Goldman Sachs", "Buy", 395], ["BofA", "Buy", 390], ["Mizuho", "Hold", 360], ["Piper Sandler", "Hold", 355]], earningsIn: 116, peers: ["MA", "AXP"], stats: [["P/E ratio", "32.4", "In line", false, false], ["Revenue growth", "10%", "Healthy", false, false], ["Profit margin", "54%", "Exceptional", true, true]], rows: [["P/E ratio", "32.4", "36x", "20x"], ["Rev growth", "+10%", "+14%", "+9%"], ["Profit margin", "54%", "45%", "15%"], ["Market cap", "$706B", "$500B", "$220B"]] },
	GS: { at: 612.4, low: 540, avg: 650, high: 720, buy: 16, hold: 10, sell: 1, actions: [["Morgan Stanley", "Buy", 680], ["Wells Fargo", "Buy", 700], ["BofA", "Buy", 660], ["UBS", "Hold", 620], ["HSBC", "Hold", 600]], earningsIn: 103, peers: ["MS", "JPM"], stats: [["P/E ratio", "15.2", "Cheap", true, true], ["Revenue growth", "12%", "Healthy", false, false], ["Profit margin", "27%", "Strong", false, false]], rows: [["P/E ratio", "15.2", "16x", "13x"], ["Rev growth", "+12%", "+11%", "+8%"], ["Profit margin", "27%", "22%", "34%"], ["Market cap", "$189B", "$220B", "$690B"]] },
	ENPH: { at: 78.4, low: 55, avg: 88, high: 130, buy: 14, hold: 17, sell: 3, actions: [["Goldman Sachs", "Buy", 95], ["Jefferies", "Buy", 100], ["Morgan Stanley", "Hold", 80], ["Barclays", "Hold", 75], ["BofA", "Sell", 60]], earningsIn: 116, peers: ["SEDG", "FSLR"], stats: [["P/E ratio", "38.6", "Rich", false, false], ["Revenue growth", "22%", "Rebounding", true, true], ["Profit margin", "9.5%", "Thin", false, false]], rows: [["P/E ratio", "38.6", "n/m", "18x"], ["Rev growth", "+22%", "-14%", "+26%"], ["Profit margin", "9.5%", "n/m", "31%"], ["Market cap", "$10.3B", "$1.2B", "$24.5B"]] },
	NEE: { at: 84.2, low: 72, avg: 92, high: 105, buy: 15, hold: 7, sell: 0, actions: [["Morgan Stanley", "Buy", 95], ["Wells Fargo", "Buy", 94], ["BofA", "Buy", 92], ["UBS", "Hold", 85], ["Jefferies", "Hold", 84]], earningsIn: 111, peers: ["DUK", "SO"], stats: [["P/E ratio", "22.7", "In line", false, false], ["Revenue growth", "9%", "Steady", false, false], ["Profit margin", "24%", "Excellent", true, true]], rows: [["P/E ratio", "22.7", "19x", "20x"], ["Rev growth", "+9%", "+5%", "+7%"], ["Profit margin", "24%", "15%", "16%"], ["Market cap", "$173B", "$95B", "$100B"]] },
	FSLR: { at: 228.9, low: 180, avg: 270, high: 330, buy: 25, hold: 6, sell: 1, actions: [["Jefferies", "Buy", 290], ["Goldman Sachs", "Buy", 280], ["UBS", "Buy", 275], ["Morgan Stanley", "Buy", 265], ["BofA", "Hold", 230]], earningsIn: 118, peers: ["ENPH", "NEE"], stats: [["P/E ratio", "17.8", "Cheaper", true, true], ["Revenue growth", "26%", "Fast", false, false], ["Profit margin", "31%", "Strong", false, false]], rows: [["P/E ratio", "17.8", "39x", "23x"], ["Rev growth", "+26%", "+22%", "+9%"], ["Profit margin", "31%", "9.5%", "24%"], ["Market cap", "$24.5B", "$10.3B", "$173B"]] },
	PLD: { at: 118.3, low: 100, avg: 130, high: 150, buy: 17, hold: 7, sell: 0, actions: [["Morgan Stanley", "Buy", 135], ["BofA", "Buy", 132], ["Evercore ISI", "Buy", 130], ["Wells Fargo", "Hold", 120], ["Mizuho", "Hold", 118]], earningsIn: 103, peers: ["O", "AMT"], stats: [["P/E ratio", "27.9", "In line", false, false], ["Revenue growth", "9%", "Steady", false, false], ["Profit margin", "45%", "Excellent", true, true]], rows: [["P/E ratio", "27.9", "54x", "40x"], ["Rev growth", "+9%", "+14%", "+5%"], ["Profit margin", "45%", "17%", "25%"], ["Market cap", "$110B", "$53.2B", "$100B"]] },
	O: { at: 59.1, low: 54, avg: 63, high: 70, buy: 8, hold: 12, sell: 0, actions: [["Morgan Stanley", "Buy", 66], ["Stifel", "Buy", 65], ["RBC", "Hold", 62], ["Mizuho", "Hold", 61], ["Wells Fargo", "Hold", 60]], earningsIn: 122, peers: ["PLD", "SPG"], stats: [["P/E ratio", "54.3", "Rich", false, false], ["Revenue growth", "14%", "Healthy", true, true], ["Profit margin", "17%", "Modest", false, false]], rows: [["P/E ratio", "54.3", "28x", "22x"], ["Rev growth", "+14%", "+9%", "+4%"], ["Profit margin", "17%", "45%", "35%"], ["Market cap", "$53.2B", "$110B", "$60B"]] },
	LLY: { at: 792.5, low: 680, avg: 920, high: 1050, buy: 24, hold: 4, sell: 0, actions: [["Morgan Stanley", "Buy", 950], ["BofA", "Buy", 940], ["Goldman Sachs", "Buy", 920], ["JPMorgan", "Buy", 910], ["Bernstein", "Hold", 800]], earningsIn: 118, peers: ["NVO", "JNJ"], stats: [["P/E ratio", "63.4", "Rich", false, false], ["Revenue growth", "38%", "Explosive", true, true], ["Profit margin", "24%", "Strong", false, false]], rows: [["P/E ratio", "63.4", "15x", "17x"], ["Rev growth", "+38%", "+18%", "+5%"], ["Profit margin", "24%", "35%", "25%"], ["Market cap", "$752B", "$300B", "$391B"]] },
	UNH: { at: 318.7, low: 260, avg: 360, high: 440, buy: 17, hold: 8, sell: 1, actions: [["Morgan Stanley", "Buy", 380], ["Goldman Sachs", "Buy", 370], ["Barclays", "Buy", 365], ["Mizuho", "Hold", 330], ["Raymond James", "Hold", 320]], earningsIn: 102, peers: ["ELV", "CI"], stats: [["P/E ratio", "13.7", "Cheap", true, true], ["Revenue growth", "9%", "Steady", false, false], ["Profit margin", "4.2%", "Thin", false, false]], rows: [["P/E ratio", "13.7", "11x", "12x"], ["Rev growth", "+9%", "+7%", "+6%"], ["Profit margin", "4.2%", "3.0%", "3.6%"], ["Market cap", "$289B", "$70B", "$85B"]] },
	JNJ: { at: 162.4, low: 150, avg: 175, high: 190, buy: 12, hold: 13, sell: 0, actions: [["Morgan Stanley", "Buy", 180], ["Goldman Sachs", "Buy", 178], ["UBS", "Hold", 168], ["Wells Fargo", "Hold", 165], ["Barclays", "Hold", 160]], earningsIn: 102, peers: ["PFE", "LLY"], stats: [["P/E ratio", "16.9", "In line", false, false], ["Revenue growth", "5%", "Slower", false, false], ["Profit margin", "25%", "Excellent", true, true]], rows: [["P/E ratio", "16.9", "13x", "63x"], ["Rev growth", "+5%", "+2%", "+38%"], ["Profit margin", "25%", "13%", "24%"], ["Market cap", "$391B", "$144B", "$752B"]] },
	PFE: { at: 25.3, low: 23, avg: 28, high: 33, buy: 9, hold: 14, sell: 1, actions: [["BofA", "Buy", 30], ["Leerink Partners", "Buy", 29], ["Morgan Stanley", "Hold", 27], ["UBS", "Hold", 27], ["Goldman Sachs", "Hold", 26]], earningsIn: 123, peers: ["MRK", "JNJ"], stats: [["P/E ratio", "13.2", "Cheap", true, true], ["Revenue growth", "2%", "Flat", false, false], ["Profit margin", "13%", "Modest", false, false]], rows: [["P/E ratio", "13.2", "12x", "17x"], ["Rev growth", "+2%", "+3%", "+5%"], ["Profit margin", "13%", "27%", "25%"], ["Market cap", "$144B", "$210B", "$391B"]] },
	COST: { at: 947.2, low: 800, avg: 925, high: 1080, buy: 20, hold: 15, sell: 1, actions: [["BofA", "Buy", 1020], ["Morgan Stanley", "Buy", 1000], ["Jefferies", "Buy", 980], ["Wells Fargo", "Hold", 920], ["UBS", "Hold", 900]], earningsIn: 83, peers: ["WMT", "TGT"], stats: [["P/E ratio", "52.1", "Rich", false, false], ["Revenue growth", "8.1%", "Reliable", true, true], ["Profit margin", "2.9%", "Thin", false, false]], rows: [["P/E ratio", "52.1", "38x", "13x"], ["Rev growth", "+8.1%", "+5%", "-2%"], ["Profit margin", "2.9%", "2.9%", "3.7%"], ["Market cap", "$420B", "$800B", "$45B"]] },
	NKE: { at: 72.8, low: 55, avg: 80, high: 100, buy: 18, hold: 15, sell: 2, actions: [["Jefferies", "Buy", 90], ["Morgan Stanley", "Buy", 85], ["Goldman Sachs", "Buy", 82], ["UBS", "Hold", 70], ["Barclays", "Hold", 68]], earningsIn: 88, peers: ["LULU", "DECK"], stats: [["P/E ratio", "33.6", "Rich", false, false], ["Revenue growth", "1%", "Turning", true, true], ["Profit margin", "7.1%", "Thin", false, false]], rows: [["P/E ratio", "33.6", "15x", "18x"], ["Rev growth", "+1%", "+7%", "+16%"], ["Profit margin", "7.1%", "17%", "19%"], ["Market cap", "$108B", "$25B", "$17B"]] },
};

/** The phones' AAPL comparison pair (1:2804 "vs MSFT · GOOGL"), the same as Figma's teaser 2:3565. */
export const AAPL_PEERS = ["MSFT", "GOOGL"] as const;

/**
 * The phones' AAPL tiles (StockDetailScreen.kt:1080-1084): the figures of Figma's own tiles 2:3505-2:3515 (data.ts), so
 * AAPL's tiles read the same before and after the showcase (N14a).
 */
export const AAPL_STATS: readonly PhoneStat[] = [["P/E ratio", "31.2", "In line", false, false], ["Revenue growth", "6.1%", "Slower", false, false], ["Profit margin", "24.3%", "Excellent", true, true]];

/**
 * AAPL's own record, in the shape of the other eighteen: the figures of Figma's open Analyst card (2:3573: $180 / $248 /
 * $300, 42 analysts as Buy 28 · Hold 12 · Sell 2, the five recent actions; the phones author the same, StockDetailScreen.kt
 * 1072-1110) at the frames' price $229.35, Figma's tiles, and the phone frame's Compare rows (1:2810-1:2834). While the
 * page is the design itself the frames' own card is drawn (data.ts, pixel for pixel); once the showcase is over AAPL's
 * Analyst view is COMPUTED from these numbers like everyone else's (the hunt's NUM-08 and CH-02, rulings N23k and N30.8d:
 * the frame's "↑ 6.7% upside" stood beside $248 on $229.35, which is 8.1%, and its dot marked the average, not the price).
 */
export const AAPL_COVERAGE: PhoneCoverage = { at: 229.35, low: 180, avg: 248, high: 300, buy: 28, hold: 12, sell: 2, actions: [["Morgan Stanley", "Buy", 260], ["Wedbush", "Buy", 285], ["Goldman Sachs", "Buy", 256], ["UBS", "Hold", 236], ["Barclays", "Hold", 230]], earningsIn: 26, peers: AAPL_PEERS, stats: AAPL_STATS, rows: [["P/E ratio", "31.2", "36x", "24x"], ["Rev growth", "+6.1%", "+15%", "+12%"], ["Profit margin", "24.3%", "36%", "29%"], ["Market cap", "$3.5T", "$3.4T", "$2.3T"]] };

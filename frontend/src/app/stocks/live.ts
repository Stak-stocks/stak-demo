/**
 * Stock detail content for any catalog ticker: the catalog's financial snapshot, the live quote, the person's own save
 * and cash, analyst coverage and headlines from the STAK API when it is reachable, the phones' analyst coverage and the
 * site's own stories when it is not. AAPL keeps the frames' authored copy while the page is the design itself (the
 * untouched signed-out visitor, a frame preview); after that it is built like every other ticker.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import {
	ago,
	allTickers,
	arrowOrNone,
	betaOf,
	brandByTicker,
	changeLineOrFlat,
	changeShortOrFlat,
	collectionOf,
	dayLabel,
	daysAhead,
	daysAheadLong,
	demoQuote,
	hasPrice,
	isHistoryRange,
	isKnownTicker,
	isShowcase,
	money,
	normalizeTicker,
	pct1,
	primaryCategoryOf,
	quoteQuery,
	refusalLine,
	shares4,
	signedPctOrZero,
	SHOWCASE_CASH,
	tickersInCategories,
	toneOf,
	useApiHealthState,
	useLive,
	useMarketMove,
	usePriceHistory,
	useQuote,
	useTaste,
	type Quote,
} from "@/app/live";
import { type AnalystAction, type AnalystData, type EarningsSignal, getAnalystActions, getAnalystData, getCompanyNews } from "@/lib/api";
import { AAPL_COVERAGE, AAPL_PEERS, AAPL_STATS, PHONE_COVERAGE, type PhoneCoverage } from "./coverage";
import { type AnalystView, type CompareCell, type CompareTable, type StockDetailData, type StockStat, stockDetails } from "./data";
import { CENTS_UNDER, generatedCoverage } from "./demoCoverage";
import { fundamentalsOf, hasFundamentals, NO_FIGURE, peText, pctText, signedPctText } from "./fundamentals";
import { displayInitial, displayName, displayTickerLine } from "./names";
import { commentaryLine, earningsInFor, earningsLineFor, explainerCard, isFund, MAX_STORIES, NO_PRICE_MOVE, newsSignalFor, SIGNAL_TITLE } from "./signal";
import { signTone } from "./tone";

/** The rail's track is 328 px wide (360 − 2 × 16); fills and markers are authored in px of it. */
const RAIL_TRACK = 328;
/** The content column's risk track is 712 px wide (744 − 2 × 16). */
const RISK_TRACK = 712;
/** Both markers are 14 px squares placed by their left edge, so they travel the track minus their own width. */
const MARKER = 14;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
/** "$1,050": whole dollars with the thousands separator the phones print. */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** "$5.10": dollars and cents, for the targets of a card under `CENTS_UNDER` (N43b). */
const usd2 = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * A "Numbers that matter" tile for a company the phones do not author, in the phones' own vocabulary (coordinator ruling
 * N30.8a; the hunt's C-04 and VIS-03: the catalog's rule spoke a second vocabulary, "Pricey" beside the phones' "Rich",
 * "Healthy" for a margin where the phones use it for growth, a green word on a plain tile). Each band's word is the word
 * most of the nineteen authored tiles use for that band (coverage.ts `stats`; the cuts lie between neighbouring authored
 * figures), and a green word and the outline go together exactly as the authored tiles pair them (`good` and `border`
 * agree on every one of the 57):
 * - P/E: "Cheap" under 16 (13.1, 13.2, 13.7, 15.2: always green and outlined), "In line" to 33 (16.9 ... 32.4), "Rich"
 *   above (33.6 ... 63.4); zero or less is "Loss-making" (N28b);
 * - growth: "Shrinking" under zero (N28b), "Flat" under 3.5 (PFE 2%), "Slower" under 7 (5%, 6.1%), "Steady" under 10 (8%,
 *   9%), "Healthy" to 16.5 (10% ... 15%), "Fast" under 32 (FSLR 26%), "Explosive" above (38%, 62%: always green and
 *   outlined);
 * - margin: "Loss-making" under zero, "Thin" under 10 (2.9% ... 9.5%), "Modest" under 20 (13%, 17%), "Strong" from 20
 *   (six of the twelve authored margins from 24% up; the other six read "Excellent" / "Exceptional" in green, on the
 *   companies whose margin is their one highlighted figure: those pairs are the phones' own and are listed for the user).
 * The figure prints in the authored tiles' format (fundamentals.ts: "52.8", "62%", "8.1%").
 */
export function statFor(label: string, v: number | null, kind: "pe" | "growth" | "margin"): StockStat {
	if (v === null) return { label, value: NO_FIGURE, note: "No data", good: false, outlined: false };
	const tile = (value: string, note: string, highlight = false): StockStat => ({ label, value, note, good: highlight, outlined: highlight });
	if (kind === "pe") return v <= 0 ? tile(peText(v), "Loss-making") : v < 16 ? tile(peText(v), "Cheap", true) : tile(peText(v), v <= 33 ? "In line" : "Rich");
	if (kind === "growth") {
		if (v >= 32) return tile(pctText(v), "Explosive", true);
		return tile(pctText(v), v < 0 ? "Shrinking" : v < 3.5 ? "Flat" : v < 7 ? "Slower" : v < 10 ? "Steady" : v < 16.5 ? "Healthy" : "Fast");
	}
	return tile(pctText(v), v < 0 ? "Loss-making" : v < 10 ? "Thin" : v < 20 ? "Modest" : "Strong");
}

/**
 * The phones' "Numbers that matter" tiles for a company they author (coordinator ruling N14a, "one page, one figure"):
 * the eighteen ported records (coverage.ts `stats`, android ui/discover/StockDetailScreen.kt DetailFacts.stats, 957 and
 * 1122-1126 ...) and AAPL's, which are Figma's own tiles (2:3505-2:3515). Each tile is the company's own figure in its
 * Compare table (the generator checks it), so the page never states two P/Es; the verdict and its green, outlined tile
 * are the phones' ("Rich", "Explosive", ...). null for every other company: the catalog is its source (`statFor`).
 */
export function authoredStats(ticker: string): StockStat[] | null {
	const T = normalizeTicker(ticker);
	const stats = T === "AAPL" ? AAPL_STATS : PHONE_COVERAGE[T]?.stats;
	return stats ? stats.map(([label, value, note, good, outlined]) => ({ label, value, note, good, outlined })) : null;
}

/**
 * The three "Numbers that matter" tiles of a company (N14a, N23j): the phones' authored tiles for their nineteen
 * (`authoredStats`), otherwise the accessor's figures (fundamentals.ts) with the verdict each earns (`statFor`). The
 * Compare table's own column and the Benchmarks read the same accessor, so a page never states two P/Es.
 */
export function tilesFor(ticker: string): StockStat[] {
	const T = normalizeTicker(ticker);
	const f = fundamentalsOf(T);
	return authoredStats(T) ?? [statFor("P/E ratio", f?.pe ?? null, "pe"), statFor("Revenue growth", f?.growth ?? null, "growth"), statFor("Profit margin", f?.margin ?? null, "margin")];
}

export type Measure = "pe" | "growth" | "margin";

/**
 * How many companies must state a measure before their median is called the "sector" (the independent review r2b,
 * medium 2; the third clause of the hunt's C-04, "a word does not contradict the benchmark line under it"): AAPL past
 * the showcase read "P/E sector 115.0x ... Margin sector -13.5%" under a tile reading "31.2 In line", because its tag
 * category (consumer_tech) holds only Peloton and Duolingo; MSFT's "sector" was GOOGL alone, RIVN's "P/E sector 391.3x"
 * TSLA alone: 64 companies in all. One or two companies are not a sector.
 */
export const SECTOR_MIN = 3;

/** One figure of the Benchmarks line with the companies it is the median of. */
export type BenchmarkFigure = { value: number; from: string[] };
/** A measure's two figures: `group` names where the sector figure comes from (the tag category, or the collection). */
export type Benchmark = { sector: (BenchmarkFigure & { group: "category" | "collection" }) | null; peers: BenchmarkFigure | null };

/** The companies of a list that state a measure, with the median of their figures; null when none does. */
function medianOf(tickers: readonly string[], measure: Measure): BenchmarkFigure | null {
	const stated = tickers
		.map((t) => [t, fundamentalsOf(t)?.[measure] ?? null] as const)
		// a loss-making company has no meaningful P/E to average
		.filter((x): x is readonly [string, number] => x[1] !== null && (measure !== "pe" || x[1] > 0));
	if (!stated.length) return null;
	// medians, so one outlier (a 300x P/E, a 400% growth spurt) cannot drag a sector figure
	const values = stated.map((x) => x[1]).sort((a, b) => a - b);
	const mid = values.length >> 1;
	return { value: values.length % 2 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2, from: stated.map((x) => x[0]) };
}

/**
 * The figures behind a company's Benchmarks line, measure by measure, each with the companies it is the median of.
 * - "sector": ONE group for the whole line (coordinator, 2026-11-09, on round 3's open issue: with a fallback per measure
 *   RIVN's line took its P/E from the Consumer collection and its margin from the EV makers' category, two meanings of
 *   "sector" in one line). The group is the ticker's primary tag category or its collection (live/catalog.ts
 *   `collectionOf`: the six My STAK collections the frames draw), whichever gives a figure for MORE of the three measures
 *   (the category on a tie); a figure needs at least `SECTOR_MIN` companies stating that measure, and a measure the chosen
 *   group cannot state has no sector figure. "Other" is the collections' catch-all, not a sector: it never stands in.
 * - "peers": the SAME companies the Compare card names (`peersFor`; N23m, the hunt's NUM-16), printed only when EVERY one
 *   of them states the measure (RIVN's "peers 391.3x" was Tesla alone: one company is not "peers"), and left out where
 *   the companies that contribute are the very ones behind the sector figure (the two medians would repeat each other).
 * Every figure comes from the one accessor (fundamentals.ts, N23j), so a peer's figure here is the figure of its page.
 */
export function benchmarkFigures(ticker: string): Record<Measure, Benchmark> {
	const T = normalizeTicker(ticker);
	const others = allTickers().filter((t) => t !== T);
	const category = primaryCategoryOf(T);
	const collection = collectionOf(T);
	const inCategory = category ? others.filter((t) => primaryCategoryOf(t) === category) : [];
	const inCollection = collection === "other" ? [] : others.filter((t) => collectionOf(t) === collection);
	const peers = peersFor(T);
	const MEASURES: readonly Measure[] = ["pe", "growth", "margin"];
	const enough = (f: BenchmarkFigure | null) => (f && f.from.length >= SECTOR_MIN ? f : null);
	const groupFigures = (tickers: readonly string[]) => MEASURES.map((m) => enough(medianOf(tickers, m)));
	const stated = (figures: readonly (BenchmarkFigure | null)[]) => figures.filter(Boolean).length;
	const byCategory = groupFigures(inCategory);
	const byCollection = groupFigures(inCollection);
	// one group for the whole line: the one that states more of the three measures, the category on a tie
	const group: "category" | "collection" = stated(byCollection) > stated(byCategory) ? "collection" : "category";
	const chosen = group === "category" ? byCategory : byCollection;
	const figure = (measure: Measure): Benchmark => {
		const f = chosen[MEASURES.indexOf(measure)] ?? null;
		const sector: Benchmark["sector"] = f ? { ...f, group } : null;
		const median = medianOf(peers, measure);
		// "peers" is every company the Compare card names, or it is not printed
		const pair = median && median.from.length === peers.length ? median : null;
		const samePeople = !!sector && !!pair && pair.from.length === sector.from.length && pair.from.every((t) => sector.from.includes(t));
		return { sector, peers: samePeople ? null : pair };
	};
	return { pe: figure("pe"), growth: figure("growth"), margin: figure("margin") };
}

/**
 * The line the stat footer promises (Figma 2:3516's sentence: "Benchmarks: P/E sector 28.0x · peers 33.5x. Growth ..."),
 * printed from `benchmarkFigures`: a figure nobody states is left out of its sentence ("P/E peers 30.8x."), a sentence
 * with neither figure is left out of the line, and a company with no sentence at all has no line (undefined: its tiles
 * are plain and the footer that promises the line is not drawn, StatGrid).
 */
export function benchmarksFor(ticker: string): string | undefined {
	const figures = benchmarkFigures(ticker);
	const part = (label: string, measure: Measure, fmt: (v: number) => string) => {
		const { sector, peers } = figures[measure];
		if (!sector && !peers) return null;
		return `${label} ${[sector ? `sector ${fmt(sector.value)}` : null, peers ? `peers ${fmt(peers.value)}` : null].filter(Boolean).join(" · ")}.`;
	};
	const parts = [
		part("P/E", "pe", (v) => `${v.toFixed(1)}x`),
		part("Growth", "growth", (v) => `${v.toFixed(1)}%`),
		part("Margin", "margin", (v) => `${v.toFixed(1)}%`),
	].filter((x): x is string => x !== null);
	return parts.length ? `Benchmarks: ${parts.join(" ")}` : undefined;
}

/** Risk fit from beta against the person's risk style band. */
function riskFor(ticker: string, riskShort: string) {
	const beta = betaOf(ticker);
	const band: [number, number] = riskShort === "Growth" ? [0.9, 1.6] : riskShort === "Balanced" ? [0.6, 1.3] : [0, 1.0];
	if (beta === null) {
		return { title: "Risk fit", badge: "Not rated", low: "Low", high: "High", markerLeft: (RISK_TRACK - MARKER) / 2, note: "No volatility data yet. Treat it as a middle-of-the-road name." };
	}
	const markerLeft = Math.round(clamp(beta / 2, 0, 1) * (RISK_TRACK - MARKER));
	const badge = beta < band[0] ? "Steadier than you" : beta > band[1] ? "Riskier than you" : "Matches you";
	const note =
		beta < 0.8
			? "Low volatility. Moves less than the market on most days."
			: beta <= 1.2
				? "Moves with the market. Expect the index’s good and bad days."
				: beta <= 1.6
					? "Above-average swings. Earnings days move it most."
					: "High volatility. Small stakes keep the swings easy to live with.";
	return { title: "Risk fit", badge, low: "Low", high: "High", markerLeft, note };
}

/**
 * "↑ 8.1% upside" / "↓ 2.3% downside": the average target against the price. A target that prints level with the price
 * ("0.0%") is neither: no arrow, the label grey (N23c).
 */
export function upsideLine(upside: number): string {
	const tone = toneOf(upside, 1);
	return tone === "flat" ? `${pct1(0)} upside` : `${tone === "up" ? "↑" : "↓"} ${pct1(upside)} ${tone === "up" ? "upside" : "downside"}`;
}

/** The phones' authored record of a company (their nineteen, AAPL's being Figma's own figures), or undefined. */
const coverageOf = (T: string): PhoneCoverage | undefined => (T === "AAPL" ? AAPL_COVERAGE : PHONE_COVERAGE[T]);

/**
 * A company's next-earnings line, dated from the clock (N23n, N30.3b, N39c; live/clock.ts): "Next earnings land Dec 5."
 * The phones' own day for their nineteen (android StockDetailScreen.kt:1099, 1140 ...: `StakClock.daysAhead(n)`), a
 * deterministic day for every other company (signal.ts `earningsInFor`); null for an index fund, which reports none.
 */
export function nextEarningsLine(ticker: string, now: number = Date.now()): string | null {
	const days = earningsInFor(ticker);
	return days === null ? null : `Next earnings land ${daysAhead(days, now)}.`;
}

/**
 * The design's own earnings line (Figma 2:3522 "Q3 earnings land July 30."), dated from the clock like the phones' line:
 * on the frames' Saturday, July 4 it prints the frame's own date; on any other day the date the same 26 days ahead.
 */
export const designEarningsLine = (now: number = Date.now()): string => `Q3 earnings land ${daysAheadLong(AAPL_COVERAGE.earningsIn, now)}.`;

/**
 * The caption a card without price targets draws in the range's place (coordinator ruling N39a: a company without a
 * price, 256 of the catalog's 333 while the STAK API is down): in the voice of the page's other no-price lines, the chart
 * header's "No price right now" (PerformanceChart.tsx NO_PRICE) and the Analyst card's own "No analyst coverage yet".
 */
export const NO_TARGETS = "No price right now to set targets against";

/**
 * The folded line of a card without price targets, where a priced card states its upside (N39a): the rating most of the
 * analysts give and how many give it ("Consensus Buy · 18 of 26 analysts"); Hold where Hold ties for the most, and a
 * split where Buy and Sell tie above Hold (no generated split can, see demoCoverage.ts rule 3; a live one might).
 */
export function consensusLine(buy: number, hold: number, sell: number): string {
	const total = buy + hold + sell;
	const most = Math.max(buy, hold, sell);
	if (hold === most) return `Consensus Hold · ${hold} of ${total} analysts`;
	if (buy === most && sell === most) return `Split · Buy ${buy}, Sell ${sell} of ${total} analysts`;
	return buy === most ? `Consensus Buy · ${buy} of ${total} analysts` : `Consensus Sell · ${sell} of ${total} analysts`;
}

/**
 * The Analyst card from coverage in the API's shape. Every figure and every bar is computed from the targets AS PRINTED
 * (whole dollars) and the price (the hunt's NUM-08 / NUM-12, ruling N23k: the upside was computed from the unrounded
 * rebased target, so "Avg $226 ... ↑ 9.1% upside" stood on a $206.80 price where $226 gives 9.3%; eleven of the eighteen
 * rebased companies differed in the first decimal): the upside is (Avg - price) / price, the range bar ends at Avg's
 * share of Low..High, the dot stands at the price's share, the consensus bar is Buy over all analysts.
 *
 * Coverage with no targets for a company WITHOUT a price (N39a: the demo coverage of the 256 unpriced companies) is the
 * same card without the dollar parts: `noTargets` holds the caption the open card draws in the range's place, the folded
 * line is the consensus (`consensusLine`), the recent actions carry their ratings and no target. A priced company with no
 * targets has no card (null: "No analyst coverage yet"), as before.
 *
 * Under a $20 price (`CENTS_UNDER`, coordinator ruling N43b) the targets print with cents ("$4.20 / $5.10 / $6.50") and
 * every figure is computed from them as printed; at $20 and up they print in whole dollars (the phones' nineteen and
 * Figma's AAPL, all priced over $20, keep their whole dollars).
 */
export function analystFrom(data: AnalystData | undefined, actions: AnalystAction[] | undefined, price: number | null): AnalystView | null {
	const pt = data?.priceTarget;
	const rec = data?.recommendation;
	const buy = (rec?.strongBuy ?? 0) + (rec?.buy ?? 0);
	const hold = rec?.hold ?? 0;
	const sell = (rec?.sell ?? 0) + (rec?.strongSell ?? 0);
	const total = buy + hold + sell;
	const toRating = (a: string) => (/buy|outperform|overweight|positive/i.test(a) ? "Buy" : /sell|underperform|underweight|negative/i.test(a) ? "Sell" : "Hold");
	if (!pt || pt.low == null || pt.high == null || pt.avg == null) {
		if (price !== null || total <= 0) return null;
		return {
			title: "Analyst view",
			upside: consensusLine(buy, hold, sell),
			noTargets: NO_TARGETS,
			// not drawn while `noTargets` stands: no range, no dollar figure
			rangeLabel: "PRICE TARGET RANGE",
			rangeFill: 0,
			rangeMarker: 0,
			low: ["Low", NO_FIGURE],
			avg: ["Avg", NO_FIGURE],
			high: ["High", NO_FIGURE],
			consensusLabel: `WALL ST. CONSENSUS · ${total} ANALYSTS`,
			consensusFill: Math.round((buy / total) * RAIL_TRACK),
			counts: [`● Buy ${buy}`, `Hold ${hold}`, `Sell ${sell}`],
			recentLabel: "RECENT ACTIONS",
			actions: (actions ?? []).slice(0, 5).map((a) => ({ firm: a.firm, rating: toRating(a.action), target: "" })),
		};
	}
	// the figures as the card prints them: cents under `CENTS_UNDER`, whole dollars otherwise
	const cents = price !== null && price > 0 && price < CENTS_UNDER;
	const printed = (n: number) => (cents ? Math.round(n * 100) / 100 : Math.round(n));
	const usd = (n: number) => (cents ? usd2(printed(n)) : usd0(n));
	const low = printed(pt.low);
	const avg = printed(pt.avg);
	const high = printed(pt.high);
	if (!(high > low)) return null;
	const span = high - low;
	const upside = price ? ((avg - price) / price) * 100 : null;
	const avgAt = clamp((avg - low) / span, 0, 1);
	return {
		title: "Analyst view",
		upside: upside === null ? "Target range published" : upsideLine(upside),
		rangeLabel: "PRICE TARGET RANGE",
		rangeFill: Math.round(avgAt * RAIL_TRACK),
		rangeMarker: Math.round(clamp(((price ?? avg) - low) / span, 0, 1) * (RAIL_TRACK - MARKER)),
		avgAt,
		low: ["Low", usd(low)],
		avg: ["Avg", usd(avg)],
		high: ["High", usd(high)],
		consensusLabel: total > 0 ? `WALL ST. CONSENSUS · ${total} ANALYSTS` : "WALL ST. CONSENSUS",
		consensusFill: total > 0 ? Math.round((buy / total) * RAIL_TRACK) : 0,
		counts: [`● Buy ${buy}`, `Hold ${hold}`, `Sell ${sell}`],
		recentLabel: "RECENT ACTIONS",
		actions: (actions ?? []).slice(0, 5).map((a) => ({ firm: a.firm, rating: toRating(a.action), target: a.priceTarget != null ? usd(a.priceTarget) : "—" })),
	};
}

/** An index fund's folded Analyst line (N43a): what its card is about, in the label grey (it states no figure). */
export const FUND_FOLDED = "Analysts rate the companies it tracks";
/**
 * The label over the fund's companies, in the card's label style ("RECENT ACTIONS", "WALL ST. CONSENSUS"). It claims no
 * rank: the companies are the catalog's peerTickers (N43a's source), which are not the index's largest weights (QQQ lists
 * Meta, not Amazon, while its own explainer on the same page names Amazon among Apple, Microsoft and NVIDIA: the every-stock
 * final review's medium, which read 'LARGEST COMPANIES IT TRACKS' as a ranking the catalog does not hold).
 */
export const FUND_LABEL = "COMPANIES IT TRACKS";
/** The open fund card's caption, in the style of the card's other captions ("No price right now to set targets against"). */
export const fundCaption = (ticker: string) => `Analysts rate the companies ${normalizeTicker(ticker)} tracks, not the fund itself.`;

/** A company's consensus line from the same demo coverage its own page shows (`demoCoverage`), or null where it has none. */
function consensusOf(ticker: string): string | null {
	const rec = demoCoverage(ticker)?.data.recommendation;
	if (!rec) return null;
	const buy = rec.strongBuy + rec.buy;
	const sell = rec.sell + rec.strongSell;
	return buy + rec.hold + sell > 0 ? consensusLine(buy, rec.hold, sell) : null;
}

/**
 * THE ANALYST VIEW OF AN INDEX FUND (coordinator ruling N43a: SPY and QQQ, the tag table's etf_index). Analysts rate
 * companies, not an index fund: a consensus and named firms rating the fund were not true, and they contradicted the same
 * page's News signal ("Tracks index, not a company."; "No earnings day of its own: the companies it tracks report
 * theirs."). The card still opens (every stock page has the dropdown) into an honest one in the frames' caption style:
 * one line saying analysts rate the companies the fund tracks, not the fund itself, then companies it tracks from the
 * catalog (its peerTickers that are companies: shared/src/peerGroups.ts lists SPY's as QQQ, NVDA, AAPL, MSFT, AMZN and
 * QQQ's as SPY, NVDA, AAPL, MSFT, META; under `FUND_LABEL`, which claims no rank, since that list is not the index's
 * order), each a link to its own page with its consensus line, the same counts its own card shows ("Consensus Buy · 55
 * of 63 analysts" for NVDA). No rating, no target, no firm for the fund itself.
 * null for a company that is not a fund.
 */
export function fundAnalyst(ticker: string): AnalystView | null {
	const T = normalizeTicker(ticker);
	if (!isFund(T)) return null;
	const companies = (brandByTicker(T)?.peerTickers ?? [])
		.map(normalizeTicker)
		.filter((t, i, all) => t !== T && all.indexOf(t) === i && isKnownTicker(t) && !isFund(t))
		.flatMap((t) => {
			const consensus = consensusOf(t);
			return consensus ? [{ symbol: t, name: displayName(t), consensus }] : [];
		});
	return {
		title: "Analyst view",
		upside: FUND_FOLDED,
		fund: { caption: fundCaption(T), label: FUND_LABEL, companies },
		// not drawn on a fund's card (`fund`): no range, no consensus, no firm
		rangeLabel: "",
		rangeFill: 0,
		rangeMarker: 0,
		low: ["Low", NO_FIGURE],
		avg: ["Avg", NO_FIGURE],
		high: ["High", NO_FIGURE],
		consensusLabel: "",
		consensusFill: 0,
		counts: [],
		recentLabel: "",
		actions: [],
	};
}

/**
 * The demo coverage of a company in the API's own shape, for `analystFrom` (coordinator rulings D8 and N39a: every catalog
 * company has an Analyst view):
 * - the phones' nineteen (coverage.ts, discover-stock #6; AAPL's record is Figma's own card, N30.8d): the figures as the
 *   phones author them, rebased from the phones' price onto the company's demo price, so the target range, the average
 *   and each firm's target keep their authored distance from the price (NVDA, GOOGL, MSFT, AMD and AAPL are priced alike
 *   on both and keep the phones' figures exactly);
 * - every other catalog company: the coverage generated from its own figures (demoCoverage.ts: analysts by market cap,
 *   the split from growth, margin, P/E and beta, the range around the demo price from the consensus, the growth and the
 *   beta, five recent actions by the phones' firms), seeded by the ticker: one company, one card, every visit.
 * A company without a demo price gets no targets (the consensus and the ratings alone, N39a). The card prints
 * whole-dollar targets (cents under $20, N43b) and computes from them (`analystFrom`). null for a ticker the catalog does
 * not list, and for an index fund: analysts rate companies, not a fund (N43a: its card is `fundAnalyst`).
 */
export function demoCoverage(ticker: string): { data: AnalystData; actions: AnalystAction[] } | null {
	const T = normalizeTicker(ticker);
	if (isFund(T)) return null;
	const price = demoQuote(T)?.price ?? null;
	const c = coverageOf(T);
	if (!c) return generatedCoverage(T, price);
	const recommendation = { strongBuy: 0, buy: c.buy, hold: c.hold, sell: c.sell, strongSell: 0, period: null };
	if (price === null) return { data: { priceTarget: null, recommendation }, actions: c.actions.map(([firm, rating]) => ({ firm, action: rating, priceTarget: null })) };
	const k = price / c.at;
	return {
		data: { priceTarget: { low: c.low * k, avg: c.avg * k, high: c.high * k }, recommendation },
		actions: c.actions.map(([firm, rating, target]) => ({ firm, action: rating, priceTarget: target * k })),
	};
}

/** A company's market cap in dollars (the one accessor's, fundamentals.ts); null where nobody states it. */
const capOf = (ticker: string): number | null => fundamentalsOf(ticker)?.cap ?? null;

/** A company the table can draw a column for: at least one of its four figures is stated. */
const hasFigures = hasFundamentals;

/**
 * The companies of a stock's own sector that the table can compare it with, nearest in size first (the rule the shared
 * catalog itself derives a company's peers by: same primary category, closest market cap, shared/src/peerGroups.ts
 * getPeerTickers). The sector is the tag table's primary category of the company: under its ticker, or under its brand id
 * where the table lists it by its home ticker (L'Oréal is "OR" there, the brand "or" / LRLCY: beauty, with Nike and Estée
 * Lauder nearest). A company the tag table does not list at all (Virgin Galactic) takes the companies that share the
 * most of its catalog interest categories (its `interestCategories`: "tech" and "travel", as Joby and Archer). Empty
 * when the catalog knows nothing to group the company by.
 */
export function sectorPeers(ticker: string): string[] {
	const T = normalizeTicker(ticker);
	const brand = brandByTicker(T);
	const category = primaryCategoryOf(T) || (brand ? primaryCategoryOf(brand.id) : "");
	const interests = new Set(category ? [] : (brand?.interestCategories ?? []));
	const shared = (t: string) => (interests.size ? (brandByTicker(t)?.interestCategories ?? []).filter((c) => interests.has(c)).length : 0);
	const pool = category ? tickersInCategories([category]) : interests.size ? allTickers().filter((t) => shared(t) > 0) : [];
	const cap = capOf(T);
	const distance = (t: string) => {
		const c = capOf(t);
		return cap === null || c === null ? Number.POSITIVE_INFINITY : Math.abs(c - cap);
	};
	return [...new Set(pool)]
		.filter((t) => t !== T && hasFigures(t))
		.sort((x, y) => shared(y) - shared(x) || distance(x) - distance(y) || x.localeCompare(y));
}

/**
 * The two companies a stock is compared with (D8): the phones' pair where they author its table (AAPL's MSFT · GOOGL,
 * NVDA's AMD · TSM, ENPH's SEDG · FSLR ...: the rows are written for exactly those two, so the pair stays even where the
 * catalog lacks one of them), otherwise the first two of the catalog's own peer list that it carries. Where that list
 * names fewer than two (LRLCY and SPCE have none: the tag table misses them under their tickers), the pair is filled
 * from the stock's own sector (`sectorPeers`), so every catalog company has a table to open (discover-stock review 1,
 * coordinator ruling N17e; the catalog-wide probe is discover-stock/fix1/probes/probe_catalog.js). The teaser's
 * "vs A · B" names the same pair as the table it opens into.
 */
export function peersFor(ticker: string): string[] {
	const T = normalizeTicker(ticker);
	const phones = T === "AAPL" ? AAPL_PEERS : PHONE_COVERAGE[T]?.peers;
	if (phones) return [...phones];
	const out: string[] = [];
	const take = (candidates: readonly string[]) => {
		for (const t of candidates.map(normalizeTicker)) {
			if (out.length === 2) break;
			if (t !== T && !out.includes(t) && isKnownTicker(t)) out.push(t);
		}
	};
	take(brandByTicker(T)?.peerTickers ?? []);
	if (out.length < 2) take(sectorPeers(T));
	return out;
}

/** The growth row of the table: its figures are coloured by their sign (coordinator ruling N14b). */
const GROWTH_ROW = "Rev growth";

/**
 * A growth figure's colour, by its sign: green for a rise, the frames' red for a fall, the label grey for a figure that
 * prints as zero (N28c: zero is #819abb everywhere, the Compare table included); a cell that states no figure ("—")
 * carries none and keeps the plain figure colour. The phones draw the whole row green whatever the sign (DetailCompare
 * green = true, android ui/discover/StockDetailScreen.kt:960: SEDG's "-14%" and TGT's "-2%" read green there), which the
 * coordinator reports as a phone bug rather than a behaviour to copy.
 */
export function growthTone(text: string): CompareCell["tone"] {
	// the one sign rule of the area's figures (tone.ts, N20c)
	return /\d/.test(text) ? signTone(text) : undefined;
}

/**
 * The "Compare and learn" table of a company with its pair (D8), every figure from the ONE accessor (fundamentals.ts;
 * N23j, the hunt's NUM-05: 97 peer cells differed from the peer's own page, because the phones' authored rows carry the
 * phones' own rounded copies of their peers: "110x" for AMD in NVDA's table beside 45.6 on AMD's page, "$3.4T" for MSFT
 * in AAPL's beside $3.8T). So the stock's own column repeats its "Numbers that matter" tiles and each peer's column the
 * tiles of that peer's own page. One format per measure in every column (N23m: the own column read "38.6" beside peers
 * "18x", a missing figure "n/m" in one table and "—" in another): the P/E as the tile prints it, growth signed ("+62%",
 * "-14%", "0%") and coloured by sign (N14b, N28c), the margin, the cap; a figure nobody states is "—".
 */
export function compareTableFor(ticker: string, peers: readonly string[]): CompareTable {
	const cols = [normalizeTicker(ticker), ...peers.map(normalizeTicker)];
	const figures = cols.map((t) => fundamentalsOf(t));
	const plain = (pick: (i: number) => string | undefined) => (i: number): CompareCell => ({ text: pick(i) ?? NO_FIGURE });
	const growth = (i: number): CompareCell => {
		const text = signedPctText(figures[i]?.growth ?? null);
		const tone = growthTone(text);
		return tone ? { text, tone } : { text };
	};
	const row = (label: string, cell: (i: number) => CompareCell) => ({ label, cells: cols.map((_, i) => cell(i)) });
	return {
		columns: cols,
		rows: [
			row("P/E ratio", plain((i) => figures[i]?.text.pe)),
			row(GROWTH_ROW, growth),
			row("Profit margin", plain((i) => figures[i]?.text.margin)),
			row("Market cap", plain((i) => figures[i]?.text.cap)),
		],
	};
}

/**
 * The teaser line naming the pair: "vs MSFT · GOOGL". A company with nobody to compare with says so, as the Analyst card
 * says "No analyst coverage yet", and its card draws no caret (CompareCard: nothing that looks like it opens stays shut);
 * no catalog company is in that state today (every one has a pair, see `peersFor`).
 */
export const compareSub = (peers: readonly string[]) => (peers.length ? `vs ${peers.join(" · ")}` : "No peers to compare yet");

/**
 * The "Compare and learn" card of a company (D8): the teaser's pair line (the phones' pair where they author one, the
 * catalog's otherwise: `peersFor`) and the table it opens into, whose every figure is the accessor's, like the "Numbers
 * that matter" tiles above it and the Benchmarks line (N14a, N23j). The one table that is not built here is the design's
 * own: while the page is the untouched showcase's AAPL (or a frame preview of it) the card opens into the phone frame's
 * table, cell for cell (data.ts, 1:2804; ruling N33a: D7 over N23j); AAPL past the showcase is built here like the rest.
 */
export function compareFor(ticker: string): { sub: string; table: CompareTable | null } {
	const T = normalizeTicker(ticker);
	const peers = peersFor(T);
	return { sub: compareSub(peers), table: peers.length ? compareTableFor(T, peers) : null };
}

/**
 * The News signal of a company from what the site carries (D1, discover-stock #3 / #4, ruling N39c; the rules are
 * signal.ts): its own stories, its sector's and the market-wide ones, each a card that opens its article, then its
 * explainer card; line one its own story's first point or the catalog's commentary, line two its next-earnings line
 * from the clock (Figma's AAPL card pairs a headline line with the earnings line, 2:3521 / 2:3522, as the phones do);
 * and the day's move, or the no-price line where `move` is "" (no quote). Every catalog company has one.
 */
export function siteNews(ticker: string, move: string, now: number = Date.now()): StockDetailData["news"] {
	return newsSignalFor(ticker, move, now);
}

/**
 * The API's earnings signal as the card's second line (discover-stock #4): the phones print "Next earnings land <date>"
 * (android StockDetailScreen.kt:1099); a reported quarter says how it went. null when the API has no date.
 */
export function earningsLine(signal: EarningsSignal | null | undefined): string | null {
	if (!signal?.date || signal.status === "none") return null;
	const d = new Date(`${signal.date.slice(0, 10)}T00:00:00`);
	if (Number.isNaN(d.getTime())) return null;
	const day = dayLabel(d.getTime());
	if (signal.status === "upcoming") return `Next earnings land ${day}.`;
	return signal.status === "beat" ? `Earnings beat estimates on ${day}.` : `Earnings missed estimates on ${day}.`;
}

/**
 * How far from the market's own move a stock still reads as "moving roughly with the market", in points: the frame's own
 * sentence is the measure (2:3482: "up 4.6% since, moving roughly with the market" beside a market up 3.2% over the same
 * weeks, live/history.ts DEMO_MARKET: 1.4 points apart).
 */
export const WITH_THE_MARKET = 2;

/**
 * "SINCE YOU SAVED" for the person's own save (discover-stock #12): the move since the save price and its age. A price
 * that has not moved yet (a save of today, or a demo price that never moves) says so, as the phones do ("Saved today.
 * NVDA hasn't moved since you saved it", android StockDetailScreen.kt:910), rather than claiming a 0.0 % move "with the
 * market"; a save made without a price starts tracking from today's, or once there is one.
 *
 * `market`: the market's move over the same days, in % (live/history.ts useMarketMove(savedAt), the figure the pick
 * page's "vs the market" uses). The sentence's market claim is decided AGAINST it (the hunt's NUM-13, ruling N23l: it was
 * decided by the stock's own move, so "down 2.2% since, moving roughly with the market" stood beside a market up 3.2%):
 * within `WITH_THE_MARKET` points of it the stock moves roughly with the market, above it runs ahead, below it lags.
 */
export function sinceSaved(
	T: string,
	entry: { savedAt: number; priceAtSave: number | null },
	price: number | null,
	now: number = Date.now(),
	market = 0,
): { delta: string; body: string } {
	const since = entry.priceAtSave && price ? ((price - entry.priceAtSave) / entry.priceAtSave) * 100 : null;
	const when = `Saved ${ago(entry.savedAt, now)}.`;
	if (since === null) return { delta: "", body: price ? `${when} ${T} started tracking from today’s price.` : `${when} ${T} starts tracking once it has a price.` };
	// a move that prints as 0.0 % is no move: no sign, the label grey (N23c)
	if (toneOf(since, 1) === "flat") return { delta: signedPctOrZero(0), body: `${when} ${T} hasn’t moved since you saved it; check back after a few sessions.` };
	const ahead = since - (Number.isFinite(market) ? market : 0);
	const pace = Math.abs(ahead) < WITH_THE_MARKET ? "moving roughly with the market" : ahead > 0 ? "running ahead of the market" : "lagging the market";
	return { delta: signedPctOrZero(since), body: `${when} ${T} is ${since < 0 ? "down" : "up"} ${pct1(since)} since, ${pace}.` };
}

/** The frame line's closing remark (2:3482), written for a steady company. */
const STEADY_REMARK = " Steady giants tend to.";

/**
 * "SINCE YOU SAVED" for a frame-only save: the saved look with no save behind it. The showcase's AI & Tech collection
 * (2:4830) lists NVDA, AAPL and GOOGL, which the persona never saved, and its cards open their stock pages saved
 * (?saved=1&from=my-stak): the page then read "SINCE YOU SAVED" with no figure over the unsaved body "Save it and this card
 * starts tracking ..." (discover-stock review 1, coordinator ruling N17e). While the showcase lasts it is the phones' demo
 * line with the stock's own symbol and the frames' figures: the demo persona reads "+4.6%" / "Saved 5 weeks ago. NVDA is
 * up 4.6% since, moving roughly with the market." on every stock it opens saved (android
 * ui/discover/StockDetailScreen.kt:908, ios Discover/StockDetailView.swift:682; the copy is Figma's 2:3891 with the
 * symbol swapped, data.ts). The line's closing remark, "Steady giants tend to.", is written for a steady company: it is
 * kept only where the company's risk class is low (a beta under 1); for every other company the line ends at "... with
 * the market." (coordinator ruling N28a: NVDA must not read it two cards above "High volatility"). Once the showcase is
 * over the same look can only be asked for by its URL: it reads the phones' line for a save with no recorded day
 * (android :910, ios :686).
 */
export function frameSaveIntro(T: string, showcase: boolean): { delta: string; body: string } {
	const frame = stockDetails.AAPL.saveIntro;
	if (!showcase) return { delta: signedPctOrZero(0), body: `Saved recently. ${T} hasn’t moved since you saved it; check back after a few sessions.` };
	// the frame's own line, naming the stock the page is about
	const body = frame.body.replace(stockDetails.AAPL.symbol, T);
	const beta = betaOf(T);
	return { delta: frame.delta, body: beta !== null && beta < 1 ? body : body.replace(STEADY_REMARK, "") };
}

export type StockDetailLive = {
	data: StockDetailData;
	quote: Quote | null;
	/** the API is reachable and the live quote has not arrived yet */
	loading: boolean;
	known: boolean;
	saved: boolean;
	held: boolean;
	cash: number;
};

/**
 * `previewSaved`: the ?saved=1 frame preview (the saved look without a save); `preview`: any frame preview of the URL
 * (?saved / ?open / ?ticket / ?sheet / ?filled), which shows the frames' own copy on AAPL whoever is looking.
 */
export function useStockDetail(symbol: string, opts: { previewSaved?: boolean; preview?: boolean } = {}): StockDetailLive {
	const T = normalizeTicker(symbol);
	const authored = stockDetails[T];
	const known = !!authored || isKnownTicker(T);
	const live = useLive();
	const taste = useTaste();
	// a signed-out visitor reads the authored page for the tickers the frames show (AAPL ...) for the whole visit;
	// only tickers the design never covered, and every ticker for an account, come from the live API
	const showcase = isShowcase(live);
	// the frames' AAPL copy is the design itself: the untouched visitor, or a frame preview (discover-stock #8); after the
	// first action, and for accounts, AAPL is built like every other ticker (its analyst view keeps the frames' figures
	// while nothing better answers)
	const designLook = !!authored && (showcase || !!opts.preview);
	const health = useApiHealthState();
	const healthy = health.healthy && (live.signedIn || !authored);
	const settled = health.settled;
	const quote = useQuote(T);
	const q = useQuery(quoteQuery(T, healthy && known));
	// the skeleton shows until the probe has answered and, with the API up, until the live quote is in;
	// once the page has painted it never drops back to the skeleton (the quote just swaps from demo to live)
	const painted = useRef(false);
	const loading = known && !painted.current && (!settled || (healthy && q.isPending));
	if (!loading) painted.current = true;
	// one display name per company (N30.8f): the frames' own while the page is the design itself, names.ts otherwise
	const name = designLook ? authored.name : displayName(T);
	const analystQ = useQuery({ queryKey: ["analyst", T], queryFn: () => getAnalystData(T, name), enabled: healthy && known, staleTime: 10 * 60_000, retry: 0 });
	const actionsQ = useQuery({ queryKey: ["analyst-actions", T], queryFn: () => getAnalystActions(T, name), enabled: healthy && known, staleTime: 10 * 60_000, retry: 0 });
	const newsQ = useQuery({ queryKey: ["company-news", T], queryFn: () => getCompanyNews(T, name), enabled: healthy && known, staleTime: 10 * 60_000, retry: 0 });

	const saved = !!opts.previewSaved || live.savedTickers.has(T);
	const entry = live.saves.find((s) => s.ticker === T);
	// the market over the days of the save: what "with the market" is measured against (N23l)
	const market = useMarketMove(entry?.savedAt, { ticker: T }).pct;
	const held = live.positions.some((p) => p.ticker === T);
	const cash = showcase ? SHOWCASE_CASH : live.cash;
	const riskShort = taste.risk.short;

	const data = useMemo<StockDetailData>(() => {
		const price = quote && hasPrice(quote.price) ? quote.price : null;
		const pct = quote && price !== null ? quote.changePercent : null;
		// no quote at all (no demo price, the API down): no move either, as the price reads "—" (discover-stock #14). A day
		// that prints as 0.0 % is no move: no arrow, no sign, the label grey (N23c)
		const move = pct === null ? "" : toneOf(pct, 1) === "flat" ? `${pct1(0)} today` : `${arrowOrNone(pct)} ${signedPctOrZero(pct)} today`;
		// every company's News signal (N39c): its cards, its two lines, its move or the no-price line
		const signal = siteNews(T, move);
		const built: StockDetailData = {
			symbol: T,
			name,
			initial: displayInitial(T),
			ticker: displayTickerLine(T),
			price: price !== null ? money(price) : NO_FIGURE,
			priced: price !== null,
			change: pct === null ? NO_FIGURE : changeLineOrFlat(pct),
			changeShort: pct === null ? NO_FIGURE : changeShortOrFlat(pct),
			shares: price ? shares4(25 / price) : NO_FIGURE,
			periods: authored?.periods ?? ["1D", "1W", "1M", "1Y"],
			activePeriod: authored?.activePeriod ?? "1M",
			// a company without a price cannot promise tracking "from today's price" (N30.8c, the hunt's C-20)
			saveIntro: {
				unsaved: "NOT SAVED YET",
				saved: "SINCE YOU SAVED",
				delta: "",
				body: price !== null ? "Save it and this card starts tracking how it moves from today’s price." : `Save it and this card starts tracking once ${T} has a price.`,
			},
			risk: riskFor(T, riskShort),
			numbers: {
				title: "Numbers that matter",
				// one figure per company (N14a, N23j): the phones' tiles for the nineteen companies they author, the accessor's
				// figures for everyone else; the Compare table and the Benchmarks read the same accessor
				stats: tilesFor(T),
				footer: "Tap a stat for sector and peer benchmarks",
			},
			news: signal,
			cta: { save: "Save", unsave: "Unsave", buy: "Practice buy", cash: "" },
			analyst: null,
			compare: { title: "Compare and learn", ...compareFor(T) },
		};
		const base: StockDetailData = designLook
			? {
					...authored,
					saveIntro: { ...authored.saveIntro },
					numbers: { ...authored.numbers },
					// the frame's own lines, its earnings date from the clock (N23n: "Q3 earnings land July 30." on the frames' day)
					news: { ...authored.news, lines: [authored.news.lines[0]!, designEarningsLine()] },
					cta: { ...authored.cta },
					risk: { ...authored.risk },
					// the table the teaser opens into is the phone frame's own (1:2804, data.ts) while the page is the design
					// itself (ruling N33a: the showcase repeats frames verbatim, an opened state included); past the showcase
					// AAPL's table is the accessor's like every other company's (`built`, N23j)
					compare: { ...authored.compare },
				}
			: built;

		// the live quote wins for the price line (the demo quote equals the authored AAPL numbers)
		if (price !== null && pct !== null) {
			base.price = money(price);
			base.change = changeLineOrFlat(pct);
			base.changeShort = changeShortOrFlat(pct);
			base.shares = shares4(25 / price);
		}
		base.priced = price !== null;
		base.cta.cash = `Cash available  ${money(cash)}`;
		// a company without a price cannot be bought, and the page says so where the cash line stands (N27n, N30.8c)
		if (price === null) base.cta.refusal = refusalLine("no-price", { ticker: T, side: "buy" });
		base.design = designLook;
		// the line the stat footer promises: the frames' own (2:3516) for the design, the accessor's otherwise
		if (!designLook) base.numbers.benchmarks = benchmarksFor(T) ?? base.numbers.benchmarks;

		// the person's own save: real delta and age, unless the frame preview asks for the authored line
		if (entry && !(designLook && opts.previewSaved)) {
			const s = sinceSaved(T, entry, price, Date.now(), market);
			base.saveIntro.delta = s.delta;
			base.saveIntro.body = s.body;
		} else if (opts.previewSaved && !entry && !designLook) {
			// a frame-only save (the showcase collection's NVDA and GOOGL cards; the design's AAPL keeps the frames' own line
			// above): a saved-shaped line under "SINCE YOU SAVED", never the unsaved body
			const s = frameSaveIntro(T, showcase);
			base.saveIntro.delta = s.delta;
			base.saveIntro.body = s.body;
		}

		// analyst coverage: the API's when it answers with some; otherwise the demo coverage (`demoCoverage`: the phones'
		// nineteen rebased on the demo price, every other company's generated from its own figures, N39a) while the page
		// shows the demo price or no price at all (written against the demo price, it would misread a live one: no coverage
		// then); a company without a price gets the card without its dollar parts. The design's AAPL keeps Figma's own card
		// (2:3573, pixel for pixel); once the showcase is over AAPL's card is computed from the same numbers like the other
		// eighteen (N30.8d: the bar, the dot and the upside from Low / Avg / High and the price). An index fund's demo card
		// says analysts rate the companies it tracks and lists them (`fundAnalyst`, N43a): never ratings of the fund itself
		const analyst = analystFrom(analystQ.data, actionsQ.data, price);
		if (analyst) base.analyst = analyst;
		else if (!designLook && !quote?.live) {
			const demo = demoCoverage(T);
			base.analyst = demo ? analystFrom(demo.data, demo.actions, price) : fundAnalyst(T);
		}

		// live headlines when the API answers: each card opens its source page, the company's explainer card after them
		// (N39c: one company-specific card on every page). Line two is the API's earnings signal, else its second headline
		// (a demo earnings day beside live headlines could contradict the real one), else the catalog's commentary
		const articles = newsQ.data?.articles ?? [];
		if (articles.length > 0) {
			const explainer = explainerCard(T);
			const second = earningsLine(newsQ.data?.earningsSignal) ?? articles[1]?.headline ?? commentaryLine(T) ?? earningsLineFor(T);
			base.news = {
				title: SIGNAL_TITLE,
				move: move || NO_PRICE_MOVE,
				lines: [articles[0]!.headline, second],
				articles: [
					...articles.slice(0, MAX_STORIES).map((a) => ({
						source: `${a.source} · ${ago(a.datetime * (a.datetime < 1e12 ? 1000 : 1))}`,
						tone: a.sentiment === "bullish" ? "Positive" : a.sentiment === "bearish" ? "Negative" : "Neutral",
						text: a.headline,
						url: /^https?:\/\//i.test(a.url ?? "") ? a.url : undefined,
					})),
					...(explainer ? [explainer] : []),
				],
			};
		}
		return base;
	}, [T, authored, designLook, showcase, name, quote, cash, opts.previewSaved, entry, market, riskShort, analystQ.data, actionsQ.data, newsQ.data]);

	return { data, quote, loading, known, saved, held, cash };
}

/**
 * What the performance chart draws for one range:
 * - `design`: the frames' own line (Figma "Vector" 2:3462, public/figma/stock/vector__2-3462.svg), the showcase's month;
 * - `live`: the range's closes (live/history.ts: the STAK API's when it answers, otherwise the demo series ending at the
 *   company's quote), drawn in the vector's stroke;
 * - `loading`: the API's closes are on their way, drawn as the loading frame's dimmed line (2:2113, d70ff.svg);
 * - `none`: no price history at all (a company with no quote).
 */
export type ChartLine = { kind: "design" } | { kind: "live"; closes: number[] } | { kind: "loading" } | { kind: "none" };

/**
 * The line for the selected range (coordinator decision D3; FOUNDATION-API.md section 1, "STOCK PAGE"): every range of
 * every stock draws a line. While the page is the design itself (`designLook`: the untouched signed-out visitor, or a
 * frame preview; the showcase rule the price and the copy follow) the frames' own line stays on the range the frames
 * select (AAPL's month, 2:3462); every other range, every other ticker, and every range after the first action draw the
 * shared price history (`usePriceHistory`). Without `designLook` the showcase rule decides alone.
 */
export function useStockChart(symbol: string, range: string, defaultRange: string, designLook?: boolean): ChartLine {
	const T = normalizeTicker(symbol);
	const authored = stockDetails[T];
	const live = useLive();
	const design = range === defaultRange && !!authored && (designLook ?? isShowcase(live));
	const r = isHistoryRange(range) ? range : null;
	const history = usePriceHistory(T, r ?? "1M", { enabled: !design && r !== null });
	if (design) return { kind: "design" };
	if (history.status === "ready") return { kind: "live", closes: history.history.closes };
	if (history.status === "loading") return { kind: "loading" };
	return { kind: "none" };
}

/** The chart vector's box in the frames (2:3462, 2:6321): 692 x 122, the viewBox every chart line is drawn in. */
export const CHART_BOX = { width: 692, height: 122 } as const;

/**
 * The polyline of a live series inside a box (the chart vector's 692 × 122 by default): the first close on the left edge,
 * the last on the right, the series' high on the top edge and its low on the bottom one, as the frames' line spans its
 * box. A flat series sits on the box's middle. `top` starts the box that far down (the charts lower a line's top just
 * enough to clear their header texts, plot.ts `plotHeight`: a `height` under the box's own, with `top` the difference,
 * keeps the line on the box's bottom edge; the product chart also raises a line's bottom just enough to clear its range
 * tabs, plot.ts `plotBand`: its band's `top` and `height` are passed as they are).
 */
export function chartPoints(closes: readonly number[], width: number = CHART_BOX.width, height: number = CHART_BOX.height, top = 0): string {
	if (closes.length < 2) return "";
	const lo = Math.min(...closes);
	const hi = Math.max(...closes);
	const span = hi - lo;
	const step = width / (closes.length - 1);
	return closes
		.map((c, i) => {
			const x = i * step;
			const y = top + (span > 0 ? ((hi - c) / span) * height : height / 2);
			return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
		})
		.join(" ");
}

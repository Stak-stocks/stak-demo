/**
 * DEMO ANALYST COVERAGE FOR EVERY CATALOG COMPANY (coordinator ruling N39a, 2026-11-10; the user, with a screenshot of
 * /stocks/PLTR reading "No analyst coverage yet" with no caret: "not all stocks have it analyst and compare and learn
 * dropdowns. fix that"). The sources of a stock page's Analyst view, first that applies (live.ts useStockDetail): the STAK
 * API's own coverage when it answers; Figma's AAPL card (2:3573) while the page is the design itself; the phones' nineteen
 * (coverage.ts, AAPL's being Figma's own figures); and for EVERY OTHER catalog company (314 of the 333) the card generated
 * here from ITS OWN figures. Never Apple's facts copied over: the phones fill every company they do not author with AAPL's
 * analyst card, news and earnings (android ui/discover/StockDetailScreen.kt:997-1022 detailFactsFor), which N39 rules out.
 *
 * THE RULES, each with its reason:
 * 1. ONE COMPANY, ONE CARD, EVERY VISIT. Every draw comes from a stream seeded by the ticker alone (FNV-1a into mulberry32,
 *    one stream per rule so a change to one rule leaves the others' draws alone), never the clock or the visit; the demo
 *    price is fixed per company (live/demoQuotes.ts), so the same ticker always prints the same card.
 * 2. ANALYSTS BY MARKET CAP: 34 + 11 x (log10(cap) - 11.5), plus or minus 3, between 5 and 64. It is the straight line
 *    through the phones' own counts against their caps (ENPH $10.3B 34, PLD $110B 24, JPM $690B 26, NVDA $3.0T 63 ...):
 *    a $10B company about 18 analysts, $100B 29, $1T 40, $3T 45; bigger companies draw more coverage. Never under five:
 *    the card lists five recent actions from five firms, so it never counts fewer analysts than it shows.
 * 3. THE BUY / HOLD / SELL SPLIT FROM THE COMPANY'S FIGURES (fundamentals.ts, the one accessor of the figures the page
 *    prints beside the card, N23j; the beta of the catalog, betaOf). A score from -1 to 1 (`figuresScore`): 45% revenue
 *    growth ((g - 8) / 22: 8% is neutral, 30% scores fully), 30% profit margin ((m - 10) / 25), 25% valuation (a P/E of
 *    28 is neutral, every point cheaper adds 0.0125, dearer takes it off, between -0.6 and 0.3; a loss-making P/E -0.6),
 *    each part clamped to plus or minus 1 and 0 where the catalog states no figure. Buy is 52% + 40% of the score, plus or
 *    minus 5%, between 15% and 92%; a steady company (beta under 0.8) moves 12% a point of beta under 0.8 from Buy to Hold
 *    (utilities and staples draw more Holds); Sell is 3% + 15% of a negative score + 4% a point of beta over 1.3, plus 0 to
 *    3%, at most 35% (weak and wild companies draw Sells); Hold is the rest. The counts are those shares of the total, rounded, and add
 *    up to it exactly. So the figures decide the lean: a fast-growing, profitable company leans Buy, a shrinking, loss-
 *    making one leans Hold and Sell.
 * 4. THE TARGET RANGE (a priced company only), in whole dollars as the phones print theirs, and under a $20 price on
 *    10-cent steps printed with cents (coordinator ruling N43b: AMC's whole dollars, $3 / $5 / $7 on $4.85, were too coarse
 *    to read; `CENTS_UNDER`, `targetStep`): the average target's distance
 *    from the price is 3% + 25% of (Buy share - 55%) + 8% of growth / 40 (clamped to -0.5 .. 1), plus or minus 2%, between
 *    -15% and +35% (a Buy-heavy, growing company reads upside; a Sell-leaning, shrinking one can read downside, as the
 *    phones' COST does); the spread follows the beta: Low is 8% + 12% a point of beta (plus 0 to 3%) under the lower of
 *    the price and the average, High 6% + 14% a point of beta (plus 0 to 3%) over the higher (a utility's range is
 *    narrow, a chip maker's wide). Whole-dollar rounding keeps the average on its own side of the price and Low under,
 *    High over both, so Low < Avg < High and Low < price < High hold for every company. `analystFrom` (live.ts) then
 *    computes the upside, the bar and the dot from the targets AS PRINTED, exactly as for the nineteen (N23k).
 * 5. RECENT ACTIONS: five distinct firms, only firms the phones' authored coverage already names (coverage.ts: no other
 *    firm name ever appears); a firm the phones name only for one collection's companies rates only that collection
 *    (KBW, Piper Sandler: finance; Leerink Partners, Raymond James: healthcare; Wedbush, Citi: AI & tech; Evercore ISI,
 *    RBC, Stifel: real estate), the others anyone. The five ratings follow the split (five times its shares, by largest
 *    remainder, never more of a rating than the split counts), listed Buy, Hold, Sell as the phones list theirs; a Buy's
 *    target sits 2-12% over the higher of the price and the average, a Hold's 1-14% under the average, a Sell's 12-28%
 *    under the lower of the price and the average, all inside the range: near the average, on the side the rating says.
 * 6. NO PRICE, NO TARGETS (256 companies while the STAK API is down): the same split and the same five firms with their
 *    ratings, no dollar figure anywhere; the card draws one caption in the range's place (live.ts analystFrom,
 *    StockDetail.tsx).
 */
import { betaOf, type CollectionSlug, collectionOf, isKnownTicker, normalizeTicker } from "@/app/live";
import type { AnalystAction, AnalystData } from "@/lib/api";
import { AAPL_COVERAGE, PHONE_COVERAGE, type PhoneCoverage } from "./coverage";
import { fundamentalsOf } from "./fundamentals";

export type Rating = "Buy" | "Hold" | "Sell";

/** The fewest and the most analysts a generated card counts (rule 2). */
export const MIN_ANALYSTS = 5;
export const MAX_ANALYSTS = 64;
/** The recent actions a card lists, as the phones list five for every company they author. */
export const RECENT = 5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** FNV-1a: a 32-bit hash of a string. */
function hash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** A deterministic stream of numbers in [0, 1) for one ticker and one rule (mulberry32 seeded by FNV-1a; rule 1). */
export function streamFor(ticker: string, rule: string): () => number {
	let a = hash(`${normalizeTicker(ticker)}|${rule}`);
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const between = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

/** Rule 2: how many analysts cover a company of this market cap (dollars); a company with no cap counts as $5B. */
export function analystCount(cap: number | null, r: () => number): number {
	const x = cap !== null && cap > 0 ? Math.log10(cap) : Math.log10(5e9);
	return clamp(Math.round(34 + 11 * (x - 11.5) + between(r, -3, 3)), MIN_ANALYSTS, MAX_ANALYSTS);
}

/** Rule 3: what a company's own figures say, from -1 (everything points down) to 1 (everything points up). */
export function figuresScore(f: { pe: number | null; growth: number | null; margin: number | null }): number {
	const growth = f.growth === null ? 0 : clamp((f.growth - 8) / 22, -1, 1);
	const margin = f.margin === null ? 0 : clamp((f.margin - 10) / 25, -1, 1);
	const value = f.pe === null ? 0 : f.pe <= 0 ? -0.6 : clamp(0.35 - 0.0125 * f.pe, -0.6, 0.3);
	return 0.45 * growth + 0.3 * margin + 0.25 * value;
}

export type Split = { buy: number; hold: number; sell: number };

/** Rule 3: the Buy / Hold / Sell counts of `analysts` from the figures' score and the beta; they add up to `analysts`. */
export function ratingSplit(analysts: number, score: number, beta: number | null, r: () => number): Split {
	const b = beta ?? 1;
	const buyShare = clamp(0.52 + 0.4 * score - 0.12 * Math.max(0, 0.8 - b) + between(r, -0.05, 0.05), 0.15, 0.92);
	const sellShare = clamp(0.03 + 0.15 * Math.max(0, -score) + 0.04 * Math.max(0, b - 1.3) + between(r, 0, 0.03), 0, 0.35);
	const buy = clamp(Math.round(analysts * buyShare), 1, analysts);
	const sell = Math.min(analysts - buy, Math.round(analysts * sellShare));
	return { buy, hold: analysts - buy - sell, sell };
}

export type Targets = { low: number; avg: number; high: number };

/** Under this price (dollars) a card's targets are set on 10-cent steps and printed with cents (rule 4, ruling N43b). */
export const CENTS_UNDER = 20;
/** The step a priced company's targets are set on, in cents: 10 under `CENTS_UNDER`, a whole dollar otherwise. */
export const targetStep = (price: number): number => (price < CENTS_UNDER ? 10 : 100);

/**
 * Rule 4 under `CENTS_UNDER`: the same range on 10-cent steps, worked in whole cents so no float decides a side: the
 * average one step or more on its side of the price, Low under both, High over both.
 */
function steppedRange(price: number, u: number, down: number, up: number): Targets | null {
	const step = targetStep(price);
	const p = Math.round(price * 100);
	const steps = (dollars: number) => Math.round((dollars * 100) / step);
	const rounded = steps(price * (1 + u));
	const avg = (u >= 0 ? Math.max(rounded, Math.floor(p / step) + 1) : Math.min(rounded, Math.ceil(p / step) - 1)) * step;
	const low = Math.max(1, Math.min(steps(price * (1 + Math.min(u, 0) - down)), Math.ceil(Math.min(avg, p) / step) - 1)) * step;
	const high = Math.max(steps(price * (1 + Math.max(u, 0) + up)), Math.floor(Math.max(avg, p) / step) + 1) * step;
	const t = { low: low / 100, avg: avg / 100, high: high / 100 };
	return t.low < t.avg && t.avg < t.high && t.low < price && price < t.high ? t : null;
}

/**
 * Rule 4: the target range of a priced company, in whole dollars (on 10-cent steps under `CENTS_UNDER`): Low < Avg < High
 * and Low < price < High, the average on the side of the price the consensus and the growth point to. `buyShare`: the
 * split's Buy count over its total. null only where the steps cannot keep those orders (a price of a few cents).
 */
export function targetRange(price: number, buyShare: number, growth: number | null, beta: number | null, r: () => number): Targets | null {
	if (!(price > 0)) return null;
	const b = clamp(beta ?? 1, 0.3, 3);
	const tilt = growth === null ? 0 : clamp(growth / 40, -0.5, 1);
	const u = clamp(0.03 + 0.25 * (buyShare - 0.55) + 0.08 * tilt + between(r, -0.02, 0.02), -0.15, 0.35);
	const down = 0.08 + 0.12 * b + between(r, 0, 0.03);
	const up = 0.06 + 0.14 * b + between(r, 0, 0.03);
	if (price < CENTS_UNDER) return steppedRange(price, u, down, up);
	// the average stays on its side of the price once rounded to the dollar
	const rounded = Math.round(price * (1 + u));
	const avg = u >= 0 ? Math.max(rounded, Math.floor(price) + 1) : Math.min(rounded, Math.ceil(price) - 1);
	// Low under both the price and the average, High over both, whole dollars
	const low = Math.max(1, Math.min(Math.round(price * (1 + Math.min(u, 0) - down)), Math.ceil(Math.min(avg, price)) - 1));
	const high = Math.max(Math.round(price * (1 + Math.max(u, 0) + up)), Math.floor(Math.max(avg, price)) + 1);
	return low < avg && avg < high && low < price && price < high ? { low, avg, high } : null;
}

/** Every authored record with the company it covers: AAPL's (Figma's own card) and the phones' eighteen. */
const authoredRecords = (): [string, PhoneCoverage][] => [["AAPL", AAPL_COVERAGE], ...Object.entries(PHONE_COVERAGE)];

/**
 * Rule 5: the firms the phones' authored coverage names, in the order they first appear, each with the collections of
 * the companies they rate there (live/catalog.ts collectionOf: the six My STAK collections and Other).
 */
export function authoredFirms(): Map<string, Set<CollectionSlug>> {
	const out = new Map<string, Set<CollectionSlug>>();
	for (const [T, c] of authoredRecords()) {
		for (const [firm] of c.actions) {
			const collections = out.get(firm) ?? new Set<CollectionSlug>();
			collections.add(collectionOf(T));
			out.set(firm, collections);
		}
	}
	return out;
}

/** Rule 5: the firms that may rate a company: those the phones name across collections, and its own collection's specialists. */
export function firmsFor(ticker: string): string[] {
	const collection = collectionOf(ticker);
	return [...authoredFirms()].filter(([, collections]) => collections.size > 1 || collections.has(collection)).map(([firm]) => firm);
}

/** Rule 5: the five recent ratings, by largest remainder of five times the split's shares, listed Buy, Hold, Sell. */
export function fiveRatings(split: Split): Rating[] {
	const order: Rating[] = ["Buy", "Hold", "Sell"];
	const counts = [split.buy, split.hold, split.sell];
	const total = counts[0]! + counts[1]! + counts[2]!;
	if (total <= 0) return [];
	const exact = counts.map((c) => (RECENT * c) / total);
	const n = counts.map((c, i) => Math.min(c, Math.floor(exact[i]!)));
	while (n[0]! + n[1]! + n[2]! < Math.min(RECENT, total)) {
		// the largest remainder among the ratings the split still has analysts for
		let best = -1;
		for (let i = 0; i < 3; i++) if (n[i]! < counts[i]! && (best < 0 || exact[i]! - n[i]! > exact[best]! - n[best]!)) best = i;
		if (best < 0) break;
		n[best] = n[best]! + 1;
	}
	return order.flatMap((rating, i) => Array<Rating>(n[i]!).fill(rating));
}

/** A seeded order of a list (Fisher-Yates). */
function shuffled<T>(items: readonly T[], r: () => number): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
}

/**
 * Rule 5: a rating's target, near the average on the side the rating says, inside the range, whole dollars (10-cent
 * steps under `CENTS_UNDER`, never rounded onto or across the price).
 */
function actionTarget(rating: Rating, t: Targets, price: number, r: () => number): number {
	const x =
		rating === "Buy"
			? Math.max(t.avg, price) * between(r, 1.02, 1.12)
			: rating === "Hold"
				? t.avg * between(r, 0.86, 0.99)
				: Math.min(t.avg, price) * between(r, 0.72, 0.88);
	if (price >= CENTS_UNDER) return clamp(Math.round(x), t.low, t.high);
	const step = targetStep(price);
	const p = Math.round(price * 100);
	let c = Math.round((x * 100) / step) * step;
	if (rating === "Buy") c = Math.max(c, (Math.floor(p / step) + 1) * step);
	if (rating === "Sell") c = Math.min(c, (Math.ceil(p / step) - 1) * step);
	return clamp(c / 100, t.low, t.high);
}

/** A generated card's figures: the analysts, the split, the targets (null without a price) and the five recent actions. */
export type GeneratedCoverage = Split & {
	analysts: number;
	targets: Targets | null;
	actions: { firm: string; rating: Rating; target: number | null }[];
};

/**
 * The demo coverage of a catalog company (rules 1-6), from its own figures and `price` (its demo price; null for a company
 * without one: the consensus and the ratings alone). null for a ticker the catalog does not list. It is generated for any
 * catalog company; the page uses it only for the companies nobody authors (live.ts demoCoverage).
 */
export function generateCoverage(ticker: string, price: number | null): GeneratedCoverage | null {
	const T = normalizeTicker(ticker);
	if (!isKnownTicker(T)) return null;
	const f = fundamentalsOf(T);
	const beta = betaOf(T);
	const analysts = analystCount(f?.cap ?? null, streamFor(T, "analysts"));
	const split = ratingSplit(analysts, figuresScore({ pe: f?.pe ?? null, growth: f?.growth ?? null, margin: f?.margin ?? null }), beta, streamFor(T, "split"));
	const targets = price !== null && price > 0 ? targetRange(price, split.buy / analysts, f?.growth ?? null, beta, streamFor(T, "targets")) : null;
	const firms = shuffled(firmsFor(T), streamFor(T, "firms"));
	const r = streamFor(T, "action-targets");
	const actions = fiveRatings(split).map((rating, i) => ({ firm: firms[i]!, rating, target: targets && price !== null ? actionTarget(rating, targets, price, r) : null }));
	return { ...split, analysts, targets, actions };
}

/** The generated coverage in the STAK API's own shape (lib/api.ts AnalystData / AnalystAction), for live.ts `analystFrom`. */
export function generatedCoverage(ticker: string, price: number | null): { data: AnalystData; actions: AnalystAction[] } | null {
	const c = generateCoverage(ticker, price);
	if (!c) return null;
	return {
		data: { priceTarget: c.targets, recommendation: { strongBuy: 0, buy: c.buy, hold: c.hold, sell: c.sell, strongSell: 0, period: null } },
		actions: c.actions.map((a) => ({ firm: a.firm, action: a.rating, priceTarget: a.target })),
	};
}

/**
 * ONE FIGURE PER COMPANY EVERYWHERE (coordinator rulings N14a and N23j; the hunt's NUM-05, HIGH): a company's P/E, revenue
 * growth, profit margin and market cap come from this one accessor wherever they are printed: the stock page's "Numbers
 * that matter" tiles, the "Compare and learn" table's own column AND every peer column, the Benchmarks line, and the
 * article rail's Key stats (NEWS adopts `fundamentalsOf`). Before it NVDA's article said P/E 49.6 and $4.65T beside its
 * stock page's 52.8 and $3.0T, and 97 peer cells differed from the peer's own page (JPM "+8%" on its own page, "+22%" in
 * BAC's table): two sources, the phones' authored records and the catalog's snapshot, each read by a different card.
 *
 * The source of a company's figures, in this order:
 * 1. the phones' authored record where they author the company (their nineteen: android ui/discover/StockDetailScreen.kt
 *    DETAIL_FACTS, mirrored by ios Discover/StockDetailView.swift; coverage.ts): the tiles' three figures and the market
 *    cap of the company's own Compare row. AAPL's are Figma's own tiles (2:3505-2:3515) and the phone frame's cap (1:2834);
 * 2. the catalog's snapshot (shared/src/brands `financials`) for every other company it lists;
 * 3. for the three peers the phones compare with that the catalog does not list (SEDG, ELV, DECK), the phones' own peer
 *    cells: the only figures there are for them, and no page of their own to contradict.
 *
 * ONE FORMAT PER MEASURE, the authored tiles' (N30.8a, N23m): a P/E with one decimal ("52.8", "13.1"); a percentage with
 * one decimal at most and no ".0" ("62%", "8.1%", "-5%"); a market cap as its source writes it with the dollar sign
 * ("$3.0T", "$46.2B"); a figure nobody states is "—" (`NO_FIGURE`) in every card.
 */
import { financialsOf, normalizeTicker } from "@/app/live";
import { AAPL_COVERAGE, PHONE_COVERAGE, type PhoneCoverage } from "./coverage";

/** A figure nobody states, in every card (N23m: one format for a missing figure). */
export const NO_FIGURE = "—";

export type Fundamentals = {
	ticker: string;
	/** where the figures come from: the phones' authored record, or the catalog's snapshot */
	source: "phones" | "catalog";
	/** trailing P/E; zero or negative for a company that lost money over the year; null when nobody states it */
	pe: number | null;
	/** revenue growth over the year, in % */
	growth: number | null;
	/** profit margin, in % */
	margin: number | null;
	/** market cap in dollars */
	cap: number | null;
	/** the four figures as every card prints them: "52.8", "62%", "48.9%", "$3.0T"; "—" where there is none */
	text: { pe: string; growth: string; margin: string; cap: string };
};

/** The first number in a printed figure ("52.8", "+62%", "110x", "-14%"); null for "n/m", "—" and an empty string. */
export const figure = (s: string | undefined | null): number | null => {
	const m = String(s ?? "").match(/[-−+]?\d[\d,]*(?:\.\d+)?/);
	if (!m) return null;
	const v = Number.parseFloat(m[0].replace(/,/g, "").replace("−", "-"));
	return Number.isFinite(v) ? v : null;
};

/** One decimal at most, a whole number without its ".0" ("36", "62.5", "-5"). */
const trim1 = (v: number) => {
	const r = Math.round(v * 10) / 10;
	return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/** A P/E as every card prints it: one decimal ("52.8", "28.0", "-46.1"). */
export const peText = (v: number | null) => (v === null ? NO_FIGURE : v.toFixed(1));
/** A percentage as every card prints it: "62%", "8.1%", "-5%". */
export const pctText = (v: number | null) => (v === null ? NO_FIGURE : `${trim1(v)}%`);
/** A growth figure as the Compare table prints it, signed: "+62%", "-14%", "0%". */
export const signedPctText = (v: number | null) => (v === null ? NO_FIGURE : `${v > 0 ? "+" : ""}${trim1(v)}%`);

/** "$223.5B", "1.38T", "$622M" in dollars; null where there is no figure. */
export function capDollars(raw: string | undefined | null): number | null {
	const m = String(raw ?? "").match(/([\d.]+)\s*([TBM])/i);
	const v = m ? Number.parseFloat(m[1]!) : Number.NaN;
	if (!m || !Number.isFinite(v)) return null;
	const unit = m[2]!.toUpperCase();
	return v * (unit === "T" ? 1e12 : unit === "B" ? 1e9 : 1e6);
}

/** A market cap as every card prints it: its source's own figure with the dollar sign. */
const capText = (raw: string | undefined | null) => {
	const t = String(raw ?? "").trim();
	return /\d/.test(t) ? (t.startsWith("$") ? t : `$${t}`) : NO_FIGURE;
};

const build = (ticker: string, source: Fundamentals["source"], pe: number | null, growth: number | null, margin: number | null, capRaw: string | undefined | null): Fundamentals => ({
	ticker,
	source,
	pe,
	growth,
	margin,
	cap: capDollars(capRaw),
	text: { pe: peText(pe), growth: pctText(growth), margin: pctText(margin), cap: capText(capRaw) },
});

/** The phones' authored record of a company: the tiles' three figures and the cap of its own Compare row. */
const authoredRecord = (ticker: string): PhoneCoverage | undefined => (ticker === "AAPL" ? AAPL_COVERAGE : PHONE_COVERAGE[ticker]);

const fromRecord = (ticker: string, c: PhoneCoverage): Fundamentals => {
	const stat = (label: string) => figure(c.stats.find(([l]) => l === label)?.[1]);
	const cap = c.rows.find(([label]) => label === "Market cap")?.[1];
	return build(ticker, "phones", stat("P/E ratio"), stat("Revenue growth"), stat("Profit margin"), cap);
};

/**
 * The phones' peer cells for the peers they compare with that have no record of their own (source 3 above): the first
 * table that names the peer gives its four figures.
 */
let peerCells: ReadonlyMap<string, Fundamentals> | null = null;
function phonePeers(): ReadonlyMap<string, Fundamentals> {
	if (peerCells) return peerCells;
	const out = new Map<string, Fundamentals>();
	for (const c of [AAPL_COVERAGE, ...Object.values(PHONE_COVERAGE)]) {
		c.peers.forEach((peer, i) => {
			if (out.has(peer) || authoredRecord(peer)) return;
			const cell = (label: string) => c.rows.find(([l]) => l === label)?.[i + 2];
			out.set(peer, build(peer, "phones", figure(cell("P/E ratio")), figure(cell("Rev growth")), figure(cell("Profit margin")), cell("Market cap")));
		});
	}
	peerCells = out;
	return out;
}

/**
 * A company's P/E, revenue growth, profit margin and market cap, as numbers and as every card prints them: the ONE
 * accessor of these four figures (N23j). null for a company nobody states a figure for (not authored by the phones, not
 * in the catalog).
 */
export function fundamentalsOf(ticker: string): Fundamentals | null {
	const T = normalizeTicker(ticker);
	const authored = authoredRecord(T);
	if (authored) return fromRecord(T, authored);
	const fin = financialsOf(T);
	if (fin) return build(T, "catalog", figure(fin.peRatio?.value), figure(fin.revenueGrowth?.value), figure(fin.profitMargin?.value), fin.marketCap?.value);
	return phonePeers().get(T) ?? null;
}

/** A company the Compare table can draw a column for: at least one of its four figures is stated. */
export function hasFundamentals(ticker: string): boolean {
	const f = fundamentalsOf(ticker);
	return !!f && (f.pe !== null || f.growth !== null || f.margin !== null || f.cap !== null);
}

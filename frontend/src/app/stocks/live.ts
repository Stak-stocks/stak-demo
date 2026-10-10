/**
 * Stock detail content for any catalog ticker: the catalog's financial snapshot, the live quote,
 * the person's own save and cash, analyst coverage and headlines from the STAK API when it is
 * reachable. AAPL keeps the frames' authored copy wherever the live sources have nothing better.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import {
	ago,
	allTickers,
	betaOf,
	brandByTicker,
	changeLine,
	changeShort,
	companyInitial,
	companyName,
	financialsOf,
	isKnownTicker,
	money,
	normalizeTicker,
	pct1,
	primaryCategoryOf,
	quoteQuery,
	shares4,
	signedPct,
	tickerLine,
	isShowcase,
	SHOWCASE_CASH,
	useApiHealthState,
	useLive,
	useQuote,
	useTaste,
	type Quote,
} from "@/app/live";
import { type AnalystAction, type AnalystData, getAnalystActions, getAnalystData, getCompanyNews } from "@/lib/api";
import { type AnalystView, type StockDetailData, type StockStat, stockDetails } from "./data";

/** The rail's track is 328 px wide (360 − 2 × 16); fills and markers are authored in px of it. */
const RAIL_TRACK = 328;
/** The content column's risk track is 712 px wide (744 − 2 × 16). */
const RISK_TRACK = 712;
/** Both markers are 14 px squares placed by their left edge, so they travel the track minus their own width. */
const MARKER = 14;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (s: string | undefined | null) => {
	const v = Number.parseFloat(String(s ?? "").replace(/[^0-9.+-]/g, ""));
	return Number.isFinite(v) ? v : null;
};

function statFor(label: string, raw: string | undefined, kind: "pe" | "growth" | "margin"): StockStat {
	const v = num(raw);
	if (v === null) return { label, value: "—", note: "No data", good: false, outlined: false };
	if (kind === "pe") return { label, value: v.toFixed(1), note: v < 20 ? "Cheap" : v <= 35 ? "In line" : "Pricey", good: v < 20, outlined: false };
	if (kind === "growth") return { label, value: `${v.toFixed(1)}%`, note: v < 5 ? "Slower" : v <= 15 ? "Steady" : "Fast", good: v > 15, outlined: v > 15 };
	return { label, value: `${v.toFixed(1)}%`, note: v > 20 ? "Excellent" : v >= 10 ? "Healthy" : "Thin", good: v > 20, outlined: v > 20 };
}

type Fin = ReturnType<typeof financialsOf>;

/**
 * The line the stat footer promises, from the catalog itself: "sector" averages the names that share
 * the ticker's primary category, "peers" its peer list; a figure nobody reports is left out.
 */
export function benchmarksFor(T: string): string | undefined {
	const category = primaryCategoryOf(T);
	const sector = category ? allTickers().filter((t) => t !== T && primaryCategoryOf(t) === category) : [];
	const peers = (brandByTicker(T)?.peerTickers ?? []).map((t) => t.toUpperCase()).filter((t) => t !== T);
	// medians, so one outlier (a 300x P/E, a 400% growth spurt) cannot drag a sector figure
	const median = (tickers: string[], pick: (f: Fin) => string | undefined, keep: (v: number) => boolean) => {
		const values = tickers
			.map((t) => num(pick(financialsOf(t))))
			.filter((v): v is number => v !== null && keep(v))
			.sort((a, b) => a - b);
		if (!values.length) return null;
		const mid = values.length >> 1;
		return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
	};
	const any = () => true;
	const part = (label: string, pick: (f: Fin) => string | undefined, fmt: (v: number) => string, keep: (v: number) => boolean = any) => {
		const s = median(sector, pick, keep);
		const p = median(peers, pick, keep);
		if (s === null && p === null) return null;
		return `${label} ${[s === null ? null : `sector ${fmt(s)}`, p === null ? null : `peers ${fmt(p)}`].filter(Boolean).join(" · ")}.`;
	};
	const parts = [
		part("P/E", (f) => f?.peRatio.value, (v) => `${v.toFixed(1)}x`, (v) => v > 0),
		part("Growth", (f) => f?.revenueGrowth.value, (v) => `${v.toFixed(1)}%`),
		part("Margin", (f) => f?.profitMargin.value, (v) => `${v.toFixed(1)}%`),
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
				? "Moves with the market. Expect the index's good and bad days."
				: beta <= 1.6
					? "Above-average swings. Earnings days move it most."
					: "High volatility. Small stakes keep the swings easy to live with.";
	return { title: "Risk fit", badge, low: "Low", high: "High", markerLeft, note };
}

function analystFrom(data: AnalystData | undefined, actions: AnalystAction[] | undefined, price: number | null): AnalystView | null {
	const pt = data?.priceTarget;
	const rec = data?.recommendation;
	if (!pt || pt.low == null || pt.high == null || pt.avg == null || pt.high <= pt.low) return null;
	const span = pt.high - pt.low;
	const upside = price ? ((pt.avg - price) / price) * 100 : null;
	const buy = (rec?.strongBuy ?? 0) + (rec?.buy ?? 0);
	const hold = rec?.hold ?? 0;
	const sell = (rec?.sell ?? 0) + (rec?.strongSell ?? 0);
	const total = buy + hold + sell;
	const toRating = (a: string) => (/buy|outperform|overweight|positive/i.test(a) ? "Buy" : /sell|underperform|underweight|negative/i.test(a) ? "Sell" : "Hold");
	return {
		title: "Analyst view",
		upside: upside === null ? "Target range published" : `${upside >= 0 ? "↑" : "↓"} ${pct1(upside)} ${upside >= 0 ? "upside" : "downside"}`,
		rangeLabel: "PRICE TARGET RANGE",
		rangeFill: Math.round(clamp((pt.avg - pt.low) / span, 0, 1) * RAIL_TRACK),
		rangeMarker: Math.round(clamp(((price ?? pt.avg) - pt.low) / span, 0, 1) * (RAIL_TRACK - MARKER)),
		low: ["Low", `$${Math.round(pt.low)}`],
		avg: ["Avg", `$${Math.round(pt.avg)}`],
		high: ["High", `$${Math.round(pt.high)}`],
		consensusLabel: total > 0 ? `WALL ST. CONSENSUS · ${total} ANALYSTS` : "WALL ST. CONSENSUS",
		consensusFill: total > 0 ? Math.round((buy / total) * RAIL_TRACK) : 0,
		counts: [`● Buy ${buy}`, `Hold ${hold}`, `Sell ${sell}`],
		recentLabel: "RECENT ACTIONS",
		actions: (actions ?? []).slice(0, 5).map((a) => ({ firm: a.firm, rating: toRating(a.action), target: a.priceTarget != null ? `$${Math.round(a.priceTarget)}` : "—" })),
	};
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

export function useStockDetail(symbol: string, opts: { previewSaved?: boolean } = {}): StockDetailLive {
	const T = normalizeTicker(symbol);
	const authored = stockDetails[T];
	const known = !!authored || isKnownTicker(T);
	const live = useLive();
	const taste = useTaste();
	// the untouched demo persona is the design itself: authored content and demo prices, no live API (live/showcase.ts)
	const showcase = isShowcase(live);
	const health = useApiHealthState();
	const healthy = health.healthy && !showcase;
	const settled = health.settled;
	const quote = useQuote(T);
	const q = useQuery(quoteQuery(T, healthy && known));
	// the skeleton shows until the probe has answered and, with the API up, until the live quote is in;
	// once the page has painted it never drops back to the skeleton (the quote just swaps from demo to live)
	const painted = useRef(false);
	const loading = known && !painted.current && (!settled || (healthy && q.isPending));
	if (!loading) painted.current = true;
	const name = authored?.name ?? companyName(T);
	const analystQ = useQuery({ queryKey: ["analyst", T], queryFn: () => getAnalystData(T, name), enabled: healthy && known, staleTime: 10 * 60_000, retry: 0 });
	const actionsQ = useQuery({ queryKey: ["analyst-actions", T], queryFn: () => getAnalystActions(T, name), enabled: healthy && known, staleTime: 10 * 60_000, retry: 0 });
	const newsQ = useQuery({ queryKey: ["company-news", T], queryFn: () => getCompanyNews(T, name), enabled: healthy && known, staleTime: 10 * 60_000, retry: 0 });

	const saved = !!opts.previewSaved || live.savedTickers.has(T);
	const entry = live.saves.find((s) => s.ticker === T);
	const held = live.positions.some((p) => p.ticker === T);
	const cash = showcase ? SHOWCASE_CASH : live.cash;
	const riskShort = taste.risk.short;

	const data = useMemo<StockDetailData>(() => {
		const price = quote?.price ?? null;
		const pct = quote?.changePercent ?? 0;
		const fin = financialsOf(T);
		const brand = brandByTicker(T);
		const peers = (brand?.peerTickers ?? []).slice(0, 2);
		const base: StockDetailData = authored
			? { ...authored, saveIntro: { ...authored.saveIntro }, numbers: { ...authored.numbers }, news: { ...authored.news }, cta: { ...authored.cta }, risk: { ...authored.risk } }
			: {
					symbol: T,
					name,
					initial: companyInitial(T),
					ticker: tickerLine(T),
					price: price !== null ? money(price) : "—",
					change: changeLine(pct),
					changeShort: changeShort(pct),
					shares: price ? shares4(25 / price) : "—",
					periods: ["1D", "1W", "1M", "1Y"],
					activePeriod: "1M",
					saveIntro: { unsaved: "NOT SAVED YET", saved: "SINCE YOU SAVED", delta: "", body: "Save it and this card starts tracking how it moves from today's price." },
					risk: riskFor(T, riskShort),
					numbers: {
						title: "Numbers that matter",
						stats: [statFor("P/E ratio", fin?.peRatio.value, "pe"), statFor("Revenue growth", fin?.revenueGrowth.value, "growth"), statFor("Profit margin", fin?.profitMargin.value, "margin")],
						footer: "Tap a stat for sector and peer benchmarks",
					},
					news: { title: "News signal", move: `${pct < 0 ? "▼" : "▲"} ${signedPct(pct)} today`, lines: ["No fresh headlines today."], articles: [] },
					cta: { save: "Save", unsave: "Unsave", buy: "Practice buy", cash: "" },
					analyst: null,
					compare: { title: "Compare and learn", sub: peers.length ? `vs ${peers.join(" · ")}` : "vs the sector" },
				};

		// the live quote wins for the price line (the demo quote equals the authored AAPL numbers)
		if (price !== null) {
			base.price = money(price);
			base.change = changeLine(pct);
			base.changeShort = changeShort(pct);
			base.shares = shares4(25 / price);
		}
		base.cta.cash = `Cash available  ${money(cash)}`;
		base.numbers.benchmarks = benchmarksFor(T) ?? base.numbers.benchmarks;

		// the person's own save: real delta and age, unless the frame preview asks for the authored line
		if (entry) {
			const since = entry.priceAtSave && price ? ((price - entry.priceAtSave) / entry.priceAtSave) * 100 : null;
			base.saveIntro.delta = since === null ? "" : signedPct(since);
			base.saveIntro.body =
				since === null
					? `Saved ${ago(entry.savedAt)}. ${T} started tracking from today's price.`
					: `Saved ${ago(entry.savedAt)}. ${T} is ${since < 0 ? "down" : "up"} ${pct1(since)} since, ${Math.abs(since) < 3 ? "moving roughly with the market" : since > 0 ? "running ahead of the market" : "lagging the market"}.`;
		}

		// live coverage and headlines when the API answers
		const analyst = analystFrom(analystQ.data, actionsQ.data, price);
		if (analyst) base.analyst = analyst;
		const articles = newsQ.data?.articles ?? [];
		if (articles.length > 0) {
			base.news = {
				title: "News signal",
				move: `${pct < 0 ? "▼" : "▲"} ${signedPct(pct)} today`,
				lines: articles.slice(0, 2).map((a) => a.headline),
				articles: articles.slice(0, 4).map((a) => ({
					source: `${a.source} · ${ago(a.datetime * (a.datetime < 1e12 ? 1000 : 1))}`,
					tone: a.sentiment === "bullish" ? "Positive" : a.sentiment === "bearish" ? "Negative" : "Neutral",
					text: a.headline,
				})),
			};
		}
		return base;
	}, [T, authored, name, quote, cash, saved, opts.previewSaved, entry, riskShort, analystQ.data, actionsQ.data, newsQ.data]);

	return { data, quote, loading, known, saved, held, cash };
}

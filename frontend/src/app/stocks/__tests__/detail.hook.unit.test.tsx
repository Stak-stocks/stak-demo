import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	auth: { user: null, loading: false },
	account: { account: null, accountLoading: false, initSandboxCash: vi.fn() },
	health: { healthy: false, settled: true },
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/AccountContext", () => ({ useAccount: () => mocks.account }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("@/app/live/quotes", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/app/live/quotes")>()),
	useApiHealthState: () => mocks.health,
	useApiHealth: () => mocks.health.healthy,
}));

import { loadCatalog } from "@/app/live/catalog";
import { useDeck } from "@/app/live/deck";
import { guestStore, localStore } from "@/app/live/guest";
import { refusalLine } from "@/app/live/orders";
import { useLive } from "@/app/live/store";
import { type StockArticle, stockDetails } from "../data";
import { useDeckAwareSave } from "../deckSave";
import { analystFrom, CHART_BOX, demoCoverage, designEarningsLine, nextEarningsLine, useStockChart, useStockDetail } from "../live";
import { NO_PRICE, PerformanceChart } from "../PerformanceChart";
import { HEADER_CLEAR, LINE_STROKE } from "../plot";
import { StockDetail } from "../StockDetail";

beforeAll(() => loadCatalog());

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
	localStorage.clear();
	guestStore().reset();
	localStore("guest").reset();
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
	cleanup();
	client.clear();
});

function useAapl(opts: { previewSaved?: boolean; preview?: boolean } = {}) {
	const live = useLive();
	const detail = useStockDetail("AAPL", opts);
	const chart = useStockChart("AAPL", "1M", "1M", detail.data.design);
	return { live, detail, chart };
}

describe("AAPL: the frames' copy for the design, the catalog after the first action (discover-stock #8)", () => {
	it("shows Figma's AAPL while the visitor is untouched, its 1M chart Figma's own line", () => {
		const { result } = renderHook(() => useAapl(), { wrapper });
		const d = result.current.detail.data;
		expect(d.design).toBe(true);
		expect(d.numbers.stats.map((s) => s.value)).toEqual(["31.2", "6.1%", "24.3%"]);
		expect(d.risk.badge).toBe("Matches you");
		expect(d.saveIntro.body).toBe(stockDetails.AAPL.saveIntro.body);
		// the table the teaser opens into is the phone frame's own while the showcase lasts (1:2804, ruling N33a): its
		// peer cells are the frame's rounded figures, not the 37.5 / $3.8T and 24.1 / 29.5% of those companies' pages
		expect(d.compare.table?.columns).toEqual(["AAPL", "MSFT", "GOOGL"]);
		expect(d.compare.table?.rows.map((r) => r.cells.map((c) => c.text))).toEqual([
			["31.2", "36x", "24x"],
			["+6.1%", "+15%", "+12%"],
			["24.3%", "36%", "29%"],
			["$3.5T", "$3.4T", "$2.3T"],
		]);
		expect(d.compare.table?.rows[1]!.cells.map((c) => c.tone)).toEqual(["up", "up", "up"]);
		// and Figma's own Benchmarks line under the tiles (2:3516)
		expect(d.numbers.benchmarks).toBe(stockDetails.AAPL.numbers.benchmarks);
		// Figma's own Analyst card, and its earnings line dated from the clock (the frame's sentence, N23n)
		expect(d.analyst?.upside).toBe("↑ 6.7% upside");
		expect(d.analyst?.avgAt).toBeUndefined();
		expect(d.news.lines).toEqual(["Foldable iPhone reports point to a premium fall lineup.", designEarningsLine()]);
		expect(d.news.lines[1]).toMatch(/^Q3 earnings land [A-Z][a-z]+ \d{1,2}\.$/);
		expect(d.ticker).toBe("AAPL · Apple Inc");
		expect(result.current.chart).toEqual({ kind: "design" });
	});

	it("builds AAPL like every other ticker once the visitor has saved it", async () => {
		const { result } = renderHook(() => useAapl(), { wrapper });
		await act(() => result.current.live.actions.save("AAPL", 229.35));
		const d = result.current.detail.data;
		expect(d.design).toBe(false);
		// one page, one figure (N14a): the tiles are the phones' AAPL tiles, the figures of Figma's own and of the Compare
		// table's AAPL column (D8: the authored rows where they exist); the catalog's 32.8 / 15.7 % / 29.3 % are not shown
		expect(d.numbers.stats.map((s) => s.value)).toEqual(["31.2", "6.1%", "24.3%"]);
		expect(d.numbers.stats.map((s) => s.note)).toEqual(["In line", "Slower", "Excellent"]);
		expect(d.compare.table?.rows.map((r) => r.cells[0]!.text)).toEqual(["31.2", "+6.1%", "24.3%", "$3.5T"]);
		// past the showcase the peers' columns are the accessor's (N23j): MSFT and GOOGL as their own pages print them,
		// no longer the frame's "36x" / "24x" / "29%" / "$3.4T" (N33a keeps those for the untouched showcase only)
		expect(d.compare.table?.rows.map((r) => r.cells.slice(1).map((c) => c.text))).toEqual([
			["37.5", "24.1"],
			["+15%", "+12%"],
			["36%", "29.5%"],
			["$3.8T", "$2.3T"],
		]);
		// and the Benchmarks line is computed: its sector the AI & Tech collection, never Peloton and Duolingo alone
		expect(d.numbers.benchmarks).toMatch(/^Benchmarks: P\/E sector \d+\.\dx · peers 30\.8x\./);
		expect(d.numbers.benchmarks).not.toContain("115.0x");
		// beta 1.09 moves with the market
		expect(d.risk.note).toBe("Moves with the market. Expect the index’s good and bad days.");
		// one display name per company once the page is no longer the design (N30.8f)
		expect([d.ticker, d.name]).toEqual(["AAPL · Apple", "Apple"]);
		// a save of today has not moved
		expect(d.saveIntro.delta).toBe("0.0%");
		expect(d.saveIntro.body).toBe("Saved today. AAPL hasn’t moved since you saved it; check back after a few sessions.");
		// the site's own Apple story first, a card that opens it, then its explainer (right after the company's own stories:
		// BUILD-PLAN N42), then the stories that name Apple (N39c)
		expect(d.news.articles.map((a) => a.story)).toEqual(["apple-foldable", undefined, "dow-record-chips", "nvidia-chip-rally"]);
		expect(d.news.articles[1]?.source).toBe("STAK · Explainer");
		expect(d.news.lines[0]).toBe("Apple rose about 5% on plans for its widest iPhone lineup yet.");
		// Figma's analyst figures stay the coverage while the API is down, COMPUTED now like the other eighteen (N30.8d):
		// $248 on $229.35 is 8.1 %, the dot on the price, "Avg" under the bar's end
		expect(d.analyst?.upside).toBe("↑ 8.1% upside");
		expect([d.analyst?.low[1], d.analyst?.avg[1], d.analyst?.high[1]]).toEqual(["$180", "$248", "$300"]);
		expect(d.analyst?.avgAt).toBeCloseTo(68 / 120, 10);
		expect(d.analyst?.boxes).toBeUndefined();
		// the story's first point, then the phones' next-earnings line from the clock (N23n)
		expect(d.news.lines[1]).toBe(nextEarningsLine("AAPL"));
		// and the chart's month is the shared price history now
		expect(result.current.chart.kind).toBe("live");
	});

	it("keeps the frames' copy on a frame preview whoever looks", async () => {
		const { result } = renderHook(() => useAapl({ preview: true, previewSaved: true }), { wrapper });
		// the showcase is over (a save of a company the persona did not hold in My STAK)
		await act(() => result.current.live.actions.save("NVDA", 122.1));
		const d = result.current.detail.data;
		expect(d.design).toBe(true);
		expect(d.saveIntro.delta).toBe("+4.6%");
		expect(result.current.chart).toEqual({ kind: "design" });
		// a frame preview is the design too: the frame's table and Figma's Benchmarks line
		expect(d.compare.table?.rows[0]!.cells.map((c) => c.text)).toEqual(["31.2", "36x", "24x"]);
		expect(d.numbers.benchmarks).toBe(stockDetails.AAPL.numbers.benchmarks);
	});
});

describe("a Save on a deck card's own page is its deck decision (discover-stock #5)", () => {
	const useBoth = () => ({ live: useLive(), deck: useDeck({ quotes: false }), store: useDeckAwareSave() });

	it("records the save in today's run and keeps the card in the deck, the ring still naming the card in front (N29a)", async () => {
		const { result } = renderHook(useBoth, { wrapper });
		expect(result.current.deck.order[0]).toBe("NVDA");
		expect(result.current.deck.counter).toBe(1);
		await act(() => result.current.store.save("NVDA", 122.1));
		expect(result.current.live.savedTickers.has("NVDA")).toBe(true);
		expect(result.current.live.deck?.saved).toEqual(["NVDA"]);
		expect(result.current.deck.order[0]).toBe("NVDA");
		expect(result.current.deck.cards[0]?.saved).toBe(true);
		// a Save is not a move: the counter is the card in front (index + 1), like the phones' ring (N29a)
		expect(result.current.deck.counter).toBe(1);
		expect(result.current.deck.decided.has("NVDA")).toBe(true);
		// Unsave reverses it
		await act(() => result.current.store.unsave("NVDA"));
		expect(result.current.live.savedTickers.has("NVDA")).toBe(false);
		expect(result.current.live.deck?.saved).toEqual([]);
		expect(result.current.deck.counter).toBe(1);
	});

	it("saves a company outside today's deck to My STAK only", async () => {
		const { result } = renderHook(useBoth, { wrapper });
		expect(result.current.deck.order).not.toContain("KO");
		await act(() => result.current.store.save("KO", 63.2));
		expect(result.current.live.savedTickers.has("KO")).toBe(true);
		expect(result.current.live.deck?.saved ?? []).toEqual([]);
	});
});

describe("every stock (D3, D8)", () => {
	it("draws every range of NVDA and gives it the phones' coverage, its own story and its peer table", () => {
		const { result } = renderHook(
			() => ({ d: useStockDetail("NVDA").data, d1: useStockChart("NVDA", "1D", "1M"), w1: useStockChart("NVDA", "1W", "1M"), m1: useStockChart("NVDA", "1M", "1M"), y1: useStockChart("NVDA", "1Y", "1M") }),
			{ wrapper },
		);
		for (const line of [result.current.d1, result.current.w1, result.current.m1, result.current.y1]) {
			expect(line.kind).toBe("live");
			if (line.kind === "live") expect(line.closes.at(-1)).toBe(122.1);
		}
		const d = result.current.d;
		// the phones' tiles, the same figures as the Compare table's NVDA column (N14a); the catalog's 49.6 is not shown
		expect(d.numbers.stats.map((s) => `${s.value} ${s.note}`)).toEqual(["52.8 Rich", "62% Explosive", "48.9% Strong"]);
		expect(d.compare.table?.rows.slice(0, 3).map((r) => r.cells[0]!.text)).toEqual(["52.8", "+62%", "48.9%"]);
		expect(d.analyst?.upside).toBe("↑ 17.9% upside");
		expect(d.news.articles[0]?.story).toBe("nvidia-chip-rally");
		expect(d.compare.sub).toBe("vs AMD · TSM");
		expect(d.compare.table?.columns).toEqual(["NVDA", "AMD", "TSM"]);
	});

	it("shows no move and no line for a company without a quote (discover-stock #14); its News signal says there is no price (N39c)", () => {
		const { result } = renderHook(() => ({ d: useStockDetail("SNAP").data, line: useStockChart("SNAP", "1M", "1M") }), { wrapper });
		expect(result.current.d.price).toBe("—");
		expect(result.current.d.change).toBe("—");
		expect(result.current.d.news.move).toBe("No price right now, so no move to show");
		// everything else of the signal stays: the two lines and the cards
		expect(result.current.d.news.lines).toHaveLength(2);
		expect(result.current.d.news.articles).toHaveLength(4);
		expect(result.current.line).toEqual({ kind: "none" });
	});

	it("says a company without a price has none: no tracking promised, Practice buy refused, no range tabs (N30.8c, N27n)", async () => {
		const { result } = renderHook(() => ({ live: useLive(), detail: useStockDetail("SNAP") }), { wrapper });
		const d = result.current.detail.data;
		expect(d.priced).toBe(false);
		expect(d.saveIntro.body).toBe("Save it and this card starts tracking once SNAP has a price.");
		expect(d.cta.refusal).toBe(refusalLine("no-price", { ticker: "SNAP", side: "buy" }));
		expect(d.cta.refusal).toBe("SNAP has no price right now, so it cannot be bought");
		// its Analyst view still opens, without the dollar parts: the consensus and the ratings, the caption in the
		// range's place (N39a)
		expect(d.analyst?.noTargets).toBe("No price right now to set targets against");
		expect(d.analyst?.upside).toMatch(/^Consensus (Buy|Hold|Sell) · \d+ of \d+ analysts$/);
		expect(d.analyst?.actions.map((a) => a.target)).toEqual(["", "", "", "", ""]);
		// saved without a price: it starts tracking once there is one
		await act(() => result.current.live.actions.save("SNAP", null));
		expect(result.current.detail.data.saveIntro.body).toBe("Saved today. SNAP starts tracking once it has a price.");
		// the chart card says it in words, with no tabs to press
		const { container } = render(<PerformanceChart stock={d} card="#181f30" selected="#181f30" />, { wrapper });
		expect(container.querySelectorAll("button")).toHaveLength(0);
		expect(container.textContent).toContain(NO_PRICE.header);
		expect(container.querySelector("[data-chart-empty]")?.textContent).toBe(NO_PRICE.plot("SNAP"));
		// a priced company keeps its four tabs, its cash line and no refusal
		const nvda = renderHook(() => useStockDetail("NVDA").data, { wrapper }).result.current;
		expect([nvda.priced, nvda.cta.refusal, nvda.cta.cash]).toEqual([true, undefined, "Cash available  $8,800.00"]);
	});

	it("pairs line one with the next-earnings line from the clock for every company (N23n, N39c)", () => {
		const { result } = renderHook(() => ({ nvda: useStockDetail("NVDA").data, goog: useStockDetail("GOOGL").data, tsla: useStockDetail("TSLA").data }), { wrapper });
		expect(result.current.nvda.news.lines).toHaveLength(2);
		expect(result.current.nvda.news.lines[0]).toMatch(/^Nvidia rose about 9%/);
		expect(result.current.nvda.news.lines[1]).toBe(nextEarningsLine("NVDA"));
		// no story of the site's: the catalog's commentary, then the phones' earnings line (no "No fresh headlines today.")
		expect(result.current.goog.news.lines).toEqual(["Steady growth from ads.", nextEarningsLine("GOOGL")]);
		expect(result.current.goog.news.articles.length).toBeGreaterThanOrEqual(2);
		// a company the phones do not author: its story's first point, then its own earnings day
		expect(result.current.tsla.news.lines).toEqual(["Tesla delivered about 412,000 cars, ahead of the 395,000 expected.", nextEarningsLine("TSLA")]);
		expect(result.current.tsla.news.lines[1]).toMatch(/^Next earnings land [A-Z][a-z]{2} \d{1,2}\.$/);
		// one display name per company (N30.8f): Alphabet on its own page, never "AMD · AMD"
		expect(result.current.goog.ticker).toBe("GOOGL · Alphabet");
		expect(result.current.nvda.ticker).toBe("NVDA · NVIDIA");
	});

	it("gives a company the phones do not author its own generated coverage (N39a), never 'No analyst coverage yet'", () => {
		const { result } = renderHook(() => useStockDetail("TSLA").data, { wrapper });
		const demo = demoCoverage("TSLA")!;
		expect(result.current.analyst).toEqual(analystFrom(demo.data, demo.actions, 248.5));
		expect(result.current.analyst?.noTargets).toBeUndefined();
		expect(result.current.news.articles[0]?.story).toBe("tesla-deliveries");
		// a company the phones do not author keeps the catalog's tiles, the figures of its catalog-built table
		expect(result.current.numbers.stats.map((s) => s.value)).toEqual(["391.3", "-3.1%", "3.4%"]);
		expect(result.current.compare.table?.rows.slice(0, 3).map((r) => r.cells[0]!.text)).toEqual(["391.3", "-3.1%", "3.4%"]);
	});

	it("opens a table for the two companies the catalog names no peers for", () => {
		const { result } = renderHook(() => ({ or: useStockDetail("LRLCY").data.compare, spce: useStockDetail("SPCE").data.compare }), { wrapper });
		expect(result.current.or.sub).toBe("vs NKE · EL");
		expect(result.current.or.table?.columns).toEqual(["LRLCY", "NKE", "EL"]);
		expect(result.current.spce.table?.columns).toHaveLength(3);
	});
});

describe("a frame-only save: the showcase's My STAK cards open stocks the persona never saved (review 1, N17e)", () => {
	it("reads the phones' demo line under SINCE YOU SAVED while the showcase lasts, never the unsaved body", () => {
		const { result } = renderHook(() => useStockDetail("NVDA", { previewSaved: true, preview: true }), { wrapper });
		expect(result.current.saved).toBe(true);
		expect(result.current.data.saveIntro.saved).toBe("SINCE YOU SAVED");
		expect(result.current.data.saveIntro.delta).toBe("+4.6%");
		// NVDA is no steady giant (beta over 1): the frame line's closing remark is left off (N28a)
		expect(result.current.data.saveIntro.body).toBe("Saved 5 weeks ago. NVDA is up 4.6% since, moving roughly with the market.");
		expect(result.current.data.saveIntro.body).not.toMatch(/^Save it/);
	});

	it("leaves the unsaved page its own copy, and a real save its own line", async () => {
		const { result } = renderHook(() => ({ live: useLive(), plain: useStockDetail("NVDA"), opened: useStockDetail("NVDA", { previewSaved: true, preview: true }) }), { wrapper });
		expect(result.current.plain.data.saveIntro.body).toBe("Save it and this card starts tracking how it moves from today’s price.");
		// the person saves it for real: the page reads their own save, whatever the URL asked for
		await act(() => result.current.live.actions.save("NVDA", 122.1));
		expect(result.current.opened.data.saveIntro.delta).toBe("0.0%");
		expect(result.current.opened.data.saveIntro.body).toBe("Saved today. NVDA hasn\u2019t moved since you saved it; check back after a few sessions.");
	});

	it("reads the phones' no-record line once the showcase is over", async () => {
		const { result } = renderHook(() => ({ live: useLive(), opened: useStockDetail("GOOGL", { previewSaved: true, preview: true }) }), { wrapper });
		await act(() => result.current.live.actions.save("KO", 63.2));
		expect(result.current.opened.saved).toBe(true);
		expect(result.current.opened.data.saveIntro.delta).toBe("0.0%");
		expect(result.current.opened.data.saveIntro.body).toBe("Saved recently. GOOGL hasn\u2019t moved since you saved it; check back after a few sessions.");
	});
});

describe("the chart's live series clears the header (N20b)", () => {
	function Chart({ symbol }: { symbol: string }) {
		const { data } = useStockDetail(symbol);
		return <PerformanceChart stock={data} card="#181f30" selected="#181f30" />;
	}
	const points = (svg: Element) =>
		svg
			.querySelector("polyline")!
			.getAttribute("points")!
			.split(" ")
			.map((pt) => pt.split(",").map(Number) as [number, number]);

	afterEach(() => vi.restoreAllMocks());

	it("draws the series in the vector's own box (692 x 122 at 13, 60), with no halo on the figures", () => {
		// nothing is laid out in this DOM, so no header is measured: the whole box
		const { container } = render(<Chart symbol="NVDA" />, { wrapper });
		const svg = container.querySelector('svg[data-chart-line="live"]')!;
		expect(svg.getAttribute("viewBox")).toBe(`0 0 ${CHART_BOX.width} ${CHART_BOX.height}`);
		expect(svg.getAttribute("class")).toContain("left-[13px] top-[60px] h-[122px]");
		const ys = points(svg).map((p) => p[1]);
		expect(ys.length).toBeGreaterThan(10);
		expect(Math.min(...ys)).toBe(0);
		expect(Math.max(...ys)).toBe(CHART_BOX.height);
		// the price block is the frames' plain text: no drawn effect
		const figures = container.querySelector("[data-chart-figures]") as HTMLElement;
		expect(figures.textContent).toContain("$122.10");
		expect(figures.getAttribute("style")).toBeNull();
	});

	it("keeps every range of rising and falling companies 8 px under the texts it passes by, as they are measured", () => {
		// the card and its header as Chrome lays them out at 1440, in a canvas zoomed to 0.75 (the scale is taken out)
		const zoom = 0.75;
		const header = [
			{ left: 40, top: 20, right: 150, bottom: 36 },
			{ left: 40, top: 40, right: 181, bottom: 83 },
			{ left: 40, top: 87, right: 128, bottom: 104 },
		];
		const rect = (l: number, t: number, r: number, b: number) => ({ left: l * zoom, top: t * zoom, right: r * zoom, bottom: b * zoom, width: (r - l) * zoom, height: (b - t) * zoom, x: l * zoom, y: t * zoom, toJSON: () => ({}) }) as DOMRect;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			const at = this.parentElement?.hasAttribute("data-chart-figures") ? [...this.parentElement.children].indexOf(this) : -1;
			if (at >= 0) return rect(100 + header[at]!.left, 300 + header[at]!.top, 100 + header[at]!.right, 300 + header[at]!.bottom);
			if (this.querySelector(":scope > [data-chart-figures]")) return rect(100, 300, 100 + 744, 300 + 220);
			return rect(0, 0, 0, 0);
		});
		let lowered = 0;
		for (const symbol of ["NVDA", "TSLA", "ENPH", "KO", "MSFT", "COST"]) {
			const { container, unmount } = render(<Chart symbol={symbol} />, { wrapper });
			for (const tab of ["1D", "1W", "1M", "1Y"]) {
				act(() => [...container.querySelectorAll("button")].find((b) => b.textContent === tab)!.click());
				const svg = container.querySelector('svg[data-chart-line="live"]')!;
				const pts = points(svg);
				// the line ends on the box's bottom edge whatever its height
				expect(Math.max(...pts.map((p) => p[1]))).toBe(CHART_BOX.height);
				if (Number(svg.getAttribute("data-plot-height")) < CHART_BOX.height) lowered++;
				for (const t of header) {
					for (let i = 0; i < pts.length - 1; i++) {
						const [x0, y0] = pts[i]!;
						const [x1, y1] = pts[i + 1]!;
						// the segment's part beside the text (the box is 692 wide at 1440: one viewBox unit is one px)
						const a = Math.max(x0, t.left - HEADER_CLEAR - 13);
						const b = Math.min(x1, t.right + HEADER_CLEAR - 13);
						if (a > b) continue;
						for (const x of [a, b]) {
							const y = 60 + y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
							expect(y - LINE_STROKE / 2 - t.bottom, `${symbol} ${tab} beside the text ending at ${t.bottom}`).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
						}
					}
				}
			}
			unmount();
		}
		// some of the twenty-four lines start high enough to need it (otherwise this test proves nothing)
		expect(lowered).toBeGreaterThan(0);
	});

	it("colours the day's move by its sign", () => {
		const { container } = render(
			<>
				<Chart symbol="NVDA" />
				<Chart symbol="ENPH" />
				<Chart symbol="SNAP" />
			</>,
			{ wrapper },
		);
		const moves = [...container.querySelectorAll("[data-chart-figures] > p:last-child")].map((p) => [p.textContent, /text-\[#[0-9a-f]{6}\]/.exec(p.className)?.[0]]);
		expect(moves.map((m) => m[1])).toEqual(["text-[#2fd08a]", "text-[#e5484d]", "text-[#819abb]"]);
		expect(moves[0]![0]).toBe("▲ 2.4% today");
		expect(moves[1]![0]).toBe("▼ 2.3% today");
		// a company without a price says so where the move would stand (N30.8c)
		expect(moves[2]![0]).toBe(NO_PRICE.header);
	});
});

describe("the chart keeps the header's 8 px over the range tabs, as the row is measured (review r2b low 3, D1)", () => {
	function Chart({ symbol }: { symbol: string }) {
		const { data } = useStockDetail(symbol);
		return <PerformanceChart stock={data} card="#181f30" selected="#181f30" />;
	}
	afterEach(() => vi.restoreAllMocks());

	it("draws no range of ENPH, NVDA or COIN within 8 px of the row, and still 8 px under the header", () => {
		// the card, its header and its range row as Chrome lays them out at 1440 (2:3461: the row at 566, 182, 159 x 22)
		const header = [
			{ left: 40, top: 20, right: 150, bottom: 36 },
			{ left: 40, top: 40, right: 181, bottom: 83 },
			{ left: 40, top: 87, right: 128, bottom: 104 },
		];
		const row = { left: 566, top: 182, right: 725, bottom: 204 };
		const rect = (l: number, t: number, r: number, b: number) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t, x: l, y: t, toJSON: () => ({}) }) as DOMRect;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			const at = this.parentElement?.hasAttribute("data-chart-figures") ? [...this.parentElement.children].indexOf(this) : -1;
			if (at >= 0) return rect(100 + header[at]!.left, 300 + header[at]!.top, 100 + header[at]!.right, 300 + header[at]!.bottom);
			if (this.hasAttribute("data-chart-ranges")) return rect(100 + row.left, 300 + row.top, 100 + row.right, 300 + row.bottom);
			if (this.querySelector(":scope > [data-chart-figures]")) return rect(100, 300, 100 + 744, 300 + 220);
			return rect(0, 0, 0, 0);
		});
		let raised = 0;
		for (const symbol of ["ENPH", "NVDA", "COIN"]) {
			const { container, unmount } = render(<Chart symbol={symbol} />, { wrapper });
			for (const tab of ["1D", "1W", "1M", "1Y"]) {
				act(() => [...container.querySelectorAll("button")].find((b) => b.textContent === tab)!.click());
				const svg = container.querySelector('svg[data-chart-line="live"]')!;
				const pts = svg
					.querySelector("polyline")!
					.getAttribute("points")!
					.split(" ")
					.map((pt) => pt.split(",").map(Number) as [number, number]);
				const [top, height] = [Number(svg.getAttribute("data-plot-top")), Number(svg.getAttribute("data-plot-height"))];
				// the series spans its band, inside the vector's box
				expect(Math.min(...pts.map((q) => q[1]))).toBeCloseTo(top, 1);
				expect(Math.max(...pts.map((q) => q[1]))).toBeCloseTo(top + height, 1);
				expect(top + height).toBeLessThanOrEqual(CHART_BOX.height + 0.01);
				if (top + height < CHART_BOX.height - 0.5) raised++;
				for (let i = 0; i < pts.length - 1; i++) {
					const [x0, y0] = pts[i]!;
					const [x1, y1] = pts[i + 1]!;
					const yAt = (x: number) => 60 + y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
					// over the row (its reach: 8 px to its left, to the plot's right edge): the ink stays 8 px above its top edge
					const a = Math.max(x0, row.left - HEADER_CLEAR - 13);
					if (a <= x1) for (const x of [a, x1]) expect(row.top - (yAt(x) + LINE_STROKE / 2), `${symbol} ${tab} over the range row at x ${x}`).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
					// beside the header: still 8 px under each text
					for (const t of header) {
						const from = Math.max(x0, t.left - HEADER_CLEAR - 13);
						const to = Math.min(x1, t.right + HEADER_CLEAR - 13);
						if (from > to) continue;
						for (const x of [from, to]) expect(yAt(x) - LINE_STROKE / 2 - t.bottom, `${symbol} ${tab} beside the text ending at ${t.bottom}`).toBeGreaterThanOrEqual(HEADER_CLEAR - 0.05);
					}
				}
			}
			unmount();
		}
		// some of the twelve lines are low over the tabs (ENPH's month on the user's page), otherwise this proves nothing
		expect(raised).toBeGreaterThan(0);
	});
});

describe("the chart measures the header it draws, whenever it starts drawing it (review r2b low 7)", () => {
	const header = [
		{ left: 40, top: 20, right: 150, bottom: 36 },
		{ left: 40, top: 40, right: 181, bottom: 83 },
		{ left: 40, top: 87, right: 128, bottom: 104 },
	];
	const rect = (l: number, t: number, r: number, b: number) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t, x: l, y: t, toJSON: () => ({}) }) as DOMRect;
	const laidOut = () =>
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			const at = this.parentElement?.hasAttribute("data-chart-figures") ? [...this.parentElement.children].indexOf(this) : -1;
			if (at >= 0) return rect(header[at]!.left, header[at]!.top, header[at]!.right, header[at]!.bottom);
			if (this.querySelector(":scope > [data-chart-figures]")) return rect(0, 0, 744, 220);
			return rect(0, 0, 0, 0);
		});
	/** The chart of a company whose price is missing at first (a quote that fails) and arrives later (a refetch). */
	function Chart({ symbol, priced }: { symbol: string; priced: boolean }) {
		const { data } = useStockDetail(symbol);
		const stock = priced ? data : { ...data, priced: false, price: "—", change: "—", changeShort: "—" };
		return <PerformanceChart stock={stock} card="#181f30" selected="#181f30" />;
	}
	const plotOf = (container: HTMLElement) => {
		const svg = container.querySelector('svg[data-chart-line="live"]');
		return svg ? { height: Number(svg.getAttribute("data-plot-height")), first: Number(svg.querySelector("polyline")!.getAttribute("points")!.split(" ")[0]!.split(",")[1]) } : null;
	};
	afterEach(() => vi.restoreAllMocks());

	it("lowers a falling line under the header of a card that first rendered without a price", () => {
		laidOut();
		// a company whose month starts at its high: mounted with its price, the line is lowered under the header
		const falling = ["ENPH", "TSLA", "KO", "MSFT", "COST", "NVDA", "COIN"].find((symbol) => {
			const { container, unmount } = render(<Chart symbol={symbol} priced />, { wrapper });
			const plot = plotOf(container);
			unmount();
			return !!plot && plot.height < CHART_BOX.height;
		});
		expect(falling).toBeDefined();
		const control = render(<Chart symbol={falling!} priced />, { wrapper });
		const want = plotOf(control.container)!;
		control.unmount();
		expect(want.height).toBeLessThan(CHART_BOX.height);

		// the same card, first without a price: words, no line, no tabs
		const { container, rerender } = render(<Chart symbol={falling!} priced={false} />, { wrapper });
		expect(plotOf(container)).toBeNull();
		expect(container.textContent).toContain(NO_PRICE.header);
		expect(container.querySelectorAll("button")).toHaveLength(0);
		// the price arrives: the header it now draws is measured, and the line sits under it exactly as on a fresh mount
		// (before, the measure had run once, on the priceless card, and the line was drawn at the whole 122 through the price)
		rerender(<Chart symbol={falling!} priced />);
		const got = plotOf(container)!;
		expect(got).toEqual(want);
		expect(60 + got.first - LINE_STROKE / 2).toBeGreaterThanOrEqual(104 + HEADER_CLEAR - 0.05);
		// and back again: no price, no stale line; then priced once more
		rerender(<Chart symbol={falling!} priced={false} />);
		expect(plotOf(container)).toBeNull();
		rerender(<Chart symbol={falling!} priced />);
		expect(plotOf(container)).toEqual(want);
	});
});

describe("the News signal's article row is drawn only when there are articles (review r2b medium 1)", () => {
	const noop = () => {};
	function Page({ symbol, articles }: { symbol: string; articles?: StockArticle[] }) {
		const { data } = useStockDetail(symbol);
		const stock = articles ? { ...data, news: { ...data.news, articles } } : data;
		return <StockDetail stock={stock} saved={false} open={false} tone="base" from="discover" onBack={noop} onToggleSaved={noop} onToggleOpen={noop} onPracticeBuy={noop} />;
	}
	/** Everything Tab stops on. */
	const stops = (root: Element) => [...root.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")].filter((e) => !e.hasAttribute("disabled") && e.getAttribute("tabindex") !== "-1");
	const plain: StockArticle[] = [1, 2, 3, 4].map((i) => ({ source: `Newswire · ${i}h ago`, tone: "Neutral", text: `Headline number ${i}` }));
	afterEach(() => vi.restoreAllMocks());

	// every company's real row (its story links and its explainer) is rendered under a router in signal.sheet.unit.test.tsx
	it("has no region and no extra tab stop for a page without articles, priced or not", () => {
		for (const symbol of ["ENPH", "BABA"]) {
			const { container, unmount } = render(<Page symbol={symbol} articles={[]} />, { wrapper });
			expect(container.querySelector("[role=region]")).toBeNull();
			expect(container.querySelector("[tabindex]")).toBeNull();
			// every stop is a real control (Back, the range tabs, the stat tiles, Save, Practice buy, the two disclosures)
			expect(stops(container).length).toBeGreaterThan(3);
			expect(stops(container).filter((e) => e.tagName !== "BUTTON")).toEqual([]);
			unmount();
		}
	});

	it("keeps a tab stop of its own only for cards that open nothing in a row that scrolls sideways", () => {
		// four cards that open nothing, in a row they fit in: a named region, no stop
		let view = render(<Page symbol="ENPH" articles={plain} />, { wrapper });
		const region = () => view.container.querySelector("[role=region]") as HTMLElement;
		expect(region().getAttribute("aria-label")).toBe("ENPH headlines");
		expect(region().children).toHaveLength(4);
		expect(region().hasAttribute("tabindex")).toBe(false);
		view.unmount();
		// the same cards in a row narrower than they are (Figma's 856 of cards in the 744 card): the row is the one way to
		// bring the cut cards in from the keyboard, so it takes the focus itself
		vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (this: Element) {
			return this.getAttribute("role") === "region" ? 856 : 0;
		});
		vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
			return this.getAttribute("role") === "region" ? 744 : 0;
		});
		view = render(<Page symbol="ENPH" articles={plain} />, { wrapper });
		expect(region().getAttribute("tabindex")).toBe("0");
		expect(stops(view.container).filter((e) => e.tagName !== "BUTTON")).toEqual([region()]);
		view.unmount();
		// cards that open their source are the stops themselves, whether the row scrolls or not
		const linked = plain.map((a, i) => ({ ...a, url: `https://example.com/story-${i}` }));
		view = render(<Page symbol="ENPH" articles={linked} />, { wrapper });
		expect(region().hasAttribute("tabindex")).toBe(false);
		expect(region().querySelectorAll("a[href]")).toHaveLength(4);
		view.unmount();
	});
});

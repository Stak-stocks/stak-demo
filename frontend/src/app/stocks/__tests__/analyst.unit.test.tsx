import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
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
// a fund card's company rows are router Links (N43a): an anchor to the page each opens is all these tests need
vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	Link: ({ to, params, children, viewTransition: _vt, ...rest }: { to: string; params?: { symbol?: string }; children: ReactNode; viewTransition?: boolean }) => (
		<a href={params?.symbol ? to.replace("$symbol", params.symbol) : to} {...rest}>
			{children}
		</a>
	),
}));

import { findOpener, markOf } from "@/app/focusReturn";
import { allTickers, brandByTicker, collectionOf, loadCatalog } from "@/app/live/catalog";
import { guestStore, localStore } from "@/app/live/guest";
import { demoQuote } from "@/app/live/quotes";
import { AAPL_COVERAGE, PHONE_COVERAGE } from "../coverage";
import { type AnalystView, stockDetails } from "../data";
import {
	analystCount,
	authoredFirms,
	CENTS_UNDER,
	figuresScore,
	fiveRatings,
	generateCoverage,
	generatedCoverage,
	MAX_ANALYSTS,
	MIN_ANALYSTS,
	RECENT,
	ratingSplit,
	streamFor,
	targetRange,
} from "../demoCoverage";
import { analystFrom, consensusLine, demoCoverage, FUND_FOLDED, FUND_LABEL, fundAnalyst, fundCaption, NO_TARGETS, upsideLine, useStockDetail } from "../live";
import { isFund } from "../signal";
import { StockDetail } from "../StockDetail";

beforeAll(() => loadCatalog());

/** The phones' nineteen (their eighteen and AAPL, whose record is Figma's own card). */
const AUTHORED = [...Object.keys(PHONE_COVERAGE), "AAPL"];
const authoredOf = (T: string) => (T === "AAPL" ? AAPL_COVERAGE : PHONE_COVERAGE[T]!);
const priceOf = (T: string) => demoQuote(T)?.price ?? null;
/** The card the page draws while the API is down: the demo coverage at the demo price, a fund's own card (live.ts useStockDetail). */
const cardOf = (T: string): AnalystView | null => {
	const demo = demoCoverage(T);
	return demo ? analystFrom(demo.data, demo.actions, priceOf(T)) : fundAnalyst(T);
};
const dollars = (s: string) => Number(s.replace(/[$,]/g, ""));
/** A target as the card prints it: cents under $20 (N43b), whole dollars from $20 up. */
const targetText = (price: number) => (price < CENTS_UNDER ? /^\$\d+\.\d0$/ : /^\$[\d,]+$/);
/** The two index funds (N43a): their card says analysts rate the companies they track. */
const FUNDS = ["SPY", "QQQ"];
/** A stream that always draws the middle: every plus-or-minus of the rules is zero. */
const middle = () => 0.5;

describe("an Analyst view for every catalog company (N39a)", () => {
	it("opens a card for every company: targets for the priced, the consensus and the caption for the rest", () => {
		const tickers = allTickers();
		expect(tickers.length).toBeGreaterThanOrEqual(333);
		let priced = 0;
		for (const T of tickers) {
			const view = cardOf(T);
			expect([T, view !== null]).toEqual([T, true]);
			if (isFund(T)) {
				// an index fund's card: the companies it tracks, never ratings of the fund (N43a, below)
				expect([T, view!.fund?.caption]).toEqual([T, fundCaption(T)]);
				if (priceOf(T) !== null) priced++;
				continue;
			}
			expect(view!.actions).toHaveLength(RECENT);
			if (priceOf(T) !== null) {
				priced++;
				expect([T, view!.noTargets]).toEqual([T, undefined]);
				expect([T, view!.upside]).toEqual([T, expect.stringMatching(/^(↑ \d+\.\d% upside|↓ \d+\.\d% downside)$/)]);
				for (const a of view!.actions) expect([T, a.target]).toEqual([T, expect.stringMatching(targetText(priceOf(T)!))]);
				for (const [, figure] of [view!.low, view!.avg, view!.high]) expect([T, figure]).toEqual([T, expect.stringMatching(targetText(priceOf(T)!))]);
			} else {
				// the same card without its dollar parts: no figure in dollars anywhere it draws
				expect([T, view!.noTargets]).toEqual([T, NO_TARGETS]);
				const drawn = [view!.upside, view!.noTargets, view!.consensusLabel, ...view!.counts, ...view!.actions.flatMap((a) => [a.firm, a.rating, a.target])];
				expect([T, drawn.join(" ")]).not.toEqual([T, expect.stringContaining("$")]);
				expect(view!.actions.every((a) => a.target === "")).toBe(true);
			}
		}
		expect(priced).toBe(tickers.filter((t) => priceOf(t) !== null).length);
	});

	it("draws the same card on every visit for the same ticker, whatever the clock says", () => {
		const sample = ["PLTR", "KO", "EAT", "SPY", "BRK.B", "TSLA", "ACHR"];
		const first = sample.map((T) => [generateCoverage(T, priceOf(T)), cardOf(T)]);
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date(2027, 4, 1, 9, 41));
			expect(sample.map((T) => [generateCoverage(T, priceOf(T)), cardOf(T)])).toEqual(first);
		} finally {
			vi.useRealTimers();
		}
		// a stream is the ticker's and the rule's alone
		const draws = (T: string, rule: string) => Array.from({ length: 4 }, streamFor(T, rule));
		expect(draws("PLTR", "split")).toEqual(draws("pltr", "split"));
		expect(draws("PLTR", "split")).not.toEqual(draws("PLTR", "targets"));
		// and two companies get two cards
		expect(generateCoverage("PLTR", 28.4)).not.toEqual(generateCoverage("SNOW", 28.4));
		expect(generateCoverage("NOSUCH", 10)).toBeNull();
		expect(demoCoverage("NOSUCH")).toBeNull();
	});

	it("keeps Low < Avg < High around the price, every firm's target inside the range on the side its rating says", () => {
		for (const T of allTickers().filter((t) => priceOf(t) !== null && !AUTHORED.includes(t) && !isFund(t))) {
			const price = priceOf(T)!;
			const view = cardOf(T)!;
			const [low, avg, high] = [dollars(view.low[1]), dollars(view.avg[1]), dollars(view.high[1])];
			expect([T, low < avg && avg < high]).toEqual([T, true]);
			expect([T, low < price && price < high]).toEqual([T, true]);
			// computed exactly as the nineteen: from the targets as printed and the price (N23k)
			expect([T, view.upside]).toEqual([T, upsideLine(((avg - price) / price) * 100)]);
			expect([T, view.rangeMarker]).toEqual([T, Math.round(((price - low) / (high - low)) * (328 - 14))]);
			for (const a of view.actions) {
				const t = dollars(a.target);
				expect([T, a.firm, t >= low && t <= high]).toEqual([T, a.firm, true]);
				if (a.rating === "Buy") expect([T, a.firm, t > price]).toEqual([T, a.firm, true]);
				if (a.rating === "Sell") expect([T, a.firm, t < price]).toEqual([T, a.firm, true]);
			}
		}
		// the cheapest prices keep their orders on 10-cent steps (N43b), from $20 up in whole dollars; a price the steps
		// cannot hold has no range
		for (const price of [2.05, 4.85, 7.4, 7.45, 12.4, 19.99, 20, 23.1, 918.2]) {
			for (const share of [0.15, 0.55, 0.92]) {
				const t = targetRange(price, share, share > 0.5 ? 40 : -20, 2.5, middle)!;
				expect([price, share, t.low < t.avg && t.avg < t.high && t.low < price && price < t.high]).toEqual([price, share, true]);
				const steps = [t.low, t.avg, t.high].map((x) => (price < CENTS_UNDER ? x * 10 : x));
				expect([price, steps.every((x) => Math.abs(x - Math.round(x)) < 1e-9)]).toEqual([price, true]);
			}
		}
		expect(targetRange(0, 0.5, 10, 1, middle)).toBeNull();
	});

	it("counts analysts by market cap, and the Buy / Hold / Sell counts add up to them", () => {
		for (const T of allTickers().filter((t) => !AUTHORED.includes(t) && !isFund(t))) {
			const c = generateCoverage(T, priceOf(T))!;
			expect([T, c.buy + c.hold + c.sell]).toEqual([T, c.analysts]);
			expect([T, c.analysts >= MIN_ANALYSTS && c.analysts <= MAX_ANALYSTS]).toEqual([T, true]);
			const view = cardOf(T)!;
			expect(view.consensusLabel).toBe(`WALL ST. CONSENSUS · ${c.analysts} ANALYSTS`);
			expect(view.counts).toEqual([`● Buy ${c.buy}`, `Hold ${c.hold}`, `Sell ${c.sell}`]);
			expect(view.consensusFill).toBe(Math.round((c.buy / c.analysts) * 328));
		}
		// bigger companies draw more coverage; never fewer than the five firms a card lists
		const counts = [2e8, 1e9, 1e10, 1e11, 1e12, 3e12].map((cap) => analystCount(cap, middle));
		expect(counts).toEqual([...counts].sort((a, b) => a - b));
		expect(counts[0]).toBe(MIN_ANALYSTS);
		expect(counts[5]).toBeGreaterThan(counts[2]! * 2);
	});

	it("leans the split the way the company's own figures point (companies whose figures point opposite ways)", () => {
		// shrinking, loss-making or priced far above their earnings ...
		const weak = ["MRNA", "RIVN", "INTC", "TSLA", "PTON"];
		// ... and growing fast with fat margins
		const strong = ["HOOD", "META", "TSM", "ASML", "KKR"];
		const share = (T: string) => {
			const c = generateCoverage(T, priceOf(T))!;
			return c.buy / c.analysts;
		};
		for (const w of weak) {
			for (const s of strong) {
				expect([w, s, share(w) < share(s)]).toEqual([w, s, true]);
			}
		}
		// the priced ones read the same way in their upside line
		for (const T of weak.filter((t) => priceOf(t) !== null)) expect([T, cardOf(T)!.upside]).toEqual([T, expect.stringMatching(/downside$/)]);
		for (const T of strong.filter((t) => priceOf(t) !== null)) expect([T, cardOf(T)!.upside]).toEqual([T, expect.stringMatching(/upside$/)]);
		// the rule itself: a better score never draws fewer Buys or more Sells; a steady beta moves Buys to Hold, a wild one adds Sells
		const scores = [-1, -0.5, 0, 0.5, 1];
		const splits = scores.map((s) => ratingSplit(40, s, 1, middle));
		for (let i = 1; i < splits.length; i++) {
			expect(splits[i]!.buy).toBeGreaterThanOrEqual(splits[i - 1]!.buy);
			expect(splits[i]!.sell).toBeLessThanOrEqual(splits[i - 1]!.sell);
		}
		expect(ratingSplit(40, 0.2, 0.4, middle).hold).toBeGreaterThan(ratingSplit(40, 0.2, 1, middle).hold);
		expect(ratingSplit(40, 0.2, 2.5, middle).sell).toBeGreaterThan(ratingSplit(40, 0.2, 1, middle).sell);
		expect(figuresScore({ pe: 25, growth: 40, margin: 35 })).toBeGreaterThan(0);
		expect(figuresScore({ pe: -10, growth: -15, margin: -20 })).toBeLessThan(0);
		expect(figuresScore({ pe: null, growth: null, margin: null })).toBe(0);
	});

	it("names only the firms the phones name, five different ones, a specialist only inside its own collection", () => {
		const phoneFirms = new Set([AAPL_COVERAGE, ...Object.values(PHONE_COVERAGE)].flatMap((c) => c.actions.map(([firm]) => firm)));
		const specialists = [...authoredFirms()].filter(([, collections]) => collections.size === 1).map(([firm, collections]) => [firm, [...collections][0]] as const);
		// KBW and Leerink Partners are among them (banks; healthcare)
		expect(Object.fromEntries(specialists)).toMatchObject({ KBW: "finance", "Leerink Partners": "healthcare" });
		for (const T of allTickers().filter((t) => !isFund(t))) {
			const view = cardOf(T)!;
			const firms = view.actions.map((a) => a.firm);
			expect([T, firms.every((f) => phoneFirms.has(f))]).toEqual([T, true]);
			expect([T, new Set(firms).size]).toEqual([T, RECENT]);
			if (AUTHORED.includes(T)) continue;
			for (const [firm, collection] of specialists) if (firms.includes(firm)) expect([T, firm, collectionOf(T)]).toEqual([T, firm, collection]);
			// the five ratings follow the split: Buy, Hold, Sell in that order, never more of one than the split counts
			const c = generateCoverage(T, priceOf(T))!;
			const ratings = view.actions.map((a) => a.rating);
			expect([T, ratings]).toEqual([T, fiveRatings(c)]);
			expect([T, ratings.filter((r) => r === "Sell").length <= c.sell && ratings.filter((r) => r === "Buy").length <= c.buy]).toEqual([T, true]);
		}
		// five times the split's shares, by largest remainder (the phones' NVDA split gives its four Buys and a Hold)
		expect(fiveRatings({ buy: 55, hold: 7, sell: 1 })).toEqual(["Buy", "Buy", "Buy", "Buy", "Hold"]);
		expect(fiveRatings({ buy: 3, hold: 1, sell: 1 })).toEqual(["Buy", "Buy", "Buy", "Hold", "Sell"]);
		expect(fiveRatings({ buy: 1, hold: 30, sell: 9 })).toEqual(["Hold", "Hold", "Hold", "Hold", "Sell"]);
	});

	it("keeps the phones' nineteen and Figma's AAPL card as authored", () => {
		for (const T of AUTHORED) {
			const c = authoredOf(T);
			const view = cardOf(T)!;
			expect([T, view.consensusLabel]).toEqual([T, `WALL ST. CONSENSUS · ${c.buy + c.hold + c.sell} ANALYSTS`]);
			expect([T, view.counts]).toEqual([T, [`● Buy ${c.buy}`, `Hold ${c.hold}`, `Sell ${c.sell}`]]);
			expect([T, view.actions.map((a) => `${a.firm} ${a.rating}`)]).toEqual([T, c.actions.map(([firm, rating]) => `${firm} ${rating}`)]);
			// never the generator's card
			expect(demoCoverage(T)).not.toEqual(generatedCoverage(T, priceOf(T)));
		}
		// the design's own card (2:3573), pixel for pixel
		expect(stockDetails.AAPL.analyst).toEqual({
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
			boxes: { cols: [28, 31, 32], counts: [49, 38, 30], rating: { Buy: 20, Hold: 24 }, target: 31 },
		});
	});

	it("draws coverage without targets only for a company without a price, its folded line the consensus", () => {
		const rec = { strongBuy: 0, buy: 18, hold: 7, sell: 1, strongSell: 0, period: null };
		const actions = [{ firm: "UBS", action: "Buy", priceTarget: null }];
		const view = analystFrom({ priceTarget: null, recommendation: rec }, actions, null)!;
		expect(view.noTargets).toBe(NO_TARGETS);
		expect(view.upside).toBe("Consensus Buy · 18 of 26 analysts");
		expect(view.actions).toEqual([{ firm: "UBS", rating: "Buy", target: "" }]);
		// a priced company nobody set targets for still has no card ("No analyst coverage yet"), as before
		expect(analystFrom({ priceTarget: null, recommendation: rec }, actions, 100)).toBeNull();
		expect(analystFrom(undefined, undefined, null)).toBeNull();
		expect(analystFrom({ priceTarget: null, recommendation: { ...rec, buy: 0, hold: 0, sell: 0 } }, [], null)).toBeNull();
		// the most analysts' rating; Hold when Hold ties for the most
		expect(consensusLine(9, 10, 2)).toBe("Consensus Hold · 10 of 21 analysts");
		expect(consensusLine(10, 10, 0)).toBe("Consensus Hold · 10 of 20 analysts");
		expect(consensusLine(2, 3, 9)).toBe("Consensus Sell · 9 of 14 analysts");
		expect(consensusLine(5, 2, 5)).toBe("Split · Buy 5, Sell 5 of 12 analysts");
	});
});

describe("the Analyst card on a stock page (N39a): a disclosure for every company", () => {
	let client: QueryClient;
	const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	const noop = () => {};
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
	/**
	 * The page with its Analyst view's open state, as the route holds it. The News signal's cards are left out: they are
	 * router links (articles), and this harness has no router; the Analyst card is what is under test.
	 */
	function Page({ symbol }: { symbol: string }) {
		const { data } = useStockDetail(symbol);
		const [open, setOpen] = useState(false);
		const stock = { ...data, news: { ...data.news, articles: [] } };
		return <StockDetail stock={stock} saved={false} open={open} tone="base" from="discover" onBack={noop} onToggleSaved={noop} onToggleOpen={() => setOpen((o) => !o)} onPracticeBuy={noop} />;
	}
	const toggle = () => screen.getByRole("button", { name: "Analyst view" });
	const card = () => toggle().parentElement as HTMLElement;

	it("opens and folds a company without a price into the card without its dollar parts", () => {
		render(<Page symbol="EAT" />, { wrapper });
		const c = generateCoverage("EAT", null)!;
		expect(toggle().tagName).toBe("BUTTON");
		expect(toggle().getAttribute("aria-expanded")).toBe("false");
		const panel = toggle().getAttribute("aria-controls")!;
		expect(document.getElementById(panel)).not.toBeNull();
		expect(card().textContent).toContain(consensusLine(c.buy, c.hold, c.sell));
		expect(card().textContent).not.toContain("No analyst coverage yet");
		fireEvent.click(toggle());
		expect(toggle().getAttribute("aria-expanded")).toBe("true");
		expect(toggle().getAttribute("aria-controls")).toBe(panel);
		const open = document.getElementById(panel)!;
		expect(open.textContent).toContain(NO_TARGETS);
		expect(open.textContent).toContain(`WALL ST. CONSENSUS · ${c.analysts} ANALYSTS`);
		expect(open.textContent).toContain("RECENT ACTIONS");
		for (const a of c.actions) expect(open.textContent).toContain(`${a.firm}${a.rating}`);
		expect(card().textContent).not.toContain("$");
		expect(card().textContent).not.toContain("PRICE TARGET RANGE");
		fireEvent.click(toggle());
		expect(toggle().getAttribute("aria-expanded")).toBe("false");
		expect(card().textContent).not.toContain(NO_TARGETS);
	});

	it("opens a priced company the phones do not author into its own range, consensus and actions", () => {
		render(<Page symbol="PLTR" />, { wrapper });
		const view = cardOf("PLTR")!;
		expect(card().textContent).toContain(view.upside);
		fireEvent.click(toggle());
		const open = document.getElementById(toggle().getAttribute("aria-controls")!)!;
		expect(open.textContent).toContain("PRICE TARGET RANGE");
		for (const [label, figure] of [view.low, view.avg, view.high]) expect(open.textContent).toContain(`${label}${figure}`);
		expect(open.textContent).toContain(view.consensusLabel);
		for (const a of view.actions) expect(open.textContent).toContain(`${a.firm}${a.rating}${a.target}`);
		expect(open.textContent).not.toContain(NO_TARGETS);
	});

	it("takes a press anywhere on the folded card, its second line included (the line passes the press to the button)", () => {
		// the shared baseline shift makes the line position: relative, over the button's stretched layer; jsdom does no
		// hit-testing, so this pins the class that passes the press through (real presses: every-stock/fix flows)
		for (const symbol of ["PLTR", "EAT"]) {
			render(<Page symbol={symbol} />, { wrapper });
			const line = [...card().querySelectorAll("p")].find((p) => p.textContent === cardOf(symbol)!.upside)!;
			expect([symbol, line.className]).toEqual([symbol, expect.stringContaining("pointer-events-none")]);
			cleanup();
		}
	});

	it("opens an index fund into the companies it tracks, each a link to its own page (N43a)", () => {
		render(<Page symbol="SPY" />, { wrapper });
		expect(card().textContent).toContain(FUND_FOLDED);
		expect(toggle().getAttribute("aria-expanded")).toBe("false");
		fireEvent.click(toggle());
		expect(toggle().getAttribute("aria-expanded")).toBe("true");
		const open = document.getElementById(toggle().getAttribute("aria-controls")!)!;
		expect(open.textContent).toContain(fundCaption("SPY"));
		expect(open.textContent).toContain(FUND_LABEL);
		// the label claims no rank: the list is the catalog's peerTickers, not the index's largest weights (QQQ's has Meta, not
		// the Amazon its own explainer names: every-stock final review)
		expect(FUND_LABEL).toBe("COMPANIES IT TRACKS");
		const links = [...open.querySelectorAll("a")];
		expect(links.map((a) => a.getAttribute("href"))).toEqual(["/stocks/NVDA", "/stocks/AAPL", "/stocks/MSFT", "/stocks/AMZN"]);
		expect(links[0]!.getAttribute("aria-label")).toBe("NVIDIA: Consensus Buy · 55 of 63 analysts");
		// Back from a company's page puts the focus on the link that was pressed (src/app/focusReturn.ts): the panel the links
		// sit in is a box, so the focus return finds it open. A display: contents panel has no box and read as closed, so the
		// toggle got the focus (every-stock final review, low). Drawn here as Chrome draws: no box for a hidden element or a
		// display: contents one (jsdom lays nothing out)
		const drawnLikeChrome = (el: Element) => !el.closest("[hidden]") && !el.classList.contains("contents");
		expect(open.classList.contains("contents")).toBe(false);
		const mark = markOf(links[0]!, drawnLikeChrome);
		expect([mark.href, mark.scope]).toEqual(["/stocks/NVDA", open.id]);
		expect(findOpener(mark, drawnLikeChrome)).toBe(links[0]);
		// no rating, target or firm for the fund itself
		for (const text of ["WALL ST. CONSENSUS", "RECENT ACTIONS", "PRICE TARGET RANGE", "$"]) expect([text, card().textContent!.includes(text)]).toEqual([text, false]);
		fireEvent.click(toggle());
		expect(toggle().getAttribute("aria-expanded")).toBe("false");
	});

	it("draws Compare and learn from the route's per-entry state when the route holds it (every-stock final review, low)", () => {
		// the route keeps the table's open state per history entry (analystOpen.ts useCompareOpen), so Back draws it as it was
		// left; the page then draws what it is given and hands the press back to the route
		const onToggle = vi.fn();
		function Held({ open }: { open: boolean }) {
			const { data } = useStockDetail("PLTR");
			const stock = { ...data, news: { ...data.news, articles: [] } };
			return <StockDetail stock={stock} saved={false} open={false} tone="base" from="discover" onBack={noop} onToggleSaved={noop} onToggleOpen={noop} onPracticeBuy={noop} compare={{ open, onToggle }} />;
		}
		const view = render(<Held open />, { wrapper });
		const compare = () => screen.getByRole("button", { name: /^Compare and learn/ });
		expect(compare().getAttribute("aria-expanded")).toBe("true");
		expect(document.getElementById(compare().getAttribute("aria-controls")!)!.querySelector("table")).not.toBeNull();
		fireEvent.click(compare());
		expect(onToggle).toHaveBeenCalledTimes(1);
		// the route decides: the table stays until the route's state says otherwise
		expect(compare().getAttribute("aria-expanded")).toBe("true");
		view.rerender(<Held open={false} />);
		expect(compare().getAttribute("aria-expanded")).toBe("false");
		expect(document.getElementById(compare().getAttribute("aria-controls")!)!.querySelector("table")).toBeNull();
	});
});

describe("an index fund's Analyst view (N43a) and cents under $20 (N43b)", () => {
	it("rates no fund: SPY and QQQ carry no firm, no analyst count and no target, only the companies they track", () => {
		const phoneFirms = new Set([AAPL_COVERAGE, ...Object.values(PHONE_COVERAGE)].flatMap((c) => c.actions.map(([firm]) => firm)));
		expect(allTickers().filter(isFund).sort()).toEqual([...FUNDS].sort());
		const expected: Record<string, string[]> = { SPY: ["NVDA", "AAPL", "MSFT", "AMZN"], QQQ: ["NVDA", "AAPL", "MSFT", "META"] };
		for (const T of FUNDS) {
			expect([T, demoCoverage(T)]).toEqual([T, null]);
			const view = cardOf(T)!;
			expect(view.upside).toBe(FUND_FOLDED);
			expect(view.fund!.caption).toBe(`Analysts rate the companies ${T} tracks, not the fund itself.`);
			expect(view.fund!.label).toBe(FUND_LABEL);
			expect([view.counts, view.actions, view.consensusLabel, view.noTargets]).toEqual([[], [], "", undefined]);
			// the catalog's peers that are companies (its peerTickers name the other fund too)
			expect(brandByTicker(T)!.peerTickers).toEqual(expect.arrayContaining(expected[T]!));
			expect(view.fund!.companies.map((c) => c.symbol)).toEqual(expected[T]);
			for (const c of view.fund!.companies) {
				// the same counts the company's own card shows
				const own = cardOf(c.symbol)!;
				const [buy, hold, sell] = own.counts.map((t) => Number(t.replace(/\D/g, "")));
				expect([T, c.symbol, c.consensus]).toEqual([T, c.symbol, consensusLine(buy!, hold!, sell!)]);
			}
			const drawn = JSON.stringify(view);
			for (const firm of phoneFirms) expect([T, firm, drawn.includes(`"${firm}"`)]).toEqual([T, firm, false]);
			expect(drawn).not.toMatch(/\$\d/);
			expect(drawn).not.toMatch(/ANALYSTS/);
		}
		// every other company keeps its own card
		expect(fundAnalyst("NVDA")).toBeNull();
	});

	it("prints targets with cents under a $20 price, every figure computed from them as printed", () => {
		const cheap = allTickers().filter((t) => priceOf(t) !== null && priceOf(t)! < CENTS_UNDER && !AUTHORED.includes(t) && !isFund(t));
		expect(cheap.sort()).toEqual(["AMC", "RIVN", "SOFI"]);
		for (const T of cheap) {
			const view = cardOf(T)!;
			const price = priceOf(T)!;
			for (const [, figure] of [view.low, view.avg, view.high]) expect([T, figure]).toEqual([T, expect.stringMatching(/^\$\d+\.\d0$/)]);
			const [low, avg, high] = [dollars(view.low[1]), dollars(view.avg[1]), dollars(view.high[1])];
			expect([T, view.upside]).toEqual([T, upsideLine(((avg - price) / price) * 100)]);
			expect([T, view.rangeFill]).toEqual([T, Math.round(((avg - low) / (high - low)) * 328)]);
			for (const a of view.actions) expect([T, a.firm, a.target]).toEqual([T, a.firm, expect.stringMatching(/^\$\d+\.\d0$/)]);
		}
		// a live card under $20 prints the API's targets with their cents; from $20 up in whole dollars, as before
		const rec = { strongBuy: 0, buy: 9, hold: 4, sell: 1, strongSell: 0, period: null };
		const live = analystFrom({ priceTarget: { low: 6.5, avg: 8.25, high: 11 }, recommendation: rec }, [{ firm: "UBS", action: "Buy", priceTarget: 9.75 }], 7.45)!;
		expect([live.low[1], live.avg[1], live.high[1], live.actions[0]!.target]).toEqual(["$6.50", "$8.25", "$11.00", "$9.75"]);
		expect(live.upside).toBe(upsideLine(((8.25 - 7.45) / 7.45) * 100));
		const whole = analystFrom({ priceTarget: { low: 65.4, avg: 82.5, high: 110 }, recommendation: rec }, [], 74.5)!;
		expect([whole.low[1], whole.avg[1], whole.high[1]]).toEqual(["$65", "$83", "$110"]);
	});
});

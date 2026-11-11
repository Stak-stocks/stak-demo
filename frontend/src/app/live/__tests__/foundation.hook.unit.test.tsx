import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Point = { ts: string; close: number };
const mocks = vi.hoisted(() => ({
	auth: { user: null as null | { uid: string; metadata: { creationTime?: string } }, loading: false },
	account: { account: null as null | Record<string, unknown>, accountLoading: false, initSandboxCash: vi.fn() },
	health: { healthy: false, settled: true },
	// the STAK API: unreachable unless a test answers for it
	api: {
		stockData: vi.fn<(symbol: string) => Promise<{ quote: { price: number; change: number; changePercent: number } | null; metrics: object }>>(),
		chart: vi.fn<(symbol: string, range: string) => Promise<{ prices: Point[] }>>(),
	},
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/AccountContext", () => ({ useAccount: () => mocks.account }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("@/lib/api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/api")>()),
	getStockData: (symbol: string) => mocks.api.stockData(symbol),
	getStockChart: (symbol: string, range: string) => mocks.api.chart(symbol, range),
}));
vi.mock("../quotes", async (importOriginal) => ({
	...(await importOriginal<typeof import("../quotes")>()),
	useApiHealthState: () => mocks.health,
	useApiHealth: () => mocks.health.healthy,
}));

import { round2, round4, shares4, signedPct } from "../format";
import { loadCatalog } from "../catalog";
import { DEMO_QUOTES } from "../demoQuotes";
import { pageshowEvent } from "./browserEvents";
import { useDeck } from "../deck";
import { guestStore, localStore } from "../guest";
import { closeAt, priceAnchorsOf, useMarketMove, usePriceHistories, usePriceHistory } from "../history";
import { usePortfolio } from "../portfolio";
import { usePortfolioValueHistory } from "../portfolioHistory";
import { PERSONA_WEEK_GAIN } from "../ledger";
import { SHOWCASE_STANDING, useStanding } from "../rank";
import { useShowcase } from "../showcase";
import { useLive } from "../store";

beforeAll(() => loadCatalog());

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
	localStorage.clear();
	guestStore().reset();
	localStore("guest").reset();
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	mocks.api.stockData.mockReset().mockRejectedValue(new Error("unreachable"));
	mocks.api.chart.mockReset().mockRejectedValue(new Error("unreachable"));
});

afterEach(() => {
	cleanup();
	client.clear();
	vi.useRealTimers();
	mocks.health.healthy = false;
	mocks.auth.user = null;
	mocks.account.account = null;
});

function useAll() {
	return { live: useLive(), pf: usePortfolio(), standing: useStanding(), showcase: useShowcase(), week: usePortfolioValueHistory("1W") };
}

describe("usePriceHistory (API down)", () => {
	it("draws a demo line for a priced company and nothing for an unknown one", () => {
		const { result } = renderHook(() => ({ nvda: usePriceHistory("NVDA", "1D"), none: usePriceHistory("ZZZZ", "1W"), off: usePriceHistory("NVDA", "1W", { enabled: false }) }), { wrapper });
		expect(result.current.nvda.status).toBe("ready");
		expect(result.current.nvda.history?.source).toBe("demo");
		expect(result.current.nvda.history?.last).toBe(122.1);
		expect(result.current.none.status).toBe("none");
		expect(result.current.off.status).toBe("none");
	});

	it("serves several companies on one clock and lists the ones without a quote", () => {
		const { result } = renderHook(() => usePriceHistories(["NVDA", "aapl", "ZZZZ"], "1M"), { wrapper });
		expect(result.current.status).toBe("ready");
		expect(Object.keys(result.current.bySymbol).sort()).toEqual(["AAPL", "NVDA"]);
		expect(result.current.missing).toEqual(["ZZZZ"]);
		expect(result.current.bySymbol.NVDA!.times.at(-1)).toBe(result.current.now);
		expect(result.current.bySymbol.AAPL!.times.at(-1)).toBe(result.current.now);
	});

	it("draws a company through what the person's ledger recorded for it: the pick-day price, the save's, a buy made now (N23a)", async () => {
		// the day of the ruling: the seed's dates (May to July 2026) lie inside the year's window
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 10, 9, 14, 30, 5));
		const { result } = renderHook(() => ({ live: useLive(), tsla: usePriceHistory("TSLA", "1Y"), many: usePriceHistories(["TSLA", "ENPH", "KO"], "1Y"), day: usePriceHistory("KO", "1D") }), { wrapper });
		const live = result.current.live;
		// NUM-02: "Picked May 20 at $210.59" stood beside a year that never went under $248.50
		const pick = live.positions.find((p) => p.ticker === "TSLA")!;
		const saved = live.saves.find((s) => s.ticker === "TSLA")!;
		const year = result.current.tsla.history!;
		expect(year.source).toBe("demo");
		expect(priceAnchorsOf("TSLA", live)).toHaveLength(2);
		expect(closeAt(year, pick.addedAt)).toBe(round2(pick.priceAtAdd!));
		expect(closeAt(year, saved.savedAt)).toBe(saved.priceAtSave);
		expect(year.low).toBeLessThanOrEqual(round2(pick.priceAtAdd!));
		expect(year.last).toBe(248.5);
		// "up 18.0%" can be read off the line
		expect(signedPct((year.last / closeAt(year, pick.addedAt) - 1) * 100)).toBe("+18.0%");
		// several companies on one clock: the same lines, each through its own records (ENPH: the user's screenshot)
		expect(result.current.many.bySymbol.TSLA!.closes).toEqual(year.closes);
		const enph = live.saves.find((s) => s.ticker === "ENPH")!;
		expect(closeAt(result.current.many.bySymbol.ENPH!, enph.savedAt)).toBe(enph.priceAtSave);
		// a company the ledger does not hold yet: bought now, at the quote: recorded, and nothing on screen moved
		const before = { year: result.current.many.bySymbol.KO!.closes, day: result.current.day.history!.closes };
		vi.setSystemTime(new Date(2026, 10, 9, 14, 30, 40));
		await act(async () => {
			await live.actions.buy("KO", 50, 63.2);
		});
		const lot = result.current.live.positions.find((p) => p.ticker === "KO")!;
		expect(priceAnchorsOf("KO", result.current.live).map((a) => a.price)).toEqual([63.2, 63.2]); // the save the buy made, and the buy
		const ko = result.current.many.bySymbol.KO!;
		expect(closeAt(ko, lot.addedAt)).toBe(63.2);
		expect(ko.closes).toEqual(before.year);
		expect(result.current.day.history!.closes).toEqual(before.day);
	});
});

describe("the showcase visitor and the first actions", () => {
	it("reads the frames' ledger and standing before any action", () => {
		const { result } = renderHook(useAll, { wrapper });
		const { pf, standing, showcase, week } = result.current;
		expect(showcase).toBe(true);
		expect(pf.cash).toBe(8800);
		expect(pf.value).toBe(10240);
		expect(pf.allTime).toBe(240);
		expect(week.change).toBe(PERSONA_WEEK_GAIN);
		expect(Math.round(week.change)).toBe(SHOWCASE_STANDING.week.change);
		expect(standing.ranked).toBe(true);
		expect(standing.week.rank).toBe(47);
		expect(signedPct(standing.week.pct)).toBe("+1.9%");
		expect(standing.allTime.pct).toBeCloseTo(2.4, 9);
		expect(standing.board("week").you?.rank).toBe(47);
	});

	it("keeps every figure through a deck decision (no trade): only the showcase ends", async () => {
		const { result } = renderHook(useAll, { wrapper });
		await act(async () => {
			await result.current.live.actions.pass("NVDA");
			result.current.live.actions.setDeck({ date: "2026-11-07", theme: "ai-chips", order: ["NVDA"], index: 1, saved: [], passed: ["NVDA"], bought: [] });
		});
		const { pf, standing, showcase } = result.current;
		expect(showcase).toBe(false);
		expect(pf.cash).toBe(8800);
		expect(pf.value).toBe(10240);
		expect(standing.week).toMatchObject({ change: PERSONA_WEEK_GAIN, rank: 47 });
	});

	it("ends the showcase for good: Save then Unsave does not bring the frames' figures back (D7 refined)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		await act(async () => {
			await result.current.live.actions.save("KO", 70.5);
		});
		expect(result.current.showcase).toBe(false);
		expect(result.current.live.touched).toBe(true);
		await act(async () => {
			await result.current.live.actions.unsave("KO");
		});
		expect(result.current.live.saves.map((s) => s.ticker)).not.toContain("KO");
		expect(result.current.showcase).toBe(false);
		expect(JSON.parse(localStorage.getItem("stak.guest.v2") ?? "{}").touched).toBe(true);
		act(() => result.current.live.actions.resetGuest());
		expect(result.current.showcase).toBe(true);
		expect(result.current.live.touched).toBe(false);
	});

	it("moves exactly the order's cost out of cash, holds the value and the week, and saves the company", async () => {
		const { result } = renderHook(useAll, { wrapper });
		expect(result.current.live.savedTickers.has("HOOD")).toBe(false);
		let fill: Awaited<ReturnType<typeof result.current.live.actions.buy>> | undefined;
		await act(async () => {
			fill = await result.current.live.actions.buy("HOOD", 100, 41.9);
		});
		expect(fill).toMatchObject({ ticker: "HOOD", cost: 100, cashAfter: 8700, holding: fill!.shares });
		const { live, pf, standing, showcase } = result.current;
		expect(showcase).toBe(false);
		expect(pf.cash).toBe(8700);
		expect(pf.value).toBe(10240);
		expect(pf.allTime).toBe(240);
		expect(live.savedTickers.has("HOOD")).toBe(true);
		expect(live.saves.find((s) => s.ticker === "HOOD")?.priceAtSave).toBe(41.9);
		expect(standing.week.change).toBe(PERSONA_WEEK_GAIN);
		expect(standing.week.rank).toBe(47);
	});

	it("reports the whole holding after a top-up and keeps a saved company's save as it was", async () => {
		const { result } = renderHook(useAll, { wrapper });
		const before = result.current.live.positions.find((p) => p.ticker === "NVDA")!.shares;
		const saves = result.current.live.saves.length;
		let fill: Awaited<ReturnType<typeof result.current.live.actions.buy>> | undefined;
		await act(async () => {
			fill = await result.current.live.actions.buy("NVDA", 25, 122.1);
		});
		// RE-DERIVED (N20d, 2026-11-09). Before: 0.2048 shares and a holding of 1.2200 (four decimals). Now the ledger keeps
		// eight: $25 / $122.10 = 0.2047502; the screens still print 0.2048.
		// RE-DERIVED AGAIN (N30.7, the exact seed, 2026-11-09 17:20): the persona's NVDA is 1.01556102 shares worth the
		// frame's $124.00 (was the frame's 1.0152, worth $123.96), so the holding is 1.22031122, shown 1.2203 (was
		// 1.2199502, shown 1.2200), and the first lot's price is $100 / 1.01556102 = $98.47 (was $98.50)
		expect(fill!.shares).toBe(0.2047502);
		expect(shares4(fill!.shares)).toBe("0.2048");
		expect(before).toBe(1.01556102);
		expect(fill!.holding).toBe(1.22031122);
		expect(fill!.holding).toBe(Math.round((before + 0.2047502) * 1e8) / 1e8);
		expect(shares4(fill!.holding)).toBe("1.2203");
		expect(fill!.cashAfter).toBe(8775);
		const nvda = result.current.live.positions.find((p) => p.ticker === "NVDA")!;
		expect(nvda.lots).toHaveLength(2);
		expect(nvda.lots![0]).toMatchObject({ shares: before, price: 100 / before });
		expect(nvda.lots![1]).toEqual({ shares: 0.2047502, price: 122.1, at: fill!.addedAt, bought: 0.2047502 });
		// the stake is the dollars paid, to the cent: $100.00 + $25.00 (the average cost is not rounded to cents)
		expect(result.current.pf.positions.find((p) => p.ticker === "NVDA")).toMatchObject({ stake: 125, value: 149, gain: 24 });
		// NVDA was not a save of the persona: the buy saved it; buying a saved company again adds no second save
		expect(result.current.live.saves.length).toBe(saves + 1);
		await act(async () => {
			await result.current.live.actions.buy("NVDA", 10, 122.1);
		});
		expect(result.current.live.saves.length).toBe(saves + 1);
		expect(result.current.pf.value).toBe(10240);
		// the top-ups' shares count from their own buy (lots), so the week holds (to a quantisation cent)
		expect(Math.abs(result.current.standing.week.change - PERSONA_WEEK_GAIN)).toBeLessThanOrEqual(0.011);
		expect(result.current.standing.week.rank).toBe(47);
	});

	it("keeps the week and the rank through a sale made after the page's clock minute (review 1, high)", async () => {
		// the page mounts at 14:30:05 (its history clock: 14:30:00) and the sale lands at 14:30:40, the case measured on
		// Simulate right after "Back to Simulate": the week must stay "+$186 (+1.9%)" and #47, not drop to +1.8% / #49
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 10, 7, 14, 30, 5));
		const { result } = renderHook(useAll, { wrapper });
		expect(result.current.standing.week).toMatchObject({ change: PERSONA_WEEK_GAIN, rank: 47 });
		vi.setSystemTime(new Date(2026, 10, 7, 14, 30, 40));
		const msft = result.current.pf.positions.find((p) => p.ticker === "MSFT")!;
		await act(async () => {
			await result.current.live.actions.sell("MSFT", msft.shares, msft.price);
		});
		expect(result.current.live.sold[0]!.soldAt).toBeGreaterThan(result.current.week.points.at(-1)!.t);
		expect(Math.abs(result.current.standing.week.change - PERSONA_WEEK_GAIN)).toBeLessThanOrEqual(0.011);
		expect(signedPct(result.current.standing.week.pct)).toBe("+1.9%");
		expect(result.current.standing.week.rank).toBe(47);
		// the rest in the same minute: everything sold, the week still the frames'
		vi.setSystemTime(new Date(2026, 10, 7, 14, 30, 50));
		for (const p of [...result.current.pf.positions]) {
			await act(async () => {
				await result.current.live.actions.sell(p.ticker, p.shares, p.price);
			});
		}
		expect(result.current.pf.positions).toHaveLength(0);
		expect(Math.abs(result.current.standing.week.change - PERSONA_WEEK_GAIN)).toBeLessThanOrEqual(0.011);
		expect(result.current.standing.week.rank).toBe(47);
		expect(Math.abs(result.current.week.end - result.current.pf.value)).toBeLessThanOrEqual(0.001);
	});

	it("keeps the value through a sale and stays ranked with everything sold", async () => {
		const { result } = renderHook(useAll, { wrapper });
		for (const p of [...result.current.live.positions]) {
			await act(async () => {
				await result.current.live.actions.sell(p.ticker, p.shares, result.current.pf.positions.find((x) => x.ticker === p.ticker)!.price);
			});
		}
		const { pf, standing } = result.current;
		expect(pf.positions).toHaveLength(0);
		expect(Math.abs(pf.value - 10240)).toBeLessThanOrEqual(0.02);
		expect(standing.ranked).toBe(true);
		expect(standing.week.rank).not.toBeNull();
	});

	it("keeps today's untouched deck when its front card is bought on its stock page (the buy saves it)", async () => {
		const first = renderHook(() => useDeck({ quotes: false }), { wrapper });
		const order = first.result.current.order;
		expect(order[0]).toBe("NVDA");
		first.unmount();
		const buyer = renderHook(() => useLive(), { wrapper });
		await act(async () => {
			await buyer.result.current.actions.buy("NVDA", 25, 122.1);
		});
		buyer.unmount();
		const again = renderHook(() => useDeck({ quotes: false }), { wrapper });
		expect(again.result.current.order).toEqual(order);
		expect(again.result.current.current?.symbol).toBe("NVDA");
		expect(again.result.current.current?.saved).toBe(true);
		expect(again.result.current.index).toBe(0);
	});

	it("leaves an account that never traded unranked", () => {
		guestStore().update({ cash: 10000, positions: [], sold: [], unlisted: false });
		const { result } = renderHook(useAll, { wrapper });
		expect(result.current.pf.value).toBe(10000);
		expect(result.current.standing.ranked).toBe(false);
		expect(result.current.standing.week.rank).toBeNull();
		expect(result.current.standing.board("week").you).toBeNull();
	});

	it("follows the stored ledger when another document changed it: a storage event, or this document back from the bfcache (review 2, high)", async () => {
		const key = "stak.guest.v2";
		const { result } = renderHook(useAll, { wrapper });
		expect(result.current.live.cash).toBe(8800);
		const stored = JSON.parse(localStorage.getItem(key)!) as { positions: { ticker: string }[] };
		// the document shown before this one came back from the back/forward cache sold MSFT on a pick page and wrote the
		// store: the browser delivers its `storage` event to this document when it is shown again
		const sold = { ...stored, cash: 8897.02, touched: true, positions: stored.positions.filter((p) => p.ticker !== "MSFT") };
		localStorage.setItem(key, JSON.stringify(sold));
		act(() => {
			window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(sold) }));
		});
		expect(result.current.live.cash).toBe(8897.02);
		expect(result.current.pf.cash).toBe(8897.02);
		expect(result.current.live.positions.map((p) => p.ticker)).not.toContain("MSFT");
		expect(result.current.showcase).toBe(false);
		// this document itself restored from the cache after yet another trade elsewhere (`pageshow`, persisted)
		localStorage.setItem(key, JSON.stringify({ ...sold, cash: 8797.02 }));
		act(() => {
			window.dispatchEvent(pageshowEvent(true));
		});
		expect(result.current.live.cash).toBe(8797.02);
		// an unchanged store, a plain navigation's pageshow and another key change nothing: the snapshot keeps its identity
		const before = result.current.live;
		act(() => {
			window.dispatchEvent(new StorageEvent("storage", { key }));
			window.dispatchEvent(pageshowEvent(false));
			window.dispatchEvent(new StorageEvent("storage", { key: "stak.something.else" }));
		});
		expect(result.current.live).toBe(before);
		// a trade placed on the refreshed document builds on the current ledger, not the stale one: the sale stays sold
		await act(async () => {
			await result.current.live.actions.buy("PLTR", 100, 28.4);
		});
		expect(result.current.live.cash).toBe(8697.02);
		expect(result.current.live.positions.map((p) => p.ticker)).not.toContain("MSFT");
		expect((JSON.parse(localStorage.getItem(key)!) as { positions: { ticker: string }[] }).positions.map((p) => p.ticker)).not.toContain("MSFT");
	});

	it("gives a migrated browser that had spent nearly everything a week in proportion to its ledger: +1.9% and #47 (review 2, low 4)", () => {
		// the reviewer's flow a7: an old $9,404 persona stored with $300 cash (no `unlisted`, the seed's sales without a
		// purchase day), migrated on load to $0 cash and a cut holding; it read "+$119 (+11.7%) this week" and "#1"
		const seed = guestStore().read();
		const old = { ...seed, cash: 300, sold: seed.sold.map(({ addedAt: _, ...s }) => s) } as Record<string, unknown>;
		delete old.unlisted;
		delete old.unlistedCut;
		delete old.touched;
		localStorage.setItem("stak.guest.v2", JSON.stringify(old));
		act(() => {
			window.dispatchEvent(new StorageEvent("storage", { key: "stak.guest.v2" }));
		});
		const { result } = renderHook(useAll, { wrapper });
		const { pf, standing, week } = result.current;
		expect(pf.cash).toBe(0);
		expect(pf.value).toBe(1136);
		expect(pf.allTime).toBe(-8864);
		expect(week.change).toBe(20.66);
		expect(signedPct(standing.week.pct)).toBe("+1.9%");
		expect(standing.week.rank).toBe(47);
		expect(standing.board("week").you?.rank).toBe(47);
	});
});

describe("the round trip through the store (N20d)", () => {
	it("buys $100 of COST and sells it all at the same price: the cash is $8,800.00 again, the value never left $10,240.00", async () => {
		const { result } = renderHook(useAll, { wrapper });
		let fill: Awaited<ReturnType<typeof result.current.live.actions.buy>> | undefined;
		await act(async () => {
			fill = await result.current.live.actions.buy("COST", 100, 918.2);
		});
		// eight decimals of a share, shown at four: the shares are worth the $100 paid (0.1089 shares were worth $99.99)
		expect(fill).toMatchObject({ shares: 0.10890873, cost: 100, cashAfter: 8700, holding: 0.10890873 });
		const cost = result.current.pf.positions.find((p) => p.ticker === "COST")!;
		expect(shares4(cost.shares)).toBe("0.1089");
		expect(cost.value).toBe(100);
		expect(result.current.pf.cash).toBe(8700);
		expect(result.current.pf.value).toBe(10240);
		// the sell sheets ask for a portion of the holding at four decimals (PickDetail / Portfolio: round4(shares x portion))
		let sale: Awaited<ReturnType<typeof result.current.live.actions.sell>> | undefined;
		await act(async () => {
			sale = await result.current.live.actions.sell("COST", round4(cost.shares * 1), cost.price);
		});
		expect(sale).toMatchObject({ shares: 0.10890873, proceeds: 100, pnl: 0, stake: 100 });
		expect(result.current.pf.cash).toBe(8800); // $8,799.99 before the ruling
		expect(result.current.live.positions.some((p) => p.ticker === "COST")).toBe(false);
		expect(result.current.pf.value).toBe(10240);
		expect(result.current.standing.week).toMatchObject({ change: PERSONA_WEEK_GAIN, rank: 47 });
	});

	it("comes back to the cent for every quoted company and every chip ($10, $25, $100, $1,000)", async () => {
		const { result } = renderHook(() => ({ live: useLive(), pf: usePortfolio() }), { wrapper });
		const began = new Map(result.current.live.positions.map((p) => [p.ticker, p.shares]));
		let trips = 0;
		for (const t of Object.keys(DEMO_QUOTES)) {
			const price = DEMO_QUOTES[t]!.price;
			for (const stake of [10, 25, 100, 1000]) {
				let fill: Awaited<ReturnType<typeof result.current.live.actions.buy>> | undefined;
				await act(async () => {
					fill = await result.current.live.actions.buy(t, stake, price);
				});
				expect(result.current.pf.cash).toBe(8800 - stake);
				expect(result.current.pf.value).toBe(10240);
				// a pick the persona already holds: sell what was just bought; any other company: the whole position, as the
				// sheet's All asks for it (the holding at four decimals)
				const asked = began.has(t) ? fill!.shares : round4(fill!.holding);
				await act(async () => {
					await result.current.live.actions.sell(t, asked, price);
				});
				expect(result.current.pf.cash).toBe(8800);
				expect(result.current.pf.value).toBe(10240);
				trips++;
			}
		}
		expect(trips).toBe(77 * 4);
		// the six picks the persona began with hold what they held
		expect(result.current.live.positions).toHaveLength(began.size);
		for (const [t, shares] of began) expect(result.current.live.positions.find((p) => p.ticker === t)?.shares).toBe(shares);
	});

	it("leaves the ledger's value where it was after selling part of a pick (half of AAPL used to cost a cent)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		const aapl = result.current.pf.positions.find((p) => p.ticker === "AAPL")!;
		// RE-DERIVED (N30.7, the exact seed): the persona's AAPL is worth the frame's $106.00 (was $106.01 on 0.4622 shares)
		expect(aapl.value).toBe(106);
		let half: Awaited<ReturnType<typeof result.current.live.actions.sell>> | undefined;
		await act(async () => {
			half = await result.current.live.actions.sell("AAPL", round4(aapl.shares * 0.5), aapl.price);
		});
		// what came back is what the position's worth dropped by, whatever the four-decimal quantity asked for
		const left = result.current.pf.positions.find((p) => p.ticker === "AAPL")!;
		expect(round2(left.value + half!.proceeds)).toBe(106);
		expect(result.current.pf.cash).toBe(round2(8800 + half!.proceeds));
		expect(result.current.pf.value).toBe(10240); // $10,239.99 before the ruling
		// the record is its own arithmetic (N29d) and says the position stayed open (N27c)
		expect(half).toMatchObject({ closed: false, price: aapl.price, pnl: round2(half!.proceeds - half!.stake) });
		expect(round2(left.stake + half!.stake)).toBe(100);
		const rest = result.current.pf.positions.find((p) => p.ticker === "AAPL")!;
		let all: Awaited<ReturnType<typeof result.current.live.actions.sell>> | undefined;
		await act(async () => {
			all = await result.current.live.actions.sell("AAPL", round4(rest.shares), rest.price);
		});
		expect(all).toMatchObject({ closed: true, pnl: round2(all!.proceeds - all!.stake) });
		// the two sales add up to the frame's dollars: $106.00 back for the $100.00 stake, +$6.00
		expect(round2(half!.proceeds + all!.proceeds)).toBe(106);
		expect(round2(half!.stake + all!.stake)).toBe(100);
		expect(round2(half!.pnl + all!.pnl)).toBe(6);
		expect(result.current.pf.cash).toBe(8906);
		expect(result.current.pf.value).toBe(10240);
		expect(Math.abs(result.current.standing.week.change - PERSONA_WEEK_GAIN)).toBeLessThanOrEqual(0.011);
		expect(result.current.standing.week.rank).toBe(47);
	});

	it("refuses a sale of no shares and leaves the ledger alone", async () => {
		const { result } = renderHook(useAll, { wrapper });
		await act(async () => {
			// the store's refusal names its reason (orders.ts, N30.3a: "invalid" became "too-small")
			await expect(result.current.live.actions.sell("NVDA", 0, 122.1)).rejects.toThrow("too-small");
			await expect(result.current.live.actions.sell("NVDA", Number.NaN, 122.1)).rejects.toThrow("too-small");
		});
		expect(result.current.pf.cash).toBe(8800);
		expect(result.current.live.positions.find((p) => p.ticker === "NVDA")?.shares).toBe(1.01556102);
		expect(result.current.showcase).toBe(true);
	});
});

describe("the API branch (the STAK API answering)", () => {
	const HOUR = 3_600_000;
	/** `n` hourly closes ending now, from `from` to `to` */
	const closes = (from: number, to: number, n = 6): Point[] =>
		Array.from({ length: n }, (_, i) => ({ ts: new Date(Date.now() - (n - 1 - i) * HOUR).toISOString(), close: Math.round((from + ((to - from) * i) / (n - 1)) * 100) / 100 }));
	const quote = (price: number, changePercent: number) => ({ quote: { price, change: Math.round((price - price / (1 + changePercent / 100)) * 100) / 100, changePercent }, metrics: {} });
	const signIn = () => {
		mocks.auth.user = { uid: "u1", metadata: { creationTime: new Date(2026, 0, 5).toUTCString() } };
		mocks.account.account = { sandboxCash: 1000, stakBrandIds: [], sandboxPortfolio: {}, totalXp: 0 };
	};

	beforeEach(() => {
		mocks.health.healthy = true;
	});

	it("signed in: loading while the closes are on their way, then the API's closes", async () => {
		signIn();
		mocks.api.stockData.mockResolvedValue(quote(130, 1.5));
		mocks.api.chart.mockResolvedValue({ prices: closes(126, 130) });
		const { result } = renderHook(() => usePriceHistory("NVDA", "1W"), { wrapper });
		expect(result.current.status).toBe("loading");
		await waitFor(() => expect(result.current.status).toBe("ready"));
		expect(result.current.history).toMatchObject({ source: "api", first: 126, last: 130, change: 4 });
		expect(mocks.api.chart).toHaveBeenCalledWith("NVDA", "1w");
		// several companies on one clock, the same rule
		const many = renderHook(() => usePriceHistories(["NVDA", "AAPL"], "1W"), { wrapper });
		await waitFor(() => expect(many.result.current.status).toBe("ready"));
		expect(Object.values(many.result.current.bySymbol).map((h) => h.source)).toEqual(["api", "api"]);
	});

	it("signed in, a chart that fails or comes back empty: the demo series, ending at the LIVE price", async () => {
		signIn();
		mocks.api.stockData.mockResolvedValue(quote(130, 1.5));
		const failed = renderHook(() => usePriceHistory("NVDA", "1M"), { wrapper });
		await waitFor(() => expect(failed.result.current.status).toBe("ready"));
		expect(failed.result.current.history).toMatchObject({ source: "demo", last: 130 });
		mocks.api.chart.mockResolvedValue({ prices: [] });
		const empty = renderHook(() => usePriceHistory("NVDA", "1D"), { wrapper });
		await waitFor(() => expect(empty.result.current.status).toBe("ready"));
		expect(empty.result.current.history).toMatchObject({ source: "demo", last: 130 });
		// 1D agrees with the live quote's own day move
		expect(empty.result.current.history!.changePercent).toBeCloseTo(1.5, 9);
	});

	it("signed out: a company the design prices keeps its demo series (never the API's), one it never priced takes the API's", async () => {
		mocks.api.stockData.mockResolvedValue(quote(12.5, -2));
		mocks.api.chart.mockResolvedValue({ prices: closes(13, 12.5) });
		const { result } = renderHook(() => ({ nvda: usePriceHistory("NVDA", "1W"), snap: usePriceHistory("SNAP", "1W") }), { wrapper });
		expect(result.current.nvda.status).toBe("ready");
		expect(result.current.nvda.history).toMatchObject({ source: "demo", last: 122.1 });
		await waitFor(() => expect(result.current.snap.status).toBe("ready"));
		expect(result.current.snap.history).toMatchObject({ source: "api", first: 13, last: 12.5 });
		const asked = [...mocks.api.stockData.mock.calls, ...mocks.api.chart.mock.calls].map((c) => c[0]);
		expect(asked).not.toContain("NVDA");
		expect(asked).toContain("SNAP");
	});

	it("draws no week rank while the week's closes load, then keeps the last rank while a new company's load (review 2, low 3)", async () => {
		signIn();
		const nvda = { shares: 1, priceAtAdd: 100, addedAt: Date.now() - 30 * 86_400_000 };
		mocks.account.account = { sandboxCash: 900, stakBrandIds: [], sandboxPortfolio: { NVDA: nvda }, totalXp: 0 };
		mocks.api.stockData.mockResolvedValue(quote(130, 1.5));
		let koChart: (v: { prices: Point[] }) => void = () => {};
		mocks.api.chart.mockImplementation((symbol: string) => (symbol === "KO" ? new Promise<{ prices: Point[] }>((resolve) => { koChart = resolve; }) : Promise.resolve({ prices: closes(126, 130) })));
		const { result, rerender } = renderHook(useAll, { wrapper });
		// the week's closes are on their way: the account is ranked (it holds a position) but has no week rank yet, the
		// week board has no You row, and the week's text falls back to the all-time figure (the phones' fallback)
		const s0 = result.current.standing;
		expect(s0.status).toBe("loading");
		expect(s0.ranked).toBe(true);
		expect(s0.week.rank).toBeNull();
		expect(s0.board("week").you).toBeNull();
		expect(s0.board("week").rows).toHaveLength(5);
		expect(s0.week.change).toBe(s0.allTime.change);
		expect(s0.allTime.rank).not.toBeNull();
		await waitFor(() => expect(result.current.standing.status).toBe("ready"));
		const rank = result.current.standing.week.rank;
		expect(rank).not.toBeNull();
		expect(result.current.standing.board("week").you?.rank).toBe(rank);
		// a second company with a live quote joins the ledger: its closes load; the week and its rank hold meanwhile
		mocks.account.account = { ...mocks.account.account, sandboxPortfolio: { NVDA: nvda, KO: { shares: 1, priceAtAdd: 60, addedAt: Date.now() - 10 * 86_400_000 } } };
		rerender();
		await waitFor(() => expect(result.current.standing.status).toBe("loading"));
		expect(result.current.standing.week.rank).toBe(rank);
		expect(result.current.standing.board("week").you?.rank).toBe(rank);
		act(() => koChart({ prices: closes(60, 62) }));
		await waitFor(() => expect(result.current.standing.status).toBe("ready"));
		expect(result.current.standing.week.rank).not.toBeNull();
	});

	it("compares a pick with the market from the same source as its price (review 1, low)", async () => {
		// SPY's year: 500 a year ago, 550 today; the pick was made where SPY closed at 520
		const year = Array.from({ length: 11 }, (_, i) => ({ ts: new Date(Date.now() - (10 - i) * 30 * 86_400_000).toISOString(), close: 500 + i * 5 }));
		mocks.api.chart.mockImplementation(async (symbol: string) => (symbol === "SPY" ? { prices: year } : { prices: [] }));
		const since = Date.parse(year[4]!.ts) + 1000;
		// signed out: the persona's picks keep their demo prices, so the market is the demo one (no live SPY)
		const out = renderHook(() => ({ plain: useMarketMove(since), nvda: useMarketMove(since, { ticker: "NVDA" }), snap: useMarketMove(since, { ticker: "SNAP" }) }), { wrapper });
		expect(out.result.current.plain).toMatchObject({ status: "ready", source: "demo" });
		expect(out.result.current.nvda).toMatchObject({ status: "ready", source: "demo" });
		// a company only the API prices is a live pick: the live market
		await waitFor(() => expect(out.result.current.snap.status).toBe("ready"));
		expect(out.result.current.snap.source).toBe("api");
		expect(out.result.current.snap.pct).toBeCloseTo((550 / 520 - 1) * 100, 9);
		out.unmount();
		// signed in: every price is live, so is the market
		signIn();
		const acct = renderHook(() => useMarketMove(since, { ticker: "NVDA" }), { wrapper });
		await waitFor(() => expect(acct.result.current.source).toBe("api"));
		expect(acct.result.current.pct).toBeCloseTo((550 / 520 - 1) * 100, 9);
	});
});

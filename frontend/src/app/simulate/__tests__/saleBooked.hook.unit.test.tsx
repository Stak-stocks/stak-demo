/**
 * The sell sheet's preview and the receipt against the store itself (coordinator rulings N23e / N28e; the hunt's
 * NUM-01 / ST-04: "receipt $59.01 / 0.2374 shares, cash +$59.02, inbox 0.2375 shares"). The sheet previews a sale with
 * figures.ts salePreview on the exact quantity held; the receipt prints the SoldEntry the store returns. Here the store
 * sells the persona's picks for real (the guest ledger, the demo quotes) and every figure is compared: what the sheet
 * promised is what was booked, what was booked is what the cash rose by, to the cent and the ten-thousandth of a share.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
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

import { checkBuy, checkSell, loadCatalog, round2, shares4, type SoldEntry, useLive, usePortfolio } from "@/app/live";
import { guestStore, localStore } from "@/app/live/guest";
import { pickReturn, refusalFrom, salePreview } from "../figures";

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

const useLedger = () => ({ live: useLive(), pf: usePortfolio() });

describe("what the sell sheet promises is what the store books", () => {
	it("for every listed pick of the persona at every portion of the sheets", async () => {
		const tickers = ["NVDA", "TSLA", "AMD", "AAPL", "JPM", "MSFT"];
		const portions = [0.25, 0.5, 0.75, 0.33, 0.999, 1];
		let compared = 0;
		for (const ticker of tickers) {
			for (const frac of portions) {
				guestStore().reset();
				const { result, unmount } = renderHook(useLedger, { wrapper });
				const pos = result.current.pf.positions.find((p) => p.ticker === ticker)!;
				expect(pos, ticker).toBeDefined();
				const cashBefore = result.current.pf.cash;
				const valueBefore = result.current.pf.value;
				// the sheet: the store's own check, then the ledger's own arithmetic on the exact quantity held
				expect(checkSell(pos.shares * frac, pos.shares, pos.price)).toEqual({ ok: true });
				const promised = salePreview(pos.shares, pos.price, frac);
				let sold!: SoldEntry;
				await act(async () => {
					sold = await result.current.live.actions.sell(ticker, pos.shares * frac, pos.price);
				});
				// the receipt prints `sold`: the same shares and dollars the sheet showed
				expect(shares4(sold.shares), `${ticker} ${frac} shares`).toBe(shares4(promised.shares));
				expect(sold.proceeds, `${ticker} ${frac} proceeds`).toBe(promised.proceeds);
				// ... which is what the cash rose by, and the newest row of the sold log
				expect(round2(result.current.pf.cash - cashBefore), `${ticker} ${frac} cash`).toBe(sold.proceeds);
				expect(result.current.live.sold[0]).toEqual(sold);
				// a sale at today's price leaves the ledger worth what it was
				expect(result.current.pf.value).toBe(valueBefore);
				// All closes the position; anything less leaves the rest
				const left = result.current.pf.positions.find((p) => p.ticker === ticker);
				if (frac === 1) expect(left).toBeUndefined();
				else expect(shares4((left?.shares ?? 0) + sold.shares)).toBe(shares4(pos.shares));
				compared++;
				unmount();
			}
		}
		expect(compared).toBe(tickers.length * portions.length);
	});

	it("after a top-up and a run of part sales the receipts still add up to the cash", async () => {
		const { result } = renderHook(useLedger, { wrapper });
		const start = result.current.pf.cash;
		await act(async () => {
			await result.current.live.actions.buy("NVDA", 50, 122.1);
		});
		let returned = 0;
		for (const frac of [0.75, 0.999, 1]) {
			const pos = result.current.pf.positions.find((p) => p.ticker === "NVDA")!;
			const promised = salePreview(pos.shares, pos.price, frac);
			let sold!: SoldEntry;
			await act(async () => {
				sold = await result.current.live.actions.sell("NVDA", pos.shares * frac, pos.price);
			});
			expect(sold.proceeds).toBe(promised.proceeds);
			expect(shares4(sold.shares)).toBe(shares4(promised.shares));
			returned = round2(returned + sold.proceeds);
		}
		expect(result.current.pf.positions.some((p) => p.ticker === "NVDA")).toBe(false);
		expect(round2(result.current.pf.cash - (start - 50))).toBe(returned);
	});
});

describe("an order of nothing never reaches the ledger (N27a / N27i)", () => {
	it("the ticket's own check refuses what the store would, and a refusal is read as one", async () => {
		const { result } = renderHook(useLedger, { wrapper });
		const before = guestStore().read();
		const nvda = result.current.pf.positions.find((p) => p.ticker === "NVDA")!;
		// the sheet's check: a 0.001% sale and a $0.004 buy cannot be confirmed
		expect(checkSell(nvda.shares * 0.00001, nvda.shares, nvda.price)).toEqual({ ok: false, reason: "too-small" });
		expect(checkBuy(0.004, result.current.pf.cash, 122.1)).toEqual({ ok: false, reason: "too-small" });
		expect(checkBuy(9000, result.current.pf.cash, 122.1)).toEqual({ ok: false, reason: "insufficient" });
		// placed anyway (a ticket that did not check): the store refuses, and the page reads the refusal, not a failure
		for (const place of [() => result.current.live.actions.sell("NVDA", nvda.shares * 0.00001, nvda.price), () => result.current.live.actions.buy("NVDA", 0.004, 122.1), () => result.current.live.actions.buy("NVDA", 9000, 122.1)]) {
			let error: unknown;
			await act(async () => {
				await place().catch((e: unknown) => {
					error = e;
				});
			});
			expect(refusalFrom(error)).not.toBeNull();
		}
		// nothing was written
		expect(guestStore().read().cash).toBe(before.cash);
		expect(guestStore().read().sold).toHaveLength(before.sold.length);
		expect(guestStore().read().positions.find((p) => p.ticker === "NVDA")?.shares).toBe(nvda.shares);
	});
});

describe("a pick's return on the pages (N29g)", () => {
	it("is the prices' for every seeded pick, and for the dust a 99.96% sale leaves", async () => {
		const { result } = renderHook(useLedger, { wrapper });
		for (const p of result.current.pf.positions) expect(pickReturn(p)).toBeCloseTo((p.price / (p.priceAtAdd ?? p.price) - 1) * 100, 6);
		const nvda = result.current.pf.positions.find((p) => p.ticker === "NVDA")!;
		const whole = pickReturn(nvda);
		await act(async () => {
			await result.current.live.actions.sell("NVDA", nvda.shares * 0.9996, nvda.price);
		});
		const dust = result.current.pf.positions.find((p) => p.ticker === "NVDA")!;
		expect(dust.shares).toBeLessThan(0.001);
		// the dust reads what the whole pick read (the cents alone said +25.0% where the prices say +24.0%)
		expect(pickReturn(dust).toFixed(1)).toBe(whole.toFixed(1));
	});
});

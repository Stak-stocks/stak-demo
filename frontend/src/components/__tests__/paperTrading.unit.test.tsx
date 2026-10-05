import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── The paper account, the API and the error banner, scripted ────────────────
const account = vi.hoisted(() => ({
	value: {
		sandboxCash: 1000, sandboxStart: 1000, sandboxCashSource: "free_choice", totalXp: 0,
		sandboxPortfolio: { AAPL: { shares: 2, priceAtAdd: 100, addedAt: 1 } } as Record<string, { shares: number; priceAtAdd: number; addedAt: number }>,
		sandboxOpenOrders: [] as { amount: number }[],
	},
}));
const refreshAccount = vi.fn(() => Promise.resolve());
vi.mock("@/context/AccountContext", () => ({ useAccount: () => ({ account: account.value, accountLoading: false, refreshAccount }) }));
vi.mock("@/hooks/useBrandsList", () => ({ useBrandsList: () => ({ data: [{ ticker: "AAPL", name: "Apple" }] }) }));
const api = vi.hoisted(() => ({
	getBatchQuotes: vi.fn(),
	getSandboxTrades: vi.fn(),
	getStockChart: vi.fn(),
	getStockData: vi.fn(),
	sandboxBuyAmount: vi.fn(),
	sandboxCancelOrder: vi.fn(),
	sandboxPlaceOrder: vi.fn(),
	sandboxSellPortion: vi.fn(),
	sandboxSetup: vi.fn(),
}));
vi.mock("@/lib/api", () => api);
const reportPaperError = vi.fn();
// The sheet reads the route to know whether the desktop sidebar is beside it.
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => "/simulate" }));
vi.mock("@/lib/paperErrors", () => ({ reportPaperError: (e: unknown) => reportPaperError(e) }));
// jsdom has no matchMedia (the sheet sizes itself from it).
Object.defineProperty(window, "matchMedia", { writable: true, value: (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }) });

import { usePaperPortfolio, type PaperPortfolio, type Pick } from "@/hooks/usePaperPortfolio";
import { BuyFlow } from "@/components/simulate/BuyFlow";
import { SellFlow } from "@/components/simulate/SellFlow";

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
	vi.clearAllMocks();
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	api.getBatchQuotes.mockResolvedValue({ quotes: {} });
	api.getSandboxTrades.mockResolvedValue({ trades: [] });
	api.getStockData.mockResolvedValue({ quote: { price: 100, changePercent: 1.5 } });
});
afterEach(cleanup);

// ── usePaperPortfolio ────────────────────────────────────────────────────────
describe("usePaperPortfolio: a trade that fails", () => {
	const hook = () => renderHook(() => usePaperPortfolio(), { wrapper }).result;

	it("a failed buy returns nothing, says why on the banner, and re-reads the account and ledger", async () => {
		const err = new Error("Insufficient cash");
		api.sandboxBuyAmount.mockRejectedValueOnce(err);
		const spy = vi.spyOn(client, "invalidateQueries");
		const paper = hook();
		let out: unknown;
		await act(async () => { out = await paper.current.buy("AAPL", 50); });
		expect(out).toBeNull();
		expect(reportPaperError).toHaveBeenCalledWith(err);
		expect(refreshAccount).toHaveBeenCalled();
		expect(spy).toHaveBeenCalledWith({ queryKey: ["sandbox-trades"] });
	});

	it("sell, limit, cancel and setup answer false on failure and true on success, re-reading either way", async () => {
		const paper = hook();
		for (const [fn, mock] of [
			[() => paper.current.sell("AAPL", 0.5), api.sandboxSellPortion],
			[() => paper.current.placeLimit("AAPL", 50, 90), api.sandboxPlaceOrder],
			[() => paper.current.cancelOrder(7), api.sandboxCancelOrder],
			[() => paper.current.setup(1000, "Mine", "balanced" as never), api.sandboxSetup],
		] as const) {
			mock.mockRejectedValueOnce(new Error("no"));
			let failed: unknown;
			await act(async () => { failed = await fn(); });
			expect(failed).toBe(false);
			mock.mockResolvedValueOnce({ ok: true });
			let ok: unknown;
			await act(async () => { ok = await fn(); });
			expect(ok).toBe(true);
		}
		expect(reportPaperError).toHaveBeenCalledTimes(4);
		expect(refreshAccount).toHaveBeenCalledTimes(8);
	});

	it("without a live quote a holding is valued at what it cost, so it doesn't show a fake loss", async () => {
		const paper = hook();
		await waitFor(() => expect(paper.current.picks).toHaveLength(1));
		expect(paper.current.picks[0]).toMatchObject({ ticker: "AAPL", name: "Apple", price: 100, value: 200, gain: 0, dayChange: null });
		expect(paper.current.portfolioValue).toBe(1200);
	});
});

// ── BuyFlow ──────────────────────────────────────────────────────────────────
function fakePaper(over: Partial<PaperPortfolio> = {}): PaperPortfolio {
	return {
		loading: false, needsSetup: false, cash: 1000, paperStart: 1000, name: "", strategy: undefined,
		picks: [], openOrders: [], portfolioValue: 1000, allTimeGain: 0, trades: [], realized: [], quotes: {},
		setup: vi.fn(), buy: vi.fn(), placeLimit: vi.fn(), sell: vi.fn(), cancelOrder: vi.fn(),
		...over,
	};
}
const renderBuy = (paper: PaperPortfolio) =>
	render(<BuyFlow symbol="AAPL" company="Apple" paper={paper} onClose={vi.fn()} onViewPortfolio={vi.fn()} />, { wrapper });

describe("BuyFlow", () => {
	it("a market buy of the default $25 fills and shows the whole position held", async () => {
		const paper = fakePaper({ picks: [{ ticker: "AAPL", shares: 1 } as Pick], buy: vi.fn().mockResolvedValue({ price: 100, shares: 1.25 }) });
		renderBuy(paper);
		const confirm = await screen.findByRole("button", { name: "Confirm practice buy" });
		await waitFor(() => expect(confirm).toBeEnabled());
		expect(screen.getByText(/0\.2500/)).toBeTruthy();
		fireEvent.click(confirm);
		expect(await screen.findByText("Order filled")).toBeTruthy();
		expect(paper.buy).toHaveBeenCalledWith("AAPL", 25);
		expect(screen.getByText(/1\.2500/)).toBeTruthy();
	});

	it("a buy that fails stays on the ticket (the banner says why)", async () => {
		const paper = fakePaper({ buy: vi.fn().mockResolvedValue(null) });
		renderBuy(paper);
		const confirm = await screen.findByRole("button", { name: "Confirm practice buy" });
		await waitFor(() => expect(confirm).toBeEnabled());
		fireEvent.click(confirm);
		await waitFor(() => expect(paper.buy).toHaveBeenCalled());
		expect(screen.queryByText("Order filled")).toBeNull();
		expect(screen.getByRole("button", { name: "Confirm practice buy" })).toBeTruthy();
	});

	it("a stake bigger than the cash on hand is ignored", async () => {
		renderBuy(fakePaper({ cash: 40 }));
		const confirm = await screen.findByRole("button", { name: "Confirm practice buy" });
		await waitFor(() => expect(confirm).toBeEnabled());
		fireEvent.click(screen.getByRole("button", { name: "$50" }));
		expect(screen.getByRole("button", { name: "$25" }).getAttribute("aria-pressed") ?? "").not.toBe("false");
		expect(screen.getByText(/0\.2500/)).toBeTruthy();
	});

	it("a limit below today's price is placed as an open order", async () => {
		const paper = fakePaper({ placeLimit: vi.fn().mockResolvedValue(true) });
		renderBuy(paper);
		await screen.findByRole("button", { name: "Confirm practice buy" });
		fireEvent.click(screen.getByRole("button", { name: "Limit" }));
		fireEvent.change(await screen.findByLabelText("Limit price in dollars"), { target: { value: "90" } });
		const place = await screen.findByRole("button", { name: "Place limit order" });
		await waitFor(() => expect(place).toBeEnabled());
		fireEvent.click(place);
		expect(await screen.findByText("Order placed")).toBeTruthy();
		expect(paper.placeLimit).toHaveBeenCalledWith("AAPL", 25, 90);
	});

	it("without a price there's nothing to confirm", async () => {
		api.getStockData.mockRejectedValue(new Error("down"));
		renderBuy(fakePaper());
		// The ticket retries the price once before saying it couldn't load one.
		expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Confirm practice buy" })).toBeDisabled();
	});
});

// ── SellFlow ─────────────────────────────────────────────────────────────────
const held: Pick = { ticker: "AAPL", name: "Apple", shares: 2, costPerShare: 100, stake: 200, price: 110, value: 220, gain: 20, gainPct: 10, dayChange: 1, addedAt: 1 };
const renderSell = (paper: PaperPortfolio) =>
	render(<SellFlow pick={held} paper={paper} onClose={vi.fn()} onBackToSimulate={vi.fn()} onViewPortfolio={vi.fn()} />, { wrapper });

describe("SellFlow", () => {
	it("All sells the whole position and closes it", async () => {
		const paper = fakePaper({ sell: vi.fn().mockResolvedValue(true) });
		renderSell(paper);
		fireEvent.click(screen.getByRole("button", { name: "Confirm sell" }));
		expect(await screen.findByText("Position closed")).toBeTruthy();
		expect(paper.sell).toHaveBeenCalledWith("AAPL", 1);
	});

	it("Half reduces the position", async () => {
		const paper = fakePaper({ sell: vi.fn().mockResolvedValue(true) });
		renderSell(paper);
		fireEvent.click(screen.getByRole("button", { name: "Half" }));
		fireEvent.click(screen.getByRole("button", { name: "Confirm sell" }));
		expect(await screen.findByText("Position reduced")).toBeTruthy();
		expect(paper.sell).toHaveBeenCalledWith("AAPL", 0.5);
	});

	it("a custom amount over the position's value sells nothing", async () => {
		const paper = fakePaper({ sell: vi.fn().mockResolvedValue(true) });
		renderSell(paper);
		fireEvent.click(screen.getByRole("button", { name: "Custom" }));
		fireEvent.change(screen.getByLabelText("Dollars to sell"), { target: { value: "500" } });
		fireEvent.click(screen.getByRole("button", { name: "Confirm sell" }));
		expect(paper.sell).not.toHaveBeenCalled();
	});

	it("a sell that fails stays on the confirm step", async () => {
		const paper = fakePaper({ sell: vi.fn().mockResolvedValue(false) });
		renderSell(paper);
		fireEvent.click(screen.getByRole("button", { name: "Confirm sell" }));
		await waitFor(() => expect(paper.sell).toHaveBeenCalled());
		expect(screen.queryByText("Position closed")).toBeNull();
		expect(screen.getByRole("button", { name: "Confirm sell" })).toBeTruthy();
	});
});

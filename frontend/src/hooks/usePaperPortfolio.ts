import { useCallback, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { SANDBOX_DEFAULT_STARTING_BALANCE } from "@stak/shared";
import { useAccount, type SandboxOrder, type SandboxStrategyId } from "@/context/AccountContext";
import { useBrandsList } from "@/hooks/useBrandsList";
import {
	getBatchQuotes, getSandboxTrades, getStockChart, sandboxBuyAmount, sandboxCancelOrder, sandboxPlaceOrder, sandboxSellPortion, sandboxSetup,
	type ChartRange, type SandboxTrade,
} from "@/lib/api";
import { buildLedgerSeries, type ChartValuePoint } from "@/lib/ledgerChart";
import { dailyCloses, etDay } from "@/lib/chartSeries";
import { reportPaperError } from "@/lib/paperErrors";
import { computeRealized, type RealizedSale } from "@/lib/realized";

/** Android refreshes paper prices and orders every 15 seconds while a Simulate screen is open. */
const REFRESH_MS = 15_000;

/** One held stock, priced live (falling back to what it cost while a quote is missing). */
export interface Pick {
	ticker: string;
	name: string;
	shares: number;
	costPerShare: number;
	/** What was paid in total (cost basis). */
	stake: number;
	price: number;
	value: number;
	gain: number;
	gainPct: number;
	/** Today's move for the stock, or null without a quote. */
	dayChange: number | null;
	addedAt: number;
}

export interface PaperPortfolio {
	loading: boolean;
	needsSetup: boolean;
	cash: number;
	paperStart: number;
	name: string;
	strategy: SandboxStrategyId | undefined;
	picks: Pick[];
	openOrders: SandboxOrder[];
	/** Cash + live holdings + the cash reserved for open limit orders. */
	portfolioValue: number;
	allTimeGain: number;
	trades: SandboxTrade[];
	realized: RealizedSale[];
	quotes: Record<string, { price: number; changePercent: number }>;
	setup: (balance: number, name: string, strategy: SandboxStrategyId) => Promise<boolean>;
	buy: (ticker: string, amount: number) => Promise<{ price: number; shares: number } | null>;
	placeLimit: (ticker: string, amount: number, limitPrice: number) => Promise<boolean>;
	sell: (ticker: string, portion: number) => Promise<boolean>;
	cancelOrder: (id: number) => Promise<boolean>;
}

/**
 * Android's PaperPortfolio, on the web: the server is the source of truth (cash, positions and open
 * orders arrive through the account; the trade ledger through /api/sandbox/trades), prices are live and
 * refresh every 15 seconds. A mutation that fails says why on the global banner, then everything is
 * re-read so the screen never disagrees with the server.
 */
export function usePaperPortfolio(): PaperPortfolio {
	const { account, accountLoading, refreshAccount } = useAccount();
	const { data: brands } = useBrandsList();
	const queryClient = useQueryClient();

	const entries = account?.sandboxPortfolio ?? {};
	const tickers = useMemo(() => Object.keys(entries).sort(), [entries]);
	const initialised = account?.sandboxCash !== undefined;

	const { data: quoteData } = useQuery({
		queryKey: ["sim-quotes", tickers],
		queryFn: () => getBatchQuotes(tickers),
		enabled: tickers.length > 0,
		// Keep showing the last prices while a new set of tickers loads, so gains don't flash to zero.
		placeholderData: keepPreviousData,
		staleTime: REFRESH_MS,
		refetchInterval: REFRESH_MS,
		retry: 1,
	});
	const quotes = useMemo(() => quoteData?.quotes ?? {}, [quoteData]);

	const { data: tradesData } = useQuery({
		queryKey: ["sandbox-trades"],
		queryFn: () => getSandboxTrades(500),
		enabled: initialised,
		staleTime: 30 * 1000,
		retry: 1,
	});
	const trades = useMemo(() => tradesData?.trades ?? [], [tradesData]);
	const realized = useMemo(() => computeRealized(trades), [trades]);

	// What the portfolio started with - every portfolio has it since the one-money-system migration (2026-10-07).
	const paperStart = account?.sandboxStart ?? SANDBOX_DEFAULT_STARTING_BALANCE;
	const cash = account?.sandboxCash ?? 0;
	const openOrders = account?.sandboxOpenOrders ?? [];

	const picks = useMemo<Pick[]>(() => {
		const nameOf = new Map((brands ?? []).map((b) => [b.ticker.toUpperCase(), b.name]));
		return tickers.map((ticker) => {
			const entry = entries[ticker]!;
			const quote = quotes[ticker];
			const costPerShare = entry.priceAtAdd ?? quote?.price ?? 0;
			const price = quote?.price && quote.price > 0 ? quote.price : costPerShare;
			const stake = costPerShare * entry.shares;
			const value = price * entry.shares;
			const gain = value - stake;
			return {
				ticker,
				name: nameOf.get(ticker.toUpperCase()) ?? ticker,
				shares: entry.shares,
				costPerShare,
				stake,
				price,
				value,
				gain,
				gainPct: stake > 0 ? (gain / stake) * 100 : 0,
				dayChange: quote ? quote.changePercent : null,
				addedAt: entry.addedAt,
			};
		});
	}, [tickers, entries, quotes, brands]);

	const reserved = openOrders.reduce((sum, o) => sum + o.amount, 0);
	const portfolioValue = cash + picks.reduce((sum, p) => sum + p.value, 0) + reserved;

	/** Runs a mutation; a failure goes to the banner, and either way the account and ledger are re-read. */
	const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
		try {
			return await fn();
		} catch (err) {
			reportPaperError(err);
			return null;
		} finally {
			await Promise.allSettled([refreshAccount(), queryClient.invalidateQueries({ queryKey: ["sandbox-trades"] })]);
			queryClient.invalidateQueries({ queryKey: ["sim-quotes"] });
		}
	}, [refreshAccount, queryClient]);

	return {
		loading: accountLoading,
		needsSetup: !accountLoading && !!account && !initialised,
		cash,
		paperStart,
		name: account?.sandboxName ?? "",
		strategy: account?.sandboxStrategy,
		picks,
		openOrders,
		portfolioValue,
		allTimeGain: portfolioValue - paperStart,
		trades,
		realized,
		quotes,
		setup: async (balance, name, strategy) => (await run(() => sandboxSetup(balance, name, strategy))) !== null,
		buy: (ticker, amount) => run(() => sandboxBuyAmount(ticker, amount)),
		placeLimit: async (ticker, amount, limitPrice) => (await run(() => sandboxPlaceOrder(ticker, amount, limitPrice))) !== null,
		sell: async (ticker, portion) => (await run(() => sandboxSellPortion(ticker, portion))) !== null,
		cancelOrder: async (id) => (await run(() => sandboxCancelOrder(id))) !== null,
	};
}

/**
 * The portfolio's value over time, replayed from the trade ledger at one point per trading day.
 * Null while there is nothing honest to draw ("No history yet").
 */
export function usePortfolioHistory(trades: SandboxTrade[], paperStart: number, range: ChartRange): { values: number[] | null; points: ChartValuePoint[] | null; loading: boolean } {
	const traded = useMemo(() => [...new Set(trades.map((t) => t.ticker))].sort(), [trades]);
	const charts = useQueries({
		queries: traded.map((ticker) => ({
			queryKey: ["stock-chart", ticker, range],
			queryFn: () => getStockChart(ticker, range),
			staleTime: range === "1d" ? 5 * 60 * 1000 : 30 * 60 * 1000,
			retry: 1,
		})),
	});
	const loading = charts.some((c) => c.isPending);
	const version = charts.map((c) => c.dataUpdatedAt).join(",");
	const points = useMemo(() => {
		if (trades.length === 0 || loading) return null;
		const series: Record<string, ReturnType<typeof dailyCloses>> = {};
		traded.forEach((ticker, i) => { series[ticker] = dailyCloses((charts[i]?.data?.prices ?? []).map((p) => ({ ts: p.ts, close: p.close }))); });
		return buildLedgerSeries(trades, paperStart, series);
	}, [trades, paperStart, traded, loading, version]);
	const values = useMemo(() => points?.map((p) => p.value) ?? null, [points]);
	return { values, points, loading };
}

/**
 * Today's move of the holdings, in dollars and as a percent of what the portfolio was worth before it: each holding's
 * value now minus its value at yesterday's close - or, if it was bought today, minus what was paid for it.
 */
export function todaysMove(paper: { picks: Pick[]; portfolioValue: number }): { usd: number; pct: number } {
	const today = etDay(new Date().toISOString());
	const usd = paper.picks.reduce((sum, p) => {
		if (etDay(new Date(p.addedAt).toISOString()) === today) return sum + p.gain;
		return p.dayChange === null ? sum : sum + p.value - p.value / (1 + p.dayChange / 100);
	}, 0);
	const before = paper.portfolioValue - usd;
	return { usd, pct: before > 0 ? (usd / before) * 100 : 0 };
}

/** Cancels open orders with an in-flight state per order, so a second click can't send a second cancel. */
export function useOrderCancel(cancelOrder: (id: number) => Promise<boolean>) {
	const inFlight = useRef(new Set<number>());
	const [, rerender] = useState(0);
	const cancel = useCallback(async (id: number) => {
		if (inFlight.current.has(id)) return;
		inFlight.current.add(id);
		rerender((n) => n + 1);
		try { await cancelOrder(id); } finally {
			inFlight.current.delete(id);
			rerender((n) => n + 1);
		}
	}, [cancelOrder]);
	return { cancel, isCancelling: (id: number) => inFlight.current.has(id) };
}

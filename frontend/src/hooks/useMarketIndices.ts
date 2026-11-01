import { useQueries } from "@tanstack/react-query";
import { getStockChart, type StockChartPoint } from "@/lib/api";
import { dailyCloses, etDay } from "@/lib/chartSeries";

export const MARKET_INDICES = [
	{ symbol: "^GSPC", name: "S&P 500" },
	{ symbol: "^IXIC", name: "Nasdaq" },
	{ symbol: "^DJI", name: "Dow Jones" },
	{ symbol: "^RUT", name: "Russell 2000" },
] as const;

export interface IndexReading {
	symbol: string;
	name: string;
	/** Latest level, or null while loading / unavailable. */
	value: number | null;
	/** Move vs the previous session's close, in percent. */
	changePct: number | null;
	/** The latest session's intraday levels, for the sparkline. */
	line: number[];
	loading: boolean;
}

/**
 * The previous session's close for an intraday series: the last daily close on a New York day before the
 * one the intraday series is on. The chart endpoint doesn't return a previous close itself.
 */
export function previousClose(intraday: StockChartPoint[], daily: StockChartPoint[]): number | null {
	const last = intraday[intraday.length - 1];
	if (!last) return null;
	const sessionDay = etDay(last.ts);
	const earlier = dailyCloses(daily).filter((p) => etDay(p.ts) < sessionDay);
	return earlier[earlier.length - 1]?.close ?? null;
}

export function readIndex(intraday: StockChartPoint[] | undefined, daily: StockChartPoint[] | undefined): Pick<IndexReading, "value" | "changePct" | "line"> {
	const points = (intraday ?? []).filter((p) => p.close > 0);
	// Indices only trade in the regular session; keep any stray pre/post bars off the line.
	const regular = points.filter((p) => p.session !== "pre" && p.session !== "post");
	const series = regular.length >= 2 ? regular : points;
	const value = series[series.length - 1]?.close ?? null;
	const prev = previousClose(series, daily ?? []);
	const changePct = value !== null && prev ? ((value - prev) / prev) * 100 : null;
	return { value, changePct, line: series.map((p) => p.close) };
}

/** S&P 500, Nasdaq, Dow and Russell 2000 from Yahoo's index symbols (server-cached 5 min intraday, 4h daily). */
export function useMarketIndices(): IndexReading[] {
	// The daily series is only read for the previous close. Keying it by the New York day refetches it once a new
	// session starts, so a tab left open overnight can't measure today against yesterday's partial bar.
	const day = etDay(new Date().toISOString());
	const results = useQueries({
		queries: MARKET_INDICES.flatMap(({ symbol }) => [
			{ queryKey: ["stock-chart", symbol, "1d"], queryFn: () => getStockChart(symbol, "1d"), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 1 },
			{ queryKey: ["index-prev-close", symbol, day], queryFn: () => getStockChart(symbol, "1m"), staleTime: 30 * 60 * 1000, refetchInterval: 30 * 60 * 1000, retry: 1 },
		]),
	});
	return MARKET_INDICES.map(({ symbol, name }, i) => {
		const intraday = results[i * 2]!;
		const daily = results[i * 2 + 1]!;
		return {
			symbol,
			name,
			...readIndex(intraday.data?.prices, daily.data?.prices),
			loading: intraday.isPending || daily.isPending,
		};
	});
}

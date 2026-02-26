import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getStockData } from "@/lib/api";

interface MarketBarProps {
	/** If true, renders as a plain div instead of a link (e.g. when already on the feed page) */
	static?: boolean;
}

export function MarketBar({ static: isStatic }: MarketBarProps) {
	const { data } = useQuery({
		queryKey: ["stock", "SPY"],
		queryFn: () => getStockData("SPY"),
		staleTime: 60 * 1000,
		refetchInterval: 60 * 1000,
		retry: 1,
	});

	if (!data?.quote) return null;
	const up = data.quote.changePercent >= 0;

	const inner = (
		<>
			<span>{up ? "📈" : "📉"}</span>
			<span className="text-zinc-400">Market Today</span>
			<span className="font-semibold">S&amp;P 500</span>
			<span className="font-bold">
				{up ? "+" : ""}{data.quote.changePercent.toFixed(2)}%
			</span>
			{!isStatic && (
				<span className="text-zinc-500 text-[10px] ml-1">· tap for market news →</span>
			)}
		</>
	);

	const cls = `flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium border-b ${
		up
			? "bg-green-500/10 text-green-400 border-green-500/20"
			: "bg-red-500/10 text-red-400 border-red-500/20"
	}`;

	if (isStatic) {
		return <div className={cls}>{inner}</div>;
	}

	return (
		<Link to="/feed" className={`${cls} hover:opacity-80 transition-opacity`}>
			{inner}
		</Link>
	);
}

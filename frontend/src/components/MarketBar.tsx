import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStockData } from "@/lib/api";

export function MarketBar() {
	const [expanded, setExpanded] = useState(false);

	const { data } = useQuery({
		queryKey: ["stock", "SPY"],
		queryFn: () => getStockData("SPY"),
		staleTime: 60 * 1000,
		refetchInterval: 60 * 1000,
		retry: 1,
	});

	if (!data?.quote) return null;
	const { quote } = data;
	const up = quote.changePercent >= 0;

	const color = up
		? "bg-green-500/10 text-green-400 border-green-500/20"
		: "bg-red-500/10 text-red-400 border-red-500/20";

	return (
		<button
			type="button"
			onClick={() => setExpanded((v) => !v)}
			className={`w-full text-left border-b transition-all ${color}`}
		>
			{/* Collapsed bar */}
			<div className="flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium">
				<span>{up ? "📈" : "📉"}</span>
				<span className="text-zinc-400">Market Today</span>
				<span className="font-semibold">S&amp;P 500</span>
				<span className="font-bold">
					{up ? "+" : ""}{quote.changePercent.toFixed(2)}%
				</span>
				<span className="text-zinc-500 text-[10px] ml-1">{expanded ? "▲ less" : "▼ more"}</span>
			</div>

			{/* Expanded details */}
			{expanded && (
				<div className="px-6 pb-3 pt-1 grid grid-cols-3 gap-x-6 gap-y-1.5 text-xs border-t border-current/10">
					<div>
						<p className="text-zinc-500 text-[10px] uppercase tracking-wide">Price</p>
						<p className="font-bold text-white">${quote.price.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-zinc-500 text-[10px] uppercase tracking-wide">Change</p>
						<p className="font-semibold">{up ? "+" : ""}{quote.change.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-zinc-500 text-[10px] uppercase tracking-wide">Day High</p>
						<p className="font-semibold text-zinc-300">${quote.high.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-zinc-500 text-[10px] uppercase tracking-wide">Day Low</p>
						<p className="font-semibold text-zinc-300">${quote.low.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-zinc-500 text-[10px] uppercase tracking-wide">Open</p>
						<p className="font-semibold text-zinc-300">${quote.open.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-zinc-500 text-[10px] uppercase tracking-wide">Prev Close</p>
						<p className="font-semibold text-zinc-300">${quote.prevClose.toFixed(2)}</p>
					</div>
				</div>
			)}
		</button>
	);
}

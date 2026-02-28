import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStockData } from "@/lib/api";

// ── Market hours helpers (all times in US/Eastern) ────────────────────────────

function getNYCNow() {
	const nycStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
	const nyc = new Date(nycStr);
	const year = nyc.getFullYear();
	const month = nyc.getMonth() + 1; // 1-12
	const day = nyc.getDate();
	return {
		weekday: nyc.getDay(), // 0=Sun … 6=Sat
		hour: nyc.getHours(),
		minute: nyc.getMinutes(),
		year,
		month,
		day,
		dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
	};
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
	const d = new Date(year, month - 1, 1);
	let count = 0;
	for (let i = 0; i < 35; i++) {
		if (d.getDay() === weekday && ++count === n) return new Date(d);
		d.setDate(d.getDate() + 1);
	}
	return d;
}

function lastWeekday(year: number, month: number, weekday: number): Date {
	const d = new Date(year, month, 0); // last day of month
	while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
	return d;
}

function observed(d: Date): string {
	const c = new Date(d);
	if (c.getDay() === 6) c.setDate(c.getDate() - 1); // Sat → Fri
	if (c.getDay() === 0) c.setDate(c.getDate() + 1); // Sun → Mon
	return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-${String(c.getDate()).padStart(2, "0")}`;
}

function fmt(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getUSHolidays(year: number): Set<string> {
	const h = new Set<string>();
	h.add(observed(new Date(year, 0, 1)));              // New Year's Day
	h.add(fmt(nthWeekday(year, 1, 1, 3)));              // MLK Jr. Day — 3rd Mon Jan
	h.add(fmt(nthWeekday(year, 2, 1, 3)));              // Presidents' Day — 3rd Mon Feb
	h.add(fmt(lastWeekday(year, 5, 1)));                // Memorial Day — last Mon May
	h.add(observed(new Date(year, 5, 19)));             // Juneteenth — Jun 19
	h.add(observed(new Date(year, 6, 4)));              // Independence Day — Jul 4
	h.add(fmt(nthWeekday(year, 9, 1, 1)));              // Labor Day — 1st Mon Sep
	h.add(fmt(nthWeekday(year, 11, 4, 4)));             // Thanksgiving — 4th Thu Nov
	h.add(observed(new Date(year, 11, 25)));            // Christmas — Dec 25
	return h;
}

function isMarketOpen(): boolean {
	const { weekday, hour, minute, year, month, day, dateStr } = getNYCNow();

	if (weekday === 0 || weekday === 6) return false;           // weekend
	if (getUSHolidays(year).has(dateStr)) return false;         // federal holiday

	const t = hour * 60 + minute;
	const OPEN = 9 * 60 + 30;  // 9:30 AM ET
	let CLOSE = 16 * 60;       // 4:00 PM ET

	// Early close: Christmas Eve
	if (month === 12 && day === 24) CLOSE = 13 * 60;

	// Early close: Day after Thanksgiving (4th Friday in November)
	const tg = nthWeekday(year, 11, 4, 4);
	const dayAfterTG = new Date(tg);
	dayAfterTG.setDate(dayAfterTG.getDate() + 1);
	if (month === 11 && day === dayAfterTG.getDate()) CLOSE = 13 * 60;

	return t >= OPEN && t < CLOSE;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketBar() {
	const [expanded, setExpanded] = useState(false);
	const marketOpen = isMarketOpen();

	const { data } = useQuery({
		queryKey: ["stock", "SPY"],
		queryFn: () => getStockData("SPY"),
		staleTime: 60 * 1000,
		refetchInterval: marketOpen ? 60 * 1000 : 5 * 60 * 1000,
		retry: 1,
	});

	if (!data?.quote) return null;
	const { quote } = data;
	const up = quote.changePercent >= 0;

	// ── Market closed state ───────────────────────────────────────────────────
	if (!marketOpen) {
		return (
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="w-full text-left border-b border-zinc-700/50 bg-zinc-800/30 transition-all"
			>
				<div className="flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium text-zinc-400">
					<span>🔴</span>
					<span className="font-semibold">Market Closed</span>
					<span className="text-zinc-600">·</span>
					<span>S&amp;P 500</span>
					<span className={`font-bold ${up ? "text-green-500/50" : "text-red-500/50"}`}>
						{up ? "+" : ""}{quote.changePercent.toFixed(2)}% prev
					</span>
					<span className="text-zinc-600 text-[10px] ml-1">{expanded ? "▲ less" : "▼ more"}</span>
				</div>

				{expanded && (
					<div className="px-6 pb-3 pt-1 grid grid-cols-3 gap-x-6 gap-y-1.5 text-xs border-t border-zinc-700/30">
						<div>
							<p className="text-zinc-600 text-[10px] uppercase tracking-wide">Price</p>
							<p className="font-bold text-zinc-300">${quote.price.toFixed(2)}</p>
						</div>
						<div>
							<p className="text-zinc-600 text-[10px] uppercase tracking-wide">Change</p>
							<p className={`font-semibold ${up ? "text-green-500/50" : "text-red-500/50"}`}>
								{up ? "+" : ""}{quote.change.toFixed(2)}
							</p>
						</div>
						<div>
							<p className="text-zinc-600 text-[10px] uppercase tracking-wide">Day High</p>
							<p className="font-semibold text-zinc-500">${quote.high.toFixed(2)}</p>
						</div>
						<div>
							<p className="text-zinc-600 text-[10px] uppercase tracking-wide">Day Low</p>
							<p className="font-semibold text-zinc-500">${quote.low.toFixed(2)}</p>
						</div>
						<div>
							<p className="text-zinc-600 text-[10px] uppercase tracking-wide">Open</p>
							<p className="font-semibold text-zinc-500">${quote.open.toFixed(2)}</p>
						</div>
						<div>
							<p className="text-zinc-600 text-[10px] uppercase tracking-wide">Prev Close</p>
							<p className="font-semibold text-zinc-500">${quote.prevClose.toFixed(2)}</p>
						</div>
					</div>
				)}
			</button>
		);
	}

	// ── Market open state ─────────────────────────────────────────────────────
	const color = up
		? "bg-green-500/10 text-green-400 border-green-500/20"
		: "bg-red-500/10 text-red-400 border-red-500/20";

	return (
		<button
			type="button"
			onClick={() => setExpanded((v) => !v)}
			className={`w-full text-left border-b transition-all ${color}`}
		>
			<div className="flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium">
				<span>{up ? "📈" : "📉"}</span>
				<span className="text-zinc-400">Market Today</span>
				<span className="font-semibold">S&amp;P 500</span>
				<span className="font-bold">
					{up ? "+" : ""}{quote.changePercent.toFixed(2)}%
				</span>
				<span className="text-zinc-500 text-[10px] ml-1">{expanded ? "▲ less" : "▼ more"}</span>
			</div>

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

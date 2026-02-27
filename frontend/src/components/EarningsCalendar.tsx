import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, X } from "lucide-react";
import { brands, getBrandLogoUrl } from "@/data/brands";
import { getEarningsCalendar, type CalendarEntry } from "@/lib/api";

// Lookup map: ticker → brand
const brandsByTicker = new Map(brands.map((b) => [b.ticker.toUpperCase(), b]));

function hourLabel(hour: string): string {
	if (hour === "bmo") return "Pre-mkt";
	if (hour === "amc") return "After close";
	if (hour === "dmh") return "During hours";
	return hour ?? "";
}

function revPercent(actual: number | null, estimate: number | null): number | null {
	if (actual == null || estimate == null || estimate === 0) return null;
	return ((actual - estimate) / Math.abs(estimate)) * 100;
}

function EarningsRow({ entry }: { entry: CalendarEntry }) {
	const brand = brandsByTicker.get(entry.symbol.toUpperCase());
	const hasResult = entry.epsActual != null;
	const canJudge = hasResult && entry.epsEstimate != null;
	const beat = canJudge ? (entry.epsActual! >= entry.epsEstimate!) : null;
	const rev = revPercent(entry.revenueActual, entry.revenueEstimate);

	return (
		<div className="flex items-center gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
			{/* Logo or ticker initial */}
			<div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
				{brand ? (
					<img
						src={getBrandLogoUrl(brand)}
						alt={brand.name}
						className="w-full h-full object-contain p-0.5"
						onError={(e) => {
							const el = e.target as HTMLImageElement;
							el.style.display = "none";
							el.parentElement!.textContent = entry.symbol.charAt(0);
						}}
					/>
				) : (
					<span className="text-xs font-bold text-zinc-300">{entry.symbol.charAt(0)}</span>
				)}
			</div>

			{/* Ticker + name */}
			<div className="flex-1 min-w-0">
				<div className="font-bold text-white text-sm leading-tight">{entry.symbol}</div>
				{brand && (
					<div className="text-[10px] text-zinc-400 truncate leading-tight">{brand.name}</div>
				)}
				{!brand && entry.hour && (
					<div className="text-[10px] text-zinc-500">{hourLabel(entry.hour)}</div>
				)}
			</div>

			{/* EPS */}
			<div className="text-right shrink-0 min-w-[70px]">
				{hasResult ? (
					<>
						<div className="text-sm font-semibold text-white leading-tight">
							${entry.epsActual!.toFixed(2)}
						</div>
						{entry.epsEstimate != null && (
							<div className="text-[10px] text-zinc-400 leading-tight">
								vs ${entry.epsEstimate.toFixed(2)}
							</div>
						)}
					</>
				) : entry.epsEstimate != null ? (
					<>
						<div className="text-[10px] text-zinc-400 leading-tight">
							Est. ${entry.epsEstimate.toFixed(2)}
						</div>
						{entry.hour && (
							<div className="text-[10px] text-zinc-500">{hourLabel(entry.hour)}</div>
						)}
					</>
				) : (
					entry.hour && (
						<div className="text-[10px] text-zinc-500">{hourLabel(entry.hour)}</div>
					)
				)}
			</div>

			{/* Status badge */}
			{hasResult && canJudge ? (
				<span
					className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
						beat
							? "bg-green-500/15 text-green-400 border-green-500/30"
							: "bg-red-500/15 text-red-400 border-red-500/30"
					}`}
				>
					{beat ? "Beat ✓" : "Miss ✗"}
				</span>
			) : !hasResult ? (
				<span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/15 text-amber-400 border-amber-500/30">
					Upcoming
				</span>
			) : null}

			{/* Revenue beat % */}
			{rev != null && (
				<span
					className={`shrink-0 text-[11px] font-semibold min-w-[36px] text-right ${
						rev >= 0 ? "text-green-400" : "text-red-400"
					}`}
				>
					{rev >= 0 ? "+" : ""}
					{rev.toFixed(1)}%
				</span>
			)}
		</div>
	);
}

type Tab = "today" | "tomorrow" | "week";

export function EarningsCalendarButton() {
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<Tab>("today");

	const { data } = useQuery({
		queryKey: ["earnings-calendar"],
		queryFn: getEarningsCalendar,
		staleTime: 15 * 60 * 1000,
		refetchInterval: 15 * 60 * 1000,
		retry: 1,
	});

	const todayEntries = data?.today ?? [];
	const tomorrowEntries = data?.tomorrow ?? [];
	const weekEntries = data?.week ?? [];

	// Stats for the "Today" summary bar
	const todayReported = todayEntries.filter(
		(e) => e.epsActual != null && e.epsEstimate != null,
	);
	const todayBeat = todayReported.filter((e) => e.epsActual! >= e.epsEstimate!).length;
	const positivePercent =
		todayReported.length > 0 ? Math.round((todayBeat / todayReported.length) * 100) : null;

	const tabEntries: CalendarEntry[] =
		tab === "today" ? todayEntries : tab === "tomorrow" ? tomorrowEntries : weekEntries;

	const tabCount =
		tab === "today"
			? todayEntries.length
			: tab === "tomorrow"
				? tomorrowEntries.length
				: weekEntries.length;

	const tabLabel =
		tab === "today"
			? `${tabCount} Reporting Today`
			: tab === "tomorrow"
				? `${tabCount} Reporting Tomorrow`
				: `${tabCount} This Week`;

	const badgeCount = todayEntries.length;

	return (
		<>
			{/* Trigger button */}
			<button
				onClick={() => setOpen(true)}
				className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-700/70 border border-slate-600/50 hover:border-cyan-500/40 text-zinc-300 hover:text-white transition-all text-sm font-medium"
			>
				<CalendarDays className="w-4 h-4 text-cyan-400" />
				<span>Earnings</span>
				{badgeCount > 0 && (
					<span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
						{badgeCount > 9 ? "9+" : badgeCount}
					</span>
				)}
			</button>

			{/* Panel */}
			{open &&
				createPortal(
					<div
						className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
						onClick={() => setOpen(false)}
					>
						<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
						<div
							className="relative w-full max-w-md bg-[#0b1121] rounded-t-2xl sm:rounded-2xl border border-slate-700/50 max-h-[85vh] flex flex-col shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Drag handle (mobile) */}
							<div className="flex justify-center pt-3 pb-1 sm:hidden">
								<div className="w-10 h-1 bg-slate-600 rounded-full" />
							</div>

							{/* Header */}
							<div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3 shrink-0">
								<h2 className="text-lg font-bold text-white flex items-center gap-2">
									<CalendarDays className="w-5 h-5 text-cyan-400" />
									Earnings Calendar
								</h2>
								<button
									onClick={() => setOpen(false)}
									className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-slate-700/50 transition-all"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							{/* Tabs */}
							<div className="flex px-5 gap-1.5 shrink-0">
								{(["today", "tomorrow", "week"] as const).map((t) => (
									<button
										key={t}
										onClick={() => setTab(t)}
										className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
											tab === t
												? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
												: "text-zinc-500 hover:text-zinc-300 border border-transparent"
										}`}
									>
										{t === "today" ? "Today" : t === "tomorrow" ? "Tomorrow" : "This Week"}
									</button>
								))}
							</div>

							{/* Summary bar */}
							<div className="mx-5 mt-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/40 flex items-center justify-between shrink-0">
								<div>
									<p className="text-zinc-200 text-sm font-semibold">{tabLabel}</p>
									{tab === "today" && todayReported.length > 0 && (
										<p className="text-zinc-500 text-[10px] mt-0.5">
											Beat · Miss · Upcoming
										</p>
									)}
								</div>
								{tab === "today" && positivePercent != null && (
									<div className="text-right">
										<p
											className={`text-xl font-bold ${positivePercent >= 50 ? "text-green-400" : "text-red-400"}`}
										>
											{positivePercent}%
										</p>
										<p className="text-[10px] text-zinc-500">Positive</p>
									</div>
								)}
							</div>

							{/* Column headers */}
							<div className="flex items-center gap-3 px-5 mt-2 pb-1 shrink-0">
								<div className="w-8 shrink-0" />
								<div className="flex-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Company</div>
								<div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide min-w-[70px] text-right">EPS</div>
								<div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Status</div>
								<div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide min-w-[36px] text-right">Rev.</div>
							</div>

							{/* Entries list */}
							<div className="flex-1 overflow-y-auto px-5 pb-6">
								{tabEntries.length === 0 ? (
									<div className="text-center text-zinc-500 py-10 text-sm">
										No earnings scheduled
									</div>
								) : (
									tabEntries.map((entry) => (
										<EarningsRow key={`${entry.symbol}-${entry.date}`} entry={entry} />
									))
								)}
							</div>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}

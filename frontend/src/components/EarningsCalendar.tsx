import { useState } from "react";
import { createPortal } from "react-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { CalendarDays, X, ChevronRight } from "lucide-react";
import { type BrandProfile } from "@/data/brands";
import { getEarnings, getCompanyNews, getMarketEarnings, type MarketEarningsEntry } from "@/lib/api";

type Tab = "today" | "week" | "next-week";

interface StakEarningsEntry {
	brand: BrandProfile;
	status: "upcoming" | "beat" | "miss";
	date: string;
	hour?: string;
}

function statusCfg(status: "upcoming" | "beat" | "miss") {
	if (status === "beat")
		return { icon: "📊", label: "Beat ✓", cls: "bg-green-500/15 text-green-400 border-green-500/30" };
	if (status === "miss")
		return { icon: "📊", label: "Missed ✗", cls: "bg-red-500/15 text-red-400 border-red-500/30" };
	return { icon: "📅", label: "Upcoming", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
}

/** Return YYYY-MM-DD in America/Chicago (CST/CDT) */
function getCSTDateStr(d: Date): string {
	return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

/** Compute Mon/Fri bounds for a given week offset (0 = this week, 1 = next) */
function getWeekBounds(weekOffset: number): { start: string; end: string } {
	const now = new Date();
	const todayCST = getCSTDateStr(now);
	const dowCST = new Date(todayCST + "T12:00:00Z").getUTCDay();
	const daysToMon = dowCST === 0 ? -6 : 1 - dowCST;
	const monday = new Date(now.getTime() + (daysToMon + weekOffset * 7) * 86400000);
	const friday = new Date(monday.getTime() + 4 * 86400000);
	return { start: getCSTDateStr(monday), end: getCSTDateStr(friday) };
}

function EarningsRow({ entry }: { entry: StakEarningsEntry }) {
	const cfg = statusCfg(entry.status);
	const hl = entry.hour === "bmo" ? "pre-mkt" : entry.hour === "amc" ? "after close" : entry.hour;

	return (
		<div className="flex items-center gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
			<div className="flex-1 min-w-0">
				<span className="font-bold text-white text-sm">{entry.brand.ticker}</span>
				<span className="text-[10px] text-zinc-400 ml-2">{entry.brand.name}</span>
			</div>
			<span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
				{cfg.icon} {cfg.label}
			</span>
			{hl && entry.status === "upcoming" && (
				<span className="shrink-0 text-[10px] text-zinc-500">{hl}</span>
			)}
		</div>
	);
}

export function EarningsCalendarButton() {
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<Tab>("today");

	const [stakBrands] = useState<BrandProfile[]>(() => {
		try {
			return JSON.parse(localStorage.getItem("my-stak") ?? "[]");
		} catch {
			return [];
		}
	});

	const earningsResults = useQueries({
		queries: stakBrands.map((brand) => ({
			queryKey: ["earnings", brand.ticker],
			queryFn: () => getEarnings(brand.ticker),
			staleTime: 5 * 60 * 1000,
			refetchInterval: 5 * 60 * 1000,
			retry: 1,
		})),
	});

	const newsResults = useQueries({
		queries: stakBrands.map((brand) => ({
			queryKey: ["company-news", brand.ticker],
			queryFn: () => getCompanyNews(brand.ticker, brand.name),
			staleTime: 5 * 60 * 1000,
			refetchInterval: 30 * 60 * 1000,
			retry: 1,
		})),
	});

	const isLoading =
		earningsResults.some((r) => r.isLoading) ||
		newsResults.some((r) => r.isLoading);

	const todayCST = getCSTDateStr(new Date());
	const thisWeek = getWeekBounds(0);
	const nextWeek = getWeekBounds(1);

	const entries: StakEarningsEntry[] = stakBrands.reduce<StakEarningsEntry[]>((acc, brand, i) => {
		const cal = earningsResults[i]?.data;
		const news = newsResults[i]?.data;

		if (cal?.status === "upcoming" && cal.date) {
			acc.push({ brand, status: "upcoming", date: cal.date, hour: cal.hour });
		} else if ((cal?.status === "beat" || cal?.status === "miss") && cal.date) {
			acc.push({ brand, status: cal.status, date: cal.date });
		} else {
			const sig = news?.earningsSignal;
			if (sig?.status === "beat" || sig?.status === "miss") {
				const date = cal?.date ?? sig.date;
				if (date) acc.push({ brand, status: sig.status, date });
			}
		}
		return acc;
	}, []);

	const todayEntries = entries.filter((e) => e.date === todayCST);
	const weekEntries = entries.filter((e) => e.date >= thisWeek.start && e.date <= thisWeek.end);
	const nextWeekEntries = entries.filter(
		(e) => e.status === "upcoming" && e.date >= nextWeek.start && e.date <= nextWeek.end,
	);

	const tabEntries =
		tab === "today" ? todayEntries : tab === "week" ? weekEntries : nextWeekEntries;

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="relative w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/70 hover:bg-slate-700/70 border border-slate-600/50 hover:border-cyan-500/40 text-zinc-300 hover:text-white transition-all"
			title="Earnings Calendar"
			>
				<CalendarDays className="w-5 h-5 text-cyan-400" />
				
				{todayEntries.length > 0 && (
					<span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center">
						{todayEntries.length > 9 ? "9+" : todayEntries.length}
					</span>
				)}
			</button>

			{open &&
				createPortal(
					<div
					className="fixed inset-0 z-[70] flex items-center justify-center px-4"
					onClick={() => setOpen(false)}
				>
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
					<div
						className="relative w-full max-w-md"
						onClick={(e) => e.stopPropagation()}
					>
						<MarketEarningsWidget onClose={() => setOpen(false)} />
					</div>
				</div>,
			document.body,
		)}
		</>
	);
}

// ── Market-wide Earnings Widget ───────────────────────────────────────────────

type MarketTab = "today" | "tomorrow" | "week";

function tickerColor(symbol: string): string {
	const palette = [
		"bg-blue-600", "bg-violet-600", "bg-cyan-600", "bg-emerald-600",
		"bg-orange-600", "bg-rose-600", "bg-indigo-600", "bg-teal-600",
	];
	let hash = 0;
	for (const c of symbol) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
	return palette[Math.abs(hash) % palette.length];
}

function TickerLogo({ symbol }: { symbol: string }) {
	const [err, setErr] = useState(false);
	if (!err) {
		return (
			<div className="w-9 h-9 rounded-full bg-white/5 border border-slate-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
				<img
					src={`https://assets.parqet.com/logos/symbol/${symbol}?format=png`}
					alt={symbol}
					className="w-7 h-7 object-contain"
					onError={() => setErr(true)}
				/>
			</div>
		);
	}
	return (
		<div className={`w-9 h-9 rounded-full ${tickerColor(symbol)} flex items-center justify-center flex-shrink-0`}>
			<span className="text-white text-[11px] font-bold">{symbol.slice(0, 2)}</span>
		</div>
	);
}

function CircularProgress({ pct }: { pct: number }) {
	const r = 26;
	const circ = 2 * Math.PI * r;
	const dash = (pct / 100) * circ;
	const color = pct >= 50 ? "#22c55e" : "#ef4444";
	return (
		<div className="flex flex-col items-center gap-0.5">
			<svg width="64" height="64" viewBox="0 0 64 64">
				<circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
				<circle
					cx="32" cy="32" r={r} fill="none"
					stroke={color} strokeWidth="6"
					strokeDasharray={`${dash} ${circ}`}
					strokeLinecap="round"
					transform="rotate(-90 32 32)"
				/>
				<text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">
					{pct}%
				</text>
			</svg>
			<p className="text-[10px] text-zinc-400">Positive</p>
		</div>
	);
}

function formatEps(val: number | null) {
	if (val == null) return "—";
	return `$${val.toFixed(2)}`;
}

function formatHour(hour: string | null, date: string) {
	const timeLabel = hour === "bmo" ? "Pre-market" : hour === "amc" ? "After close" : null;
	const d = new Date(date + "T12:00:00Z");
	const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
	return timeLabel ? `${day} · ${timeLabel}` : day;
}

function formatDate(dateStr: string): string {
	if (!dateStr) return "";
	const [year, month, day] = dateStr.split("-").map(Number);
	const d = new Date(year, month - 1, day);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MarketRow({ entry }: { entry: MarketEarningsEntry }) {
	const beat = entry.status === "beat";
	const miss = entry.status === "miss";
	const upcoming = entry.status === "upcoming";

	return (
		<div className="flex items-center gap-2.5 py-2.5 border-b border-slate-700/20 last:border-0">
			{/* Logo */}
			<TickerLogo symbol={entry.symbol} />

			{/* Company */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5">
					<span className="font-bold text-white text-sm">{entry.symbol}</span>
					{(beat || miss) && (
						<span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
							beat ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
						}`}>
							{beat ? "Beat" : "Miss"}
						</span>
					)}
				</div>
				<p className="text-[10px] text-zinc-500 truncate">
					{upcoming ? formatHour(entry.hour, entry.date) : entry.name}
				</p>
			</div>

			{/* EPS or Upcoming pill */}
			<div className="text-right shrink-0 w-[5.5rem]">
				{upcoming ? (
					<>
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
						Upcoming
					</span>
					<p className="text-[9px] text-zinc-500 mt-0.5 tabular-nums">{formatDate(entry.date)}</p>
					</>
				) : (
					<>
						<p className={`text-sm font-bold tabular-nums ${beat ? "text-green-400" : miss ? "text-red-400" : "text-zinc-200"}`}>
							{formatEps(entry.epsActual)}
						</p>
						<p className="text-[10px] text-zinc-500 tabular-nums">vs {formatEps(entry.epsEstimate)}</p>
					<p className="text-[9px] text-zinc-600 mt-0.5">{formatDate(entry.date)}</p>
					</>
				)}
			</div>

			{/* Rev % pill */}
			<div className="shrink-0 w-20 text-right">
				{!upcoming && entry.revChangePct != null ? (
					<span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
						entry.revChangePct >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
					}`}>
						{entry.revChangePct >= 0 ? "+" : ""}{entry.revChangePct.toFixed(1)}%
					</span>
				) : (
					<span className="text-xs text-zinc-700">—</span>
				)}
			</div>

			{/* Sentiment bar */}
			<div className="shrink-0 w-20">
				<div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
					{(beat || miss) && (
						<div
							className={`h-full rounded-full ${beat
								? "bg-gradient-to-r from-green-700 to-green-400"
								: "bg-gradient-to-r from-red-700 to-red-400"}`}
							style={{ width: beat ? "78%" : "22%" }}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

export function MarketEarningsWidget({ onClose }: { onClose?: () => void } = {}) {
	const [tab, setTab] = useState<MarketTab>("today");
	const [expanded, setExpanded] = useState(true);
	const [showAll, setShowAll] = useState(false);

	const { data, isLoading } = useQuery({
		queryKey: ["market-earnings", tab],
		queryFn: () => getMarketEarnings(tab),
		staleTime: 10 * 60 * 1000,
		refetchInterval: 15 * 60 * 1000,
		retry: 1,
	});

	const stakTickers = new Set<string>(
		(() => { try { return JSON.parse(localStorage.getItem("my-stak") ?? "[]"); } catch { return []; } })()
			.map((b: { ticker: string }) => b.ticker.toUpperCase())
	);
	const entries = (data?.entries ?? []).filter((e) => stakTickers.has(e.symbol));
	const reported = entries.filter((e) => e.status !== "upcoming" && e.status !== "none");
	const beats = reported.filter((e) => e.status === "beat");
	const positivePct = reported.length > 0 ? Math.round((beats.length / reported.length) * 100) : 0;
	const tabLabel = tab === "today" ? "Today" : tab === "tomorrow" ? "Tomorrow" : "This Week";
	const visibleEntries = showAll ? entries : entries.slice(0, 8);

	if (!expanded && !onClose) {
		return (
			<button
				onClick={() => setExpanded(true)}
				className="w-full flex items-center justify-between px-4 py-3 mb-4 bg-[#0b1121]/80 border border-slate-700/50 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:border-cyan-500/30 transition-all"
			>
				<span className="flex items-center gap-2">
					<CalendarDays className="w-4 h-4 text-cyan-400" />
					Earnings Calendar
					<span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">Your Stak</span>
				</span>
				<ChevronRight className="w-3.5 h-3.5 rotate-90" />
			</button>
		);
	}

	return (
		<div className="mb-6 bg-[#0b1121] border border-slate-700/50 rounded-2xl overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-4 pb-3">
				<h2 className="text-sm font-bold text-white flex items-center gap-2">
					<CalendarDays className="w-4 h-4 text-cyan-400" />
					Earnings Calendar
					<span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">Your Stak</span>
				</h2>
				<button
					onClick={() => onClose ? onClose() : setExpanded(false)}
					className="p-1 rounded-full text-zinc-500 hover:text-white transition-colors"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			</div>

			{/* Tabs — segmented control style */}
			<div className="flex mx-4 mb-3 bg-slate-800/60 rounded-xl p-0.5">
				{(["today", "tomorrow", "week"] as const).map((t) => (
					<button
						key={t}
						onClick={() => { setTab(t); setShowAll(false); }}
						className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all ${
							tab === t
								? "bg-[#0b1121] text-white shadow"
								: "text-zinc-500 hover:text-zinc-300"
						}`}
					>
						{t === "today" ? "Today" : t === "tomorrow" ? "Tomorrow" : "This Week"}
					</button>
				))}
			</div>

			{/* Summary row */}
			{reported.length > 0 && (
				<div className="flex items-center justify-between px-4 py-3 mx-4 mb-2 bg-slate-800/30 rounded-xl border border-slate-700/30">
					<div>
						<p className="text-white font-bold leading-none">
							<span className="text-2xl mr-1.5 tabular-nums">{entries.length}</span>
							<span className="text-sm">Reporting {tabLabel}</span>
						</p>
						<div className="flex items-center gap-3 mt-2">
							<span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
								<span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Beat
							</span>
							<span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
								<span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Miss
							</span>
							<span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
								<span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Upcoming
							</span>
						</div>
					</div>
					<CircularProgress pct={positivePct} />
				</div>
			)}

			{/* Column headers */}
			{entries.length > 0 && (
				<div className="flex items-center gap-2.5 px-4 pt-2 pb-1">
					<div className="w-9 shrink-0" />
					<span className="flex-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Company</span>
					<span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide w-[5.5rem] text-right">EPS</span>
					<span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide w-20 text-right">Revenue</span>
					<span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide w-20">Sentiment</span>
				</div>
			)}

			{/* Rows */}
			<div className="px-4 pb-1">
				{isLoading ? (
					<div className="py-8 text-center text-zinc-500 text-xs animate-pulse">Loading earnings…</div>
				) : entries.length === 0 ? (
					<div className="py-8 text-center text-zinc-500 text-xs">
						No earnings in your Stak {tabLabel.toLowerCase()}
					</div>
				) : (
					visibleEntries.map((e) => <MarketRow key={e.symbol} entry={e} />)
				)}
			</div>

			{/* Footer */}
			{entries.length > 8 && (
				<div className="px-4 py-3 border-t border-slate-700/30 text-center">
					<button
						type="button"
						onClick={() => setShowAll((s) => !s)}
						className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
					>
						{showAll ? "Show less" : `+${entries.length - 8} more — tap to see all`}
					</button>
				</div>
			)}
		</div>
	);
}

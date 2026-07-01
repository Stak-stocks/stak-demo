import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, X } from "lucide-react";
import { type BrandSummary, getBrandLogoUrl, getEasternDateKey } from "@stak/shared";
import { useAccount } from "@/context/AccountContext";
import { useStakTickers } from "@/hooks/useStakTickers";
import { useBrandsList } from "@/hooks/useBrandsList";
import { getEarnings, getCompanyNews, getMarketEarnings, type MarketEarningsEntry } from "@/lib/api";

type MarketTab = "today" | "tomorrow" | "week";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
	if (!dateStr) return "";
	const [year, month, day] = dateStr.split("-").map(Number);
	const d = new Date(year!, month! - 1, day!);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHour(hour: string | null | undefined): string {
	if (hour === "bmo") return "Pre-market ET";
	if (hour === "amc") return "After close ET";
	return "Market hours ET";
}

function formatEps(val: number | null): string {
	if (val == null) return "—";
	return `$${val.toFixed(2)}`;
}

// ── Logo ─────────────────────────────────────────────────────────────────────

function TickerLogo({ symbol, size = 36 }: { symbol: string; size?: number }) {
	const { data: allBrands } = useBrandsList();
	const brand = allBrands?.find(b => b.ticker.toUpperCase() === symbol.toUpperCase());
	const [err, setErr] = useState(false);
	const cls = `rounded-full bg-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center`;
	const style = { width: size, height: size };
	if (brand && !err) {
		return (
			<div className={cls} style={style}>
				<img src={getBrandLogoUrl(brand)} alt={symbol}
					className="object-contain" style={{ width: size * 0.72, height: size * 0.72 }}
					onError={() => setErr(true)} />
			</div>
		);
	}
	return (
		<div className={`${cls} bg-violet-500/20`} style={style}>
			<span className="text-[11px] font-bold text-violet-400">{symbol.slice(0, 2)}</span>
		</div>
	);
}

// ── Single earnings row ───────────────────────────────────────────────────────

function EarningsRow({ entry, onNavigate }: { entry: MarketEarningsEntry; onNavigate?: (brand: BrandSummary) => void }) {
	const beat = entry.status === "beat";
	const miss = entry.status === "miss";
	const upcoming = entry.status === "upcoming";
	const { data: allBrands } = useBrandsList();
	const brand = allBrands?.find(b => b.ticker.toUpperCase() === entry.symbol.toUpperCase());
	const Wrapper = brand && onNavigate ? "button" : "div";

	return (
		<Wrapper
			type={brand && onNavigate ? "button" : undefined}
			onClick={brand && onNavigate ? () => onNavigate(brand) : undefined}
			className={`flex w-full items-center gap-[12px] px-[16px] py-[12px] border-b border-foreground/[0.05] last:border-0 text-left ${brand && onNavigate ? "hover:bg-foreground/[0.03] active:bg-foreground/[0.05] transition-colors" : ""}`}
		>
			<TickerLogo symbol={entry.symbol} />

			{/* Name + timing */}
			<div className="flex-1 min-w-0">
				<p className="text-[14px] font-bold leading-tight">{entry.symbol}</p>
				<p className="text-[11px] dark:text-slate-400 text-slate-500 truncate mt-[1px]">
					{upcoming
						? `${formatDate(entry.date)} · ${formatHour(entry.hour)}`
						: entry.name ?? entry.symbol}
				</p>
			</div>

			{/* Right side */}
			<div className="text-right shrink-0">
				{upcoming ? (
					<span className="inline-block text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
						Upcoming
					</span>
				) : (
					<>
						<div className="flex items-center gap-[6px] justify-end mb-[2px]">
							<span className={`text-[11px] font-bold px-[7px] py-[2px] rounded-full ${beat ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/15 text-rose-400 border border-rose-500/25"}`}>
								{beat ? "Beat ✓" : "Missed ✗"}
							</span>
						</div>
						<p className="text-[11px] dark:text-slate-400 text-slate-500">
							{formatEps(entry.epsActual)} <span className="text-foreground/30">vs</span> {formatEps(entry.epsEstimate)}
						</p>
						{entry.priceChangePct != null && (
							<p className={`text-[10px] font-semibold mt-[1px] ${entry.priceChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
								{entry.priceChangePct >= 0 ? "▲" : "▼"} {Math.abs(entry.priceChangePct).toFixed(1)}% on day
							</p>
						)}
					</>
				)}
			</div>
		</Wrapper>
	);
}

// ── Main modal widget ─────────────────────────────────────────────────────────

export function MarketEarningsWidget({ onClose, onSelectBrand }: { onClose?: () => void; onSelectBrand?: (brand: BrandSummary) => void } = {}) {
	const [tab, setTab] = useState<MarketTab>("today");
	const [showAll, setShowAll] = useState(false);
	const navigate = useNavigate();

	const handleRowNavigate = (brand: BrandSummary) => {
		onClose?.();
		// When opened from within my-stak.tsx itself, onSelectBrand updates its
		// selectedBrand state directly -- navigating to /my-stak while already
		// there is a no-op and wouldn't open the sheet. Everywhere else, every
		// entry here is already filtered to the viewer's own Stak (see
		// stakTickersSet below), so it's always present in my-stak.tsx's
		// swipedBrands -- go there and let its existing "restore selected brand"
		// effect open the redesigned detail sheet (Numbers/Analyst/News/Compare),
		// instead of the old /brand/$brandId route page.
		if (onSelectBrand) {
			onSelectBrand(brand);
			return;
		}
		sessionStorage.setItem("selectedBrandId", brand.id);
		navigate({ to: "/my-stak" });
	};

	const stakTickersArray = useStakTickers();
	const stakTickersSet = useMemo(() => new Set(stakTickersArray), [stakTickersArray]);

	const { data, isLoading } = useQuery({
		queryKey: ["market-earnings", tab, stakTickersArray],
		queryFn: () => getMarketEarnings(tab, stakTickersArray),
		staleTime: 30 * 60 * 1000,
		retry: 1,
	});

	const entries = (data?.entries ?? []).filter(e => stakTickersSet.has(e.symbol));
	const upcoming = entries.filter(e => e.status === "upcoming");
	const beats = entries.filter(e => e.status === "beat");
	const misses = entries.filter(e => e.status === "miss");
	const visibleEntries = showAll ? entries : entries.slice(0, 10);

	const tabLabel = { today: "Today", tomorrow: "Tomorrow", week: "This Week" }[tab];

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Earnings Calendar"
			className="flex flex-col bg-background rounded-t-[24px] border-t border-foreground/10"
			style={{ maxHeight: "min(85vh, calc(100vh - 4rem - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 16px))" }}
		>
			{/* Drag handle */}
			<div className="w-[40px] h-[4px] rounded-full bg-foreground/15 mx-auto mt-[12px] mb-[4px] shrink-0" />

			{/* Header */}
			<div className="flex items-center justify-between px-[18px] py-[14px] shrink-0 border-b border-foreground/[0.06]">
				<div className="flex items-center gap-[10px]">
					<CalendarDays size={18} className="text-blue-400" />
					<h2 className="text-[17px] font-extrabold">Earnings Calendar</h2>
					<span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
						Your Stak
					</span>
				</div>
				{onClose && (
					<button type="button" onClick={onClose} aria-label="Close"
						className="w-[40px] h-[40px] rounded-full bg-foreground/[0.07] flex items-center justify-center dark:text-slate-400 text-slate-500 hover:bg-foreground/[0.12] active:opacity-70 transition-colors">
						<X size={16} />
					</button>
				)}
			</div>

			{/* Tab switcher */}
			<div className="px-[16px] pt-[12px] pb-[8px] shrink-0">
				<div className="flex rounded-[12px] border border-foreground/10 p-[3px] bg-foreground/[0.02]">
					{(["today", "tomorrow", "week"] as const).map(t => (
						<button key={t} type="button" onClick={() => { setTab(t); setShowAll(false); }}
							className={`flex-1 text-[12px] font-semibold py-[11px] rounded-[9px] transition-colors ${tab === t ? "bg-foreground text-background shadow-sm" : "dark:text-slate-400 text-slate-500 hover:text-foreground/80"}`}>
							{t === "today" ? "Today" : t === "tomorrow" ? "Tomorrow" : "This Week"}
						</button>
					))}
				</div>
			</div>

			{/* Summary pills */}
			{entries.length > 0 && (
				<div className="flex items-center gap-[8px] px-[16px] pb-[10px] shrink-0">
					{upcoming.length > 0 && (
						<span className="text-[11px] font-semibold px-[9px] py-[4px] rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
							{upcoming.length} upcoming
						</span>
					)}
					{beats.length > 0 && (
						<span className="text-[11px] font-semibold px-[9px] py-[4px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
							{beats.length} beat
						</span>
					)}
					{misses.length > 0 && (
						<span className="text-[11px] font-semibold px-[9px] py-[4px] rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
							{misses.length} missed
						</span>
					)}
				</div>
			)}

			{/* List -- sized to content (not flex-1) so 1-2 entries don't leave a big empty
			    gap below them; min-h-0 lets it still shrink and scroll internally once the
			    modal's maxHeight cap is reached with many entries. */}
			<div className="min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-surface-1 border-t border-foreground/[0.05]">
				{isLoading ? (
					<div className="space-y-[1px] py-[8px]">
						{[...Array(4)].map((_, i) => (
							<div key={i} className="flex items-center gap-[12px] px-[16px] py-[12px]">
								<div className="w-[36px] h-[36px] rounded-full bg-foreground/10 animate-pulse shrink-0" />
								<div className="flex-1 space-y-[6px]">
									<div className="h-[13px] w-[80px] rounded bg-foreground/10 animate-pulse" />
									<div className="h-[10px] w-[120px] rounded bg-foreground/[0.07] animate-pulse" />
								</div>
								<div className="h-[24px] w-[64px] rounded-full bg-foreground/10 animate-pulse" />
							</div>
						))}
					</div>
				) : entries.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-[48px] px-[24px] text-center">
						<CalendarDays size={32} className="dark:text-slate-600 text-slate-300 mb-[12px]" />
						<p className="text-[14px] font-semibold dark:text-slate-400 text-slate-500">
							No earnings in your Stak {tabLabel.toLowerCase()}
						</p>
						<p className="text-[12px] dark:text-slate-500 text-slate-400 mt-[4px]">
							Check another tab or add more stocks
						</p>
					</div>
				) : (
					<>
						{visibleEntries.map(e => <EarningsRow key={e.symbol} entry={e} onNavigate={handleRowNavigate} />)}
						{entries.length > 10 && (
							<button type="button" onClick={() => setShowAll(s => !s)}
								className="w-full py-[14px] text-[12px] font-semibold text-blue-400 hover:text-blue-300 active:opacity-70 border-t border-foreground/[0.05] transition-colors">
								{showAll ? "Show less" : `Show ${entries.length - 10} more`}
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}

// ── Button + portal wrapper ───────────────────────────────────────────────────

export function EarningsCalendarButton({ onOpen, externalOpen, onExternalClose, onSelectBrand }: {
	onOpen?: () => void;
	externalOpen?: boolean;
	onExternalClose?: () => void;
	onSelectBrand?: (brand: BrandSummary) => void;
} = {}) {
	const [open, setOpen] = useState(false);
	const { account } = useAccount();
	const modalRef = useRef<HTMLDivElement>(null);

	// Allow parent to open programmatically
	useEffect(() => {
		if (externalOpen) setOpen(true);
	}, [externalOpen]);

	const close = () => { setOpen(false); onExternalClose?.(); };

	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => { document.body.style.overflow = prev; };
	}, [open]);

	// Escape-to-close + a focus trap so keyboard/screen-reader users on desktop
	// can't tab out to the page behind the modal. Re-queries focusable elements
	// on every Tab press rather than caching them once, since the row list
	// changes shape as data loads in (skeleton -> rows -> "show more").
	useEffect(() => {
		if (!open) return;
		const getFocusable = () => Array.from(
			modalRef.current?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			) ?? [],
		);
		getFocusable()[0]?.focus();

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") { close(); return; }
			if (e.key !== "Tab") return;
			const focusable = getFocusable();
			if (focusable.length === 0) return;
			const first = focusable[0]!;
			const last = focusable[focusable.length - 1]!;
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open]);

	// Count today's entries for badge
	const { data: allBrands } = useBrandsList();
	const stakBrands = useMemo<BrandSummary[]>(() => {
		const brandMap = new Map((allBrands ?? []).map(b => [b.id, b]));
		return (account?.stakBrandIds ?? []).map(id => brandMap.get(id)).filter(Boolean) as BrandSummary[];
	}, [account?.stakBrandIds, allBrands]);

	const earningsResults = useQueries({
		queries: stakBrands.map(brand => ({
			queryKey: ["earnings", brand.ticker],
			queryFn: () => getEarnings(brand.ticker),
			staleTime: 5 * 60 * 1000,
			retry: 1,
		})),
	});

	const newsResults = useQueries({
		queries: stakBrands.map(brand => ({
			queryKey: ["company-news", brand.ticker],
			queryFn: () => getCompanyNews(brand.ticker, brand.name),
			staleTime: 5 * 60 * 1000,
			retry: 1,
		})),
	});

	const todayET = getEasternDateKey();
	const todayCount = stakBrands.reduce((n, _brand, i) => {
		const cal = earningsResults[i]?.data;
		const news = newsResults[i]?.data;
		const date = cal?.date ?? news?.earningsSignal?.date ?? null;
		return date === todayET ? n + 1 : n;
	}, 0);

	return (
		<>
			<button
				type="button"
				onClick={() => { setOpen(true); onOpen?.(); }}
				className="relative w-[40px] h-[40px] flex items-center justify-center rounded-full bg-surface-2 border border-foreground/10 dark:text-slate-300 text-slate-700 hover:bg-foreground/[0.06] active:opacity-70 transition-colors"
				title="Earnings Calendar"
			>
				<CalendarDays size={18} className="text-blue-400" />
				{todayCount > 0 && (
					<span className="absolute -top-[3px] -right-[3px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
						{todayCount > 9 ? "9+" : todayCount}
					</span>
				)}
			</button>

			{open && createPortal(
				<div className="fixed inset-0 z-[70]" onClick={close}>
					<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
					<div
						ref={modalRef}
						className="absolute left-0 right-0 max-w-lg mx-auto"
						style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
						onClick={e => e.stopPropagation()}
					>
						<MarketEarningsWidget onClose={close} onSelectBrand={onSelectBrand} />
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}

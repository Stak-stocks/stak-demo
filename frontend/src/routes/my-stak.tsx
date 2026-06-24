import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { BrandProfile, BrandSummary } from "@stak/shared";
import { useBrandsList } from "@/hooks/useBrandsList";
import { useBrandDetail } from "@/hooks/useBrandDetail";
import { BrandLogo } from "@/components/BrandLogo";
import { Sparkles, TrendingUp, X, ChevronRight, ChevronLeft, GitCompare, Bookmark, ShoppingBag, Shield, CalendarDays, FileText, BarChart3, DollarSign, Building2, Target, Plus, ArrowLeftRight } from "lucide-react";

import { toast } from "sonner";
import { getStockData, getCompanyNews, getAnalystData, getAnalystActions, getMarketEarnings, getDailyBrief, recordEngagement, trackEvent, getPeerMetrics, getDailyMove } from "@/lib/api";
import { marketSessionBucket, getLastCloseRef } from "@/lib/utils";
import { computeTopDisplayCategory } from "@stak/shared";
import type { PeerMetrics } from "@/lib/api";
import { WATCH_LIST_LIMIT } from "@/lib/constants";
import { logEvent } from "@/lib/firebase";
import { useAccount } from "@/context/AccountContext";
import { EarningsCalendarButton } from "@/components/EarningsCalendar";

export const Route = createFileRoute("/my-stak")({
	component: MyStakPage,
});


const CATEGORY_META: Record<string, string> = {
	tech: "Tech", gaming: "Gaming", streaming: "Streaming", fashion: "Fashion",
	food_drink: "Consumer Brand", food: "Consumer Brand", travel: "Travel & Leisure",
	fitness: "Fitness & Health", finance: "Finance", beauty: "Beauty", music: "Music & Media",
	shopping: "Retail", energy: "Clean Energy", lifestyle: "Lifestyle",
};

function WatchRow({ brand, onRemove, onClick }: {
	brand: BrandSummary;
	onRemove: (e: React.MouseEvent) => void;
	onClick: () => void;
}) {
	const { data: stockData } = useQuery({
		queryKey: ["stock", brand.ticker],
		queryFn: () => getStockData(brand.ticker),
		staleTime: 60 * 1000,
		refetchInterval: 60 * 1000,
		retry: 1,
	});

	const quote = stockData?.quote;
	const up = (quote?.changePercent ?? 0) >= 0;
	const categoryMeta = CATEGORY_META[brand.interestCategories?.[0] ?? ""] ?? brand.ticker;

	return (
		<div
			className="flex min-h-[48px] items-center rounded-[9px] px-[5px] py-[4px] active:bg-foreground/[0.03] transition-colors cursor-pointer"
			onClick={onClick}
		>
			{/* Logo circle */}
			<div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,.3)]">
				<BrandLogo brand={brand} className="w-[26px] h-[26px] rounded-full" />
			</div>

			{/* Name + meta */}
			<div className="ml-[11px] min-w-0 flex-1">
				<div className="flex items-center justify-between">
					<p className="text-[14px] font-semibold leading-none dark:text-slate-300 text-slate-600">{brand.name}</p>
					{quote ? (
						<p className={`mr-[25px] text-[13px] font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
							{up ? "+" : ""}{quote.changePercent.toFixed(2)}%
						</p>
					) : (
						<div className="mr-[25px] h-[13px] w-[40px] rounded dark:bg-slate-700/50 bg-slate-200/70 animate-pulse" />
					)}
				</div>
				<div className="mt-[6px] flex items-center gap-[9px] text-[10px] leading-none text-slate-500">
					<span>{categoryMeta}</span>
					{quote && (
						<>
							<span className="h-[3px] w-[3px] rounded-full bg-slate-500/70" />
							<span>${quote.price.toFixed(2)}</span>
						</>
					)}
				</div>
			</div>

			<button
				type="button"
				onClick={onRemove}
				className="mr-[2px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-slate-600 hover:bg-red-500/15 hover:text-red-400 transition-all"
				aria-label={`Remove ${brand.name}`}
			>
				<X className="w-[12px] h-[12px]" />
			</button>

			<ChevronRight size={17} className="shrink-0 dark:text-slate-400 text-slate-500/90" strokeWidth={1.8} />
		</div>
	);
}

function StakWatchList({ brands, onRemove, onClick }: {
	brands: BrandSummary[];
	onRemove: (e: React.MouseEvent, brand: BrandSummary) => void;
	onClick: (brand: BrandSummary) => void;
}) {
	const [showAll, setShowAll] = useState(false);
	const visible = showAll ? brands : brands.slice(0, WATCH_LIST_LIMIT);

	return (
		<div className="relative overflow-hidden rounded-[12px] border border-blue-500/70 bg-surface-1 shadow-[0_0_0_1px_rgba(168,85,247,.35),0_18px_55px_rgba(0,0,0,.55)]">
			<div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 95% 0%, rgba(168,85,247,.16), transparent 34%), radial-gradient(circle at 0% 100%, rgba(59,130,246,.14), transparent 34%)" }} />
			<div className="relative z-10 px-[13px] py-[11px] space-y-[4px]">
				{visible.map((brand) => (
					<WatchRow
						key={brand.id}
						brand={brand}
						onRemove={(e) => onRemove(e, brand)}
						onClick={() => onClick(brand)}
					/>
				))}
			</div>
			{brands.length > WATCH_LIST_LIMIT && (
				<button
					type="button"
					onClick={() => setShowAll((v) => !v)}
					className="relative z-10 w-full border-t border-foreground/[0.06] py-[10px] text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
				>
					{showAll ? "Show less" : `See all ${brands.length} stocks`}
				</button>
			)}
		</div>
	);
}

function deriveRiskLabel(stakBrands: BrandSummary[]): { title: string; subtitle: string } {
	const betas = stakBrands
		.map((b) => parseFloat(b.financials?.beta?.value ?? ""))
		.filter((v) => !isNaN(v));
	if (betas.length === 0) return { title: "Moderate", subtitle: "Risk" };
	const avg = betas.reduce((a, b) => a + b, 0) / betas.length;
	if (avg >= 1.4) return { title: "High",     subtitle: "Risk" };
	if (avg >= 0.85) return { title: "Moderate", subtitle: "Risk" };
	return { title: "Low", subtitle: "Risk" };
}

type StatColor = "blue" | "purple" | "green";

const STAT_COLORS: Record<StatColor, string> = {
	blue:   "text-blue-400   border-blue-400/10   bg-blue-500/[0.08]   shadow-[0_0_22px_rgba(59,130,246,.08)]",
	purple: "text-violet-400 border-violet-400/10 bg-violet-500/[0.08] shadow-[0_0_22px_rgba(139,92,246,.08)]",
	green:  "text-emerald-400 border-emerald-400/10 bg-emerald-500/[0.08] shadow-[0_0_22px_rgba(16,185,129,.08)]",
};

function StatCard({ icon, iconColor, number, title, subtitle, onClick }: {
	icon: React.ReactNode;
	iconColor: StatColor;
	number?: string;
	title: string;
	subtitle?: string;
	onClick?: () => void;
}) {
	const Wrapper = onClick ? "button" : "div";
	return (
		<Wrapper type={onClick ? "button" : undefined} onClick={onClick}
			className={`flex flex-col rounded-[20px] border border-foreground/[0.04] bg-surface-1 px-[10px] py-[10px] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl w-full text-left overflow-hidden ${onClick ? "active:opacity-75 transition-opacity" : ""}`}>
			<div className={`grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[10px] border ${STAT_COLORS[iconColor]}`}>
				{icon}
			</div>
			<div className="mt-[8px]">
				{number ? (
					<div>
						<p className="text-[22px] font-bold leading-none tracking-[-0.04em] text-foreground">{number}</p>
						<p className="text-[10px] leading-[13px] text-foreground/95 mt-[2px]">{title}</p>
						{subtitle && <p className="text-[9px] leading-[12px] dark:text-slate-400 text-slate-500">{subtitle}</p>}
					</div>
				) : (
					<div>
						<p className="text-[10px] font-semibold leading-[13px] text-foreground/95">{title}</p>
						{subtitle && <p className="mt-[1px] text-[10px] leading-[13px] dark:text-slate-400 text-slate-500">{subtitle}</p>}
					</div>
				)}
			</div>
			{onClick && <p className="text-[10px] text-blue-400/70 mt-[3px]">Tap to view →</p>}
		</Wrapper>
	);
}

function formatGrowth(val: string | number | undefined | null): { display: string; color: string } {
	if (val == null) return { display: "—", color: "dark:text-slate-400 text-slate-500" };
	const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
	if (isNaN(num)) return { display: String(val), color: "dark:text-slate-400 text-slate-500" };
	const positive = num >= 0;
	const raw = String(val).replace(/^\+/, "");
	return {
		display: positive ? `+${raw}` : raw,
		color: positive ? "text-emerald-400" : "text-rose-400",
	};
}

type NtmBadgeColor = "yellow" | "green" | "blue";
const NTM_BADGE_STYLES: Record<NtmBadgeColor, string> = {
	yellow: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",
	green:  "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
	blue:   "bg-blue-500/15 text-blue-300 border-blue-400/20",
};

function deriveMetricBadge(key: string, value: string | number | undefined | null): { label: string; color: NtmBadgeColor } {
	if (value == null) return { label: "—", color: "blue" };
	const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
	switch (key) {
		case "peRatio":
			if (num > 40) return { label: "High",         color: "yellow" };
			if (num > 25) return { label: "Slightly High",color: "yellow" };
			if (num > 12) return { label: "Moderate",     color: "blue"   };
			return             { label: "Value Play",    color: "green"  };
		case "revenueGrowth":
			if (num > 15) return { label: "Strong Growth", color: "green"  };
			if (num > 5)  return { label: "Above Avg",     color: "green"  };
			if (num >= 0) return { label: "Moderate",      color: "blue"   };
			return             { label: "Declining",      color: "yellow" };
		case "profitMargin":
			if (num > 20) return { label: "Excellent", color: "green"  };
			if (num > 8)  return { label: "Strong",    color: "green"  };
			if (num > 0)  return { label: "Healthy",   color: "blue"   };
			return             { label: "Tight",      color: "yellow" };
		case "marketCap":
			if ((typeof value === "string" && value.includes("T")) || num > 200) return { label: "Mega Cap",  color: "blue" };
			if (num > 10) return { label: "Large Cap", color: "blue"   };
			if (num > 2)  return { label: "Mid Cap",   color: "blue"   };
			return             { label: "Small Cap",  color: "yellow" };
		default:
			return { label: "—", color: "blue" };
	}
}

function NtmBadge({ children, color }: { children: React.ReactNode; color: NtmBadgeColor }) {
	return (
		<span className={`whitespace-nowrap rounded-full border px-[8px] py-[3px] text-[11px] font-semibold ${NTM_BADGE_STYLES[color]}`}>
			{children}
		</span>
	);
}

function NtmColumn({ label, value }: { label: string; value: string }) {
	return (
		<div className="w-[52px] shrink-0 border-l border-foreground/10 pl-[10px]">
			<p className="flex h-[14px] items-center whitespace-nowrap text-[10px] leading-none dark:text-slate-400 text-slate-500">{label}</p>
			<p className="text-[13px] font-semibold leading-none text-foreground/85">{value}</p>
		</div>
	);
}

function NtmRow({ icon, color, title, subtitle, value, badge, badgeColor }: {
	icon: React.ReactNode;
	color: DetailColor;
	title: string;
	subtitle: string;
	value: string;
	badge: string;
	badgeColor: NtmBadgeColor;
}) {
	return (
		<div className="flex items-center gap-[12px] py-[14px] border-b border-foreground/[0.06] last:border-0">
			<div className={`grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] ${DETAIL_ICON_COLORS[color]}`}>
				{icon}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[14px] font-semibold text-foreground leading-[17px]">{title}</p>
				<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[2px]">{subtitle}</p>
			</div>
			<p className="text-[22px] font-bold tracking-[-0.03em] text-foreground shrink-0">{value}</p>
			<NtmBadge color={badgeColor}>{badge}</NtmBadge>
		</div>
	);
}

type DetailColor = "blue" | "purple" | "green" | "pink";
const DETAIL_ICON_COLORS: Record<DetailColor, string> = {
	blue:   "bg-blue-500/[0.18] text-blue-400",
	purple: "bg-violet-500/[0.18] text-violet-400",
	green:  "bg-emerald-500/[0.18] text-emerald-400",
	pink:   "bg-pink-500/[0.18] text-pink-400",
};

function DetailIconBox({ children, color, small = false }: { children: React.ReactNode; color: DetailColor; small?: boolean }) {
	return (
		<div className={`grid shrink-0 place-items-center rounded-[9px] ${DETAIL_ICON_COLORS[color]} ${small ? "h-[33px] w-[33px]" : "h-[42px] w-[42px]"}`}>
			{children}
		</div>
	);
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return (
		<section className={`rounded-[13px] border border-foreground/[0.09] bg-surface-1 px-[12px] py-[12px] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl ${className}`}>
			{children}
		</section>
	);
}

const ANALYST_TONE: Record<string, string> = {
	green:  "bg-emerald-500/20 text-emerald-400",
	gray:   "bg-slate-500/20 dark:text-slate-300 text-slate-600",
	yellow: "bg-amber-500/20 text-amber-400",
	red:    "bg-rose-500/20 text-rose-400",
};

function formatSavedAgo(ms: number): string {
	const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
	if (days === 0) return "today";
	if (days === 1) return "yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? "" : "s"} ago`;
	if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
	return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
}

function formatTimeAgo(unixSec: number): string {
	const mins = Math.floor((Date.now() / 1000 - unixSec) / 60);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}


function AnalystRow({ name, badge, price, tone }: { name: string; badge: string; price: string; tone: string }) {
	return (
		<div className="grid grid-cols-3 border-b border-foreground/10 text-[13px] last:border-b-0">
			<div className="border-r border-foreground/10 px-[10px] py-[7px] font-semibold text-foreground/85">{name}</div>
			<div className="flex items-center justify-center border-r border-foreground/10 px-[10px] py-[7px]">
				<span className={`whitespace-nowrap rounded-[5px] px-[10px] py-[3px] font-semibold ${ANALYST_TONE[tone] ?? ANALYST_TONE.gray}`}>{badge}</span>
			</div>
			<div className="px-[10px] py-[7px] text-right font-semibold text-foreground/85">{price}</div>
		</div>
	);
}

function DetailMetricCard({ icon, color, title, value, desc }: {
	icon: React.ReactNode;
	color: DetailColor;
	title: string;
	value: string;
	desc: string;
}) {
	return (
		<div className="min-h-[82px] rounded-[10px] border border-foreground/[0.06] bg-surface-1/74 px-[10px] py-[10px]">
			<div className="flex gap-[9px]">
				<DetailIconBox color={color}>{icon}</DetailIconBox>
				<div className="min-w-0">
					<p className="text-[11px] leading-[13px] dark:text-slate-400 text-slate-500">{title}</p>
					<p className="mt-[3px] text-[15px] font-bold leading-[17px] text-foreground">{value}</p>
					<p className="mt-[4px] text-[11px] leading-[14px] dark:text-slate-400 text-slate-500">{desc}</p>
				</div>
			</div>
		</div>
	);
}

type MetricKey = "peRatio" | "revenueGrowth" | "profitMargin" | "marketCap";

function parseFinancialRaw(raw: string | undefined): number | null {
	if (!raw) return null;
	const s = raw.trim();
	if (s === "N/A" || s === "—" || s === "") return null;
	const cleaned = s.replace(/[$%x,]/g, "");
	if (cleaned.endsWith("T")) return parseFloat(cleaned) * 1e12;
	if (cleaned.endsWith("B")) return parseFloat(cleaned) * 1e9;
	if (cleaned.endsWith("M")) return parseFloat(cleaned) * 1e6;
	const n = parseFloat(cleaned);
	return isNaN(n) ? null : n;
}

function medianOf(nums: number[]): number | null {
	if (nums.length === 0) return null;
	const s = [...nums].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!;
}

function fmtMetric(key: MetricKey, val: number): string {
	if (key === "peRatio") return `${val.toFixed(1)}x`;
	if (key === "revenueGrowth" || key === "profitMargin") return `${val.toFixed(1)}%`;
	if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
	if (val >= 1e9) return `$${(val / 1e9).toFixed(0)}B`;
	return `$${(val / 1e6).toFixed(0)}M`;
}

function computeMedianMetric(peers: BrandSummary[], key: MetricKey): string {
	const nums = peers
		.map((b) => parseFinancialRaw(b.financials[key]?.value))
		.filter((v): v is number => v !== null);
	const med = medianOf(nums);
	return med !== null ? fmtMetric(key, med) : "—";
}

function fmtPeerMetric(key: MetricKey, peerData: PeerMetrics | undefined): string {
	if (!peerData) return "—";
	if (key === "peRatio") return peerData.pe != null ? `${peerData.pe.toFixed(1)}x` : "—";
	if (key === "revenueGrowth") return peerData.revenueGrowth != null ? `${peerData.revenueGrowth.toFixed(1)}%` : "—";
	if (key === "profitMargin") return peerData.profitMargin != null ? `${peerData.profitMargin.toFixed(1)}%` : "—";
	return "—";
}

function MyStakPage() {
	const { account, accountLoading, updateStak } = useAccount();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [earningsCalendarOpen, setEarningsCalendarOpen] = useState(false);
	// Reset on unmount so navigating away and back doesn't re-open the calendar
	useEffect(() => () => setEarningsCalendarOpen(false), []);
	// Lightweight summary of the whole catalog (GET /api/brands) -- everything here
	// needs only summary-level fields (ticker, name, financials.*.value,
	// interestCategories) except the one selected/detail-sheet brand, which fetches
	// its own full profile separately below.
	const { data: allBrandsList } = useBrandsList();
	const allBrands = useMemo(() => allBrandsList ?? [], [allBrandsList]);

	const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
	const { data: selectedBrand, isError: selectedBrandError } = useBrandDetail(selectedBrandId);
	const [comparePeers, setComparePeers] = useState<[BrandSummary | null, BrandSummary | null]>([null, null]);
	const [pickingSlot, setPickingSlot] = useState<0 | 1 | null>(null);
	const [numbersOpen, setNumbersOpen] = useState(false);
	const [analystOpen, setAnalystOpen] = useState(false);
	const [newsOpen, setNewsOpen] = useState(false);
	const [compareOpen, setCompareOpen] = useState(false);
	const startTime = useRef(0);
	const newsScrollRef = useRef<HTMLDivElement>(null);
	const hasRestoredBrand = useRef(false);

	// Derive stak from Firestore account (real-time, cross-device)
	const swipedBrands = useMemo(() => {
		const brandMap = new Map(allBrands.map((b) => [b.id, b]));
		return (account?.stakBrandIds ?? [])
			.map((id) => brandMap.get(id))
			.filter(Boolean) as BrandSummary[];
	}, [account?.stakBrandIds, allBrands]);

	const { data: stockData } = useQuery({
		queryKey: ["stock", selectedBrand?.ticker],
		queryFn: () => getStockData(selectedBrand!.ticker),
		enabled: !!selectedBrand,
		staleTime: 60 * 1000,
		refetchInterval: 60 * 1000,
		retry: 3,
		retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
	});

	const { data: newsData, isLoading: newsLoading } = useQuery({
		queryKey: ["company-news", selectedBrand?.ticker],
		queryFn: () => getCompanyNews(selectedBrand!.ticker, selectedBrand!.name),
		enabled: !!selectedBrand,
		staleTime: 30 * 60 * 1000,
		refetchInterval: 30 * 60 * 1000,
		retry: 1,
	});

	const liveChangePct = stockData?.quote?.changePercent;
	const liveMoveDirection = liveChangePct === undefined ? null
		: liveChangePct > 0.15 ? "up" : liveChangePct < -0.15 ? "down" : "flat";


	const { data: analystData, isLoading: analystLoading } = useQuery({
		queryKey: ["analyst", "v2", selectedBrand?.ticker],
		queryFn: () => getAnalystData(selectedBrand!.ticker, selectedBrand!.name),
		enabled: !!selectedBrand,
		staleTime: 60 * 60 * 1000,
		retry: 1,
	});

	const { data: analystActions, isLoading: actionsLoading } = useQuery({
		queryKey: ["analyst-actions", selectedBrand?.ticker],
		queryFn: () => getAnalystActions(selectedBrand!.ticker, selectedBrand!.name),
		enabled: !!selectedBrand,
		staleTime: 12 * 60 * 60 * 1000,
		retry: 1,
	});

	const stakTickers = useMemo(() => swipedBrands.map((b) => b.ticker).filter(Boolean), [swipedBrands]);

	const { data: earningsData } = useQuery({
		queryKey: ["market-earnings-week", stakTickers],
		queryFn: () => getMarketEarnings("week", stakTickers),
		enabled: stakTickers.length > 0,
		staleTime: 60 * 60 * 1000,
		retry: 1,
	});

	const upcomingEarningsCount = useMemo(() => {
		if (!earningsData?.entries) return null;
		const stakSet = new Set(stakTickers.map((t) => t.toUpperCase()));
		return earningsData.entries.filter(
			(e) => e.status === "upcoming" && stakSet.has(e.symbol.toUpperCase()),
		).length;
	}, [earningsData, stakTickers]);

	const { data: spyData } = useQuery({
		queryKey: ["stock", "SPY"],
		queryFn: () => getStockData("SPY"),
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});

	const { data: myDailyBrief } = useQuery({
		queryKey: ["daily-brief", new Date().toISOString().split("T")[0], marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		retry: 0,
	});
	const isMktClosed = !!(myDailyBrief as { marketClosed?: boolean } | undefined)?.marketClosed;
	const lastCloseRef = getLastCloseRef();
	const { data: dailyMoveData, isLoading: dailyMoveLoading, isError: dailyMoveError } = useQuery({
		// Include direction and closeRef in key so session changes refetch fresh content
		queryKey: ["daily-move", selectedBrand?.ticker, liveMoveDirection, 4, isMktClosed, lastCloseRef],
		queryFn: () => getDailyMove(selectedBrand!.ticker, liveChangePct, selectedBrand!.name, 4, isMktClosed, lastCloseRef),
		enabled: !!selectedBrand,
		staleTime: 30 * 60 * 1000,
		refetchInterval: 30 * 60 * 1000,
		retry: 1,
	});

	const stakBrandQueries = useQueries({
		queries: swipedBrands.map((brand) => ({
			queryKey: ["stock", brand.ticker],
			queryFn: () => getStockData(brand.ticker),
			staleTime: 60 * 1000,
			retry: 1,
		})),
	});

	const topMover = useMemo(() => {
		let best: { ticker: string; changePercent: number } | null = null;
		swipedBrands.forEach((brand, i) => {
			const quote = stakBrandQueries[i]?.data?.quote;
			if (!quote) return;
			if (!best || Math.abs(quote.changePercent) > Math.abs(best.changePercent)) {
				best = { ticker: brand.ticker, changePercent: quote.changePercent };
			}
		});
		return best as { ticker: string; changePercent: number } | null;
	}, [swipedBrands, stakBrandQueries]);

	// Restore selected brand overlay after page reload -- just needs the id to be a
	// real one of the user's own staked brands; useBrandDetail fetches its full
	// profile once selectedBrandId is set.
	useEffect(() => {
		if (hasRestoredBrand.current || swipedBrands.length === 0) return;
		hasRestoredBrand.current = true;
		const savedId = sessionStorage.getItem("selectedBrandId");
		if (!savedId) return;
		if (swipedBrands.some((b) => b.id === savedId)) setSelectedBrandId(savedId);
	}, [swipedBrands]);

	// Lock background scroll when overlay is open
	useEffect(() => {
		if (selectedBrand) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => { document.body.style.overflow = ""; };
	}, [selectedBrand]);

	// Reset accordion sections whenever the selected brand changes
	useEffect(() => {
		setNumbersOpen(false);
		setAnalystOpen(false);
		setNewsOpen(false);
		setCompareOpen(false);
	}, [selectedBrand?.id]);

	const handleBrandClick = (brand: BrandSummary) => {
		sessionStorage.setItem("selectedBrandId", brand.id);
		setSelectedBrandId(brand.id);
		logEvent("brand_tap", { brand_id: brand.id, brand_name: brand.name, ticker: brand.ticker });
		trackEvent("brand_tap", { brand_id: brand.id, brand_name: brand.name, ticker: brand.ticker }).catch(() => {});
	};

	const handleCloseDetail = () => {
		sessionStorage.removeItem("selectedBrandId");
		setSelectedBrandId(null);
	};

	// Seed comparison peers from same-category brands whenever the overlay opens
	useEffect(() => {
		if (!selectedBrand) return;
		const defaults = allBrands
			.filter((b) => b.interestCategories?.[0] === selectedBrand.interestCategories?.[0] && b.id !== selectedBrand.id)
			.slice(0, 2);
		setComparePeers([defaults[0] ?? null, defaults[1] ?? null]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedBrand?.id]);

	const handlePickPeer = (brand: BrandSummary) => {
		if (pickingSlot === null) return;
		setComparePeers((prev) => {
			const next: [BrandSummary | null, BrandSummary | null] = [prev[0], prev[1]];
			next[pickingSlot] = brand;
			return next;
		});
		setPickingSlot(null);
	};

	const handleRemovePeer = (slot: 0 | 1) => {
		setComparePeers((prev) => {
			if (slot === 0) return [prev[1], null];
			return [prev[0], null];
		});
	};

	const handleRemoveFromStak = (e: React.MouseEvent, brand: BrandSummary) => {
		e.stopPropagation();
		const updatedIds = (account?.stakBrandIds ?? []).filter((id) => id !== brand.id);
		updateStak(updatedIds).catch(() => {});
		// Invalidate brief so personalization reflects the removed brand immediately
		queryClient.invalidateQueries({ queryKey: ["daily-brief"] });
		recordEngagement("removed_from_stak", brand.id, { ticker: brand.ticker, categories: brand.interestCategories }).catch(() => {});
		toast.success("Removed from your Stak", {
			description: brand.name,
			duration: 2000,
		});
	};

	const { data: peerMetricsData } = useQuery({
		queryKey: ["peer-metrics", selectedBrand?.ticker],
		queryFn: () => getPeerMetrics(selectedBrand!.ticker),
		enabled: !!selectedBrand,
		staleTime: 24 * 60 * 60 * 1000,
		retry: 0,
	});

	const sectorAvg = useMemo(() => {
		if (!selectedBrand) return { peRatio: "—", revenueGrowth: "—", profitMargin: "—", marketCap: "—" } as Record<MetricKey, string>;
		const category = selectedBrand.interestCategories?.[0];
		const peers = allBrands.filter((b) => b.id !== selectedBrand.id && b.interestCategories?.[0] === category);
		return {
			peRatio: computeMedianMetric(peers, "peRatio"),
			revenueGrowth: computeMedianMetric(peers, "revenueGrowth"),
			profitMargin: computeMedianMetric(peers, "profitMargin"),
			marketCap: computeMedianMetric(peers, "marketCap"),
		} as Record<MetricKey, string>;
	}, [selectedBrand?.id, allBrands]);

	// Brand Detail Overlay – full-screen Phase 6 design
	const liveMetrics = stockData?.metrics as Record<string, string> | undefined;
	const DETAIL_METRICS: Array<{ key: MetricKey; icon: React.ReactNode; color: DetailColor; sector: string; peer: string }> = [
		{ key: "peRatio",       icon: <span className="text-[13px] font-bold">P/E</span>, color: "purple", sector: sectorAvg.peRatio,       peer: fmtPeerMetric("peRatio",       peerMetricsData) },
		{ key: "revenueGrowth", icon: <TrendingUp size={20} />,  color: "green",  sector: sectorAvg.revenueGrowth, peer: fmtPeerMetric("revenueGrowth", peerMetricsData) },
		{ key: "profitMargin",  icon: <DollarSign size={20} />,  color: "pink",   sector: sectorAvg.profitMargin,  peer: fmtPeerMetric("profitMargin",  peerMetricsData) },
	];
		const priceUp = (stockData?.quote?.changePercent ?? 0) >= 0;

	// Since You Saved
	const inStak = selectedBrand ? (account?.stakBrandIds?.includes(selectedBrand.id) ?? false) : false;
	const saveEntry = selectedBrand ? (account?.stakSavedAt?.[selectedBrand.id] ?? null) : null;
	const currentQuotePrice = stockData?.quote?.price ?? null;
	const sinceSavedPct = saveEntry?.priceAtSave && currentQuotePrice
		? ((currentQuotePrice - saveEntry.priceAtSave) / saveEntry.priceAtSave) * 100
		: null;
	const sinceSavedUp = sinceSavedPct !== null ? sinceSavedPct >= 0 : null;
	const sinceSavedContent = (() => {
		if (!inStak || !saveEntry) return null;
		const ageMs = Date.now() - saveEntry.savedAt;
		const savedToday = ageMs < 24 * 60 * 60 * 1000;
		const ago = formatSavedAgo(saveEntry.savedAt);

		// Just saved — too early to show performance
		if (savedToday) {
			return `Just added to your Stak. Check back tomorrow to see how it's performing.`;
		}

		// News context only if sentiment strictly matches direction of the move
		const matchingSentiment = sinceSavedUp === true ? "bullish" : sinceSavedUp === false ? "bearish" : null;
		const relevantArticle = matchingSentiment
			? newsData?.articles?.find(a => a.sentiment === matchingSentiment && a.whyItMatters && a.type === "company")
			: null;
		const newsContext = relevantArticle?.whyItMatters ?? null;

		if (sinceSavedPct !== null && Math.abs(sinceSavedPct) >= 0.5) {
			const dir = sinceSavedUp ? "up" : "down";
			const pctStr = `${Math.abs(sinceSavedPct).toFixed(1)}%`;
			const base = `Since saving ${ago}, ${selectedBrand?.name} is ${dir} ${pctStr}.`;
			return newsContext ? `${base} ${newsContext}` : base;
		}

		if (sinceSavedPct !== null) {
			return `${selectedBrand?.name} has barely moved since you saved this ${ago}.`;
		}

		return `You added this ${ago}.`;
	})();

	const brandDetailOverlay = selectedBrand && createPortal(
		<div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background">
			{/* Scrollable body */}
			<div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,20px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

				{/* Header */}
				<header className="flex items-center px-[20px] pt-[8px] pb-[14px]">
					<div className="flex items-center gap-[12px]">
						<button
							type="button"
							onClick={handleCloseDetail}
							className="grid h-[36px] w-[36px] place-items-center rounded-full bg-foreground/[0.07] text-foreground/80 active:bg-foreground/[0.12] transition-colors"
						>
							<ChevronLeft size={22} />
						</button>
						<div className="grid h-[50px] w-[50px] shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,.35)] ring-2 ring-white/15">
							<BrandLogo brand={selectedBrand} className="w-[38px] h-[38px] rounded-full" />
						</div>
						<div>
							<h1 className="text-[21px] font-bold leading-none tracking-[-0.03em]">{selectedBrand.name}</h1>
							{stockData?.quote ? (
								<p className="mt-[6px] text-[12px] font-medium dark:text-slate-400 text-slate-500">
									Today:{" "}
									<span className={priceUp ? "text-emerald-400" : "text-rose-400"}>
										{priceUp ? "+" : ""}{stockData.quote.changePercent.toFixed(2)}%
									</span>
								</p>
							) : (
								<div className="mt-[6px] h-[12px] w-[80px] rounded dark:bg-slate-700/50 bg-slate-200/70 animate-pulse" />
							)}
						</div>
					</div>
				</header>

				{/* Since You Saved */}
				{sinceSavedContent && (
					<div className="mx-[16px] mb-[-4px] flex gap-[14px] rounded-[14px] border border-foreground/[0.07] bg-surface-1/80 px-[14px] py-[13px]">
						<div className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[11px] ${sinceSavedUp === true ? "bg-emerald-500/15 text-emerald-400" : sinceSavedUp === false ? "bg-rose-500/15 text-rose-400" : "bg-blue-500/15 text-blue-400"}`}>
							<Bookmark size={20} />
						</div>
						<div className="min-w-0">
							<p className="text-[13px] font-bold text-foreground/95 leading-none">
								Since You Saved
								{sinceSavedPct !== null && Math.abs(sinceSavedPct) >= 0.5 && (
									<span className={`ml-[8px] font-bold ${sinceSavedUp ? "text-emerald-400" : "text-rose-400"}`}>
										{sinceSavedUp ? "+" : ""}{sinceSavedPct.toFixed(1)}%
									</span>
								)}
							</p>
							<p className="mt-[5px] text-[11px] leading-[16px] dark:text-slate-400 text-slate-500/85">{sinceSavedContent}</p>
						</div>
					</div>
				)}

				{/* Content sections */}
				<div className="px-[16px] space-y-[12px] pb-[36px]">

					{/* Numbers That Matter */}
					<section className="rounded-[14px] border border-foreground/[0.07] bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,.3)] overflow-hidden">
					<button type="button" onClick={() => setNumbersOpen(v => !v)} className="flex w-full items-center justify-between px-[16px] py-[14px] text-left">
						<div className="flex items-center gap-[12px] min-w-0">
							<div className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[8px] bg-blue-500/20 text-blue-400">
								<BarChart3 size={18} />
							</div>
							<div className="min-w-0">
								<h2 className="text-[16px] font-bold">Numbers that matter</h2>
								{!numbersOpen && <p className="text-[12px] dark:text-slate-500 text-slate-400 mt-[2px] truncate">
									{(() => {
										const parts = DETAIL_METRICS.map(({ key }) => {
											const m = selectedBrand.financials[key];
											const val = liveMetrics?.[key] != null ? String(liveMetrics[key]) : (m?.value ?? "—");
											const badge = deriveMetricBadge(key, val);
											return badge.label;
										});
										return parts.join(" · ");
									})()}
								</p>}
							</div>
						</div>
						<ChevronRight size={18} className={`shrink-0 transition-transform text-foreground/40 ${numbersOpen ? "rotate-90" : ""}`} />
					</button>
					{numbersOpen && <div className="px-[16px] pb-[4px]">
						{DETAIL_METRICS.map(({ key, icon, color, sector, peer }) => {
							const m = selectedBrand.financials[key];
							const val = liveMetrics?.[key] != null ? String(liveMetrics[key]) : (m?.value ?? "—");
							const badge = deriveMetricBadge(key, val);
							return (
								<NtmRow
									key={key}
									icon={icon}
									color={color}
									title={m?.label ?? key}
									subtitle={`Sector ${sector} · Peers ${peer}`}
									value={val}
									badge={badge.label}
									badgeColor={badge.color}
								/>
							);
						})}
					</div>}
					</section>

	{/* Analyst View */}
	<section className="rounded-[14px] border border-foreground/10 bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,.55)] overflow-hidden">
	<button type="button" onClick={() => setAnalystOpen(v => !v)} className="flex w-full items-center justify-between px-[16px] py-[14px] text-left">
	<div className="flex items-center gap-[12px] min-w-0">
	<div className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[8px] bg-blue-500/20 text-blue-400">
		<Target size={18} />
	</div>
	<div className="min-w-0">
	<h2 className="text-[16px] font-bold">Analyst view</h2>
	{!analystOpen && <p className="text-[12px] dark:text-slate-500 text-slate-400 mt-[2px] truncate">
		{analystLoading ? "Loading…" : (() => {
			const r = analystData?.recommendation;
			const total = r ? r.strongBuy + r.buy + r.hold + r.sell + r.strongSell : 0;
			const avg = analystData?.priceTarget?.avg;
			const price = stockData?.quote?.price;
			const upside = avg != null && price ? ((avg - price) / price) * 100 : null;
			if (!total) return "No analyst coverage yet.";
			let s = `${total} analysts.`;
			if (avg != null) {
				s += ` Avg target $${avg.toFixed(0)}`;
				if (upside != null) s += `, ${Math.abs(upside).toFixed(0)}% ${upside >= 0 ? "above" : "below"} today.`;
				else s += ".";
			}
			return s;
		})()}
	</p>}
	</div>
	</div>
	<ChevronRight size={18} className={`shrink-0 transition-transform text-foreground/40 ${analystOpen ? "rotate-90" : ""}`} />
	</button>
	{analystOpen && <div className="px-[16px] pb-[16px]">

	{analystLoading ? (
	<div className="space-y-[20px]">
		<div>
		<div className="h-[9px] w-[100px] rounded bg-foreground/10 animate-pulse mb-[14px]" />
		<div className="h-[5px] rounded-full bg-foreground/10 animate-pulse mb-[18px]" />
		<div className="flex justify-between gap-[8px]">
		{[0,1,2].map(i => <div key={i} className="h-[30px] flex-1 rounded bg-foreground/10 animate-pulse" />)}
		</div>
		</div>
		<div>
		<div className="h-[9px] w-[150px] rounded bg-foreground/10 animate-pulse mb-[10px]" />
		<div className="h-[8px] rounded-full bg-foreground/10 animate-pulse mb-[10px]" />
		<div className="flex justify-between gap-[8px]">
		{[0,1,2].map(i => <div key={i} className="h-[11px] flex-1 rounded bg-foreground/10 animate-pulse" />)}
		</div>
		</div>
	</div>
	) : analystData ? (
	<div className="space-y-[24px]">

		{/* Price Target Range */}
		{analystData.priceTarget?.avg != null && (() => {
		const { low, avg, high } = analystData.priceTarget!;
		const currentPrice = stockData?.quote?.price ?? null;
		const upside = avg != null && currentPrice ? ((avg - currentPrice) / currentPrice) * 100 : null;
		const pct = (v: number) => low != null && high != null && high > low ? Math.max(2, Math.min(98, ((v - low) / (high - low)) * 100)) : 50;
		return (
		<div>
		<p className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wide mb-[14px]">Price Target Range</p>
		<div className="relative mx-[8px] mb-[20px]">
			<div className="h-[5px] rounded-full bg-gradient-to-r from-foreground/10 via-blue-400/40 to-foreground/10" />
			{currentPrice != null && low != null && high != null && currentPrice >= low && currentPrice <= high && (
			<div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[11px] h-[11px] rounded-full bg-foreground border-[2px] border-background shadow-sm" style={{left:`${pct(currentPrice)}%`}} />
			)}
			{avg != null && low != null && high != null && (
			<div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[15px] h-[15px] rounded-full bg-blue-400 border-[2.5px] border-background shadow-[0_0_10px_rgba(96,165,250,.5)]" style={{left:`${pct(avg)}%`}} />
			)}
		</div>
		<div className="flex items-end justify-between">
			<div>
			<p className="text-[10px] dark:text-slate-500 text-slate-400">Low</p>
			<p className="text-[14px] font-bold text-foreground">{low != null ? `$${low.toFixed(0)}` : "—"}</p>
			</div>
			<div className="text-center">
			<p className="text-[10px] text-blue-400 font-medium">Avg Target</p>
			<p className="text-[24px] font-bold text-blue-400 leading-tight">{avg != null ? `$${avg.toFixed(0)}` : "—"}</p>
			{upside != null && (
			<p className={`text-[11px] font-semibold ${upside >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
			{upside >= 0 ? "↑" : "↓"} {Math.abs(upside).toFixed(1)}% {upside >= 0 ? "upside" : "downside"}
			</p>
			)}
			</div>
			<div className="text-right">
			<p className="text-[10px] dark:text-slate-500 text-slate-400">High</p>
			<p className="text-[14px] font-bold text-foreground">{high != null ? `$${high.toFixed(0)}` : "—"}</p>
			</div>
		</div>
		</div>
		);
		})()}

		{/* Consensus Bar */}
		{analystData.recommendation && (() => {
		const r = analystData.recommendation!;
		const buyCount = r.strongBuy + r.buy;
		const holdCount = r.hold;
		const sellCount = r.sell + r.strongSell;
		const total = buyCount + holdCount + sellCount;
		if (total === 0) return null;
		const buyW = Math.round((buyCount / total) * 100);
		const holdW = Math.round((holdCount / total) * 100);
		const sellW = 100 - buyW - holdW;
		return (
		<div>
		<p className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wide mb-[10px]">Wall St. Consensus · {total} analysts</p>
		<div className="flex h-[8px] w-full rounded-full overflow-hidden gap-[2px] mb-[10px]">
			{buyW > 0 && <div className="bg-emerald-500 rounded-l-full" style={{width:`${buyW}%`}} />}
			{holdW > 0 && <div className={`bg-slate-400/50 ${buyW === 0 ? "rounded-l-full" : ""} ${sellW === 0 ? "rounded-r-full" : ""}`} style={{width:`${holdW}%`}} />}
			{sellW > 0 && <div className="bg-rose-500 rounded-r-full" style={{width:`${sellW}%`}} />}
		</div>
		<div className="flex justify-between text-[11px] font-semibold">
			<div className="flex items-center gap-[5px]">
			<div className="w-[7px] h-[7px] rounded-full bg-emerald-500" />
			<span className="text-emerald-500">Buy {buyCount}</span>
			</div>
			<div className="flex items-center gap-[5px]">
			<div className="w-[7px] h-[7px] rounded-full bg-slate-400/50" />
			<span className="dark:text-slate-400 text-slate-500">Hold {holdCount}</span>
			</div>
			<div className="flex items-center gap-[5px]">
			<div className="w-[7px] h-[7px] rounded-full bg-rose-500" />
			<span className="text-rose-500">Sell {sellCount}</span>
			</div>
		</div>
		</div>
		);
		})()}

		{/* Recent Analyst Actions */}
		{(actionsLoading || (analystActions && analystActions.length > 0)) && (
		<div>
		<p className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wide mb-[10px]">Recent Actions</p>
		<div className="space-y-[6px]">
		{actionsLoading ? (
			[0,1,2].map((i) => (
			<div key={i} className="flex items-center justify-between px-[12px] py-[10px] rounded-[9px] bg-foreground/[0.03] border border-foreground/[0.06]">
			<div className="h-[13px] w-[110px] rounded dark:bg-slate-700/50 bg-slate-200/70 animate-pulse" />
			<div className="flex items-center gap-[8px]">
			<div className="h-[11px] w-[60px] rounded dark:bg-slate-700/40 bg-slate-200/60 animate-pulse" />
			<div className="h-[13px] w-[36px] rounded dark:bg-slate-700/30 bg-slate-200/50 animate-pulse" />
			</div>
			</div>
			))
		) : analystActions!.map((action, i) => {
			const bull = ["Strong Buy","Buy","Outperform","Overweight"].includes(action.action);
			const bear = ["Strong Sell","Sell","Underperform","Underweight"].includes(action.action);
			const dot = bull ? "bg-emerald-400" : bear ? "bg-rose-400" : "dark:bg-slate-400 bg-slate-400";
			const actionColor = bull ? "text-emerald-400" : bear ? "text-rose-400" : "dark:text-slate-400 text-slate-500";
			return (
			<div key={i} className="flex items-center justify-between px-[12px] py-[10px] rounded-[9px] bg-foreground/[0.03] border border-foreground/[0.06]">
			<p className="text-[13px] font-semibold dark:text-slate-300 text-slate-700 truncate max-w-[150px]">{action.firm}</p>
			<div className="flex items-center gap-[10px] shrink-0">
			<div className="flex items-center gap-[5px]">
				<div className={`w-[6px] h-[6px] rounded-full shrink-0 ${dot}`} />
				<span className={`text-[12px] font-semibold ${actionColor}`}>{action.action}</span>
			</div>
			<span className="text-[13px] font-bold dark:text-slate-300 text-slate-700 min-w-[32px] text-right">
				{action.priceTarget != null ? `$${action.priceTarget}` : "—"}
			</span>
			</div>
			</div>
			);
		})}
		</div>
		</div>
		)}

	</div>
	) : (
	<p className="text-[13px] dark:text-slate-500 text-slate-400 text-center py-[20px]">No analyst data available.</p>
	)}
	</div>}
	</section>
					{/* News Signal */}
					<section className="rounded-[14px] border border-foreground/10 bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,.55)] overflow-hidden">
					<button type="button" onClick={() => setNewsOpen(v => !v)} className="flex w-full items-center justify-between px-[16px] py-[14px] text-left">
						<div className="flex items-center gap-[12px] min-w-0">
							<div className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[8px] bg-blue-500/20 text-blue-400"><Sparkles size={18} /></div>
							<div className="min-w-0">
							<h2 className="text-[16px] font-bold">News signal</h2>
							{!newsOpen && <p className="text-[12px] dark:text-slate-500 text-slate-400 mt-[2px] truncate">
								{newsLoading ? "Loading…" : (() => {
									const articles = newsData?.articles ?? [];
									if (!articles.length) return "No recent news.";
									const bullish = articles.filter(a => a.sentiment === "bullish").length;
									const bearish = articles.filter(a => a.sentiment === "bearish").length;
									const tone = bullish > bearish + 1 ? "mostly bullish" : bearish > bullish + 1 ? "mostly cautious" : "mixed signals";
									return `${articles.length} ${articles.length === 1 ? "story" : "stories"} today, ${tone}.`;
								})()}
							</p>}
							</div>
						</div>
						<ChevronRight size={18} className={`shrink-0 transition-transform text-foreground/40 ${newsOpen ? "rotate-90" : ""}`} />
					</button>
					{newsOpen && <div className="px-[12px] pb-[12px]">

						{/* Price badge + bullet drivers */}
						{(() => {
							const pct = stockData?.quote?.changePercent;
							const isUp = pct !== undefined ? pct >= 0 : null;
							const isFlat = pct !== undefined ? Math.abs(pct) < 0.15 : false;
							return (
								<div className="mb-[14px]">
									{pct !== undefined && (
										<span className={`inline-flex items-center rounded-full px-[10px] py-[3px] text-[12px] font-semibold mb-[12px] ${isFlat ? "bg-foreground/[0.07] dark:text-slate-400 text-slate-500" : isUp ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-400"}`}>
											{isUp && !isFlat ? "+" : ""}{pct.toFixed(1)}% {lastCloseRef === "today" ? "today" : lastCloseRef === "close" ? "at close" : `at ${lastCloseRef}'s close`}
										</span>
									)}
									{dailyMoveLoading ? (
										<div className="space-y-[10px]">
											{[0, 1, 2].map((i) => (
												<div key={i} className="flex items-start gap-[10px]">
													<span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-foreground/15 animate-pulse" />
													<div className={`h-[13px] rounded bg-foreground/10 animate-pulse ${i === 0 ? "w-full" : i === 1 ? "w-4/5" : "w-3/5"}`} />
												</div>
											))}
										</div>
									) : dailyMoveData?.bullets?.length ? (
										<ul className="space-y-[10px]">
											{dailyMoveData.bullets.map((b, i) => {
												const dot = b.tone === "bullish" ? "bg-emerald-400" : b.tone === "bearish" ? "bg-rose-400" : "bg-foreground/25";
												return (
													<li key={i} className="flex items-start gap-[10px]">
														<span className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} />
														<p className="text-[13px] leading-[19px] dark:text-slate-300 text-slate-700">{b.text}</p>
													</li>
												);
											})}
										</ul>
									) : dailyMoveData?.explanation ? (
										<ul className="space-y-[10px]">
											{dailyMoveData.explanation.split(/(?<=[.!?])\s+/).filter(Boolean).map((s, i) => (
												<li key={i} className="flex items-start gap-[10px]">
													<span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-foreground/25" />
													<p className="text-[13px] leading-[19px] dark:text-slate-300 text-slate-700">{s}</p>
												</li>
											))}
										</ul>
									) : dailyMoveError ? (
										<p className="text-[12px] dark:text-slate-500 text-slate-400">Analysis unavailable right now.</p>
									) : null}
								</div>
							);
						})()}

						<div className="relative">
							<button
								type="button"
								onClick={() => newsScrollRef.current?.scrollBy({ left: -230, behavior: "smooth" })}
								className="absolute left-0 top-1/2 -translate-y-1/2 z-10 grid h-[28px] w-[28px] place-items-center rounded-full bg-surface-1 border border-foreground/10 shadow-sm text-foreground/50 active:bg-foreground/5 -translate-x-1/2"
							>
								<ChevronLeft size={14} />
							</button>
							<div ref={newsScrollRef} className="flex gap-[10px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: "none" }}>
							{newsLoading ? (
								[...Array(3)].map((_, i) => (
									<div key={i} className="flex w-[240px] shrink-0 flex-col gap-[8px] rounded-[10px] border border-foreground/10 bg-surface-1/80 p-[12px]">
										<div className="flex items-center justify-between gap-[6px]">
											<div className="h-[11px] w-[60px] rounded dark:bg-slate-700/50 bg-slate-200/70 animate-pulse" />
											<div className="h-[18px] w-[46px] rounded bg-slate-700/40 animate-pulse" />
										</div>
										<div className="space-y-[5px]">
											<div className="h-[12px] w-full rounded bg-slate-700/40 animate-pulse" />
											<div className="h-[12px] w-4/5 rounded bg-slate-700/30 animate-pulse" />
											<div className="h-[12px] w-3/5 rounded bg-slate-700/20 animate-pulse" />
										</div>
										<div className="mt-auto h-[11px] w-[40px] rounded bg-slate-700/30 animate-pulse" />
									</div>
								))
							) : (newsData?.articles ?? []).length > 0 ? (
								newsData!.articles.map((article, i) => {
									const tone = article.sentiment === "bullish" ? "green" : article.sentiment === "bearish" ? "red" : "gray";
									const badge = article.sentiment === "bullish" ? "Bullish" : article.sentiment === "bearish" ? "Bearish" : "Neutral";
									return (
										<a
											key={i}
											href={article.url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex w-[240px] shrink-0 flex-col gap-[8px] rounded-[10px] border border-foreground/10 bg-surface-1/80 p-[12px] active:bg-foreground/[0.04]"
										>
											<div className="flex items-center justify-between gap-[6px]">
												<span className="truncate text-[11px] font-semibold dark:text-slate-400 text-slate-500">{article.source}</span>
												<span className={`shrink-0 rounded-[5px] px-[7px] py-[2px] text-[10px] font-semibold ${ANALYST_TONE[tone]}`}>{badge}</span>
											</div>
											<p className="line-clamp-3 text-[12px] leading-[17px] text-foreground/85">{article.headline}</p>
											<p className="mt-auto text-[11px] text-slate-500">{formatTimeAgo(article.datetime)}</p>
										</a>
									);
								})
							) : (
								<div className="flex flex-col items-center py-[16px] text-center">
										<span className="text-[28px] mb-[6px]">📰</span>
										<p className="text-[13px] dark:text-slate-400 text-slate-500">No recent news for this stock.</p>
									</div>
							)}
							</div>
							<button
								type="button"
								onClick={() => newsScrollRef.current?.scrollBy({ left: 230, behavior: "smooth" })}
								className="absolute right-0 top-1/2 -translate-y-1/2 z-10 grid h-[28px] w-[28px] place-items-center rounded-full bg-surface-1 border border-foreground/10 shadow-sm text-foreground/50 active:bg-foreground/5 translate-x-1/2"
							>
								<ChevronRight size={14} />
							</button>
						</div>
					</div>}
					</section>

					{/* Compare & Learn */}
					<section className="rounded-[14px] border border-blue-500/35 bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,.55)] overflow-hidden">
					<button type="button" onClick={() => setCompareOpen(v => !v)} className="flex w-full items-center justify-between px-[16px] py-[14px] text-left">
						<div className="flex items-center gap-[12px] min-w-0">
							<div className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[8px] bg-blue-500/20 text-blue-400">
								<GitCompare size={20} />
							</div>
							<div className="min-w-0">
							<h2 className="text-[16px] font-bold">Compare and learn</h2>
							{!compareOpen && <p className="text-[12px] dark:text-slate-500 text-slate-400 mt-[2px] truncate">
								{(() => {
									const p1 = comparePeers[0];
									const p2 = comparePeers[1];
									const peerNames = [p1?.name, p2?.name].filter(Boolean);
									if (!peerNames.length) return `See ${selectedBrand?.name} next to peers.`;
									return `See ${selectedBrand?.name} next to ${peerNames.join(" and ")}.`;
								})()}
							</p>}
							</div>
						</div>
						<ChevronRight size={18} className={`shrink-0 transition-transform text-foreground/40 ${compareOpen ? "rotate-90" : ""}`} />
					</button>
					{compareOpen && <div className="px-[16px] pb-[14px]">
						<div className="overflow-hidden rounded-[9px] border border-foreground/10 bg-surface-1/70">
							{/* Company header row */}
							<div className="grid border-b border-foreground/10" style={{ gridTemplateColumns: "1.15fr 0.85fr 0.85fr 0.85fr" }}>
								<div className="border-r border-foreground/10" />
								{/* Selected brand — locked */}
								<div className="border-r border-foreground/10 py-[8px] text-center">
									<div className="mx-auto mb-[4px] grid h-[31px] w-[31px] place-items-center overflow-hidden rounded-full bg-white">
										<BrandLogo brand={selectedBrand} className="h-[26px] w-[26px]" />
									</div>
									<p className="text-[12px] dark:text-slate-400 text-slate-500">{selectedBrand.ticker}</p>
								</div>
								{/* Peer slots — user-selectable */}
								{([0, 1] as const).map((slot) => (
									<div key={slot} className="relative border-r border-foreground/10 last:border-r-0">
										{comparePeers[slot] ? (
											<button type="button" onClick={() => setPickingSlot(slot)} className="flex w-full flex-col items-center py-[8px]">
												<div className="mb-[4px] grid h-[31px] w-[31px] place-items-center overflow-hidden rounded-full bg-white">
													<BrandLogo brand={comparePeers[slot]!} className="h-[26px] w-[26px]" />
												</div>
												<p className="text-[12px] dark:text-slate-400 text-slate-500">{comparePeers[slot]!.ticker}</p>
												<ArrowLeftRight size={10} className="mt-[2px] text-blue-400/70" />
											</button>
										) : (
											<button type="button" onClick={() => setPickingSlot(slot)} className="flex w-full flex-col items-center py-[10px]">
												<div className="mb-[4px] grid h-[31px] w-[31px] place-items-center rounded-full border border-dashed border-foreground/20">
													<Plus size={14} className="text-slate-500" />
												</div>
												<p className="text-[11px] text-slate-500">Add</p>
											</button>
										)}
										{comparePeers[slot] && (slot === 1 || comparePeers[1] !== null) && (
											<button
												type="button"
												onClick={(e) => { e.stopPropagation(); handleRemovePeer(slot); }}
												className="absolute right-[3px] top-[3px] grid h-[16px] w-[16px] place-items-center rounded-full bg-foreground/10 dark:text-slate-400 text-slate-500 active:bg-red-500/20 active:text-red-400"
											>
												<X size={9} />
											</button>
										)}
									</div>
								))}
							</div>
							{/* Metric rows */}
							{(["peRatio", "revenueGrowth", "profitMargin", "marketCap"] as const).map((key, i, arr) => (
								<div
									key={key}
									className={`grid text-[13px] ${i < arr.length - 1 ? "border-b border-foreground/10" : ""}`}
									style={{ gridTemplateColumns: "1.15fr 0.85fr 0.85fr 0.85fr" }}
								>
									<div className="border-r border-foreground/10 px-[7px] py-[5px] font-semibold dark:text-slate-300 text-slate-600">
										{selectedBrand.financials[key]?.label ?? key}
									</div>
									{([selectedBrand, comparePeers[0], comparePeers[1]] as Array<BrandProfile | null>).map((b, ci) => {
										if (!b) return <div key={ci} className="border-r border-foreground/10 last:border-r-0" />;
										const raw = b.id === selectedBrand.id && liveMetrics?.[key] != null
											? String(liveMetrics[key])
											: (b.financials[key]?.value ?? "—");
										const growth = key === "revenueGrowth" ? formatGrowth(raw) : null;
										return (
											<div key={b.id} className={`border-r border-foreground/10 px-[7px] py-[5px] text-center font-semibold last:border-r-0 ${growth ? growth.color : "text-foreground/85"}`}>
												{growth ? growth.display : raw}
											</div>
										);
									})}
								</div>
							))}
						</div>
					</div>}
					</section>

					<p className="pb-[6px] text-center text-[10px] text-slate-600">
						Cultural context only — not financial advice.
					</p>
				</div>
</div>

			{/* Brand picker overlay */}
			{pickingSlot !== null && (
				<div className="absolute inset-0 z-10 flex flex-col bg-background">
					<div className="flex items-center gap-[12px] border-b border-foreground/10 px-[16px] py-[14px]">
						<button
							type="button"
							onClick={() => setPickingSlot(null)}
							className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-foreground active:bg-foreground/[0.12]"
						>
							<ChevronLeft size={20} />
						</button>
						<h2 className="text-[17px] font-bold">Choose Brand</h2>
					</div>
					<div className="flex-1 overflow-y-auto px-[12px] py-[6px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
						{allBrands
							.filter((b) => b.id !== selectedBrand.id && b.id !== comparePeers[pickingSlot === 0 ? 1 : 0]?.id)
							.map((b) => (
								<button
									key={b.id}
									type="button"
									onClick={() => handlePickPeer(b)}
									className="flex w-full items-center gap-[12px] rounded-[10px] px-[4px] py-[10px] active:bg-foreground/[0.04]"
								>
									<div className="grid h-[38px] w-[38px] shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm">
										<BrandLogo brand={b} className="h-[28px] w-[28px]" />
									</div>
									<div className="min-w-0 text-left">
										<p className="text-[14px] font-semibold text-foreground/85">{b.name}</p>
										<p className="text-[12px] text-slate-500">{b.ticker}</p>
									</div>
									{(comparePeers[0]?.id === b.id || comparePeers[1]?.id === b.id) && (
										<span className="ml-auto shrink-0 text-[11px] text-blue-400">Selected</span>
									)}
								</button>
							))}
						</div>
				</div>
			)}
		</div>,
		document.body,
	);

	// Shown while selectedBrandId is set but useBrandDetail's full-profile fetch
	// hasn't resolved yet (or has failed) -- without this, tapping a brand looks
	// like the tap did nothing until the fetch completes, with no way to recover
	// if it 404s (e.g. a staked brand removed from the catalog).
	const selectedBrandSummary = swipedBrands.find((b) => b.id === selectedBrandId) ?? null;
	const brandDetailLoadingOverlay = selectedBrandId && !selectedBrand && createPortal(
		<div className="fixed inset-0 z-[60] flex flex-col bg-background">
			<header className="flex items-center px-[20px] pt-[8px] pb-[14px]">
				<button
					type="button"
					onClick={handleCloseDetail}
					className="grid h-[36px] w-[36px] place-items-center rounded-full bg-foreground/[0.07] text-foreground/80 active:bg-foreground/[0.12] transition-colors"
				>
					<ChevronLeft size={22} />
				</button>
			</header>
			<div className="flex flex-1 flex-col items-center justify-center gap-[16px] px-[24px] pb-[80px] text-center">
				{selectedBrandError ? (
					<>
						<p className="text-[16px] font-bold text-foreground">Couldn't load {selectedBrandSummary?.name ?? "this stock"}</p>
						<p className="text-[13px] dark:text-slate-400 text-slate-500">Check your connection and try again.</p>
					</>
				) : (
					<>
						{selectedBrandSummary && <BrandLogo brand={selectedBrandSummary} className="w-[56px] h-[56px] rounded-full" />}
						<div className="h-[14px] w-[140px] rounded dark:bg-slate-700/50 bg-slate-200/70 animate-pulse" />
					</>
				)}
			</div>
		</div>,
		document.body,
	);

	const topCategory = computeTopDisplayCategory(account?.tagScores ?? {});
	const riskLabel = deriveRiskLabel(swipedBrands);


	return (
		<div className="min-h-full bg-background text-foreground">
			{/* Dashboard header */}
			<div className="relative overflow-hidden px-[22px] pt-[18px] pb-[22px] bg-background">


				<div className="relative z-10">
					<div className="flex items-start justify-between">
						<div>
							<h1 className="text-[38px] font-bold tracking-[-0.05em] leading-none text-foreground">My STAK</h1>
							<p className="mt-[8px] text-[14px] dark:text-slate-400 text-slate-500">Your living watchlist & learning hub.</p>
						</div>
					</div>

					<div className="mt-[22px] grid grid-cols-4 gap-[10px]">
						<StatCard
							icon={<Bookmark size={20} />}
							iconColor="blue"
							number={String(swipedBrands.length)}
							title="saved stocks"
						/>
						<StatCard
							icon={<ShoppingBag size={20} />}
							iconColor="purple"
							title={topCategory.title}
							subtitle={topCategory.subtitle}
						/>
						<StatCard
							icon={<Shield size={20} />}
							iconColor="green"
							title={riskLabel.title}
							subtitle={riskLabel.subtitle}
						/>
						<StatCard
							icon={<CalendarDays size={20} />}
							iconColor="blue"
							number={upcomingEarningsCount != null ? String(upcomingEarningsCount) : undefined}
							title="earnings"
							subtitle="this week"
							onClick={() => setEarningsCalendarOpen(true)}
						/>
					</div>
				</div>
			</div>

			{/* Daily Brief widget */}
			<button
				type="button"
				onClick={() => window.dispatchEvent(new CustomEvent("open-brief", { detail: { source: "mystak" } }))}
				className="w-full px-[18px] pt-[18px] pb-[4px] text-left"
			>
				<div className="rounded-[16px] border border-white/[0.08] bg-surface-1 px-[16px] py-[16px] shadow-[0_18px_50px_rgba(0,0,0,.45)]">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-[12px]">
							<FileText size={21} className="text-blue-400" strokeWidth={2.1} />
							<h2 className="text-[15px] font-medium text-foreground/85">Daily Brief</h2>
						</div>
						<p className="text-[11px] text-slate-500">
							Updated {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
						</p>
					</div>
					{(() => {
						const spyChange = spyData?.quote?.changePercent ?? null;
						const spyUp = (spyChange ?? 0) >= 0;
						const briefSubtitle = myDailyBrief?.moodExplanation ?? (spyUp ? "Markets trending higher today." : "Markets pulling back today.");
						const topThemeLabel = topCategory.title + " " + topCategory.subtitle;
						const moverUp = (topMover?.changePercent ?? 0) >= 0;
						return (
							<div className="mt-[20px] flex items-center">
								<div className="flex flex-1 items-center gap-[13px]">
									<div className={`grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full border ${spyUp ? "border-emerald-500/55 bg-emerald-500/10 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,.12)]" : "border-rose-500/55 bg-rose-500/10 text-rose-400 shadow-[0_0_24px_rgba(244,63,94,.12)]"}`}>
										<TrendingUp size={21} strokeWidth={2.1} />
									</div>
									<div>
										<p className="text-[15px] font-medium text-foreground/95">
											{spyChange != null ? (
												<>Markets are {spyUp ? "up" : "down"}{" "}<span className={`font-semibold ${spyUp ? "text-emerald-400" : "text-rose-400"}`}>{spyUp ? "+" : ""}{spyChange.toFixed(2)}%</span></>
											) : (
												<>Markets loading…</>
											)}
										</p>
										<p className="mt-[4px] text-[11px] text-slate-500 line-clamp-1">{briefSubtitle}</p>
									</div>
								</div>
								<div className="mx-[18px] h-[39px] w-px bg-foreground/[0.08]" />
								<div className="w-[150px] space-y-[8px] text-[11px]">
									<div className="flex items-center justify-between gap-2">
										<span className="text-slate-500">Top Theme</span>
										<span className="text-blue-400">{topThemeLabel}</span>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="text-slate-500">Top Mover</span>
										{topMover ? (
											<span className={moverUp ? "text-emerald-400" : "text-rose-400"}>
												{topMover.ticker} {moverUp ? "+" : ""}{topMover.changePercent.toFixed(1)}%
											</span>
										) : (
											<span className="text-slate-500">—</span>
										)}
									</div>
								</div>
							</div>
						);
					})()}
				</div>
			</button>

			{accountLoading || allBrandsList === undefined ? (
				/* Loading skeleton -- also covers the catalog still loading, so a user
				   with a real Stak doesn't briefly see the "empty" state below */
				<div className="px-[18px] pt-[18px] pb-6 space-y-[8px]">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="flex items-center gap-[12px] rounded-[9px] px-[5px] py-[8px]">
							<div className="h-[38px] w-[38px] shrink-0 rounded-full dark:bg-slate-700/50 bg-slate-200/70 animate-pulse" />
							<div className="flex-1 space-y-[8px]">
								<div className="h-[13px] w-[120px] rounded dark:bg-slate-700/50 bg-slate-200/70 animate-pulse" />
								<div className="h-[10px] w-[70px] rounded bg-slate-700/40 animate-pulse" />
							</div>
							<div className="h-[13px] w-[45px] rounded bg-slate-700/40 animate-pulse" />
						</div>
					))}
				</div>
			) : swipedBrands.length === 0 ? (
				/* Empty state */
				<div className="flex flex-col items-center justify-center min-h-[40vh] px-[18px] text-center">
					<div className="grid h-[60px] w-[60px] place-items-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300 mb-[16px] shadow-[0_0_28px_rgba(139,92,246,.15)]">
						<Sparkles className="w-[26px] h-[26px]" />
					</div>
					<h2 className="text-[18px] font-bold text-foreground/90">Your STAK is empty</h2>
					<p className="mt-[8px] text-[13px] dark:text-slate-400 text-slate-500 max-w-[240px] leading-[19px]">
						Swipe through stocks and save the ones you vibe with — they'll live here.
					</p>
					<button
						type="button"
						onClick={() => navigate({ to: "/" })}
						className="mt-[22px] rounded-[12px] bg-gradient-to-r from-blue-500 to-violet-500 px-[28px] py-[12px] text-[14px] font-semibold text-foreground shadow-[0_0_24px_rgba(99,102,241,.3)] active:opacity-80 transition-opacity"
					>
						Start Swiping
					</button>
				</div>
			) : (
				/* Stock list */
				<div className="px-[18px] pt-[18px] pb-6">
					<StakWatchList
						brands={swipedBrands}
						onRemove={handleRemoveFromStak}
						onClick={handleBrandClick}
					/>
				</div>
			)}

			{brandDetailOverlay}
			{brandDetailLoadingOverlay}

			{/* Hidden earnings calendar — opened by the earnings stat card */}
			<div className="hidden">
				<EarningsCalendarButton
					externalOpen={earningsCalendarOpen}
					onExternalClose={() => setEarningsCalendarOpen(false)}
					onSelectBrand={handleBrandClick}
				/>
			</div>
		</div>
	);
}

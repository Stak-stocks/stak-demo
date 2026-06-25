import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { BrandSummary } from "@stak/shared";
import { BrandLogo } from "@/components/BrandLogo";
import { useAccount } from "@/context/AccountContext";
import { useBrandDetail } from "@/hooks/useBrandDetail";
import { Plus, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
	getPeerMetrics, getStockData, getCompanyNews, getAnalystData, getEarningsQuick, getDailyMove, getKeyRisk, getDailyBrief,
} from "@/lib/api";
import { marketSessionBucket, getLastCloseRef, getEasternDateKey } from "@/lib/utils";
import {
	Coffee, TrendingUp, AlertTriangle, BarChart3, Target,
} from "lucide-react";

interface BrandContextModalProps {
	brand: BrandSummary | null;
	open: boolean;
	onClose: () => void;
	onAddToStak?: (brand: BrandSummary) => void;
}

type IconColor = "green" | "amber" | "purple" | "blue" | "cyan" | "slate";

const COLOR_MAP: Record<IconColor, string> = {
	green:  "border-emerald-400/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_22px_rgba(16,185,129,.10)]",
	amber:  "border-amber-400/25  bg-amber-500/10  text-amber-400  shadow-[0_0_22px_rgba(245,158,11,.10)]",
	purple: "border-violet-400/25 bg-violet-500/10 text-violet-400 shadow-[0_0_22px_rgba(139,92,246,.10)]",
	blue:   "border-blue-400/25   bg-blue-500/10   text-blue-400   shadow-[0_0_22px_rgba(59,130,246,.10)]",
	cyan:   "border-cyan-400/25   bg-cyan-500/10   text-cyan-400   shadow-[0_0_22px_rgba(34,211,238,.10)]",
	slate:  "border-slate-400/20  bg-slate-500/10  dark:text-slate-400 text-slate-500  shadow-none",
};

interface InfoRowProps {
	heading: string;
	content: string | null;
	icon: React.ReactElement;
	color: IconColor;
	loading?: boolean;
	right?: React.ReactElement | null;
}

function InfoRow({ heading, content, icon, color, loading = false, right = null }: InfoRowProps) {
	return (
		<div className="flex min-h-[74px] items-center rounded-[14px] border border-white/[0.055] bg-surface-1/82 px-[12px] py-[10px] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-md">
			<div className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[12px] border ${COLOR_MAP[color]}`}>
				{icon}
			</div>
			<div className="ml-[13px] min-w-0 flex-1">
				<p className="text-[12px] font-semibold leading-[15px] text-foreground/95">{heading}</p>
				{loading ? (
					<div className="mt-[5px] h-[10px] w-2/3 rounded bg-slate-700/40 animate-pulse" />
				) : (
					<p className="mt-[3px] text-[10px] leading-[13px] dark:text-slate-300 text-slate-600/82">{content ?? "—"}</p>
				)}
			</div>
			{right && <div className="ml-3 shrink-0 text-right">{right}</div>}
		</div>
	);
}

// ── Peer comparison strip ────────────────────────────────────────────────────

function parseStaticValue(raw: string): number | null {
	const cleaned = raw.replace(/[%x$,]/g, "").trim();
	if (cleaned === "N/A" || cleaned === "") return null;
	const n = parseFloat(cleaned);
	return isNaN(n) ? null : n;
}

interface PeerStatProps {
	label: string;
	stockVal: string;
	peerVal: number | null;
	format?: (v: number) => string;
	higherIsBetter?: boolean;
}

function PeerStat({ label, stockVal, peerVal, format, higherIsBetter = true }: PeerStatProps) {
	const stockNum = parseStaticValue(stockVal);
	const fmt = format ?? ((v: number) => v.toFixed(1));

	let badge: React.ReactElement | null = null;
	if (peerVal !== null && stockNum !== null) {
		const abovePeer = stockNum > peerVal;
		const isGood = higherIsBetter ? abovePeer : !abovePeer;
		badge = (
			<span className={`text-[9px] font-semibold px-[5px] py-[1px] rounded-full ${
				isGood ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
			}`}>
				{abovePeer ? "▲" : "▼"} vs peers
			</span>
		);
	}

	return (
		<div className="flex flex-col gap-[3px]">
			<p className="text-[9px] dark:text-slate-400 text-slate-500/70 uppercase tracking-wider">{label}</p>
			<div className="flex items-center gap-[5px] flex-wrap">
				<span className="text-[13px] font-semibold text-foreground">{stockVal}</span>
				{badge}
			</div>
			{peerVal !== null && (
				<p className="text-[9px] dark:text-slate-400 text-slate-500/60">Peer avg: {fmt(peerVal)}</p>
			)}
		</div>
	);
}

// ── Helpers for section content ──────────────────────────────────────────────

function quarterLabel(quarter: number, year: number): string {
	return `Q${quarter} ${year}`;
}

function fmtEps(v: number | null): string {
	if (v === null) return "N/A";
	return `$${Math.abs(v).toFixed(2)}`;
}

// ── Main component ───────────────────────────────────────────────────────────

export function BrandContextModal({ brand, open, onClose, onAddToStak }: BrandContextModalProps) {
	const { account } = useAccount();
	const inStak = brand ? (account?.stakBrandIds?.includes(brand.id) ?? false) : false;
	const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	const [dragY, setDragY] = useState(0);
	const dragging = useRef(false);
	const startY = useRef(0);
	const startTime = useRef(0);

	// Live data queries — all fire only when the modal is open
	const { data: peerData, isLoading: peerLoading } = useQuery({
		queryKey: ["peer-metrics", brand?.ticker],
		queryFn: () => getPeerMetrics(brand!.ticker),
		enabled: !!brand && open,
		staleTime: 24 * 60 * 60 * 1000,
		gcTime:    25 * 60 * 60 * 1000,
		retry: 0,
	});

	const { data: stockData, isLoading: stockLoading } = useQuery({
		queryKey: ["stock", brand?.ticker],
		queryFn: () => getStockData(brand!.ticker),
		enabled: !!brand && open,
		staleTime: 5 * 60 * 1000,
		gcTime:    10 * 60 * 1000,
		retry: 0,
	});

	const { data: newsData, isLoading: newsLoading } = useQuery({
		queryKey: ["news", brand?.ticker],
		queryFn: () => getCompanyNews(brand!.ticker, brand!.name),
		enabled: !!brand && open,
		staleTime: 15 * 60 * 1000,
		gcTime:    20 * 60 * 1000,
		retry: 0,
	});

	const { data: analystData, isLoading: analystLoading } = useQuery({
		queryKey: ["analyst", "v2", brand?.ticker],
		queryFn: () => getAnalystData(brand!.ticker, brand!.name),
		enabled: !!brand && open,
		staleTime: 3 * 24 * 60 * 60 * 1000,
		gcTime:    4 * 24 * 60 * 60 * 1000,
		retry: 0,
	});

	const { data: earningsData, isLoading: earningsLoading } = useQuery({
		queryKey: ["earnings-quick", brand?.ticker],
		queryFn: () => getEarningsQuick(brand!.ticker),
		enabled: !!brand && open,
		staleTime: 12 * 60 * 60 * 1000,
		gcTime:    13 * 60 * 60 * 1000,
		retry: 0,
	});

	const { data: briefData } = useQuery({
		queryKey: ["daily-brief", getEasternDateKey(), marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		retry: 0,
	});
	const isMktClosed = !!(briefData as { marketClosed?: boolean } | undefined)?.marketClosed;
	const lastCloseRef = getLastCloseRef();

	const pctForMove = stockData?.quote?.changePercent;
	// Use direction (up/down/flat) as cache key discriminator — stable within 30min TTL
	const moveDirection = pctForMove == null ? null : pctForMove > 0.15 ? "up" : pctForMove < -0.15 ? "down" : "flat";
	const { data: dailyMoveData, isLoading: dailyMoveLoading } = useQuery({
		queryKey: ["daily-move", brand?.ticker, moveDirection, isMktClosed, lastCloseRef],
		queryFn: () => getDailyMove(brand!.ticker, pctForMove, brand!.name, undefined, isMktClosed, lastCloseRef),
		enabled: !!brand && open && pctForMove !== undefined,
		staleTime: 30 * 60 * 1000,
		gcTime:    60 * 60 * 1000,
		retry: 0,
	});

	const { data: keyRiskData, isLoading: keyRiskLoading } = useQuery({
		queryKey: ["key-risk", brand?.ticker],
		queryFn: () => getKeyRisk(
			brand!.ticker,
			brand!.name,
			brand!.financials.beta.value,
			brand!.financials.peRatio.value,
		),
		enabled: !!brand && open,
		staleTime: 6 * 60 * 60 * 1000,
		gcTime:    7 * 60 * 60 * 1000,
		retry: 0,
	});

	// Full profile fetched only for culturalContext -- everything else this modal
	// shows is summary-level. Falls back to brand.bio (see whatContent below)
	// while this is loading, so there's no extra loading state to render.
	const { data: fullBrand } = useBrandDetail(open ? brand?.id : undefined);

	useEffect(() => {
		if (brand && open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => { document.body.style.overflow = ""; };
	}, [brand, open]);

	useEffect(() => {
		if (open) setDragY(0);
	}, [open]);

	const handleDragStart = useCallback((clientY: number) => {
		dragging.current = true;
		startY.current = clientY;
		startTime.current = Date.now();
	}, []);

	const handleDragMove = useCallback((clientY: number) => {
		if (!dragging.current) return;
		setDragY(Math.max(0, clientY - startY.current));
	}, []);

	const handleDragEnd = useCallback(() => {
		if (!dragging.current) return;
		dragging.current = false;
		const velocity = dragY / Math.max(Date.now() - startTime.current, 1);
		if (dragY > 100 || velocity > 0.5) onClose();
		setDragY(0);
	}, [dragY, onClose]);

	if (!brand || !open) return null;

	// ── Derive section content ──────────────────────────────────────────────

	// 1. What the company does — first culturalContext section
	const whatContent = fullBrand?.culturalContext.sections[0]?.content ?? brand.bio;

	// 2. Why it moved — Gemini 1-sentence explanation (same source as news signal)
	const pct = stockData?.quote?.changePercent;
	const whyLoading = dailyMoveLoading || (!stockData && !dailyMoveData);
	const priceUp = pct !== undefined ? pct >= 0 : true;
	const whyContent = dailyMoveData?.explanation ?? null;

	// 3. Key risks — Gemini Search: financial + macro risk for this stock
	const riskLoading = keyRiskLoading;
	const riskContent = keyRiskData?.risk ?? null;

	// 4. Recent earnings — EPS actual vs estimate
	const earningsContent = (() => {
		if (earningsLoading) return null;
		if (!earningsData) return "No recent earnings data available.";
		const { quarter, year, epsActual, epsEstimate, beat } = earningsData;
		if (epsActual === null && epsEstimate === null) return "Earnings data unavailable.";
		const label = quarterLabel(quarter, year);
		const verdict = beat === true ? "beat" : beat === false ? "missed" : "vs";
		return `${label}: EPS ${fmtEps(epsActual)} ${verdict} est. ${fmtEps(epsEstimate)}`;
	})();
	const earningsBeat = earningsData?.beat === true;

	// 5. Price target — analyst low/avg/high + % upside from current price
	const targetLow = analystData?.priceTarget?.low ?? null;
	const targetAvg = analystData?.priceTarget?.avg ?? null;
	const targetHigh = analystData?.priceTarget?.high ?? null;
	const currentPrice = stockData?.quote?.price ?? null;
	const upsidePct = targetAvg !== null && currentPrice !== null && currentPrice > 0
		? ((targetAvg - currentPrice) / currentPrice) * 100
		: null;
	const priceTargetContent = targetAvg !== null
		? `Wall St. average target is $${targetAvg.toFixed(0)}${upsidePct !== null ? ` — ${upsidePct > 0 ? "+" : ""}${upsidePct.toFixed(1)}% from current price` : ""}${targetLow !== null && targetHigh !== null ? `. Range: $${targetLow.toFixed(0)} low to $${targetHigh.toFixed(0)} high.` : "."}`
		: null;
	const priceTargetRight = targetAvg !== null ? (
		<div className="text-right">
			<p className="text-[15px] font-bold text-blue-400">${targetAvg.toFixed(0)}</p>
			{upsidePct !== null && (
				<p className={`text-[10px] font-semibold ${upsidePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
					{upsidePct >= 0 ? "↑" : "↓"} {Math.abs(upsidePct).toFixed(1)}%
				</p>
			)}
			{targetLow !== null && targetHigh !== null && (
				<p className="text-[9px] text-slate-500 mt-[1px]">${targetLow.toFixed(0)}–${targetHigh.toFixed(0)}</p>
			)}
		</div>
	) : null;

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex flex-col justify-end"
			onClick={onClose}
		>
			<div className="absolute inset-0 bg-black/50" />

			<div
				className="relative w-full max-w-lg mx-auto rounded-t-[24px] flex flex-col overflow-hidden bg-surface-2"
				style={{
					maxHeight: "80dvh",
					transform: `translateY(${dragY}px)`,
					transition: dragging.current ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
					opacity: dragY > 0 ? Math.max(0.4, 1 - dragY / 300) : 1,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drag handle */}
				<div
					className="flex justify-center pt-[10px] pb-[4px] cursor-grab active:cursor-grabbing touch-none shrink-0"
					onTouchStart={(e) => handleDragStart(e.touches[0]!.clientY)}
					onTouchMove={(e) => handleDragMove(e.touches[0]!.clientY)}
					onTouchEnd={handleDragEnd}
					onPointerDown={(e) => { handleDragStart(e.clientY); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
					onPointerMove={(e) => handleDragMove(e.clientY)}
					onPointerUp={handleDragEnd}
				>
					<div className="w-9 h-[4px] bg-white/20 rounded-full" />
				</div>

				{/* Title */}
				<div className="flex items-center gap-2.5 px-[22px] pt-[6px] pb-[12px] shrink-0">
					<div className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[6px] bg-white">
						<BrandLogo brand={brand} className="w-[20px] h-[20px] rounded-[3px]" />
					</div>
					<h1 className="text-[16px] font-medium tracking-[-0.01em] text-foreground/95">
						About {brand.name} <span className="text-foreground/50">({brand.ticker})</span>
					</h1>
				</div>

				{/* Peer comparison strip */}
				<div className="shrink-0 mx-[22px] mb-[10px] rounded-[12px] border border-foreground/[0.07] bg-foreground/[0.03] px-[14px] py-[11px]">
					<p className="text-[9px] font-semibold dark:text-slate-400 text-slate-500/70 uppercase tracking-wider mb-[10px]">
						By the Numbers
						{peerData && peerData.peerCount > 0 && (
							<span className="ml-[6px] normal-case font-normal text-slate-500/60">
								vs. {peerData.peerCount} peers
							</span>
						)}
					</p>
					<div className="grid grid-cols-3 gap-x-[12px] gap-y-[10px]">
						<PeerStat
							label="P/E"
							stockVal={brand.financials.peRatio.value}
							peerVal={peerLoading ? null : (peerData?.pe ?? null)}
							format={(v) => `${v.toFixed(1)}x`}
							higherIsBetter={false}
						/>
						<PeerStat
							label="Rev Growth"
							stockVal={brand.financials.revenueGrowth.value}
							peerVal={peerLoading ? null : (peerData?.revenueGrowth ?? null)}
							format={(v) => `${v.toFixed(1)}%`}
							higherIsBetter={true}
						/>
						<PeerStat
							label="Net Margin"
							stockVal={brand.financials.profitMargin.value}
							peerVal={peerLoading ? null : (peerData?.profitMargin ?? null)}
							format={(v) => `${v.toFixed(1)}%`}
							higherIsBetter={true}
						/>
					</div>
				</div>

				{/* Scrollable 5 sections */}
				<div
					className="flex-1 overflow-y-auto px-[22px] min-h-0 [&::-webkit-scrollbar]:hidden"
					style={{ scrollbarWidth: "none" }}
				>
					<div className="space-y-[8px] pb-[8px]">
						<InfoRow
							heading="What the company does"
							content={whatContent}
							icon={<Coffee size={21} />}
							color="green"
						/>
						<InfoRow
							heading={lastCloseRef === "today" || lastCloseRef === "close" ? "Why it moved today" : `Why it moved ${lastCloseRef}`}
							content={whyContent}
							loading={whyLoading}
							icon={<TrendingUp size={23} />}
							color={priceUp ? "green" : "amber"}
						/>
						<InfoRow
							heading="Key risks"
							content={riskContent}
							loading={riskLoading}
							icon={<AlertTriangle size={22} />}
							color="amber"
						/>
						<InfoRow
							heading="Recent earnings"
							content={earningsContent}
							loading={earningsLoading}
							icon={<BarChart3 size={22} />}
							color={earningsBeat ? "green" : "purple"}
						/>
						<InfoRow
							heading="Price target"
							content={priceTargetContent}
							loading={!analystData && !stockData}
							icon={<Target size={22} />}
							color="blue"
							right={priceTargetRight}
						/>
					</div>

					<div className="flex items-center justify-between mt-[13px] pb-1 text-[10px] dark:text-slate-400 text-slate-500/80">
						<p>Source: STAK Research</p>
						<p>As of {today}</p>
					</div>
				</div>

				{/* Add to Stak CTA */}
				{onAddToStak && (
					<div className="shrink-0 px-[18px] py-[14px] border-t border-foreground/[0.06]">
						<button
							type="button"
							disabled={inStak}
							onClick={() => { onAddToStak(brand); onClose(); }}
							className={`flex h-[44px] w-full items-center justify-center gap-[10px] rounded-[10px] text-[14px] font-semibold transition-opacity active:scale-[0.98] ${
								inStak
									? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default"
									: "text-white shadow-[0_8px_24px_rgba(59,130,246,.22)] active:opacity-80"
							}`}
							style={inStak ? undefined : { background: "linear-gradient(90deg,#23d6dd 0%,#5f7cff 50%,#9853ee 100%)" }}
						>
							{inStak
								? <><Check size={16} /> Already in your Stak</>
								: <><Plus size={16} /> Add to Stak</>
							}
						</button>
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { BrandProfile } from "@/data/brands";
import { BrandLogo } from "@/components/BrandLogo";
import { useAccount } from "@/context/AccountContext";
import { Plus, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPeerMetrics } from "@/lib/api";
import {
	Coffee, TrendingUp, AlertTriangle, BarChart3, Target,
	Building2, Shield, Zap, DollarSign, Rocket,
	Users, Globe, Info,
} from "lucide-react";

interface BrandContextModalProps {
	brand: BrandProfile | null;
	open: boolean;
	onClose: () => void;
	onAddToStak?: (brand: BrandProfile) => void;
}

type IconColor = "green" | "amber" | "purple" | "blue" | "cyan" | "slate";

const COLOR_MAP: Record<IconColor, string> = {
	green:  "border-emerald-400/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_22px_rgba(16,185,129,.10)]",
	amber:  "border-amber-400/25  bg-amber-500/10  text-amber-400  shadow-[0_0_22px_rgba(245,158,11,.10)]",
	purple: "border-violet-400/25 bg-violet-500/10 text-violet-400 shadow-[0_0_22px_rgba(139,92,246,.10)]",
	blue:   "border-blue-400/25   bg-blue-500/10   text-blue-400   shadow-[0_0_22px_rgba(59,130,246,.10)]",
	cyan:   "border-cyan-400/25   bg-cyan-500/10   text-cyan-400   shadow-[0_0_22px_rgba(34,211,238,.10)]",
	slate:  "border-slate-400/20  bg-slate-500/10  text-slate-400  shadow-none",
};

function getSectionMeta(heading: string): { icon: React.ReactElement; color: IconColor } {
	const h = heading.toLowerCase();
	if (h.includes("does") || h.includes("overview") || h.includes("coffee") || h.includes("product") || h.includes("service"))
		return { icon: <Coffee size={21} />,        color: "green"  };
	if (h.includes("crypto") || h.includes("bitcoin") || h.includes("coin") || h.includes("token") || h.includes("web3") || h.includes("defi"))
		return { icon: <Zap size={22} />,           color: "purple" };
	if (h.includes("meme") || h.includes("trade") || h.includes("trading") || h.includes("stock") || h.includes("invest") || h.includes("moved") || h.includes("why") || h.includes("perform") || h.includes("rally") || h.includes("rise") || h.includes("fell") || h.includes("matter"))
		return { icon: <TrendingUp size={23} />,    color: "green"  };
	if (h.includes("risk") || h.includes("concern") || h.includes("challenge") || h.includes("threat") || h.includes("warn") || h.includes("danger"))
		return { icon: <AlertTriangle size={22} />, color: "amber"  };
	if (h.includes("earning") || h.includes("revenue") || h.includes("result") || h.includes("quarter") || h.includes("recent") || h.includes("number"))
		return { icon: <BarChart3 size={22} />,     color: "purple" };
	if (h.includes("gold") || h.includes("card") || h.includes("premium") || h.includes("financ") || h.includes("profit") || h.includes("margin") || h.includes("cash") || h.includes("money") || h.includes("payment"))
		return { icon: <DollarSign size={22} />,    color: "green"  };
	if (h.includes("price") || h.includes("target") || h.includes("analyst") || h.includes("upside") || h.includes("valuat"))
		return { icon: <Target size={22} />,        color: "blue"   };
	if (h.includes("growth") || h.includes("expand") || h.includes("scale") || h.includes("future") || h.includes("next") || h.includes("opportun"))
		return { icon: <Rocket size={22} />,        color: "cyan"   };
	if (h.includes("competi") || h.includes("moat") || h.includes("advantage") || h.includes("position") || h.includes("against"))
		return { icon: <Shield size={22} />,        color: "blue"   };
	if (h.includes("customer") || h.includes("user") || h.includes("audience") || h.includes("communit") || h.includes("people"))
		return { icon: <Users size={22} />,         color: "purple" };
	if (h.includes("global") || h.includes("market") || h.includes("international") || h.includes("world"))
		return { icon: <Globe size={22} />,         color: "cyan"   };
	if (h.includes("innovat") || h.includes("tech") || h.includes("ai") || h.includes("model") || h.includes("engine") || h.includes("platform") || h.includes("system") || h.includes("power"))
		return { icon: <Zap size={22} />,           color: "purple" };
	if (h.includes("brand") || h.includes("identity") || h.includes("culture") || h.includes("story") || h.includes("histor") || h.includes("origin"))
		return { icon: <Building2 size={22} />,     color: "slate"  };
	return   { icon: <Info size={22} />,            color: "slate"  };
}

function InfoRow({ heading, content }: { heading: string; content: string }) {
	const { icon, color } = getSectionMeta(heading);
	return (
		<div className="flex min-h-[74px] items-center rounded-[14px] border border-white/[0.055] bg-[#0b1e32]/82 px-[12px] py-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,.03)] backdrop-blur-md">
			<div className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[12px] border ${COLOR_MAP[color]}`}>
				{icon}
			</div>
			<div className="ml-[13px] min-w-0 flex-1">
				<p className="text-[12px] font-semibold leading-[15px] text-white/95">{heading}</p>
				<p className="mt-[3px] text-[10px] leading-[13px] text-slate-300/82">{content}</p>
			</div>
		</div>
	);
}

// ── Peer comparison strip ────────────────────────────────────────────────────

function parseStaticValue(raw: string): number | null {
	// Strips trailing %, x, $, B, T, M — returns the leading number or null
	const cleaned = raw.replace(/[%x$,]/g, "").trim();
	if (cleaned === "N/A" || cleaned === "") return null;
	const n = parseFloat(cleaned);
	return isNaN(n) ? null : n;
}

interface PeerStatProps {
	label: string;
	stockVal: string;  // static string from brand.financials
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
				isGood
					? "bg-emerald-500/15 text-emerald-400"
					: "bg-amber-500/15 text-amber-400"
			}`}>
				{abovePeer ? "▲" : "▼"} vs peers
			</span>
		);
	}

	return (
		<div className="flex flex-col gap-[3px]">
			<p className="text-[9px] text-slate-400/70 uppercase tracking-wider">{label}</p>
			<div className="flex items-center gap-[5px] flex-wrap">
				<span className="text-[13px] font-semibold text-white">{stockVal}</span>
				{badge}
			</div>
			{peerVal !== null && (
				<p className="text-[9px] text-slate-400/60">Peer avg: {fmt(peerVal)}</p>
			)}
		</div>
	);
}

export function BrandContextModal({ brand, open, onClose, onAddToStak }: BrandContextModalProps) {
	const { account } = useAccount();
	const inStak = brand ? (account?.stakBrandIds?.includes(brand.id) ?? false) : false;
	const [dragY, setDragY] = useState(0);

	const { data: peerData } = useQuery({
		queryKey: ["peer-metrics", brand?.ticker],
		queryFn: () => getPeerMetrics(brand!.ticker),
		enabled: !!brand && open,
		staleTime: 24 * 60 * 60 * 1000,
		gcTime:    25 * 60 * 60 * 1000,
		retry: 0,
	});
	const dragging = useRef(false);
	const startY = useRef(0);
	const startTime = useRef(0);

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

	const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex flex-col justify-end"
			onClick={onClose}
		>
			{/* Backdrop — light enough to see the card above */}
			<div className="absolute inset-0 bg-black/50" />

			{/* Half-sheet */}
			<div
				className="relative w-full max-w-lg mx-auto rounded-t-[24px] flex flex-col overflow-hidden"
				style={{
					maxHeight: "68dvh",
					background: "linear-gradient(180deg,#0b1b2f 0%,#071526 55%,#051120 100%)",
					transform: `translateY(${dragY}px)`,
					transition: dragging.current ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
					opacity: dragY > 0 ? Math.max(0.4, 1 - dragY / 300) : 1,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drag handle */}
				<div
					className="flex justify-center pt-[10px] pb-[4px] cursor-grab active:cursor-grabbing touch-none shrink-0"
					onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
					onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
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
					<h1 className="text-[16px] font-medium tracking-[-0.01em] text-white/95">
						About {brand.name} <span className="text-white/50">({brand.ticker})</span>
					</h1>
				</div>

				{/* Peer comparison strip */}
				{(peerData || brand.financials) && (
					<div className="shrink-0 mx-[22px] mb-[10px] rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-[14px] py-[11px]">
						<p className="text-[9px] font-semibold text-slate-400/70 uppercase tracking-wider mb-[10px]">
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
								peerVal={peerData?.pe ?? null}
								format={(v) => `${v.toFixed(1)}x`}
								higherIsBetter={false}
							/>
							<PeerStat
								label="Rev Growth"
								stockVal={brand.financials.revenueGrowth.value}
								peerVal={peerData?.revenueGrowth ?? null}
								format={(v) => `${v.toFixed(1)}%`}
								higherIsBetter={true}
							/>
							<PeerStat
								label="Net Margin"
								stockVal={brand.financials.profitMargin.value}
								peerVal={peerData?.profitMargin ?? null}
								format={(v) => `${v.toFixed(1)}%`}
								higherIsBetter={true}
							/>
						</div>
					</div>
				)}

				{/* Scrollable rows */}
				<div
					className="flex-1 overflow-y-auto px-[22px] min-h-0 [&::-webkit-scrollbar]:hidden"
					style={{ scrollbarWidth: "none" }}
				>
					<div className="space-y-[8px]">
						{brand.culturalContext.sections.map((section, i) => (
							<InfoRow key={i} heading={section.heading} content={section.content} />
						))}
					</div>

					<div className="flex items-center justify-between mt-[13px] pb-1 text-[10px] text-slate-400/80">
						<p>Source: STAK Editorial</p>
						<p>As of {today}</p>
					</div>
				</div>

				{/* Add to Stak CTA — only shown when onAddToStak is provided */}
				{onAddToStak && (
					<div className="shrink-0 px-[18px] py-[14px] border-t border-white/[0.06]">
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

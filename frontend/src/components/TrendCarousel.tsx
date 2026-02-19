import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TrendCard } from "@/data/brands";

/* ── colour system ── */
const COLOR_MAP: Record<
	TrendCard["type"],
	{
		badgeText: string;
		dominance: string;
		dotActive: string;
		rgb: string;
	}
> = {
	macro: {
		badgeText: "text-red-400",
		dominance: "text-red-500",
		dotActive: "bg-red-400",
		rgb: "239,68,68",
	},
	sector: {
		badgeText: "text-cyan-400",
		dominance: "text-cyan-300",
		dotActive: "bg-cyan-400",
		rgb: "6,182,212",
	},
	company: {
		badgeText: "text-orange-400",
		dominance: "text-orange-500",
		dotActive: "bg-orange-400",
		rgb: "249,115,22",
	},
	stak: {
		badgeText: "text-amber-400",
		dominance: "text-amber-400",
		dotActive: "bg-amber-400",
		rgb: "251,191,36",
	},
};

const BADGE_EMOJI: Record<TrendCard["type"], string> = {
	macro: "\u{1F30D}",
	sector: "\u{1F916}",
	company: "\u{1F4E6}",
	stak: "\u{1F9E0}",
};

/* ── helpers for legacy stak text ── */
function highlightTrendRefs(text: string) {
	const parts = text.split(
		/(\(Macro\)|\(Sector\)|\(Company trend\)|\(Company\))/g,
	);
	return parts.map((part, i) => {
		if (/^\(Macro\)$/.test(part))
			return <span key={i} className="font-semibold text-red-400">{part}</span>;
		if (/^\(Sector\)$/.test(part))
			return <span key={i} className="font-semibold text-cyan-400">{part}</span>;
		if (/^\(Company( trend)?\)$/.test(part))
			return <span key={i} className="font-semibold text-orange-400">{part}</span>;
		return part;
	});
}

/* ── glass card wrapper ── */
function GlassCard({ type, children }: { type: TrendCard["type"]; children: React.ReactNode }) {
	const c = COLOR_MAP[type];
	return (
		<div
			className="rounded-[20px] min-h-[220px] sm:min-h-[480px]"
			style={{
				border: `1.5px solid rgba(${c.rgb}, 0.85)`,
				boxShadow: `0 0 6px rgba(${c.rgb}, 0.6), 0 0 15px rgba(${c.rgb}, 0.35), 0 0 40px rgba(${c.rgb}, 0.12), inset 0 0 15px rgba(${c.rgb}, 0.08)`,
			}}
		>
			<div
				className="rounded-[20px] p-4 sm:p-7 flex flex-col backdrop-blur-xl overflow-hidden min-h-[220px] sm:min-h-[480px]"
				style={{
					background: "linear-gradient(155deg, rgba(14,20,38,0.95) 0%, rgba(10,15,30,0.90) 100%)",
				}}
			>
				{children}
			</div>
		</div>
	);
}

/* ── badge pill ── */
function Badge({ type, label }: { type: TrendCard["type"]; label: string }) {
	const c = COLOR_MAP[type];
	return (
		<div
			className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border w-fit mb-3 sm:mb-4"
			style={{
				background: `linear-gradient(135deg, rgba(${c.rgb}, 0.08) 0%, rgba(${c.rgb}, 0.15) 100%)`,
				borderColor: `rgba(${c.rgb}, 0.5)`,
				boxShadow: `0 0 8px rgba(${c.rgb}, 0.3), inset 0 0 8px rgba(${c.rgb}, 0.1)`,
			}}
		>
			<span className="text-sm">{BADGE_EMOJI[type]}</span>
			<span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${c.badgeText}`}>
				{label}
			</span>
			<span className={`${c.badgeText} text-sm`}>&rarr;</span>
		</div>
	);
}

/* ── impact footer (matches the image style) ── */
function ImpactFooter({ impact, badgeText, rgb }: { impact: string; badgeText: string; rgb: string }) {
	return (
		<div
			className="flex items-center gap-2 mt-auto pt-3 sm:pt-4"
			style={{ borderTop: `1px solid rgba(${rgb}, 0.15)` }}
		>
			<div>
				<p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">
					Impact
				</p>
				<p className={`text-xs sm:text-sm font-semibold ${badgeText}`}>
					{impact}
				</p>
			</div>
		</div>
	);
}

/* ── Standard trend card (Macro / Sector / Company) ── */
function StandardTrendCard({ card }: { card: TrendCard }) {
	const c = COLOR_MAP[card.type];

	/* NEW FORMAT — has `why` field */
	if (card.why ?? card.topic) {
		return (
			<GlassCard type={card.type}>
				<Badge type={card.type} label={card.label} />

				{card.topic && (
					<h3 className="text-base sm:text-[1.65rem] font-extrabold text-white leading-tight mb-3 sm:mb-5">
						{card.topic}
					</h3>
				)}

				<p className="text-zinc-300 text-xs sm:text-[14px] leading-relaxed flex-1">
					<span className="font-bold text-white">The Why:&nbsp;</span>
					{card.why}
				</p>

				{card.impact && (
					<ImpactFooter impact={card.impact} badgeText={c.badgeText} rgb={c.rgb} />
				)}
			</GlassCard>
		);
	}

	/* LEGACY FORMAT — static fallback data */
	return (
		<GlassCard type={card.type}>
			<Badge type={card.type} label={card.label} />

			{card.headline && (
				<h3 className="text-base sm:text-[1.9rem] font-extrabold text-white leading-[1.18] mb-2 sm:mb-4">
					{card.headline}
				</h3>
			)}

			<p className="text-zinc-300 text-xs sm:text-[15px] leading-relaxed flex-1">
				<span className="font-bold text-white">The Why:&nbsp;</span>
				{card.explanation}
			</p>

			{card.pressure && (
				<div
					className="flex items-center gap-2 mt-auto pt-3"
					style={{ borderTop: `1px solid rgba(${c.rgb}, 0.15)` }}
				>
					{card.pressureEmoji && <span className="text-lg">{card.pressureEmoji}</span>}
					<div>
						<p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">
							Direction
						</p>
						<span className={`text-xs sm:text-sm font-semibold ${c.badgeText}`}>
							{card.pressure}
						</span>
					</div>
				</div>
			)}
		</GlassCard>
	);
}

/* ── Stak Insight card ── */
function StakInsightCard({ card }: { card: TrendCard }) {
	const c = COLOR_MAP.stak;

	/* NEW FORMAT (v3) — has `synthesis` field */
	if (card.synthesis) {
		return (
			<GlassCard type="stak">
				<Badge type="stak" label={card.label} />

				<p className="text-zinc-200 text-xs sm:text-[14px] leading-relaxed mb-3 sm:mb-5 flex-1">
					{card.synthesis}
				</p>

				{card.takeaway && (
					<div
						className="pb-3 sm:pb-4"
						style={{ borderBottom: `1px solid rgba(${c.rgb}, 0.15)` }}
					>
						<p className="text-zinc-200 text-xs sm:text-[14px] leading-relaxed">
							<span className="font-bold text-white">💡 The Subconscious Takeaway:&nbsp;</span>
							{card.takeaway}
						</p>
					</div>
				)}

				{card.impact && (
					<ImpactFooter impact={card.impact} badgeText={c.badgeText} rgb={c.rgb} />
				)}
			</GlassCard>
		);
	}

	/* V2 FORMAT — cached data with intro + forces fields */
	if (card.intro ?? card.forces) {
		// Replace "[N]" placeholders (e.g. "[3]") with "these"
		const cleanIntro = card.intro?.replace(/\[\d+\]/g, "these") ?? "";
		// Strip leading "• " that Gemini added inside each force string
		const cleanForces = (card.forces ?? []).map((f) => f.replace(/^[•·]\s*/, "").trim());

		return (
			<GlassCard type="stak">
				<Badge type="stak" label={card.label} />

				<div className="flex flex-col gap-3 mt-1 flex-1">
					{cleanIntro && (
						<p className="text-zinc-200 text-xs sm:text-[14px] leading-relaxed">
							{cleanIntro}
						</p>
					)}

					{cleanForces.length > 0 && (
						<ul className="space-y-1.5">
							{cleanForces.map((force, i) => (
								<li key={i} className="flex items-start gap-2">
									<span className="text-amber-400 font-bold mt-0.5 shrink-0">•</span>
									<span className="text-zinc-300 text-xs sm:text-[14px] leading-relaxed">{force}</span>
								</li>
							))}
						</ul>
					)}

					{card.stockReflects && (
						<p className="text-zinc-200 text-xs sm:text-[14px] leading-relaxed">
							{card.stockReflects}
						</p>
					)}

					{card.takeaway && (
						<div
							className="pt-3"
							style={{ borderTop: `1px solid rgba(${c.rgb}, 0.15)` }}
						>
							<p className="text-zinc-200 text-xs sm:text-[14px] leading-relaxed italic">
								<span className="not-italic font-bold text-white">💡 The Subconscious Takeaway:&nbsp;</span>
								{card.takeaway}
							</p>
						</div>
					)}
				</div>

				{(card.impact ?? card.pressure) && (
					<ImpactFooter
						impact={card.impact ?? card.pressure ?? ""}
						badgeText={c.badgeText}
						rgb={c.rgb}
					/>
				)}
			</GlassCard>
		);
	}

	/* LEGACY FORMAT — static fallback data */
	return (
		<GlassCard type="stak">
			<Badge type="stak" label={card.label} />

			<p className="text-zinc-200 text-xs sm:text-[15px] leading-relaxed mt-1 flex-1">
				{highlightTrendRefs(card.explanation ?? "")}
			</p>

			{card.takeaway && (
				<div className="mt-3 sm:mt-5">
					<p className="text-zinc-200 text-xs sm:text-[15px] leading-relaxed">
						<span className="font-bold text-white">💡 The Subconscious Takeaway:&nbsp;</span>
						{card.takeaway}
					</p>
				</div>
			)}
		</GlassCard>
	);
}

/* ── main carousel ── */
interface TrendCarouselProps {
	trends: TrendCard[];
	ticker: string;
}

export function TrendCarousel({ trends, ticker: _ticker }: TrendCarouselProps) {
	const total = trends.length;
	const [pos, setPos] = useState(1);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const trackRef = useRef<HTMLDivElement>(null);
	const startX = useRef(0);
	const currentX = useRef(0);
	const isDragging = useRef(false);

	const extendedCards = [trends[total - 1], ...trends, trends[0]];
	const realIndex = ((pos - 1) % total + total) % total;
	const activeTrend = trends[realIndex];

	const handleTransitionEnd = useCallback(() => {
		setIsTransitioning(false);
		if (pos === 0) setPos(total);
		else if (pos === total + 1) setPos(1);
	}, [pos, total]);

	const goNext = useCallback(() => { setIsTransitioning(true); setPos((p) => p + 1); }, []);
	const goPrev = useCallback(() => { setIsTransitioning(true); setPos((p) => p - 1); }, []);
	const goTo = useCallback((i: number) => { setIsTransitioning(true); setPos(i + 1); }, []);

	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		isDragging.current = true;
		startX.current = e.clientX;
		currentX.current = e.clientX;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}, []);

	const handlePointerMove = useCallback((e: React.PointerEvent) => {
		if (!isDragging.current) return;
		currentX.current = e.clientX;
	}, []);

	const handlePointerUp = useCallback(() => {
		if (!isDragging.current) return;
		isDragging.current = false;
		const diff = startX.current - currentX.current;
		if (diff > 50) goNext();
		else if (diff < -50) goPrev();
	}, [goNext, goPrev]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") goNext();
			if (e.key === "ArrowLeft") goPrev();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [goNext, goPrev]);

	if (!trends || trends.length === 0) {
		return (
			<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6">
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<p className="text-zinc-400 text-sm">No trend data available yet.</p>
				</div>
			</div>
		);
	}

	const colors = COLOR_MAP[activeTrend?.type || "macro"];
	const headerText = activeTrend?.dominance ?? activeTrend?.label ?? "";

	const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
	useEffect(() => {
		const mq = window.matchMedia("(max-width: 639px)");
		const handler = () => setIsMobile(mq.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	const CARD_WIDTH_PCT = isMobile ? 92 : 57;
	const GAP_PCT = 2;
	const STEP = CARD_WIDTH_PCT + GAP_PCT;
	const PEEK_OFFSET = (100 - CARD_WIDTH_PCT) / 2;

	return (
		<div className="space-y-4 mx-auto">
			{/* Header */}
			<h2
				className={`text-center text-base sm:text-2xl font-black tracking-[0.08em] uppercase ${colors.dominance}`}
				style={{ fontFamily: "'Orbitron', sans-serif" }}
			>
				{headerText}
			</h2>

			{/* Carousel */}
			<div className="relative">
				<div
					className="overflow-hidden touch-pan-y select-none py-4"
					ref={trackRef}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
				>
					<div
						className={`flex ${isTransitioning ? "transition-transform duration-400 ease-out" : ""}`}
						style={{ transform: `translateX(calc(-${pos * STEP}% + ${PEEK_OFFSET}%))` }}
						onTransitionEnd={handleTransitionEnd}
					>
						{extendedCards.map((card, i) => {
							const isActive = i === pos;
							return (
								<div
									key={`${card.type}-${i}`}
									className="shrink-0 transition-transform duration-400 ease-out origin-center"
									style={{
										width: `${CARD_WIDTH_PCT}%`,
										marginRight: `${GAP_PCT}%`,
										padding: "10px 4px",
										transform: isActive ? "scale(1)" : "scale(0.9)",
										opacity: isActive ? 1 : 0.7,
									}}
								>
									{card.type === "stak" ? (
										<StakInsightCard card={card} />
									) : (
										<StandardTrendCard card={card} />
									)}
								</div>
							);
						})}
					</div>
				</div>

				<button
					type="button"
					onClick={goPrev}
					className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
					aria-label="Previous trend"
				>
					<ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
				</button>
				<button
					type="button"
					onClick={goNext}
					className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
					aria-label="Next trend"
				>
					<ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
				</button>
			</div>

			{/* Dots */}
			<div className="flex justify-center gap-2.5 pt-1">
				{trends.map((card, i) => {
					const dotColor = COLOR_MAP[card.type];
					return (
						<button
							type="button"
							key={card.type}
							onClick={() => goTo(i)}
							className={`rounded-full transition-all duration-300 ${
								i === realIndex
									? `w-7 h-2.5 ${dotColor.dotActive}`
									: "w-2.5 h-2.5 bg-zinc-600 hover:bg-zinc-500"
							}`}
						/>
					);
				})}
			</div>
		</div>
	);
}

import React, { useState, useRef, useEffect, useCallback, useMemo, type MouseEvent, type TouchEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BrandProfile } from "@/data/brands";
import { StockCard } from "@/components/StockCard";
import { Clock, Sparkles, X, Bookmark, BookOpen, ChevronUp, Brain, CheckCircle2, XCircle, Eye, Layers } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { recordSwipe, getStockData, getPopularBrands } from "@/lib/api";
import { PICKS_RESET_HOUR } from "@/lib/constants";

/* ── Velocity / flick thresholds ── */
const FLICK_VELOCITY = 0.4;      // px/ms – a quick flick at this speed triggers swipe
const DISTANCE_THRESHOLD = 60;   // px – slower drags need this distance


function getTimeUntilReset(): { hours: number; minutes: number } {
	const now = new Date();
	const resetTime = new Date(now);
	if (now.getHours() >= PICKS_RESET_HOUR) resetTime.setDate(resetTime.getDate() + 1);
	resetTime.setHours(PICKS_RESET_HOUR, 0, 0, 0);
	const diff = resetTime.getTime() - now.getTime();
	return {
		hours: Math.floor(diff / (1000 * 60 * 60)),
		minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
	};
}

export interface StreakUpdate {
	streak: number;
	newBadges: { id: string; name: string; description: string }[];
	bonusSwipesAdded: number;
}

interface SwipeableCardStackProps {
	brands: BrandProfile[];
	onLearnMore: (brand: BrandProfile) => void;
	onSwipeRight?: (brand: BrandProfile) => void;
	onSwipeLeft?: (brand: BrandProfile) => void;
	onSwipe?: () => void;
	/** From useSwipeLimit — controls the daily limit screen */
	hasReachedLimit: boolean;
	/** From useSwipeLimit's bumpOptimistic — instant local bump, no network call.
	 *  The actual server confirmation comes from recordSwipe()'s own response (see
	 *  onSwipeRecorded) — calling a second increment endpoint here too would race two
	 *  transactions on the same Firestore doc. */
	onIncrement: () => void;
	/** From useSwipeLimit's reportSwipeResult — reconciles the optimistic count once
	 *  recordSwipe()'s response arrives (handles the rare rejection / multi-tab case). */
	onSwipeRecorded?: (accepted: boolean, count: number, limit: number) => void;
	/** Number of brands currently in the user's Stak — logged for ML training */
	stakSize?: number;
	/** Show skeleton loading state while deck is being prepared */
	loading?: boolean;
	/** Called with streak result after each swipe */
	onStreakUpdate?: (result: StreakUpdate) => void;
	/** Today's counts — persists across tab switches */
	initialSavedCount?: number;
	initialPassedCount?: number;
}


const ACTION_COLORS = {
	red:   "border-2 border-red-500 text-red-400 bg-surface-1 shadow-[0_0_22px_rgba(239,68,68,.22)]",
	cyan:  "border-2 border-green-500 text-green-400 bg-surface-1 shadow-[0_0_22px_rgba(34,197,94,.22)]",
	dark:  "border-2 border-blue-500/60 text-blue-400 bg-surface-1 shadow-[0_0_22px_rgba(59,130,246,.22)]",
	gray:  "border-2 border-zinc-600 dark:text-zinc-400 text-zinc-600 bg-surface-1",
	amber: "border-2 border-amber-400 text-amber-300 bg-surface-1 shadow-[0_0_22px_rgba(251,191,36,.22)]",
};

const GLOW_COLOR = {
	red:   "rgba(239,68,68,",
	cyan:  "rgba(34,197,94,",
	dark:  "rgba(59,130,246,",
	gray:  "rgba(113,113,122,",
	amber: "rgba(251,191,36,",
};

const DEEP_BG: Record<keyof typeof ACTION_COLORS, (h: number) => string | undefined> = {
	red:   (h) => h > 0 ? `rgba(239,68,68,${(h * 0.35).toFixed(2)})` : undefined,
	cyan:  (h) => h > 0 ? `rgba(34,197,94,${(0.04 + h * 0.30).toFixed(2)})` : undefined,
	dark:  ()  => undefined,
	gray:  ()  => undefined,
	amber: (h) => h > 0 ? `rgba(251,191,36,${(h * 0.25).toFixed(2)})` : undefined,
};

function ActionBtn({ icon, label, sub, color, onClick, highlight = 0, isDragging = false }: {
	icon: React.ReactNode;
	label: string;
	sub: string;
	color: keyof typeof ACTION_COLORS;
	onClick: () => void;
	highlight?: number;
	isDragging?: boolean;
}) {
	const btnScale = 1 + highlight * 0.45;
	const glowSize = Math.round(22 + highlight * 28);
	const glowOpacity = (0.22 + highlight * 0.6).toFixed(2);
	const boxShadow = highlight > 0
		? `0 0 ${glowSize}px ${GLOW_COLOR[color]}${glowOpacity})`
		: undefined;
	const backgroundColor = DEEP_BG[color](highlight);
	const transition = isDragging
		? "transform 0.06s linear, box-shadow 0.06s linear, background-color 0.06s linear"
		: "transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease, background-color 0.35s ease";

	return (
		<div
			className="flex flex-col items-center"
			style={{ transform: `scale(${btnScale})`, transition }}
		>
			<button
				type="button"
				onClick={onClick}
				aria-label={label}
				className={`grid h-[60px] w-[60px] place-items-center rounded-full active:scale-95 ${ACTION_COLORS[color]}`}
				style={{ boxShadow, backgroundColor, transition }}
			>
				{icon}
			</button>
			<p className="mt-[8px] text-[11px] font-semibold text-foreground">{label}</p>
			<p className="mt-[2px] text-[9px] leading-[11px] text-slate-500">{sub}</p>
		</div>
	);
}

export function SwipeableCardStack({
	brands,
	onLearnMore,
	onSwipeRight,
	onSwipeLeft,
	onSwipe,
	hasReachedLimit,
	onIncrement,
	onSwipeRecorded,
	stakSize,
	loading,
	onStreakUpdate,
	initialSavedCount = 0,
	initialPassedCount = 0,
}: SwipeableCardStackProps) {
	const navigate = useNavigate();
	const [currentIndex, setCurrentIndex] = useState(0);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilReset);
	const [scale, setScale] = useState(1);
	const [savedCount, setSavedCount] = useState(initialSavedCount);
	const [passedCount, setPassedCount] = useState(initialPassedCount);
	const [skipSet, setSkipSet] = useState<Set<string>>(new Set());

	// Deck with skipped cards shuffled to the end
	const deck = useMemo(() => {
		const active = brands.filter((b) => !skipSet.has(b.id));
		const skipped = brands.filter((b) => skipSet.has(b.id));
		return [...active, ...skipped];
	}, [brands, skipSet]);

	useEffect(() => {
		const update = () => {
			const wScale = Math.min(1, (window.innerWidth - 20) / 355);
			const hScale = Math.min(1, (window.innerHeight - 260) / 550);
			setScale(Math.max(0.75, Math.min(wScale, hScale)));
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);

	const dragStartPos = useRef({ x: 0, y: 0 });
	const dragStartTime = useRef(0);
	const velocityHistory = useRef<{ x: number; y: number; t: number }[]>([]);
	const dragAxis = useRef<"x" | "y" | null>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const isProcessingSwipe = useRef(false);
	const isDraggingRef = useRef(false);
	const cardShownAt = useRef(Date.now());
	const lastSwipeVelocity = useRef<number | undefined>(undefined);

	const topBrand  = deck[currentIndex];
	const nextBrand1 = deck[currentIndex + 1];
	const nextBrand2 = deck[currentIndex + 2];

	const { data: stockData } = useQuery({
		queryKey: ["stock-price", topBrand?.ticker],
		queryFn: () => getStockData(topBrand!.ticker),
		enabled: !!topBrand,
		staleTime: 2 * 60 * 1000,
		gcTime: 5 * 60 * 1000,
		retry: 0,
	});

	const { data: stockData1 } = useQuery({
		queryKey: ["stock-price", nextBrand1?.ticker],
		queryFn: () => getStockData(nextBrand1!.ticker),
		enabled: !!nextBrand1,
		staleTime: 2 * 60 * 1000,
		gcTime: 5 * 60 * 1000,
		retry: 0,
	});

	const { data: stockData2 } = useQuery({
		queryKey: ["stock-price", nextBrand2?.ticker],
		queryFn: () => getStockData(nextBrand2!.ticker),
		enabled: !!nextBrand2,
		staleTime: 2 * 60 * 1000,
		gcTime: 5 * 60 * 1000,
		retry: 0,
	});

	const { data: popularData } = useQuery({
		queryKey: ["popular-brands"],
		queryFn: getPopularBrands,
		staleTime: 4 * 60 * 60 * 1000,
		retry: 0,
	});
	const popularSet = useMemo(() => new Set(popularData?.brandIds ?? []), [popularData]);

	// Reset card timer whenever the top card changes
	useEffect(() => {
		cardShownAt.current = Date.now();
		lastSwipeVelocity.current = undefined;
	}, [currentIndex]);

	// Update countdown timer every minute
	useEffect(() => {
		const interval = setInterval(() => setTimeUntilReset(getTimeUntilReset()), 60000);
		return () => clearInterval(interval);
	}, []);


	// Preload images
	useEffect(() => {
		const preloadCount = Math.min(15, deck.length);
		for (let i = 0; i < preloadCount; i++) {
			const img = new Image();
			img.src = deck[i].heroImage;
		}
	}, [deck]);

	useEffect(() => {
		const preloadStart = Math.max(currentIndex + 3, 15);
		const preloadEnd = Math.min(preloadStart + 5, deck.length);
		for (let i = preloadStart; i < preloadEnd; i++) {
			const img = new Image();
			img.src = deck[i].heroImage;
		}
	}, [currentIndex, deck]);

	/* ── Execute a swipe (shared by drag-end & button taps) ── */
	const executeSwipe = useCallback((direction: "left" | "right") => {
		if (isProcessingSwipe.current) return;
		isProcessingSwipe.current = true;

		const currentBrand = deck[currentIndex];
		if (!currentBrand) { isProcessingSwipe.current = false; return; }

		isDraggingRef.current = false;
		setIsDragging(false);
		setIsExiting(true);

		const exitX = direction === "right" ? 1200 : -1200;
		setDragOffset({ x: exitX, y: 0 });

		if (direction === "right") setSavedCount((n) => n + 1);
		else setPassedCount((n) => n + 1);

		recordSwipe(currentBrand.id, direction, {
			ticker: currentBrand.ticker,
			categories: currentBrand.interestCategories,
			stakSize,
			timeOnCardMs: Date.now() - cardShownAt.current,
			swipeVelocity: lastSwipeVelocity.current,
		}).then((res) => {
			if (res.streakUpdate) onStreakUpdate?.(res.streakUpdate as StreakUpdate);
			onSwipeRecorded?.(res.success, res.dailySwipeCount, res.dailySwipeLimit);
		}).catch(() => {});
		onIncrement();
		onSwipe?.();

		setTimeout(() => {
			if (direction === "right" && onSwipeRight) {
				onSwipeRight(currentBrand);
			}
			if (direction === "left") {
				if (onSwipeLeft) {
					onSwipeLeft(currentBrand);
				} else {
					setCurrentIndex((prev) => Math.min(prev + 1, deck.length - 1));
				}
			}
			setDragOffset({ x: 0, y: 0 });
			setIsExiting(false);
			isProcessingSwipe.current = false;
		}, 280);
	}, [deck, currentIndex, onIncrement, onSwipe, onSwipeRight, onSwipeLeft]);

	/* ── Skip (shuffle current card to bottom, no recording) ── */
	const executeSkip = useCallback((direction: "up" | "down" = "up") => {
		if (isProcessingSwipe.current) return;
		isProcessingSwipe.current = true;
		const current = deck[currentIndex];
		if (!current) { isProcessingSwipe.current = false; return; }

		isDraggingRef.current = false;
		setIsDragging(false);
		setIsExiting(true);
		setDragOffset({ x: 0, y: direction === "up" ? -2200 : 4000 });

		setTimeout(() => {
			setSkipSet((prev) => new Set([...prev, current.id]));
			setDragOffset({ x: 0, y: 0 });
			setIsExiting(false);
			isProcessingSwipe.current = false;
		}, 280);
	}, [deck, currentIndex]);

	/* ── Drag handlers ── */
	const handleDragStart = (clientX: number, clientY: number) => {
		if (isProcessingSwipe.current) return;
		isDraggingRef.current = true;
		dragAxis.current = null;
		setIsDragging(true);
		dragStartPos.current = { x: clientX, y: clientY };
		dragStartTime.current = Date.now();
		velocityHistory.current = [{ x: clientX, y: clientY, t: Date.now() }];
	};

	const handleDragMove = (clientX: number, clientY: number) => {
		if (!isDraggingRef.current) return;
		const deltaX = clientX - dragStartPos.current.x;
		const deltaY = clientY - dragStartPos.current.y;

		// Lock to one axis once the drag exceeds 8px — prevents diagonal conflicts
		if (dragAxis.current === null && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
			dragAxis.current = Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y";
		}
		const lockedX = dragAxis.current === "y" ? 0 : deltaX;
		const lockedY = dragAxis.current === "x" ? 0 : deltaY;
		setDragOffset({ x: lockedX, y: lockedY });

		// Keep last 5 positions for velocity calc
		const now = Date.now();
		velocityHistory.current.push({ x: clientX, y: clientY, t: now });
		if (velocityHistory.current.length > 5) velocityHistory.current.shift();
	};

	const handleDragEnd = () => {
		if (!isDraggingRef.current || isProcessingSwipe.current) return;
		isDraggingRef.current = false;

		// Calculate X and Y velocity from recent history
		const history = velocityHistory.current;
		let velocity = 0;
		let velocityY = 0;
		if (history.length >= 2) {
			const first = history[0];
			const last = history[history.length - 1];
			const dt = last.t - first.t;
			if (dt > 0) {
				velocity  = (last.x - first.x) / dt;
				velocityY = (last.y - first.y) / dt;
			}
		}

		const absDistanceX = Math.abs(dragOffset.x);
		const absDistanceY = Math.abs(dragOffset.y);
		const absVelocity  = Math.abs(velocity);
		const absVelocityY = Math.abs(velocityY);

		// Upward swipe → skip (only when Y motion dominates)
		const isFlickUp = absVelocityY > FLICK_VELOCITY && dragOffset.y < -20 && velocityY < 0 && absDistanceY > absDistanceX;
		const isDragUp  = absDistanceY > DISTANCE_THRESHOLD && dragOffset.y < 0 && absDistanceY > absDistanceX * 1.2;

		if (isFlickUp || isDragUp) {
			executeSkip("up");
			return;
		}

		// Left / right swipe
		const isFlick = absVelocity > FLICK_VELOCITY && absDistanceX > 20;
		const isDrag  = absDistanceX > DISTANCE_THRESHOLD;

		if (isFlick || isDrag) {
			const direction = (velocity !== 0 ? velocity : dragOffset.x) > 0 ? "right" : "left";
			lastSwipeVelocity.current = Math.round(Math.abs(velocity) * 100) / 100;
			executeSwipe(direction);
		} else {
			setDragOffset({ x: 0, y: 0 });
			setIsDragging(false);
		}
	};

	const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		handleDragStart(e.clientX, e.clientY);
	};

	const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
		handleDragMove(e.clientX, e.clientY);
	};

	const handleMouseUp = () => {
		handleDragEnd();
	};

	const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		handleDragStart(touch.clientX, touch.clientY);
	};

	const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		handleDragMove(touch.clientX, touch.clientY);
	};

	const handleTouchEnd = () => {
		handleDragEnd();
	};


	// Show skeleton loading state while deck is being prepared
	if (loading) {
		return (
			<div className="flex flex-col items-center w-full max-w-md mx-auto">
				<div className="relative w-full rounded-2xl" style={{ height: 'min(calc(100dvh - 200px), 550px)' }}>
					{/* Stacked skeleton cards */}
					{[0, 1].map((i) => (
						<div
							key={i}
							className="absolute inset-0 rounded-2xl overflow-hidden border dark:border-slate-700/50 border-slate-200 bg-surface-1"
							style={{
								transform: `scale(${1 - i * 0.04}) translateY(${i * 12}px)`,
								zIndex: 2 - i,
								opacity: 1 - i * 0.3,
							}}
						>
							{/* Hero image skeleton */}
							<div className="w-full h-[55%] bg-slate-800/80 animate-pulse" />
							{/* Content skeleton */}
							<div className="p-4 space-y-3">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-slate-700/60 animate-pulse" />
									<div className="space-y-2 flex-1">
										<div className="h-4 w-32 bg-slate-700/60 rounded animate-pulse" />
										<div className="h-3 w-16 bg-slate-700/60 rounded animate-pulse" />
									</div>
								</div>
								<div className="h-3 w-full bg-slate-700/60 rounded animate-pulse" />
								<div className="h-3 w-3/4 bg-slate-700/60 rounded animate-pulse" />
							</div>
						</div>
					))}
				</div>
				{/* Action buttons skeleton */}
				<div className="flex items-center justify-center gap-6 mt-4">
					<div className="w-14 h-14 rounded-full bg-slate-800/60 animate-pulse" />
					<div className="w-14 h-14 rounded-full bg-slate-800/60 animate-pulse" />
				</div>
			</div>
		);
	}

	// Shared recap/limit screen
	if (hasReachedLimit || currentIndex >= deck.length) {
		const total = savedCount + passedCount;
		const isLimit = hasReachedLimit;
		return (
			<div className="flex flex-col items-center justify-center min-h-[350px] pb-16 px-[18px] w-full">
				{/* Header icon */}
				<div className="grid h-[64px] w-[64px] place-items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_32px_rgba(34,211,238,.18)] mb-[20px]">
					<Sparkles className="w-[30px] h-[30px]" />
				</div>

				<h2 className="text-[22px] font-bold text-foreground tracking-[-0.02em]">
					{isLimit ? "Daily limit reached" : "Deck complete"}
				</h2>
				<p className="mt-[6px] text-[13px] dark:text-slate-400 text-slate-500 text-center max-w-[260px]">
					{isLimit
						? `You've hit today's swipe limit. Fresh picks drop at ${PICKS_RESET_HOUR} AM.`
						: "You've seen every card in today's deck."}
				</p>

				{/* Stats row */}
				{total > 0 && (
					<div className="mt-[24px] flex gap-[10px] w-full max-w-[340px]">
						<div className="flex-1 rounded-[14px] border border-foreground/[0.07] bg-surface-1/80 py-[14px] flex flex-col items-center gap-[5px]">
							<Eye className="w-[16px] h-[16px] dark:text-slate-400 text-slate-500" />
							<p className="text-[22px] font-bold text-foreground leading-none">{total}</p>
							<p className="text-[10px] text-slate-500">Seen</p>
						</div>
						<div className="flex-1 rounded-[14px] border border-emerald-500/20 bg-emerald-500/[0.07] py-[14px] flex flex-col items-center gap-[5px]">
							<CheckCircle2 className="w-[16px] h-[16px] text-emerald-400" />
							<p className="text-[22px] font-bold text-emerald-400 leading-none">{savedCount}</p>
							<p className="text-[10px] text-slate-500">Saved</p>
						</div>
						<div className="flex-1 rounded-[14px] border border-red-500/20 bg-red-500/[0.07] py-[14px] flex flex-col items-center gap-[5px]">
							<XCircle className="w-[16px] h-[16px] text-red-400" />
							<p className="text-[22px] font-bold text-red-400 leading-none">{passedCount}</p>
							<p className="text-[10px] text-slate-500">Passed</p>
						</div>
					</div>
				)}

				{/* View Stak CTA */}
				<button
					type="button"
					onClick={() => navigate({ to: "/my-stak" })}
					className="mt-[20px] w-full max-w-[340px] py-[13px] rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 font-semibold text-foreground flex items-center justify-center gap-2 text-[14px] hover:opacity-90 active:scale-[0.98] transition-all"
				>
					<Layers className="w-[16px] h-[16px]" />
					View My Stak
				</button>

				{/* Reset timer */}
				<div className="mt-[14px] flex items-center gap-[6px] text-[11px] text-slate-500">
					<Clock className="w-[13px] h-[13px]" />
					<span>New drop in <span className="font-semibold dark:text-slate-300 text-slate-600">{timeUntilReset.hours}h {timeUntilReset.minutes}m</span></span>
				</div>
			</div>
		);
	}

	const translateX = dragOffset.x;
	// Upward drag: 55% — visible skip gesture; downward: 8% — barely follows (no accidental skip)
	const translateY = dragOffset.y < 0 ? dragOffset.y * 0.55 : dragOffset.y * 0.08;
	const rotation = dragOffset.x * 0.06;
	const tintOpacity = Math.min(Math.abs(dragOffset.x) / 120, 0.45);
	const swipeProgress = Math.min(Math.abs(dragOffset.x) / 100, 1);
	const passHighlight  = dragOffset.x < -5  ? swipeProgress : 0;
	const saveHighlight  = dragOffset.x > 5   ? swipeProgress : 0;
	const skipProgress   = dragOffset.y < -5  ? Math.min(Math.abs(dragOffset.y) / 100, 1) : 0;
	const skipHighlight  = skipProgress;

	// Derived dimensions — all scale proportionally from the base 355×550 design
	const cW  = Math.round(355 * scale);
	const cH  = Math.round(550 * scale);
	const cardW = Math.round(295 * scale);
	const cardH = Math.round(520 * scale);
	const c2Left = Math.round(70  * scale);
	const c2Top  = Math.round(20  * scale);
	const c2W    = Math.round(290 * scale);
	const c2H    = Math.round(505 * scale);
	const c3Left = Math.round(140 * scale);
	const c3Top  = Math.round(40  * scale);
	const c3W    = Math.round(280 * scale);
	const c3H    = Math.round(490 * scale);
	const stakLeft = Math.round(148 * scale);

	return (
		<div className="flex flex-col w-full max-w-md mx-auto">
			{/* Card section */}
			<div className="relative mx-auto" style={{ width: cW, height: cH }}>

				{/* Card 3 -- furthest back */}
				{deck[currentIndex + 2] && (
					<div
						className="absolute overflow-hidden rounded-[24px] border border-foreground/15 shadow-xl pointer-events-none"
						style={{
							left:      isExiting ? c2Left : c3Left,
							top:       isExiting ? c2Top  : c3Top,
							width:     isExiting ? c2W    : c3W,
							height:    isExiting ? c2H    : c3H,
							transform: isExiting ? 'rotate(4deg)' : 'rotate(6deg)',
							opacity: 1,
							zIndex: 10,
							transition: isExiting
								? 'left 0.28s cubic-bezier(0.22,1,0.36,1), top 0.28s cubic-bezier(0.22,1,0.36,1), width 0.28s cubic-bezier(0.22,1,0.36,1), height 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)'
								: 'none',
						}}
					>
						<StockCard brand={deck[currentIndex + 2]} quote={stockData2?.quote} isTopCard={false} scale={scale} />
					</div>
				)}

				{/* Card 2 -- middle */}
				{deck[currentIndex + 1] && (
					<div
						className="absolute overflow-hidden rounded-[24px] border border-foreground/20 shadow-xl pointer-events-none"
						style={{
							left:      isExiting ? 0      : c2Left,
							top:       isExiting ? 0      : c2Top,
							width:     isExiting ? cardW  : c2W,
							height:    isExiting ? cardH  : c2H,
							transform: isExiting ? 'rotate(0deg)' : 'rotate(4deg)',
							opacity: 1,
							zIndex: 15,
							transition: isExiting
								? 'left 0.28s cubic-bezier(0.22,1,0.36,1), top 0.28s cubic-bezier(0.22,1,0.36,1), width 0.28s cubic-bezier(0.22,1,0.36,1), height 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)'
								: 'none',
						}}
					>
						<StockCard brand={deck[currentIndex + 1]} quote={stockData1?.quote} isTopCard={false} scale={scale} />
					</div>
				)}

				{/* Main card (draggable) — transform and overflow-hidden must be on separate divs for iOS Safari */}
				<div
					key={deck[currentIndex]?.id ?? currentIndex}
					ref={cardRef}
					className="absolute cursor-grab active:cursor-grabbing select-none"
					style={{
						width: cardW,
						height: cardH,
						left: 0,
						top: 0,
						zIndex: 20,
						transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
						transition: !isDragging ? "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
						touchAction: "none",
						willChange: "transform",
					}}
					onMouseDown={handleMouseDown}
					onMouseMove={isDragging ? handleMouseMove : undefined}
					onMouseUp={isDragging ? handleMouseUp : undefined}
					onMouseLeave={isDragging ? handleMouseUp : undefined}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
				>
					<div className="relative w-full h-full overflow-hidden rounded-[24px]">
						{/* Swipe tint */}
						{Math.abs(dragOffset.x) > 15 && (
							<div
								className="absolute inset-0 pointer-events-none z-10"
								style={{
									backgroundColor: dragOffset.x > 0
										? `rgba(34, 197, 94, ${tintOpacity})`
										: `rgba(239, 68, 68, ${tintOpacity})`,
								}}
							/>
						)}
						<div style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', height: '100%' }}>
							{deck[currentIndex] && <StockCard brand={deck[currentIndex]} quote={stockData?.quote} isTopCard scale={scale} isPopular={popularSet.has(deck[currentIndex]?.id)} />}
						</div>
					</div>
				</div>

				{/* STAK / PASS label */}
				{Math.abs(dragOffset.x) > 30 && dragOffset.y > -30 && (
					<div
						className="absolute pointer-events-none z-50"
						style={{ left: stakLeft, top: '35%', transform: 'translate(-50%, -50%)', opacity: Math.min(Math.abs(dragOffset.x) / 80, 1) }}
					>
						<div className={`text-4xl font-black px-5 py-3 rounded-2xl border-4 shadow-2xl ${
							dragOffset.x > 0
								? "text-green-400 border-green-400 bg-green-400/20 rotate-12"
								: "text-red-500 border-red-500 bg-red-500/20 -rotate-12"
						}`}>
							{dragOffset.x > 0 ? "STAK" : "PASS"}
						</div>
					</div>
				)}

				{/* SKIP label — shown when dragging upward */}
				{dragOffset.y < -30 && (
					<div
						className="absolute pointer-events-none z-50"
						style={{ left: '50%', top: '40%', transform: 'translate(-50%, -50%)', opacity: Math.min(Math.abs(dragOffset.y) / 80, 1) }}
					>
						<div className="text-4xl font-black px-5 py-3 rounded-2xl border-4 shadow-2xl text-amber-400 border-amber-400 bg-amber-400/15">
							SKIP
						</div>
					</div>
				)}
			</div>

			{/* Every swipe insight row */}
			<section className="flex items-center justify-center gap-4 text-center text-[13px] leading-[18px] dark:text-slate-300 text-slate-600 mt-3 px-4">
				<div className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full border border-blue-400/35 bg-blue-500/10 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,.18)]">
					<Brain className="w-[26px] h-[26px]" />
				</div>
				<p>Every swipe <span className="text-cyan-400 font-semibold">teaches</span> STAK what kind<br />of investor you're becoming.</p>
			</section>

			{/* Action buttons */}
			<section className="mt-4 grid grid-cols-4 gap-3 px-6 text-center">
				<ActionBtn
					icon={<X className="w-[24px] h-[24px]" strokeWidth={2.5} />}
					label="Pass"
					sub="Not for me"
					color="red"
					onClick={() => executeSwipe("left")}
					highlight={passHighlight}
					isDragging={isDragging}
				/>
				<ActionBtn
					icon={<Bookmark className="w-[24px] h-[24px]" />}
					label="Save"
					sub="Add to watchlist"
					color="cyan"
					onClick={() => executeSwipe("right")}
					highlight={saveHighlight}
					isDragging={isDragging}
				/>
				<ActionBtn
					icon={<BookOpen className="w-[24px] h-[24px]" />}
					label="Learn More"
					sub="Tell me more"
					color="dark"
					onClick={() => topBrand && onLearnMore(topBrand)}
				/>
				<ActionBtn
					icon={<ChevronUp className="w-[24px] h-[24px]" />}
					label="Skip"
					sub="See it later"
					color="amber"
					onClick={() => executeSkip("up")}
					highlight={skipHighlight}
					isDragging={isDragging}
				/>
			</section>
		</div>
	);
}

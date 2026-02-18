import { useState, useRef, useEffect, useCallback, type MouseEvent, type TouchEvent } from "react";
import type { BrandProfile } from "@/data/brands";
import { StockCard } from "@/components/StockCard";
import { Clock, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { recordSwipe } from "@/lib/api";

const DAILY_LIMIT = 20;
const RESET_HOUR = 9; // 9 AM

/* ── Velocity / flick thresholds ── */
const FLICK_VELOCITY = 0.4;      // px/ms – a quick flick at this speed triggers swipe
const DISTANCE_THRESHOLD = 60;   // px – slower drags need this distance
const TAP_TOLERANCE = 8;         // px – below this is a tap, not a drag

interface DailySwipeState {
	count: number;
	date: string;
}

function getTodayKey(): string {
	const now = new Date();
	if (now.getHours() < RESET_HOUR) {
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		return yesterday.toISOString().split("T")[0];
	}
	return now.toISOString().split("T")[0];
}

function getTimeUntilReset(): { hours: number; minutes: number } {
	const now = new Date();
	const resetTime = new Date(now);

	if (now.getHours() >= RESET_HOUR) {
		resetTime.setDate(resetTime.getDate() + 1);
	}
	resetTime.setHours(RESET_HOUR, 0, 0, 0);

	const diff = resetTime.getTime() - now.getTime();
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	return { hours, minutes };
}

function getDailySwipeState(): DailySwipeState {
	const saved = localStorage.getItem("daily-swipe-state");
	if (saved) {
		const state: DailySwipeState = JSON.parse(saved);
		const todayKey = getTodayKey();
		if (state.date === todayKey) {
			return state;
		}
	}
	return { count: 0, date: getTodayKey() };
}

function saveDailySwipeState(state: DailySwipeState): void {
	localStorage.setItem("daily-swipe-state", JSON.stringify(state));
}

interface SwipeableCardStackProps {
	brands: BrandProfile[];
	onLearnMore: (brand: BrandProfile) => void;
	onSwipeRight?: (brand: BrandProfile) => void;
	onSwipeLeft?: (brand: BrandProfile) => void;
	onSwipe?: () => void;
}

export function SwipeableCardStack({
	brands,
	onLearnMore,
	onSwipeRight,
	onSwipeLeft,
	onSwipe,
}: SwipeableCardStackProps) {
	const [dailyState, setDailyState] = useState<DailySwipeState>(getDailySwipeState);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
	const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilReset);

	const dragStartPos = useRef({ x: 0, y: 0 });
	const dragStartTime = useRef(0);
	const velocityHistory = useRef<{ x: number; t: number }[]>([]);
	const cardRef = useRef<HTMLDivElement>(null);
	const isProcessingSwipe = useRef(false);

	// Update countdown timer every minute
	useEffect(() => {
		const interval = setInterval(() => {
			setTimeUntilReset(getTimeUntilReset());
			const newState = getDailySwipeState();
			if (newState.date !== dailyState.date) {
				setDailyState(newState);
			}
		}, 60000);
		return () => clearInterval(interval);
	}, [dailyState.date]);

	const remainingCards = DAILY_LIMIT - dailyState.count;
	const hasReachedLimit = dailyState.count >= DAILY_LIMIT;

	const visibleBrands = brands.slice(currentIndex, currentIndex + 2);

	// Preload images
	useEffect(() => {
		const preloadCount = Math.min(15, brands.length);
		for (let i = 0; i < preloadCount; i++) {
			const img = new Image();
			img.src = brands[i].heroImage;
		}
	}, [brands]);

	useEffect(() => {
		const preloadStart = Math.max(currentIndex + 3, 15);
		const preloadEnd = Math.min(preloadStart + 5, brands.length);
		for (let i = preloadStart; i < preloadEnd; i++) {
			const img = new Image();
			img.src = brands[i].heroImage;
		}
	}, [currentIndex, brands]);

	/* ── Execute a swipe (shared by drag-end & button taps) ── */
	const executeSwipe = useCallback((direction: "left" | "right") => {
		if (isProcessingSwipe.current) return;
		isProcessingSwipe.current = true;

		const currentBrand = brands[currentIndex];
		if (!currentBrand) { isProcessingSwipe.current = false; return; }

		setIsDragging(false);
		setIsExiting(true);
		setExitDirection(direction);

		const exitX = direction === "right" ? 1200 : -1200;
		setDragOffset({ x: exitX, y: 0 });

		recordSwipe(currentBrand.id, direction).catch(() => {});

		const newState = { count: dailyState.count + 1, date: dailyState.date };
		setDailyState(newState);
		saveDailySwipeState(newState);
		onSwipe?.();

		setTimeout(() => {
			if (direction === "right" && onSwipeRight) {
				onSwipeRight(currentBrand);
			}
			if (direction === "left") {
				if (onSwipeLeft) {
					onSwipeLeft(currentBrand);
				} else {
					setCurrentIndex((prev) => Math.min(prev + 1, brands.length - 1));
				}
			}
			setDragOffset({ x: 0, y: 0 });
			setIsExiting(false);
			setExitDirection(null);
			isProcessingSwipe.current = false;
		}, 280);
	}, [brands, currentIndex, dailyState, onSwipe, onSwipeRight, onSwipeLeft]);

	/* ── Drag handlers ── */
	const handleDragStart = (clientX: number, clientY: number) => {
		if (isProcessingSwipe.current) return;
		setIsDragging(true);
		dragStartPos.current = { x: clientX, y: clientY };
		dragStartTime.current = Date.now();
		velocityHistory.current = [{ x: clientX, t: Date.now() }];
	};

	const handleDragMove = (clientX: number, clientY: number) => {
		if (!isDragging) return;
		const deltaX = clientX - dragStartPos.current.x;
		const deltaY = clientY - dragStartPos.current.y;
		setDragOffset({ x: deltaX, y: deltaY });

		// Keep last 5 positions for velocity calc
		const now = Date.now();
		velocityHistory.current.push({ x: clientX, t: now });
		if (velocityHistory.current.length > 5) velocityHistory.current.shift();
	};

	const handleDragEnd = () => {
		if (!isDragging || isProcessingSwipe.current) return;

		// Calculate velocity from recent history
		const history = velocityHistory.current;
		let velocity = 0;
		if (history.length >= 2) {
			const first = history[0];
			const last = history[history.length - 1];
			const dt = last.t - first.t;
			if (dt > 0) velocity = (last.x - first.x) / dt; // px/ms
		}

		const absDistance = Math.abs(dragOffset.x);
		const absVelocity = Math.abs(velocity);

		// Trigger swipe on: quick flick OR sufficient distance
		const isFlick = absVelocity > FLICK_VELOCITY && absDistance > 20;
		const isDrag = absDistance > DISTANCE_THRESHOLD;

		if (isFlick || isDrag) {
			const direction = (velocity !== 0 ? velocity : dragOffset.x) > 0 ? "right" : "left";
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

	const handleCardClick = (brand: BrandProfile) => {
		if (!isDragging && Math.abs(dragOffset.x) < TAP_TOLERANCE) {
			onLearnMore(brand);
		}
	};

	// Show "all caught up" screen when daily limit is reached
	if (hasReachedLimit) {
		return (
			<div className="flex items-center justify-center min-h-[350px] sm:min-h-[600px] pb-20">
				<div className="text-center space-y-6 px-8">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 mb-4">
						<Sparkles className="w-10 h-10 text-cyan-400" />
					</div>
					<h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">
						You're all caught up!
					</h2>
					<p className="text-zinc-400 text-lg max-w-sm mx-auto">
						You've swiped through today's daily drop. Come back for fresh picks!
					</p>
					<div className="flex items-center justify-center gap-2 text-zinc-500">
						<Clock className="w-5 h-5" />
						<span>
							New drop in{" "}
							<span className="font-bold text-cyan-400">
								{timeUntilReset.hours}h {timeUntilReset.minutes}m
							</span>
						</span>
					</div>
					<p className="text-xs text-zinc-600">
						Daily drops refresh at 9 AM
					</p>
				</div>
			</div>
		);
	}

	if (currentIndex >= brands.length) {
		return (
			<div className="flex items-center justify-center min-h-[350px] sm:min-h-[600px] pb-20">
				<div className="text-center space-y-4">
					<p className="text-2xl font-bold text-zinc-300">
						You've seen all the vibes!
					</p>
					<p className="text-zinc-500">
						Refresh to explore the brands again
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center w-full max-w-md mx-auto">
			<div className="relative w-full h-[350px] sm:h-[550px] bg-white dark:bg-[#0b1121] rounded-2xl">
				{visibleBrands.map((brand, index) => {
					const isTopCard = index === 0;
					const scale = index === 0 ? 1 : 0.95;
					const yOffset = index * 8;
					const opacity = index === 0 ? 1 : 0.5;

					const rotation = isTopCard ? dragOffset.x * 0.06 : 0;
					const translateX = isTopCard ? dragOffset.x : 0;
					const translateY = isTopCard ? dragOffset.y * 0.15 : 0;

					const swipeIntensity = isTopCard ? Math.abs(dragOffset.x) / 120 : 0;
					const tintOpacity = Math.min(swipeIntensity, 0.45);

					return (
						<div
							key={brand.id}
							ref={isTopCard ? cardRef : null}
							className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
							style={{
								transform: `
									translateX(${translateX}px)
									translateY(${translateY + yOffset}px)
									scale(${scale})
									rotate(${rotation}deg)
								`,
								opacity,
								transition:
									isTopCard && !isDragging
										? "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease"
										: "transform 0s, opacity 0.28s ease",
								zIndex: visibleBrands.length - index,
								pointerEvents: isTopCard ? "auto" : "none",
								touchAction: "none",
								willChange: "transform",
							}}
							onMouseDown={isTopCard ? handleMouseDown : undefined}
							onMouseMove={isTopCard && isDragging ? handleMouseMove : undefined}
							onMouseUp={isTopCard && isDragging ? handleMouseUp : undefined}
							onMouseLeave={isTopCard && isDragging ? handleMouseUp : undefined}
							onTouchStart={isTopCard ? handleTouchStart : undefined}
							onTouchMove={isTopCard && isDragging ? handleTouchMove : undefined}
							onTouchEnd={isTopCard && isDragging ? handleTouchEnd : undefined}
						>
							{/* Swipe Direction Tint Overlay */}
							{isTopCard && Math.abs(dragOffset.x) > 15 && (
								<div
									className="absolute inset-0 rounded-2xl pointer-events-none z-10"
									style={{
										backgroundColor:
											dragOffset.x > 0
												? `rgba(34, 197, 94, ${tintOpacity})`
												: `rgba(239, 68, 68, ${tintOpacity})`,
									}}
								/>
							)}
							<div onClick={() => isTopCard && handleCardClick(brand)}>
								<StockCard brand={brand} onLearnMore={() => {}} priority={isTopCard} isTopCard={isTopCard} />
							</div>
						</div>
					);
				})}

				{/* Swipe label feedback */}
				{Math.abs(dragOffset.x) > 30 && (
					<div
						className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
						style={{
							opacity: Math.min(Math.abs(dragOffset.x) / 80, 1),
						}}
					>
						<div
							className={`text-5xl sm:text-7xl font-black px-8 py-5 rounded-3xl border-[6px] ${
								dragOffset.x > 0
									? "text-green-400 border-green-400 bg-green-400/20 rotate-12"
									: "text-red-500 border-red-500 bg-red-500/20 -rotate-12"
							} shadow-2xl backdrop-blur-sm`}
						>
							{dragOffset.x > 0 ? "STAKED" : "PASS"}
						</div>
					</div>
				)}
			</div>

			{/* Action buttons */}
			<div className="flex items-center justify-center gap-8 mt-5">
				<button
					type="button"
					onClick={() => executeSwipe("left")}
					disabled={isProcessingSwipe.current || hasReachedLimit}
					className="group flex items-center justify-center w-16 h-16 rounded-full border-2 border-red-500/50 bg-red-500/10 hover:bg-red-500/25 hover:border-red-500 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
					aria-label="Pass"
				>
					<ThumbsDown className="w-7 h-7 text-red-400 group-hover:text-red-300 transition-colors" />
				</button>
				<button
					type="button"
					onClick={() => executeSwipe("right")}
					disabled={isProcessingSwipe.current || hasReachedLimit}
					className="group flex items-center justify-center w-16 h-16 rounded-full border-2 border-green-500/50 bg-green-500/10 hover:bg-green-500/25 hover:border-green-500 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
					aria-label="Stak it"
				>
					<ThumbsUp className="w-7 h-7 text-green-400 group-hover:text-green-300 transition-colors" />
				</button>
			</div>

			{/* Daily cards remaining counter */}
			<div className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-500">
				<span className="font-bold text-cyan-400">{remainingCards}</span>
				<span>cards left today</span>
			</div>
		</div>
	);
}

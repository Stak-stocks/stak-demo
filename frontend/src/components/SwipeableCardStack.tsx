import { useState, useRef, useEffect, type MouseEvent, type TouchEvent } from "react";
import type { BrandProfile } from "@/data/brands";
import { StockCard } from "@/components/StockCard";
import { Clock, Sparkles } from "lucide-react";
import { recordSwipe } from "@/lib/api";

const DAILY_LIMIT = 20;
const RESET_HOUR = 9; // 9 AM

interface DailySwipeState {
	count: number;
	date: string;
}

function getTodayKey(): string {
	const now = new Date();
	// If before 9 AM, use yesterday's date
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
		// Reset is tomorrow at 9 AM
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
	onSwipe?: () => void;
}

export function SwipeableCardStack({
	brands,
	onLearnMore,
	onSwipeRight,
	onSwipe,
}: SwipeableCardStackProps) {
	const [dailyState, setDailyState] = useState<DailySwipeState>(getDailySwipeState);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilReset);
	const dragStartPos = useRef({ x: 0, y: 0 });
	const cardRef = useRef<HTMLDivElement>(null);
	const isProcessingSwipe = useRef(false);

	// Update countdown timer every minute
	useEffect(() => {
		const interval = setInterval(() => {
			setTimeUntilReset(getTimeUntilReset());
			// Check if we should reset the daily state
			const newState = getDailySwipeState();
			if (newState.date !== dailyState.date) {
				setDailyState(newState);
			}
		}, 60000);
		return () => clearInterval(interval);
	}, [dailyState.date]);

	const remainingCards = DAILY_LIMIT - dailyState.count;
	const hasReachedLimit = dailyState.count >= DAILY_LIMIT;

	// Show current card + 2 stacked behind (but only current is readable)
	const visibleBrands = brands.slice(currentIndex, currentIndex + 3);

	// Preload all images on mount for instant transitions
	useEffect(() => {
		// Preload first 15 images immediately
		const preloadCount = Math.min(15, brands.length);
		for (let i = 0; i < preloadCount; i++) {
			const img = new Image();
			img.src = brands[i].heroImage;
		}
	}, [brands]);

	// Continue preloading as user swipes
	useEffect(() => {
		const preloadStart = Math.max(currentIndex + 3, 15);
		const preloadEnd = Math.min(preloadStart + 5, brands.length);

		for (let i = preloadStart; i < preloadEnd; i++) {
			const img = new Image();
			img.src = brands[i].heroImage;
		}
	}, [currentIndex, brands]);

	const handleDragStart = (clientX: number, clientY: number) => {
		setIsDragging(true);
		dragStartPos.current = { x: clientX, y: clientY };
	};

	const handleDragMove = (clientX: number, clientY: number) => {
		if (!isDragging) return;

		const deltaX = clientX - dragStartPos.current.x;
		const deltaY = clientY - dragStartPos.current.y;

		setDragOffset({ x: deltaX, y: deltaY });
	};

	const handleDragEnd = () => {
		if (!isDragging || isProcessingSwipe.current) return;

		const swipeThreshold = 100;
		const shouldSwipe = Math.abs(dragOffset.x) > swipeThreshold;

		if (shouldSwipe) {
			// Use ref to immediately block duplicate triggers (synchronous)
			isProcessingSwipe.current = true;
			setIsDragging(false);
			setIsExiting(true);
			const exitDirection = dragOffset.x > 0 ? 1000 : -1000;
			const isRightSwipe = dragOffset.x > 0;
			const currentBrand = brands[currentIndex];

			setDragOffset({ x: exitDirection, y: dragOffset.y });

			if (currentBrand) {
				if (isRightSwipe && onSwipeRight) {
					onSwipeRight(currentBrand);
				}
				recordSwipe(currentBrand.id, isRightSwipe ? "right" : "left").catch(() => {});
			}

			// Track the swipe in daily state
			const newState = {
				count: dailyState.count + 1,
				date: dailyState.date,
			};
			setDailyState(newState);
			saveDailySwipeState(newState);
			onSwipe?.();

			setTimeout(() => {
				setCurrentIndex((prev) => Math.min(prev + 1, brands.length - 1));
				setDragOffset({ x: 0, y: 0 });
				setIsExiting(false);
				isProcessingSwipe.current = false;
			}, 300);
		} else {
			setDragOffset({ x: 0, y: 0 });
			setIsDragging(false);
		}
	};

	const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
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
		if (!isDragging && Math.abs(dragOffset.x) < 5) {
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
		<div className="relative flex items-center justify-center w-full max-w-md mx-auto pb-20">
			<div className="relative w-full h-[350px] sm:h-[550px] bg-white dark:bg-[#0b1121] rounded-2xl">
				{visibleBrands.map((brand, index) => {
					const isTopCard = index === 0;
					// Make stacked cards much smaller and less visible
					const scale = index === 0 ? 1 : 0.92 - index * 0.04;
					const yOffset = index * 12;
					// Stacked cards visible behind with glow border showing
					const opacity = index === 0 ? 1 : 0.4;

					const rotation = isTopCard ? dragOffset.x * 0.03 : 0;
					const translateX = isTopCard ? dragOffset.x : 0;
					const translateY = isTopCard ? dragOffset.y * 0.3 : 0;

					// Add tint overlay for swipe direction
					const swipeIntensity = isTopCard ? Math.abs(dragOffset.x) / 150 : 0;
					const tintOpacity = Math.min(swipeIntensity, 0.4);

					return (
						<div
							key={brand.id}
							ref={isTopCard ? cardRef : null}
							className="absolute inset-0 cursor-grab active:cursor-grabbing"
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
										? "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease"
										: "transform 0s, opacity 0.3s ease",
								zIndex: visibleBrands.length - index,
								pointerEvents: isTopCard ? "auto" : "none",
								touchAction: "none",
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
							{isTopCard && isDragging && Math.abs(dragOffset.x) > 20 && (
								<div
									className="absolute inset-0 rounded-2xl pointer-events-none z-10"
									style={{
										backgroundColor:
											dragOffset.x > 0
												? `rgba(34, 197, 94, ${tintOpacity})`
												: `rgba(239, 68, 68, ${tintOpacity})`,
										transition: "background-color 0.1s ease",
									}}
								/>
							)}
							<div onClick={() => isTopCard && handleCardClick(brand)}>
								<StockCard brand={brand} onLearnMore={() => {}} priority={isTopCard} isTopCard={isTopCard} />
							</div>
						</div>
					);
				})}
			</div>

			{isDragging && Math.abs(dragOffset.x) > 50 && (
				<div
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
					style={{
						opacity: Math.min(Math.abs(dragOffset.x) / 120, 1),
					}}
				>
					<div
						className={`text-7xl font-black px-10 py-6 rounded-3xl border-8 ${
							dragOffset.x > 0
								? "text-green-400 dark:text-green-400 border-green-400 dark:border-green-400 bg-green-400/20 dark:bg-green-400/20 rotate-12"
								: "text-red-500 dark:text-red-500 border-red-500 dark:border-red-500 bg-red-500/20 dark:bg-red-500/20 -rotate-12"
						} shadow-2xl`}
					>
						{dragOffset.x > 0 ? "STAKED" : "PASS"}
					</div>
				</div>
			)}

			{/* Daily cards remaining counter */}
			<div className="absolute -bottom-12 sm:-bottom-8 left-1/2 -translate-x-1/2">
				<div className="flex items-center gap-2 text-sm text-zinc-500">
					<span className="font-bold text-cyan-400">{remainingCards}</span>
					<span>cards left today</span>
				</div>
			</div>
		</div>
	);
}

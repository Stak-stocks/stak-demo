import { useState, useRef, type MouseEvent, type TouchEvent } from "react";
import type { BrandProfile } from "@/data/brands";
import { StockCard } from "@/components/StockCard";

interface SwipeableCardStackProps {
	brands: BrandProfile[];
	onLearnMore: (brand: BrandProfile) => void;
	onSwipeRight?: (brand: BrandProfile) => void;
}

export function SwipeableCardStack({
	brands,
	onLearnMore,
	onSwipeRight,
}: SwipeableCardStackProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const dragStartPos = useRef({ x: 0, y: 0 });
	const cardRef = useRef<HTMLDivElement>(null);

	// Show current card + 2 stacked behind (but only current is readable)
	const visibleBrands = brands.slice(currentIndex, currentIndex + 3);

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
		if (!isDragging) return;

		const swipeThreshold = 100;
		const shouldSwipe = Math.abs(dragOffset.x) > swipeThreshold;

		if (shouldSwipe) {
			setIsExiting(true);
			const exitDirection = dragOffset.x > 0 ? 1000 : -1000;
			const isRightSwipe = dragOffset.x > 0;
			const currentBrand = brands[currentIndex];

			setDragOffset({ x: exitDirection, y: dragOffset.y });

			if (isRightSwipe && currentBrand && onSwipeRight) {
				onSwipeRight(currentBrand);
			}

			setTimeout(() => {
				setCurrentIndex((prev) => Math.min(prev + 1, brands.length - 1));
				setDragOffset({ x: 0, y: 0 });
				setIsExiting(false);
				setIsDragging(false);
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

	if (currentIndex >= brands.length) {
		return (
			<div className="flex items-center justify-center min-h-[600px]">
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
		<div className="relative flex items-center justify-center min-h-[600px] w-full max-w-md mx-auto">
			<div className="relative w-full h-[550px]">
				{visibleBrands.map((brand, index) => {
					const isTopCard = index === 0;
					// Make stacked cards much smaller and less visible
					const scale = index === 0 ? 1 : 0.92 - index * 0.04;
					const yOffset = index * 12;
					// Heavily reduce opacity for stacked cards so only top card is readable
					const opacity = index === 0 ? 1 : 0.15;

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
								<StockCard brand={brand} onLearnMore={() => {}} />
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
		</div>
	);
}

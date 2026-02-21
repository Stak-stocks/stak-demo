import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
	/** The scrollable container element ref */
	scrollRef: React.RefObject<HTMLElement | null>;
	children: ReactNode;
}

const THRESHOLD = 70; // px to pull before triggering refresh
const MAX_PULL = 110; // max pull distance

export function PullToRefresh({ scrollRef, children }: PullToRefreshProps) {
	const [pullDistance, setPullDistance] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const touchStartY = useRef(0);
	const isPulling = useRef(false);

	const handleTouchStart = useCallback(
		(e: TouchEvent) => {
			const el = scrollRef.current;
			if (!el || refreshing) return;
			// Only allow pull when scrolled to top
			if (el.scrollTop <= 0) {
				touchStartY.current = e.touches[0].clientY;
				isPulling.current = true;
			}
		},
		[scrollRef, refreshing],
	);

	const handleTouchMove = useCallback(
		(e: TouchEvent) => {
			if (!isPulling.current || refreshing) return;
			const el = scrollRef.current;
			if (!el) return;

			const dy = e.touches[0].clientY - touchStartY.current;

			// Only engage if pulling down and at the top
			if (dy > 0 && el.scrollTop <= 0) {
				// Dampened pull (feels natural)
				const distance = Math.min(dy * 0.45, MAX_PULL);
				setPullDistance(distance);
				// Prevent the scroll container from scrolling while pulling
				if (distance > 5) {
					e.preventDefault();
				}
			} else {
				// User scrolled up or container not at top — cancel pull
				isPulling.current = false;
				setPullDistance(0);
			}
		},
		[scrollRef, refreshing],
	);

	const handleTouchEnd = useCallback(() => {
		if (!isPulling.current) return;
		isPulling.current = false;

		if (pullDistance >= THRESHOLD && !refreshing) {
			setRefreshing(true);
			setPullDistance(THRESHOLD); // hold at threshold during refresh
			// Reload the page
			setTimeout(() => {
				window.location.reload();
			}, 400);
		} else {
			setPullDistance(0);
		}
	}, [pullDistance, refreshing]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		el.addEventListener("touchstart", handleTouchStart, { passive: true });
		el.addEventListener("touchmove", handleTouchMove, { passive: false });
		el.addEventListener("touchend", handleTouchEnd, { passive: true });
		el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

		return () => {
			el.removeEventListener("touchstart", handleTouchStart);
			el.removeEventListener("touchmove", handleTouchMove);
			el.removeEventListener("touchend", handleTouchEnd);
			el.removeEventListener("touchcancel", handleTouchEnd);
		};
	}, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

	const progress = Math.min(pullDistance / THRESHOLD, 1);
	const showIndicator = pullDistance > 5;

	return (
		<>
			{/* Pull indicator */}
			{showIndicator && (
				<div
					className="flex items-center justify-center pointer-events-none"
					style={{
						height: pullDistance,
						transition: isPulling.current ? "none" : "height 0.3s ease-out",
					}}
				>
					<div
						className={`w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 shadow-md ${
							refreshing ? "animate-spin" : ""
						}`}
						style={{
							opacity: progress,
							transform: `scale(${0.5 + progress * 0.5}) rotate(${pullDistance * 3}deg)`,
							transition: isPulling.current ? "none" : "all 0.3s ease-out",
						}}
					>
						<RefreshCw
							className={`w-5 h-5 ${
								progress >= 1
									? "text-cyan-500 dark:text-cyan-400"
									: "text-zinc-400 dark:text-zinc-500"
							}`}
						/>
					</div>
				</div>
			)}
			{children}
		</>
	);
}

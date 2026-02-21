import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNav } from "@/components/BottomNav";
import { Toaster, toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchView } from "@/components/SearchView";
import { PullToRefresh } from "@/components/PullToRefresh";
import type { BrandProfile } from "@/data/brands";
import { saveStak } from "@/lib/api";

export const Route = createRootRoute({
	component: Root,
});

function PageTransition({ children }: { pathname: string; children: React.ReactNode }) {
	return <>{children}</>;
}

function Root() {
	const { user, loading, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const isAuthPage = ["/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/onboarding"].includes(location.pathname);
	const [searchOpen, setSearchOpen] = useState(false);
	const isFeedPage = location.pathname === "/feed";
	const scrollRef = useRef<HTMLDivElement>(null);

	const handleAddToStak = useCallback((brand: BrandProfile) => {
		const saved = localStorage.getItem("my-stak");
		const stak: BrandProfile[] = saved ? JSON.parse(saved) : [];
		if (stak.some((b) => b.id === brand.id)) {
			toast.info("Already in your Stak", { description: brand.name, duration: 2000 });
			return;
		}
		if (stak.length >= 15) {
			toast.error("Your Stak is full!", { description: "Remove a stock first (max 15)", duration: 2000 });
			return;
		}
		const swipeStateRaw = localStorage.getItem("daily-swipe-state");
		const todayKey = (() => {
			const now = new Date();
			if (now.getHours() < 9) {
				const yesterday = new Date(now);
				yesterday.setDate(yesterday.getDate() - 1);
				return yesterday.toISOString().split("T")[0];
			}
			return now.toISOString().split("T")[0];
		})();
		const swipeState = swipeStateRaw
			? (() => { const s = JSON.parse(swipeStateRaw); return s.date === todayKey ? s : { count: 0, date: todayKey }; })()
			: { count: 0, date: todayKey };
		if (swipeState.count >= 20) {
			toast.error("Daily limit reached", { description: "Come back tomorrow for more picks!", duration: 3000 });
			return;
		}
		localStorage.setItem("daily-swipe-state", JSON.stringify({ count: swipeState.count + 1, date: todayKey }));
		const updated = [...stak, brand];
		localStorage.setItem("my-stak", JSON.stringify(updated));
		saveStak(updated.map((b) => b.id)).catch(() => {});
		window.dispatchEvent(new CustomEvent('stak-updated'));
		toast.success("Added to your Stak", { description: brand.name, duration: 2000 });
	}, []);

	useEffect(() => {
		if (!loading && !user && !isAuthPage) {
			navigate({ to: "/welcome" });
		}
		if (!loading && user && !isAuthPage && localStorage.getItem("onboardingCompleted") === "false") {
			navigate({ to: "/onboarding" });
		}
	}, [user, loading, isAuthPage, navigate]);

	// Prevent browser from restoring scroll positions
	useEffect(() => {
		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual';
		}
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="fixed inset-0 flex flex-col bg-background">

			{/* Search & theme toggle */}
			{!isAuthPage && user && (
				<div className="flex-none z-40 flex items-center justify-between px-4 py-3 bg-background border-0 border-none shadow-none outline-none" style={{ border: 'none' }}>
					{!isFeedPage ? (
						<button
							type="button"
							onClick={() => setSearchOpen(true)}
							className="p-2 rounded-full text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
							aria-label="Search stocks"
						>
							<Search className="w-5 h-5" />
						</button>
					) : (
						<div className="w-9" />
					)}
					<ThemeToggle />
				</div>
			)}

			<div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-y-contain pb-[calc(4rem+env(safe-area-inset-bottom))]">
				<PullToRefresh scrollRef={scrollRef}>
					<ErrorBoundary tagName="main" className="min-h-full">
						<PageTransition pathname={location.pathname}>
							<Outlet />
						</PageTransition>
					</ErrorBoundary>
				</PullToRefresh>
			</div>
			{!isAuthPage && <BottomNav />}
			<Toaster position="top-center" />
			<TanStackRouterDevtools position="bottom-right" />

		<SearchView
			open={searchOpen}
			onClose={() => setSearchOpen(false)}
			onSwipeRight={handleAddToStak}
		/>

		</div>
	);
}

import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { logEvent } from "@/lib/firebase";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNav } from "@/components/BottomNav";
import { Toaster, toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { SearchView } from "@/components/SearchView";
import { PullToRefresh } from "@/components/PullToRefresh";
import type { BrandProfile } from "@/data/brands";
import { getTodayKey } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getMarketEarnings } from "@/lib/api";
import { useStakTickers } from "@/hooks/useStakTickers";

export const Route = createRootRoute({
	component: Root,
});

function PageTransition({ children }: { pathname: string; children: React.ReactNode }) {
	return <>{children}</>;
}

// Date key for daily swipe reset at 9 AM

const DAILY_SWIPE_LIMIT = 20;
const STAK_CAPACITY = 30;

function Root() {
	const { user, loading } = useAuth();
	const { account, accountLoading, updateStak, incrementSwipeCount } = useAccount();
	const { resolvedTheme } = useTheme();
	const location = useLocation();
	const navigate = useNavigate();
	const isAuthPage = ["/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/verify-email"].includes(location.pathname);
	const isSubPage = location.pathname.startsWith("/profile/") || location.pathname.startsWith("/brand/");
	const [searchOpen, setSearchOpen] = useState(false);
	const isFeedPage = location.pathname === "/feed";
	const scrollRef = useRef<HTMLDivElement>(null);

	// Reset scroll to top and clear any body overflow lock on every route change
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: 0 });
		document.body.style.overflow = "";
	}, [location.pathname]);

	// Prefetch earnings calendar as soon as account loads so modal opens instantly
	const queryClient = useQueryClient();
	const stakTickers = useStakTickers();
	useEffect(() => {
		if (!user || stakTickers.length === 0) return;
		for (const tab of ["today", "tomorrow", "week"] as const) {
			queryClient.prefetchQuery({
				queryKey: ["market-earnings", tab, stakTickers],
				queryFn: () => getMarketEarnings(tab, stakTickers),
				staleTime: 10 * 60 * 1000,
			});
		}
	}, [queryClient, stakTickers, user]);

	const handleAddToStak = useCallback((brand: BrandProfile) => {
		const stakIds = account?.stakBrandIds ?? [];
		if (stakIds.includes(brand.id)) {
			toast.info("Already in your Stak", { description: brand.name, duration: 2000 });
			return;
		}
		if (stakIds.length >= STAK_CAPACITY) {
			toast.error("Your Stak is full!", { description: "Remove a stock first (max 30)", duration: 2000 });
			return;
		}
		const today = getTodayKey();
		const swipeState = account?.dailySwipeState;
		const swipeCount = swipeState?.date === today ? (swipeState.count ?? 0) : 0;
		if (swipeCount >= DAILY_SWIPE_LIMIT) {
			toast.error("Daily limit reached", { description: "Come back tomorrow for more picks!", duration: 3000 });
			return;
		}
		updateStak([...stakIds, brand.id]).catch(() => {});
		incrementSwipeCount().catch(() => {});
		logEvent("add_to_stak", { brand_id: brand.id, brand_name: brand.name });
		toast.success("Added to your Stak", { description: brand.name, duration: 2000 });
	}, [account, updateStak, incrementSwipeCount]);

	useEffect(() => {
		if (!loading && !accountLoading && !user && !isAuthPage) {
			navigate({ to: "/welcome" });
		}
		if (!loading && !accountLoading && user && !isAuthPage && account?.onboardingCompleted !== true) {
			navigate({ to: "/onboarding" });
		}
	}, [user, loading, accountLoading, account, isAuthPage, navigate]);

	// Prevent browser from restoring scroll positions
	useEffect(() => {
		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual';
		}
	}, []);

	// Close search overlay on route change or auth redirect
	useEffect(() => {
		if (searchOpen) {
			setSearchOpen(false);
		}
	}, [location.pathname, isAuthPage, user]);

	// Listen for custom event to open search from child pages
	useEffect(() => {
		const handler = () => setSearchOpen(true);
		window.addEventListener("open-search", handler);
		return () => window.removeEventListener("open-search", handler);
	}, []);

	if (loading || accountLoading) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	// Block render while a redirect is imminent — prevents one-frame flash of wrong page
	if (!user && !isAuthPage) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}
	if (user && !isAuthPage && account?.onboardingCompleted !== true) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="fixed inset-0 flex flex-col bg-background">

			<div ref={scrollRef} className={`flex-1 overflow-y-auto overscroll-y-contain ${isAuthPage ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))]"}`}>
				<PullToRefresh scrollRef={scrollRef}>
					<ErrorBoundary tagName="main" className="min-h-full">
						<PageTransition pathname={location.pathname}>
							<Outlet />
						</PageTransition>
					</ErrorBoundary>
				</PullToRefresh>
			</div>
			{!isAuthPage && <BottomNav onSearchClose={() => setSearchOpen(false)} searchActive={searchOpen} />}
			<Toaster
				position="top-center"
				theme={resolvedTheme}
				richColors
				toastOptions={{
					style: resolvedTheme === "dark"
						? { background: "#1a2744", border: "1px solid rgba(99,102,241,0.35)", color: "#f1f5f9", fontWeight: 600 }
						: { background: "#ffffff", border: "1px solid rgba(99,102,241,0.2)", color: "#0f172a", fontWeight: 600 },
				}}
			/>
			<TanStackRouterDevtools position="bottom-right" />

		<SearchView
			open={searchOpen}
			onClose={() => setSearchOpen(false)}
			onSwipeRight={handleAddToStak}
		/>

		</div>
	);
}

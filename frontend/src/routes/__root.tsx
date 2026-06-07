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
import { DailyBriefModal } from "@/components/DailyBriefModal";
import type { BrandProfile } from "@/data/brands";
import { getTodayKey } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getMarketEarnings } from "@/lib/api";
import { useStakTickers } from "@/hooks/useStakTickers";
import { DAILY_SWIPE_LIMIT } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY } from "@/lib/constants";

export const Route = createRootRoute({
	component: Root,
});

function PageTransition({ children }: { pathname: string; children: React.ReactNode }) {
	return <>{children}</>;
}

function Root() {
	const { user, loading } = useAuth();
	const { account, accountLoading, saveToStak, incrementSwipeCount, updateLastBriefDate } = useAccount();
	const { resolvedTheme, setTheme, reapplyTheme } = useTheme();
	const location = useLocation();
	const navigate = useNavigate();
	const isAuthPage = ["/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/verify-email"].includes(location.pathname);
	const isSubPage = location.pathname.startsWith("/profile/") || location.pathname.startsWith("/brand/");
	const [searchOpen, setSearchOpen] = useState(false);
	const [briefOpen, setBriefOpen] = useState(false);
	const [briefSource, setBriefSource] = useState<"auto" | "mystak">("auto");
	const isFeedPage = location.pathname === "/feed";
	const scrollRef = useRef<HTMLDivElement>(null);
	const themeAppliedForUid = useRef<string | null>(null);

	// Apply theme from Firestore once per login — light by default, dark if user explicitly set it
	useEffect(() => {
		if (!account?.uid || themeAppliedForUid.current === account.uid) return;
		themeAppliedForUid.current = account.uid;
		setTheme(account.preferences?.theme ?? "light");
	}, [account?.uid, account?.preferences?.theme, setTheme]);

	// Auth/landing pages are always dark regardless of user theme preference
	useEffect(() => {
		if (isAuthPage) {
			document.documentElement.classList.add("dark");
		} else {
			// Restore user's actual theme by triggering ThemeProvider re-apply
			reapplyTheme();
		}
	}, [isAuthPage, reapplyTheme]);

	// Reset scroll to top and clear any body overflow lock on every route change
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
		if (!briefOpen) document.body.style.overflow = "";
		logEvent("page_view", { page_path: location.pathname });
	}, [location.pathname, briefOpen]);

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
		const cachedStock = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", brand.ticker])
			?? queryClient.getQueryData<{ quote: { price: number } | null }>(["stock-price", brand.ticker]);
		const priceAtSave = cachedStock?.quote?.price ?? null;
		saveToStak(brand.id, priceAtSave).catch(() => {});
		incrementSwipeCount().catch(() => {});
		// Invalidate daily brief so personalization reflects the new Stak brand
		queryClient.invalidateQueries({ queryKey: ["daily-brief"] });
		logEvent("add_to_stak", { brand_id: brand.id, brand_name: brand.name });
		
	}, [account, saveToStak, incrementSwipeCount, queryClient]);

	useEffect(() => {
		if (!loading && !accountLoading && !user && !isAuthPage) {
			navigate({ to: "/welcome" });
		}
		if (!loading && !accountLoading && user && !isAuthPage && account?.onboardingCompleted !== true) {
			navigate({ to: "/onboarding" });
		}
	}, [user, loading, accountLoading, account, isAuthPage, navigate]);

	// Show Daily Brief once per day — only from 9am CT onwards.
	// Before 9am CT markets haven't opened yet so the brief has no real market data.
	// Stored in Firestore so it's cross-device.
	useEffect(() => {
		if (!user || !account?.onboardingCompleted || isAuthPage) return;
		const d = new Date();
		const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
		if (account.lastBriefDate === today) return;
		// Check if it's 9am CT or later (CT = America/Chicago)
		const ctHour = parseInt(d.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/Chicago" }), 10);
		if (ctHour < 9) return; // too early — will re-check when user re-opens app
		const t = setTimeout(() => {
			setBriefOpen(true);
			updateLastBriefDate(today).catch(() => {});
		}, 400);
		return () => clearTimeout(t);
	}, [user, account?.onboardingCompleted, account?.lastBriefDate, isAuthPage, updateLastBriefDate]);

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

	// Listen for custom event to open daily brief from child pages
	useEffect(() => {
		const handler = (e: Event) => {
			const source = (e as CustomEvent<{ source?: string }>).detail?.source;
			setBriefSource(source === "mystak" ? "mystak" : "auto");
			setBriefOpen(true);
		};
		window.addEventListener("open-brief", handler);
		return () => window.removeEventListener("open-brief", handler);
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

			<div ref={scrollRef} data-scroll-root className={`flex-1 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isAuthPage ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))]"}`}>
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

		{briefOpen && <DailyBriefModal onClose={() => setBriefOpen(false)} source={briefSource} />}

		</div>
	);
}

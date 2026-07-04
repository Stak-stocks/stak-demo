import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
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
import type { BrandProfile } from "@stak/shared";
import { getEasternDateKey } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getMarketEarnings } from "@/lib/api";
import { useStakTickers } from "@/hooks/useStakTickers";
import { useSwipeLimit } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY } from "@/lib/constants";

export const Route = createRootRoute({
	component: Root,
});

function PageTransition({ children }: { pathname: string; children: React.ReactNode }) {
	return <>{children}</>;
}

function Root() {
	const { appUser, loading } = useAuth();
	const isLoggedIn = !!appUser;
	const { account, accountLoading, saveToStak, updateLastBriefDate } = useAccount();
	const { hasReachedLimit: stakLimitReached, increment: incrementStakSwipe } = useSwipeLimit(appUser?.uid ?? "guest", !!appUser);
	const { resolvedTheme, setTheme, reapplyTheme } = useTheme();
	const location = useLocation();
	const navigate = useNavigate();
	const isAuthPage = ["/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/onboarding"].includes(location.pathname);
	const isSubPage = location.pathname.startsWith("/profile/") || location.pathname.startsWith("/brand/");
	const [searchOpen, setSearchOpen] = useState(false);
	const [briefOpen, setBriefOpen] = useState(false);
	const [briefSource, setBriefSource] = useState<"auto" | "mystak">("auto");
	const [refreshKey, setRefreshKey] = useState(0);
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
	}, [location.pathname, briefOpen]);

	// Prefetch earnings calendar as soon as account loads so modal opens instantly
	const queryClient = useQueryClient();
	const stakTickers = useStakTickers();
	useEffect(() => {
		if (!appUser || stakTickers.length === 0) return;
		for (const tab of ["today", "tomorrow", "week"] as const) {
			queryClient.prefetchQuery({
				queryKey: ["market-earnings", tab, stakTickers],
				queryFn: () => getMarketEarnings(tab, stakTickers),
				staleTime: 10 * 60 * 1000,
			});
		}
	}, [queryClient, stakTickers, appUser]);

	const handleAddToStak = useCallback((brand: BrandProfile) => {
		const stakIds = account?.stakBrandIds ?? [];
		if (stakIds.includes(brand.id)) {
			
			return;
		}
		if (stakIds.length >= STAK_CAPACITY) {
			toast.error("Your Stak is full!", { description: "Remove a stock first (max 30)", duration: 2000 });
			return;
		}
		if (stakLimitReached) {
			toast.error("Daily limit reached", { description: "Come back tomorrow for more picks!", duration: 3000 });
			return;
		}
		const cachedStock = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", brand.ticker])
			?? queryClient.getQueryData<{ quote: { price: number } | null }>(["stock-price", brand.ticker]);
		const priceAtSave = cachedStock?.quote?.price ?? null;
		saveToStak(brand.id, priceAtSave).catch(() => {});
		incrementStakSwipe().catch(() => {});
		// Invalidate daily brief so personalization reflects the new Stak brand
		queryClient.invalidateQueries({ queryKey: ["daily-brief"] });
	}, [account, saveToStak, stakLimitReached, incrementStakSwipe, queryClient]);

	// All sessions are now Supabase — onboarding completion is stored in Postgres and
	// reflected in account.onboardingCompleted via the Supabase Realtime subscription.
	const onboardingCheckApplies = !!appUser;
	useEffect(() => {
		if (!loading && !accountLoading && !isLoggedIn && !isAuthPage) {
			navigate({ to: "/welcome" });
		}
		if (!loading && !accountLoading && isLoggedIn && !isAuthPage && onboardingCheckApplies && account?.onboardingCompleted !== true) {
			navigate({ to: "/onboarding" });
		}
	}, [isLoggedIn, loading, accountLoading, account, isAuthPage, onboardingCheckApplies, navigate]);

	// Show Daily Brief once per day — only from 10am ET onwards, deliberately AFTER
	// the 9:30am ET open (not before): the brief is sourced from real trading
	// activity and news coverage of the session, which doesn't exist yet right at
	// open. "today" is ET too (getEasternDateKey), matching the brief content's own
	// day boundary -- comparing against the browser's local date here instead would
	// let this gate disagree with when the content itself actually refreshes.
	// Stored in Postgres, reflected cross-device via Realtime.
	useEffect(() => {
		if (!appUser || !account?.onboardingCompleted || isAuthPage) return;
		const d = new Date();
		const today = getEasternDateKey(d);
		if (account.lastBriefDate === today) return;
		const etHour = parseInt(d.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/New_York" }), 10);
		if (etHour < 10) return; // too early — will re-check when user re-opens app
		// Open immediately (next tick) so Discover never flashes before the brief
		const t = setTimeout(() => {
			// Force "auto" -- briefSource is page-lifetime state, not reset on sign-out/
			// sign-in, so without this an account that previously opened the brief from
			// My Stak (source: "mystak") would leave that value stuck, making the next
			// auto-popup (this account's tomorrow, or a different account signing in on
			// the same device) wrongly show the My Stak back-button view and hide the
			// "Start Today's Deck" CTA.
			setBriefSource("auto");
			setBriefOpen(true);
			updateLastBriefDate(today).catch(() => {});
		}, 0);
		return () => clearTimeout(t);
	}, [appUser, account?.onboardingCompleted, account?.lastBriefDate, isAuthPage, updateLastBriefDate]);

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
	}, [location.pathname, isAuthPage, appUser]);

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
	if (!isLoggedIn && !isAuthPage) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}
	if (isLoggedIn && !isAuthPage && onboardingCheckApplies && account?.onboardingCompleted !== true) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	// If a brief is about to open (pending but not yet set), hold the spinner so Discover never flashes
	if (!briefOpen && !isAuthPage && appUser && account?.onboardingCompleted) {
		const d = new Date();
		const today = getEasternDateKey(d);
		const etHour = parseInt(d.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/New_York" }), 10);
		if (account.lastBriefDate !== today && etHour >= 10) {
			return (
				<div className="flex items-center justify-center h-full bg-background">
					<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
				</div>
			);
		}
	}

	return (
		<div className="fixed inset-0 flex flex-col bg-background">

			<div ref={scrollRef} data-scroll-root className={`flex-1 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isAuthPage ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))]"}`}>
				<PullToRefresh scrollRef={scrollRef} onRefresh={() => {
						queryClient.invalidateQueries();
						setRefreshKey((k) => k + 1);
					}}>
					<ErrorBoundary tagName="main" className="min-h-full">
						<PageTransition pathname={location.pathname}>
							<Outlet key={refreshKey} />
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

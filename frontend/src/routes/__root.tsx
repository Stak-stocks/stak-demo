import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNav } from "@/components/BottomNav";
import { Toaster, toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { SearchView } from "@/components/SearchView";
import { PaperTradeErrorBanner } from "@/components/simulate/PaperTradeErrorBanner";
import { SideNav } from "@/components/SideNav";
import { useIsMobile } from "@/hooks/use-mobile";
import type { BrandProfile } from "@stak/shared";
import { useQueryClient } from "@tanstack/react-query";
import { getMarketEarnings, getStockData, removeTurnedAwayAccount } from "@/lib/api";
import { NAV_ITEMS } from "@/lib/navItems";
import { useStakTickers } from "@/hooks/useStakTickers";
import { useSwipeLimit } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY } from "@/lib/constants";
import { JOIN_WAITLIST, WEB_GOOGLE_SIGN_IN_KEY, WEB_SIGNUP_OPEN, isBrandNewAccount } from "@/lib/earlyAccess";
import { useFirstRunPending } from "@/lib/firstRun";
import { EligibilityGate, EligibilityRefused } from "@/components/onboarding/EligibilityGate";

export const Route = createRootRoute({
	component: Root,
});

function PageTransition({ children }: { pathname: string; children: React.ReactNode }) {
	return <>{children}</>;
}

function Root() {
	const { appUser, loading, logout } = useAuth();
	const isLoggedIn = !!appUser;
	const { account, accountLoading, saveToStak, refreshAccount } = useAccount();
	const queryClient = useQueryClient();
	const [eligibilityRefused, setEligibilityRefused] = useState(false);
	// Confirmed in this tab: the gate stays down even before the account's next read says so (until a sign-out).
	const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
	useEffect(() => { if (!appUser) setEligibilityConfirmed(false); }, [appUser]);
	const { reset: resetOnboarding } = useOnboarding();
	const { hasReachedLimit: stakLimitReached, increment: incrementStakSwipe } = useSwipeLimit(appUser?.uid ?? "guest", !!appUser);
	const location = useLocation();
	const navigate = useNavigate();
	// Like Android, the whole /onboarding/* flow comes AFTER the account exists (Create account -> confirm code -> Intro
	// -> quiz -> Permissions -> Profile), so every onboarding route needs a session. They render without nav chrome.
	const isOnboardingRoute = location.pathname === "/onboarding" || location.pathname.startsWith("/onboarding/");
	const needsAuthForOnboardingStep = isOnboardingRoute;
	// The Terms and Privacy pages open for anyone, signed in or not - the gate below links to them.
	const isLegalPage = location.pathname === "/terms" || location.pathname === "/privacy";
	const isAuthPage = ["/welcome", "/login", "/signup", "/forgot-password"].includes(location.pathname) || isOnboardingRoute || isLegalPage;
	const [searchOpen, setSearchOpen] = useState(false);
	const isFeedPage = location.pathname === "/feed";
	const scrollRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();
	// Android shows its tab bar only on the five tab pages; every detail page is full-screen. Home's first run swaps it
	// for the "See Today's Pick" scrim.
	const firstRun = useFirstRunPending(appUser?.uid);
	const showTabBar = isMobile && !(firstRun && location.pathname === "/") && NAV_ITEMS.some((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.replace(/\/$/, "") === item.to));

	// Signing out clears what the last person left behind: their half-finished quiz would
	// otherwise pre-fill (and be saved as) the next account's taste in this tab.
	const wasLoggedInRef = useRef(false);
	useEffect(() => {
		if (loading) return;
		if (isLoggedIn) {
			wasLoggedInRef.current = true;
		} else if (wasLoggedInRef.current) {
			wasLoggedInRef.current = false;
			resetOnboarding();
		}
	}, [isLoggedIn, loading, resetOnboarding]);

	// Reset scroll to top and clear any body overflow lock on every route change
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
		document.body.style.overflow = "";
	}, [location.pathname]);

	// Prefetch earnings calendar as soon as account loads so modal opens instantly
	const stakTickers = useStakTickers();
	useEffect(() => {
		if (!appUser || stakTickers.length === 0) return;
		for (const tab of ["today", "tomorrow"] as const) {
			queryClient.prefetchQuery({
				queryKey: ["market-earnings", tab, stakTickers],
				queryFn: () => getMarketEarnings(tab, stakTickers),
				staleTime: 10 * 60 * 1000,
			});
		}
		// "week" tab uses a different key format in my-stak.tsx
		queryClient.prefetchQuery({
			queryKey: ["market-earnings-week", stakTickers],
			queryFn: () => getMarketEarnings("week", stakTickers),
			staleTime: 10 * 60 * 1000,
		});
	}, [queryClient, stakTickers, appUser]);

	const handleAddToStak = useCallback(async (brand: BrandProfile) => {
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
		let priceAtSave = cachedStock?.quote?.price ?? null;
		if (priceAtSave === null) {
			try {
				const fresh = await getStockData(brand.ticker);
				priceAtSave = fresh?.quote?.price ?? null;
			} catch { /* save without price rather than blocking the save */ }
		}
		saveToStak(brand.id, priceAtSave).catch(() => {});
		incrementStakSwipe().catch(() => {});
		// Invalidate daily brief so personalization reflects the new Stak brand
		queryClient.invalidateQueries({ queryKey: ["daily-brief"] });
	}, [account, saveToStak, stakLimitReached, incrementStakSwipe, queryClient]);

	// All sessions are now Supabase — onboarding completion is stored in Postgres and
	// reflected in account.onboardingCompleted via the Supabase Realtime subscription.
	const onboardingCheckApplies = !!appUser;
	// Early access: a brand-new account (a first Google sign-in) is signed back out rather than onboarded.
	const turningAway = isLoggedIn && !loading && !accountLoading && isBrandNewAccount(appUser?.createdAt, account?.onboardingCompleted);
	useEffect(() => {
		if (!loading && !accountLoading && !isLoggedIn && !isAuthPage) {
			navigate({ to: "/welcome" });
		}
		if (!loading && !accountLoading && !isLoggedIn && needsAuthForOnboardingStep) {
			navigate(WEB_SIGNUP_OPEN ? { to: "/signup" } : JOIN_WAITLIST);
		}
		if (!loading && !accountLoading && isLoggedIn && !isAuthPage && onboardingCheckApplies && !turningAway && account?.onboardingCompleted !== true) {
			navigate({ to: "/onboarding" });
		}
	}, [isLoggedIn, loading, accountLoading, account, isAuthPage, needsAuthForOnboardingStep, onboardingCheckApplies, turningAway, navigate]);

	// Sign the brand-new account back out (once - the ref clears only when the session is actually gone) and offer
	// the waitlist with the form open.
	const turnedAway = useRef(false);
	useEffect(() => {
		if (!isLoggedIn) { turnedAway.current = false; return; }
		if (!turningAway || turnedAway.current) return;
		turnedAway.current = true;
		const who = appUser?.email ? ` for ${appUser.email}` : "";
		// Only an account this tab's own Google sign-in just made is removed (the server checks again); any other
		// brand-new account - say an Android sign-up still in its quiz - is only signed out of the web.
		let mine = false;
		try { mine = sessionStorage.getItem(WEB_GOOGLE_SIGN_IN_KEY) === "1"; sessionStorage.removeItem(WEB_GOOGLE_SIGN_IN_KEY); } catch { /* no storage */ }
		void (mine ? removeTurnedAwayAccount().catch(() => {}) : Promise.resolve())
			.then(() => logout().catch(() => {}))
			.finally(() => {
				navigate(JOIN_WAITLIST);
				toast("STAK is in early access", { description: `We couldn't create a STAK account${who} yet. Join the waitlist and we'll let you know when it opens.`, duration: 8000 });
			});
	}, [isLoggedIn, turningAway, appUser?.email, logout, navigate]);

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

	// Desktop: Ctrl+K / Cmd+K opens search from any page with the app shell (the top bar's search field shows the hint).
	useEffect(() => {
		if (isMobile || isAuthPage) return;
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isMobile, isAuthPage]);

	// Turning a brand-new account away: nothing of the app shows on its way out.
	if (turningAway) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	// Auth pages stay mounted while auth/account (re)load: verifying a code or a recovery code
	// creates a session, which flips `loading`, and unmounting the page then threw away the
	// step, email and code it was in the middle of (a password reset had to start over).
	if ((loading || accountLoading) && !isAuthPage) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	// Block render while a redirect is imminent — prevents one-frame flash of wrong page
	if (!isLoggedIn && !isAuthPage) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}
	if (!isLoggedIn && needsAuthForOnboardingStep) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}
	// Refused (under 18): the account is gone and this browser signed out - the answer stays up until OK.
	if (eligibilityRefused) {
		return <EligibilityRefused onDone={() => { setEligibilityRefused(false); navigate(WEB_SIGNUP_OPEN ? { to: "/signup" } : { to: "/welcome" }); }} />;
	}
	// "Before we get started" (18+, U.S., Terms / Privacy) over everything until the account confirms - new and
	// existing accounts alike (as the apps); an account with no row yet hasn't confirmed either. The server refuses a
	// new account's other requests until then too.
	if (isLoggedIn && !accountLoading && !turningAway && !isLegalPage && !eligibilityConfirmed && (account === null || account.needsEligibility === true)) {
		return (
			<EligibilityGate
				onConfirmed={() => {
					// The server has it: the gate goes now, not when the account is next read.
					setEligibilityConfirmed(true);
					void refreshAccount().catch(() => {});
				}}
				onRefused={() => {
					setEligibilityRefused(true);
					// As Delete account: the session and everything this tab kept of the account go.
					void logout().catch(() => {}).finally(() => {
						queryClient.clear();
						try { sessionStorage.clear(); } catch { /* best-effort */ }
					});
				}}
				onSignOut={() => { void logout().catch(() => {}); }}
			/>
		);
	}
	if (isLoggedIn && !isAuthPage && onboardingCheckApplies && account?.onboardingCompleted !== true) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="fixed inset-0 flex flex-col bg-background">

			<div ref={scrollRef} data-scroll-root className={`flex-1 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isAuthPage ? "" : isMobile ? (showTabBar ? "pb-[calc(96px+env(safe-area-inset-bottom))]" : "") : "pl-[220px]"}`}>
				<ErrorBoundary tagName="main" className="min-h-full">
					<PageTransition pathname={location.pathname}>
						<Outlet />
					</PageTransition>
				</ErrorBoundary>
			</div>
			{!isAuthPage && (isMobile ? (showTabBar ? <BottomNav /> : null) : <SideNav />)}
			<Toaster
				position="top-center"
				theme="dark"
				richColors
				toastOptions={{
					style: { background: "#181F30", border: "1px solid rgba(105,179,202,0.35)", color: "#f1f5f9", fontWeight: 600 },
				}}
			/>
			<TanStackRouterDevtools position="bottom-right" />

		{/* Search is desktop-only (the top bar's field and Ctrl/Cmd+K); the phone, like Android, has none. */}
		<SearchView
			open={searchOpen && !isMobile}
			onClose={() => setSearchOpen(false)}
			onSwipeRight={handleAddToStak}
		/>

		{isLoggedIn && !isAuthPage && <PaperTradeErrorBanner />}

		</div>
	);
}

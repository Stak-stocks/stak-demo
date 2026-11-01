import { createRootRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
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
import { ApiError, getMarketEarnings, getStockData, removeTurnedAwayAccount } from "@/lib/api";
import { NAV_ITEMS } from "@/lib/navItems";
import { useStakTickers } from "@/hooks/useStakTickers";
import { useSwipeLimit } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY } from "@/lib/constants";
import {
	JOIN_WAITLIST, LEGAL_PATHS, PENDING_APPLE_LINK_KEY, WEB_SIGNUP_OPEN, WEB_SOCIAL_SIGN_IN_KEY, hasSavedWebSession, isBrandNewAccount,
	isLockedPath, isNewHiddenAppleAccount, isWebLockedOut, setTabFlag, takeTabFlag, takeTeamAccessChange,
} from "@/lib/earlyAccess";
import { isHiddenAppleEmail } from "@/lib/supabase";
import { AppleNewOrExisting } from "@/components/auth/AppleNewOrExisting";
import { useFirstRunPending } from "@/lib/firstRun";
import { EligibilityGate } from "@/components/onboarding/EligibilityGate";
import { pageTitle } from "@/lib/pageTitle";

/** Set once the "web is paused" note has shown in this tab, so it isn't repeated on every page load. */
const WEB_PAUSED_SHOWN_KEY = "stak.webPausedShown";

export const Route = createRootRoute({
	// Web lock: every page but the landing page, Terms and Privacy goes to the landing page (see earlyAccess.ts).
	beforeLoad: ({ location }) => {
		if (isLockedPath(location.pathname)) throw redirect({ to: "/welcome", replace: true });
	},
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
	const isLegalPage = LEGAL_PATHS.includes(location.pathname);
	const isAuthPage = ["/welcome", "/login", "/signup", "/forgot-password"].includes(location.pathname) || isOnboardingRoute || isLegalPage;
	// Every page names itself in the browser tab (WCAG 2.4.2).
	useEffect(() => { document.title = pageTitle(location.pathname); }, [location.pathname]);
	// Web lock (earlyAccess.ts): says what a team link just did, once there's a screen to say it on; and tells someone
	// who used the web app before the lock why they only find the landing page (once a tab).
	useEffect(() => {
		const teamAccessChange = takeTeamAccessChange();
		if (teamAccessChange === "unlocked") {
			toast("Team access is on", { description: "This browser can open all of STAK. Visit with ?team=off to lock it again.", duration: 8000 });
			// The landing page has no way to sign in: a team link to it goes to Sign in (which sends someone already
			// signed in on into the app).
			if (location.pathname === "/" || location.pathname === "/welcome") navigate({ to: "/login", replace: true });
		}
		else if (teamAccessChange === "relocked") toast("Team access is off", { description: "This browser now sees only the landing page." });
		else if (teamAccessChange === "wrong") toast("That team link didn't work", { description: "Check the link and try again." });
		if (!isWebLockedOut() || !hasSavedWebSession()) return;
		try { if (sessionStorage.getItem(WEB_PAUSED_SHOWN_KEY)) return; sessionStorage.setItem(WEB_PAUSED_SHOWN_KEY, "1"); } catch { /* no storage: say it anyway */ }
		toast("STAK on the web is paused for now", { description: "Your account and your STAK are safe. Keep using STAK in the app, and we'll let you know when the web is back.", duration: 8000 });
	}, []);
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
	// Which sign-in this tab just sent someone to ("google" / "apple"): read as the page comes back from it, then
	// forgotten, so a reload never counts it twice.
	const [startedHere] = useState(() => takeTabFlag(WEB_SOCIAL_SIGN_IN_KEY));
	useEffect(() => { takeTabFlag(WEB_SOCIAL_SIGN_IN_KEY, true); }, []);
	// A first Apple sign-in from this tab, behind a hidden email: "Have you used STAK before?" comes before anything
	// else (turning away, onboarding), and stays up once asked - even past the new-account window - until answered.
	const [appleAnswer, setAppleAnswer] = useState<"asking" | "new" | null>(null);
	const newHiddenApple = isLoggedIn && !loading && !accountLoading && startedHere === "apple"
		&& isNewHiddenAppleAccount(appUser?.createdAt, account?.onboardingCompleted, isHiddenAppleEmail(appUser?.email));
	useEffect(() => { if (newHiddenApple) setAppleAnswer((a) => a ?? "asking"); }, [newHiddenApple]);
	const askAppleQuestion = isLoggedIn && (appleAnswer === "asking" || (newHiddenApple && appleAnswer === null));
	// "I'm new" during early access: turned away like any new account, even if the question sat past the window.
	const turningAwayNow = turningAway || (isLoggedIn && appleAnswer === "new" && !WEB_SIGNUP_OPEN);
	// "I already have an account" is on its way to Sign in: the signed-out redirect to the landing page waits.
	const goingToSignIn = useRef(false);
	useEffect(() => { if (isAuthPage) goingToSignIn.current = false; }, [isAuthPage]);
	useEffect(() => {
		if (!loading && !accountLoading && !isLoggedIn && !isAuthPage && !goingToSignIn.current) {
			navigate({ to: "/welcome" });
		}
		if (!loading && !accountLoading && !isLoggedIn && needsAuthForOnboardingStep) {
			navigate(WEB_SIGNUP_OPEN ? { to: "/signup" } : JOIN_WAITLIST);
		}
		if (!loading && !accountLoading && isLoggedIn && !isAuthPage && onboardingCheckApplies && !turningAwayNow && !askAppleQuestion && account?.onboardingCompleted !== true) {
			navigate({ to: "/onboarding" });
		}
	}, [isLoggedIn, loading, accountLoading, account, isAuthPage, needsAuthForOnboardingStep, onboardingCheckApplies, turningAwayNow, askAppleQuestion, navigate]);

	// After "I already have an account": once signed in the usual way - by any route, Google comes back here rather
	// than to Sign in - on to Sign-in methods, which offers the Apple link (and forgets the flag).
	useEffect(() => {
		if (!isLoggedIn || accountLoading || account?.onboardingCompleted !== true || isAuthPage) return;
		if (location.pathname !== "/profile/sign-in" && takeTabFlag(PENDING_APPLE_LINK_KEY) === "1") navigate({ to: "/profile/sign-in" });
	}, [isLoggedIn, accountLoading, account?.onboardingCompleted, isAuthPage, location.pathname, navigate]);

	// A Google or Apple sign-in that didn't finish (cancelled, or refused) comes back with the reason in the address:
	// say so, then tidy the address. Sign-in methods explains its own link failures.
	useEffect(() => {
		if (window.location.pathname === "/profile/sign-in") return;
		const query = new URLSearchParams(window.location.search);
		const hash = new URLSearchParams(window.location.hash.slice(1));
		if (!(query.get("error") ?? hash.get("error"))) return;
		toast("Sign-in didn't finish", { description: "Try again, or use another way to sign in." });
		window.history.replaceState(null, "", window.location.pathname);
	}, []);

	// Sign the brand-new account back out (once - the ref clears only when the session is actually gone) and offer
	// the waitlist with the form open.
	const turnedAway = useRef(false);
	useEffect(() => {
		if (!isLoggedIn) { turnedAway.current = false; return; }
		if (!turningAwayNow || askAppleQuestion || turnedAway.current) return;
		turnedAway.current = true;
		// Apple's made-up address would mean nothing to them.
		const who = appUser?.email && !isHiddenAppleEmail(appUser.email) ? ` for ${appUser.email}` : "";
		// Only an account this tab's own Google or Apple sign-in just made is removed (the server checks again); any
		// other brand-new account - say an Android sign-up still in its quiz - is only signed out of the web.
		const mine = startedHere !== null;
		void (mine ? removeTurnedAwayAccount().catch(() => {}) : Promise.resolve())
			.then(() => logout().catch(() => {}))
			.finally(() => {
				navigate(JOIN_WAITLIST);
				toast("STAK is in early access", { description: `We couldn't create a STAK account${who} yet. Join the waitlist and we'll let you know when it opens.`, duration: 8000 });
			});
	}, [isLoggedIn, turningAwayNow, askAppleQuestion, appUser?.email, startedHere, logout, navigate]);

	/**
	 * "I already have an account": the empty account this Apple sign-in made is removed (its Apple identity with it, so
	 * it can be linked to the real one), and they sign in the usual way; Sign-in methods then offers the link. Nothing
	 * changes when it couldn't be removed; "too-late" once the account is past the window the server allows.
	 */
	async function undoForExistingAccount(): Promise<"done" | "failed" | "too-late"> {
		try {
			await removeTurnedAwayAccount();
		} catch (e) {
			return e instanceof ApiError && e.status === 409 ? "too-late" : "failed";
		}
		goingToSignIn.current = true;
		await logout().catch(() => {});
		// After the sign-out, which forgets any earlier one.
		setTabFlag(PENDING_APPLE_LINK_KEY, "1");
		navigate({ to: "/login" });
		return "done";
	}

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

	if (askAppleQuestion) {
		return (
			<main>
				<AppleNewOrExisting
					onNew={() => setAppleAnswer("new")}
					onExisting={undoForExistingAccount}
					onSignOut={() => { void logout().catch(() => {}); }}
				/>
			</main>
		);
	}
	// Turning a brand-new account away: nothing of the app shows on its way out.
	if (turningAwayNow) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	// Auth pages stay mounted while auth/account (re)load: verifying a code or a recovery code
	// creates a session, which flips `loading`, and unmounting the page then threw away the
	// step, email and code it was in the middle of (a password reset had to start over).
	if ((loading || accountLoading) && !isAuthPage) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	// Block render while a redirect is imminent — prevents one-frame flash of wrong page
	if (!isLoggedIn && !isAuthPage) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}
	if (!isLoggedIn && needsAuthForOnboardingStep) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}
	// "Before we get started" (18+, U.S., Terms / Privacy - one "Agree and continue") over everything until the account confirms - new and
	// existing accounts alike (as the apps); an account with no row yet hasn't confirmed either. The server refuses a
	// new account's other requests until then too.
	if (isLoggedIn && !accountLoading && !turningAwayNow && !isLegalPage && !eligibilityConfirmed && (account === null || account.needsEligibility === true)) {
		return (
			<main>
			<EligibilityGate
				onConfirmed={() => {
					// The server has it: the gate goes now, not when the account is next read.
					setEligibilityConfirmed(true);
					void refreshAccount().catch(() => {});
				}}
				onSignOut={() => { void logout().catch(() => {}); }}
			/>
			</main>
		);
	}
	if (isLoggedIn && !isAuthPage && onboardingCheckApplies && account?.onboardingCompleted !== true) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#69B3CA] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="fixed inset-0 flex flex-col bg-background">

			{/* Keyboard users jump past the navigation straight to the page (WCAG 2.4.1). */}
			<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-md focus:bg-[#181F30] focus:px-4 focus:py-2 focus:text-white focus:outline focus:outline-2 focus:outline-[#69B3CA]">Skip to content</a>
			{/* The scrollbar shows on the legal pages, where long reading needs a sense of place. */}
			<div ref={scrollRef} data-scroll-root className={`flex-1 overflow-y-auto overscroll-y-contain ${isLegalPage ? "" : "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"} ${isAuthPage ? "" : isMobile ? (showTabBar ? "pb-[calc(96px+env(safe-area-inset-bottom))]" : "") : "pl-[220px]"}`}>
				<ErrorBoundary tagName="main" id="main" tabIndex={-1} className="min-h-full outline-none">
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

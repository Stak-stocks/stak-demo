import { createRootRoute, Outlet, useElementScrollRestoration, useLocation, useRouter, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { type CSSProperties, useEffect, useLayoutEffect, useRef } from "react";
import { Toaster } from "sonner";
import { FitCanvas, useCanvasSize, zoomString } from "@/app/FitCanvas";
import { useFocusReturn } from "@/app/focusReturn";
import { NotFound } from "@/app/NotFound";
import { useDocumentTitle } from "@/app/titles";
import { isDesktopAppPath, isShellPath } from "@/app/paths";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logEvent } from "@/lib/firebase";

export const Route = createRootRoute({
	component: Root,
	notFoundComponent: NotFound,
});

/** How long a restore waits for a page that is still loading to grow tall enough (useRestoreWhenTallEnough). */
const SETTLE_MS = 4000;
/** What takes the scroll back from a pending restore: the person's own wheel, finger, key or press. */
const TAKES_OVER = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/** How far down the document can scroll as it stands. */
const scrollReach = () => document.documentElement.scrollHeight - window.innerHeight;

/**
 * Goes to a saved place as soon as the document is tall enough to hold it, once; gives up after SETTLE_MS (the page is
 * simply shorter than it was) and at the person's first input. Returns the way to call it off (the next navigation).
 * It only finishes a restore that fell short: when the place is within the page as it stands, the router either went
 * there already or chose to leave the page where it is (a step through the history that stays on a page, e.g. a sheet
 * closing: src/app/simulate keeps the scroll there), and nothing is done.
 */
function scrollWhenTallEnough(left: number, top: number): () => void {
	if (window.scrollY >= top - 1 || scrollReach() >= top - 1) return () => {};
	let frame = 0;
	const started = performance.now();
	const stop = () => {
		cancelAnimationFrame(frame);
		for (const type of TAKES_OVER) window.removeEventListener(type, stop, true);
	};
	const tick = () => {
		if (scrollReach() >= top - 1) {
			window.scrollTo({ top, left, behavior: "instant" });
			stop();
		} else if (performance.now() - started > SETTLE_MS) stop();
		else frame = requestAnimationFrame(tick);
	};
	for (const type of TAKES_OVER) window.addEventListener(type, stop, { capture: true, passive: true });
	frame = requestAnimationFrame(tick);
	return stop;
}

/**
 * Finishes a restore the page was not yet tall enough for (coordinator ruling N5: "a reload keeps its position as
 * browsers do"). The router puts the window back where the person left a history entry as soon as the page has rendered
 * (Back, Forward, a reload: src/main.tsx). On a cold load what has rendered by then is the route's loading state (the
 * session, the catalog chunk and the page's own chunk are still on their way), one window tall, so the scroll stopped
 * at its end: /news reloaded 700 px down came back at the top (measured at 390x844). When the router's restore falls
 * short this waits for the page to grow and goes there once (scrollWhenTallEnough). The place is the one saved for the
 * entry when its page was last left, read as the entry is entered: a page opened by a link has none and starts at the
 * top, and nothing the person does on the page afterwards is undone. A fresh visit has none either: src/app/freshEntry.ts
 * forgets the places saved for a fresh document's first entry before the router reads them (an address entered again
 * starts at the top, the landing page's own scroller included).
 */
function useRestoreWhenTallEnough() {
	const router = useRouter();
	const location = useLocation();
	const saved = useElementScrollRestoration({ getElement: () => window });
	const key = location.state.__TSR_key ?? location.href;
	const entry = useRef({ key: "", left: 0, top: 0 });
	if (entry.current.key !== key) entry.current = { key, left: saved?.scrollX ?? 0, top: saved?.scrollY ?? 0 };
	// subscribed in the commit that first renders the root, before the router reports its first page as rendered; the
	// router's own handler (added when the router was made) has already restored what it could when this one runs
	useLayoutEffect(() => {
		let stop = () => {};
		const unsubscribe = router.subscribe("onRendered", ({ toLocation }) => {
			stop();
			stop = () => {};
			const { key, left, top } = entry.current;
			if (top > 0 && (toLocation.state.__TSR_key ?? toLocation.href) === key) stop = scrollWhenTallEnough(left, top);
		});
		return () => {
			unsubscribe();
			stop();
		};
	}, [router]);
}

/**
 * Two surfaces share the router: the desktop app rebuilt from the Figma desktop frames (rendered bare,
 * it scrolls the document) and the marketing landing page at /welcome, which keeps the fixed scroll
 * container its desktop canvas measures itself against. Everything is dark.
 */
function Root() {
	const location = useLocation();
	// A path no route matches: the router flags the root (src/main.tsx notFoundMode "root"), whatever part of the path a
	// route would have matched, and the root draws the app's 404 standalone, as for /no-such-page (below): the approved
	// 404 (the plain page outside the canvas), never the router's bare "Not Found" inside the shell (/profile/no-such,
	// /news/a/b, /stocks/AAPL/x drew it: review r2's medium) nor a canvas-zoomed copy (/simulate/zzz at 1024 to 1439).
	const rootNotFound = useRouterState({ select: (s) => !!s.matches[0]?.globalNotFound });
	const notFound = useRouterState({ select: (s) => s.matches.some((m) => m.globalNotFound || m.status === "notFound") });
	const isDesktopApp = isDesktopAppPath(location.pathname) && !rootNotFound;
	const size = useCanvasSize();
	// the root owns the 404's title too ("STAK" wherever the app's 404 is drawn; src/app/titles.ts, ruling N11c)
	useDocumentTitle(location.pathname, notFound);
	useRestoreWhenTallEnough();
	// a step back puts the keyboard on the control that opened the page left (src/app/focusReturn.ts)
	useFocusReturn();

	useEffect(() => {
		document.documentElement.classList.add("dark");
		if ("scrollRestoration" in history) history.scrollRestoration = "manual";
	}, []);

	useEffect(() => {
		document.documentElement.style.backgroundColor = isDesktopApp ? "#0a1020" : "";
		// lets the document scroll (styles.css `html.stak-desktop`): the frames run 1024-2050 tall, a laptop window ~730
		document.documentElement.classList.toggle("stak-desktop", isDesktopApp);
	}, [isDesktopApp]);

	// Where a page starts is the router's (src/main.tsx scrollRestoration, coordinator ruling N5): a page opened by a
	// link or a button starts at the top, and Back / Forward / a reload return to where the person left that entry, as
	// the phones keep a list's position (Compose LazyColumn state, SwiftUI NavigationStack). This effect used to scroll
	// the window to the top on every path change, history pops included, so every Back landed at the top; it also did
	// so while the next page's chunk was still loading, moving the page the person was leaving. The app scrolls the
	// document at every size (measured at 1440x1024, 1280x800, 820x1180 and 390x844); the landing page scrolls its own
	// container, which the router restores as well.
	useEffect(() => {
		document.body.style.overflow = "";
		logEvent("page_view", { page_path: location.pathname });
	}, [location.pathname]);

	// on the auth pages a top-centre toast covered Back (627 / 63 on the frames; 10 px at 1280 x 800): there the toasts
	// centre over the form area, right of the 600-px brand panel, by moving half the panel (300 canvas px, zoomed below 1440
	// and past 2560). Below 1024 the auth pages reflow (the brand panel gives way), so the toasts centre on the window.
	const onAuthPage = ["/login", "/signup", "/forgot-password", "/check-email", "/reset-password"].includes(location.pathname);
	// The toaster sits outside the canvas: past 2560 its offset, width and gap take the canvas zoom (--stak-zoom-up, 1 up to
	// 2560) like the toast itself (styles.css .stak-toast), so the toasts grow with the app; below 640 they centre on the
	// window, 16 from the top, or on the shell pages where the phone content starts (under the 64 top bar + 16), so they
	// never cover the menu button (styles.css .stak-toaster / .stak-toaster-shell).
	const toasterStyle = {
		"--width": "calc(356px * var(--stak-zoom-up, 1))",
		"--gap": "calc(14px * var(--stak-zoom-up, 1))",
		// 951-1023: the auth pages show their brand panel narrowed (src/app/auth/responsive.css sets --auth-toast-shift, half
		// that panel, only there), so the toasts centre over the form area as they do right of the 600 panel from 1024
		...(onAuthPage ? { translate: "calc(300px * var(--stak-zoom, 1) * (1 - var(--stak-compact, 0)) + var(--auth-toast-shift, 0px)) 0" } : {}),
	} as CSSProperties;
	const toaster = isDesktopApp ? (
		// the desktop app's toasts take the one toast its frames draw (2:3234, styles.css .stak-toast)
		<Toaster
			position="top-center"
			theme="dark"
			className={isShellPath(location.pathname) ? "stak-toaster stak-toaster-shell" : "stak-toaster"}
			offset="calc(24px * var(--stak-zoom-up, 1))"
			toastOptions={{ unstyled: true, classNames: { toast: "stak-toast" } }}
			style={toasterStyle}
		/>
	) : (
		<Toaster
			position="top-center"
			theme="dark"
			richColors
			toastOptions={{ style: { background: "#1a2744", border: "1px solid rgba(99,102,241,0.35)", color: "#f1f5f9", fontWeight: 600 } }}
		/>
	);

	if (isDesktopApp) {
		// The shell pages carry their own <main> (AppShell's content area) and a top-level banner / complementary landmark
		// (the phone top bar <header>, the rail <aside>): the boundary around them is a plain div, so no main is nested in
		// another and the bar is exposed as the page's banner. The standalone pages (auth, onboarding, splash) have no main
		// of their own: the boundary stays theirs, except around a not-found a route reports itself (its 404 is its main).
		// Both are plain blocks with the same class (no pixel changes). The toaster sits beside the boundary, so a toast
		// survives the boundary's element changing between the two kinds of page.
		return (
			<>
				<ErrorBoundary tagName={isShellPath(location.pathname) || notFound ? "div" : "main"} className="min-h-full">
					<FitCanvas>
						<Outlet />
					</FitCanvas>
				</ErrorBoundary>
				{toaster}
			</>
		);
	}

	// The 404 page renders out here, outside the canvas (its approved look up to 2560 is the plain, unzoomed page), for
	// every path no route matches (/no-such-page, /login/x, /profile/no-such alike). Past 2560 it grows with the rest of
	// the app: the whole surface takes the big regime's zoom (and NotFound's fillHeight divides by it). The landing page
	// (/welcome) keeps its own canvases and is never zoomed. The 404 carries its own <main> (NotFound.tsx), so the
	// boundary around it is a plain div, as on the shell pages: one main per page (review round 2 measured two, nested).
	// The landing page has none of its own, so the boundary stays its main.
	const bigNotFound = notFound && size.regime === "big";
	return (
		<div
			className="fixed inset-0 flex flex-col bg-background"
			style={bigNotFound ? ({ zoom: size.zoom, "--stak-zoom": zoomString(size.zoom) } as CSSProperties) : undefined}
		>
			<div
				data-scroll-root
				className="flex-1 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
			>
				<ErrorBoundary tagName={notFound ? "div" : "main"} className="min-h-full">
					<Outlet />
				</ErrorBoundary>
			</div>
			{toaster}
			<TanStackRouterDevtools position="bottom-right" />
		</div>
	);
}

// FIRST, before anything that loads the router: a fresh visit forgets the places saved for its entry before the router
// reads its scroll record (src/app/freshEntry.ts). Keep this import at the top.
import "./app/freshEntry";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./styles.css";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "./context/AuthContext";
import { AccountProvider } from "./context/AccountContext";

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	// Back, Forward and a reload return to where the person left a page, per history entry; a page opened by a link or
	// a button starts at the top (coordinator ruling N5: the phones keep a list's position when you come back). The
	// router keeps history.scrollRestoration "manual" and restores at once, without a smooth scroll.
	scrollRestoration: true,
	scrollRestorationBehavior: "instant",
	// Every path no route matches is the ROOT's not-found, drawn by the root as the app's 404 (src/routes/__root.tsx,
	// src/app/NotFound.tsx). The router's default ("fuzzy") gave it to the deepest matched route that has children: the
	// shell's layout for /profile/no-such, /news/a/b, /my-stak/a/b, /home/x, /discover/zzz and /stocks/AAPL/x, which has
	// no not-found of its own, so the router's bare "Not Found" text was drawn inside the shell (review r2's medium).
	notFoundMode: "root",
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	// Prototype motion is opt-in on the flows that specify it; ordinary navigation is instant.
	defaultViewTransition: false,
	basepath: import.meta.env.TENANT_ID ? `/${import.meta.env.TENANT_ID}` : "/",
});

// browser Back / Forward swap the page at once: the prototype's tabs SWAP and its Backs are INSTANT. A pop the app
// started with its own motion keeps it (the Simulate sheets' withMotion sets <html data-stak-motion> before calling
// history.back(), e.g. "Keep exploring" dissolves 0.3 s). Subscribed before the router mounts, so this runs before the
// router's own handler reads the flag.
router.history.subscribe(({ action }) => {
	const motion = document.documentElement.dataset.stakMotion;
	if (motion) {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) router.shouldViewTransition = false;
		// A typed Back already selected its rightward push before the history pop.
		else if (motion !== "onb-pop") router.shouldViewTransition = motion !== "instant";
		return;
	}
	if (action.type === "BACK" || action.type === "FORWARD" || action.type === "GO") router.shouldViewTransition = false;
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<AuthProvider>
				<AccountProvider>
					<QueryClientProvider client={queryClient}>
						<RouterProvider router={router} />
						<Analytics />
					</QueryClientProvider>
				</AccountProvider>
			</AuthProvider>
		</StrictMode>,
	);
}

import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useRef } from "react";
import { Toaster } from "sonner";
import { FitCanvas } from "@/app/FitCanvas";
import { NotFound } from "@/app/NotFound";
import { useDocumentTitle } from "@/app/titles";
import { isDesktopAppPath } from "@/app/paths";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logEvent } from "@/lib/firebase";

export const Route = createRootRoute({
	component: Root,
	notFoundComponent: NotFound,
});

/**
 * Two surfaces share the router: the desktop app rebuilt from the Figma desktop frames (rendered bare,
 * it scrolls the document) and the marketing landing page at /welcome, which keeps the fixed scroll
 * container its desktop canvas measures itself against. Everything is dark.
 */
function Root() {
	const location = useLocation();
	const isDesktopApp = isDesktopAppPath(location.pathname);
	const scrollRef = useRef<HTMLDivElement>(null);
	useDocumentTitle(location.pathname);

	useEffect(() => {
		document.documentElement.classList.add("dark");
		if ("scrollRestoration" in history) history.scrollRestoration = "manual";
	}, []);

	useEffect(() => {
		document.documentElement.style.backgroundColor = isDesktopApp ? "#0a1020" : "";
		// lets the document scroll (styles.css `html.stak-desktop`): the frames run 1024-2050 tall, a laptop window ~730
		document.documentElement.classList.toggle("stak-desktop", isDesktopApp);
	}, [isDesktopApp]);

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
		window.scrollTo({ top: 0, behavior: "instant" });
		document.body.style.overflow = "";
		logEvent("page_view", { page_path: location.pathname });
	}, [location.pathname]);

	const toaster = isDesktopApp ? (
		// the desktop app's toasts take the one toast its frames draw (2:3234, styles.css .stak-toast)
		<Toaster position="top-center" theme="dark" toastOptions={{ unstyled: true, classNames: { toast: "stak-toast" } }} />
	) : (
		<Toaster
			position="top-center"
			theme="dark"
			richColors
			toastOptions={{ style: { background: "#1a2744", border: "1px solid rgba(99,102,241,0.35)", color: "#f1f5f9", fontWeight: 600 } }}
		/>
	);

	if (isDesktopApp) {
		return (
			<ErrorBoundary tagName="main" className="min-h-full">
				<FitCanvas>
					<Outlet />
				</FitCanvas>
				{toaster}
			</ErrorBoundary>
		);
	}

	return (
		<div className="fixed inset-0 flex flex-col bg-background">
			<div
				ref={scrollRef}
				data-scroll-root
				className="flex-1 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
			>
				<ErrorBoundary tagName="main" className="min-h-full">
					<Outlet />
				</ErrorBoundary>
			</div>
			{toaster}
			<TanStackRouterDevtools position="bottom-right" />
		</div>
	);
}

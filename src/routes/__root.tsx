import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FloatingBanner } from "@/components/FloatingBanner";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "sonner";

export const Route = createRootRoute({
	component: Root,
});

function Root() {
	return (
		<div className="flex flex-col min-h-screen bg-white dark:bg-[#121212] transition-colors duration-300">
			<ThemeToggle />
			<ErrorBoundary tagName="main" className="flex-1 pb-16">
				<Outlet />
			</ErrorBoundary>
			<BottomNav />
			<Toaster position="top-center" />
			<TanStackRouterDevtools position="bottom-right" />
			<FloatingBanner position="bottom-left" />
		</div>
	);
}

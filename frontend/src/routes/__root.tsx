import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FloatingBrands } from "@/components/FloatingBrands";
import { Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const { user, loading, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const isAuthPage = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(location.pathname);

	useEffect(() => {
		if (!loading && !user && !isAuthPage) {
			navigate({ to: "/login" });
		}
	}, [user, loading, isAuthPage, navigate]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#121212]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-screen bg-white dark:bg-[#121212] transition-colors duration-300 overflow-hidden">
			{!isAuthPage && <FloatingBrands />}
			{!isAuthPage && <ThemeToggle />}
			{!isAuthPage && user && (
				<button
					type="button"
					onClick={() => { logout().then(() => navigate({ to: "/login" })); }}
					className="fixed top-4 right-4 z-50 px-3 py-2 text-xs font-medium rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 text-zinc-400 transition-colors"
				>
					Sign Out
				</button>
			)}
			<ErrorBoundary tagName="main" className="flex-1 pb-16">
				<Outlet />
			</ErrorBoundary>
			{!isAuthPage && <BottomNav />}
			<Toaster position="top-center" />
			<TanStackRouterDevtools position="bottom-right" />
		</div>
	);
}

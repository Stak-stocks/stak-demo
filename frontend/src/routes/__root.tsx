import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNav } from "@/components/BottomNav";
import { Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { UserCircle, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const { user, loading, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const isAuthPage = ["/login", "/signup", "/forgot-password", "/reset-password", "/onboarding"].includes(location.pathname);
	const [profileOpen, setProfileOpen] = useState(false);
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		if (!loading && !user && !isAuthPage) {
			navigate({ to: "/login" });
		}
		if (!loading && user && !isAuthPage && localStorage.getItem("onboardingCompleted") === "false") {
			navigate({ to: "/onboarding" });
		}
	}, [user, loading, isAuthPage, navigate]);

	// Close dropdown on outside click
	useEffect(() => {
		if (!profileOpen) return;
		const handleClick = () => setProfileOpen(false);
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [profileOpen]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0b1121]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-screen bg-white dark:bg-[#0b1121] transition-colors duration-300 overflow-hidden">
			{/* Profile icon with dropdown */}
			{!isAuthPage && user && (
				<div className="fixed top-4 right-4 z-50">
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); setProfileOpen((v) => !v); }}
						className="p-2 rounded-full bg-[#0f1629]/80 hover:bg-[#162036] border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
					>
						<UserCircle className="w-5 h-5" />
					</button>

					{profileOpen && (
						<div
							className="absolute right-0 mt-2 w-44 rounded-xl bg-[#0f1629] border border-slate-700/50 shadow-xl overflow-hidden"
							onClick={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								onClick={() => {
									setTheme(theme === "dark" ? "light" : "dark");
									setProfileOpen(false);
								}}
								className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-[#162036] transition-colors"
							>
								{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
								{theme === "dark" ? "Light Mode" : "Dark Mode"}
							</button>
							<button
								type="button"
								onClick={() => { logout().then(() => navigate({ to: "/login" })); }}
								className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-[#162036] transition-colors border-t border-slate-700/50"
							>
								<LogOut className="w-4 h-4" />
								Sign Out
							</button>
						</div>
					)}
				</div>
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

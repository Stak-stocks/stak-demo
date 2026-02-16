import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNav } from "@/components/BottomNav";
import { Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { UserCircle, LogOut, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { SearchView } from "@/components/SearchView";

export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const { user, loading, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const isAuthPage = ["/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/onboarding"].includes(location.pathname);
	const [profileOpen, setProfileOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		if (!loading && !user && !isAuthPage) {
			navigate({ to: "/welcome" });
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
			{/* Top header bar with STAK title and profile icon */}
			{!isAuthPage && user && (
				<header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#0b1121]/95 backdrop-blur-lg border-b border-zinc-200/50 dark:border-slate-800/40">
					{/* Search icon */}
					<button
						type="button"
						onClick={() => setSearchOpen(true)}
						className="p-2 rounded-full text-slate-400 hover:text-white transition-colors"
						aria-label="Search stocks"
					>
						<Search className="w-5 h-5" />
					</button>

					{/* Profile icon */}
					<div className="relative">
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); setProfileOpen((v) => !v); }}
							className="p-2 rounded-full text-slate-400 hover:text-white transition-colors"
						>
							<UserCircle className="w-6 h-6" />
						</button>

						{profileOpen && (
							<div
								className="absolute right-0 mt-2 w-44 rounded-xl bg-[#0f1629] border border-slate-700/50 shadow-xl overflow-hidden z-50"
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
									onClick={() => { logout().then(() => navigate({ to: "/welcome" })); }}
									className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-[#162036] transition-colors border-t border-slate-700/50"
								>
									<LogOut className="w-4 h-4" />
									Sign Out
								</button>
							</div>
						)}
					</div>
				</header>
			)}

			<ErrorBoundary tagName="main" className="flex-1 pb-16">
				<Outlet />
			</ErrorBoundary>
			{!isAuthPage && <BottomNav />}
			<Toaster position="top-center" />
			<TanStackRouterDevtools position="bottom-right" />

			{/* Search view */}
			<SearchView
				open={searchOpen}
				onClose={() => setSearchOpen(false)}
			/>
		</div>
	);
}

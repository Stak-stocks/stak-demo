import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, Layers, Trophy } from "lucide-react";

export function BottomNav() {
	const router = useRouterState();
	const currentPath = router.location.pathname;

	const isActive = (path: string) => {
		if (path === "/") {
			return currentPath === "/";
		}
		return currentPath.startsWith(path);
	};

	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 z-40">
			<div className="max-w-7xl mx-auto px-4">
				<div className="flex items-center justify-around h-16">
					<Link
						to="/"
						className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
							isActive("/") && !isActive("/my-stak") && !isActive("/league")
								? "text-cyan-500 dark:text-cyan-400"
								: "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
						}`}
					>
						<Sparkles className="w-6 h-6" />
						<span className="text-xs font-medium">Discover</span>
					</Link>

					<Link
						to="/my-stak"
						className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
							isActive("/my-stak")
								? "text-pink-500 dark:text-pink-400"
								: "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
						}`}
					>
						<Layers className="w-6 h-6" />
						<span className="text-xs font-medium">My Stak</span>
					</Link>

					<Link
						to="/league"
						className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
							isActive("/league")
								? "text-yellow-500 dark:text-yellow-500"
								: "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
						}`}
					>
						<Trophy className="w-6 h-6" />
						<span className="text-xs font-medium">League</span>
					</Link>
				</div>
			</div>
		</nav>
	);
}

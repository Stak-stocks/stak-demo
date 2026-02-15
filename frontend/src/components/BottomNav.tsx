import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Layers, Newspaper, Trophy } from "lucide-react";

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
		<nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0b1121]/95 backdrop-blur-lg border-t border-zinc-200 dark:border-slate-800/60 z-40">
			<div className="max-w-7xl mx-auto px-4">
				<div className="flex items-center justify-around h-16">
					<Link
						to="/"
						className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
							isActive("/") && !isActive("/my-stak") && !isActive("/feed") && !isActive("/league")
								? "text-cyan-500 dark:text-cyan-400"
								: "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
						}`}
					>
						<div
							className={`w-8 h-8 rounded-full flex items-center justify-center ${
								isActive("/") && !isActive("/my-stak") && !isActive("/feed") && !isActive("/league")
									? "bg-gradient-to-br from-purple-400/30 to-cyan-400/30 shadow-[0_0_12px_rgba(168,130,255,0.5),0_0_24px_rgba(0,200,255,0.3)]"
									: "bg-transparent"
							}`}
						>
							<Compass className="w-5 h-5" />
						</div>
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
						to="/feed"
						className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
							isActive("/feed")
								? "text-orange-500 dark:text-orange-400"
								: "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
						}`}
					>
						<Newspaper className="w-6 h-6" />
						<span className="text-xs font-medium">News</span>
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

import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Layers, Newspaper, Trophy, UserCircle } from "lucide-react";

const NAV_ITEMS = [
	{
		to: "/",
		label: "Discover",
		icon: Compass,
		activeColor: "text-cyan-500 dark:text-cyan-400",
		glow: "bg-gradient-to-br from-purple-400/30 to-cyan-400/30 shadow-[0_0_12px_rgba(168,130,255,0.5),0_0_24px_rgba(0,200,255,0.3)]",
	},
	{
		to: "/my-stak",
		label: "My Stak",
		icon: Layers,
		activeColor: "text-pink-500 dark:text-pink-400",
		glow: "bg-gradient-to-br from-pink-400/30 to-rose-400/30 shadow-[0_0_12px_rgba(236,72,153,0.5),0_0_24px_rgba(244,63,94,0.3)]",
	},
	{
		to: "/feed",
		label: "News",
		icon: Newspaper,
		activeColor: "text-orange-500 dark:text-orange-400",
		glow: "bg-gradient-to-br from-orange-400/30 to-amber-400/30 shadow-[0_0_12px_rgba(251,146,60,0.5),0_0_24px_rgba(245,158,11,0.3)]",
	},
	{
		to: "/league",
		label: "League",
		icon: Trophy,
		activeColor: "text-yellow-500 dark:text-yellow-500",
		glow: "bg-gradient-to-br from-yellow-400/30 to-amber-400/30 shadow-[0_0_12px_rgba(250,204,21,0.5),0_0_24px_rgba(245,158,11,0.3)]",
	},
	{
		to: "/profile",
		label: "Profile",
		icon: UserCircle,
		activeColor: "text-emerald-500 dark:text-emerald-400",
		glow: "bg-gradient-to-br from-emerald-400/30 to-teal-400/30 shadow-[0_0_12px_rgba(52,211,153,0.5),0_0_24px_rgba(20,184,166,0.3)]",
	},
] as const;

export function BottomNav() {
	const router = useRouterState();
	const currentPath = router.location.pathname;

	const isActive = (path: string) => {
		if (path === "/") {
			return currentPath === "/" && !currentPath.startsWith("/my-stak") && !currentPath.startsWith("/feed") && !currentPath.startsWith("/league");
		}
		return currentPath.startsWith(path);
	};

	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0b1121]/95 backdrop-blur-lg z-40">
			<div className="max-w-7xl mx-auto px-2 sm:px-4">
				<div className="flex items-center justify-around h-16">
					{NAV_ITEMS.map((item) => {
						const active = isActive(item.to);
						const Icon = item.icon;
						return (
							<Link
								key={item.to}
								to={item.to}
								className={`flex flex-col items-center gap-1 min-w-0 flex-1 py-2 transition-colors ${
									active
										? item.activeColor
										: "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
								}`}
							>
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
										active ? item.glow : "bg-transparent"
									}`}
								>
									<Icon className="w-5 h-5" />
								</div>
								<span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{item.label}</span>
							</Link>
						);
					})}
				</div>
			</div>
		</nav>
	);
}

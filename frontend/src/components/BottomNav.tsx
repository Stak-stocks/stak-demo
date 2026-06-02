import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Layers, Newspaper, Gamepad2, UserCircle } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { getDailyChallenge } from "@/data/playgroundData";

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
		label: "My STAK",
		icon: Layers,
		activeColor: "text-violet-500 dark:text-violet-400",
		glow: "bg-gradient-to-br from-violet-400/30 to-indigo-400/30 shadow-[0_0_12px_rgba(139,92,246,0.5),0_0_24px_rgba(99,102,241,0.3)]",
	},
	{
		to: "/feed",
		label: "News",
		icon: Newspaper,
		activeColor: "text-orange-500 dark:text-orange-400",
		glow: "bg-gradient-to-br from-orange-400/30 to-amber-400/30 shadow-[0_0_12px_rgba(251,146,60,0.5),0_0_24px_rgba(245,158,11,0.3)]",
	},
	{
		to: "/playground",
		label: "Playground",
		icon: Gamepad2,
		activeColor: "text-pink-500 dark:text-pink-400",
		glow: "bg-gradient-to-br from-pink-400/30 to-rose-400/30 shadow-[0_0_12px_rgba(244,114,182,0.5),0_0_24px_rgba(251,113,133,0.3)]",
	},
	{
		to: "/profile",
		label: "Profile",
		icon: UserCircle,
		activeColor: "text-emerald-500 dark:text-emerald-400",
		glow: "bg-gradient-to-br from-emerald-400/30 to-teal-400/30 shadow-[0_0_12px_rgba(52,211,153,0.5),0_0_24px_rgba(20,184,166,0.3)]",
	},
] as const;

export function BottomNav({ onSearchClose, searchActive }: { onSearchClose?: () => void; searchActive?: boolean }) {
	const router = useRouterState();
	const currentPath = router.location.pathname;
	const { account } = useAccount();

	// Show dot on Playground tab if daily challenge hasn't been completed today
	const todayKey = new Date().toISOString().split("T")[0];
	const todayChallenge = getDailyChallenge(todayKey);
	const challengeDone = account?.dailyChallengeState?.date === todayKey &&
		(account.dailyChallengeState.completedIds ?? []).includes(todayChallenge.id);

	const isActive = (path: string) => {
		if (path === "/") {
			return currentPath === "/";
		}
		return currentPath.startsWith(path);
	};

	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-background z-[60] pb-[env(safe-area-inset-bottom)]">
			<div className="max-w-7xl mx-auto px-2 sm:px-4">
				<div className="flex items-center justify-around h-16">
					{NAV_ITEMS.map((item) => {
						const active = isActive(item.to);
						const Icon = item.icon;

						return (
							<Link
								key={item.to}
								to={item.to}
								onClick={searchActive ? onSearchClose : undefined}
								className={`flex flex-col items-center gap-1 py-2 px-2 sm:px-4 transition-colors ${
									active
										? item.activeColor
										: "dark:text-zinc-400 text-zinc-600 dark:text-zinc-500 hover:text-zinc-600 dark:hover:dark:text-zinc-300 text-zinc-700"
								}`}
							>
								<div
									className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
										active ? item.glow : "bg-transparent"
									}`}
								>
									<Icon className="w-5 h-5" />
									{item.to === "/playground" && !challengeDone && !active && (
										<span className="absolute top-0 right-0 w-[8px] h-[8px] rounded-full bg-amber-400 border-[1.5px] border-background" />
									)}
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

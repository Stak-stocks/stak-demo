import { Link, useRouterState } from "@tanstack/react-router";
import { useAccount } from "@/context/AccountContext";
import { NAV_ITEMS, isNavItemActive, hasCompletedTodaysChallenge } from "@/lib/navItems";

export function BottomNav({ onSearchClose, searchActive }: { onSearchClose?: () => void; searchActive?: boolean }) {
	const router = useRouterState();
	const currentPath = router.location.pathname;
	const { account } = useAccount();

	const challengeDone = hasCompletedTodaysChallenge(account?.lessonProgress);

	const isActive = (path: string) => isNavItemActive(currentPath, path);

	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-foreground/[0.06] z-[60] pb-[env(safe-area-inset-bottom)]">
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
								className={`flex flex-col items-center gap-[3px] py-2 px-3 sm:px-5 transition-colors ${
									active
										? item.activeColor
										: "text-slate-400 dark:text-zinc-500 hover:text-foreground/70"
								}`}
							>
								{/* Icon with tinted background when active */}
								<div className={`relative w-[38px] h-[34px] rounded-[10px] flex items-center justify-center transition-all ${active ? item.activeBg : ""}`}>
									<Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2.2 : 1.8} />
									{item.to === "/playground" && !challengeDone && (
										<span className="absolute top-[2px] right-[2px] w-[7px] h-[7px] rounded-full bg-amber-400 border-[1.5px] border-background" />
									)}
								</div>
								{/* Label */}
								<span className="text-[10px] font-semibold whitespace-nowrap">{item.label}</span>
								{/* Active dot indicator */}
								<div className={`h-[3px] w-[16px] rounded-full transition-all duration-200 ${active ? item.dotColor : "bg-transparent"}`} />
							</Link>
						);
					})}
				</div>
			</div>
		</nav>
	);
}

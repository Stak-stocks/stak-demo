import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navItems";
import { TAB_ICONS, type TabPath } from "@/components/nav/tabIcons";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PHONE_MAX_WIDTH, useFigmaUnit } from "@/components/discover/useFigmaUnit";

const ICON_KEY: Record<string, string> = { "/": "home", "/discover": "discover", "/my-stak": "mystak", "/simulate": "simulate" };

function TabGlyph({ path }: { path: TabPath }) {
	return (
		<path
			d={path.d}
			fill={path.fill ?? "none"}
			stroke={path.stroke}
			strokeWidth={path.strokeWidth}
			strokeLinecap={path.cap}
			strokeLinejoin={path.join}
		/>
	);
}

/** One tab's icon: the filled white glyph when active, the grey outline otherwise (News is a PNG on Android). */
function TabIcon({ to, active }: { to: string; active: boolean }) {
	if (to === "/feed") {
		return <img src={active ? "/app/ic_tab_news_active.png" : "/app/ic_tab_news.png"} alt="" draggable={false} style={{ width: cu(24), height: cu(24) }} />;
	}
	const key = `${ICON_KEY[to]}${active ? "Active" : "Inactive"}`;
	return (
		<svg viewBox="0 0 24 24" style={{ width: cu(24), height: cu(24) }} aria-hidden="true">
			{TAB_ICONS[key]?.map((p, i) => <TabGlyph key={i} path={p} />)}
		</svg>
	);
}

/** Android's bottom tab bar: 86u, #060C1D, five tabs 30u apart, white Inter labels; only the icon shows which is active. */
export function BottomNav() {
	const router = useRouterState();
	const currentPath = router.location.pathname;
	const unit = useFigmaUnit();

	return (
		<nav
			aria-label="Main"
			className="fixed bottom-0 left-0 right-0 z-[60] pb-[env(safe-area-inset-bottom)]"
			style={{ background: DISC.tabBar, ["--u" as string]: `${unit}px` }}
		>
			<div className="mx-auto flex justify-center" style={{ maxWidth: PHONE_MAX_WIDTH, height: cu(86), paddingTop: cu(18), gap: cu(30), transform: `translateX(${cu(0.5)})` }}>
				{NAV_ITEMS.map((item) => {
					const active = isNavItemActive(currentPath, item.to);
					return (
						<Link
							key={item.to}
							to={item.to}
							aria-current={active ? "page" : undefined}
							className="flex flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
							style={{ gap: cu(10), width: item.to === "/" ? cu(34) : undefined, outlineColor: DISC.teal }}
						>
							<TabIcon to={item.to} active={active} />
							<span className="whitespace-nowrap" style={{ font: `400 ${cu(12)} Inter, var(--font-body)`, color: "#fff" }}>{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}

import { Link, useRouterState } from "@tanstack/react-router";
import { DESKTOP_NAV_ITEMS, isNavItemActive } from "@/lib/navItems";
import { DESK, deskFocus } from "@/components/desktop/deskKit";
import { Wordmark } from "@/components/home/HomeHeader";
import stakMark from "@/assets/stak-logo-icon.svg";

/** Desktop nav chrome (above the useIsMobile() breakpoint), from the user's desktop design: logo, the
 *  entries in DESKTOP_NAV_ITEMS and the "Investing made simple." card. Mobile keeps BottomNav. */
export function SideNav() {
	const currentPath = useRouterState({ select: (s) => s.location.pathname });

	return (
		<nav aria-label="Main" className="fixed bottom-0 left-0 top-0 z-[60] flex w-[220px] flex-col" style={{ background: DESK.bg, borderRight: `1px solid ${DESK.border}` }}>
			<Link to="/" aria-label="STAK home" className={`mx-5 mb-7 mt-6 flex items-center gap-2 rounded-md ${deskFocus}`}>
				<img src={stakMark} alt="" className="h-[30px] w-[30px]" draggable={false} />
				<Wordmark width={78} />
			</Link>
			<ul className="flex flex-1 flex-col gap-1 px-3">
				{DESKTOP_NAV_ITEMS.map((item) => {
					const active = isNavItemActive(currentPath, item.to) || (item.alsoActiveOn ?? []).some((p) => isNavItemActive(currentPath, p));
					const Icon = item.icon;
					return (
						<li key={item.to}>
							<Link
								to={item.to}
								aria-current={active ? "page" : undefined}
								className={`flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-[13.5px] font-medium transition-colors ${deskFocus} ${active ? "" : "hover:bg-white/[0.04] hover:text-white"}`}
								style={active
									? { color: "#fff", background: DESK.panel, boxShadow: `inset 2px 0 0 ${DESK.cyan}` }
									: { color: DESK.body }}
							>
								<Icon className="h-[18px] w-[18px] shrink-0" style={{ color: active ? DESK.cyan : undefined }} strokeWidth={1.9} aria-hidden="true" />
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
			<div className="relative m-3 overflow-hidden rounded-[12px] px-4 pb-4 pt-12" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }}>
				<svg viewBox="0 0 200 60" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[52px] w-full" aria-hidden="true">
					<path d="M0 44 C40 20 70 50 110 30 S170 8 200 22" fill="none" stroke={DESK.cyan} strokeOpacity="0.55" strokeWidth="1.2" />
					<path d="M0 52 C45 32 80 58 120 40 S175 20 200 34" fill="none" stroke={DESK.cyan} strokeOpacity="0.25" strokeWidth="1" />
				</svg>
				<p className="text-[13px] leading-[18px]" style={{ color: DESK.body }}>Investing<br />made simple.</p>
			</div>
		</nav>
	);
}

import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { viewportHeight } from "./FitCanvas";
import { type NavKey, Sidebar } from "./Sidebar";
import { SidebarSkeleton } from "./SidebarSkeleton";

const NAV_KEY = "stak.nav.open";
/** The slot inside <main> that ExampleTopBar renders into. */
export const EXAMPLE_TOPBAR_ID = "stak-example-topbar";

function readNavOpen(): boolean {
	try {
		const v = localStorage.getItem(NAV_KEY);
		return v === null ? true : v === "1";
	} catch {
		return true;
	}
}

export function activeFromPath(pathname: string): NavKey {
	if (pathname.startsWith("/news")) return "news";
	if (pathname.startsWith("/discover") || pathname.startsWith("/stocks")) return "discover";
	if (pathname.startsWith("/my-stak")) return "mystak";
	if (pathname.startsWith("/simulate")) return "simulate";
	if (pathname.startsWith("/profile")) return "profile";
	return "home";
}

/**
 * Desktop frame: sidebar (216 open / 72 closed) + content column that starts 40px (open) or 24px (closed)
 * after the sidebar, 88px from the top, with a 50px right margin — the geometry of every 1440 frame.
 */
export function AppShell({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState<boolean>(readNavOpen);
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const search = useRouterState({ select: (s) => s.location.search as { nav?: string; loading?: string | number | boolean } });
	const loading = search.loading === 1 || search.loading === "1" || search.loading === true;
	const forced = search.nav === "closed" ? false : search.nav === "open" ? true : undefined;
	const navOpen = forced ?? open;

	useEffect(() => {
		try {
			localStorage.setItem(NAV_KEY, open ? "1" : "0");
		} catch {
			/* storage unavailable */
		}
	}, [open]);

	const toggle = useCallback(() => setOpen((v) => !v), []);

	return (
		<div className="stak-figma flex bg-[#0a1020] font-geist text-[#f2f6fc] antialiased" style={{ minHeight: viewportHeight() }}>
			{loading ? (
				<SidebarSkeleton active={activeFromPath(pathname) === "discover" ? "discover" : "home"} />
			) : <Sidebar open={navOpen} active={activeFromPath(pathname)} onToggle={toggle} />}
			{/* relative: the EXAMPLE frames' 64px top bar (ExampleTopBar) is positioned against the content area */}
			<main className="relative min-w-0 flex-1">
				{/* the EXAMPLE frames' 64px top bar portals here (ExampleTopBar), above the page's own positioned wrappers */}
				<div id={EXAMPLE_TOPBAR_ID} className="pointer-events-none absolute inset-x-0 top-0 h-[64px]" />
				<div className="pr-[50px] pt-[88px] transition-[padding-left] duration-[280ms] ease-in-out" style={{ paddingLeft: navOpen ? 40 : 24 }}>
					{children}
				</div>
			</main>
		</div>
	);
}

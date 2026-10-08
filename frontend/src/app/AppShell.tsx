import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { type NavKey, Sidebar } from "./Sidebar";

const NAV_KEY = "stak.nav.open";

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
	const search = useRouterState({ select: (s) => s.location.search as { nav?: string } });
	const forced = search?.nav === "closed" ? false : search?.nav === "open" ? true : undefined;
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
		<div className="flex min-h-screen bg-[#0a1020] font-geist text-[#f2f6fc] antialiased">
			<Sidebar open={navOpen} active={activeFromPath(pathname)} onToggle={toggle} />
			<main className="min-w-0 flex-1">
				<div className="pr-[50px] pt-[88px]" style={{ paddingLeft: navOpen ? 40 : 24 }}>
					{children}
				</div>
			</main>
		</div>
	);
}

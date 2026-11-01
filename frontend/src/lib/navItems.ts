// The app's nav entries. Mobile (BottomNav.tsx) shows Android's five tabs, Home/News/Discover/My STAK/Simulate,
// all backed by the same server data as Android (Simulate shares /api/sandbox/* with it). Desktop (SideNav.tsx)
// follows the user's desktop design instead: DESKTOP_NAV_ITEMS below adds STAK AI and Settings (Profile).
import { Newspaper, LayoutDashboard, Search, Bookmark, BarChart3, Settings, Sparkles, type LucideIcon } from "lucide-react";

export interface NavItem {
	to: string;
	label: string;
}

export const NAV_ITEMS: NavItem[] = [
	{ to: "/", label: "Home" },
	{ to: "/feed", label: "News" },
	{ to: "/discover", label: "Discover" },
	{ to: "/my-stak", label: "My STAK" },
	{ to: "/simulate", label: "Simulate" },
];

export interface DesktopNavItem {
	to: string;
	label: string;
	icon: LucideIcon;
	/** Other paths that light this entry up (Settings covers every /profile page and the inbox). */
	alsoActiveOn?: string[];
}

/** The desktop sidebar (the user's desktop design): Settings is the Profile hub. Mobile keeps Android's five tabs
 *  above. Learn (Playground) is off until v2 (user, 2026-10-05). */
export const DESKTOP_NAV_ITEMS: DesktopNavItem[] = [
	{ to: "/", label: "Home", icon: LayoutDashboard },
	{ to: "/feed", label: "News", icon: Newspaper },
	{ to: "/discover", label: "Discover", icon: Search },
	{ to: "/my-stak", label: "My STAK", icon: Bookmark },
	{ to: "/simulate", label: "Simulate", icon: BarChart3 },
	// STAK AI (2026-10-01): its own way in on desktop; the phone opens it from the Home and News headers.
	{ to: "/stak-ai", label: "STAK AI", icon: Sparkles },
	{ to: "/profile", label: "Settings", icon: Settings, alsoActiveOn: ["/notifications"] },
];

export function isNavItemActive(currentPath: string, itemPath: string): boolean {
	if (itemPath === "/") return currentPath === "/";
	return currentPath.startsWith(itemPath);
}


// The app's nav entries. Mobile (BottomNav.tsx) shows Android's five tabs, Home/News/Discover/My STAK/Simulate,
// all backed by the same server data as Android (Simulate shares /api/sandbox/* with it). Desktop (SideNav.tsx)
// follows the user's desktop design instead: DESKTOP_NAV_ITEMS below adds Learn (Playground) and Settings (Profile).
import { Newspaper, LayoutDashboard, Search, Bookmark, BarChart3, BookOpen, Settings, type LucideIcon } from "lucide-react";

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

/** The desktop sidebar (the user's desktop design): Learn opens Playground's
 *  lessons, Settings is the Profile hub. Mobile keeps Android's five tabs above. */
export const DESKTOP_NAV_ITEMS: DesktopNavItem[] = [
	{ to: "/", label: "Home", icon: LayoutDashboard },
	{ to: "/feed", label: "News", icon: Newspaper },
	{ to: "/discover", label: "Discover", icon: Search },
	{ to: "/my-stak", label: "My STAK", icon: Bookmark },
	{ to: "/simulate", label: "Simulate", icon: BarChart3 },
	{ to: "/playground", label: "Learn", icon: BookOpen },
	{ to: "/profile", label: "Settings", icon: Settings, alsoActiveOn: ["/notifications"] },
];

export function isNavItemActive(currentPath: string, itemPath: string): boolean {
	if (itemPath === "/") return currentPath === "/";
	return currentPath.startsWith(itemPath);
}

/** True once today's "featured today" lesson is completed; until then the desktop Learn entry shows a dot. */
export function hasCompletedTodaysChallenge(lessonProgress: Record<string, { completed: boolean; completedAt: number }> | undefined): boolean {
	const todayMidnight = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
	return Object.entries(lessonProgress ?? {}).some(
		([key, p]) => key.startsWith("featured-today-") && p.completed && p.completedAt >= todayMidnight,
	);
}

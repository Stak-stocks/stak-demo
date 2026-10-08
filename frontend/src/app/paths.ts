/**
 * Routes of the desktop app rebuilt from the Figma desktop frames. The root route renders these
 * bare (no mobile shell, no auth bounce); the list grows as each old screen is replaced.
 */
export const DESKTOP_APP_PREFIXES = [
	"/",
	"/home",
	"/news",
	"/discover",
	"/stocks",
	"/my-stak",
	"/simulate",
	"/profile",
	"/notifications",
	"/splash",
	"/check-email",
	"/login",
	"/signup",
	"/forgot-password",
	"/reset-password",
	"/onboarding",
] as const;

/** Pages rendered inside the sidebar shell (the _app layout); the rest are standalone 1440 compositions. */
export const SHELL_PREFIXES = ["/home", "/news", "/discover", "/stocks", "/my-stak", "/simulate", "/profile"] as const;

export function isShellPath(pathname: string): boolean {
	return SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isDesktopAppPath(pathname: string): boolean {
	return DESKTOP_APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

import { useEffect } from "react";
import { isDesktopAppPath } from "./paths";

/** The marketing page keeps the title index.html ships; the app sets its own per screen. */
const BASE_TITLE = typeof document !== "undefined" ? document.title : "STAK";

const TITLES: [RegExp, (m: RegExpMatchArray) => string][] = [
	[/^\/home\/?$/, () => "Home"],
	[/^\/news\/?$/, () => "News"],
	[/^\/news\/[^/]+$/, () => "Article · News"],
	[/^\/discover\/end\/?$/, () => "Deck complete · Discover"],
	[/^\/discover\/?$/, () => "Discover"],
	[/^\/stocks\/([^/]+)$/, (m) => `${decodeURIComponent(m[1]!).toUpperCase()}`],
	[/^\/my-stak\/?$/, () => "My STAK"],
	[/^\/my-stak\/[^/]+$/, () => "Collection · My STAK"],
	[/^\/simulate\/?$/, () => "Simulate"],
	[/^\/simulate\/portfolio\/?$/, () => "Portfolio · Simulate"],
	[/^\/simulate\/leaderboard\/?$/, () => "Leaderboard · Simulate"],
	[/^\/simulate\/picks\/([^/]+)$/, (m) => `${decodeURIComponent(m[1]!).toUpperCase()} · Simulate`],
	[/^\/profile\/?$/, () => "Profile"],
	[/^\/profile\/edit\/?$/, () => "Edit profile"],
	[/^\/profile\/taste-risk\/?$/, () => "Taste & risk"],
	[/^\/login\/?$/, () => "Sign in"],
	[/^\/signup\/?$/, () => "Sign up"],
	[/^\/forgot-password\/?$/, () => "Forgot password"],
	[/^\/check-email\/?$/, () => "Check your email"],
	[/^\/reset-password\/?$/, () => "Set a new password"],
	[/^\/onboarding\/?$/, () => "Welcome"],
	[/^\/splash\/?$/, () => "STAK"],
];

export function titleFor(pathname: string): string | null {
	if (!isDesktopAppPath(pathname)) return null;
	for (const [re, fn] of TITLES) {
		const m = pathname.match(re);
		if (m) {
			const t = fn(m);
			return t === "STAK" ? "STAK" : `${t} · STAK`;
		}
	}
	return "STAK";
}

/** Keeps document.title in step with the screen; a page may override it with its own content. */
export function useDocumentTitle(pathname: string, override?: string | null) {
	useEffect(() => {
		const t = override ? `${override} · STAK` : titleFor(pathname);
		document.title = t ?? BASE_TITLE;
	}, [pathname, override]);
}

/**
 * Each page's browser-tab title (WCAG 2.4.2: every page says what it is - a screen reader reads it on arrival).
 * "<Page> · STAK"; a stock or a pick names its ticker.
 */
const TITLES: Record<string, string> = {
	"/": "Home",
	"/welcome": "STAK — Discover Stocks You Actually Vibe With",
	"/login": "Sign in",
	"/signup": "Create account",
	"/forgot-password": "Reset password",
	"/discover": "Discover",
	"/feed": "News",
	"/feed/article": "Article",
	"/feed/daily-brief": "Daily brief",
	"/my-stak": "My STAK",
	"/my-stak/collections": "Collections",
	"/my-stak/taste": "Your investing taste",
	"/my-stak/updates": "Updates",
	"/notifications": "Notifications",
	"/simulate": "Simulate",
	"/simulate/portfolio": "Your portfolio",
	"/stak-ai": "STAK AI",
	"/stak-ai/history": "STAK AI history",
	"/profile": "Profile",
	"/profile/app-settings": "App settings",
	"/profile/appearance": "Appearance",
	"/profile/help-support": "Help & support",
	"/profile/notifications": "Notifications",
	"/profile/personal-details": "Personal details",
	"/profile/security": "Security",
	"/profile/sign-in": "Sign-in methods",
	"/profile/taste": "Taste & risk",
	"/terms": "Terms of Service",
	"/privacy": "Privacy Policy",
	"/support": "Help & support",
	"/onboarding": "Welcome",
	"/onboarding/brand-picks": "Pick some brands",
	"/onboarding/goal": "Your goal",
	"/onboarding/risk": "Your risk style",
	"/onboarding/swipe-tutorial": "How swiping works",
	"/onboarding/preparing": "Preparing your deck",
	"/onboarding/taste-reveal": "Your investing taste",
	"/onboarding/permissions": "Notifications",
	"/onboarding/profile-setup": "Your profile",
};

const PUBLIC_DESCRIPTIONS: Record<string, string> = {
	"/support": "Get help with STAK: email support, report a problem, delete your account, and answers to common questions.",
	"/terms": "STAK's Terms of Service.",
	"/privacy": "How STAK collects, uses and protects your information.",
};

/**
 * The public pages' own canonical link and description, so search engines don't fold /support, /terms and /privacy
 * into the home page (index.html carries the landing page's). Every other page keeps index.html's.
 */
export function syncPageMeta(pathname: string): void {
	const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
	const own = PUBLIC_DESCRIPTIONS[path];
	const url = own ? `https://thestak.org${path}` : "https://thestak.org/";
	document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
	document.querySelector('meta[property="og:url"]')?.setAttribute("content", url);
	const description = document.querySelector('meta[name="description"]');
	if (description) {
		const landing = description.getAttribute("data-landing") ?? description.getAttribute("content") ?? "";
		description.setAttribute("data-landing", landing);
		description.setAttribute("content", own ?? landing);
	}
}

export function pageTitle(pathname: string): string {
	const path = pathname.replace(/\/+$/, "") || "/";
	if (path === "/welcome") return TITLES["/welcome"]!;
	const stock = /^\/stock\/([^/]+)$/.exec(path) ?? /^\/simulate\/pick\/([^/]+)$/.exec(path);
	if (stock) return `${decodeURIComponent(stock[1]!).toUpperCase()} · STAK`;
	if (/^\/my-stak\/collection\//.test(path)) return "Collection · STAK";
	return `${TITLES[path] ?? "STAK"} · STAK`.replace("STAK · STAK", "STAK");
}

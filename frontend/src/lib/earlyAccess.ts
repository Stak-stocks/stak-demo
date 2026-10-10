import { NEW_ACCOUNT_WINDOW_MS } from "@stak/shared";

/**
 * Early access (2026-10-05): new accounts can't be made on the web; visitors join the waitlist on /welcome instead.
 * Signing in still works for existing accounts (teammates, testers), including ones that haven't finished onboarding.
 * Flip this to reopen sign-up.
 * Note: Google sign-in creates a Supabase user on its own, so the root route signs a brand-new one out (see
 * isBrandNewAccount) and, when this tab started that Google sign-in, removes it (POST /api/me/turned-away, which only
 * deletes a Google account minutes old, never onboarded, with nothing on the server). Supabase's own "allow new
 * sign-ups" setting would also stop Android, still open to the team.
 */
export const WEB_SIGNUP_OPEN = false;

/** Set when this tab sends someone to Google, so only an account this tab's sign-in made is ever removed. */
export const WEB_GOOGLE_SIGN_IN_KEY = "stak.webGoogleSignIn";

/**
 * An account created moments ago that hasn't finished onboarding: during early access, one the web shouldn't have
 * made (a first Google sign-in). Decided from the auth account's age rather than the app's account row, which a
 * new user doesn't have until their first server request.
 */
export function isBrandNewAccount(createdAt: string | null | undefined, onboarded: boolean | undefined, now = Date.now()): boolean {
	if (WEB_SIGNUP_OPEN || onboarded === true || !createdAt) return false;
	const t = Date.parse(createdAt);
	return Number.isFinite(t) && now - t < NEW_ACCOUNT_WINDOW_MS;
}

/** /welcome with the early-access form already open. */
export const JOIN_WAITLIST = { to: "/welcome", search: { join: "1" } } as const;

/**
 * Web lock (2026-10-09): only the landing page, Terms and Privacy are open on the web - not Sign in, not the app, even
 * for someone already signed in (whose session isn't even loaded; see AuthContext). The team gets in by opening the
 * site once with ?team=<code>, which this browser then remembers (?team=off forgets it). Only the code's SHA-256 is
 * here, so the bundle doesn't give it away. It's a door, not security: the API still checks every request itself.
 * Flip WEB_LOCKED to open the web again.
 */
export const WEB_LOCKED = true;
/** Pages anyone may read, without the app around them; the apps' Settings link to them too. */
export const LEGAL_PATHS: readonly string[] = ["/terms", "/privacy"];
export const WEB_PUBLIC_PATHS: readonly string[] = ["/welcome", ...LEGAL_PATHS];
const TEAM_ACCESS_KEY = "stak.teamAccess";
export const TEAM_CODE_SHA256 = "3d547cdeb1698872595f6ed3e8e3d91bca004185360748573e7779fb3782ae66";

function hasTeamAccess(): boolean {
	try { return localStorage.getItem(TEAM_ACCESS_KEY) === "1"; } catch { return false; }
}

/** This visitor may only see the public pages. */
export function isWebLockedOut(): boolean {
	return WEB_LOCKED && !hasTeamAccess();
}

/** This path is closed to this visitor; they belong on the landing page. */
export function isLockedPath(pathname: string): boolean {
	return isWebLockedOut() && !WEB_PUBLIC_PATHS.includes(pathname.replace(/\/+$/, "").toLowerCase() || "/");
}

/** A Supabase session is saved in this browser: someone who used the web app before the lock. */
export function hasSavedWebSession(): boolean {
	try { return Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token")); } catch { return false; }
}

/**
 * Takes ?team=<code> out of the address and returns it (null when there's none). Called before the router is made, so
 * the router never reads the code, and it isn't left in history or passed on in links.
 */
export function takeTeamCodeFromUrl(): string | null {
	const url = new URL(window.location.href);
	const code = url.searchParams.get("team");
	if (code === null) return null;
	url.searchParams.delete("team");
	window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
	return code.trim();
}

async function sha256Hex(text: string): Promise<string> {
	const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type TeamAccessChange = "unlocked" | "wrong" | "relocked";

let teamAccessChange: TeamAccessChange | null = null;

/** What a team link just did, for the root route to say once it's on screen: given out once, then null. */
export function takeTeamAccessChange(): TeamAccessChange | null {
	const change = teamAccessChange;
	teamAccessChange = null;
	return change;
}

/**
 * Applies a team link before the app renders: the right code unlocks this browser, "off" locks it again. The hash
 * needs a secure page (https or localhost); anywhere else the link counts as wrong and the browser stays locked.
 */
export async function applyTeamCode(code: string | null): Promise<void> {
	if (code === null) return;
	try {
		if (code.toLowerCase() === "off") {
			localStorage.removeItem(TEAM_ACCESS_KEY);
			teamAccessChange = "relocked";
		} else if ((await sha256Hex(code)) === TEAM_CODE_SHA256) {
			localStorage.setItem(TEAM_ACCESS_KEY, "1");
			teamAccessChange = "unlocked";
		} else {
			teamAccessChange = "wrong";
		}
	} catch {
		teamAccessChange = "wrong";
	}
}

/**
 * Early access (2026-10-05): new accounts can't be made on the web; visitors join the waitlist on /welcome instead.
 * Signing in still works for existing accounts (teammates, testers), including ones that haven't finished onboarding.
 * Flip this to reopen sign-up.
 * Note: Google sign-in creates a Supabase user on its own, so the root route removes a brand-new one (POST
 * /api/me/turned-away, which only deletes an account minutes old, never onboarded and empty) and signs it out (see
 * isBrandNewAccount). Supabase's own "allow new sign-ups" setting would also stop Android, still open to the team.
 */
export const WEB_SIGNUP_OPEN = false;

/** How recently a sign-in account must have been created to count as one the web just made. */
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

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

/**
 * Early access (2026-10-05): new accounts can't be made on the web; visitors join the waitlist on /welcome instead.
 * Signing in still works for existing accounts (teammates, testers). Flip this to reopen sign-up.
 * Note: Google sign-in creates a Supabase user on its own, so a new Google account is signed straight back out by the
 * root route (it has never finished onboarding) - the empty auth user stays until it's cleaned up in Supabase.
 */
export const WEB_SIGNUP_OPEN = false;

/** /welcome with the early-access form already open. */
export const JOIN_WAITLIST = { to: "/welcome", search: { join: "1" } } as const;

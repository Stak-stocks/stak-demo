/**
 * Early access: how recently a sign-in account must have been created to count as brand new - one the web just made
 * by a first Google sign-in and turns away. The web (frontend/src/lib/earlyAccess.ts) and the server's removal of
 * such an account (POST /api/me/turned-away) use the same window.
 */
export const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

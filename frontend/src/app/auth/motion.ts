import "./motion.css";

/**
 * The auth flow's screen changes, as the Figma prototype wires them (phone page 0:1, read 2026-10-18; the desktop auth
 * frames 2:5601 / 2:5664 / 2:5619 / 2:1257 / 2:1566 / 2:1283 carry no reactions). Passed as `viewTransition` to the
 * router's navigate / Link; the timings live in motion.css.
 * The type names carry the `stak-auth-` prefix: the app's own `stak-dissolve` (styles.css, 300 ms, the Simulate flows)
 * is a different transition, and a shared name would let this file's 350 ms override it once an auth page has loaded.
 */
export type ViewTransition = { types: string[] };

/** DISSOLVE 0.35 s EASE_OUT: Splash -> Sign up after 1.2 s (1:883), Sign up "Sign in" (1:834) <-> Sign in "Create account" (1:882). */
export const DISSOLVE: ViewTransition = { types: ["stak-auth-dissolve"] };
/** PUSH direction LEFT 0.3 s EASE_OUT: the forward steps (Google 1:794 / 1:861, Apple 1:797 / 1:864, Create account 1:830, Sign in 1:878). */
export const PUSH_FORWARD: ViewTransition = { types: ["stak-auth-push-forward"] };
/** PUSH direction RIGHT 0.3 s EASE_OUT: the Back controls (1:826, 1:853). */
export const PUSH_BACK: ViewTransition = { types: ["stak-auth-push-back"] };

/** Figma "Onboarding · 00 Splash" (1:883): AFTER_TIMEOUT 1.2 s -> "Auth · Sign up". */
export const SPLASH_DELAY_MS = 1200;
/**
 * The splash's 1.2 s count from the moment its glass (a 2048 px image) is on screen, as the prototype shows the whole
 * frame for 1.2 s; on a slow connection it starts anyway after this wait, so the splash can never hold the visitor.
 */
export const SPLASH_GLASS_WAIT_MS = 2500;

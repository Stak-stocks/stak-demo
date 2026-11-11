import "./motion.css";

/**
 * The News screens' transitions, as the Figma prototype wires them (phone page 0:1; the desktop News frames carry no
 * reactions). Every other edge of these screens is INSTANT (`viewTransition: false`): the Apple story -> its article
 * (phone "Story tile" 1:1220 -> 1:1319), Back (1:1445 / 1:1735) and the hero bookmark (1:1326 -> 1:1603). Add to STAK
 * is the page's own Smart Animate (350 ms ease-out, 1:1337), played in place by the article page.
 */

/**
 * "View AAPL in My STAK" (the phone's "View in My STAK", 1:1599 -> 1:3501): PUSH left, 300 ms, ease-out (motion.css).
 * The desktop row leads to the saved stock detail entered from My STAK (2:5130), the 2026-10-08 cross-check's ruling.
 */
export const PUSH_FORWARD = { types: ["stak-news-push"] };

/** Add to STAK's Smart Animate (1:1337 -> 1:1451): 350 ms, Figma's EASE_OUT. */
export const SMART_MS = 350;
export const EASE_OUT = "cubic-bezier(0, 0, 0.58, 1)";

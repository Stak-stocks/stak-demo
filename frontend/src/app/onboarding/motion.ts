import type { useRouter } from "@tanstack/react-router";
import "./motion.css";

/**
 * The onboarding's screen changes, as the Figma prototype wires them (phone section 1:179, read 2026-10-11; the desktop
 * frames carry no reactions of their own). Passed as `viewTransition` to the router's navigate; the timings live in
 * motion.css. The swipe tutorial's deck (2:5895) has no motion anywhere in the file (no reaction on its cards, no
 * keyframes) and the product deck it teaches swaps its cards at once, so it carries none here either.
 */
export type ViewTransition = { types: string[] };

/** PUSH LEFT 0.3 s ease-out: Get started (1:230), Continue (1:340, 1:495, 1:566, 1:631), Proceed to home (1:785). */
export const PUSH_FORWARD: ViewTransition = { types: ["stak-onb-push-forward"] };
/** PUSH RIGHT 0.3 s ease-out: every Back (1:249, 1:361, 1:515, 1:586, 1:704). */
export const PUSH_BACK: ViewTransition = { types: ["stak-onb-push-back"] };
/** DISSOLVE 0.35 s ease-out: 06 Preparing deck -> 07 Taste reveal (1:635). */
export const DISSOLVE: ViewTransition = { types: ["stak-onb-dissolve"] };

/** "Onboarding · 06 Preparing deck" (1:635): AFTER_TIMEOUT 1.8 s -> "Onboarding · 07 Taste reveal". */
export const PREPARING_MS = 1800;

type Router = ReturnType<typeof useRouter>;
/** The <html data-stak-motion> value that marks a pop this page started itself. */
const POP_FLAG = "onb-pop";

/**
 * Returns to the previous history entry (the browser's Back, so no entry is added) with one of these screen changes.
 * src/main.tsx makes a pop instant unless <html data-stak-motion> is set when the pop arrives (the browser's own Back /
 * Forward swap at once); the flag is set before the pop, and the router's next view transition gets the push's type
 * (the same rules as a navigate's `viewTransition`). Both are cleared once the router has settled on the page it
 * returned to, or after two seconds if no pop came. `steps` pops that many entries in one go (the taste-quiz retake
 * returning to Taste & risk from 07 over the steps it pushed): one pop, one transition.
 */
export function backWithMotion(router: Router, transition: ViewTransition, steps = 1) {
	const root = document.documentElement;
	root.dataset.stakMotion = POP_FLAG;
	router.shouldViewTransition = transition;
	let cleared = false;
	const clear = () => {
		if (cleared) return;
		cleared = true;
		stop();
		clearTimeout(timer);
		if (root.dataset.stakMotion === POP_FLAG) delete root.dataset.stakMotion;
		if (router.shouldViewTransition === transition) router.shouldViewTransition = undefined;
	};
	const stop = router.subscribe("onResolved", clear);
	const timer = setTimeout(clear, 2000);
	if (steps > 1) router.history.go(-steps);
	else router.history.back();
}

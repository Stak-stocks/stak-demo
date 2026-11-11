import "./motion.css";

/**
 * The prototype's transitions (Figma "Web updated" reactions, completed from the phone page's wiring):
 * `instant` (Buy, Sell and Back are Instant), `dissolve` (DISSOLVE 300 ms ease-out), `push` (PUSH left, 300 ms
 * ease-out) and `smart` (SMART_ANIMATE 350 ms ease-out between two states of a sheet). See motion.css.
 */
export type Motion = "instant" | "dissolve" | "push" | "smart";

type Started = (transition: ViewTransition) => void;
const watchers = new Set<Started>();
let observing = false;

/** Lets withMotion see the view transition the router starts for its navigation (the call itself is unchanged). */
function observeViewTransitions() {
	if (observing || typeof document === "undefined" || typeof document.startViewTransition !== "function") return;
	observing = true;
	const start = document.startViewTransition.bind(document);
	document.startViewTransition = ((arg?: Parameters<typeof start>[0]) => {
		const transition = start(arg);
		for (const watch of [...watchers]) watch(transition);
		return transition;
	}) as typeof document.startViewTransition;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
let token = 0;

/**
 * Runs a navigation, or an action that ends in one (a paper buy, then its success sheet), with the prototype's
 * transition. The router wraps every navigation in a view transition; <html data-stak-motion> tells motion.css how
 * this one animates, and stays until that transition has finished (or until it is clear none is coming: a navigation
 * that opts out of view transitions). A newer motion takes over from an older one.
 */
export async function withMotion(motion: Motion, run: () => unknown): Promise<void> {
	if (typeof document === "undefined") {
		await run();
		return;
	}
	observeViewTransitions();
	const root = document.documentElement;
	const mine = ++token;
	let transition: ViewTransition | null = null;
	const watch: Started = (t) => {
		transition ??= t;
	};
	watchers.add(watch);
	root.dataset.stakMotion = motion;
	try {
		await run();
		// the router starts the transition once the next match has loaded
		const deadline = performance.now() + (motion === "instant" ? 400 : 1500);
		while (!transition && performance.now() < deadline) await nextFrame();
		if (transition) await (transition as ViewTransition).finished.catch(() => undefined);
	} finally {
		watchers.delete(watch);
		if (token === mine) delete root.dataset.stakMotion;
	}
}

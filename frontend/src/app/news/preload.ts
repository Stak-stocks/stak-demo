import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

type Target = { to: "/news" } | { to: "/news/$id"; params: { id: string } } | { to: "/stocks/$symbol"; params: { symbol: string } };

/**
 * The prototype's News edges are INSTANT (the Apple story -> its article, Back) or a 300 ms push (View in My STAK).
 * The routes are code-split and only preload on hover intent, so a quick first click would wait for the next screen's
 * code; this loads the screens a News page leads to once the page is idle. The routes have no loaders: only code.
 *
 * So it loads only the routes' CODE (router.loadRouteChunk), never router.preloadRoute: a preload builds route matches,
 * and router-core 1.171.13 loses a preloaded match when the page's own load or a Back settles at the same moment
 * ('Cannot read properties of undefined (reading _nonReactive)' at loadRouteMatch: logged on 50 of 51 article loads in
 * the 2026-11-11 crawls). Loading the chunk alone creates no match, so nothing can race (coordinator, BUILD-PLAN N57).
 */
export function usePreloadNext(targets: readonly Target[]) {
	const router = useRouter();
	// the targets are literals of the calling page; they are read once, when it mounts
	// biome-ignore lint/correctness/useExhaustiveDependencies: the list is constant per page
	useEffect(() => {
		const run = () => {
			for (const target of targets) {
				const route = router.routesByPath[target.to];
				if (route) Promise.resolve(router.loadRouteChunk(route)).catch(() => {});
			}
		};
		const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
		if (w.requestIdleCallback) {
			const id = w.requestIdleCallback(run, { timeout: 1500 });
			return () => w.cancelIdleCallback?.(id);
		}
		const t = window.setTimeout(run, 300);
		return () => window.clearTimeout(t);
	}, [router]);
}

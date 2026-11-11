/**
 * The Today's brief card comes back as the person left it (the review of 2026-11-09: dot 2, the Fed minutes brief, its
 * article, Back, and the card showed the first brief again). Both phones keep their pager on the page the person left
 * while the listing stays in the back stack (android ui/news/NewsScreen.kt:258-260 `rememberPagerState`, saved with the
 * screen; iOS StakDemo/News/NewsView.swift:184 `@State private var page`, :200 `.scrollPosition(id: $page)`).
 *
 * The website's listing is unmounted while an article is open, so the brief on show is remembered here, per HISTORY
 * ENTRY of the listing (the router's key of the entry: `location.state.__TSR_key`, the identity its own scroll
 * restoration uses) and for the set of briefs the card carried:
 * - stepping back (or forward) to that entry finds its brief: the article's Back arrow, the browser's Back;
 * - a fresh visit is another entry (the rail's News link, a typed address) and starts at the first brief, as does a new
 *   set of search hits (another set of briefs) and a reload (the page's memory starts empty: at load the card shows the
 *   frame's own brief, the ruling of 2026-11-01);
 * - the listing's search rewrites its entry as the person types (a new key each time): the card reports its brief again
 *   under each key, so the entry the person leaves is always the one remembered.
 * Only the page's own memory: nothing is stored, nothing outlives the tab's document.
 */

type Shown = { readonly briefs: string; readonly index: number };

/** How many listing entries are remembered (a tab's back stack rarely holds more listings than this). */
const KEPT = 24;
const shown = new Map<string, Shown>();

/** The card reports the brief on show: `entry` the listing's history entry, `briefs` the ids of the briefs it carries. */
export function rememberBrief(entry: string | undefined, briefs: string, index: number): void {
	if (!entry) return;
	// the newest last: the oldest entry is the one forgotten
	shown.delete(entry);
	shown.set(entry, { briefs, index });
	if (shown.size > KEPT) shown.delete(shown.keys().next().value as string);
}

/**
 * The brief the card starts on: the one this entry showed with these same briefs when the person left it, otherwise
 * the first (also for an index the card no longer has).
 */
export function recallBrief(entry: string | undefined, briefs: string, count: number): number {
	const was = entry ? shown.get(entry) : undefined;
	if (!was || was.briefs !== briefs) return 0;
	return Number.isInteger(was.index) && was.index >= 0 && was.index < count ? was.index : 0;
}

/** Forget everything (tests). */
export function forgetBriefs(): void {
	shown.clear();
}

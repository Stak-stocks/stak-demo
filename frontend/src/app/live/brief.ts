/**
 * The companies today's brief is about, one per story, in the brief's own order (News' Today's brief 2:4372 pages
 * through three stories: the Dow's record, the Fed's minutes, the June jobs report). The inbox's daily-brief row counts
 * how many of them touch the person's saves (notifications.ts briefLine; the hunt's C-07).
 *
 * The stories themselves live in src/app/news (data.ts newsListing.briefs, articles.ts). Until the review of 2026-11-09
 * (BUILD-PLAN N32e, follow-up F4) notifications.ts read this list out of them, which pulled the whole of the story text
 * (about 48 KB) into the app shell's chunk, for the bell every page carries, and made the live layer depend on a page
 * area. The list is three pairs, so it is kept here, and a unit test reads the News data and fails when a brief's
 * story or its company no longer matches (src/app/live/__tests__/ledger.unit.test.ts, "the brief's companies").
 */
export const BRIEF_COMPANIES: readonly { readonly story: string; readonly ticker: string }[] = [
	{ story: "dow-record-chips", ticker: "GS" },
	{ story: "fed-minutes", ticker: "JPM" },
	{ story: "june-jobs-miss", ticker: "O" },
];

/** The tickers of today's brief, one per story. */
export const briefTickers = (): string[] => BRIEF_COMPANIES.map((b) => b.ticker);

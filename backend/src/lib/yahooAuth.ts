/**
 * Shared Yahoo Finance crumb authentication.
 * Used by earningsConsensus.ts and earningsResultConsensus.ts.
 * The crumb+cookie pair is module-level cached for 55 minutes to avoid
 * re-fetching on every request, and a pending-promise lock prevents
 * concurrent duplicate fetches.
 */

export interface YahooCrumbCache {
	crumb: string;
	cookie: string;
	fetchedAt: number;
}

let yahooCrumbCache: YahooCrumbCache | null = null;
let yahooCrumbPending: Promise<YahooCrumbCache | null> | null = null;
const YAHOO_CRUMB_TTL_MS = 55 * 60 * 1000; // 55 minutes

async function fetchYahooCrumb(): Promise<YahooCrumbCache | null> {
	try {
		// Step 1: Hit fc.yahoo.com to obtain the A3 consent cookie
		const consentRes = await fetch("https://fc.yahoo.com/", {
			headers: { "User-Agent": "Mozilla/5.0" },
			redirect: "follow",
			signal: AbortSignal.timeout(8000),
		});
		const rawCookies = consentRes.headers.get("set-cookie") ?? "";
		const a3Match = rawCookies.match(/A3=[^;]+/);
		const cookie = a3Match ? a3Match[0] : "";

		// Step 2: Exchange the cookie for a crumb token
		const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
			headers: {
				"User-Agent": "Mozilla/5.0",
				...(cookie ? { "Cookie": cookie } : {}),
			},
			signal: AbortSignal.timeout(8000),
		});
		if (!crumbRes.ok) return null;
		const crumb = (await crumbRes.text()).trim();
		// An HTML response means we got an error page, not a crumb
		if (!crumb || crumb.startsWith("<")) return null;

		return { crumb, cookie, fetchedAt: Date.now() };
	} catch {
		return null;
	}
}

/**
 * Returns a valid Yahoo crumb+cookie pair, fetching a fresh one if needed.
 * Uses a shared pending promise to prevent concurrent duplicate fetches.
 */
export async function getYahooCrumb(): Promise<YahooCrumbCache | null> {
	const now = Date.now();
	if (yahooCrumbCache && now - yahooCrumbCache.fetchedAt < YAHOO_CRUMB_TTL_MS) {
		return yahooCrumbCache;
	}

	// Deduplicate concurrent fetches — reuse the in-flight promise if one exists
	if (!yahooCrumbPending) {
		yahooCrumbPending = fetchYahooCrumb().then((result) => {
			yahooCrumbCache = result;
			yahooCrumbPending = null;
			return result;
		});
	}
	return yahooCrumbPending;
}

export function invalidateYahooCrumb(): void {
	yahooCrumbCache = null;
	// Don't cancel a pending fetch — it will resolve and cache null, which is fine
}

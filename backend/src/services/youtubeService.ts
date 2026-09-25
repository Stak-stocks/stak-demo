import { cacheGet, cacheSet } from "../lib/cache.js";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — videos don't change per article

function getKey(): string | null {
	return process.env.YOUTUBE_API_KEY ?? null;
}

/**
 * Finds the most relevant YouTube video for a given article.
 * Uses the article's own datetime to anchor a ±2h–48h window so the video
 * matches the same news cycle, not a years-old clip.
 * Returns a youtube.com/watch URL, or null when unavailable/unconfigured.
 */
export async function searchYouTubeVideo(
	query: string,
	articleUrl: string,
	articleDatetime?: number, // Unix seconds
): Promise<string | null> {
	const apiKey = getKey();
	if (!apiKey) return null;

	const urlHash = Buffer.from(articleUrl).toString("base64url").slice(0, 80);
	const cacheKey = `youtube:news:v3:${urlHash}`; // v3: embeddable-only filter

	const cached = await cacheGet<string>(cacheKey);
	if (cached !== null) return cached === "" ? null : cached; // "" = searched, no match

	try {
		// Anchor the search window to the article's publish time
		const anchorMs = articleDatetime ? articleDatetime * 1000 : Date.now();
		const publishedAfter  = new Date(anchorMs - 2  * 3600 * 1000).toISOString();
		const publishedBefore = new Date(anchorMs + 48 * 3600 * 1000).toISOString();

		const params = new URLSearchParams({
			part: "snippet",
			q: query,
			type: "video",
			order: "relevance",
			publishedAfter,
			publishedBefore,
			videoEmbeddable: "true", // skip videos with embedding disabled (Error 153)
			maxResults: "1",
			key: apiKey,
		});
		const res = await fetch(`${SEARCH_URL}?${params}`, {
			signal: AbortSignal.timeout(4000),
		});
		if (!res.ok) {
			console.warn(`[YouTube] search returned ${res.status} for query "${query}"`);
			return null;
		}
		const data = await res.json() as {
			items?: Array<{ id?: { videoId?: string } }>;
		};
		const videoId = data.items?.[0]?.id?.videoId ?? null;
		const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;

		// Cache "" for no-match so we don't re-hit the quota for articles with no video
		await cacheSet(cacheKey, videoUrl ?? "", TTL_MS);
		return videoUrl;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn(`[YouTube] search error for "${query}": ${msg}`);
		return null;
	}
}

/**
 * Builds a YouTube search query tuned for financial news clips.
 * Company articles (ticker known): "{ticker} {5 headline keywords} news"
 * Macro/sector articles: "{6 headline keywords} news"
 */
export function buildVideoQuery(
	_source: string,
	headline: string,
	ticker?: string,
): string {
	const STOP = new Set([
		"the","and","for","that","with","this","from","have","will","been","their",
		"about","more","also","into","after","over","when","than","then","were","what",
		"which","there","they","some","other","would","could","said","says","its","has",
		"are","was","but","not","can","all","had","one","our","out","who","new","its",
		"may","just","its","amid","amid","amid","here","how","why","could","should",
	]);
	const keywords = headline
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length > 3 && !STOP.has(w))
		.slice(0, ticker ? 5 : 6)
		.join(" ");

	return [ticker, keywords, "news"].filter(Boolean).join(" ");
}

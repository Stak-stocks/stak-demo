import type { FinnhubArticle } from "./finnhubService.js";

export interface SimplifiedArticle {
	headline: string;
	source: string;
	url: string;
	image: string;
	datetime: number;
	summary: string;
	explanation: string;
	whyItMatters: string;
	sentiment: "bullish" | "bearish" | "neutral";
	type: "macro" | "sector" | "company";
}

// Simple in-memory cache: key → { data, expiresAt }
const cache = new Map<string, { data: SimplifiedArticle[]; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 5;

function getCacheKey(articles: FinnhubArticle[]): string {
	return articles.map((a) => String(a.id || a.headline)).join("|");
}

/** Chunk an array into groups of `size` */
function chunk<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Call Gemini for a single batch of up to BATCH_SIZE articles */
async function simplifyBatch(
	articles: FinnhubArticle[],
): Promise<{ explanation: string; whyItMatters: string; sentiment: string }[]> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error("GEMINI_API_KEY not set");

	const prompt = `You are a financial news assistant for beginner investors aged 18-25.

Simplify the following ${articles.length} stock market news article(s) for beginners.
Use simple, conversational language. Be concise (1-2 sentences per field).

Return a JSON array with exactly ${articles.length} objects in this format:
[
  {
    "explanation": "plain English explanation of what happened",
    "whyItMatters": "one sentence on why this could impact stock prices",
    "sentiment": "bullish" | "bearish" | "neutral"
  }
]

Articles:
${articles.map((a, i) => `${i + 1}. Title: ${a.headline}\nSummary: ${a.summary}`).join("\n\n")}

Return ONLY valid JSON, no markdown, no extra text.`;

	for (let attempt = 0; attempt < 4; attempt++) {
		if (attempt > 0) await sleep(2 ** attempt * 1000); // 2s, 4s, 8s

		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: {
						temperature: 0.3,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (res.status === 429) continue;

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Gemini error ${res.status}: ${err}`);
		}

		const geminiData = await res.json();
		const rawText: string =
			geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

		try {
			return JSON.parse(rawText);
		} catch {
			return articles.map(() => ({
				explanation: "Could not simplify this article.",
				whyItMatters: "Check the original source for details.",
				sentiment: "neutral",
			}));
		}
	}

	throw new Error("Gemini rate limited after 4 attempts");
}

/** Simplify all articles, processing them in sequential batches of BATCH_SIZE.
 *  Results are cached for 30 minutes keyed by article IDs. */
export async function simplifyArticles(
	articles: FinnhubArticle[],
	types?: ("macro" | "sector" | "company")[],
): Promise<SimplifiedArticle[]> {
	if (articles.length === 0) return [];

	const cacheKey = getCacheKey(articles);
	const cached = cache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
	}

	// Process batches sequentially to avoid rate-limit issues
	const batches = chunk(articles, BATCH_SIZE);
	const simplified: { explanation: string; whyItMatters: string; sentiment: string }[] = [];

	for (const batch of batches) {
		const results = await simplifyBatch(batch);
		simplified.push(...results);
	}

	const result: SimplifiedArticle[] = articles.map((article, i) => {
		const s = simplified[i] ?? {
			explanation: article.summary,
			whyItMatters: "Read more at the source.",
			sentiment: "neutral",
		};
		return {
			headline: article.headline,
			source: article.source,
			url: article.url,
			image: article.image,
			datetime: article.datetime,
			summary: article.summary,
			explanation: s.explanation || article.summary,
			whyItMatters: s.whyItMatters || "Read more at the source.",
			sentiment: (["bullish", "bearish", "neutral"].includes(s.sentiment)
				? s.sentiment
				: "neutral") as "bullish" | "bearish" | "neutral",
			type: types?.[i] ?? "sector",
		};
	});

	cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
	return result;
}

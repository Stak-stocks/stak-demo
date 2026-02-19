import { adminDb } from "../firebaseAdmin.js";
import { getCompanyNews } from "./finnhubService.js";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export interface TrendCard {
	type: "macro" | "sector" | "company" | "stak";
	label: string;

	// NEW FORMAT fields
	topic?: string;
	situation?: string;
	whyItMatters?: string;
	impact?: string;
	shortTermEffect?: string;
	longTermQuestion?: string;
	direction?: string;
	pressureEmoji?: string;

	// Stak-specific
	intro?: string;
	forces?: string[];
	stockReflects?: string;
	takeaway?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateWithGemini(
	ticker: string,
	brandName: string,
	headlines: string[],
): Promise<TrendCard[]> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error("GEMINI_API_KEY not set");

	const numberedHeadlines = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");
	const headlinesSection =
		headlines.length > 0
			? `Recent headlines about ${brandName}:\n${numberedHeadlines}`
			: `No recent headlines available — use general knowledge about ${brandName} (${ticker}).`;

	const prompt = `You are a Gen Z financial analyst writing for beginner investors aged 18-25. Your tone is sharp, casual, and honest — no jargon, no fluff.

${headlinesSection}

Generate exactly 4 trend analysis cards as a JSON array in this exact order:

1. MACRO card (type: "macro") — a macroeconomic force currently affecting this stock (interest rates, inflation, government policy, global events)
2. SECTOR card (type: "sector") — an industry or sector dynamic affecting this stock
3. COMPANY card (type: "company") — a development specific to ${brandName} (${ticker}) ONLY. NEVER write this card about a competitor or any other company. If the headlines mention competitors, use those for sector context instead. This card must be exclusively about ${brandName}.
4. STAK INSIGHT card (type: "stak") — how all three forces interact

---

MACRO card format:
{
  "type": "macro",
  "label": "MACRO TREND",
  "topic": "<topic title, max 6 words>",
  "situation": "<1-2 sentences: what is happening at the macro level>",
  "whyItMatters": "<1-2 sentences: why this macro force moves markets>",
  "impact": "<1 sentence: how this specifically affects ${brandName}>",
  "direction": "<e.g. Mild Negative Pressure | Positive Pressure | Volatile / Mixed Pressure>",
  "pressureEmoji": "<📈 | 📉 | 📊>"
}

SECTOR card format:
{
  "type": "sector",
  "label": "SECTOR TREND",
  "topic": "<topic title, max 6 words>",
  "situation": "<1-2 sentences: what is happening in the sector right now>",
  "whyItMatters": "<1-2 sentences: why this sector dynamic matters for investors>",
  "impact": "<1 sentence: how this sector trend affects ${brandName}>",
  "direction": "<e.g. Positive Pressure | Negative Pressure | Volatile / Mixed Pressure>",
  "pressureEmoji": "<📈 | 📉 | 📊>"
}

COMPANY card format (MUST be about ${brandName} only — not competitors):
{
  "type": "company",
  "label": "COMPANY TREND",
  "topic": "<topic title about ${brandName}, max 6 words>",
  "situation": "<1-2 sentences: what happened specifically at ${brandName}>",
  "whyItMatters": "<1-2 sentences: why this matters for investors>",
  "shortTermEffect": "<1 sentence: short-term impact on the stock>",
  "longTermQuestion": "<1 sentence ending with a question mark: the big unknown>",
  "direction": "<e.g. Positive Pressure | Negative Pressure | Positive, but depends on execution>",
  "pressureEmoji": "<📈 | 📉 | 📊>"
}

STAK INSIGHT card format:
{
  "type": "stak",
  "label": "STAK INSIGHT",
  "intro": "${brandName} is currently influenced by [X] forces:",
  "forces": [
    "<bullet: describe the first force and its effect>",
    "<bullet: describe the second force and its effect>",
    "<optional third bullet if there is a third meaningful force>"
  ],
  "stockReflects": "<1-2 sentences: what the current stock price signals about investor belief>",
  "takeaway": "<1 punchy sentence, culturally aware, no financial advice — the vibe check>",
  "direction": "<Positive Pressure | Negative Pressure | Volatile / Mixed Pressure>",
  "pressureEmoji": "<📈 | 📉 | 📊>"
}

Return ONLY the JSON array, no markdown, no extra text.`;

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
						temperature: 0.4,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (res.status === 429) continue;

		if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

		const data = await res.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!text) throw new Error("Gemini returned empty response");

		const parsed: TrendCard[] = JSON.parse(text);
		if (!Array.isArray(parsed) || parsed.length !== 4) {
			throw new Error("Gemini returned unexpected structure");
		}

		return parsed;
	}

	throw new Error("Gemini rate limited after 4 attempts");
}

export async function getTrends(
	brandId: string,
	ticker: string,
	brandName: string,
): Promise<TrendCard[]> {
	// Check Firestore cache first (v2 collection — new format)
	const doc = await adminDb.collection("trends_v2").doc(brandId).get();
	if (doc.exists) {
		const data = doc.data()!;
		const age = Date.now() - data.generatedAt.toMillis();
		if (age < THREE_DAYS_MS) {
			return data.cards as TrendCard[];
		}
	}

	// Stale or missing — fetch news and generate
	const articles = await getCompanyNews(ticker, 10).catch(() => []);
	const headlines = articles.slice(0, 5).map((a) => a.headline);

	const cards = await generateWithGemini(ticker, brandName, headlines);

	// Persist to Firestore (fire-and-forget — don't block response)
	adminDb
		.collection("trends_v2")
		.doc(brandId)
		.set({ cards, ticker, generatedAt: new Date() })
		.catch((err) => console.error("Failed to cache trends:", err));

	return cards;
}

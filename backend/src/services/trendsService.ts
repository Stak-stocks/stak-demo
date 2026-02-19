import { adminDb } from "../firebaseAdmin.js";
import { getCompanyNews } from "./finnhubService.js";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export interface TrendCard {
	type: "macro" | "sector" | "company" | "stak";
	label: string;

	// NEW FORMAT fields
	topic?: string;
	why?: string;
	impact?: string;
	synthesis?: string;
	takeaway?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Collect all configured Gemini API keys (GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3) */
function getGeminiKeys(): string[] {
	return [
		process.env.GEMINI_API_KEY,
		process.env.GEMINI_API_KEY_2,
		process.env.GEMINI_API_KEY_3,
	].filter((k): k is string => !!k);
}

/** Try one Gemini key with up to 3 attempts on 429. Returns parsed cards or null if rate-limited. */
async function tryGeminiKey(key: string, prompt: string): Promise<TrendCard[] | null> {
	for (let attempt = 0; attempt < 3; attempt++) {
		if (attempt > 0) await sleep(2 ** attempt * 1000); // 2s, 4s

		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
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

	console.warn(`Gemini key ...${key.slice(-4)} rate limited — trying next key`);
	return null;
}

async function generateWithGemini(
	ticker: string,
	brandName: string,
	headlines: string[],
): Promise<TrendCard[]> {
	const keys = getGeminiKeys();
	if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");

	const numberedHeadlines = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");
	const headlinesSection =
		headlines.length > 0
			? `Recent headlines about ${brandName}:\n${numberedHeadlines}`
			: `No recent headlines available — use general knowledge about ${brandName} (${ticker}).`;

	const prompt = `You are a Gen Z financial analyst writing for beginner investors aged 18-25. Tone: sharp, casual, honest — no jargon, no fluff. When you use jargon, immediately explain it in plain English.

${headlinesSection}

Generate exactly 4 trend analysis cards as a JSON array in this exact order:

1. MACRO card — a macroeconomic force currently affecting this stock
2. SECTOR card — an industry or sector dynamic affecting this stock
3. COMPANY card — a development specific to ${brandName} (${ticker}) ONLY. NEVER write this card about a competitor. If headlines mention competitors, use them for sector context instead.
4. STAK card — synthesis of all three forces

---

MACRO card:
{
  "type": "macro",
  "label": "MACRO TREND",
  "topic": "<catchy short headline, max 8 words>",
  "why": "<plain English explanation of the macro factor and exactly how it connects to ${brandName}'s specific business model. Max 3 sentences. No bullet points.>",
  "impact": "<📈 Positive Pressure | 📉 Negative Pressure | 📊 Volatile / Mixed Pressure>"
}

SECTOR card:
{
  "type": "sector",
  "label": "SECTOR: <SECTOR NAME IN CAPS, e.g. FINTECH or BIG TECH>",
  "topic": "<catchy short headline, max 8 words>",
  "why": "<plain English explanation of the industry-wide shift and how it affects ${brandName}. Max 3 sentences.>",
  "impact": "<📈 Positive Pressure | 📉 Negative Pressure | 📊 Volatile / Mixed Pressure>"
}

COMPANY card (about ${brandName} ONLY):
{
  "type": "company",
  "label": "COMPANY: ${ticker}",
  "topic": "<catchy short headline about ${brandName}'s most recent catalyst, max 8 words>",
  "why": "<plain English explanation of what ${brandName} actually did and why the market reacted the way it did. Explain any jargon. Max 3 sentences.>",
  "impact": "<📈 Positive Pressure | 📉 Negative Pressure | 📊 Volatile / Mixed Pressure>"
}

STAK card:
{
  "type": "stak",
  "label": "STAK INSIGHT",
  "synthesis": "<3-4 sentences weighing the macro, sector, and company forces against each other to explain the current stock price reality. Be direct and honest.>",
  "takeaway": "<2 sentences framing the psychological or strategic decision the investor has to make. Example: 'This is a clash between short-term cost and long-term vision. Your next move depends on which horizon you trust more.'>",
  "impact": "<📈 Positive Pressure | 📉 Negative Pressure | 📊 Volatile / Mixed Pressure>"
}

Return ONLY the JSON array, no markdown, no extra text.`;

	for (const key of keys) {
		const result = await tryGeminiKey(key, prompt);
		if (result !== null) return result;
	}

	throw new Error("All Gemini API keys rate limited");
}

export async function getTrends(
	brandId: string,
	ticker: string,
	brandName: string,
): Promise<TrendCard[]> {
	// Check Firestore cache first (v3 collection)
	const doc = await adminDb.collection("trends_v5").doc(brandId).get();
	if (doc.exists) {
		const data = doc.data()!;
		const age = Date.now() - data.generatedAt.toMillis();
		if (age < THREE_DAYS_MS) {
			return data.cards as TrendCard[];
		}
	}

	// Stale or missing — fetch news and generate
	const articles = await getCompanyNews(ticker, 10, brandName).catch(() => []);
	const headlines = articles.slice(0, 5).map((a) => a.headline);

	const cards = await generateWithGemini(ticker, brandName, headlines);

	// Persist to Firestore (fire-and-forget — don't block response)
	adminDb
		.collection("trends_v5")
		.doc(brandId)
		.set({ cards, ticker, generatedAt: new Date() })
		.catch((err) => console.error("Failed to cache trends:", err));

	return cards;
}

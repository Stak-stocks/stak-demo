import { adminDb } from "../firebaseAdmin.js";
import { getCompanyNews } from "./finnhubService.js";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export interface TrendCard {
	type: "macro" | "sector" | "company" | "stak";
	label: string;
	dominance: string;
	headline?: string;
	explanation: string;
	pressure?: "Positive Pressure" | "Negative Pressure" | "Volatile / Mixed Pressure";
	pressureEmoji?: string;
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

	const headlinesSection =
		headlines.length > 0
			? `Recent headlines about ${brandName}:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
			: `No recent headlines available — use general knowledge about ${brandName} (${ticker}).`;

	const prompt = `You are a Gen Z financial analyst writing for beginner investors aged 18-25. Your tone is sharp, casual, and honest — no jargon, no fluff.

${headlinesSection}

Generate exactly 4 trend analysis cards as a JSON array in this exact order:

1. MACRO card (type: "macro") — a macroeconomic force affecting this stock (interest rates, inflation, government policy, global events)
2. SECTOR card (type: "sector") — an industry or sector dynamic affecting this stock
3. COMPANY card (type: "company") — a company-specific development, ideally from the headlines above
4. STAK INSIGHT card (type: "stak") — how all three forces interact + a punchy one-liner takeaway

Each card must have these exact fields:
- type: "macro" | "sector" | "company" | "stak"
- label: string (e.g. "MACRO TREND", "SECTOR: BIG TECH", "COMPANY: ${ticker}", "STAK INSIGHT")
- dominance: string (e.g. "MACRO TREND", "SECTOR TREND", "COMPANY TREND", "STAK INSIGHT")
- headline: string (max 10 words, punchy)
- explanation: string (2 sentences, casual but sharp, no financial advice)
- pressure: "Positive Pressure" | "Negative Pressure" | "Volatile / Mixed Pressure"
- pressureEmoji: "📈" | "📉" | "📊"

The stak card must ALSO have:
- takeaway: string (1 punchy sentence, culturally aware, no financial advice)

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
	// Check Firestore cache first
	const doc = await adminDb.collection("trends").doc(brandId).get();
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
		.collection("trends")
		.doc(brandId)
		.set({ cards, ticker, generatedAt: new Date() })
		.catch((err) => console.error("Failed to cache trends:", err));

	return cards;
}

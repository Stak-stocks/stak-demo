import { Router } from "express";
import { adminDb } from "../firebaseAdmin.js";

export const intelCardsRouter = Router();

export interface IntelCardData {
	id: string;
	title: string;
	emoji: string;
	explanation: string;
	takeaway: string;
}

// 30 financial concept topics — at 4 cards/day max, one full cycle = ~7.5 days
const TOPICS = [
	{ id: "pe-ratio", title: "What is a P/E Ratio?" },
	{ id: "share-dilution", title: "What is Share Dilution?" },
	{ id: "market-cap", title: "What is Market Cap?" },
	{ id: "dividend", title: "What is a Dividend?" },
	{ id: "bull-bear", title: "Bull vs. Bear Market" },
	{ id: "eps", title: "What is EPS (Earnings Per Share)?" },
	{ id: "short-selling", title: "What is Short Selling?" },
	{ id: "dca", title: "What is Dollar-Cost Averaging?" },
	{ id: "beta", title: "What is Beta?" },
	{ id: "ipo", title: "What is an IPO?" },
	{ id: "stock-split", title: "What is a Stock Split?" },
	{ id: "revenue-profit", title: "Revenue vs. Profit" },
	{ id: "etf", title: "What is an ETF?" },
	{ id: "52-week", title: "What is the 52-Week High/Low?" },
	{ id: "correction", title: "What is a Market Correction?" },
	{ id: "compound-interest", title: "What is Compound Interest?" },
	{ id: "options", title: "What are Options (Calls and Puts)?" },
	{ id: "free-cash-flow", title: "What is Free Cash Flow?" },
	{ id: "debt-equity", title: "What is the Debt-to-Equity Ratio?" },
	{ id: "inflation-stocks", title: "How Does Inflation Affect Stocks?" },
	{ id: "interest-rates", title: "How Do Interest Rates Affect Stocks?" },
	{ id: "index-funds", title: "What is an Index Fund?" },
	{ id: "diversification", title: "What is Diversification?" },
	{ id: "margin-trading", title: "What is Margin Trading?" },
	{ id: "share-buyback", title: "What is a Share Buyback?" },
	{ id: "growth-value", title: "Growth vs. Value Investing" },
	{ id: "yield-curve", title: "What is the Yield Curve?" },
	{ id: "liquidity", title: "What is Liquidity?" },
	{ id: "day-trading", title: "Day Trading vs. Long-Term Investing" },
	{ id: "blue-chip", title: "What are Blue-Chip Stocks?" },
];

const TOPIC_EMOJIS: Record<string, string> = {
	"pe-ratio": "🔢", "share-dilution": "🍕", "market-cap": "🏢",
	"dividend": "💸", "bull-bear": "🐂", "eps": "📈",
	"short-selling": "📉", "dca": "🗓️", "beta": "⚡",
	"ipo": "🚀", "stock-split": "✂️", "revenue-profit": "🧾",
	"etf": "🧺", "52-week": "📅", "correction": "🎢",
	"compound-interest": "❄️", "options": "🎯", "free-cash-flow": "🌊",
	"debt-equity": "⚖️", "inflation-stocks": "🔥", "interest-rates": "🏦",
	"index-funds": "🗂️", "diversification": "🥗", "margin-trading": "⚠️",
	"share-buyback": "♻️", "growth-value": "🌱", "yield-curve": "📊",
	"liquidity": "💧", "day-trading": "⏱️", "blue-chip": "💎",
};

// 7-day in-memory cache
let cachedCards: IntelCardData[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getGeminiKeys(): string[] {
	return [
		process.env.GEMINI_API_KEY,
		process.env.GEMINI_API_KEY_2,
		process.env.GEMINI_API_KEY_3,
	].filter((k): k is string => !!k);
}

async function generateCardsWithGemini(): Promise<IntelCardData[] | null> {
	const keys = getGeminiKeys();
	if (keys.length === 0) return null;

	const topicList = TOPICS.map((t, i) => `${i + 1}. "${t.title}" (id: "${t.id}")`).join("\n");

	const prompt = `You are a financial educator creating content for beginner investors aged 18-25.

Generate exactly 30 financial education cards, one for each topic listed below.
Rules:
- Use simple, conversational language — no jargon
- Use relatable analogies (food, games, streaming services, everyday life)
- explanation: 2-3 sentences max
- takeaway: 1-2 punchy, practical sentences a young investor can act on

Topics:
${topicList}

Return ONLY a JSON array of exactly 30 objects:
[
  {
    "id": "the-id-from-topic",
    "emoji": "one relevant emoji",
    "explanation": "plain English explanation with an analogy",
    "takeaway": "practical insight for a young investor"
  }
]`;

	for (const key of keys) {
		try {
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

			if (res.status === 429 || res.status === 403) continue;
			if (!res.ok) continue;

			const data = await res.json();
			const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
			if (!text) continue;

			const parsed = JSON.parse(text) as Array<{
				id: string; emoji?: string; explanation: string; takeaway: string;
			}>;

			if (!Array.isArray(parsed) || parsed.length < 25) continue;

			const cards: IntelCardData[] = parsed.map((item) => {
				const topic = TOPICS.find((t) => t.id === item.id) ?? { id: item.id, title: item.id };
				return {
					id: item.id,
					title: topic.title,
					emoji: item.emoji || TOPIC_EMOJIS[item.id] || "💡",
					explanation: item.explanation,
					takeaway: item.takeaway,
				};
			});

			return cards;
		} catch {
			continue;
		}
	}

	return null;
}

const FIRESTORE_DOC = adminDb.collection("admin").doc("intel-cards");

// GET /api/intel-cards
intelCardsRouter.get("/", async (_req, res) => {
	// 1. In-memory cache (fastest — survives within a single server instance)
	if (cachedCards && Date.now() < cacheExpiresAt) {
		res.json({ cards: cachedCards });
		return;
	}

	// 2. Firestore cache (survives server restarts / Cloud Run cold starts)
	try {
		const doc = await FIRESTORE_DOC.get();
		if (doc.exists) {
			const stored = doc.data() as { cards: IntelCardData[]; expiresAt: number };
			if (stored.expiresAt > Date.now()) {
				cachedCards = stored.cards;
				cacheExpiresAt = stored.expiresAt;
				res.json({ cards: stored.cards });
				return;
			}
		}
	} catch {
		// Firestore unavailable — fall through to generation
	}

	// 3. Generate fresh cards with Gemini and persist to both layers
	const generated = await generateCardsWithGemini();
	if (generated) {
		const expiresAt = Date.now() + CACHE_TTL_MS;
		cachedCards = generated;
		cacheExpiresAt = expiresAt;
		// Fire-and-forget Firestore write
		FIRESTORE_DOC.set({ cards: generated, expiresAt }).catch(() => {});
		res.json({ cards: generated });
	} else {
		// Frontend falls back to its hardcoded set
		res.json({ cards: null });
	}
});

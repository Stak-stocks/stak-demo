import { adminDb } from "../firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface FinnhubIPOEntry {
	symbol: string;
	name: string;
	date: string; // YYYY-MM-DD
	status: string; // "priced" = completed IPO
}

interface FinnhubProfile {
	name: string;
	ticker: string;
	finnhubIndustry: string;
	weburl: string;
	logo: string;
	country: string;
	marketCapitalization: number;
	description?: string;
}

interface GeneratedBrandData {
	bio: string;
	personalityDescription: string;
	vibes: { name: string; emoji: string; value: number; color: string }[];
	culturalContext: {
		title: string;
		sections: { heading: string; content: string }[];
	};
	interestCategories: string[];
}

// ── Sector → Unsplash hero image map ─────────────────────────────────────────

const SECTOR_HERO: Record<string, string> = {
	Technology: "photo-1518770660439-4636190af475",
	Healthcare: "photo-1576091160550-2173dba999ef",
	Finance: "photo-1611974789855-9c2a0a7236a3",
	"Financial Services": "photo-1611974789855-9c2a0a7236a3",
	"Consumer Cyclical": "photo-1441986300917-64674bd600d8",
	"Consumer Defensive": "photo-1556742049-0cfed4f6a45d",
	Energy: "photo-1473341304170-971dccb5ac1e",
	"Communication Services": "photo-1562577309-4932fdd64cd1",
	Industrials: "photo-1581091226825-a6a2a5aee158",
	"Basic Materials": "photo-1504328345606-18bbc8c9d7d1",
	"Real Estate": "photo-1560518883-ce09059eeffa",
	Utilities: "photo-1473341304170-971dccb5ac1e",
	default: "photo-1611974789855-9c2a0a7236a3",
};

function getHeroImage(sector: string): string {
	const id = SECTOR_HERO[sector] ?? SECTOR_HERO.default;
	return `https://images.unsplash.com/${id}?w=800&auto=format&q=80`;
}

// ── Finnhub helpers ───────────────────────────────────────────────────────────

function getFinnhubKeys(): string[] {
	return [
		process.env.FINNHUB_API_KEY,
		process.env.FINNHUB_API_KEY_2,
		process.env.FINNHUB_API_KEY_3,
	].filter((k): k is string => !!k);
}

function getGeminiKeys(): string[] {
	return [
		process.env.GEMINI_API_KEY,
		process.env.GEMINI_API_KEY_2,
		process.env.GEMINI_API_KEY_3,
	].filter((k): k is string => !!k);
}

function formatDate(date: Date): string {
	return date.toISOString().split("T")[0];
}

async function fetchRecentIPOs(daysBack = 3): Promise<FinnhubIPOEntry[]> {
	const keys = getFinnhubKeys();
	if (keys.length === 0) throw new Error("No FINNHUB_API_KEY configured");

	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - daysBack);

	const url = `https://finnhub.io/api/v1/calendar/ipo?from=${formatDate(from)}&to=${formatDate(to)}&token=${keys[0]}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error(`Finnhub IPO calendar error: ${res.status}`);

	const data = await res.json();
	const ipos: FinnhubIPOEntry[] = data.ipoCalendar ?? [];

	// Only return completed ("priced") IPOs
	return ipos.filter((ipo) => ipo.status === "priced" && ipo.symbol);
}

async function fetchCompanyProfile(symbol: string): Promise<FinnhubProfile> {
	const keys = getFinnhubKeys();

	for (const key of keys) {
		const res = await fetch(
			`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${key}`,
		);
		if (res.status === 429) continue;
		if (!res.ok) throw new Error(`Finnhub profile error for ${symbol}: ${res.status}`);

		const data = await res.json();
		if (!data?.name) throw new Error(`No profile data for ${symbol}`);
		return data as FinnhubProfile;
	}

	throw new Error(`All Finnhub keys rate-limited for ${symbol}`);
}

function getLogoUrl(profile: FinnhubProfile): string {
	if (profile.logo) return profile.logo;
	// Fall back to Logo.dev using the company domain
	try {
		const domain = profile.weburl
			.replace(/https?:\/\/(www\.)?/, "")
			.split("/")[0];
		if (domain) return `https://logo.clearbit.com/${domain}`;
	} catch {
		// ignore
	}
	return "";
}

function getDomain(profile: FinnhubProfile): string {
	try {
		return profile.weburl
			.replace(/https?:\/\/(www\.)?/, "")
			.split("/")[0];
	} catch {
		return "";
	}
}

// ── Gemini brand generation ───────────────────────────────────────────────────

async function tryGeminiKey(
	key: string,
	prompt: string,
): Promise<GeneratedBrandData | null> {
	for (let attempt = 0; attempt < 2; attempt++) {
		if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));

		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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
		if (!res.ok) throw new Error(`Gemini error ${res.status}`);

		const data = await res.json();
		const text: string =
			data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
		return JSON.parse(text) as GeneratedBrandData;
	}
	return null;
}

async function generateBrandData(
	symbol: string,
	profile: FinnhubProfile,
): Promise<GeneratedBrandData> {
	const keys = getGeminiKeys();
	if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");

	const prompt = `You are a Gen Z financial content writer for the STAK investing app.
Tone: sharp, casual, relatable — no jargon, no corporate fluff.

Company: ${profile.name} (${symbol})
Sector: ${profile.finnhubIndustry || "Unknown"}
Description: ${profile.description || "N/A"}
Country: ${profile.country || "N/A"}

Generate a JSON object with EXACTLY this structure:
{
  "bio": "<1-2 sentence Gen Z-friendly company description, max 120 chars>",
  "personalityDescription": "<2-3 sentences on this company's personality/archetype>",
  "vibes": [
    {"name":"Clout","emoji":"💎","value":<integer 0-100>,"color":"from-purple-400 to-pink-400"},
    {"name":"Drama","emoji":"🎭","value":<integer 0-100>,"color":"from-red-400 to-orange-400"},
    {"name":"Hype","emoji":"🚀","value":<integer 0-100>,"color":"from-cyan-400 to-blue-400"},
    {"name":"Basics","emoji":"🎯","value":<integer 0-100>,"color":"from-green-400 to-teal-400"},
    {"name":"Bag","emoji":"💰","value":<integer 0-100>,"color":"from-yellow-400 to-orange-400"}
  ],
  "culturalContext": {
    "title": "<catchy title about this brand's cultural position>",
    "sections": [
      {"heading":"What They Do","content":"<2-3 sentences, simple language>"},
      {"heading":"Why Gen Z Cares","content":"<2-3 sentences on cultural relevance>"},
      {"heading":"The Bigger Picture","content":"<2-3 sentences on market context>"}
    ]
  },
  "interestCategories": <JSON array using only values from: ["tech","gaming","streaming","fashion","beauty","finance","energy","music","food_drink","shopping","travel","fitness"]>
}
Return ONLY valid JSON, no markdown, no extra text.`;

	for (const key of keys) {
		const result = await tryGeminiKey(key, prompt);
		if (result !== null) return result;
	}

	throw new Error(`All Gemini keys rate-limited for ${symbol}`);
}

// ── Firestore persistence ─────────────────────────────────────────────────────

async function upsertStockToFirestore(
	symbol: string,
	profile: FinnhubProfile,
	brandData: GeneratedBrandData,
	ipoDate: string,
): Promise<void> {
	const id = symbol.toLowerCase();
	const docRef = adminDb.collection("stocks").doc(id);
	const existing = await docRef.get();

	const data = {
		id,
		ticker: symbol.toUpperCase(),
		name: profile.name,
		domain: getDomain(profile),
		logo: getLogoUrl(profile),
		heroImage: getHeroImage(profile.finnhubIndustry),
		bio: brandData.bio,
		personalityDescription: brandData.personalityDescription,
		vibes: brandData.vibes,
		culturalContext: brandData.culturalContext,
		interestCategories: brandData.interestCategories,
		sector: profile.finnhubIndustry || "Unknown",
		country: profile.country || "Unknown",
		source: "ipo-auto" as const,
		ipoDate,
		updatedAt: FieldValue.serverTimestamp(),
		...(!existing.exists ? { addedAt: FieldValue.serverTimestamp() } : {}),
	};

	await docRef.set(data, { merge: true });
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface SyncResult {
	added: string[];
	skipped: string[];
	errors: string[];
}

export async function syncNewIPOs(daysBack = 3): Promise<SyncResult> {
	const result: SyncResult = { added: [], skipped: [], errors: [] };

	let ipos: FinnhubIPOEntry[];
	try {
		ipos = await fetchRecentIPOs(daysBack);
		console.log(`[IPO Sync] Found ${ipos.length} priced IPO(s) in last ${daysBack} days`);
	} catch (e) {
		console.error("[IPO Sync] Failed to fetch IPO calendar:", e);
		return result;
	}

	for (const ipo of ipos) {
		const symbol = ipo.symbol.trim().toUpperCase();
		if (!symbol) continue;

		// Skip if already in Firestore
		const existing = await adminDb
			.collection("stocks")
			.doc(symbol.toLowerCase())
			.get();
		if (existing.exists) {
			result.skipped.push(symbol);
			console.log(`[IPO Sync] Skipping ${symbol} — already in Firestore`);
			continue;
		}

		try {
			console.log(`[IPO Sync] Processing ${symbol} (${ipo.name})...`);
			const profile = await fetchCompanyProfile(symbol);
			const brandData = await generateBrandData(symbol, profile);
			await upsertStockToFirestore(symbol, profile, brandData, ipo.date);
			result.added.push(symbol);
			console.log(`[IPO Sync] ✅ Added ${symbol}`);
		} catch (e) {
			result.errors.push(symbol);
			console.error(`[IPO Sync] ❌ Error processing ${symbol}:`, e);
		}
	}

	return result;
}

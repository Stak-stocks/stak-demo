import { getGeminiKeys } from "./geminiService.js";
import { getHeroImage } from "./ipoService.js";
import { getPeerTickers, TAG_TO_DISPLAY_BUCKETS, STAK_WEIGHTED_STOCK_TAGS, type BrandProfile, type VibeMetric } from "@stak/shared";
import { brands } from "@stak/shared/brands";

// ── Draft shape ───────────────────────────────────────────────────────────────
// Everything needed to append one new entry to shared/src/brands/<chunk>.ts and
// shared/src/stockTags.ts. Produced by generateBrandDraft() as plain JSON --
// reviewed by a human, then turned into real source files by commitBrandDraft()
// (see backend/src/routes/brandAdmin.ts). Never written to the canonical TS
// files directly from here.

export interface BrandDraft extends BrandProfile {
	// StakStockTagConfig fields, flattened onto the same draft object for a single
	// review artifact instead of two separate JSON files per ticker.
	sourceSection: string;
	primaryCategory: string;
	displayTags: string[];
	learningTags: { tag: string; weight: number }[];
}

// ── Finnhub ───────────────────────────────────────────────────────────────────

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

function getFinnhubKeys(): string[] {
	return [
		process.env.FINNHUB_API_KEY,
		process.env.FINNHUB_API_KEY_2,
		process.env.FINNHUB_API_KEY_3,
	].filter((k): k is string => !!k);
}

async function fetchCompanyProfile(ticker: string): Promise<FinnhubProfile> {
	const keys = getFinnhubKeys();
	if (keys.length === 0) throw new Error("No FINNHUB_API_KEY configured");

	for (const key of keys) {
		const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${key}`);
		if (res.status === 429) continue;
		if (!res.ok) throw new Error(`Finnhub profile error for ${ticker}: ${res.status}`);
		const data = await res.json() as FinnhubProfile;
		if (!data?.name) throw new Error(`No Finnhub profile data for ${ticker} -- check the ticker is correct and US-listed`);
		return data;
	}
	throw new Error(`All Finnhub keys rate-limited fetching profile for ${ticker}`);
}

interface FinnhubMetrics {
	peTTM?: number;
	marketCapitalization?: number;
	revenueGrowthTTMYoy?: number;
	netProfitMarginTTM?: number;
	beta?: number;
	dividendYieldIndicatedAnnual?: number;
}

async function fetchMetrics(ticker: string): Promise<FinnhubMetrics> {
	const keys = getFinnhubKeys();
	if (keys.length === 0) throw new Error("No FINNHUB_API_KEY configured");

	for (const key of keys) {
		const res = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${key}`);
		if (res.status === 429) continue;
		if (!res.ok) throw new Error(`Finnhub metrics error for ${ticker}: ${res.status}`);
		const data = await res.json() as { metric?: FinnhubMetrics };
		return data.metric ?? {};
	}
	throw new Error(`All Finnhub keys rate-limited fetching metrics for ${ticker}`);
}

function formatMarketCap(millions: number): string {
	if (millions >= 1_000_000) return `$${(millions / 1_000_000).toFixed(2)}T`;
	if (millions >= 1_000) return `$${(millions / 1_000).toFixed(1)}B`;
	return `$${millions.toFixed(0)}M`;
}

// Label + explanation text is identical across every existing brand for a given
// metric (confirmed against the live data before writing this) -- only
// culturalTranslation is company-specific, so that's the only part Gemini writes.
const METRIC_META = {
	peRatio:        { label: "P/E Ratio",        explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit" },
	marketCap:      { label: "Market Cap",       explanation: "The total value of all the company's shares combined" },
	revenueGrowth:  { label: "Revenue Growth",   explanation: "How much more money the company is making compared to last year" },
	profitMargin:   { label: "Profit Margin",    explanation: "What percentage of each sale becomes actual profit" },
	beta:           { label: "Beta",             explanation: "How much the stock price swings compared to the overall market" },
	dividendYield:  { label: "Dividend Yield",   explanation: "The percentage of the stock price paid out as dividends each year" },
} as const;

function getDomain(profile: FinnhubProfile): string {
	try {
		return profile.weburl.replace(/https?:\/\/(www\.)?/, "").split("/")[0] ?? "";
	} catch {
		return "";
	}
}

// ── Gemini ────────────────────────────────────────────────────────────────────

interface GeminiBrandFields {
	bio: string;
	personalityDescription: string;
	vibes: VibeMetric[];
	culturalContext: { title: string; sections: { heading: string; content: string }[] };
	interestCategories: string[];
	primaryCategory: string;
	displayTags: string[];
	learningTags: { tag: string; weight: number }[];
	financialsCulturalTranslation: Record<keyof typeof METRIC_META, string>;
}

function buildPrompt(ticker: string, profile: FinnhubProfile, metrics: FinnhubMetrics): string {
	// Both allow-lists are computed from the live catalog, not hardcoded -- they
	// grow automatically as new categories/tags get added, instead of silently
	// going stale the way a copy-pasted list would.
	const existingCategories = [...new Set(STAK_WEIGHTED_STOCK_TAGS.map((s) => s.primaryCategory))].sort();
	const existingTags = Object.keys(TAG_TO_DISPLAY_BUCKETS).sort();

	return `You are a Gen Z financial content writer for the STAK investing app.
Tone: sharp, casual, relatable — no jargon, no corporate fluff.

Company: ${profile.name} (${ticker})
Sector: ${profile.finnhubIndustry || "Unknown"}
Description: ${profile.description || "N/A"}
Country: ${profile.country || "N/A"}
P/E: ${metrics.peTTM ?? "N/A"}, Market Cap: ${metrics.marketCapitalization != null ? formatMarketCap(metrics.marketCapitalization) : "N/A"}, Revenue Growth YoY: ${metrics.revenueGrowthTTMYoy ?? "N/A"}%, Profit Margin: ${metrics.netProfitMarginTTM ?? "N/A"}%, Beta: ${metrics.beta ?? "N/A"}, Dividend Yield: ${metrics.dividendYieldIndicatedAnnual ?? "N/A"}%

Generate a JSON object with EXACTLY this structure:
{
  "bio": "<1-2 sentence Gen Z-friendly company description, max 120 chars>",
  "personalityDescription": "<2-3 sentences on this company's personality/archetype>",
  "vibes": [
    {"name":"Clout","emoji":"🏰","value":<integer 0-100>,"color":"#00d9ff"},
    {"name":"Drama Level","emoji":"🎭","value":<integer 0-100>,"color":"#ff006e"},
    {"name":"Internet Hype","emoji":"🔥","value":<integer 0-100>,"color":"#ff9500"}
  ],
  "culturalContext": {
    "title": "<catchy title about this brand's cultural position>",
    "sections": [
      {"heading":"What They Do","content":"<2-3 sentences, simple language>"},
      {"heading":"Why Gen Z Cares","content":"<2-3 sentences on cultural relevance>"},
      {"heading":"The Bigger Picture","content":"<2-3 sentences on market context>"}
    ]
  },
  "interestCategories": <JSON array using only values from: ["tech","gaming","streaming","fashion","beauty","finance","energy","music","food_drink","shopping","travel","fitness"]>,
  "primaryCategory": "<a single lowercase_snake_case category. STRONGLY prefer reusing one of these EXISTING categories if the company genuinely fits: ${existingCategories.join(", ")}. Only coin a new slug if none of those fit at all>",
  "displayTags": <JSON array of 2-4 short "Title Case" tags for human-readable display, e.g. "EV/Auto", "High Growth">,
  "learningTags": <JSON array of 3-6 objects {"tag": "<snake_case>", "weight": <0.5 to 1.0>} for the recommendation engine. STRONGLY prefer reusing tags from this existing list when they fit: ${existingTags.join(", ")}. Only invent a new tag if nothing in that list fits -- weight reflects how strongly the company represents that tag>,
  "financialsCulturalTranslation": {
    "peRatio": "<short Gen-Z framing of this company's P/E, e.g. 'expensive but popular—people are betting on the future'>",
    "marketCap": "<short Gen-Z framing of this company's size>",
    "revenueGrowth": "<short Gen-Z framing of this company's growth>",
    "profitMargin": "<short Gen-Z framing of this company's margins>",
    "beta": "<short Gen-Z framing of this company's volatility>",
    "dividendYield": "<short Gen-Z framing of whether/how much this company pays dividends>"
  }
}
Return ONLY valid JSON, no markdown, no extra text.`;
}

async function callGemini(prompt: string): Promise<GeminiBrandFields> {
	const keys = getGeminiKeys();
	if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");

	for (const key of keys) {
		for (let attempt = 0; attempt < 2; attempt++) {
			if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
			try {
				const res = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							contents: [{ parts: [{ text: prompt }] }],
							generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.4, responseMimeType: "application/json" },
						}),
					},
				);
				if (res.status === 429) continue;
				if (!res.ok) break;
				const data = await res.json();
				const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
				return JSON.parse(text) as GeminiBrandFields;
			} catch {
				// fall through to next attempt/key
			}
		}
	}
	throw new Error("All Gemini keys rate-limited or failed generating brand fields");
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates a full draft for one new ticker: real Finnhub profile + financials,
 * Gemini-written narrative/personality/tags (constrained to the existing closed
 * vocabularies where possible), and deterministically-computed peerTickers (no
 * AI call needed for that part). Returns a plain JSON-serializable object for
 * human review -- does not write to any file.
 */
export async function generateBrandDraft(tickerInput: string): Promise<BrandDraft> {
	const ticker = tickerInput.trim().toUpperCase();
	if (!ticker) throw new Error("Ticker is required");

	const [profile, metrics] = await Promise.all([fetchCompanyProfile(ticker), fetchMetrics(ticker)]);
	const gemini = await callGemini(buildPrompt(ticker, profile, metrics));

	const marketCapValue = metrics.marketCapitalization != null ? formatMarketCap(metrics.marketCapitalization) : "N/A";

	// Give getPeerTickers a real market cap to rank against even though this
	// ticker isn't in the committed catalog yet -- without this, ranking would
	// silently fall back to alphabetical for every candidate.
	const selfStub = { ticker, financials: { marketCap: { value: marketCapValue } } } as BrandProfile;
	const peerTickers = getPeerTickers(ticker, [...brands, selfStub], 5, gemini.primaryCategory);

	const draft: BrandDraft = {
		id: ticker.toLowerCase(),
		ticker,
		name: profile.name,
		domain: getDomain(profile),
		bio: gemini.bio,
		heroImage: getHeroImage(profile.finnhubIndustry),
		personalityDescription: gemini.personalityDescription,
		vibes: gemini.vibes,
		culturalContext: gemini.culturalContext,
		financials: {
			peRatio:       { ...METRIC_META.peRatio,       value: metrics.peTTM != null ? metrics.peTTM.toFixed(1) : "N/A",                                culturalTranslation: gemini.financialsCulturalTranslation.peRatio },
			marketCap:     { ...METRIC_META.marketCap,     value: marketCapValue,                                                                          culturalTranslation: gemini.financialsCulturalTranslation.marketCap },
			revenueGrowth: { ...METRIC_META.revenueGrowth, value: metrics.revenueGrowthTTMYoy != null ? `${metrics.revenueGrowthTTMYoy.toFixed(1)}%` : "N/A", culturalTranslation: gemini.financialsCulturalTranslation.revenueGrowth },
			profitMargin:  { ...METRIC_META.profitMargin,  value: metrics.netProfitMarginTTM != null ? `${metrics.netProfitMarginTTM.toFixed(1)}%` : "N/A",  culturalTranslation: gemini.financialsCulturalTranslation.profitMargin },
			beta:          { ...METRIC_META.beta,          value: metrics.beta != null ? metrics.beta.toFixed(2) : "N/A",                                   culturalTranslation: gemini.financialsCulturalTranslation.beta },
			dividendYield: { ...METRIC_META.dividendYield, value: metrics.dividendYieldIndicatedAnnual != null ? `${metrics.dividendYieldIndicatedAnnual.toFixed(2)}%` : "0%", culturalTranslation: gemini.financialsCulturalTranslation.dividendYield },
		},
		logo: profile.logo || undefined,
		interestCategories: gemini.interestCategories,
		peerTickers,
		sourceSection: "New additions",
		primaryCategory: gemini.primaryCategory,
		displayTags: gemini.displayTags,
		learningTags: gemini.learningTags,
	};

	return draft;
}

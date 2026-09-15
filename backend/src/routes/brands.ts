import { Router } from "express";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { pgQuery } from "../lib/postgres.js";
import { brands } from "@stak/shared/brands";
import type { BrandProfile, BrandSummary } from "@stak/shared";
import { getBrandLogoUrl, getBrandHeroUrl } from "@stak/shared";
import { getGeminiKeys, GEMINI_MODEL, geminiUrl, withGeminiConcurrencyLimit } from "../services/geminiService.js";
import { getCompanyNews } from "../services/finnhubService.js";

export const brandsRouter = Router();

// Fields needed for list/card-style views (Discover deck, search results, watchlist
// rows) -- deliberately excludes the heaviest text fields (culturalContext.sections,
// personalityDescription, and each financial metric's label/explanation/
// culturalTranslation) since those are only needed when viewing one brand's full
// detail sheet, fetched separately via GET /:id. This is what keeps this list
// response small and roughly flat as the catalog grows toward 2000 entries, instead
// of scaling with the full per-brand payload size. Shape is BrandSummary, defined
// in @stak/shared so the frontend's expectation of this response can't drift from it.
function toSummary(b: BrandProfile): BrandSummary {
	return {
		id: b.id,
		ticker: b.ticker,
		name: b.name,
		bio: b.bio,
		heroImage: b.heroImage,
		logo: b.logo || getBrandHeroUrl(b.id) || getBrandLogoUrl(b),
		domain: b.domain,
		interestCategories: b.interestCategories,
		vibes: b.vibes,
		financials: {
			peRatio: { value: b.financials.peRatio.value },
			marketCap: { value: b.financials.marketCap.value },
			revenueGrowth: { value: b.financials.revenueGrowth.value },
			profitMargin: { value: b.financials.profitMargin.value },
			beta: { value: b.financials.beta.value },
			dividendYield: { value: b.financials.dividendYield.value },
		},
		peerTickers: b.peerTickers,
	};
}

// GET /api/brands — lightweight summary of every brand in the catalog.
// Was reading a Firestore "brands" collection that nothing in the backend ever
// wrote to (always empty) -- the real catalog lives in @stak/shared.
brandsRouter.get("/", (_req, res) => {
	res.json({ brands: brands.map(toSummary) });
});

// GET /api/brands/popular — brand IDs saved by 50+ users (4h cache)
brandsRouter.get("/popular", async (_req, res) => {
	const CACHE_KEY = "brands:popular";
	const MIN_SAVES = 50;

	try {
		const cached = await cacheGet<{ brandIds: string[] }>(CACHE_KEY);
		if (cached) {
			res.json(cached);
			return;
		}

		const result = await pgQuery<{ brand_id: string }>(
			`select brand_id from stak_brands group by brand_id having count(*) >= $1`,
			[MIN_SAVES],
		);
		const brandIds = result.rows.map((r) => r.brand_id);

		const payload = { brandIds };
		await cacheSet(CACHE_KEY, payload, 4 * 60 * 60 * 1000);
		res.json(payload);
	} catch (error) {
		console.error("Error fetching popular brands:", error);
		res.status(500).json({ error: "Failed to fetch popular brands" });
	}
});

// GET /api/brands/:id/tip — Gemini-generated 2-sentence investment tip (24h cache).
brandsRouter.get("/:id/tip", async (req, res) => {
	const brand = brands.find((b) => b.id === req.params.id);
	if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

	const CACHE_KEY = `brand:v2:${req.params.id}:tip`;
	const cached = await cacheGet<{ tip: string }>(CACHE_KEY);
	if (cached) { res.json(cached); return; }

	const keys = getGeminiKeys();
	if (!keys.length) { res.json({ tip: "" }); return; }

	const prompt = `You write investment tip cards for a finance app for young retail investors.
Write a TWO-SENTENCE tip for ${brand.name} (${brand.ticker}).
Each sentence must be under 8 words. Plain language. Punchy. Specific to this stock's nature or risk.

Examples:
"Chip stocks swing hard. Small stakes, long views."
"Steady giants move slower. Stable stocks often do."
"Ad money tracks the economy. Some quarters drift."

Brand: ${brand.name} (${brand.ticker})
Bio: ${brand.bio}
Beta: ${brand.financials.beta.value}
PE: ${brand.financials.peRatio.value}
Sectors: ${(brand.interestCategories ?? []).slice(0, 3).join(", ")}

Return ONLY the two-sentence tip. Nothing else.`;

	try {
		const resp = await fetch(geminiUrl(GEMINI_MODEL, keys[0]), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.7, maxOutputTokens: 80 },
			}),
		});
		const data = await resp.json() as any;
		const tip: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
		if (tip) await cacheSet(CACHE_KEY, { tip }, 24 * 60 * 60 * 1000);
		res.json({ tip });
	} catch {
		res.json({ tip: "" });
	}
});

// Themes the Quick Look may tag a brand with - a closed set so clients can style them consistently.
const QUICK_LOOK_THEMES = [
	"Growth potential", "Strong business", "Upcoming catalyst", "Industry leader", "Dividend income",
	"High volatility", "Turnaround story", "Undervalued", "AI & tech", "Consumer favorite", "Defensive pick",
] as const;

interface QuickLook {
	in10Seconds: string;
	whyNow: string;
	setup: string;
	catch: string;
	whatToWatch: string;
	keyThemes: string[];
}

function normalizeQuickLook(p: Partial<QuickLook>): QuickLook | null {
	const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
	const allowed: readonly string[] = QUICK_LOOK_THEMES;
	const q: QuickLook = {
		in10Seconds: str(p.in10Seconds),
		whyNow: str(p.whyNow),
		setup: str(p.setup),
		catch: str(p.catch),
		whatToWatch: str(p.whatToWatch),
		keyThemes: Array.isArray(p.keyThemes) ? p.keyThemes.filter((t) => allowed.includes(t)).slice(0, 4) : [],
	};
	return q.in10Seconds && q.whyNow && q.setup && q.catch && q.whatToWatch ? q : null;
}

// GET /api/brands/:id/quick-look — Gemini-written 30-second overview for the Discover
// Quick Look sheet (24h cache). Recent headlines keep "Why now" current without a
// grounded search call. Returns { quickLook: null } on failure so clients fall back.
brandsRouter.get("/:id/quick-look", async (req, res) => {
	const brand = brands.find((b) => b.id === req.params.id);
	if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

	const CACHE_KEY = `brand:v1:${req.params.id}:quick-look`;
	const cached = await cacheGet<{ quickLook: QuickLook }>(CACHE_KEY);
	if (cached) { res.json(cached); return; }

	const keys = getGeminiKeys();
	if (!keys.length) { res.json({ quickLook: null }); return; }

	const headlines = await getCompanyNews(brand.ticker, 8, brand.name)
		.then((articles) => articles.slice(0, 6).map((a) => `- ${a.headline}`).join("\n"))
		.catch(() => "");
	const f = brand.financials;

	const prompt = `You write the "Quick Look" card in a finance app for young, first-time investors.
Give a plain-language 30-second overview of ${brand.name} (${brand.ticker}).

About: ${brand.bio}
P/E: ${f.peRatio.value} | Revenue growth: ${f.revenueGrowth.value} | Profit margin: ${f.profitMargin.value} | Beta: ${f.beta.value} | Market cap: ${f.marketCap.value}
Recent headlines:
${headlines || "(none available)"}

Return JSON with exactly these keys:
{
"in10Seconds": "what the company does and how it makes money, under 30 words",
"whyNow": "why investors are watching it right now; use the headlines when relevant, under 30 words",
"setup": "the bull case, what could go right, under 25 words",
"catch": "the main risk, what could go wrong, under 25 words",
"whatToWatch": "the next concrete checkpoint (earnings, a launch, demand data), under 25 words",
"keyThemes": ["2 to 4 themes, chosen ONLY from: ${QUICK_LOOK_THEMES.join(", ")}"]
}
Plain words, no jargon. Use the bio as background only and write in your own neutral words, not its slang. No advice ("you should"), no disclaimers. Do not invent numbers or events that are not given above.`;

	const quickLook = await withGeminiConcurrencyLimit(() => generateQuickLook(prompt, keys, brand.ticker));
	if (quickLook) await cacheSet(CACHE_KEY, { quickLook }, 24 * 60 * 60 * 1000);
	res.json({ quickLook });
});

/** Tries each Gemini key until one yields a usable Quick Look; 429/403 and bad replies move on. */
async function generateQuickLook(prompt: string, keys: string[], ticker: string): Promise<QuickLook | null> {
	for (const key of keys) {
		try {
			const resp = await fetch(geminiUrl(GEMINI_MODEL, key), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				// Gemini 503s can hang; bound each attempt so the next key gets a turn.
				signal: AbortSignal.timeout(15_000),
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.4, responseMimeType: "application/json" },
				}),
			});
			if (!resp.ok) {
				console.warn(`[Gemini] quick-look ${ticker}: HTTP ${resp.status}`);
				continue;
			}
			const data = await resp.json() as any;
			const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
			if (!text) {
				console.warn(`[Gemini] quick-look ${ticker}: empty reply (finishReason ${data?.candidates?.[0]?.finishReason ?? "none"})`);
				continue;
			}
			// Gemini occasionally fences JSON despite responseMimeType
			const quickLook = normalizeQuickLook(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
			if (quickLook) return quickLook;
			console.warn(`[Gemini] quick-look ${ticker}: reply missing required fields`);
		} catch (error) {
			console.warn(`[Gemini] quick-look ${ticker} failed:`, error);
		}
	}
	return null;
}

// GET /api/brands/:id — one brand's full profile (everything -- the heavy text
// fields summary list above omits). Fetched on demand when actually viewing a
// brand's detail sheet, not bundled wholesale with the list.
brandsRouter.get("/:id", (req, res) => {
	const brand = brands.find((b) => b.id === req.params.id);
	if (!brand) {
		res.status(404).json({ error: "Brand not found" });
		return;
	}
	res.json(brand);
});

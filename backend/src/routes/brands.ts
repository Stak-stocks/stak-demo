import { Router } from "express";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { pgQuery } from "../lib/postgres.js";
import { brands } from "@stak/shared/brands";
import type { BrandProfile, BrandSummary } from "@stak/shared";
import { getBrandLogoUrl, getBrandHeroUrl } from "@stak/shared";
import { getGeminiKeys, GEMINI_MODEL, geminiUrl } from "../services/geminiService.js";

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

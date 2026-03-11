import { Router } from "express";
import { getNewsSentiment, getMarketCap } from "../services/finnhubService.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

const VIBES_TTL_MS = 60 * 60 * 1000; // 1 hour — sentiment & market cap don't change minute-to-minute

export const vibesRouter = Router();

/** Map market cap (millions USD) to a 0–100 Clout score on a log scale.
 *  ~$1B → 20, ~$10B → 43, ~$100B → 66, ~$1T → 89, ~$3T → 98 */
function marketCapToClout(marketCapMillion: number): number {
	if (marketCapMillion <= 0) return 30;
	const log = Math.log10(marketCapMillion);
	const raw = ((log - 3) / (6.5 - 3)) * 78 + 20;
	return Math.max(10, Math.min(100, Math.round(raw)));
}

// GET /api/vibes/:ticker
vibesRouter.get("/:ticker", async (req, res) => {
	const ticker = req.params.ticker.toUpperCase();
	const cacheKey = `vibes:${ticker}`;

	try {
		const cached = await cacheGet<object>(cacheKey);
		if (cached) { res.json(cached); return; }

		const [sentiment, marketCapMillion] = await Promise.all([
			getNewsSentiment(ticker),
			getMarketCap(ticker),
		]);

		// Internet Hype: buzz score (0–1) scaled to 0–100
		const internetHype = sentiment
			? Math.max(1, Math.min(100, Math.round(sentiment.buzz * 100)))
			: null;

		// Drama Level: noisy AND divisive coverage = high drama
		const dramaLevel = sentiment
			? (() => {
				const controversiality = 1 - Math.abs(sentiment.bullishPercent - sentiment.bearishPercent);
				return Math.max(1, Math.min(100, Math.round((sentiment.buzz * 0.5 + controversiality * 0.5) * 100)));
			})()
			: null;

		// Clout: log-scaled market cap
		const clout = marketCapMillion ? marketCapToClout(marketCapMillion) : null;

		const result = { ticker, internetHype, dramaLevel, clout };
		await cacheSet(cacheKey, result, VIBES_TTL_MS);
		res.json(result);
	} catch (error) {
		console.error(`Error fetching vibes for ${ticker}:`, error);
		res.status(500).json({ error: "Failed to fetch vibes" });
	}
});

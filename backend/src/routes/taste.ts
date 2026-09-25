import { Router } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { STAK_WEIGHTED_STOCK_TAGS, type StakStockTagConfig } from "@stak/shared";
import { brands } from "@stak/shared/brands";
import { pgQuery } from "../lib/postgres.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * The Taste Graph: what a user's own behaviour says they gravitate toward.
 *
 * Built only from things the user did - saved a company, passed on one, opened Learn
 * more, opened a stock's page - never from a guess about what they know or intend.
 * Shares describe interest signals, NOT money: nothing here implies an allocation.
 *
 * Costs nothing to generate (no AI, one query per source), so it can be read whenever
 * My STAK opens.
 */
export const tasteRouter = Router();

/** How much each action counts. A pass is real evidence too - of what someone avoids. */
const WEIGHT = { save: 5, right_swipe: 5, learn_more: 3, stock_detail_open: 1, left_swipe: -2 } as const;

/** Only the last quarter's behaviour: a taste from a year ago is not today's. */
const WINDOW_DAYS = 90;
/** Beyond a handful, repeat visits to one company say little more than the first few. */
const DETAIL_OPENS_PER_TICKER = 5;
const LEARN_MORES_PER_TICKER = 3;
/** Under this, STAK says it is still learning rather than naming a lead. */
const MIN_SIGNALS = 5;

const CATEGORY_BY_TICKER = new Map(
	(STAK_WEIGHTED_STOCK_TAGS as unknown as StakStockTagConfig[]).map((s) => [s.ticker.toUpperCase(), s.primaryCategory]),
);
const BRAND_BY_ID = new Map(brands.map((b) => [b.id, { ticker: b.ticker.toUpperCase(), name: b.name }]));

type Theme = {
	/** The backend's category id; the app supplies the words for it. */
	category: string;
	/** Interest score, and its share of all positive interest. */
	score: number;
	share: number;
	/** What produced it, so the app can show the evidence. */
	saves: number;
	learnMores: number;
	opens: number;
	passes: number;
	/** Up to three company names behind the saves, newest first. */
	savedNames: string[];
	/** When the newest of those saves happened, so the app can say "this week". */
	lastSavedAt: string | null;
};

function categoryOf(ticker: string | null | undefined): string | null {
	if (!ticker) return null;
	return CATEGORY_BY_TICKER.get(ticker.toUpperCase()) ?? null;
}

// GET /api/me/taste — the Taste Graph for the signed-in user.
tasteRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const cacheKey = `taste:v1:${uid}`;
		const cached = await cacheGet<unknown>(cacheKey);
		if (cached) { res.json(cached); return; }

		const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
		const [saved, swipes, events] = await Promise.all([
			pgQuery<{ brand_id: string; saved_at: string }>(
				`select brand_id, saved_at from stak_brands where uid = $1 order by saved_at desc`, [uid],
			),
			pgQuery<{ ticker: string | null; direction: string }>(
				`select ticker, direction from swipes where uid = $1 and occurred_at >= $2`, [uid, since],
			),
			pgQuery<{ ticker: string | null; type: string; n: number }>(
				`select ticker, type, count(*)::int as n from events
				 where uid = $1 and occurred_at >= $2 and ticker is not null and type in ('learn_more', 'stock_detail_open')
				 group by ticker, type`,
				[uid, since],
			),
		]);

		const themes = new Map<string, Theme>();
		const add = (category: string | null, patch: Partial<Theme> & { score: number }) => {
			if (!category) return;
			const t = themes.get(category) ?? { category, score: 0, share: 0, saves: 0, learnMores: 0, opens: 0, passes: 0, savedNames: [], lastSavedAt: null };
			t.score += patch.score;
			t.saves += patch.saves ?? 0;
			t.learnMores += patch.learnMores ?? 0;
			t.opens += patch.opens ?? 0;
			t.passes += patch.passes ?? 0;
			if (patch.savedNames?.length && t.savedNames.length < 3) t.savedNames.push(...patch.savedNames.slice(0, 3 - t.savedNames.length));
			// The saves arrive newest first, so the first one to land is the newest.
			if (patch.lastSavedAt && !t.lastSavedAt) t.lastSavedAt = patch.lastSavedAt;
			themes.set(category, t);
		};

		// Saves are the strongest signal, and the only one not limited to the window:
		// a company someone still keeps saved is still a company they care about.
		let totalSaves = 0;
		for (const row of saved.rows) {
			const brand = BRAND_BY_ID.get(row.brand_id);
			if (!brand) continue;
			totalSaves++;
			add(categoryOf(brand.ticker), { score: WEIGHT.save, saves: 1, savedNames: [brand.name], lastSavedAt: row.saved_at });
		}
		// The swipe that made a save and the save itself are one decision, so a stock
		// still saved is counted once, as a save. A right swipe on a stock since
		// unsaved still counts: it happened, and the unsave is its own signal.
		const savedTickers = new Set(saved.rows.map((r) => BRAND_BY_ID.get(r.brand_id)?.ticker).filter((t): t is string => !!t));
		for (const row of swipes.rows) {
			const category = categoryOf(row.ticker);
			if (row.direction === "right") {
				if (row.ticker && savedTickers.has(row.ticker.toUpperCase())) continue;
				add(category, { score: WEIGHT.right_swipe });
			} else {
				add(category, { score: WEIGHT.left_swipe, passes: 1 });
			}
		}
		for (const row of events.rows) {
			const category = categoryOf(row.ticker);
			if (row.type === "learn_more") {
				const n = Math.min(row.n, LEARN_MORES_PER_TICKER);
				add(category, { score: WEIGHT.learn_more * n, learnMores: n });
			}
			else {
				const n = Math.min(row.n, DETAIL_OPENS_PER_TICKER);
				add(category, { score: WEIGHT.stock_detail_open * n, opens: n });
			}
		}

		// Only themes with net positive interest have a share of it. A theme in the red
		// (passed more than engaged) is what the user avoids, not what draws them.
		const positive = [...themes.values()].filter((t) => t.score > 0);
		const total = positive.reduce((sum, t) => sum + t.score, 0);
		const ranked = positive
			.map((t) => ({ ...t, share: total > 0 ? t.score / total : 0 }))
			.sort((a, b) => b.score - a.score);

		// Counted the same way the score is: a save and the swipe that made it are one
		// decision, so one save can't pass for two signals and end "still learning" early.
		const countedSwipes = swipes.rows.filter(
			(r) => !(r.direction === "right" && r.ticker && savedTickers.has(r.ticker.toUpperCase())),
		).length;
		const signals = totalSaves + countedSwipes + events.rows.reduce((n, e) => n + e.n, 0);
		const body = {
			/** Ranked strongest first; the app decides how many to show. */
			themes: ranked.slice(0, 6),
			/** Everything outside the top themes, as one share. */
			otherShare: ranked.slice(6).reduce((sum, t) => sum + t.share, 0),
			totalSaves,
			signals,
			/** Too little behaviour to name a lead yet. */
			learning: signals < MIN_SIGNALS,
		};
		// Short: a save, a pass or a Learn more should show up in the reading it just
		// changed, and the three queries behind this are all index-covered.
		await cacheSet(cacheKey, body, 60 * 1000);
		res.json(body);
	} catch (error) {
		console.error("Error computing taste:", error);
		res.status(500).json({ error: "Failed to compute taste" });
	}
});

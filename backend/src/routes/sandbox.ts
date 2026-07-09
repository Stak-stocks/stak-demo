import { Router } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { pgQuery, pgPool } from "../lib/postgres.js";
import { getFinnhubKeys } from "../services/finnhubService.js";

export const sandboxRouter = Router();

const FINNHUB_BASE = "https://finnhub.io/api/v1";

async function getLivePrice(symbol: string): Promise<number | null> {
	const keys = getFinnhubKeys();
	for (const key of keys) {
		try {
			const res = await fetch(
				`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
				{ signal: AbortSignal.timeout(8000) },
			);
			if (!res.ok) continue;
			const data = await res.json() as { c?: number };
			if (typeof data.c === "number" && data.c > 0) return data.c;
		} catch { continue; }
	}
	return null;
}

// Mirrors xp_to_sandbox_tier() and sandbox_budget_for_tier() SQL functions exactly.
function xpToSandboxTier(xp: number): number {
	if (xp >= 7500) return 5;
	if (xp >= 3500) return 4;
	if (xp >= 1500) return 3;
	if (xp >= 500) return 2;
	return 1;
}

function sandboxBudgetForTier(tier: number): number {
	const budgets: Record<number, number> = { 1: 1000, 2: 3000, 3: 5000, 4: 10000, 5: 25000 };
	return budgets[tier] ?? 1000;
}

// POST /api/sandbox/init — set starting cash/tier if sandbox_cash is NULL
sandboxRouter.post("/init", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { rows } = await pgQuery<{ total_xp: number | null }>(
			`SELECT total_xp FROM playground_state WHERE uid = $1`,
			[uid],
		);
		const xp = rows[0]?.total_xp ?? 0;
		const tier = xpToSandboxTier(xp);
		const budget = sandboxBudgetForTier(tier);

		await pgQuery(
			`INSERT INTO playground_state (uid, sandbox_cash, sandbox_tier)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (uid) DO UPDATE
			   SET sandbox_cash = COALESCE(playground_state.sandbox_cash, $2),
			       sandbox_tier = COALESCE(playground_state.sandbox_tier, $3)
			 WHERE playground_state.sandbox_cash IS NULL`,
			[uid, budget, tier],
		);

		res.json({ ok: true });
	} catch (e) {
		console.error("[sandbox] init error:", e);
		res.status(500).json({ error: "Failed to initialize sandbox" });
	}
});

// POST /api/sandbox/buy — fetch live Finnhub price, validate cash, atomically update position + deduct cash
sandboxRouter.post("/buy", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { ticker, shares, thesis } = req.body as { ticker?: string; shares?: unknown; thesis?: string };

		if (typeof ticker !== "string" || !ticker.trim()) {
			res.status(400).json({ error: "ticker required" });
			return;
		}
		const parsedShares = Number(shares);
		if (!Number.isFinite(parsedShares) || parsedShares <= 0) {
			res.status(400).json({ error: "shares must be a positive number" });
			return;
		}

		const symbol = ticker.toUpperCase().trim();
		const price = await getLivePrice(symbol);
		if (!price) {
			res.status(422).json({ error: `Could not fetch live price for ${symbol}` });
			return;
		}

		const roundedShares = Math.round(parsedShares * 1000) / 1000;
		const cost = Math.round(price * roundedShares * 100) / 100;

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			// Lock the cash row; fail fast if sandbox was never initialised
			const cashRow = await client.query<{ sandbox_cash: number | null }>(
				`SELECT sandbox_cash FROM playground_state WHERE uid = $1 FOR UPDATE`,
				[uid],
			);
			const cash = cashRow.rows[0]?.sandbox_cash ?? null;

			if (cash === null || cash < cost) {
				await client.query("ROLLBACK");
				res.status(422).json({ error: "Insufficient buying power" });
				return;
			}

			// Existing position (for weighted average cost basis)
			const posRow = await client.query<{ shares: string; price_at_add: string; added_at: string }>(
				`SELECT shares, price_at_add, added_at FROM sandbox_portfolio WHERE uid = $1 AND ticker = $2`,
				[uid, symbol],
			);

			const existingShares = posRow.rows[0] ? Number(posRow.rows[0].shares) : 0;
			const newShares = Math.round((existingShares + roundedShares) * 1000) / 1000;

			let newPrice: number;
			if (existingShares > 0 && posRow.rows[0]?.price_at_add) {
				const existingPrice = Number(posRow.rows[0].price_at_add);
				newPrice = Math.round(((existingPrice * existingShares + price * roundedShares) / newShares) * 100) / 100;
			} else {
				newPrice = price;
			}

			const addedAt = posRow.rows[0]?.added_at ?? new Date().toISOString();

			await client.query(
				`INSERT INTO sandbox_portfolio (uid, ticker, shares, price_at_add, added_at, thesis)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 ON CONFLICT (uid, ticker) DO UPDATE
				   SET shares = EXCLUDED.shares, price_at_add = EXCLUDED.price_at_add,
				       thesis = COALESCE(EXCLUDED.thesis, sandbox_portfolio.thesis)`,
				[uid, symbol, newShares, newPrice, addedAt, thesis ?? null],
			);

			await client.query(
				`UPDATE playground_state SET sandbox_cash = ROUND(sandbox_cash - $1, 2) WHERE uid = $2`,
				[cost, uid],
			);

			await client.query("COMMIT");

			res.json({
				price,
				shares: newShares,
				costBasis: newPrice,
				cost,
				remainingCash: Math.round((cash - cost) * 100) / 100,
			});
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[sandbox] buy error:", e);
		res.status(500).json({ error: "Failed to execute buy" });
	}
});

// POST /api/sandbox/sell — fetch live Finnhub price, atomically reduce/remove position + credit cash
sandboxRouter.post("/sell", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { ticker, shares } = req.body as { ticker?: string; shares?: unknown };

		if (typeof ticker !== "string" || !ticker.trim()) {
			res.status(400).json({ error: "ticker required" });
			return;
		}

		const symbol = ticker.toUpperCase().trim();
		const price = await getLivePrice(symbol);
		if (!price) {
			res.status(422).json({ error: `Could not fetch live price for ${symbol}` });
			return;
		}

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			const posRow = await client.query<{ shares: string }>(
				`SELECT shares FROM sandbox_portfolio WHERE uid = $1 AND ticker = $2 FOR UPDATE`,
				[uid, symbol],
			);

			if (!posRow.rows[0]) {
				await client.query("ROLLBACK");
				res.status(422).json({ error: `No position found for ${symbol}` });
				return;
			}

			const existingShares = Number(posRow.rows[0].shares);
			const sharesToSell = shares != null
				? Math.round(Number(shares) * 1000) / 1000
				: existingShares;

			if (sharesToSell <= 0 || sharesToSell > existingShares + 0.001) {
				await client.query("ROLLBACK");
				res.status(422).json({ error: "Invalid shares quantity" });
				return;
			}

			const sellValue = Math.round(price * sharesToSell * 100) / 100;
			const remaining = Math.round((existingShares - sharesToSell) * 1000) / 1000;

			if (remaining <= 0.001) {
				await client.query(
					`DELETE FROM sandbox_portfolio WHERE uid = $1 AND ticker = $2`,
					[uid, symbol],
				);
			} else {
				await client.query(
					`UPDATE sandbox_portfolio SET shares = $1 WHERE uid = $2 AND ticker = $3`,
					[remaining, uid, symbol],
				);
			}

			await client.query(
				`UPDATE playground_state
				 SET sandbox_cash = ROUND(COALESCE(sandbox_cash, 0) + $1, 2)
				 WHERE uid = $2`,
				[sellValue, uid],
			);

			await client.query("COMMIT");

			res.json({ price, sharesToSell, sellValue, remaining: remaining <= 0.001 ? 0 : remaining });
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[sandbox] sell error:", e);
		res.status(500).json({ error: "Failed to execute sell" });
	}
});

// POST /api/sandbox/reset — clear portfolio, restore tier-based starting cash
sandboxRouter.post("/reset", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { rows } = await pgQuery<{ total_xp: number | null }>(
			`SELECT total_xp FROM playground_state WHERE uid = $1`,
			[uid],
		);
		const xp = rows[0]?.total_xp ?? 0;
		const tier = xpToSandboxTier(xp);
		const budget = sandboxBudgetForTier(tier);

		// Both writes in a transaction so portfolio and cash never disagree mid-reset
		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");
			await client.query(`DELETE FROM sandbox_portfolio WHERE uid = $1`, [uid]);
			await client.query(
				`INSERT INTO playground_state (uid, sandbox_cash, sandbox_tier, sandbox_milestones)
				 VALUES ($1, $2, $3, '{}')
				 ON CONFLICT (uid) DO UPDATE
				   SET sandbox_cash = $2, sandbox_tier = $3, sandbox_milestones = '{}'`,
				[uid, budget, tier],
			);
			await client.query("COMMIT");
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}

		res.json({ ok: true, cash: budget, tier });
	} catch (e) {
		console.error("[sandbox] reset error:", e);
		res.status(500).json({ error: "Failed to reset sandbox" });
	}
});

// POST /api/sandbox/milestone — append portfolio-value milestone if not already recorded
sandboxRouter.post("/milestone", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { value } = req.body as { value?: unknown };
		if (typeof value !== "number" || !Number.isInteger(value)) {
			res.status(400).json({ error: "value must be an integer" });
			return;
		}

		// Single atomic statement — no transaction needed (no read-then-write race)
		await pgQuery(
			`UPDATE playground_state
			 SET sandbox_milestones = array_append(COALESCE(sandbox_milestones, '{}'), $1)
			 WHERE uid = $2 AND NOT ($1 = ANY(COALESCE(sandbox_milestones, '{}')))`,
			[value, uid],
		);

		res.json({ ok: true });
	} catch (e) {
		console.error("[sandbox] milestone error:", e);
		res.status(500).json({ error: "Failed to record milestone" });
	}
});

// POST /api/sandbox/tier-upgrade — top up cash if XP tier has increased since last stored tier
sandboxRouter.post("/tier-upgrade", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			const row = (await client.query<{ total_xp: number | null; sandbox_tier: number | null; sandbox_cash: number | null }>(
				`SELECT total_xp, sandbox_tier, sandbox_cash FROM playground_state WHERE uid = $1 FOR UPDATE`,
				[uid],
			)).rows[0];

			if (!row || row.sandbox_cash === null) {
				await client.query("ROLLBACK");
				res.json({ ok: true });
				return;
			}

			const currentTier = xpToSandboxTier(row.total_xp ?? 0);
			const storedTier = row.sandbox_tier;

			if (storedTier === null) {
				await client.query(
					`UPDATE playground_state SET sandbox_tier = $1 WHERE uid = $2`,
					[currentTier, uid],
				);
				await client.query("COMMIT");
				res.json({ ok: true });
				return;
			}

			if (currentTier <= storedTier) {
				await client.query("ROLLBACK");
				res.json({ ok: true });
				return;
			}

			const increase = sandboxBudgetForTier(currentTier) - sandboxBudgetForTier(storedTier);
			await client.query(
				`UPDATE playground_state
				 SET sandbox_cash = ROUND(sandbox_cash + $1, 2), sandbox_tier = $2
				 WHERE uid = $3`,
				[increase, currentTier, uid],
			);
			await client.query("COMMIT");

			res.json({ ok: true, increase, newTier: currentTier });
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[sandbox] tier-upgrade error:", e);
		res.status(500).json({ error: "Failed to apply tier upgrade" });
	}
});

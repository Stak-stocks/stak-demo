import { Router } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { pgQuery, pgPool } from "../lib/postgres.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { getFinnhubKeys } from "../services/finnhubService.js";
import {
	SANDBOX_STARTING_BALANCES, SANDBOX_DEFAULT_STARTING_BALANCE, SANDBOX_STRATEGIES,
	SANDBOX_MAX_OPEN_ORDERS, SANDBOX_MIN_SHARES, SANDBOX_NAME_MAX_LENGTH, marketSessionBucket,
} from "@stak/shared";
import { FINNHUB_BASE } from "../services/finnhubService.js";

export const sandboxRouter = Router();

const STRATEGY_IDS: readonly string[] = SANDBOX_STRATEGIES.map((s) => s.id);
// $100,000 is no longer offered (2026-10-07), but app builds already installed still show it: they set up as
// before rather than meeting a refusal they can't explain. Drop it once those builds have aged out.
const STARTING_BALANCES: readonly number[] = [...SANDBOX_STARTING_BALANCES, 100_000];
const MIN_SHARES = SANDBOX_MIN_SHARES;

/**
 * Live price for a fill. Shares stock.ts's `quote:fb:{symbol}` cache entry (15s while the
 * market is open, a minute otherwise) so a burst of trades or the scheduled /fill-orders run
 * doesn't spend a Finnhub call per request on a symbol the price feeds already fetched - and
 * a fill never lands on a number older than the price the user was just looking at.
 */
async function getLivePrice(symbol: string): Promise<number | null> {
	const cacheKey = `quote:fb:${symbol}`;
	const cached = await cacheGet<{ c?: number }>(cacheKey).catch(() => null);
	if (cached && typeof cached.c === "number" && cached.c > 0) return cached.c;

	const keys = getFinnhubKeys();
	for (const key of keys) {
		try {
			const res = await fetch(
				`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
				{ signal: AbortSignal.timeout(8000) },
			);
			if (!res.ok) continue;
			const data = await res.json() as { c?: number };
			if (typeof data.c === "number" && data.c > 0) {
				await cacheSet(cacheKey, data, marketSessionBucket() === "open" ? 15_000 : 60_000).catch(() => {});
				return data.c;
			}
		} catch { continue; }
	}
	return null;
}

/** Promise.all with at most `limit` of `fn` running at once; results keep input order. */
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out = new Array<R>(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i]!);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return out;
}



// POST /api/sandbox/init — retired 2026-10-07: a portfolio now starts at /setup, on the amount
// its owner picks, rather than on an XP-tier grant. Kept as a no-op so an older client's call
// can't fail - and can't hand out tier cash.
sandboxRouter.post("/init", authMiddleware, (_req: AuthenticatedRequest, res) => {
	res.json({ ok: true });
});

// POST /api/sandbox/buy — fetch live Finnhub price, validate cash, atomically update position + deduct cash
sandboxRouter.post("/buy", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { ticker, shares, thesis, amount } = req.body as { ticker?: string; shares?: unknown; thesis?: string; amount?: unknown };

		if (typeof ticker !== "string" || !ticker.trim()) {
			res.status(400).json({ error: "ticker required" });
			return;
		}
		const parsedShares = shares != null ? Number(shares) : null;
		const parsedAmount = amount != null ? Number(amount) : null;
		const hasValidShares = parsedShares !== null && Number.isFinite(parsedShares) && parsedShares > 0;
		const hasValidAmount = parsedAmount !== null && Number.isFinite(parsedAmount) && parsedAmount > 0;
		if (!hasValidShares && !hasValidAmount) {
			res.status(400).json({ error: "shares or amount must be a positive number" });
			return;
		}

		const symbol = ticker.toUpperCase().trim();
		const price = await getLivePrice(symbol);
		if (!price) {
			res.status(422).json({ error: `Could not fetch live price for ${symbol}` });
			return;
		}

		// amount (dollars to spend) is an alternative to shares — used by the web order sheet's
		// "spend $X" mode; shares wins if both are somehow given.
		// Spending an amount rounds DOWN: rounding up could cost a few cents more than the amount (and so more than the
		// cash, when the amount is all of it) and fail as "Insufficient buying power".
		const roundedShares = hasValidShares
			? Math.round(parsedShares! * 1000) / 1000
			: Math.floor((parsedAmount! / price) * 1000) / 1000;
		// A tiny amount on a pricey stock rounds to 0 shares, which would record an empty position and a $0 trade.
		if (roundedShares < MIN_SHARES) {
			res.status(422).json({ error: `That buys less than ${MIN_SHARES} of a share at $${price.toFixed(2)}. Spend a little more.` });
			return;
		}
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

			// Existing position (for weighted average cost basis) — locked, so a concurrent
			// /fill-orders fill on the same ticker can't read-compute-write over this one
			// (both recompute an absolute shares/price_at_add from their own read, so without
			// this lock the second writer to commit silently clobbers the first's numbers).
			const posRow = await client.query<{ shares: string; price_at_add: string; added_at: string }>(
				`SELECT shares, price_at_add, added_at FROM sandbox_portfolio WHERE uid = $1 AND ticker = $2 FOR UPDATE`,
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

			await client.query(
				`INSERT INTO sandbox_trades (uid, ticker, side, shares, price, amount, source)
				 VALUES ($1, $2, 'buy', $3, $4, $5, 'market')`,
				[uid, symbol, roundedShares, price, cost],
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
		const { ticker, shares, portion } = req.body as { ticker?: string; shares?: unknown; portion?: unknown };

		if (typeof ticker !== "string" || !ticker.trim()) {
			res.status(400).json({ error: "ticker required" });
			return;
		}
		if (portion != null) {
			const parsedPortion = Number(portion);
			if (!Number.isFinite(parsedPortion) || parsedPortion <= 0 || parsedPortion > 1) {
				res.status(400).json({ error: "portion must be between 0 and 1" });
				return;
			}
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

			// Locked first, same order every handler that touches both tables uses (/buy,
			// /reset, /setup, /orders/:id/cancel) — two handlers taking playground_state and
			// sandbox_portfolio/sandbox_orders in opposite orders is a deadlock waiting to
			// happen the moment two devices on the same account trade concurrently.
			await client.query(`SELECT uid FROM playground_state WHERE uid = $1 FOR UPDATE`, [uid]);

			const posRow = await client.query<{ shares: string; price_at_add: string }>(
				`SELECT shares, price_at_add FROM sandbox_portfolio WHERE uid = $1 AND ticker = $2 FOR UPDATE`,
				[uid, symbol],
			);

			if (!posRow.rows[0]) {
				await client.query("ROLLBACK");
				res.status(422).json({ error: `No position found for ${symbol}` });
				return;
			}

			const existingShares = Number(posRow.rows[0].shares);
			const sharesToSell = portion != null
				? Math.round(existingShares * Number(portion) * 1000) / 1000
				: shares != null
					? Math.round(Number(shares) * 1000) / 1000
					: existingShares;

			if (!Number.isFinite(sharesToSell) || sharesToSell <= 0 || sharesToSell > existingShares + 0.001) {
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

			// The position's average cost goes with the sale: realized gain = (price - cost_basis) x shares, with no need
			// for the buys to still be in the ledger (positions from before it existed, or past the page the apps read).
			const costBasis = posRow.rows[0].price_at_add != null ? Number(posRow.rows[0].price_at_add) : null;
			await client.query(
				`INSERT INTO sandbox_trades (uid, ticker, side, shares, price, amount, source, cost_basis)
				 VALUES ($1, $2, 'sell', $3, $4, $5, 'market', $6)`,
				[uid, symbol, sharesToSell, price, sellValue, costBasis],
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

// POST /api/sandbox/reset — clear portfolio, restore the starting cash the portfolio began on
sandboxRouter.post("/reset", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;

		// One transaction throughout, locking playground_state first (same order every
		// handler touching both tables uses — /buy, /sell, /setup, /orders/:id/cancel —
		// so two concurrent requests on the same account, e.g. web + Android, can't deadlock
		// on these two tables in opposite orders).
		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");
			const { rows } = await client.query<{
				sandbox_start: number | null; sandbox_name: string | null; sandbox_strategy: string | null;
			}>(
				`SELECT sandbox_start, sandbox_name, sandbox_strategy FROM playground_state WHERE uid = $1 FOR UPDATE`,
				[uid],
			);
			const row = rows[0];
			// Every portfolio has its start since the one-money-system migration (20261007000000); an
			// account that never set one up restarts on the default, never on an XP-tier grant.
			const budget = row?.sandbox_start != null ? Number(row.sandbox_start) : SANDBOX_DEFAULT_STARTING_BALANCE;

			await client.query(`DELETE FROM sandbox_portfolio WHERE uid = $1`, [uid]);
			// A reset/setup starts a new portfolio: its history starts with it. Leaving the old trades would
			// make any replay of the ledger (the web chart, realized gains) start from cash that no longer exists.
			await client.query(`DELETE FROM sandbox_trades WHERE uid = $1`, [uid]);
			await client.query(
				`UPDATE sandbox_orders SET status = 'cancelled', cancelled_at = now() WHERE uid = $1 AND status = 'open'`,
				[uid],
			);
			await client.query(
				`INSERT INTO playground_state (uid, sandbox_cash, sandbox_start, sandbox_cash_source, sandbox_milestones)
				 VALUES ($1, $2, $2, 'free_choice', '{}')
				 ON CONFLICT (uid) DO UPDATE
				   SET sandbox_cash = $2, sandbox_start = $2, sandbox_cash_source = 'free_choice', sandbox_milestones = '{}'`,
				[uid, budget],
			);
			await client.query("COMMIT");
			res.json({ ok: true, cash: budget, tier: null, name: row?.sandbox_name ?? null, strategy: row?.sandbox_strategy ?? null });
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
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

// POST /api/sandbox/tier-upgrade — retired 2026-10-07: XP tiers no longer add practice cash (one
// money system - the amount picked at /setup). Kept as a no-op for older clients that still call it.
sandboxRouter.post("/tier-upgrade", authMiddleware, (_req: AuthenticatedRequest, res) => {
	res.json({ ok: true });
});

// POST /api/sandbox/setup — the user picks a starting balance (what they'd really invest), a name
// and a strategy; every platform starts a portfolio here
sandboxRouter.post("/setup", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { startingBalance, name, strategy } = req.body as { startingBalance?: unknown; name?: unknown; strategy?: unknown };

		const balance = Number(startingBalance);
		if (!STARTING_BALANCES.includes(balance)) {
			res.status(400).json({ error: "Pick one of the starting balances shown." });
			return;
		}
		if (typeof name !== "string" || !name.trim() || name.trim().length > SANDBOX_NAME_MAX_LENGTH) {
			res.status(400).json({ error: `name required, up to ${SANDBOX_NAME_MAX_LENGTH} characters` });
			return;
		}
		if (typeof strategy !== "string" || !STRATEGY_IDS.includes(strategy)) {
			res.status(400).json({ error: `strategy must be one of ${STRATEGY_IDS.join(", ")}` });
			return;
		}
		const trimmedName = name.trim();

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");
			// Locked first, same order every handler touching both tables uses (see /sell's
			// comment) — avoids a deadlock against a concurrent /buy or /sell on this account.
			await client.query(`SELECT uid FROM playground_state WHERE uid = $1 FOR UPDATE`, [uid]);
			await client.query(`DELETE FROM sandbox_portfolio WHERE uid = $1`, [uid]);
			// A reset/setup starts a new portfolio: its history starts with it. Leaving the old trades would
			// make any replay of the ledger (the web chart, realized gains) start from cash that no longer exists.
			await client.query(`DELETE FROM sandbox_trades WHERE uid = $1`, [uid]);
			await client.query(
				`UPDATE sandbox_orders SET status = 'cancelled', cancelled_at = now() WHERE uid = $1 AND status = 'open'`,
				[uid],
			);
			await client.query(
				`INSERT INTO playground_state (uid, sandbox_cash, sandbox_start, sandbox_name, sandbox_strategy, sandbox_cash_source, sandbox_milestones)
				 VALUES ($1, $2, $2, $3, $4, 'free_choice', '{}')
				 ON CONFLICT (uid) DO UPDATE
				   SET sandbox_cash = $2, sandbox_start = $2, sandbox_name = $3, sandbox_strategy = $4,
				       sandbox_cash_source = 'free_choice', sandbox_milestones = '{}'`,
				[uid, balance, trimmedName, strategy],
			);
			await client.query("COMMIT");
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}

		res.json({ ok: true, cash: balance, name: trimmedName, strategy });
	} catch (e) {
		console.error("[sandbox] setup error:", e);
		res.status(500).json({ error: "Failed to set up sandbox" });
	}
});

// POST /api/sandbox/orders — place a buy-limit order, reserving its cash immediately
sandboxRouter.post("/orders", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const { ticker, amount, limitPrice } = req.body as { ticker?: string; amount?: unknown; limitPrice?: unknown };

		if (typeof ticker !== "string" || !ticker.trim()) {
			res.status(400).json({ error: "ticker required" });
			return;
		}
		const parsedAmount = Number(amount);
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			res.status(400).json({ error: "amount must be a positive number" });
			return;
		}
		const parsedLimit = Number(limitPrice);
		if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
			res.status(400).json({ error: "limitPrice must be a positive number" });
			return;
		}

		const symbol = ticker.toUpperCase().trim();
		const price = await getLivePrice(symbol);
		if (!price) {
			res.status(422).json({ error: `Could not fetch live price for ${symbol}` });
			return;
		}
		if (parsedLimit >= price) {
			res.status(422).json({ error: "Limit price must be below the current price — that would fill as a market buy" });
			return;
		}
		// It fills at or below the limit, so this many shares is the least it can buy - it must not round to nothing,
		// or the reserved cash would be spent on an empty position.
		if (Math.round((parsedAmount / parsedLimit) * 1000) / 1000 < MIN_SHARES) {
			res.status(422).json({ error: `That buys less than ${MIN_SHARES} of a share at $${parsedLimit.toFixed(2)}. Spend a little more.` });
			return;
		}

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			// The account row is locked before counting, so two orders placed at once can't both see room under the cap.
			const cashRow = await client.query<{ sandbox_cash: number | null }>(
				`SELECT sandbox_cash FROM playground_state WHERE uid = $1 FOR UPDATE`,
				[uid],
			);
			const openCountRow = await client.query<{ count: string }>(
				`SELECT COUNT(*) FROM sandbox_orders WHERE uid = $1 AND status = 'open'`,
				[uid],
			);
			if (Number(openCountRow.rows[0]?.count ?? 0) >= SANDBOX_MAX_OPEN_ORDERS) {
				await client.query("ROLLBACK");
				res.status(422).json({ error: `You can have at most ${SANDBOX_MAX_OPEN_ORDERS} open orders` });
				return;
			}
			const cash = cashRow.rows[0]?.sandbox_cash ?? null;
			if (cash === null || cash < parsedAmount) {
				await client.query("ROLLBACK");
				res.status(422).json({ error: "Insufficient buying power" });
				return;
			}

			await client.query(
				`UPDATE playground_state SET sandbox_cash = ROUND(sandbox_cash - $1, 2) WHERE uid = $2`,
				[parsedAmount, uid],
			);
			const orderRow = await client.query<{ id: number; created_at: string }>(
				`INSERT INTO sandbox_orders (uid, ticker, amount, limit_price)
				 VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
				[uid, symbol, parsedAmount, parsedLimit],
			);

			await client.query("COMMIT");

			res.json({
				id: orderRow.rows[0]!.id,
				ticker: symbol,
				amount: parsedAmount,
				limitPrice: parsedLimit,
				status: "open",
				createdAt: orderRow.rows[0]!.created_at,
				remainingCash: Math.round((cash - parsedAmount) * 100) / 100,
			});
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[sandbox] place order error:", e);
		res.status(500).json({ error: "Failed to place order" });
	}
});

// POST /api/sandbox/orders/:id/cancel — refund the order's reserved cash
sandboxRouter.post("/orders/:id/cancel", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const id = Number(req.params.id);
		if (!Number.isInteger(id)) {
			res.status(400).json({ error: "invalid order id" });
			return;
		}

		const client = await pgPool.connect();
		try {
			await client.query("BEGIN");

			// Locked first, same order every handler touching both tables uses (see /sell's
			// comment) — avoids a deadlock against a concurrent /buy or /sell on this account.
			await client.query(`SELECT uid FROM playground_state WHERE uid = $1 FOR UPDATE`, [uid]);

			const orderRow = await client.query<{ amount: string; status: string }>(
				`SELECT amount, status FROM sandbox_orders WHERE id = $1 AND uid = $2 FOR UPDATE`,
				[id, uid],
			);
			const order = orderRow.rows[0];
			if (!order) {
				await client.query("ROLLBACK");
				res.status(404).json({ error: "Order not found" });
				return;
			}
			if (order.status !== "open") {
				await client.query("ROLLBACK");
				res.status(422).json({ error: `Order is already ${order.status}` });
				return;
			}

			await client.query(
				`UPDATE sandbox_orders SET status = 'cancelled', cancelled_at = now() WHERE id = $1`,
				[id],
			);
			await client.query(
				`UPDATE playground_state SET sandbox_cash = ROUND(COALESCE(sandbox_cash, 0) + $1, 2) WHERE uid = $2`,
				[Number(order.amount), uid],
			);

			await client.query("COMMIT");
			res.json({ ok: true });
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		console.error("[sandbox] cancel order error:", e);
		res.status(500).json({ error: "Failed to cancel order" });
	}
});

// GET /api/sandbox/portfolio — aggregate snapshot; Android's REST hydration point
// (web keeps reading sandbox_portfolio/playground_state directly via Supabase Realtime)
sandboxRouter.get("/portfolio", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const [stateRows, positionRows, orderRows, latestTrade] = await Promise.all([
			pgQuery<{
				sandbox_cash: number | null; sandbox_tier: number | null; sandbox_milestones: number[] | null;
				sandbox_name: string | null; sandbox_strategy: string | null; sandbox_start: number | null;
				sandbox_cash_source: string;
			}>(
				`SELECT sandbox_cash, sandbox_tier, sandbox_milestones, sandbox_name, sandbox_strategy, sandbox_start, sandbox_cash_source
				 FROM playground_state WHERE uid = $1`,
				[uid],
			),
			pgQuery<{ ticker: string; shares: string; price_at_add: string; added_at: string; thesis: string | null }>(
				`SELECT ticker, shares, price_at_add, added_at, thesis FROM sandbox_portfolio WHERE uid = $1 ORDER BY added_at ASC`,
				[uid],
			),
			pgQuery<{ id: number; ticker: string; amount: string; limit_price: string; created_at: string }>(
				`SELECT id, ticker, amount, limit_price, created_at FROM sandbox_orders WHERE uid = $1 AND status = 'open' ORDER BY created_at ASC`,
				[uid],
			),
			// Newest fill's id - a cheap change marker (uses the (uid, executed_at) index) so a
			// client polling this endpoint only re-pulls GET /trades when a trade actually landed.
			pgQuery<{ id: string }>(
				`SELECT id FROM sandbox_trades WHERE uid = $1 ORDER BY executed_at DESC, id DESC LIMIT 1`,
				[uid],
			),
		]);

		const state = stateRows.rows[0];
		res.json({
			initialized: state?.sandbox_cash !== null && state?.sandbox_cash !== undefined,
			cash: state?.sandbox_cash != null ? Number(state.sandbox_cash) : null,
			tier: state?.sandbox_tier ?? null,
			milestones: state?.sandbox_milestones ?? [],
			name: state?.sandbox_name ?? null,
			strategy: state?.sandbox_strategy ?? null,
			start: state?.sandbox_start != null ? Number(state.sandbox_start) : null,
			cashSource: state?.sandbox_cash_source ?? "tier",
			tradeCursor: latestTrade.rows[0] ? Number(latestTrade.rows[0].id) : null,
			positions: positionRows.rows.map((p) => ({
				ticker: p.ticker,
				shares: Number(p.shares),
				costBasis: Number(p.price_at_add),
				addedAt: p.added_at,
				thesis: p.thesis,
			})),
			openOrders: orderRows.rows.map((o) => ({
				id: o.id,
				ticker: o.ticker,
				amount: Number(o.amount),
				limitPrice: Number(o.limit_price),
				createdAt: o.created_at,
			})),
		});
	} catch (e) {
		console.error("[sandbox] portfolio error:", e);
		res.status(500).json({ error: "Failed to fetch sandbox portfolio" });
	}
});

// GET /api/sandbox/trades?limit= — fill ledger for history charts / trade list
sandboxRouter.get("/trades", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
		const { rows } = await pgQuery<{
			id: number; ticker: string; side: string; shares: string; price: string; amount: string; source: string; executed_at: string;
			cost_basis: string | null;
		}>(
			`SELECT id, ticker, side, shares, price, amount, source, executed_at, cost_basis FROM sandbox_trades
			 WHERE uid = $1 ORDER BY executed_at DESC LIMIT $2`,
			[uid, limit],
		);
		res.json({
			trades: rows.map((t) => ({
				id: t.id, ticker: t.ticker, side: t.side, shares: Number(t.shares), price: Number(t.price),
				amount: Number(t.amount), source: t.source, executedAt: t.executed_at,
				// A sale's average cost (null on buys, and on sales from before it was recorded).
				costBasis: t.cost_basis != null ? Number(t.cost_basis) : null,
			})),
		});
	} catch (e) {
		console.error("[sandbox] trades error:", e);
		res.status(500).json({ error: "Failed to fetch sandbox trades" });
	}
});

// POST /api/sandbox/fill-orders — Cloud-Scheduler-only (x-warm-secret, stock.ts's
// warm-saved/push-run precedent). Fills any open buy-limit order whose limit is at or
// above the live price. Cash was already reserved at placement, so a fill only converts
// the reservation into a position + trade row — no further cash movement.
sandboxRouter.post("/fill-orders", async (req, res) => {
	const secret = req.headers["x-warm-secret"];
	if (!secret || secret !== process.env.WARM_SECRET) {
		res.status(401).json({ error: "unauthorized" });
		return;
	}
	if (marketSessionBucket() !== "open") {
		res.json({ ok: true, filled: 0, skipped: "market closed" });
		return;
	}
	try {
		const tickerRows = await pgQuery<{ ticker: string }>(`SELECT DISTINCT ticker FROM sandbox_orders WHERE status = 'open'`);
		const tickers = tickerRows.rows.map((r) => r.ticker);
		if (tickers.length === 0) {
			res.json({ ok: true, filled: 0 });
			return;
		}

		const prices = new Map<string, number>();
		await mapWithLimit(tickers, 6, async (symbol) => {
			const price = await getLivePrice(symbol);
			if (price) prices.set(symbol, price);
		});

		let filled = 0;
		for (const [symbol, price] of prices) {
			const candidates = await pgQuery<{ id: number; uid: string }>(
				`SELECT id, uid FROM sandbox_orders WHERE status = 'open' AND ticker = $1 AND limit_price >= $2`,
				[symbol, price],
			);
			for (const { id, uid: orderUid } of candidates.rows) {
				const client = await pgPool.connect();
				try {
					await client.query("BEGIN");
					// playground_state first, the lock order every handler touching both tables uses - /reset and /setup
					// take it before the orders, so taking the order row first here could deadlock against them.
					await client.query(`SELECT 1 FROM playground_state WHERE uid = $1 FOR UPDATE`, [orderUid]);
					const orderRow = await client.query<{ id: number; uid: string; ticker: string; amount: string }>(
						`SELECT id, uid, ticker, amount FROM sandbox_orders WHERE id = $1 AND status = 'open' FOR UPDATE SKIP LOCKED`,
						[id],
					);
					const order = orderRow.rows[0];
					if (!order) {
						await client.query("ROLLBACK");
						continue;
					}

					// Filled like /buy: shares rounded DOWN to a thousandth, charged at the price to the cent, and the rest of the
					// reservation refunded - rounding up bought more than was paid for and showed a gain out of nowhere.
					const amount = Number(order.amount);
					const shares = Math.floor((amount / price) * 1000) / 1000;
					const cost = Math.round(price * shares * 100) / 100;

					// Locked — a concurrent /buy on the same uid/ticker also reads-computes-writes
					// this row from its own snapshot; without this lock, whichever of the two
					// commits second silently overwrites the other's shares/price_at_add.
					const posRow = await client.query<{ shares: string; price_at_add: string; added_at: string }>(
						`SELECT shares, price_at_add, added_at FROM sandbox_portfolio WHERE uid = $1 AND ticker = $2 FOR UPDATE`,
						[order.uid, order.ticker],
					);
					const existingShares = posRow.rows[0] ? Number(posRow.rows[0].shares) : 0;
					const newShares = Math.round((existingShares + shares) * 1000) / 1000;
					const newPrice = existingShares > 0 && posRow.rows[0]?.price_at_add
						? Math.round(((Number(posRow.rows[0].price_at_add) * existingShares + price * shares) / newShares) * 100) / 100
						: price;
					const addedAt = posRow.rows[0]?.added_at ?? new Date().toISOString();

					await client.query(
						`INSERT INTO sandbox_portfolio (uid, ticker, shares, price_at_add, added_at)
						 VALUES ($1, $2, $3, $4, $5)
						 ON CONFLICT (uid, ticker) DO UPDATE
						   SET shares = EXCLUDED.shares, price_at_add = EXCLUDED.price_at_add`,
						[order.uid, order.ticker, newShares, newPrice, addedAt],
					);
					await client.query(`UPDATE sandbox_orders SET status = 'filled', filled_at = now() WHERE id = $1`, [order.id]);
					if (amount - cost > 0) {
						await client.query(
							`UPDATE playground_state SET sandbox_cash = ROUND(COALESCE(sandbox_cash, 0) + $1, 2) WHERE uid = $2`,
							[Math.round((amount - cost) * 100) / 100, order.uid],
						);
					}
					await client.query(
						`INSERT INTO sandbox_trades (uid, ticker, side, shares, price, amount, source)
						 VALUES ($1, $2, 'buy', $3, $4, $5, 'limit')`,
						[order.uid, order.ticker, shares, price, cost],
					);

					await client.query("COMMIT");
					filled++;
				} catch (e) {
					await client.query("ROLLBACK");
					console.error("[sandbox] fill-orders order error:", e);
				} finally {
					client.release();
				}
			}
		}

		res.json({ ok: true, filled });
	} catch (e) {
		console.error("[sandbox] fill-orders error:", e);
		res.status(500).json({ error: "Failed to fill orders" });
	}
});

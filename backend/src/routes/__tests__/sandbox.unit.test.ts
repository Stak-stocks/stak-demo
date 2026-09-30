import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
const pgPoolConnectMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	pgPool: { connect: pgPoolConnectMock },
}));

vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
}));

const getFinnhubKeysMock = vi.fn(() => ["testkey"]);
vi.mock("../../services/finnhubService.js", () => ({
	getFinnhubKeys: getFinnhubKeysMock,
	FINNHUB_BASE: "https://finnhub.example/api/v1",
}));

const cacheGetMock = vi.fn(async (_key: string): Promise<unknown> => null);
const cacheSetMock = vi.fn(async () => {});
vi.mock("../../lib/cache.js", () => ({
	cacheGet: cacheGetMock,
	cacheSet: cacheSetMock,
}));

const marketSessionBucketMock = vi.fn(() => "open");
vi.mock("@stak/shared", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@stak/shared")>();
	return { ...actual, marketSessionBucket: marketSessionBucketMock };
});

async function buildApp() {
	vi.resetModules();
	const { sandboxRouter } = await import("../sandbox.js");
	const app = express();
	app.use(express.json());
	app.use("/", sandboxRouter);
	return app;
}

/** A pgPool.connect() client whose `query` calls resolve in the given order — one
 *  entry per statement (including BEGIN/COMMIT/ROLLBACK), matching call order exactly. */
function makeClient(responses: unknown[]) {
	const query = vi.fn();
	for (const r of responses) query.mockResolvedValueOnce(r);
	return { query, release: vi.fn() };
}

function mockPrice(price: number) {
	global.fetch = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => ({ c: price }),
	}) as any;
}

describe("sandboxRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		marketSessionBucketMock.mockReturnValue("open");
		pgQueryMock.mockResolvedValue({ rows: [] });
		cacheGetMock.mockResolvedValue(null);
	});

	// ── live price cache ─────────────────────────────────────────────────────────

	it("uses a cached quote instead of calling Finnhub, and caches a fresh one", async () => {
		mockPrice(80);
		cacheGetMock.mockResolvedValueOnce({ c: 42 });
		const cachedClient = makeClient([{}, { rows: [{ sandbox_cash: 1000 }] }, { rows: [] }, {}, {}, {}, {}]);
		pgPoolConnectMock.mockResolvedValueOnce(cachedClient);
		const app = await buildApp();

		const hit = await request(app).post("/buy").send({ ticker: "AAPL", amount: 84 });
		expect(hit.body.price).toBe(42);
		expect(global.fetch).not.toHaveBeenCalled();

		const missClient = makeClient([{}, { rows: [{ sandbox_cash: 1000 }] }, { rows: [] }, {}, {}, {}, {}]);
		pgPoolConnectMock.mockResolvedValueOnce(missClient);
		const miss = await request(app).post("/buy").send({ ticker: "AAPL", amount: 80 });
		expect(miss.body.price).toBe(80);
		expect(cacheSetMock).toHaveBeenCalledWith("quote:fb:AAPL", { c: 80 }, 15_000);
	});

	// ── GET /portfolio ───────────────────────────────────────────────────────────

	it("GET /portfolio returns a numeric cash/start and the newest trade's id as tradeCursor", async () => {
		pgQueryMock
			.mockResolvedValueOnce({ rows: [{ sandbox_cash: "8500.50", sandbox_tier: null, sandbox_milestones: [], sandbox_name: "My Stak", sandbox_strategy: "bold", sandbox_start: "10000", sandbox_cash_source: "free_choice" }] })
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [{ id: "77" }] });
		const app = await buildApp();

		const res = await request(app).get("/portfolio");

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ initialized: true, cash: 8500.5, start: 10000, tradeCursor: 77, cashSource: "free_choice" });
	});

	it("GET /portfolio has a null tradeCursor before any trade", async () => {
		const app = await buildApp();
		const res = await request(app).get("/portfolio");
		expect(res.status).toBe(200);
		expect(res.body.tradeCursor).toBeNull();
		expect(res.body.initialized).toBe(false);
	});

	// ── POST /setup ──────────────────────────────────────────────────────────────

	it("POST /setup rejects an invalid starting balance", async () => {
		const app = await buildApp();
		const res = await request(app).post("/setup").send({ startingBalance: 42, name: "My Stak", strategy: "balanced" });
		expect(res.status).toBe(400);
		expect(pgPoolConnectMock).not.toHaveBeenCalled();
	});

	it("POST /setup rejects an unknown strategy", async () => {
		const app = await buildApp();
		const res = await request(app).post("/setup").send({ startingBalance: 10000, name: "My Stak", strategy: "aggressive" });
		expect(res.status).toBe(400);
	});

	it("POST /setup wipes positions/orders and stores a free-choice portfolio", async () => {
		const client = makeClient([{}, {}, {}, {}, {}, {}, {}]); // BEGIN, SELECT state FOR UPDATE, DELETE portfolio, DELETE trades, UPDATE orders, INSERT state, COMMIT
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/setup").send({ startingBalance: 10000, name: "  My Stak  ", strategy: "balanced" });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, cash: 10000, name: "My Stak", strategy: "balanced" });
		expect(client.query).toHaveBeenCalledTimes(7);
		expect(client.query.mock.calls[0]![0]).toBe("BEGIN");
		expect(client.query.mock.calls[6]![0]).toBe("COMMIT");
		expect(client.query.mock.calls[3]![0]).toMatch(/DELETE FROM sandbox_trades/);
	});

	// ── POST /reset ──────────────────────────────────────────────────────────────

	it("POST /reset restores the chosen balance for a free-choice portfolio (no tier top-up)", async () => {
		const client = makeClient([
			{}, // BEGIN
			{ rows: [{ total_xp: 0, sandbox_cash_source: "free_choice", sandbox_start: 5000, sandbox_name: "My Stak", sandbox_strategy: "bold" }] }, // SELECT state FOR UPDATE
			{}, // DELETE portfolio
			{}, // DELETE trades
			{}, // UPDATE orders cancel
			{}, // UPDATE state
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/reset").send({});

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, cash: 5000, tier: null, name: "My Stak", strategy: "bold" });
	});

	it("POST /reset restores the tier budget for a tier-based portfolio unchanged", async () => {
		const client = makeClient([
			{}, // BEGIN
			{ rows: [{ total_xp: 0, sandbox_cash_source: "tier", sandbox_start: null, sandbox_name: null, sandbox_strategy: null }] }, // SELECT state FOR UPDATE
			{}, // DELETE portfolio
			{}, // DELETE trades
			{}, // UPDATE orders cancel
			{}, // INSERT state
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/reset").send({});

		expect(res.status).toBe(200);
		expect(res.body.cash).toBe(1000);
		expect(res.body.tier).toBe(1);
	});

	// ── POST /tier-upgrade ───────────────────────────────────────────────────────

	it("POST /tier-upgrade no-ops for a free-choice portfolio", async () => {
		const client = makeClient([
			{}, // BEGIN
			{ rows: [{ total_xp: 5000, sandbox_tier: 1, sandbox_cash: 5000, sandbox_cash_source: "free_choice" }] }, // SELECT ... FOR UPDATE
			{}, // ROLLBACK
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/tier-upgrade").send({});

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
		expect(client.query.mock.calls[2]![0]).toBe("ROLLBACK");
	});

	// ── POST /buy ────────────────────────────────────────────────────────────────

	it("POST /buy accepts a dollar amount instead of shares", async () => {
		mockPrice(100);
		const client = makeClient([
			{}, // BEGIN
			{ rows: [{ sandbox_cash: 1000 }] }, // SELECT cash FOR UPDATE
			{ rows: [] }, // SELECT existing position
			{}, // INSERT position
			{}, // UPDATE cash
			{}, // INSERT trade
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/buy").send({ ticker: "aapl", amount: 500 });

		expect(res.status).toBe(200);
		expect(res.body.shares).toBe(5);
		expect(res.body.cost).toBe(500);
		const tradeInsertCall = client.query.mock.calls[5]!;
		expect(tradeInsertCall[0]).toMatch(/INSERT INTO sandbox_trades/);
		expect(tradeInsertCall[1]).toEqual(["u1", "AAPL", 5, 100, 500]);
	});

	it("POST /buy spending all the cash rounds shares down, so it never costs more than the cash", async () => {
		mockPrice(777);
		const client = makeClient([
			{}, // BEGIN
			{ rows: [{ sandbox_cash: 100 }] }, // SELECT cash FOR UPDATE
			{ rows: [] }, // SELECT existing position
			{}, // INSERT position
			{}, // UPDATE cash
			{}, // INSERT trade
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();
		const res = await request(app).post("/buy").send({ ticker: "AAPL", amount: 100 });
		expect(res.status).toBe(200);
		expect(res.body.shares).toBe(0.128);
		expect(res.body.cost).toBeLessThanOrEqual(100);
	});

	it("POST /buy rejects an amount too small to buy any shares (no empty position, no $0 trade)", async () => {
		mockPrice(500);
		const app = await buildApp();
		const res = await request(app).post("/buy").send({ ticker: "AAPL", amount: 0.2 });
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/less than 0.001 of a share/);
		expect(pgPoolConnectMock).not.toHaveBeenCalled();
	});

	it("POST /buy rejects a share count that rounds to zero", async () => {
		mockPrice(100);
		const app = await buildApp();
		const res = await request(app).post("/buy").send({ ticker: "AAPL", shares: 0.0004 });
		expect(res.status).toBe(422);
		expect(pgPoolConnectMock).not.toHaveBeenCalled();
	});

	// ── POST /sell ───────────────────────────────────────────────────────────────

	it("POST /sell accepts a portion instead of an exact share count", async () => {
		mockPrice(50);
		const client = makeClient([
			{}, // BEGIN
			{}, // SELECT state FOR UPDATE (lock ordering)
			{ rows: [{ shares: "10" }] }, // SELECT position FOR UPDATE
			{}, // UPDATE position (remaining 5, not deleted)
			{}, // UPDATE cash
			{}, // INSERT trade
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/sell").send({ ticker: "AAPL", portion: 0.5 });

		expect(res.status).toBe(200);
		expect(res.body.sharesToSell).toBe(5);
		expect(res.body.remaining).toBe(5);
	});

	it("POST /sell rejects an out-of-range portion", async () => {
		const app = await buildApp();
		const res = await request(app).post("/sell").send({ ticker: "AAPL", portion: 1.5 });
		expect(res.status).toBe(400);
		expect(pgPoolConnectMock).not.toHaveBeenCalled();
	});

	// ── POST /orders ─────────────────────────────────────────────────────────────

	it("POST /orders rejects a limit at or above the live price (that's a market buy)", async () => {
		mockPrice(50);
		const app = await buildApp();
		const res = await request(app).post("/orders").send({ ticker: "AAPL", amount: 100, limitPrice: 60 });
		expect(res.status).toBe(422);
		expect(pgPoolConnectMock).not.toHaveBeenCalled();
	});

	it("POST /orders rejects an amount that would fill as zero shares", async () => {
		mockPrice(500);
		const app = await buildApp();
		const res = await request(app).post("/orders").send({ ticker: "AAPL", amount: 0.2, limitPrice: 450 });
		expect(res.status).toBe(422);
		expect(pgPoolConnectMock).not.toHaveBeenCalled();
	});

	it("POST /orders rejects insufficient buying power", async () => {
		mockPrice(50);
		const client = makeClient([
			{}, // BEGIN
			{ rows: [{ sandbox_cash: 100 }] }, // SELECT cash FOR UPDATE (locked before counting)
			{ rows: [{ count: "0" }] }, // open order count
			{}, // ROLLBACK
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/orders").send({ ticker: "AAPL", amount: 500, limitPrice: 40 });

		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/insufficient/i);
	});

	it("POST /orders reserves cash and creates an open order", async () => {
		mockPrice(50);
		const client = makeClient([
			{}, // BEGIN
			{ rows: [{ sandbox_cash: 1000 }] }, // SELECT cash FOR UPDATE (locked before counting)
			{ rows: [{ count: "0" }] }, // open order count
			{}, // UPDATE cash
			{ rows: [{ id: 7, created_at: "2026-09-25T00:00:00Z" }] }, // INSERT order
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/orders").send({ ticker: "AAPL", amount: 500, limitPrice: 40 });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: 7, ticker: "AAPL", amount: 500, limitPrice: 40, status: "open", remainingCash: 500 });
	});

	// ── POST /orders/:id/cancel ──────────────────────────────────────────────────

	it("POST /orders/:id/cancel refunds reserved cash for an open order", async () => {
		const client = makeClient([
			{}, // BEGIN
			{}, // SELECT state FOR UPDATE (lock ordering)
			{ rows: [{ amount: "200", status: "open" }] }, // SELECT order FOR UPDATE
			{}, // UPDATE order cancelled
			{}, // UPDATE cash
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/orders/7/cancel").send({});

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
	});

	it("POST /orders/:id/cancel rejects an order that's already filled", async () => {
		const client = makeClient([
			{}, // BEGIN
			{}, // SELECT state FOR UPDATE (lock ordering)
			{ rows: [{ amount: "200", status: "filled" }] }, // SELECT order FOR UPDATE
			{}, // ROLLBACK
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/orders/7/cancel").send({});

		expect(res.status).toBe(422);
	});

	// ── POST /fill-orders ────────────────────────────────────────────────────────

	it("POST /fill-orders rejects a missing or wrong secret", async () => {
		const app = await buildApp();
		const res = await request(app).post("/fill-orders").send({});
		expect(res.status).toBe(401);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("POST /fill-orders skips when the market is closed", async () => {
		process.env.WARM_SECRET = "shh";
		marketSessionBucketMock.mockReturnValue("closed");
		const app = await buildApp();

		const res = await request(app).post("/fill-orders").set("x-warm-secret", "shh").send({});

		expect(res.status).toBe(200);
		expect(res.body.filled).toBe(0);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("POST /fill-orders fills an open order whose limit is at or above the live price", async () => {
		process.env.WARM_SECRET = "shh";
		mockPrice(45);
		pgQueryMock
			.mockResolvedValueOnce({ rows: [{ ticker: "AAPL" }] }) // distinct open tickers
			.mockResolvedValueOnce({ rows: [{ id: 1, uid: "u1" }] }); // candidates at/above price
		const client = makeClient([
			{}, // BEGIN
			{ rows: [] }, // lock playground_state (account first)
			{ rows: [{ id: 1, uid: "u1", ticker: "AAPL", amount: "450" }] }, // SELECT ... FOR UPDATE SKIP LOCKED
			{ rows: [] }, // SELECT existing position
			{}, // INSERT position
			{}, // UPDATE order filled
			{}, // INSERT trade
			{}, // COMMIT
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/fill-orders").set("x-warm-secret", "shh").send({});

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, filled: 1 });
	});

	it("POST /fill-orders skips an order already locked/filled by a concurrent run (SKIP LOCKED)", async () => {
		process.env.WARM_SECRET = "shh";
		mockPrice(45);
		pgQueryMock
			.mockResolvedValueOnce({ rows: [{ ticker: "AAPL" }] })
			.mockResolvedValueOnce({ rows: [{ id: 1, uid: "u1" }] });
		const client = makeClient([
			{}, // BEGIN
			{ rows: [] }, // lock playground_state (account first)
			{ rows: [] }, // SELECT ... FOR UPDATE SKIP LOCKED finds nothing (already taken)
			{}, // ROLLBACK
		]);
		pgPoolConnectMock.mockResolvedValueOnce(client);
		const app = await buildApp();

		const res = await request(app).post("/fill-orders").set("x-warm-secret", "shh").send({});

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, filled: 0 });
	});
});

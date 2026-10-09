import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
const ensureUserRowMock = vi.fn();
// /stak and /passed write inside a transaction on a pooled client; every query on it succeeds with no rows.
const clientQueryMock = vi.fn(async () => ({ rows: [], rowCount: 0 }));
const pgPoolConnectMock = vi.fn(async () => ({ query: clientQueryMock, release: vi.fn() }));
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: ensureUserRowMock,
	pgPool: { connect: pgPoolConnectMock },
}));

const checkAndIncrementSwipeLimitMock = vi.fn();
vi.mock("../../services/swipeLimitService.js", () => ({
	checkAndIncrementSwipeLimit: checkAndIncrementSwipeLimitMock,
}));

vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
}));

async function buildApp() {
	vi.resetModules();
	const { meRouter } = await import("../me.js");
	const app = express();
	app.use(express.json());
	app.use("/", meRouter);
	return app;
}

const existingUserRow = {
	uid: "u1", email: "u1@test.com", display_name: null, phone: null,
	preferences: null, onboarding_completed: false, created_at: "2026-01-01", updated_at: null,
};

describe("meRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		ensureUserRowMock.mockResolvedValue(undefined);
		pgQueryMock.mockResolvedValue({ rows: [] });
	});

	// ── GET / ────────────────────────────────────────────────────────────────────

	it("GET / creates default profile when missing", async () => {
		// select from users → not found (fire-and-forget sessions insert uses default)
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		const app = await buildApp();

		const res = await request(app).get("/");

		expect(res.status).toBe(200);
		expect(res.body.uid).toBe("u1");
	});

	it("GET / returns existing profile when found", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ ...existingUserRow, display_name: "Alice" }] });
		const app = await buildApp();

		const res = await request(app).get("/");

		expect(res.status).toBe(200);
		expect(res.body.displayName).toBe("Alice");
	});

	it("GET / returns 500 on database error", async () => {
		pgQueryMock.mockRejectedValueOnce(new Error("DB down"));
		const app = await buildApp();

		const res = await request(app).get("/");

		expect(res.status).toBe(500);
		expect(res.body.error).toMatch(/failed to fetch profile/i);
	});

	// ── PUT / ────────────────────────────────────────────────────────────────────

	it("PUT / merges display name update", async () => {
		// update users set ... (no meaningful result)
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		// select after update returns the updated row
		pgQueryMock.mockResolvedValueOnce({ rows: [{ ...existingUserRow, display_name: "Bob", updated_at: "2026-01-02" }] });
		const app = await buildApp();

		const res = await request(app).put("/").send({ displayName: "Bob" });

		expect(res.status).toBe(200);
		expect(res.body.displayName).toBe("Bob");
	});

	// ── PUT /stak ────────────────────────────────────────────────────────────────

	it("PUT /stak validates brandIds array", async () => {
		const app = await buildApp();

		const res = await request(app).put("/stak").send({ brandIds: "not-array" });

		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/brandIds must be an array/i);
	});

	it("PUT /stak saves and echoes brandIds", async () => {
		const app = await buildApp();

		const res = await request(app).put("/stak").send({ brandIds: ["aapl", "tsla"] });

		expect(res.status).toBe(200);
		expect(res.body.brandIds).toEqual(["aapl", "tsla"]);
		const sql = clientQueryMock.mock.calls.map((c) => String((c as unknown[])[0]));
		expect(sql[0]).toBe("BEGIN");
		expect(sql.some((q) => /insert into stak_brands/i.test(q))).toBe(true);
		expect(sql.at(-1)).toBe("COMMIT");
	});

	// ── PUT /passed ──────────────────────────────────────────────────────────────

	it("PUT /passed returns 400 when entries is not an array", async () => {
		const app = await buildApp();

		const res = await request(app).put("/passed").send({ entries: null });

		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/entries must be an array/i);
	});

	it("PUT /passed saves and echoes entries", async () => {
		const app = await buildApp();
		const entries = [{ id: "aapl", at: 1700000000 }];

		const res = await request(app).put("/passed").send({ entries });

		expect(res.status).toBe(200);
		expect(res.body.entries).toEqual(entries);
		const sql = clientQueryMock.mock.calls.map((c) => String((c as unknown[])[0]));
		expect(sql.some((q) => /insert into passed_brands/i.test(q))).toBe(true);
		expect(sql.at(-1)).toBe("COMMIT");
	});

	// ── PUT /intel-state ─────────────────────────────────────────────────────────

	it("PUT /intel-state returns 400 for invalid shape", async () => {
		const app = await buildApp();

		const res = await request(app)
			.put("/intel-state")
			.send({ lastDate: 123, queue: [], readIds: [] }); // lastDate not a string

		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/invalid intel state/i);
	});

	it("PUT /intel-state saves valid state", async () => {
		const app = await buildApp();

		const res = await request(app)
			.put("/intel-state")
			.send({ lastDate: "2026-03-01", queue: ["c1"], readIds: ["c2"] });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ lastDate: "2026-03-01", queue: ["c1"], readIds: ["c2"] });
	});

	// ── POST /swipes/increment ──────────────────────────────────────────────────

	it("POST /swipes/increment accepts when under the limit", async () => {
		checkAndIncrementSwipeLimitMock.mockResolvedValueOnce({ accepted: true, count: 4, limit: 20 });
		const app = await buildApp();

		const res = await request(app)
			.post("/swipes/increment")
			.send({ todayKey: "2026-06-24" });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ accepted: true, count: 4, limit: 20 });
	});

	it("POST /swipes/increment rejects once the limit is reached", async () => {
		checkAndIncrementSwipeLimitMock.mockResolvedValueOnce({ accepted: false, count: 20, limit: 20 });
		const app = await buildApp();

		const res = await request(app)
			.post("/swipes/increment")
			.send({ todayKey: "2026-06-24" });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ accepted: false, count: 20, limit: 20 });
	});

	// ── /daily-deck ──────────────────────────────────────────────────────────────

	it("GET /daily-deck returns that day's deck, and none for another day", async () => {
		pgQueryMock.mockResolvedValue({ rows: [{ deck_order: ["2026-10-09", "NVDA", "WMT"] }] });
		const app = await buildApp();

		expect((await request(app).get("/daily-deck?day=2026-10-09")).body).toEqual({ day: "2026-10-09", tickers: ["NVDA", "WMT"] });
		expect((await request(app).get("/daily-deck?day=2026-10-10")).body).toEqual({ day: "2026-10-10", tickers: [] });
		expect((await request(app).get("/daily-deck?day=today")).status).toBe(400);
	});

	it("PUT /daily-deck keeps the first deck offered for the day", async () => {
		// The conditional update matched nothing (another device already picked today): the stored deck is returned.
		pgQueryMock
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [{ deck_order: ["2026-10-09", "AMD"] }] });
		const app = await buildApp();

		const res = await request(app).put("/daily-deck").send({ day: "2026-10-09", tickers: ["NVDA"] });

		expect(res.body).toEqual({ day: "2026-10-09", tickers: ["AMD"] });
		expect(pgQueryMock.mock.calls[0]![1]).toEqual(["u1", ["2026-10-09", "NVDA"], "2026-10-09"]);
	});

	it("PUT /daily-deck: only a later day replaces the stored deck (a device on yesterday gets none back)", async () => {
		pgQueryMock
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [{ deck_order: ["2026-10-09", "AMD"] }] });
		const app = await buildApp();

		const res = await request(app).put("/daily-deck").send({ day: "2026-10-08", tickers: ["NVDA"] });

		expect(res.body).toEqual({ day: "2026-10-08", tickers: [] });
		expect(pgQueryMock.mock.calls[0]![0]).toContain("deck_order[1] < $3");
	});

	it("PUT /daily-deck refuses a malformed deck", async () => {
		const app = await buildApp();
		expect((await request(app).put("/daily-deck").send({ day: "2026-10-09", tickers: [] })).status).toBe(400);
		expect((await request(app).put("/daily-deck").send({ day: "x", tickers: ["NVDA"] })).status).toBe(400);
	});
});

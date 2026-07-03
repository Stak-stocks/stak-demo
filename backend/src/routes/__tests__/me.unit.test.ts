import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
const ensureUserRowMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: ensureUserRowMock,
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

	// ── PUT /deck-order ──────────────────────────────────────────────────────────

	it("PUT /deck-order returns 400 when order contains non-strings", async () => {
		const app = await buildApp();

		const res = await request(app)
			.put("/deck-order")
			.send({ order: ["aapl", 42] }); // 42 is not a string

		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/invalid deck order/i);
	});

	it("PUT /deck-order saves valid string array", async () => {
		const app = await buildApp();

		const res = await request(app)
			.put("/deck-order")
			.send({ order: ["aapl", "tsla", "nvda"] });

		expect(res.status).toBe(200);
		expect(res.body.order).toEqual(["aapl", "tsla", "nvda"]);
	});
});

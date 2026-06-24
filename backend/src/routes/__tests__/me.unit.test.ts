import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const setMock = vi.fn();
const docMock = vi.fn(() => ({ get: getMock, set: setMock }));
// GET / fire-and-forget logs a login session per day (sessions/{uid}_{date}) — separate
// collection from "users", needs its own doc/set so it doesn't fall through to the
// catch-all throw below (which previously caused every GET / test to fail before ever
// reaching the users-doc mock).
const sessionSetMock = vi.fn().mockResolvedValue(undefined);
const collectionMock = vi.fn((name: string) => {
	if (name === "users") return { doc: docMock };
	if (name === "sessions") return { doc: vi.fn(() => ({ set: sessionSetMock })) };
	throw new Error(`Unexpected collection ${name}`);
});

// Transaction mock for checkAndIncrementSwipeLimit (services/swipeLimitService.ts) —
// runs the real update function against the same get/set mocks used elsewhere here.
const txGetMock = vi.fn();
const txSetMock = vi.fn();
const runTransactionMock = vi.fn(async (updateFn: (tx: { get: typeof txGetMock; set: typeof txSetMock }) => Promise<unknown>) =>
	updateFn({ get: txGetMock, set: txSetMock }),
);

vi.mock("../../firebaseAdmin.js", () => ({
	adminDb: { collection: collectionMock, runTransaction: runTransactionMock },
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

describe("meRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── GET / ────────────────────────────────────────────────────────────────────

	it("GET / creates default profile when missing", async () => {
		getMock.mockResolvedValueOnce({ exists: false });
		const app = await buildApp();

		const res = await request(app).get("/");

		expect(res.status).toBe(200);
		expect(res.body.uid).toBe("u1");
		expect(setMock).toHaveBeenCalledTimes(1);
	});

	it("GET / returns existing profile when found", async () => {
		getMock.mockResolvedValueOnce({
			exists: true,
			id: "u1",
			data: () => ({ uid: "u1", displayName: "Alice" }),
		});
		const app = await buildApp();

		const res = await request(app).get("/");

		expect(res.status).toBe(200);
		expect(res.body.displayName).toBe("Alice");
		expect(setMock).not.toHaveBeenCalled();
	});

	it("GET / returns 500 on Firestore error", async () => {
		getMock.mockRejectedValueOnce(new Error("Firestore down"));
		const app = await buildApp();

		const res = await request(app).get("/");

		expect(res.status).toBe(500);
		expect(res.body.error).toMatch(/failed to fetch profile/i);
	});

	// ── PUT / ────────────────────────────────────────────────────────────────────

	it("PUT / merges display name update", async () => {
		setMock.mockResolvedValueOnce(undefined);
		getMock.mockResolvedValueOnce({
			exists: true,
			id: "u1",
			data: () => ({ uid: "u1", displayName: "Bob" }),
		});
		const app = await buildApp();

		const res = await request(app).put("/").send({ displayName: "Bob" });

		expect(res.status).toBe(200);
		expect(res.body.displayName).toBe("Bob");
		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({ displayName: "Bob" }),
			{ merge: true },
		);
	});

	// ── PUT /stak ────────────────────────────────────────────────────────────────

	it("PUT /stak validates brandIds array", async () => {
		const app = await buildApp();

		const res = await request(app).put("/stak").send({ brandIds: "not-array" });

		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/brandIds must be an array/i);
	});

	it("PUT /stak saves and echoes brandIds", async () => {
		setMock.mockResolvedValueOnce(undefined);
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
		setMock.mockResolvedValueOnce(undefined);
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
		setMock.mockResolvedValueOnce(undefined);
		const app = await buildApp();

		const res = await request(app)
			.put("/intel-state")
			.send({ lastDate: "2026-03-01", queue: ["c1"], readIds: ["c2"] });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ lastDate: "2026-03-01", queue: ["c1"], readIds: ["c2"] });
	});

	// ── POST /swipes/increment ──────────────────────────────────────────────────
	// Server-authoritative limit check (services/swipeLimitService.ts), exercised
	// here through the route exactly as a real client would hit it. More thorough
	// coverage (bonus swipes, todayKey sanitization) lives in swipe.unit.test.ts —
	// this just checks the route wires accept/reject correctly.

	it("POST /swipes/increment accepts and increments when under the limit", async () => {
		const today = new Date().toISOString().split("T")[0];
		txGetMock.mockResolvedValueOnce({ data: () => ({ dailySwipeState: { date: today, count: 3 } }) });
		const app = await buildApp();

		const res = await request(app)
			.post("/swipes/increment")
			.send({ todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ accepted: true, count: 4, limit: 20 });
		expect(txSetMock).toHaveBeenCalledWith(
			expect.anything(),
			{ dailySwipeState: { date: today, count: 4 } },
			{ merge: true },
		);
	});

	it("POST /swipes/increment rejects without writing once the limit is reached", async () => {
		const today = new Date().toISOString().split("T")[0];
		txGetMock.mockResolvedValueOnce({ data: () => ({ dailySwipeState: { date: today, count: 20 } }) });
		const app = await buildApp();

		const res = await request(app)
			.post("/swipes/increment")
			.send({ todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ accepted: false, count: 20, limit: 20 });
		expect(txSetMock).not.toHaveBeenCalled();
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
		setMock.mockResolvedValueOnce(undefined);
		const app = await buildApp();

		const res = await request(app)
			.put("/deck-order")
			.send({ order: ["aapl", "tsla", "nvda"] });

		expect(res.status).toBe(200);
		expect(res.body.order).toEqual(["aapl", "tsla", "nvda"]);
	});
});

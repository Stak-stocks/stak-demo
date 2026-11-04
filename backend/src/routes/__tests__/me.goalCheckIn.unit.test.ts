import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../services/swipeLimitService.js", () => ({ checkAndIncrementSwipeLimit: vi.fn() }));
vi.mock("../../services/pushService.js", () => ({ getVapidPublicKey: vi.fn() }));
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
	forgetVerifiedToken: vi.fn(),
}));

async function buildApp() {
	vi.resetModules();
	const { meRouter } = await import("../me.js");
	const app = express();
	app.use(express.json());
	app.use("/", meRouter);
	return app;
}

describe("POST /goal-check-in", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockResolvedValue({ rows: [] });
	});

	it("keeps the answer and, for 'switch', moves the goal to growing money long-term - in one statement", async () => {
		const res = await request(await buildApp()).post("/goal-check-in").send({ answer: "switch" });
		expect(res.status).toBe(200);
		expect(pgQueryMock).toHaveBeenCalledTimes(1);
		const [sql, params] = pgQueryMock.mock.calls[0]!;
		expect(sql).toMatch(/jsonb_set\(preferences, '\{android_taste,goal\}'/);
		expect(sql).toMatch(/goal_check_in = jsonb_build_object/);
		// A second answer within a minute changes nothing.
		expect(sql).toMatch(/interval '1 minute'/);
		expect(params).toEqual(["u1", "switch", 1]);
	});

	it("'keep' goes through the same statement, which leaves the goal alone", async () => {
		await request(await buildApp()).post("/goal-check-in").send({ answer: "keep" });
		expect(pgQueryMock.mock.calls[0]![1]).toEqual(["u1", "keep", 1]);
		expect(pgQueryMock.mock.calls[0]![0]).toMatch(/case when \$2 = 'switch'/);
	});

	it("refuses anything else", async () => {
		const app = await buildApp();
		expect((await request(app).post("/goal-check-in").send({})).status).toBe(400);
		expect((await request(app).post("/goal-check-in").send({ answer: "maybe" })).status).toBe(400);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("says so when it couldn't save", async () => {
		pgQueryMock.mockRejectedValueOnce(new Error("DB down"));
		expect((await request(await buildApp()).post("/goal-check-in").send({ answer: "keep" })).status).toBe(500);
	});
});

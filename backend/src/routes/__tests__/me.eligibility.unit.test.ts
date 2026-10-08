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
const forgetVerifiedTokenMock = vi.fn();
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
	forgetVerifiedToken: forgetVerifiedTokenMock,
}));

async function buildApp() {
	vi.resetModules();
	const { meRouter } = await import("../me.js");
	const app = express();
	app.use(express.json());
	app.use("/", meRouter);
	return app;
}

describe("POST /eligibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockResolvedValue({ rows: [] });
	});

	it("records the agreement with the current document versions, and forgets the token's cached 'not yet'", async () => {
		const app = await buildApp();
		const res = await request(app).post("/eligibility").set("Authorization", "Bearer tok").send({ ageConfirmed: true, inUS: true, acceptTerms: true });
		expect(res.status).toBe(200);
		const update = pgQueryMock.mock.calls.find((c) => /update users set age_confirmed = true/.test(String(c[0])))!;
		expect(update[1]).toEqual(["u1", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)]);
		expect(forgetVerifiedTokenMock).toHaveBeenCalledWith("tok");
	});

	it("needs all three boxes ticked", async () => {
		const app = await buildApp();
		expect((await request(app).post("/eligibility").send({})).status).toBe(400);
		expect((await request(app).post("/eligibility").send({ inUS: true, acceptTerms: true })).status).toBe(400);
		expect((await request(app).post("/eligibility").send({ ageConfirmed: true, acceptTerms: true })).status).toBe(400);
		expect((await request(app).post("/eligibility").send({ ageConfirmed: true, inUS: true, acceptTerms: "yes" })).status).toBe(400);
		expect(pgQueryMock.mock.calls.some((c) => /update users/.test(String(c[0])))).toBe(false);
	});
});

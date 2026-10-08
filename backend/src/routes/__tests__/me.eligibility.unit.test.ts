import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ageOn } from "@stak/shared";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../services/swipeLimitService.js", () => ({ checkAndIncrementSwipeLimit: vi.fn() }));
vi.mock("../../services/pushService.js", () => ({ getVapidPublicKey: vi.fn() }));
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "Kid@Test.com" };
		next();
	},
	forgetVerifiedToken: vi.fn(),
}));
const deleteUserMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("../../lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: () => ({ auth: { admin: { deleteUser: deleteUserMock } } }) }));
// Today, US Eastern, is fixed at 2026-10-09 for the age arithmetic.
vi.mock("@stak/shared", async (importOriginal) => ({ ...(await importOriginal<object>()), getEasternDateKey: () => "2026-10-09" }));

async function buildApp() {
	vi.resetModules();
	const { meRouter } = await import("../me.js");
	const app = express();
	app.use(express.json());
	app.use("/", meRouter);
	return app;
}

const sqlOf = () => pgQueryMock.mock.calls.map((c) => String(c[0]));

describe("ageOn", () => {
	const today = { year: 2026, month: 10, day: 9 };
	it("counts whole years, turning a year older on the birthday itself", () => {
		expect(ageOn("2008-10-09", today)).toBe(18);
		expect(ageOn("2008-10-10", today)).toBe(17);
		expect(ageOn("1990-01-01", today)).toBe(36);
	});
	it("refuses what isn't a real past date", () => {
		expect(ageOn("2008-02-30", today)).toBeNull();
		expect(ageOn("2026-10-10", today)).toBeNull();
		expect(ageOn("1899-12-31", today)).toBeNull();
		expect(ageOn("10/09/2008", today)).toBeNull();
	});
});

describe("POST /eligibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockResolvedValue({ rows: [] });
	});

	it("records an adult's confirmation, never the date of birth", async () => {
		const app = await buildApp();
		const res = await request(app).post("/eligibility").send({ dob: "1995-04-02", inUS: true, acceptTerms: true });
		expect(res.status).toBe(200);
		const update = pgQueryMock.mock.calls.find((c) => /update users set age_confirmed = true/.test(String(c[0])))!;
		expect(update[1]).toEqual(["u1", expect.any(String), expect.any(String)]);
		expect(JSON.stringify(pgQueryMock.mock.calls)).not.toContain("1995-04-02");
		expect(deleteUserMock).not.toHaveBeenCalled();
	});

	it("deletes an under-18 account on the spot and blocks its email (hashed) from trying again", async () => {
		const app = await buildApp();
		const res = await request(app).post("/eligibility").send({ dob: "2009-01-01", inUS: true, acceptTerms: true });
		expect(res.status).toBe(403);
		expect(res.body.error).toBe("not_eligible");
		const block = pgQueryMock.mock.calls.find((c) => /insert into signup_blocks/.test(String(c[0])))!;
		expect(block[1]![0]).toMatch(/^[0-9a-f]{64}$/);
		expect(JSON.stringify(block)).not.toMatch(/kid@test\.com/i);
		expect(deleteUserMock).toHaveBeenCalledTimes(1);
		expect(sqlOf().some((s) => /delete from users/.test(s))).toBe(true);
		expect(sqlOf().some((s) => /update users set age_confirmed/.test(s))).toBe(false);
	});

	it("refuses an adult date from an email refused in the last 30 days", async () => {
		pgQueryMock.mockImplementation(async (sql: string) => (/from signup_blocks/.test(sql) ? { rows: [{ "?column?": 1 }] } : { rows: [] }));
		const app = await buildApp();
		const res = await request(app).post("/eligibility").send({ dob: "1990-01-01", inUS: true, acceptTerms: true });
		expect(res.status).toBe(403);
		expect(deleteUserMock).toHaveBeenCalledTimes(1);
		expect(sqlOf().some((s) => /insert into signup_blocks/.test(s))).toBe(false);
	});

	it("needs a real date and both confirmations", async () => {
		const app = await buildApp();
		expect((await request(app).post("/eligibility").send({ dob: "2001-13-01", inUS: true, acceptTerms: true })).status).toBe(400);
		expect((await request(app).post("/eligibility").send({ dob: "2001-01-01", inUS: false, acceptTerms: true })).status).toBe(400);
		expect((await request(app).post("/eligibility").send({ dob: "2001-01-01", inUS: true })).status).toBe(400);
		expect(deleteUserMock).not.toHaveBeenCalled();
	});
});

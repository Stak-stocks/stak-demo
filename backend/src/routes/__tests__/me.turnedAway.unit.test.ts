import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQuery = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery, ensureUserRow: vi.fn(), pgPool: { connect: vi.fn() } }));
vi.mock("../../services/swipeLimitService.js", () => ({ checkAndIncrementSwipeLimit: vi.fn() }));
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => { req.user = { uid: "sb-1" }; next(); },
}));
const getUserById = vi.fn();
const deleteUser = vi.fn();
vi.mock("../../lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: () => ({ auth: { admin: { getUserById, deleteUser } } }) }));

async function buildApp() {
	vi.resetModules();
	const { meRouter } = await import("../me.js");
	const app = express();
	app.use(express.json());
	app.use("/", meRouter);
	return app;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
/** The database: no identity mapping (a Supabase-only account), then the account's onboarding and saves. */
function account({ onboarded = false, saved = false } = {}) {
	pgQuery.mockImplementation(async (sql: string) => {
		if (sql.includes("auth_identity_map")) return { rows: [] };
		if (sql.includes("stak_brands")) return { rows: [{ onboarding_completed: onboarded, saved }] };
		return { rows: [] };
	});
}
const deletes = () => pgQuery.mock.calls.filter(([sql]) => /delete from users/.test(sql));

beforeEach(() => {
	vi.clearAllMocks();
	deleteUser.mockResolvedValue({ error: null });
});

describe("POST /turned-away", () => {
	it("removes a brand-new, never-onboarded, empty account - row and sign-in record", async () => {
		account();
		getUserById.mockResolvedValue({ data: { user: { created_at: minutesAgo(1) } }, error: null });
		const res = await request(await buildApp()).post("/turned-away");
		expect(res.status).toBe(200);
		expect(deletes()).toHaveLength(1);
		expect(deleteUser).toHaveBeenCalledWith("sb-1");
	});

	it("leaves an account older than 10 minutes alone", async () => {
		account();
		getUserById.mockResolvedValue({ data: { user: { created_at: minutesAgo(30) } }, error: null });
		const res = await request(await buildApp()).post("/turned-away");
		expect(res.status).toBe(409);
		expect(deletes()).toHaveLength(0);
		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("leaves an onboarded account, or one with saves, alone", async () => {
		getUserById.mockResolvedValue({ data: { user: { created_at: minutesAgo(1) } }, error: null });
		for (const state of [{ onboarded: true }, { saved: true }]) {
			account(state);
			const res = await request(await buildApp()).post("/turned-away");
			expect(res.status).toBe(409);
		}
		expect(deletes()).toHaveLength(0);
		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("leaves it alone when the sign-in record can't be read", async () => {
		account();
		getUserById.mockResolvedValue({ data: { user: null }, error: { message: "not found" } });
		expect((await request(await buildApp()).post("/turned-away")).status).toBe(409);
		expect(deleteUser).not.toHaveBeenCalled();
	});
});

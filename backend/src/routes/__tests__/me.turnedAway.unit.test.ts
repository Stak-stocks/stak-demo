import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQuery = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery, ensureUserRow: vi.fn(), pgPool: { connect: vi.fn() } }));
vi.mock("../../services/swipeLimitService.js", () => ({ checkAndIncrementSwipeLimit: vi.fn() }));
const forgetVerifiedToken = vi.fn();
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => { req.user = { uid: "sb-1" }; next(); },
	forgetVerifiedToken,
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
const signIn = (over: { created_at?: string; provider?: string } = {}) =>
	getUserById.mockResolvedValue({ data: { user: { created_at: over.created_at ?? minutesAgo(1), app_metadata: { provider: over.provider ?? "google" } } }, error: null });
/** The database: an optional Firebase-era mapping, then the account's onboarding and whether it has anything saved. */
function account({ onboarded = false, hasData = false, mappedTo = null as string | null } = {}) {
	pgQuery.mockImplementation(async (sql: string) => {
		if (sql.includes("auth_identity_map")) return { rows: mappedTo ? [{ supabase_uid: mappedTo }] : [] };
		if (sql.includes("android_device_state")) return { rows: [{ onboarding_completed: onboarded, has_data: hasData }] };
		return { rows: [] };
	});
}
const usersDeletes = () => pgQuery.mock.calls.filter(([sql]) => /delete from users/.test(sql));

beforeEach(() => {
	vi.clearAllMocks();
	deleteUser.mockResolvedValue({ error: null });
});

describe("POST /turned-away", () => {
	it("removes a brand-new, never-onboarded, empty Google account: sign-in record first, then the row", async () => {
		account();
		signIn();
		const res = await request(await buildApp()).post("/turned-away").set("Authorization", "Bearer tok");
		expect(res.status).toBe(200);
		expect(deleteUser).toHaveBeenCalledWith("sb-1");
		expect(usersDeletes()).toHaveLength(1);
		// The sign-in record goes before the row, and the old token stops passing at once.
		expect(deleteUser.mock.invocationCallOrder[0]).toBeLessThan(pgQuery.mock.invocationCallOrder[pgQuery.mock.calls.findIndex(([sql]) => /delete from users/.test(sql))]!);
		expect(forgetVerifiedToken).toHaveBeenCalledWith("tok");
	});

	it("uses the mapped Supabase id for an account carried over from Firebase", async () => {
		account({ mappedTo: "sb-mapped" });
		signIn();
		await request(await buildApp()).post("/turned-away");
		expect(getUserById).toHaveBeenCalledWith("sb-mapped");
		expect(deleteUser).toHaveBeenCalledWith("sb-mapped");
	});

	it("still clears the account when the sign-in record can't be deleted (logged, best-effort)", async () => {
		account();
		signIn();
		deleteUser.mockResolvedValue({ error: { message: "admin down" } });
		const res = await request(await buildApp()).post("/turned-away");
		expect(res.status).toBe(200);
		expect(usersDeletes()).toHaveLength(1);
	});

	it("leaves alone an account older than 10 minutes, or not made by Google sign-in", async () => {
		account();
		for (const who of [{ created_at: minutesAgo(30) }, { provider: "email" }]) {
			signIn(who);
			expect((await request(await buildApp()).post("/turned-away")).status).toBe(409);
		}
		expect(usersDeletes()).toHaveLength(0);
		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("leaves alone an onboarded account, or one with anything on the server (an Android sign-up mid-quiz)", async () => {
		signIn();
		for (const state of [{ onboarded: true }, { hasData: true }]) {
			account(state);
			expect((await request(await buildApp()).post("/turned-away")).status).toBe(409);
		}
		expect(usersDeletes()).toHaveLength(0);
		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("leaves it alone when the sign-in record can't be read", async () => {
		account();
		getUserById.mockResolvedValue({ data: { user: null }, error: { message: "not found" } });
		expect((await request(await buildApp()).post("/turned-away")).status).toBe(409);
		expect(deleteUser).not.toHaveBeenCalled();
	});
});

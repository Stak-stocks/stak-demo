import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();

vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
}));

async function buildApp() {
	vi.resetModules();
	const { authMigrationRouter } = await import("../authMigration.js");
	const app = express();
	app.use("/", authMigrationRouter);
	return app;
}

describe("GET /provider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 400 when email is missing", async () => {
		const app = await buildApp();
		const res = await request(app).get("/provider");
		expect(res.status).toBe(400);
	});

	it("defaults to firebase for an email with no auth_identity_map row", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		const app = await buildApp();
		const res = await request(app).get("/provider?email=unknown@example.com");
		expect(res.body).toEqual({ provider: "firebase", requiresPasswordReset: false });
	});

	it("returns firebase while migration_status is still 'firebase'", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ migration_status: "firebase" }] });
		const app = await buildApp();
		const res = await request(app).get("/provider?email=user@example.com");
		expect(res.body).toEqual({ provider: "firebase", requiresPasswordReset: false });
	});

	it("returns supabase + requiresPasswordReset when status is 'requires_password_reset'", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ migration_status: "requires_password_reset" }] });
		const app = await buildApp();
		const res = await request(app).get("/provider?email=user@example.com");
		expect(res.body).toEqual({ provider: "supabase", requiresPasswordReset: true });
	});

	it("returns supabase without requiresPasswordReset once fully migrated", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ migration_status: "supabase" }] });
		const app = await buildApp();
		const res = await request(app).get("/provider?email=user@example.com");
		expect(res.body).toEqual({ provider: "supabase", requiresPasswordReset: false });
	});

	it("fails toward firebase if the database query throws", async () => {
		pgQueryMock.mockRejectedValueOnce(new Error("connection lost"));
		const app = await buildApp();
		const res = await request(app).get("/provider?email=user@example.com");
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ provider: "firebase", requiresPasswordReset: false });
	});

	it("lowercases the email before querying", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		const app = await buildApp();
		await request(app).get("/provider?email=MiXeD-Case@Example.COM");
		expect(pgQueryMock).toHaveBeenCalledWith(expect.any(String), ["mixed-case@example.com"]);
	});
});

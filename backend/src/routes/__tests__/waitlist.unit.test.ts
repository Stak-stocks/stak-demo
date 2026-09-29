import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery: pgQueryMock }));

async function buildApp() {
	vi.resetModules();
	const { waitlistRouter } = await import("../waitlist.js");
	const app = express();
	app.use(express.json());
	app.use("/", waitlistRouter);
	return app;
}

describe("POST /api/waitlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
	});

	it("stores the email trimmed and lower-cased", async () => {
		const app = await buildApp();
		const res = await request(app).post("/").send({ email: "  Ada@Example.COM " });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, already: false });
		expect(pgQueryMock).toHaveBeenCalledWith(expect.stringMatching(/insert into waitlist/), ["ada@example.com", "landing"]);
	});

	it("answers the same way for an email already on the list", async () => {
		pgQueryMock.mockResolvedValue({ rows: [], rowCount: 0 });
		const app = await buildApp();
		const res = await request(app).post("/").send({ email: "ada@example.com" });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, already: true });
	});

	it("rejects something that isn't an email, without touching the database", async () => {
		const app = await buildApp();
		for (const email of ["", "not-an-email", "a@b", 42]) {
			const res = await request(app).post("/").send({ email });
			expect(res.status).toBe(400);
		}
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("limits how often one visitor can submit", async () => {
		const app = await buildApp();
		const codes: number[] = [];
		for (let i = 0; i < 7; i++) codes.push((await request(app).post("/").send({ email: `user${i}@example.com` })).status);
		expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
		expect(codes.slice(5)).toEqual([429, 429]);
	});
});

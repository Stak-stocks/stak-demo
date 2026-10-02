import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery: pgQueryMock }));

async function buildApp() {
	vi.resetModules();
	process.env.ADMIN_SECRET = "s3cret";
	process.env.ANALYTICS_EXCLUDED_EMAILS = "";
	const { analyticsRouter } = await import("../analytics.js");
	const app = express();
	app.use("/", analyticsRouter);
	return app;
}

describe("GET /stak-ai (admin analytics)", () => {
	beforeEach(() => {
		pgQueryMock.mockReset();
		pgQueryMock.mockImplementation(async (sql: string) => {
			if (/with asks as/.test(sql)) return { rows: [{ questions: 4, people: 2, by_context: { stock: 3, none: 1 }, by_via: { starter: 1, typed: 3 }, by_kind: { answer: 3, declined: 1 }, streamed: 3, median_ms: "2400.5" }] };
			if (/to_char/.test(sql)) return { rows: [{ day: "2026-10-01", questions: 4, people: 2 }] };
			if (/stak_ai_open/.test(sql)) return { rows: [{ entry: "stock", platform: "android", opens: 5, people: 2 }] };
			if (/stak_ai_messages/.test(sql)) return { rows: [{ up: 2, down: 1, answers: 3 }] };
			return { rows: [] };
		});
	});

	it("needs the admin secret", async () => {
		expect((await request(await buildApp()).get("/stak-ai")).status).toBe(403);
	});

	it("sums up questions, where they come from, how they went and thumbs", async () => {
		const res = await request(await buildApp()).get("/stak-ai?days=7.5").set("x-admin-secret", "s3cret");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			days: 7, questions: 4, people: 2, byContext: { stock: 3, none: 1 }, byKind: { answer: 3, declined: 1 },
			streamedShare: 0.75, medianMs: 2401, opens: [{ entry: "stock", opens: 5 }], thumbs: { up: 2, down: 1 },
		});
		// A fractional window is rounded down before it reaches make_interval.
		expect(pgQueryMock.mock.calls.every(([, params]) => !params || params[0] === 7)).toBe(true);
	});
});

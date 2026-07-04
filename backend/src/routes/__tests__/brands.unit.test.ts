import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));

async function buildApp() {
	vi.resetModules();
	const { brandsRouter } = await import("../brands.js");
	const app = express();
	app.use(express.json());
	app.use("/", brandsRouter);
	return app;
}

describe("brandsRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockResolvedValue({ rows: [] });
	});

	it("GET / returns a lightweight summary for every brand -- not the heavy text fields", async () => {
		const app = await buildApp();
		const res = await request(app).get("/");

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.brands)).toBe(true);
		expect(res.body.brands.length).toBeGreaterThan(0);

		const aapl = res.body.brands.find((b: { ticker: string }) => b.ticker === "AAPL");
		expect(aapl).toBeDefined();
		expect(aapl).toMatchObject({ ticker: "AAPL", name: expect.any(String), bio: expect.any(String) });
		expect(aapl.vibes).toHaveLength(3);
		expect(aapl.financials.peRatio).toEqual({ value: expect.any(String) });
		// The heavy fields belong only to the full GET /:id response, not this list.
		expect(aapl.culturalContext).toBeUndefined();
		expect(aapl.personalityDescription).toBeUndefined();
		expect(aapl.financials.peRatio.label).toBeUndefined();
		expect(aapl.financials.peRatio.explanation).toBeUndefined();
	});

	it("GET /:id returns the full profile, including the fields the summary list omits", async () => {
		const app = await buildApp();
		const listRes = await request(app).get("/");
		const aaplSummary = listRes.body.brands.find((b: { ticker: string }) => b.ticker === "AAPL");

		const res = await request(app).get(`/${aaplSummary.id}`);

		expect(res.status).toBe(200);
		expect(res.body.ticker).toBe("AAPL");
		expect(res.body.culturalContext).toBeDefined();
		expect(res.body.culturalContext.sections.length).toBeGreaterThan(0);
		expect(res.body.financials.peRatio.explanation).toBeDefined();
	});

	it("GET /:id returns 404 for an unknown id", async () => {
		const app = await buildApp();
		const res = await request(app).get("/not-a-real-brand-id");
		expect(res.status).toBe(404);
	});

	it("GET /popular returns brand IDs saved by 50+ users, derived from stak_brands", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ brand_id: "aapl" }] });

		const app = await buildApp();
		const res = await request(app).get("/popular");

		expect(res.status).toBe(200);
		expect(res.body.brandIds).toEqual(["aapl"]);
	});
});

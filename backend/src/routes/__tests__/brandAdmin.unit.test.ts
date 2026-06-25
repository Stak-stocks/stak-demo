import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateBrandDraftMock = vi.fn();
const commitBrandDraftsMock = vi.fn();

vi.mock("../../services/brandGenerationService.js", () => ({
	generateBrandDraft: generateBrandDraftMock,
}));

vi.mock("../../services/brandCatalogWriter.js", () => ({
	commitBrandDrafts: commitBrandDraftsMock,
}));

async function buildApp() {
	vi.resetModules();
	const { brandAdminRouter } = await import("../brandAdmin.js");
	const app = express();
	app.use(express.json());
	app.use("/", brandAdminRouter);
	return app;
}

describe("brandAdminRouter", () => {
	const originalNodeEnv = process.env.NODE_ENV;
	const originalAdminSecret = process.env.ADMIN_SECRET;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.ADMIN_SECRET = "test-secret";
		delete process.env.NODE_ENV;
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		process.env.ADMIN_SECRET = originalAdminSecret;
	});

	it("blocks both routes with 403 when NODE_ENV is production, even with a correct secret", async () => {
		process.env.NODE_ENV = "production";
		const app = await buildApp();

		const generateRes = await request(app)
			.post("/generate")
			.set("X-Admin-Secret", "test-secret")
			.send({ ticker: "AAPL" });
		expect(generateRes.status).toBe(403);
		expect(generateRes.body.error).toMatch(/local backend/i);
		expect(generateBrandDraftMock).not.toHaveBeenCalled();

		const commitRes = await request(app)
			.post("/commit")
			.set("X-Admin-Secret", "test-secret")
			.send({ drafts: [{}] });
		expect(commitRes.status).toBe(403);
		expect(commitRes.body.error).toMatch(/local backend/i);
		expect(commitBrandDraftsMock).not.toHaveBeenCalled();
	});

	it("the production block takes priority over a wrong secret too -- same response either way", async () => {
		process.env.NODE_ENV = "production";
		const app = await buildApp();

		const res = await request(app)
			.post("/generate")
			.set("X-Admin-Secret", "wrong")
			.send({ ticker: "AAPL" });
		expect(res.status).toBe(403);
		expect(res.body.error).toMatch(/local backend/i);
	});

	it("allows requests through (subject to the secret check) when NODE_ENV is not production", async () => {
		generateBrandDraftMock.mockResolvedValue({ ticker: "AAPL", id: "aapl" });
		const app = await buildApp();

		const res = await request(app)
			.post("/generate")
			.set("X-Admin-Secret", "test-secret")
			.send({ ticker: "AAPL" });

		expect(res.status).toBe(200);
		expect(generateBrandDraftMock).toHaveBeenCalledWith("AAPL");
	});

	it("rejects a wrong secret with 403 when not in production", async () => {
		const app = await buildApp();
		const res = await request(app)
			.post("/generate")
			.set("X-Admin-Secret", "wrong")
			.send({ ticker: "AAPL" });

		expect(res.status).toBe(403);
		expect(res.body).toEqual({ error: "Forbidden" });
		expect(generateBrandDraftMock).not.toHaveBeenCalled();
	});
});

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { TERMS_VERSION } from "@stak/shared";
import { legalRouter } from "../legal.js";

const app = express().use("/", legalRouter);

describe("GET /api/legal/:doc", () => {
	it("serves the Terms with its version, every block as { text } or { list }", async () => {
		const res = await request(app).get("/terms");
		expect(res.status).toBe(200);
		expect(res.body.title).toBe("Terms of Service");
		expect(res.body.version).toBe(TERMS_VERSION);
		expect(res.body.sections.length).toBeGreaterThan(10);
		for (const s of res.body.sections) for (const b of s.blocks) expect(typeof b.text === "string" || Array.isArray(b.list)).toBe(true);
	});

	it("serves the Privacy Policy, and nothing else", async () => {
		expect((await request(app).get("/privacy")).body.title).toBe("Privacy Policy");
		expect((await request(app).get("/cookies")).status).toBe(404);
	});
});

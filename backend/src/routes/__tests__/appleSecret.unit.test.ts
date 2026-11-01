import { generateKeyPairSync, verify } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeAppleClientSecret } from "../../services/appleClientSecret.js";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const p8 = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

async function buildApp() {
	vi.resetModules();
	const { appleSecretRouter } = await import("../appleSecret.js");
	const app = express();
	app.use("/", appleSecretRouter);
	return app;
}

describe("makeAppleClientSecret", () => {
	it("signs an ES256 JWT Apple accepts for the website's Services ID, under 6 months", () => {
		const { secret, expiresAt } = makeAppleClientSecret(p8, 1_000_000);
		const [header, payload, signature] = secret.split(".");
		expect(JSON.parse(Buffer.from(header, "base64url").toString())).toMatchObject({ alg: "ES256", kid: "5NH9HT5BA3" });
		const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
		expect(claims).toMatchObject({ iss: "P6442U4672", sub: "com.stak.demo.web", aud: "https://appleid.apple.com", iat: 1_000_000 });
		expect(claims.exp - claims.iat).toBeLessThanOrEqual(180 * 24 * 60 * 60);
		expect(expiresAt.getTime()).toBe(claims.exp * 1000);
		const ok = verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"));
		expect(ok).toBe(true);
	});
});

describe("POST /renew", () => {
	const fetchMock = vi.fn();
	beforeEach(() => {
		process.env.WARM_SECRET = "warm";
		process.env.APPLE_SIGNIN_KEY_P8 = p8;
		process.env.SUPABASE_MANAGEMENT_TOKEN = "sbp_test\n";
		process.env.SUPABASE_URL = "https://projref.supabase.co";
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it("refuses without the scheduler's secret", async () => {
		const res = await request(await buildApp()).post("/renew");
		expect(res.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sets a fresh secret on the project's Apple provider", async () => {
		fetchMock.mockResolvedValue({ ok: true, status: 200 });
		const res = await request(await buildApp()).post("/renew").set("x-warm-secret", "warm");
		expect(res.status).toBe(200);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://api.supabase.com/v1/projects/projref/config/auth");
		expect(init.method).toBe("PATCH");
		expect(init.headers.Authorization).toBe("Bearer sbp_test");
		expect(Object.keys(JSON.parse(init.body))).toEqual(["external_apple_secret"]);
	});

	it("fails the run when Supabase refuses, without echoing anything secret", async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "Unauthorized" });
		const res = await request(await buildApp()).post("/renew").set("x-warm-secret", "warm");
		expect(res.status).toBe(500);
		expect(res.body).toEqual({ error: "renewal failed" });
	});

	it("fails the run when Supabase can't be reached", async () => {
		fetchMock.mockRejectedValue(new Error("timeout"));
		const res = await request(await buildApp()).post("/renew").set("x-warm-secret", "warm");
		expect(res.status).toBe(500);
	});

	it("fails the run when the key or token isn't configured", async () => {
		delete process.env.SUPABASE_MANAGEMENT_TOKEN;
		const res = await request(await buildApp()).post("/renew").set("x-warm-secret", "warm");
		expect(res.status).toBe(500);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../services/swipeLimitService.js", () => ({ checkAndIncrementSwipeLimit: vi.fn() }));
vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
}));

const getVapidPublicKeyMock = vi.fn<() => string | null>();
vi.mock("../../services/pushService.js", () => ({ getVapidPublicKey: getVapidPublicKeyMock }));

async function buildApp() {
	vi.resetModules();
	const { meRouter } = await import("../me.js");
	const app = express();
	app.use(express.json());
	app.use("/", meRouter);
	return app;
}

const endpoint = "https://fcm.googleapis.com/fcm/send/abcdefghijklmnopqrstuvwxyz0123456789";
const keys = { p256dh: "BPubKeyBase64", auth: "AuthSecret" };

describe("web push registration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockResolvedValue({ rows: [] });
	});

	it("stores a browser subscription with its keys as a 'web' device", async () => {
		const app = await buildApp();
		const res = await request(app).put("/push-device").send({ token: endpoint, platform: "web", webKeys: keys, timezone: "America/Chicago", priceAlerts: true, dailyDeck: false });

		expect(res.status).toBe(200);
		const insert = pgQueryMock.mock.calls.find((c) => /insert into push_devices/.test(String(c[0])))!;
		// No priceThreshold sent: null, so an existing row of this account keeps its own; a new row, or one moving from
		// another account, gets the default (the trailing 3).
		expect(insert[1]).toEqual([endpoint, "u1", "web", "America/Chicago", true, false, JSON.stringify(keys), null, 3]);
	});

	it("rejects a web subscription without keys or a non-https endpoint", async () => {
		const app = await buildApp();
		const noKeys = await request(app).put("/push-device").send({ token: endpoint, platform: "web" });
		expect(noKeys.status).toBe(400);
		const badEndpoint = await request(app).put("/push-device").send({ token: "http://insecure.example/" + "x".repeat(30), platform: "web", webKeys: keys });
		expect(badEndpoint.status).toBe(400);
		expect(pgQueryMock.mock.calls.some((c) => /insert into push_devices/.test(String(c[0])))).toBe(false);
	});

	it("still registers a phone token with no web keys", async () => {
		const app = await buildApp();
		const res = await request(app).put("/push-device").send({ token: "f".repeat(64), platform: "android" });
		expect(res.status).toBe(200);
		const insert = pgQueryMock.mock.calls.find((c) => /insert into push_devices/.test(String(c[0])))!;
		expect(insert[1][2]).toBe("android");
		expect(insert[1][6]).toBeNull();
	});

	it("serves the VAPID public key, or 503 when web push isn't configured", async () => {
		const app = await buildApp();
		getVapidPublicKeyMock.mockReturnValueOnce("PUBLIC_KEY");
		expect((await request(app).get("/web-push-key")).body).toEqual({ publicKey: "PUBLIC_KEY" });
		getVapidPublicKeyMock.mockReturnValueOnce(null);
		expect((await request(app).get("/web-push-key")).status).toBe(503);
	});
});

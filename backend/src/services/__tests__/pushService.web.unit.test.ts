import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery: pgQueryMock }));

const sendNotificationMock = vi.fn();
const setVapidDetailsMock = vi.fn();
vi.mock("web-push", () => ({ default: { sendNotification: sendNotificationMock, setVapidDetails: setVapidDetailsMock } }));

const endpoint = "https://updates.push.services.mozilla.com/wpush/v2/abcdef";

async function load(env: Record<string, string | undefined>) {
	vi.resetModules();
	for (const key of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"] as const) {
		// assigning undefined to process.env would store the string "undefined"
		if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
	}
	return import("../pushService.js");
}

describe("web push sending", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockResolvedValue({ rows: [{ web_keys: { p256dh: "p", auth: "a" } }] });
	});

	it("sends to a browser endpoint with its stored keys and the notification payload", async () => {
		sendNotificationMock.mockResolvedValue({});
		const { sendPush, getVapidPublicKey } = await load({ VAPID_PUBLIC_KEY: "PUB", VAPID_PRIVATE_KEY: "PRIV" });

		expect(getVapidPublicKey()).toBe("PUB");
		const result = await sendPush(endpoint, "AAPL is up 4.0% today", "body", { kind: "move", ticker: "AAPL" });

		expect(result).toBe("sent");
		expect(sendNotificationMock).toHaveBeenCalledWith(
			{ endpoint, keys: { p256dh: "p", auth: "a" } },
			JSON.stringify({ title: "AAPL is up 4.0% today", body: "body", data: { kind: "move", ticker: "AAPL" } }),
			expect.objectContaining({ TTL: expect.any(Number) }),
		);
	});

	it("deletes a subscription the browser reports gone (410)", async () => {
		sendNotificationMock.mockRejectedValue({ statusCode: 410, message: "gone" });
		const { sendPush } = await load({ VAPID_PUBLIC_KEY: "PUB", VAPID_PRIVATE_KEY: "PRIV" });

		expect(await sendPush(endpoint, "t", "b")).toBe("unregistered");
		expect(pgQueryMock.mock.calls.some((c) => /delete from push_devices/.test(String(c[0])))).toBe(true);
	});

	it("skips quietly when the server has no VAPID keys - never throws into the job", async () => {
		const { sendPush, getVapidPublicKey } = await load({ VAPID_PUBLIC_KEY: undefined, VAPID_PRIVATE_KEY: undefined });
		expect(getVapidPublicKey()).toBeNull();
		expect(await sendPush(endpoint, "t", "b")).toBe("failed");
		expect(sendNotificationMock).not.toHaveBeenCalled();
	});

	it("fails without sending when the subscription's keys are missing", async () => {
		pgQueryMock.mockResolvedValue({ rows: [{ web_keys: null }] });
		const { sendPush } = await load({ VAPID_PUBLIC_KEY: "PUB", VAPID_PRIVATE_KEY: "PRIV" });
		expect(await sendPush(endpoint, "t", "b")).toBe("failed");
		expect(sendNotificationMock).not.toHaveBeenCalled();
	});
});

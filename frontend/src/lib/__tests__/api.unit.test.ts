import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../firebase", () => ({
	auth: { currentUser: null as null | { getIdToken: () => Promise<string> } },
}));

describe("api client", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("adds Authorization header when user is logged in", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ brands: [] }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { auth } = await import("../firebase");
		(auth as any).currentUser = {
			getIdToken: vi.fn().mockResolvedValue("token-123"),
		};

		const api = await import("../api");
		await api.getBrandsList();

		const [, options] = fetchMock.mock.calls[0];
		expect(options.headers.Authorization).toBe("Bearer token-123");
		expect(options.headers["Content-Type"]).toBe("application/json");
	});

	it("throws on non-ok responses", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
			json: async () => { throw new SyntaxError("Non-JSON server error"); },
		});
		vi.stubGlobal("fetch", fetchMock);

		const api = await import("../api");
		await expect(api.getBrandsList()).rejects.toThrow("API error: 500 Internal Server Error");
	});

	it("keeps the verification code from the profile API", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			statusText: "Forbidden",
			json: async () => ({ code: "email_not_verified", error: "Email not verified" }),
		}));
		const api = await import("../api");
		await expect(api.getProfile()).rejects.toMatchObject({
			name: "ApiError",
			status: 403,
			code: "email_not_verified",
		});
	});

	it("passes the profile request's cancellation signal and auth token", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ uid: "test-user" }) });
		vi.stubGlobal("fetch", fetchMock);
		const { auth } = await import("../firebase");
		(auth as any).currentUser = { getIdToken: vi.fn().mockResolvedValue("test-token") };
		const controller = new AbortController();
		const api = await import("../api");
		await api.getProfile({ signal: controller.signal });
		expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/me"), expect.objectContaining({
			signal: controller.signal,
			headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
		}));
	});

});

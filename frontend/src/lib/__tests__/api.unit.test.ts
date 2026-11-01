import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("../supabase", () => ({
	supabase: {
		auth: {
			getSession: getSessionMock,
		},
	},
}));

describe("api client", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		// Default: no active session
		getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
	});

	it("adds Authorization header when user is logged in", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ brands: [] }),
		});
		vi.stubGlobal("fetch", fetchMock);

		getSessionMock.mockResolvedValue({
			data: { session: { access_token: "supabase-token-123" } },
			error: null,
		});

		const api = await import("../api");
		await api.getBrandsList();

		const [, options] = fetchMock.mock.calls[0];
		expect(options.headers.Authorization).toBe("Bearer supabase-token-123");
		expect(options.headers["Content-Type"]).toBe("application/json");
	});

	it("throws on non-ok responses", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});
		vi.stubGlobal("fetch", fetchMock);

		const api = await import("../api");
		await expect(api.getBrandsList()).rejects.toThrow("API error: 500 Internal Server Error");
	});
});

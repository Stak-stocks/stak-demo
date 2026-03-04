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
		await api.getBrands();

		const [, options] = fetchMock.mock.calls[0];
		expect(options.headers.Authorization).toBe("Bearer token-123");
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
		await expect(api.getBrands()).rejects.toThrow("API error: 500 Internal Server Error");
	});

	it("fetchDynamicStocks filters class-share duplicates (GOOG when GOOGL exists)", async () => {
		vi.resetModules();

		vi.doMock("@/data/brands", () => ({
			brands: [{ id: "googl", ticker: "GOOGL", name: "Alphabet" }],
		}));

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				stocks: [
					{ id: "goog", ticker: "GOOG", name: "Alphabet C" },
					{ id: "tsla", ticker: "TSLA", name: "Tesla" },
				],
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const api = await import("../api");
		const stocks = await api.fetchDynamicStocks();

		expect(stocks.map((s: any) => s.ticker)).toEqual(["TSLA"]);
	});

	it("fetchDynamicStocks returns module cache on second call", async () => {
		vi.resetModules();

		vi.doMock("@/data/brands", () => ({
			brands: [{ id: "aapl", ticker: "AAPL", name: "Apple" }],
		}));

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ stocks: [{ id: "tsla", ticker: "TSLA", name: "Tesla" }] }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const api = await import("../api");
		await api.fetchDynamicStocks();
		await api.fetchDynamicStocks();

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

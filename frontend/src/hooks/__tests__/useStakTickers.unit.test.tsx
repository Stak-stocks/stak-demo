import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStakTickers } from "../useStakTickers";
import { useAccount } from "@/context/AccountContext";
import { useBrandsList } from "@/hooks/useBrandsList";

vi.mock("@/context/AccountContext", () => ({
	useAccount: vi.fn(),
}));

vi.mock("@/hooks/useBrandsList", () => ({
	useBrandsList: vi.fn(),
}));

const mockedUseAccount = vi.mocked(useAccount);
const mockedUseBrandsList = vi.mocked(useBrandsList);

describe("useStakTickers", () => {
	it("returns [] while the brand catalog is still loading, even with stakBrandIds set", () => {
		mockedUseAccount.mockReturnValue({ account: { stakBrandIds: ["aapl"] } } as any);
		mockedUseBrandsList.mockReturnValue({ data: undefined } as any);

		const { result } = renderHook(() => useStakTickers());
		expect(result.current).toEqual([]);
	});

	it("resolves stakBrandIds to sorted, deduped, uppercase tickers once the catalog has loaded", () => {
		mockedUseAccount.mockReturnValue({ account: { stakBrandIds: ["tsla", "aapl", "missing-id"] } } as any);
		mockedUseBrandsList.mockReturnValue({
			data: [
				{ id: "aapl", ticker: "aapl" },
				{ id: "tsla", ticker: "TSLA" },
			],
		} as any);

		const { result } = renderHook(() => useStakTickers());
		expect(result.current).toEqual(["AAPL", "TSLA"]);
	});

	it("returns [] when the user has no stakBrandIds, regardless of catalog state", () => {
		mockedUseAccount.mockReturnValue({ account: { stakBrandIds: [] } } as any);
		mockedUseBrandsList.mockReturnValue({ data: [{ id: "aapl", ticker: "AAPL" }] } as any);

		const { result } = renderHook(() => useStakTickers());
		expect(result.current).toEqual([]);
	});
});

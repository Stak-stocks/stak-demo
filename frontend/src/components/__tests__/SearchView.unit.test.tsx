import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchView } from "../SearchView";

// Stable reference across renders -- matches real useQuery behavior (same data
// object until a refetch actually completes). A fresh literal per call would
// make SearchView's searchIndex useMemo recompute every render and loop forever.
const mockBrands = [
	{ id: "1", name: "Apple Inc", ticker: "AAPL", bio: "", heroImage: "", vibes: [], financials: {} },
	{ id: "2", name: "Tesla Inc", ticker: "TSLA", bio: "", heroImage: "", vibes: [], financials: {} },
];

vi.mock("@/hooks/useBrandsList", () => ({
	useBrandsList: () => ({ data: mockBrands }),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ user: null }),
}));

vi.mock("@/context/AccountContext", () => ({
	useAccount: () => ({
		account: { searchHistory: [] },
		addSearchHistory: vi.fn(),
		removeSearchHistoryEntry: vi.fn(),
		clearSearchHistory: vi.fn(),
	}),
}));

vi.mock("../StockCard", () => ({
	StockCard: ({ brand }: any) => <div data-testid={`stock-card-${brand.ticker}`}>{brand.name}</div>,
}));

vi.mock("../BrandContextModal", () => ({
	BrandContextModal: () => null,
}));

describe("SearchView", () => {
	it("does not render when open is false", () => {
		const { container } = render(
			<SearchView open={false} onClose={vi.fn()} />,
		);
		expect(container.innerHTML).toBe("");
	});

	it("renders 'Search Stocks' header when open", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		expect(screen.getByText("Search Stocks")).toBeInTheDocument();
	});

	it("renders X close button at top-left with 'Cancel' tooltip", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		const closeBtn = screen.getByLabelText("Close search");
		expect(closeBtn).toBeInTheDocument();
		expect(closeBtn.tagName).toBe("BUTTON");
		expect(closeBtn).toHaveAttribute("title", "Cancel");
	});

	it("X close button appears before the Search Stocks title", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		const closeBtn = screen.getByLabelText("Close search");
		const header = screen.getByText("Search Stocks");
		const container = closeBtn.closest("div");
		// Both should be in the same flex container
		expect(container).toContainElement(header);
		// Close button should come before the title (top-left position)
		const children = Array.from(container!.children);
		const closeBtnIndex = children.indexOf(closeBtn);
		const headerIndex = children.indexOf(header);
		expect(closeBtnIndex).toBeLessThan(headerIndex);
	});

	it("calls onClose when X close button is clicked", () => {
		const onClose = vi.fn();
		render(<SearchView open={true} onClose={onClose} />);
		const closeBtn = screen.getByLabelText("Close search");
		fireEvent.click(closeBtn);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("leaves space for bottom nav (not full screen)", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		const overlay = screen.getByText("Search Stocks").closest(
			".fixed",
		) as HTMLElement;
		expect(overlay).toBeInTheDocument();
		expect(overlay.className).not.toContain("inset-0");
		expect(overlay.className).toContain("bottom-[calc(4rem+env(safe-area-inset-bottom))]");
	});

	it("renders the search input", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		expect(
			screen.getByPlaceholderText(/search by ticker or company name/i),
		).toBeInTheDocument();
	});
});

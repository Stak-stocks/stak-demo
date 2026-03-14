import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchView } from "../SearchView";

// Mock dependencies
vi.mock("@/data/brands", () => ({
	brands: [
		{ id: "1", name: "Apple Inc", ticker: "AAPL", logo: "", coverImage: "", description: "", clout: 80, drama: 20, hype: 60, genZBuzz: "", whyCare: "" },
		{ id: "2", name: "Tesla Inc", ticker: "TSLA", logo: "", coverImage: "", description: "", clout: 90, drama: 50, hype: 95, genZBuzz: "", whyCare: "" },
	],
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

	it("does NOT render an X close button", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		// The header should have "Search Stocks" but no X/close button next to it
		const header = screen.getByText("Search Stocks");
		const headerContainer = header.closest("div");
		// No button with an X icon in the header area
		const buttons = headerContainer?.querySelectorAll("button");
		expect(buttons?.length ?? 0).toBe(0);
	});

	it("leaves space for bottom nav (not full screen)", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		const overlay = screen.getByText("Search Stocks").closest(
			".fixed",
		) as HTMLElement;
		expect(overlay).toBeInTheDocument();
		// Should NOT have inset-0 (full screen)
		expect(overlay.className).not.toContain("inset-0");
		// Should have bottom offset for nav
		expect(overlay.className).toContain("bottom-[calc(4rem+env(safe-area-inset-bottom))]");
	});

	it("renders the search input", () => {
		render(<SearchView open={true} onClose={vi.fn()} />);
		expect(
			screen.getByPlaceholderText(/search by ticker or company name/i),
		).toBeInTheDocument();
	});
});

import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchView } from "../SearchView";

// Stable reference across renders -- matches real useQuery behavior (same data
// object until a refetch actually completes). A fresh literal per call would
// make SearchView's searchIndex useMemo recompute every render and loop forever.
const mockBrands = [
	{ id: "1", name: "Apple Inc", ticker: "AAPL", bio: "", heroImage: "", vibes: [], financials: {} },
	{ id: "2", name: "Tesla Inc", ticker: "TSLA", bio: "", heroImage: "", vibes: [], financials: {} },
];
const account = { searchHistory: [], stakBrandIds: ["2"] };

vi.mock("@/hooks/useBrandsList", () => ({
	useBrandsList: () => ({ data: mockBrands }),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ appUser: null }),
}));

vi.mock("@/context/AccountContext", () => ({
	useAccount: () => ({
		account,
		addSearchHistory: vi.fn(),
		removeSearchHistoryEntry: vi.fn(),
		clearSearchHistory: vi.fn(),
	}),
}));

// jsdom has no matchMedia; the layout choice doesn't matter to these tests.
vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

const recordEngagement = vi.fn().mockResolvedValue({});
vi.mock("@/lib/api", () => ({
	getBatchQuotes: vi.fn().mockResolvedValue({ quotes: {} }),
	recordEngagement: (...args: unknown[]) => recordEngagement(...args),
}));

vi.mock("@/components/discover/DiscoverCard", () => ({
	DiscoverCard: ({ brand, onLearnMore }: any) => (
		<div data-testid={`card-${brand.ticker}`}>
			{brand.name}
			<button type="button" onClick={() => onLearnMore(brand)}>Learn more</button>
		</div>
	),
}));

vi.mock("@/components/discover/QuickLookSheet", () => ({
	QuickLookSheet: ({ brand }: any) => <div role="dialog">Quick Look: {brand.name}</div>,
}));

function renderSearch(props: Partial<Parameters<typeof SearchView>[0]> = {}) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrap = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	return render(<SearchView open={true} onClose={vi.fn()} {...props} />, { wrapper: wrap });
}

describe("SearchView", () => {
	beforeEach(() => { vi.useFakeTimers(); });
	afterEach(() => { vi.useRealTimers(); });

	const typeQuery = (text: string) => {
		fireEvent.change(screen.getByPlaceholderText(/search by ticker or company name/i), { target: { value: text } });
		act(() => { vi.advanceTimersByTime(250); });
	};

	it("does not render when open is false", () => {
		const { container } = renderSearch({ open: false });
		expect(container.innerHTML).toBe("");
	});

	it("renders the header, the close button before it, and the search input", () => {
		renderSearch();
		const closeBtn = screen.getByLabelText("Close search");
		const header = screen.getByText("Search Stocks");
		expect(closeBtn).toHaveAttribute("title", "Cancel");
		const row = Array.from(closeBtn.parentElement!.children);
		expect(row.indexOf(closeBtn)).toBeLessThan(row.indexOf(header));
		expect(screen.getByPlaceholderText(/search by ticker or company name/i)).toBeInTheDocument();
	});

	it("calls onClose when the close button is clicked", () => {
		const onClose = vi.fn();
		renderSearch({ onClose });
		fireEvent.click(screen.getByLabelText("Close search"));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("leaves space for the bottom nav (not full screen)", () => {
		renderSearch();
		const overlay = screen.getByText("Search Stocks").closest(".fixed") as HTMLElement;
		expect(overlay.className).not.toContain("inset-0");
		expect(overlay.className).toContain("bottom-[calc(4rem+env(safe-area-inset-bottom))]");
	});

	it("shows matches as Discover cards with Add to STAK, or In your STAK when already saved", () => {
		const onSwipeRight = vi.fn();
		renderSearch({ onSwipeRight });
		typeQuery("inc");
		expect(screen.getByTestId("card-AAPL")).toBeInTheDocument();
		expect(screen.getByTestId("card-TSLA")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /add to stak/i }));
		expect(onSwipeRight).toHaveBeenCalledWith(expect.objectContaining({ ticker: "AAPL" }));
		expect(screen.getByRole("button", { name: /in your stak/i })).toBeDisabled();
	});

	it("opens Discover's Quick Look from a card's Learn more", () => {
		renderSearch();
		typeQuery("apple");
		fireEvent.click(screen.getByRole("button", { name: "Learn more" }));
		expect(screen.getByRole("dialog")).toHaveTextContent("Quick Look: Apple Inc");
		// Counts toward Investing Taste's "Quick Looks read".
		expect(recordEngagement).toHaveBeenCalledWith("learn_more", "1", expect.objectContaining({ ticker: "AAPL" }));
	});

	it("says so when nothing matches", () => {
		renderSearch();
		typeQuery("zzzz");
		expect(screen.getByText(/no results found/i)).toBeInTheDocument();
	});
});

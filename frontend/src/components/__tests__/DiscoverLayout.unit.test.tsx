import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { createElement } from "react";

// Capture the component directly from createFileRoute call
let capturedComponent: any = null;

// Mock all dependencies for index/discover page
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: (_path: string) => (options: any) => {
		capturedComponent = options.component;
		return { options, update: () => ({ options }) };
	},
	lazyRouteComponent: (fn: any) => fn,
	useNavigate: () => vi.fn(),
	Link: ({ children, to, className, ...props }: any) => (
		<a href={to} className={className} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({ data: undefined, isLoading: false }),
	useQueryClient: () => ({
		getQueryData: () => undefined,
		invalidateQueries: vi.fn(),
	}),
}));

vi.mock("@/components/discover/DiscoverDeck", () => ({
	DiscoverDeck: () => <div data-testid="discover-deck">Deck</div>,
}));

vi.mock("@/components/discover/QuickLookSheet", () => ({
	QuickLookSheet: () => null,
}));

vi.mock("@/lib/api", () => ({
	recordEngagement: vi.fn(),
	getQuickLook: vi.fn(),
	getSortedRecommendations: vi.fn(),
	getBrandsList: vi.fn(),
}));

vi.mock("@/hooks/useSwipeLimit", () => ({
	useSwipeLimit: () => ({
		count: 0,
		hasReachedLimit: false,
		bumpOptimistic: vi.fn(),
		reportSwipeResult: vi.fn(),
	}),
	DAILY_SWIPE_LIMIT: 20,
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ appUser: { uid: "test" } }),
}));

vi.mock("@/context/AccountContext", () => ({
	useAccount: () => ({
		account: {
			stakBrandIds: [],
			passedBrands: [],
			tagScores: {},
		},
		saveToStak: vi.fn().mockResolvedValue(undefined),
		removeFromStak: vi.fn().mockResolvedValue(undefined),
		removePassedBrand: vi.fn().mockResolvedValue(undefined),
		updatePassedBrands: vi.fn().mockResolvedValue(undefined),
	}),
}));

// These tests cover the phone (Android) layout; desktop Discover is a separate branch of the page.
vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => true,
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("Discover Page Layout", () => {
	beforeAll(async () => {
		await import("../../routes/discover");
	});

	it("shows Android's header (title, count/limit ring, deck label) while the deck loads", () => {
		expect(capturedComponent).toBeDefined();
		render(createElement(capturedComponent));

		expect(screen.getByRole("heading", { name: "Discover" })).toBeInTheDocument();
		expect(screen.getByText("1/20")).toBeInTheDocument();
		expect(screen.getByText("TODAY'S DECK")).toBeInTheDocument();
		expect(screen.getByRole("status", { name: "Loading today's deck" })).toBeInTheDocument();
	});

	it("has no search button, STAK wordmark or streak chip (Android's Discover has none)", () => {
		render(createElement(capturedComponent));

		expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
		expect(screen.queryByText("STAK")).not.toBeInTheDocument();
		expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
	});
});

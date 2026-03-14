import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";

// Mock all dependencies for index/discover page
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: any) => ({ options }),
	Link: ({ children, to, className, ...props }: any) => (
		<a href={to} className={className} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/data/brands", () => ({
	brands: [],
}));

vi.mock("@/data/intelCards", () => ({
	INTEL_CARDS: [],
}));

vi.mock("@/components/SwipeableCardStack", () => ({
	SwipeableCardStack: () => <div data-testid="swipeable-stack">Stack</div>,
}));

vi.mock("@/components/BrandContextModal", () => ({
	BrandContextModal: () => null,
}));

vi.mock("@/components/IntelCardModal", () => ({
	IntelCardModal: () => null,
}));

vi.mock("@/lib/api", () => ({
	getIntelCards: vi.fn(),
	recordEngagement: vi.fn(),
}));

vi.mock("@/hooks/useSwipeLimit", () => ({
	useSwipeLimit: () => ({ count: 0, hasReachedLimit: false, increment: vi.fn() }),
	DAILY_SWIPE_LIMIT: 20,
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ user: { uid: "test" } }),
}));

vi.mock("@/context/AccountContext", () => ({
	useAccount: () => ({
		account: {
			stakBrandIds: [],
			passedBrands: [],
			deckOrder: null,
			intelState: {},
			interests: [],
			streakDays: 0,
			streakLastDate: null,
			categoryScores: {},
		},
		updateStak: vi.fn().mockResolvedValue(undefined),
		updatePassedBrands: vi.fn().mockResolvedValue(undefined),
		updateDeckOrder: vi.fn().mockResolvedValue(undefined),
		updateIntelState: vi.fn().mockResolvedValue(undefined),
		updateStreak: vi.fn().mockResolvedValue(undefined),
		updateCategoryScores: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock("@/data/onboarding", () => ({
	INTEREST_TO_BRANDS: {},
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/ui/sheet", () => ({
	Sheet: ({ children }: any) => <div>{children}</div>,
	SheetContent: ({ children }: any) => <div>{children}</div>,
	SheetHeader: ({ children }: any) => <div>{children}</div>,
	SheetTitle: ({ children }: any) => <div>{children}</div>,
}));

describe("Discover Page Layout", () => {
	it("renders Search button pinned to the top-left", async () => {
		const mod = await import("../../routes/index");
		const DiscoverPage = (mod as any).Route?.options?.component;
		expect(DiscoverPage).toBeDefined();

		render(createElement(DiscoverPage));

		const searchBtn = screen.getByLabelText("Search");
		expect(searchBtn).toBeInTheDocument();
		expect(searchBtn.tagName).toBe("BUTTON");

		// Should be in a flex justify-start container (top-left)
		const container = searchBtn.closest("div");
		expect(container?.className).toContain("justify-start");
	});

	it("renders STAK title and subtitle", async () => {
		const mod = await import("../../routes/index");
		const DiscoverPage = (mod as any).Route?.options?.component;
		expect(DiscoverPage).toBeDefined();

		render(createElement(DiscoverPage));
		expect(screen.getByText("STAK")).toBeInTheDocument();
		expect(screen.getByText(/swipe right to vibe/i)).toBeInTheDocument();
	});
});

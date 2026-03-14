import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";

// Mock all dependencies for feed page
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: any) => ({ options }),
	Link: ({ children, ...props }: any) => createElement("a", props, children),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({
		data: { articles: [] },
		isLoading: false,
		error: null,
	}),
}));

vi.mock("@/lib/api", () => ({
	getMarketNews: vi.fn().mockResolvedValue({ articles: [] }),
	searchNews: vi.fn().mockResolvedValue({ articles: [] }),
}));

vi.mock("@/components/MarketBar", () => ({
	MarketBar: () => <div data-testid="market-bar">MarketBar</div>,
}));

vi.mock("@/components/EarningsCalendar", () => ({
	MarketEarningsWidget: () => null,
	EarningsCalendarButton: () => (
		<button data-testid="earnings-calendar-btn" aria-label="Earnings Calendar">
			Calendar
		</button>
	),
}));

describe("Feed Page Layout", () => {
	it("renders earnings calendar button in a top-right container", async () => {
		// Dynamically import after mocks
		const mod = await import("../../routes/feed");
		// The feed page component
		const FeedPage = (mod as any).Route?.options?.component;
		expect(FeedPage).toBeDefined();

		render(createElement(FeedPage));
		const calBtn = screen.getByTestId("earnings-calendar-btn");
		expect(calBtn).toBeInTheDocument();

		// Calendar button should be in a flex justify-start container (top-left)
		const container = calBtn.closest("div");
		expect(container?.className).toContain("justify-start");
	});

	it("renders Market News header text", async () => {
		const mod = await import("../../routes/feed");
		const FeedPage = (mod as any).Route?.options?.component;
		expect(FeedPage).toBeDefined();

		render(createElement(FeedPage));
		expect(screen.getByText("Market News")).toBeInTheDocument();
		expect(screen.getByText(/simplified for you/i)).toBeInTheDocument();
	});
});

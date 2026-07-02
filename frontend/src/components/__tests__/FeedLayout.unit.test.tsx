import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { createElement } from "react";

// Capture the component directly from createFileRoute call
let capturedComponent: any = null;

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: (_path: string) => (options: any) => {
		capturedComponent = options.component;
		return { options, update: () => ({ options }) };
	},
	lazyRouteComponent: (fn: any) => fn,
	Link: ({ children, ...props }: any) => createElement("a", props, children),
	useLocation: () => ({ pathname: "/feed" }),
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

describe("Feed Page Layout", () => {
	beforeAll(async () => {
		await import("../../routes/feed");
	});

	it("renders Market News header text", () => {
		expect(capturedComponent).toBeDefined();
		render(createElement(capturedComponent));

		expect(screen.getByText("Market News")).toBeInTheDocument();
		expect(screen.getByText(/simplified for you/i)).toBeInTheDocument();
	});
});

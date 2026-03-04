import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StockNewsTab } from "../StockNewsTab";
import { getCompanyNews } from "@/lib/api";

vi.mock("@/lib/api", () => ({
	getCompanyNews: vi.fn(),
}));

const mockedGetCompanyNews = vi.mocked(getCompanyNews);

function renderWithClient(ui: React.ReactNode) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mkArticle = (i: number) => ({
	headline: `Headline ${i}`,
	source: "Reuters",
	url: `https://example.com/${i}`,
	image: "",
	datetime: 1700000000 + i,
	summary: "summary",
	explanation: "explanation",
	whyItMatters: "matters",
	sentiment: "neutral" as const,
	type: "company" as const,
});

describe("StockNewsTab", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders empty state", async () => {
		mockedGetCompanyNews.mockResolvedValue({ articles: [], earningsSignal: { status: "none", date: null } } as any);

		renderWithClient(<StockNewsTab ticker="AAPL" name="Apple" />);

		await waitFor(() => {
			expect(screen.getByText("No recent news for Apple.")).toBeInTheDocument();
		});
	});

	it("renders error state", async () => {
		mockedGetCompanyNews.mockRejectedValue(new Error("boom"));

		renderWithClient(<StockNewsTab ticker="AAPL" name="Apple" />);

		await waitFor(() => {
			expect(screen.getByText("Couldn't load news for AAPL.")).toBeInTheDocument();
		});
	});

	it("paginates with Load more", async () => {
		mockedGetCompanyNews.mockResolvedValue({
			articles: [mkArticle(1), mkArticle(2), mkArticle(3), mkArticle(4)],
			earningsSignal: { status: "none", date: null },
		} as any);

		renderWithClient(<StockNewsTab ticker="AAPL" name="Apple" />);

		await waitFor(() => {
			expect(screen.getByText("Headline 1")).toBeInTheDocument();
		});

		expect(screen.queryByText("Headline 4")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /load more stories/i }));

		await waitFor(() => {
			expect(screen.getByText("Headline 4")).toBeInTheDocument();
		});
	});
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { createElement } from "react";

// Capture the component directly from createFileRoute call
let capturedComponent: any = null;

// These tests cover the phone (Android) layout; desktop News is a separate component.
vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => true,
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: (_path: string) => (options: any) => {
		capturedComponent = options.component;
		return { options, update: () => ({ options }) };
	},
	useNavigate: () => vi.fn(),
}));

const NOW_S = Math.floor(Date.now() / 1000);
const article = (headline: string, extra: Record<string, unknown> = {}) => ({
	headline, source: "Wire", url: `https://x.test/${headline}`, image: "", datetime: NOW_S - 600,
	summary: "", explanation: "", whyItMatters: "", sentiment: "neutral", type: "macro", ...extra,
});

vi.mock("@tanstack/react-query", () => ({
	useQuery: ({ queryKey }: { queryKey: unknown[] }) =>
		queryKey[0] === "market-news"
			? { data: { articles: [article("Fed holds rates steady"), article("Chipmakers rally on AI demand")] }, isPending: false, isError: false }
			: { data: undefined, isPending: false, isError: false },
	useQueries: () => [],
}));

vi.mock("@/lib/api", () => ({
	getMarketNews: vi.fn(),
	getCompanyNews: vi.fn(),
	getDailyBrief: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ appUser: { uid: "u1" } }) }));
vi.mock("@/hooks/useMyStakData", () => ({ useMyStakData: () => ({ swipedBrands: [] }) }));
vi.mock("@/hooks/useBrandsList", () => ({ useBrandsList: () => ({ data: [{ ticker: "NVDA", name: "NVIDIA" }] }) }));

describe("News page", () => {
	beforeAll(async () => {
		await import("../../routes/feed");
	});

	it("renders Android's header, Markets section and stories", () => {
		expect(capturedComponent).toBeDefined();
		render(createElement(capturedComponent));

		expect(screen.getByRole("heading", { name: "News" })).toBeInTheDocument();
		// Android keeps the search field closed behind a glass until it's tapped.
		expect(screen.queryByLabelText("Search news", { selector: "input" })).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Markets" })).toBeInTheDocument();
		// With no AI brief, Today's Brief leads with the top market story (Android's fallback), so it appears twice.
		expect(screen.getAllByText("Fed holds rates steady")).toHaveLength(2);
		expect(screen.getByText("Chipmakers rally on AI demand")).toBeInTheDocument();
	});

	it("filters stories instantly and shows Android's no-results copy", () => {
		render(createElement(capturedComponent));
		fireEvent.click(screen.getByRole("button", { name: "Search news" }));
		const search = screen.getByLabelText("Search news", { selector: "input" });

		// Searching hides the mood row, and the brief card becomes the first story that matches; so is the list row.
		fireEvent.change(search, { target: { value: "chipmakers" } });
		expect(screen.queryByText("Fed holds rates steady")).not.toBeInTheDocument();
		expect(screen.getAllByText("Chipmakers rally on AI demand")).toHaveLength(2);

		fireEvent.change(search, { target: { value: "zzzz" } });
		expect(screen.getByText("No results for “zzzz”")).toBeInTheDocument();
	});
});

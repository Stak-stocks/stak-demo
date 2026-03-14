import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BottomNav } from "../BottomNav";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, onClick, className, ...props }: any) => (
		<a href={to} onClick={onClick} className={className} data-testid={`nav-link-${to}`} {...props}>
			{children}
		</a>
	),
	useRouterState: vi.fn(() => ({
		location: { pathname: "/" },
	})),
}));

import { useRouterState } from "@tanstack/react-router";

const mockedUseRouterState = vi.mocked(useRouterState);

describe("BottomNav", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedUseRouterState.mockReturnValue({
			location: { pathname: "/" },
		} as any);
	});

	it("renders all five nav items: Discover, Search, News, League, Profile", () => {
		render(<BottomNav />);
		expect(screen.getByText("Discover")).toBeInTheDocument();
		expect(screen.getByText("Search")).toBeInTheDocument();
		expect(screen.getByText("News")).toBeInTheDocument();
		expect(screen.getByText("League")).toBeInTheDocument();
		expect(screen.getByText("Profile")).toBeInTheDocument();
	});

	it("renders Search as a button (not a Link)", () => {
		render(<BottomNav />);
		const searchButton = screen.getByText("Search").closest("button");
		expect(searchButton).toBeInTheDocument();
		expect(searchButton?.tagName).toBe("BUTTON");
	});

	it("calls onSearchClick when Search button is clicked and search is not active", () => {
		const onSearchClick = vi.fn();
		const onSearchClose = vi.fn();
		render(
			<BottomNav
				onSearchClick={onSearchClick}
				onSearchClose={onSearchClose}
				searchActive={false}
			/>,
		);
		fireEvent.click(screen.getByText("Search").closest("button")!);
		expect(onSearchClick).toHaveBeenCalledTimes(1);
		expect(onSearchClose).not.toHaveBeenCalled();
	});

	it("calls onSearchClose when Search button is clicked and search IS active", () => {
		const onSearchClick = vi.fn();
		const onSearchClose = vi.fn();
		render(
			<BottomNav
				onSearchClick={onSearchClick}
				onSearchClose={onSearchClose}
				searchActive={true}
			/>,
		);
		fireEvent.click(screen.getByText("Search").closest("button")!);
		expect(onSearchClose).toHaveBeenCalledTimes(1);
		expect(onSearchClick).not.toHaveBeenCalled();
	});

	it("shows Search with active/glow styling when searchActive is true", () => {
		render(<BottomNav searchActive={true} />);
		const searchButton = screen.getByText("Search").closest("button")!;
		// Active state should apply violet active color
		expect(searchButton.className).toContain("text-violet-500");
		// The glow container
		const glowDiv = searchButton.querySelector("div");
		expect(glowDiv?.className).toContain("from-violet-400/30");
	});

	it("suppresses other nav items active state when searchActive is true", () => {
		mockedUseRouterState.mockReturnValue({
			location: { pathname: "/" },
		} as any);
		render(<BottomNav searchActive={true} />);
		// Discover should NOT be active even though we're on "/"
		const discoverLink = screen.getByText("Discover").closest("a")!;
		expect(discoverLink.className).not.toContain("text-cyan-500");
		expect(discoverLink.className).toContain("text-zinc-400");
	});

	it("calls onSearchClose when another nav item is clicked while search is active", () => {
		const onSearchClose = vi.fn();
		render(<BottomNav searchActive={true} onSearchClose={onSearchClose} />);
		fireEvent.click(screen.getByText("Discover").closest("a")!);
		expect(onSearchClose).toHaveBeenCalledTimes(1);
	});

	it("has z-[60] on the nav element to stay above search overlay", () => {
		render(<BottomNav />);
		const nav = screen.getByRole("navigation");
		expect(nav.className).toContain("z-[60]");
	});
});

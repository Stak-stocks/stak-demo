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

vi.mock("@/context/AccountContext", () => ({
	useAccount: () => ({ account: null }),
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

	it("renders all five nav items: Discover, My STAK, News, Playground, Profile", () => {
		render(<BottomNav />);
		expect(screen.getByText("Discover")).toBeInTheDocument();
		expect(screen.getByText("My STAK")).toBeInTheDocument();
		expect(screen.getByText("News")).toBeInTheDocument();
		expect(screen.getByText("Playground")).toBeInTheDocument();
		expect(screen.getByText("Profile")).toBeInTheDocument();
	});

	it("renders My STAK as a Link to /my-stak", () => {
		render(<BottomNav />);
		const stakLink = screen.getByText("My STAK").closest("a");
		expect(stakLink).toBeInTheDocument();
		expect(stakLink?.getAttribute("href")).toBe("/my-stak");
	});

	it("does NOT render a Search button in the nav", () => {
		render(<BottomNav />);
		expect(screen.queryByText("Search")).not.toBeInTheDocument();
	});

	it("shows Discover as active when on / path", () => {
		mockedUseRouterState.mockReturnValue({
			location: { pathname: "/" },
		} as any);
		render(<BottomNav />);
		const discoverLink = screen.getByText("Discover").closest("a")!;
		expect(discoverLink.className).toContain("text-cyan-500");
	});

	it("shows My STAK as active with a tinted icon background when on /my-stak path", () => {
		mockedUseRouterState.mockReturnValue({
			location: { pathname: "/my-stak" },
		} as any);
		render(<BottomNav />);
		const stakLink = screen.getByText("My STAK").closest("a")!;
		expect(stakLink.className).toContain("text-violet-500");
		const iconBg = stakLink.querySelector("div");
		expect(iconBg?.className).toContain("bg-violet-500/10");
	});

	it("calls onSearchClose when a nav item is clicked while search is active", () => {
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

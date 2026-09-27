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

	it("renders all five nav items: Home, News, Discover, My STAK, Simulate", () => {
		render(<BottomNav />);
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByText("News")).toBeInTheDocument();
		expect(screen.getByText("Discover")).toBeInTheDocument();
		expect(screen.getByText("My STAK")).toBeInTheDocument();
		expect(screen.getByText("Simulate")).toBeInTheDocument();
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

	it("shows Home as active when on / path", () => {
		mockedUseRouterState.mockReturnValue({
			location: { pathname: "/" },
		} as any);
		render(<BottomNav />);
		const homeLink = screen.getByText("Home").closest("a")!;
		expect(homeLink.getAttribute("aria-current")).toBe("page");
		expect(screen.getByText("News").closest("a")!.getAttribute("aria-current")).toBeNull();
	});

	it("marks My STAK as the current page on /my-stak, and draws its filled white icon", () => {
		mockedUseRouterState.mockReturnValue({
			location: { pathname: "/my-stak" },
		} as any);
		render(<BottomNav />);
		const stakLink = screen.getByText("My STAK").closest("a")!;
		expect(stakLink.getAttribute("aria-current")).toBe("page");
		// Android tells active from inactive by the icon alone: a filled white glyph, not the grey outline.
		expect(stakLink.querySelector("path")?.getAttribute("fill")).toBe("#FFFFFF");
		expect(screen.getByText("Home").closest("a")!.querySelector("path")?.getAttribute("stroke")).toBe("#AEAEAE");
	});

	it("calls onSearchClose when a nav item is clicked while search is active", () => {
		const onSearchClose = vi.fn();
		render(<BottomNav searchActive={true} onSearchClose={onSearchClose} />);
		fireEvent.click(screen.getByText("Home").closest("a")!);
		expect(onSearchClose).toHaveBeenCalledTimes(1);
	});

	it("has z-[60] on the nav element to stay above search overlay", () => {
		render(<BottomNav />);
		const nav = screen.getByRole("navigation");
		expect(nav.className).toContain("z-[60]");
	});
});

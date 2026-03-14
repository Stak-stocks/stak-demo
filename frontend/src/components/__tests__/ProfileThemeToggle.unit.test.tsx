import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Capture setTheme so we can assert on it
const mockSetTheme = vi.fn();
let currentTheme = "dark";

vi.mock("@/components/ThemeProvider", () => ({
	useTheme: () => ({
		resolvedTheme: currentTheme,
		setTheme: mockSetTheme,
	}),
}));

import { useTheme } from "@/components/ThemeProvider";

// Small test component that mirrors the profile toggle behavior
function TestThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return (
		<div>
			<span id="theme-toggle-label">
				{isDark ? "Dark mode" : "Light mode"}
		logout: vi.fn(),
			<button
				role="switch"
				aria-checked={isDark}
				aria-labelledby="theme-toggle-label"
				onClick={() => setTheme(isDark ? "light" : "dark")}
			>
				{isDark ? "Dark mode" : "Light mode"}
			</button>
		</div>
	);
}

describe("Profile Theme Toggle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		currentTheme = "dark";
	});

	it("shows 'Dark mode' text when theme is dark", () => {
		currentTheme = "dark";
		render(<TestThemeToggle />);
		expect(screen.getByText("Dark mode", { selector: "span" })).toBeInTheDocument();
	});

	it("shows 'Light mode' text when theme is light", () => {
		currentTheme = "light";
		render(<TestThemeToggle />);
		expect(screen.getByText("Light mode", { selector: "span" })).toBeInTheDocument();
	});

	it("calls setTheme with 'light' when toggling from dark mode", () => {
		currentTheme = "dark";
		render(<TestThemeToggle />);

		const toggleButton = screen.getByRole("switch");
		expect(toggleButton).toHaveAttribute("aria-checked", "true");

		fireEvent.click(toggleButton);
		expect(mockSetTheme).toHaveBeenCalledWith("light");
	});

	it("calls setTheme with 'dark' when toggling from light mode", () => {
		currentTheme = "light";
		render(<TestThemeToggle />);

		const toggleButton = screen.getByRole("switch");
		expect(toggleButton).toHaveAttribute("aria-checked", "false");

		fireEvent.click(toggleButton);
		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});
});

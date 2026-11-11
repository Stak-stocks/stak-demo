/**
 * Landing page redirect. A signed-in person who opens the landing page is forwarded: to onboarding until they finish
 * it, to the app afterwards. The one exception is Onboarding's own Back (routes/onboarding.tsx), which marks its
 * landing-page history entry so the person can stay instead of being sent straight back to the step they just left
 * (user ruling 2026-10-18, option A).
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const auth: { user: null | { uid: string }; loading: boolean; onboardingCompleted: boolean } = { user: null, loading: false, onboardingCompleted: false };
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => opts,
	useNavigate: () => mockNavigate,
}));
vi.mock("@/context/AuthContext", () => ({
	useAuth: () => auth,
}));

import type { ComponentType } from "react";
import { Route } from "../welcome";

/* createFileRoute is mocked to return its options, so the route object is `{ component }`. */
const LandingPage = (Route as unknown as { component: ComponentType }).component;

/* The page sizes itself from the scroll container's clientWidth (jsdom defaults to 0). */
Object.defineProperty(HTMLElement.prototype, "clientWidth", {
	configurable: true,
	get() {
		return 1440;
	},
});
HTMLElement.prototype.scrollTo = vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo;

beforeEach(() => {
	mockNavigate.mockClear();
	(window as { innerWidth: number }).innerWidth = 1440;
	window.history.replaceState(null, "");
});
afterEach(cleanup);

describe("LandingPage redirect", () => {
	it("forwards a signed-in person who has not finished onboarding to onboarding", () => {
		auth.user = { uid: "u1" };
		auth.onboardingCompleted = false;
		render(<LandingPage />);
		expect(mockNavigate).toHaveBeenCalledWith({ to: "/onboarding" });
	});

	it("forwards an onboarded person to the app", () => {
		auth.user = { uid: "u1" };
		auth.onboardingCompleted = true;
		render(<LandingPage />);
		expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
	});

	it("lets a signed-in first-run person stay when Onboarding's Back brought them here", () => {
		auth.user = { uid: "u1" };
		auth.onboardingCompleted = false;
		window.history.replaceState({ fromOnboarding: true }, "");
		render(<LandingPage />);
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("does not forward while the session is still loading, nor a signed-out visitor", () => {
		auth.user = { uid: "u1" };
		auth.loading = true;
		render(<LandingPage />);
		expect(mockNavigate).not.toHaveBeenCalled();
		cleanup();
		auth.loading = false;
		auth.user = null;
		render(<LandingPage />);
		expect(mockNavigate).not.toHaveBeenCalled();
	});
});

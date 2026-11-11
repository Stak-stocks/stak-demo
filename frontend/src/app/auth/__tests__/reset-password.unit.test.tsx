import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode, type ComponentType, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	search: {} as { mode?: string; oobCode?: string },
	verifyResetCode: vi.fn(), confirmReset: vi.fn(), applyActionCode: vi.fn(), navigate: vi.fn(), success: vi.fn(),
	getProfile: vi.fn(),
	auth: { currentUser: null as null | Record<string, unknown> },
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: object) => ({ ...options, useSearch: () => mocks.search }),
	useNavigate: () => mocks.navigate,
	Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ verifyResetCode: mocks.verifyResetCode, confirmReset: mocks.confirmReset }) }));
vi.mock("firebase/auth", () => ({ applyActionCode: mocks.applyActionCode }));
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("@/lib/api", () => ({ getProfile: mocks.getProfile }));
vi.mock("@/app/auth/usePostAuthRedirect", () => ({ PROFILE_WAIT_MS: 8_000 }));
vi.mock("sonner", () => ({ toast: { success: mocks.success } }));
vi.mock("@/app/auth/ui", () => ({
	AuthLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
	AuthHeading: ({ title }: { title: string }) => <h1>{title}</h1>,
	AuthInput: () => <input />,
	FieldError: () => null, FootRow: () => null, ShowToggle: () => null,
	passwordProblem: () => null, authErrorMessage: () => "Failed",
}));
vi.mock("@/app/ui/Button", () => ({ PrimaryButton: ({ children }: { children: ReactNode }) => <button>{children}</button> }));

import { Route } from "../../../routes/reset-password";
const Page = (Route as unknown as { component: ComponentType }).component;
const deferred = () => {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
};
beforeEach(() => { vi.clearAllMocks(); mocks.search = {}; mocks.auth.currentUser = null; });
afterEach(cleanup);

/** a signed-in Firebase user whose refreshed token carries the given onboarding claim */
const sessionUser = (onboardingCompleted: boolean, over: Record<string, unknown> = {}) => ({
	reload: vi.fn().mockResolvedValue(undefined),
	getIdToken: vi.fn().mockResolvedValue("token"),
	getIdTokenResult: vi.fn().mockResolvedValue({ claims: { onboardingCompleted } }),
	...over,
});
const settle = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });

describe("an email verification link opened where the person is signed in (N64: never the 'Welcome back' Sign in page for a new account)", () => {
	it("sends a new account straight to Onboarding, asking the API for the account on the way", async () => {
		mocks.search = { mode: "verifyEmail", oobCode: "code" };
		mocks.applyActionCode.mockResolvedValue(undefined);
		mocks.getProfile.mockResolvedValue({ uid: "u1" });
		const user = sessionUser(false);
		mocks.auth.currentUser = user;
		render(<Page />);
		await settle();
		expect(mocks.success).toHaveBeenCalledWith("Email verified! Welcome to STAK!");
		expect(user.reload).toHaveBeenCalledTimes(1);
		expect(mocks.getProfile).toHaveBeenCalledTimes(1);
		expect(mocks.navigate).toHaveBeenCalledTimes(1);
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/onboarding", replace: true });
	});

	it("sends an account that finished onboarding to Home", async () => {
		mocks.search = { mode: "verifyEmail", oobCode: "code" };
		mocks.applyActionCode.mockResolvedValue(undefined);
		mocks.getProfile.mockResolvedValue({ uid: "u1" });
		mocks.auth.currentUser = sessionUser(true);
		render(<Page />);
		await settle();
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/home", replace: true });
		expect(mocks.navigate).not.toHaveBeenCalledWith({ to: "/login" });
	});

	it("never lets the API stop the person: a failed GET /api/me still goes on by the claim", async () => {
		mocks.search = { mode: "verifyEmail", oobCode: "code" };
		mocks.applyActionCode.mockResolvedValue(undefined);
		mocks.getProfile.mockRejectedValue(new TypeError("Failed to fetch"));
		mocks.auth.currentUser = sessionUser(false);
		render(<Page />);
		await settle();
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/onboarding", replace: true });
	});

	it("falls back to the Sign in page when Firebase cannot refresh the session", async () => {
		mocks.search = { mode: "verifyEmail", oobCode: "code" };
		mocks.applyActionCode.mockResolvedValue(undefined);
		mocks.auth.currentUser = sessionUser(false, { reload: vi.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "auth/network-request-failed" })) });
		render(<Page />);
		await settle();
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" });
	});

	it("still goes to the Sign in page when nobody is signed in on this browser (the link opened elsewhere)", async () => {
		mocks.search = { mode: "verifyEmail", oobCode: "code" };
		mocks.applyActionCode.mockResolvedValue(undefined);
		render(<Page />);
		await settle();
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" });
	});

	it("does nothing once the page is left while it is still asking the API", async () => {
		const pending = deferred();
		mocks.search = { mode: "verifyEmail", oobCode: "code" };
		mocks.applyActionCode.mockResolvedValue(undefined);
		mocks.getProfile.mockReturnValue(pending.promise);
		mocks.auth.currentUser = sessionUser(false);
		const view = render(<Page />);
		await settle();
		expect(mocks.getProfile).toHaveBeenCalledTimes(1);
		const signal = (mocks.getProfile.mock.calls[0]?.[0] as { signal: AbortSignal }).signal;
		view.unmount();
		expect(signal.aborted).toBe(true);
		await act(async () => pending.resolve());
		await settle();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});

describe("recovery link completion", () => {
	it("applies an email verification code once in StrictMode and ignores completion after leaving", async () => {
		const pending = deferred();
		mocks.search = { mode: "verifyEmail", oobCode: "code-one" };
		mocks.applyActionCode.mockReturnValue(pending.promise);
		const view = render(<StrictMode><Page /></StrictMode>);
		expect(mocks.applyActionCode).toHaveBeenCalledTimes(1);
		view.unmount();
		await act(async () => pending.resolve());
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(mocks.success).not.toHaveBeenCalled();
	});

	it("does not let an old reset-link failure replace the current valid form", async () => {
		const old = deferred();
		const current = deferred();
		mocks.search = { oobCode: "old" };
		mocks.verifyResetCode.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
		const view = render(<Page />);
		mocks.search = { oobCode: "current" };
		view.rerender(<Page />);
		await act(async () => current.resolve());
		expect(screen.getByRole("heading", { name: "Set a new password" })).toBeTruthy();
		await act(async () => old.reject(new Error("expired")));
		expect(screen.queryByRole("heading", { name: "Invalid link" })).toBeNull();
		expect(screen.getByRole("heading", { name: "Set a new password" })).toBeTruthy();
	});
});

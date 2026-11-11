import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	search: {} as { email?: string; from?: "profile"; purpose?: "verify" },
	auth: { user: null as User | null, loading: false },
	navigate: vi.fn(),
	getProfile: vi.fn(),
	resetPassword: vi.fn(),
	sendVerificationEmail: vi.fn(),
	logout: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: object) => ({ ...options, useSearch: () => mocks.search }),
	useNavigate: () => mocks.navigate,
}));
vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ ...mocks.auth, resetPassword: mocks.resetPassword, sendVerificationEmail: mocks.sendVerificationEmail, logout: mocks.logout }),
}));
vi.mock("@/lib/api", () => ({
	getProfile: mocks.getProfile,
	ApiError: class ApiError extends Error {
		constructor(public status: number, statusText: string, public code?: string) {
			super(`API error: ${status} ${statusText}`);
		}
	},
}));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock("@/app/auth/ui", () => ({
	AuthLayout: ({ children, backTo, backSearch }: { children: ReactNode; backTo: string; backSearch?: object }) => (
		<main data-testid="auth-layout" data-back-to={backTo} data-back-search={JSON.stringify(backSearch)}>{children}</main>
	),
	AuthHeading: ({ title, subtitle }: { title: string; subtitle: string }) => <><h1>{title}</h1><p>{subtitle}</p></>,
	FieldError: ({ children }: { children: ReactNode }) => children ? <p role="alert">{children}</p> : null,
	FootRow: ({ linkLabel, onClick }: { linkLabel: string; onClick: () => void }) => <button type="button" onClick={onClick}>{linkLabel}</button>,
}));
vi.mock("@/app/ui/Button", () => ({
	PrimaryButton: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />,
}));

import { ApiError } from "@/lib/api";
import { PUSH_BACK, PUSH_FORWARD } from "../motion";
import { PROFILE_WAIT_MS } from "../usePostAuthRedirect";
import { Route } from "../../../routes/check-email";

const route = Route as unknown as {
	component: ComponentType;
	validateSearch: (search: Record<string, unknown>) => typeof mocks.search;
};
const CheckEmailPage = route.component;
let user: {
	email: string;
	emailVerified: boolean;
	reload: ReturnType<typeof vi.fn>;
	getIdToken: ReturnType<typeof vi.fn>;
	getIdTokenResult: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.search = { purpose: "verify", email: "query@example.com" };
	mocks.auth.loading = false;
	user = {
		email: "signed-in@example.com",
		emailVerified: false,
		reload: vi.fn().mockResolvedValue(undefined),
		getIdToken: vi.fn().mockResolvedValue("refreshed-token"),
		getIdTokenResult: vi.fn().mockResolvedValue({ claims: { onboardingCompleted: false } }),
	};
	mocks.auth.user = user as unknown as User;
	mocks.getProfile.mockResolvedValue({});
	mocks.resetPassword.mockResolvedValue(undefined);
	mocks.sendVerificationEmail.mockResolvedValue(undefined);
	mocks.navigate.mockResolvedValue(undefined);
	mocks.logout.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("email verification continuation", () => {
	it("cancels a profile continuation when the page is left", async () => {
		user.emailVerified = true;
		let resolve!: (value: object) => void;
		mocks.getProfile.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
		const { unmount } = render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledOnce());
		const signal = mocks.getProfile.mock.calls[0][0].signal as AbortSignal;
		unmount();
		expect(signal.aborted).toBe(true);
		await act(async () => resolve({}));
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("cancels the old continuation before changing accounts", async () => {
		user.emailVerified = true;
		let resolve!: (value: object) => void;
		mocks.getProfile.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledOnce());
		fireEvent.click(screen.getByRole("button", { name: "Use a different account" }));
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/signup", replace: true, viewTransition: PUSH_BACK }));
		expect(mocks.logout).toHaveBeenCalledOnce();
		await act(async () => resolve({}));
		expect(mocks.navigate).toHaveBeenCalledTimes(1);
	});

	it("bounds a stalled profile request, then continues on the refreshed claim", async () => {
		vi.useFakeTimers();
		user.emailVerified = true;
		mocks.getProfile.mockImplementation(({ signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
			signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
		}));
		render(<CheckEmailPage />);
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" })); });
		expect(mocks.getProfile).toHaveBeenCalledOnce();
		await act(async () => { await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS - 1); });
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
		await act(async () => { await vi.advanceTimersByTimeAsync(1); });
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/onboarding", replace: true, viewTransition: PUSH_FORWARD });
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(mocks.logout).not.toHaveBeenCalled();
	});

	it("uses the signed-in email and returns Back to signup", () => {
		render(<CheckEmailPage />);
		expect(screen.getByText(/We sent a verification link to signed-in@example.com/)).toBeInTheDocument();
		expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-back-to", "/signup");
	});

	it("reloads verification and keeps unverified users on the page with a clear error", async () => {
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(/not verified yet.*verification link.*try again/i);
		expect(user.reload).toHaveBeenCalledOnce();
		expect(user.getIdToken).not.toHaveBeenCalled();
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "I’ve verified my email" })).toBeEnabled();
	});

	it.each([
		[false, "/onboarding"],
		[true, "/home"],
	])("continues after verification with onboardingCompleted=%s to %s", async (completed, to) => {
		// reload changes the same Firebase User object after verification in another tab.
		user.reload.mockImplementation(async () => { user.emailVerified = true; });
		user.getIdTokenResult.mockResolvedValue({ claims: { onboardingCompleted: completed } });
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to, replace: true, viewTransition: PUSH_FORWARD }));
		expect(user.getIdToken.mock.calls).toEqual([[true], [true]]);
		expect(mocks.getProfile).toHaveBeenCalledOnce();
		expect(user.reload.mock.invocationCallOrder[0]).toBeLessThan(user.getIdToken.mock.invocationCallOrder[0]);
		expect(user.getIdToken.mock.invocationCallOrder[0]).toBeLessThan(mocks.getProfile.mock.invocationCallOrder[0]);
		expect(mocks.getProfile.mock.invocationCallOrder[0]).toBeLessThan(user.getIdToken.mock.invocationCallOrder[1]);
		expect(user.getIdToken.mock.invocationCallOrder[1]).toBeLessThan(user.getIdTokenResult.mock.invocationCallOrder[0]);
	});

	// N59: the original verification page made no API call; the API is best-effort and the Firebase claim decides
	it.each([
		["unreachable (network TypeError)", new TypeError("Failed to fetch"), false, "/onboarding"],
		["failing (500)", new ApiError(500, "Internal Server Error"), false, "/onboarding"],
		["refusing the token (401)", new ApiError(401, "Unauthorized"), false, "/onboarding"],
		["unreachable, for an onboarded account", new TypeError("Failed to fetch"), true, "/home"],
	] as const)("continues when the API is %s", async (_label, error, completed, to) => {
		user.emailVerified = true;
		user.getIdTokenResult.mockResolvedValue({ claims: { onboardingCompleted: completed } });
		mocks.getProfile.mockRejectedValue(error);
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to, replace: true, viewTransition: PUSH_FORWARD }));
		expect(mocks.navigate).toHaveBeenCalledOnce();
		expect(mocks.getProfile).toHaveBeenCalledOnce();
		expect(user.getIdToken.mock.calls).toEqual([[true], [true]]);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(mocks.logout).not.toHaveBeenCalled();
	});

	// user, 2026-11-11: "welcome back should be only for returning users then straight to the home page"
	it.each([
		["API up", undefined, false, "/onboarding", []],
		["API up", undefined, true, "/home", [["Welcome back!"]]],
		["API down", new TypeError("Failed to fetch"), false, "/onboarding", []],
		["API down", new TypeError("Failed to fetch"), true, "/home", [["Welcome back!"]]],
	] as const)("welcomes back only an account that finished onboarding, as it goes Home (%s, onboardingCompleted %s)", async (_api, apiError, completed, to, toasts) => {
		user.emailVerified = true;
		user.getIdTokenResult.mockResolvedValue({ claims: { onboardingCompleted: completed } });
		if (apiError) mocks.getProfile.mockRejectedValue(apiError);
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to, replace: true, viewTransition: PUSH_FORWARD }));
		expect(mocks.toastSuccess.mock.calls).toEqual(toasts);
		if (toasts.length) expect(mocks.toastSuccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.navigate.mock.invocationCallOrder[0]);
		expect(mocks.toastError).not.toHaveBeenCalled();
	});

	it("welcomes back once even when going Home has to be tried again", async () => {
		user.emailVerified = true;
		user.getIdTokenResult.mockResolvedValue({ claims: { onboardingCompleted: true } });
		mocks.navigate.mockRejectedValueOnce(new Error("Navigation failed"));
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't continue.*try again/i);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(2));
		expect(mocks.navigate).toHaveBeenLastCalledWith({ to: "/home", replace: true, viewTransition: PUSH_FORWARD });
		expect(mocks.toastSuccess.mock.calls).toEqual([["Welcome back!"]]);
	});

	it("does not welcome an account whose email is still unverified", async () => {
		user.getIdTokenResult.mockResolvedValue({ claims: { onboardingCompleted: true } });
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(/not verified yet/i);
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});

	it("shows a retryable error when reloading verification fails", async () => {
		user.reload.mockRejectedValueOnce(new Error("No network"));
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(/try again/i);
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.navigate).not.toHaveBeenCalled();
		// the retry goes through once Firebase answers (the email was verified in the meantime)
		user.reload.mockImplementation(async () => { user.emailVerified = true; });
		fireEvent.click(screen.getByRole("button", { name: "I’ve verified my email" }));
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/onboarding", replace: true, viewTransition: PUSH_FORWARD }));
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("resends verification without sending a password reset", async () => {
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
		await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Verification email sent again!"));
		expect(mocks.sendVerificationEmail).toHaveBeenCalledOnce();
		expect(mocks.resetPassword).not.toHaveBeenCalled();
	});

	it("makes verification resend failures visible and retryable", async () => {
		mocks.sendVerificationEmail.mockRejectedValueOnce(new Error("No network"));
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't resend.*try again/i);
		expect(screen.getByRole("button", { name: "Resend link" })).toBeEnabled();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("offers sign in after a missing session without automatically redirecting", async () => {
		mocks.auth.user = null;
		render(<CheckEmailPage />);
		expect(screen.getByText(/verification link to query@example.com/)).toBeInTheDocument();
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: "Resend link" })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login", replace: true, viewTransition: PUSH_FORWARD });
	});

	it("waits for the session to finish loading before allowing continuation", () => {
		mocks.auth.loading = true;
		mocks.auth.user = null;
		render(<CheckEmailPage />);
		expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(mocks.sendVerificationEmail).not.toHaveBeenCalled();
	});
});

describe("existing password reset check-email flow", () => {
	it("keeps reset copy, mail action, and resend for the requested email", async () => {
		mocks.search = { email: "reset@example.com" };
		render(<CheckEmailPage />);
		expect(screen.getByText("We sent a reset link to reset@example.com. It expires in 15 minutes.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Open mail app" })).toBeEnabled();
		expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-back-to", "/forgot-password");
		expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-back-search", JSON.stringify({ email: "reset@example.com" }));
		fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
		await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Reset email sent again!"));
		expect(mocks.resetPassword).toHaveBeenCalledWith("reset@example.com");
		expect(mocks.sendVerificationEmail).not.toHaveBeenCalled();
	});

	it("keeps the edit-profile return route and reset failure message", async () => {
		mocks.search = { email: "reset@example.com", from: "profile" };
		mocks.resetPassword.mockRejectedValueOnce(new Error("No network"));
		render(<CheckEmailPage />);
		expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-back-to", "/profile/edit");
		expect(screen.getByTestId("auth-layout")).not.toHaveAttribute("data-back-search");
		fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
		await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Failed to resend. Try again."));
	});

	it("asks for an email instead of sending a reset to the demo address", () => {
		mocks.search = {};
		render(<CheckEmailPage />);
		fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/forgot-password", viewTransition: false });
		expect(mocks.resetPassword).not.toHaveBeenCalled();
	});

	it("only accepts the verification purpose while defaulting to the reset flow", () => {
		expect(route.validateSearch({ purpose: "verify", email: "person@example.com" })).toEqual({ purpose: "verify", email: "person@example.com", from: undefined });
		expect(route.validateSearch({ purpose: "unknown", email: 123, from: "unknown" })).toEqual({ purpose: undefined, email: undefined, from: undefined });
	});
});

/**
 * User, 2026-11-11: "why is it when i sign in or create an account for the first time after putting in my details it says
 * welcome back. welcome back should be only for returning users then straight to the home page. then new users follow
 * through the onboarding process".
 * The Sign in and Sign up pages with the real post-auth routing (usePostAuthRedirect). Firebase, the API, the router and
 * sonner are mocked; nothing signs in anywhere. A sign-in mock does what Firebase does: onAuthStateChanged reports the
 * account (the pages re-render with it) and the provider's promise resolves.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ButtonHTMLAttributes, type ComponentType, type InputHTMLAttributes, type ReactNode, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockUser {
	uid: string;
	email: string;
	emailVerified: boolean;
	providerData: { providerId: string }[];
	reload: ReturnType<typeof vi.fn>;
	getIdToken: ReturnType<typeof vi.fn>;
	getIdTokenResult: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => {
	const listeners = new Set<() => void>();
	const auth = { user: null as unknown, loading: false, version: 0 };
	return {
		auth,
		listeners,
		/** What AuthContext's onAuthStateChanged does: the pages re-render with the signed-in account. */
		setUser(user: unknown) {
			auth.user = user;
			auth.version++;
			for (const listener of listeners) listener();
		},
		navigate: vi.fn(),
		getProfile: vi.fn(),
		toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
		signInWithEmail: vi.fn(),
		signInWithGoogle: vi.fn(),
		signInWithApple: vi.fn(),
		signUpWithEmail: vi.fn(),
		sendVerificationEmail: vi.fn(),
		logout: vi.fn(),
	};
});

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: object) => ({ ...options }),
	useNavigate: () => mocks.navigate,
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
	useLocation: () => ({ pathname: "/" }),
	useRouter: () => ({}),
}));
vi.mock("@/context/AuthContext", async () => {
	const { useSyncExternalStore } = await import("react");
	const subscribe = (listener: () => void) => {
		mocks.listeners.add(listener);
		return () => {
			mocks.listeners.delete(listener);
		};
	};
	return {
		useAuth: () => {
			useSyncExternalStore(subscribe, () => mocks.auth.version);
			return {
				user: mocks.auth.user,
				loading: mocks.auth.loading,
				logout: mocks.logout,
				signInWithEmail: mocks.signInWithEmail,
				signInWithGoogle: mocks.signInWithGoogle,
				signInWithApple: mocks.signInWithApple,
				signUpWithEmail: mocks.signUpWithEmail,
				sendVerificationEmail: mocks.sendVerificationEmail,
			};
		},
	};
});
vi.mock("@/lib/api", () => ({
	getProfile: mocks.getProfile,
	ApiError: class ApiError extends Error {
		constructor(public status: number, statusText: string, public code?: string) {
			super(`API error: ${status} ${statusText}`);
		}
	},
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/app/auth/ui", async (importOriginal) => {
	// the frames' layout stays out of these tests; the forms' validation and error copy (authErrorMessage) are the real ones
	const actual = await importOriginal<typeof import("@/app/auth/ui")>();
	return {
		...actual,
		AuthLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
		AuthHeading: ({ title, subtitle }: { title: string; subtitle: string }) => (
			<>
				<h1>{title}</h1>
				<p>{subtitle}</p>
			</>
		),
		AuthInput: ({ invalid, right, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; right?: ReactNode }) => (
			<>
				<input aria-invalid={invalid} {...props} />
				{right}
			</>
		),
		SocialButton: ({
			icon: _icon,
			labelWidth: _labelWidth,
			children,
			...props
		}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; labelWidth?: number }) => (
			<button type="button" {...props}>
				{children}
			</button>
		),
		OrDivider: () => null,
		ShowToggle: () => null,
		TextLink: ({ children }: { children: ReactNode }) => <a href="/forgot-password">{children}</a>,
		FootRow: ({ linkLabel }: { linkLabel: string }) => <a href="/">{linkLabel}</a>,
	};
});

import { PUSH_FORWARD } from "../motion";
import { Route as LoginRoute } from "../../../routes/login";
import { Route as SignUpRoute } from "../../../routes/signup";

const LoginPage = (LoginRoute as unknown as { component: ComponentType }).component;
const SignUpPage = (SignUpRoute as unknown as { component: ComponentType }).component;

const HOME = { to: "/home", replace: true, viewTransition: PUSH_FORWARD };
const ONBOARDING = { to: "/onboarding", replace: true, viewTransition: PUSH_FORWARD };
const firebaseError = (code: string) => Object.assign(new Error(code), { code });
const apiDown = () => mocks.getProfile.mockRejectedValue(new TypeError("Failed to fetch"));
const welcomes = () => mocks.toast.success.mock.calls;

function account({
	onboarded,
	provider = "password",
	uid = "uid-returning",
	email = "person@example.com",
	emailVerified = true,
}: { onboarded: boolean; provider?: string; uid?: string; email?: string; emailVerified?: boolean }): MockUser {
	return {
		uid,
		email,
		emailVerified,
		providerData: [{ providerId: provider }],
		reload: vi.fn().mockResolvedValue(undefined),
		getIdToken: vi.fn().mockResolvedValue("token"),
		// the refreshed onboarding claim, the one thing that decides where the account goes
		getIdTokenResult: vi.fn().mockResolvedValue({ claims: { onboardingCompleted: onboarded } }),
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

/** The provider signs the account in: onAuthStateChanged reports it, then the provider's own promise resolves. */
const signsIn = (user: MockUser, result?: unknown) => async () => {
	mocks.setUser(user);
	return result;
};

function submitEmailSignIn() {
	fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "person@example.com" } });
	fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret-123" } });
	fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

/** Nothing welcomed, nothing toasted as an error, nowhere to go. */
function expectNoWelcomeAndStay() {
	expect(mocks.toast.success).not.toHaveBeenCalled();
	expect(mocks.toast.error).not.toHaveBeenCalled();
	expect(mocks.toast.info).not.toHaveBeenCalled();
	expect(mocks.navigate).not.toHaveBeenCalled();
}

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	mocks.auth.user = null;
	mocks.auth.loading = false;
	mocks.navigate.mockResolvedValue(undefined);
	mocks.getProfile.mockReset().mockResolvedValue({});
	mocks.logout.mockResolvedValue(undefined);
	mocks.sendVerificationEmail.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("Sign in with email", () => {
	it("sends a new account's first sign-in (after verifying its email) to Onboarding with no 'Welcome back!'", async () => {
		mocks.signInWithEmail.mockImplementation(signsIn(account({ onboarded: false, uid: "uid-new" })));
		render(<LoginPage />);
		submitEmailSignIn();

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(ONBOARDING));
		expect(mocks.signInWithEmail).toHaveBeenCalledWith("person@example.com", "secret-123");
		expect(mocks.navigate).toHaveBeenCalledOnce();
		expect(mocks.toast.success).not.toHaveBeenCalled();
		expect(mocks.toast.error).not.toHaveBeenCalled();
	});

	it("welcomes a returning account back once, then goes Home", async () => {
		mocks.signInWithEmail.mockImplementation(signsIn(account({ onboarded: true })));
		render(
			<StrictMode>
				<LoginPage />
			</StrictMode>,
		);
		submitEmailSignIn();

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
		expect(mocks.navigate).toHaveBeenCalledOnce();
		expect(welcomes()).toEqual([["Welcome back!"]]);
		expect(mocks.toast.success.mock.invocationCallOrder[0]).toBeLessThan(mocks.navigate.mock.invocationCallOrder[0]);
		// the routing's own profile request is the only one
		expect(mocks.getProfile).toHaveBeenCalledOnce();
		expect(mocks.getProfile).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
	});

	it.each([
		[true, HOME, [["Welcome back!"]]],
		[false, ONBOARDING, []],
	] as const)("with the API down, the claim alone decides (onboardingCompleted %s)", async (onboarded, destination, toasts) => {
		apiDown();
		mocks.signInWithEmail.mockImplementation(signsIn(account({ onboarded })));
		render(<LoginPage />);
		submitEmailSignIn();

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(destination));
		expect(mocks.navigate).toHaveBeenCalledOnce();
		expect(welcomes()).toEqual(toasts);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("sends an account that has not verified its email to Check your email without a welcome", async () => {
		mocks.signInWithEmail.mockImplementation(signsIn(account({ onboarded: false, emailVerified: false })));
		render(<LoginPage />);
		submitEmailSignIn();

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/check-email",
			search: { purpose: "verify", email: "person@example.com" },
			replace: true,
			viewTransition: PUSH_FORWARD,
		}));
		expect(mocks.toast.success).not.toHaveBeenCalled();
	});

	it.each([
		["wrong email or password", firebaseError("auth/invalid-credential"), "Wrong email or password"],
		["no connection", firebaseError("auth/network-request-failed"), "No connection. Check your network and try again"],
		["anything else", new Error("Something broke"), "Sign in failed. Please try again."],
	])("keeps its error copy and shows no welcome when the sign-in fails (%s)", async (_label, failure, message) => {
		mocks.signInWithEmail.mockRejectedValue(failure);
		render(<LoginPage />);
		submitEmailSignIn();

		expect(await screen.findByRole("alert")).toHaveTextContent(message);
		await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
		expectNoWelcomeAndStay();
	});

	it("keeps Figma's 'Welcome back' heading on the Sign in page, which toasts nothing on its own", () => {
		render(<LoginPage />);
		expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
		expect(screen.getByText("Your deck kept learning while you were away.")).toBeInTheDocument();
		expectNoWelcomeAndStay();
	});
});

describe("Sign up with email", () => {
	it("still sends the new account to Check your email with no welcome (its verification link page greets it)", async () => {
		mocks.signUpWithEmail.mockImplementation(async () => {
			mocks.setUser(account({ onboarded: false, uid: "uid-new", email: "new@example.com", emailVerified: false }));
		});
		render(<SignUpPage />);
		fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "new@example.com" } });
		fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret-123" } });
		fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "secret-123" } });
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/check-email",
			search: { purpose: "verify", email: "new@example.com" },
			replace: true,
			viewTransition: PUSH_FORWARD,
		}));
		expect(mocks.signUpWithEmail).toHaveBeenCalledWith("new@example.com", "secret-123");
		expect(mocks.sendVerificationEmail).toHaveBeenCalledOnce();
		expect(mocks.toast.success).not.toHaveBeenCalled();
	});
});

describe.each([
	["Sign in", LoginPage],
	["Sign up", SignUpPage],
] as const)("%s with Google / Apple", (_page, Page) => {
	describe.each([
		["Google", "google.com"],
		["Apple", "apple.com"],
	] as const)("%s", (provider, providerId) => {
		const label = `Continue with ${provider}`;
		const providerSignIn = () => (provider === "Apple" ? mocks.signInWithApple : mocks.signInWithGoogle);
		const otherSignIn = () => (provider === "Apple" ? mocks.signInWithGoogle : mocks.signInWithApple);

		async function signInWith(user: MockUser, isNew: boolean) {
			providerSignIn().mockImplementation(signsIn(user, { isNew, uid: user.uid }));
			render(<Page />);
			fireEvent.click(screen.getByRole("button", { name: label }));
			await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
			expect(mocks.navigate).toHaveBeenCalledOnce();
			expect(otherSignIn()).not.toHaveBeenCalled();
		}

		it("greets a brand-new account 'Welcome to STAK!' once and sends it to Onboarding", async () => {
			await signInWith(account({ onboarded: false, provider: providerId, uid: "uid-new" }), true);
			expect(mocks.navigate).toHaveBeenCalledWith(ONBOARDING);
			expect(welcomes()).toEqual([["Welcome to STAK!"]]);
		});

		it("sends a returning account that never finished onboarding to Onboarding without 'Welcome back!'", async () => {
			await signInWith(account({ onboarded: false, provider: providerId }), false);
			expect(mocks.navigate).toHaveBeenCalledWith(ONBOARDING);
			expect(mocks.toast.success).not.toHaveBeenCalled();
		});

		it("welcomes a returning account that finished onboarding back once, then goes Home", async () => {
			await signInWith(account({ onboarded: true, provider: providerId }), false);
			expect(mocks.navigate).toHaveBeenCalledWith(HOME);
			expect(welcomes()).toEqual([["Welcome back!"]]);
			expect(mocks.toast.success.mock.invocationCallOrder[0]).toBeLessThan(mocks.navigate.mock.invocationCallOrder[0]);
		});

		describe("an existing account linking it (Firebase says isNew; the uid is the last session's)", () => {
			const linking = (onboarded: boolean) => {
				localStorage.setItem("last-user-uid", "uid-returning");
				return account({ onboarded, provider: providerId, uid: "uid-returning" });
			};

			it("is welcomed back once, never as new, when it finished onboarding; the routing's profile request is the only one", async () => {
				await signInWith(linking(true), true);
				expect(mocks.navigate).toHaveBeenCalledWith(HOME);
				expect(welcomes()).toEqual([["Welcome back!"]]);
				expect(mocks.getProfile).toHaveBeenCalledOnce();
				expect(mocks.getProfile).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
			});

			it("is greeted as new and sent to Onboarding when it never finished onboarding", async () => {
				await signInWith(linking(false), true);
				expect(mocks.navigate).toHaveBeenCalledWith(ONBOARDING);
				expect(welcomes()).toEqual([["Welcome to STAK!"]]);
			});

			it.each([
				[true, HOME, "Welcome back!"],
				[false, ONBOARDING, "Welcome to STAK!"],
			] as const)("with the API down, the claim alone decides (onboardingCompleted %s)", async (onboarded, destination, welcome) => {
				apiDown();
				await signInWith(linking(onboarded), true);
				expect(mocks.navigate).toHaveBeenCalledWith(destination);
				expect(welcomes()).toEqual([[welcome]]);
				expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			});
		});

		it.each([
			[true, HOME, [["Welcome back!"]]],
			[false, ONBOARDING, []],
		] as const)("with the API down, a returning account goes where the claim says (onboardingCompleted %s)", async (onboarded, destination, toasts) => {
			apiDown();
			await signInWith(account({ onboarded, provider: providerId }), false);
			expect(mocks.navigate).toHaveBeenCalledWith(destination);
			expect(welcomes()).toEqual(toasts);
		});

		it("gives one welcome when Firebase reports the account before the provider's promise resolves", async () => {
			const user = account({ onboarded: true, provider: providerId });
			const popup = deferred<{ isNew: boolean; uid: string }>();
			providerSignIn().mockImplementation(() => {
				mocks.setUser(user);
				return popup.promise;
			});
			render(<Page />);
			fireEvent.click(screen.getByRole("button", { name: label }));
			await waitFor(() => expect(user.getIdTokenResult).toHaveBeenCalledOnce());
			await act(async () => {});
			expect(mocks.navigate).not.toHaveBeenCalled();
			expect(mocks.toast.success).not.toHaveBeenCalled();

			await act(async () => popup.resolve({ isNew: false, uid: user.uid }));
			await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
			expect(mocks.navigate).toHaveBeenCalledOnce();
			expect(welcomes()).toEqual([["Welcome back!"]]);
		});

		it.each(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])("shows no welcome and no error when the popup is closed (%s)", async (code) => {
			providerSignIn().mockRejectedValue(firebaseError(code));
			render(<Page />);
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: label }));
			});

			expect(screen.getByRole("button", { name: label })).toBeEnabled();
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			expectNoWelcomeAndStay();
		});

		it("keeps its error copy and shows no welcome when the sign-in fails", async () => {
			providerSignIn().mockRejectedValue(firebaseError("auth/internal-error"));
			render(<Page />);
			fireEvent.click(screen.getByRole("button", { name: label }));

			expect(await screen.findByRole("alert")).toHaveTextContent("Sign in failed. Please try again.");
			expectNoWelcomeAndStay();
		});
	});

	it("keeps Apple's not-configured message and shows no welcome", async () => {
		mocks.signInWithApple.mockRejectedValue(firebaseError("auth/operation-not-allowed"));
		render(<Page />);
		fireEvent.click(screen.getByRole("button", { name: "Continue with Apple" }));

		expect(await screen.findByRole("alert")).toHaveTextContent("Apple sign-in is not configured for this app yet.");
		expectNoWelcomeAndStay();
	});

	it.each([
		[true, HOME],
		[false, ONBOARDING],
	] as const)("routes a session already signed in when the page opens without a toast (onboardingCompleted %s)", async (onboarded, destination) => {
		mocks.auth.user = account({ onboarded, provider: "google.com" });
		render(<Page />);

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(destination));
		expect(mocks.navigate).toHaveBeenCalledOnce();
		expect(mocks.toast.success).not.toHaveBeenCalled();
		expect(mocks.signInWithGoogle).not.toHaveBeenCalled();
		expect(mocks.signInWithEmail).not.toHaveBeenCalled();
	});
});

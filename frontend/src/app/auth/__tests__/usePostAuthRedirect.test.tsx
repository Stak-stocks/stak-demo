import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockUser {
	uid: string;
	email: string | null;
	emailVerified: boolean;
	providerData: { providerId: string }[];
	reload: ReturnType<typeof vi.fn>;
	getIdToken: ReturnType<typeof vi.fn>;
	getIdTokenResult: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => ({
	auth: {
		user: null as MockUser | null,
		loading: false,
		logout: vi.fn(),
	},
	getProfile: vi.fn(),
	navigate: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock("@/lib/api", () => ({
	getProfile: mocks.getProfile,
	ApiError: class ApiError extends Error {
		constructor(public status: number, statusText: string, public code?: string) {
			super(`API error: ${status} ${statusText}`);
		}
	},
}));
vi.mock("../motion", () => ({ PUSH_FORWARD: { types: ["stak-auth-push-forward"] } }));

import { ApiError } from "@/lib/api";
import { PUSH_FORWARD } from "../motion";
import { PROFILE_WAIT_MS, usePostAuthRedirect, welcomeFor } from "../usePostAuthRedirect";

const CONNECTION_ERROR = "You are signed in, but we couldn't load your account. Check your connection and try again.";
const EXPIRED_ERROR = "Your session expired. Please sign in again.";
const firebaseError = (code: string) => Object.assign(new Error(code), { code });

function makeUser(overrides: Partial<MockUser> = {}): MockUser {
	return {
		uid: "test-user",
		email: "test@example.com",
		emailVerified: true,
		providerData: [{ providerId: "password" }],
		reload: vi.fn().mockResolvedValue(undefined),
		getIdToken: vi.fn().mockResolvedValue("test-token"),
		getIdTokenResult: vi.fn().mockResolvedValue({ claims: { onboardingCompleted: false } }),
		...overrides,
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.auth.user = makeUser();
	mocks.auth.loading = false;
	mocks.auth.logout.mockResolvedValue(undefined);
	mocks.navigate.mockResolvedValue(undefined);
	mocks.getProfile.mockReset().mockResolvedValue({ onboardingCompleted: false });
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("usePostAuthRedirect", () => {
	it("bounds a stalled profile request, then continues on the refreshed claim", async () => {
		vi.useFakeTimers();
		mocks.getProfile.mockImplementation(({ signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
			signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
		}));
		const { result } = renderHook(() => usePostAuthRedirect());
		await act(async () => { await Promise.resolve(); });
		expect(mocks.getProfile).toHaveBeenCalledOnce();
		expect(PROFILE_WAIT_MS).toBeLessThanOrEqual(15_000);
		await act(async () => { await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS - 1); });
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(result.current.pending).toBe(true);
		await act(async () => { await vi.advanceTimersByTimeAsync(1); });
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/onboarding", replace: true, viewTransition: PUSH_FORWARD });
		expect(result.current.error).toBeNull();
		expect(result.current.pending).toBe(false);
		expect(mocks.auth.logout).not.toHaveBeenCalled();
	});

	it.each([
		[false, "/onboarding"],
		[true, "/home"],
	] as const)("continues using the refreshed onboarding claim (%s)", async (completed, destination) => {
		const user = makeUser({
			getIdTokenResult: vi.fn().mockResolvedValue({ claims: { onboardingCompleted: completed } }),
		});
		mocks.auth.user = user;
		// The backend can return an older value while repairing the token claim.
		mocks.getProfile.mockResolvedValue({ onboardingCompleted: !completed });
		renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({
			to: destination,
			replace: true,
			viewTransition: PUSH_FORWARD,
		}));
		expect(user.reload).toHaveBeenCalledOnce();
		expect(user.getIdToken).toHaveBeenNthCalledWith(1, true);
		expect(user.getIdToken).toHaveBeenNthCalledWith(2, true);
		expect(mocks.getProfile).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
		expect(mocks.auth.logout).not.toHaveBeenCalled();
	});

	it("waits until the auth session finishes loading", async () => {
		mocks.auth.loading = true;
		const { rerender } = renderHook(() => usePostAuthRedirect());
		expect(mocks.auth.user?.reload).not.toHaveBeenCalled();
		expect(mocks.getProfile).not.toHaveBeenCalled();

		mocks.auth.loading = false;
		rerender();
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce());
	});

	it("does nothing while signed out", () => {
		mocks.auth.user = null;
		const { result } = renderHook(() => usePostAuthRedirect());
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(result.current.error).toBeNull();
		expect(result.current.pending).toBe(false);
	});

	// N59: the API is best-effort, as in the original login (getProfile().catch(() => {})); the Firebase claim decides
	describe.each([
		["unreachable (network TypeError)", new TypeError("Failed to fetch")],
		["failing (500)", new ApiError(500, "Internal Server Error")],
		["unavailable (503)", new ApiError(503, "Service Unavailable")],
		["aborted (AbortError)", new DOMException("Aborted", "AbortError")],
	])("when the API is %s", (_label, error) => {
		it.each([
			[false, "/onboarding"],
			[true, "/home"],
		] as const)("continues on the refreshed claim (onboardingCompleted %s -> %s)", async (completed, destination) => {
			const user = makeUser({
				getIdTokenResult: vi.fn().mockResolvedValue({ claims: { onboardingCompleted: completed } }),
			});
			mocks.auth.user = user;
			mocks.getProfile.mockRejectedValue(error);
			const { result } = renderHook(() => usePostAuthRedirect());

			await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({
				to: destination,
				replace: true,
				viewTransition: PUSH_FORWARD,
			}));
			expect(mocks.navigate).toHaveBeenCalledOnce();
			expect(mocks.getProfile).toHaveBeenCalledOnce();
			// the token is refreshed after the profile call either way, so a claim the API did repair is read
			expect(user.getIdToken.mock.calls).toEqual([[true], [true]]);
			expect(user.getIdTokenResult).toHaveBeenCalledOnce();
			expect(result.current.error).toBeNull();
			await waitFor(() => expect(result.current.pending).toBe(false));
			expect(mocks.auth.logout).not.toHaveBeenCalled();
		});
	});

	it("keeps the session and allows a retry when Firebase itself cannot be reached", async () => {
		const user = makeUser();
		user.reload.mockRejectedValueOnce(firebaseError("auth/network-request-failed"));
		mocks.auth.user = user;
		const { result } = renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(result.current.error).toBe(CONNECTION_ERROR));
		expect(result.current.pending).toBe(false);
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(mocks.auth.logout).not.toHaveBeenCalled();

		act(() => result.current.retry());
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/onboarding",
			replace: true,
			viewTransition: PUSH_FORWARD,
		}));
		expect(user.reload).toHaveBeenCalledTimes(2);
		expect(result.current.error).toBeNull();
		expect(mocks.auth.logout).not.toHaveBeenCalled();
	});

	it("sends an unverified email account to verification before requesting its profile", async () => {
		mocks.auth.user = makeUser({ emailVerified: false });
		renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/check-email",
			search: { purpose: "verify", email: "test@example.com" },
			replace: true,
			viewTransition: PUSH_FORWARD,
		}));
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.auth.logout).not.toHaveBeenCalled();
	});

	it("uses the refreshed verification state", async () => {
		const user = makeUser({ emailVerified: false });
		user.reload.mockImplementation(async () => { user.emailVerified = true; });
		mocks.auth.user = user;
		renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/onboarding" })));
		expect(mocks.getProfile).toHaveBeenCalledOnce();
	});

	it("handles the backend verification response without signing the user out", async () => {
		mocks.getProfile.mockRejectedValue(new ApiError(403, "Forbidden", "email_not_verified"));
		renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({
			to: "/check-email",
			search: { purpose: "verify", email: "test@example.com" },
			replace: true,
		})));
		expect(mocks.auth.logout).not.toHaveBeenCalled();
	});

	it.each([
		"auth/user-disabled",
		"auth/user-not-found",
		"auth/user-token-expired",
		"auth/invalid-user-token",
		"auth/id-token-revoked",
	])("signs out a genuinely invalid Firebase session: %s", async (code) => {
		mocks.auth.user?.getIdToken.mockRejectedValue(Object.assign(new Error("Invalid session"), { code }));
		const { result } = renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(result.current.error).toBe(EXPIRED_ERROR));
		expect(mocks.auth.logout).toHaveBeenCalledOnce();
		expect(mocks.getProfile).not.toHaveBeenCalled();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("signs out when Firebase reports the session over after the profile call", async () => {
		const user = makeUser({ getIdTokenResult: vi.fn().mockRejectedValue(firebaseError("auth/user-token-expired")) });
		mocks.auth.user = user;
		mocks.getProfile.mockRejectedValue(new TypeError("Failed to fetch"));
		const { result } = renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(result.current.error).toBe(EXPIRED_ERROR));
		expect(mocks.auth.logout).toHaveBeenCalledOnce();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("treats an API 401 as an API failure, not an expired Firebase session", async () => {
		mocks.getProfile.mockRejectedValue(new ApiError(401, "Unauthorized"));
		const { result } = renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/onboarding",
			replace: true,
			viewTransition: PUSH_FORWARD,
		}));
		expect(result.current.error).toBeNull();
		expect(mocks.auth.logout).not.toHaveBeenCalled();
	});

	it.each(["resolve", "reject"] as const)("ignores a profile request that settles after unmount (%s)", async (settlement) => {
		const request = deferred<{ onboardingCompleted: boolean }>();
		mocks.getProfile.mockReturnValue(request.promise);
		const { result, unmount } = renderHook(() => usePostAuthRedirect());
		await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledOnce());
		expect(result.current.pending).toBe(true);
		const signal = mocks.getProfile.mock.calls[0][0].signal as AbortSignal;

		unmount();
		expect(signal.aborted).toBe(true);
		await act(async () => {
			if (settlement === "resolve") request.resolve({ onboardingCompleted: true });
			else request.reject(new ApiError(401, "Unauthorized"));
		});
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(mocks.auth.logout).not.toHaveBeenCalled();
	});

	it("does not let an expired request sign out a replacement session", async () => {
		const request = deferred<{ onboardingCompleted: boolean }>();
		mocks.getProfile.mockReturnValueOnce(request.promise);
		const { rerender } = renderHook(() => usePostAuthRedirect());
		await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledOnce());
		const signal = mocks.getProfile.mock.calls[0][0].signal as AbortSignal;

		mocks.auth.user = makeUser({ uid: "replacement-user" });
		rerender();
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce());
		expect(signal.aborted).toBe(true);
		await act(async () => request.reject(new ApiError(401, "Unauthorized")));
		expect(mocks.auth.logout).not.toHaveBeenCalled();
		expect(mocks.navigate).toHaveBeenCalledTimes(1);
	});
});

describe("welcomeFor", () => {
	it.each([
		["/home", false, "Welcome back!"],
		["/home", true, "Welcome back!"],
		["/onboarding", true, "Welcome to STAK!"],
		["/onboarding", false, null],
	] as const)("%s after a sign-in with isNew %s -> %s", (destination, isNew, welcome) => {
		expect(welcomeFor(destination, { isNew })).toBe(welcome);
	});
});

// User, 2026-11-11: "welcome back should be only for returning users then straight to the home page. then new users
// follow through the onboarding process". The routing welcomes a sign-in made on the page, once, with its destination.
describe("the welcome of a sign-in made on the page", () => {
	const HOME = { to: "/home", replace: true, viewTransition: PUSH_FORWARD };
	const ONBOARDING = { to: "/onboarding", replace: true, viewTransition: PUSH_FORWARD };
	const withClaim = (completed: boolean, overrides: Partial<MockUser> = {}) =>
		makeUser({ getIdTokenResult: vi.fn().mockResolvedValue({ claims: { onboardingCompleted: completed } }), ...overrides });
	type View = { result: { current: ReturnType<typeof usePostAuthRedirect> }; rerender: () => void };

	function signedOutPage() {
		mocks.auth.user = null;
		return renderHook(() => usePostAuthRedirect());
	}

	/** A sign-in on the page that settles before the page re-renders with the account (the other order is tested below). */
	async function signIn(view: View, account: MockUser, providerResult?: unknown) {
		let signedIn!: Promise<void>;
		act(() => {
			signedIn = view.result.current.signIn(async () => {
				mocks.auth.user = account;
				return providerResult;
			});
		});
		await act(async () => {
			await signedIn;
		});
		view.rerender();
	}

	const CASES: [string, unknown, boolean, typeof HOME, string[][]][] = [
		["an email sign-in of a new account (its first, after verifying)", undefined, false, ONBOARDING, []],
		["an email sign-in of a returning account", undefined, true, HOME, [["Welcome back!"]]],
		["a Google / Apple sign-in that created the account", { isNew: true, uid: "test-user" }, false, ONBOARDING, [["Welcome to STAK!"]]],
		["a Google / Apple sign-in linking an account that finished onboarding (isNew)", { isNew: true, uid: "test-user" }, true, HOME, [["Welcome back!"]]],
		["a Google / Apple sign-in of an account that never finished onboarding", { isNew: false, uid: "test-user" }, false, ONBOARDING, []],
		["a Google / Apple sign-in of an account that finished onboarding", { isNew: false, uid: "test-user" }, true, HOME, [["Welcome back!"]]],
	];

	describe.each([
		// the profile disagrees with the claim (the backend can answer with an older value while repairing the claim)
		["up", (completed: boolean) => mocks.getProfile.mockResolvedValue({ onboardingCompleted: !completed })],
		["down", (_completed: boolean) => mocks.getProfile.mockRejectedValue(new TypeError("Failed to fetch"))],
	] as const)("with the API %s, the refreshed claim decides", (_api, setUpApi) => {
		it.each(CASES)("%s", async (_label, providerResult, completed, destination, toasts) => {
			setUpApi(completed);
			const view = signedOutPage();
			await signIn(view, withClaim(completed), providerResult);

			await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(destination));
			expect(mocks.navigate).toHaveBeenCalledOnce();
			expect(mocks.toastSuccess.mock.calls).toEqual(toasts);
			if (toasts.length) expect(mocks.toastSuccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.navigate.mock.invocationCallOrder[0]);
			expect(mocks.toastError).not.toHaveBeenCalled();
		});
	});

	it("routes a session that was already signed in when the page opened without a toast", async () => {
		mocks.auth.user = withClaim(true);
		renderHook(() => usePostAuthRedirect());

		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});

	it("calls the provider at once, inside the click, as before (a popup opened later can be blocked)", () => {
		const { result } = signedOutPage();
		const run = vi.fn(() => new Promise<never>(() => {}));
		void result.current.signIn(run);
		expect(run).toHaveBeenCalledOnce();
	});

	it("waits for the sign-in's own promise when Firebase reports the account first, then welcomes once", async () => {
		const account = withClaim(true);
		const provider = deferred<{ isNew: boolean; uid: string }>();
		const view = signedOutPage();
		let signedIn!: Promise<void>;
		act(() => {
			signedIn = view.result.current.signIn(() => {
				mocks.auth.user = account;
				return provider.promise;
			});
		});
		// onAuthStateChanged: the page re-renders with the account while the popup's promise is still open
		view.rerender();
		await waitFor(() => expect(account.getIdTokenResult).toHaveBeenCalledOnce());
		await act(async () => {
			await Promise.resolve();
		});
		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
		expect(view.result.current.pending).toBe(true);

		await act(async () => {
			provider.resolve({ isNew: false, uid: account.uid });
			await signedIn;
		});
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
		expect(mocks.navigate).toHaveBeenCalledOnce();
		expect(mocks.toastSuccess.mock.calls).toEqual([["Welcome back!"]]);
	});

	it("never welcomes a failed sign-in, hands its error back unchanged, and leaves nothing for a later session", async () => {
		const failure = firebaseError("auth/invalid-credential");
		const view = signedOutPage();
		let signedIn!: Promise<void>;
		act(() => {
			signedIn = view.result.current.signIn(() => Promise.reject(failure));
		});
		await expect(signedIn).rejects.toBe(failure);
		expect(mocks.navigate).not.toHaveBeenCalled();

		// a session that arrives later without a sign-in on the page (another tab) is routed without a toast
		mocks.auth.user = withClaim(true);
		view.rerender();
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});

	it("does not welcome a session restored while a sign-in started on the page fails", async () => {
		mocks.auth.loading = true;
		mocks.auth.user = null;
		const view = renderHook(() => usePostAuthRedirect());
		const provider = deferred<never>();
		act(() => {
			void view.result.current.signIn(() => provider.promise).catch(() => {});
		});
		const restored = withClaim(true);
		mocks.auth.loading = false;
		mocks.auth.user = restored;
		view.rerender();
		await waitFor(() => expect(restored.getIdTokenResult).toHaveBeenCalledOnce());
		expect(mocks.navigate).not.toHaveBeenCalled();

		await act(async () => provider.reject(firebaseError("auth/popup-closed-by-user")));
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});

	it("welcomes once when the routing starts again for the same sign-in (the auth provider re-rendering)", async () => {
		const stalled = deferred<{ onboardingCompleted: boolean }>();
		mocks.getProfile.mockReturnValueOnce(stalled.promise);
		const view = signedOutPage();
		await signIn(view, withClaim(true));
		await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledOnce());

		const logout = mocks.auth.logout;
		try {
			// a new logout function restarts the effect mid-way: the first run is cancelled, the second one decides
			mocks.auth.logout = vi.fn().mockResolvedValue(undefined);
			view.rerender();
			await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
			await act(async () => stalled.resolve({ onboardingCompleted: true }));
			// and once more after the decision: the routing repeats, the welcome does not
			mocks.auth.logout = vi.fn().mockResolvedValue(undefined);
			view.rerender();
			await waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(2));
		} finally {
			mocks.auth.logout = logout;
		}
		expect(mocks.navigate.mock.calls).toEqual([[HOME], [HOME]]);
		expect(mocks.toastSuccess.mock.calls).toEqual([["Welcome back!"]]);
	});

	it("keeps the welcome for the retry when Firebase could not be reached", async () => {
		const account = withClaim(true);
		account.reload.mockRejectedValueOnce(firebaseError("auth/network-request-failed"));
		const view = signedOutPage();
		await signIn(view, account);
		await waitFor(() => expect(view.result.current.error).toBe(CONNECTION_ERROR));
		expect(mocks.toastSuccess).not.toHaveBeenCalled();

		act(() => view.result.current.retry());
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
		expect(mocks.toastSuccess.mock.calls).toEqual([["Welcome back!"]]);
	});

	it("drops the welcome when the new session turns out to be over", async () => {
		const account = withClaim(true);
		account.getIdToken.mockRejectedValue(firebaseError("auth/user-token-expired"));
		const view = signedOutPage();
		await signIn(view, account);
		await waitFor(() => expect(view.result.current.error).toBe(EXPIRED_ERROR));
		expect(mocks.auth.logout).toHaveBeenCalledOnce();

		// signed out; a session that arrives later without a sign-in on the page (another tab) gets no toast
		mocks.auth.user = null;
		view.rerender();
		mocks.auth.user = withClaim(true, { uid: "other-tab" });
		view.rerender();
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(HOME));
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});

	it("sends an unverified email account to Check your email without a welcome, and keeps none for later", async () => {
		const account = withClaim(true, { emailVerified: false });
		const view = signedOutPage();
		await signIn(view, account);
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/check-email" })));
		expect(mocks.getProfile).not.toHaveBeenCalled();

		account.emailVerified = true;
		act(() => view.result.current.retry());
		await waitFor(() => expect(mocks.navigate).toHaveBeenLastCalledWith(HOME));
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});
});

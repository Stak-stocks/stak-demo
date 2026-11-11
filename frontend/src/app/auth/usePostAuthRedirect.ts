import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ApiError, getProfile } from "@/lib/api";
import { PUSH_FORWARD } from "./motion";

const EXPIRED_SESSION_CODES = new Set([
	"auth/user-disabled",
	"auth/user-not-found",
	"auth/user-token-expired",
	"auth/invalid-user-token",
	"auth/id-token-revoked",
]);

/**
 * How long the continuation waits for GET /api/me before going on without it (it waited 15 s and then stopped the person).
 * A working API answers in well under a second, a cold start in a few; the person goes on either way, so a longer wait
 * only holds them on the form.
 */
export const PROFILE_WAIT_MS = 8_000;

/** Where a signed-in account with a verified email goes: Home once it has finished onboarding. */
export type PostAuthDestination = "/home" | "/onboarding";

/** What a sign-in made on the page reports: Google and Apple say whether it created the account; email never does. */
export type SignInOutcome = { isNew: boolean };

/**
 * The toast a sign-in made on the page gets, decided with its destination (user, 2026-11-11: "welcome back should be only
 * for returning users then straight to the home page"): "Welcome back!" only for Home, a returning account that finished
 * onboarding. On Onboarding an account this sign-in created (Google / Apple) is greeted "Welcome to STAK!", and one that
 * never finished onboarding gets nothing: an email account's first sign-in after verifying was greeted by its link page
 * ("Email verified! Welcome to STAK!").
 */
export function welcomeFor(destination: PostAuthDestination, outcome: SignInOutcome): string | null {
	if (destination === "/home") return "Welcome back!";
	return outcome.isNew ? "Welcome to STAK!" : null;
}

const createdAccount = (result: unknown) =>
	typeof result === "object" && result !== null && (result as { isNew?: unknown }).isNew === true;

/**
 * Finish authentication: the refreshed onboarding claim sends the person to /home or /onboarding. GET /api/me runs first
 * and is best-effort, as the original login page ran it (getProfile().catch(() => {})): when the API is up it creates the
 * profile and repairs the claim; when it is down, failing, slow (PROFILE_WAIT_MS) or refuses the token, the person still
 * goes on (N59). An unverified email account goes to Check your email; only a Firebase session that is really over
 * (EXPIRED_SESSION_CODES) signs out; any other Firebase failure leaves the session retryable.
 * A sign-in made on the page goes through `signIn`, and only such a sign-in is welcomed (welcomeFor), once, as its
 * destination is decided; a session that was already signed in when the page opened is routed without a toast.
 */
export function usePostAuthRedirect() {
	const { user, loading, logout } = useAuth();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [attempt, setAttempt] = useState(0);
	// The sign-in made on this page: its outcome once it settles (null when it failed or was cancelled). It is recorded
	// before the provider is called, so it is here whichever comes first, the new auth state or the sign-in's own promise.
	const signInRef = useRef<Promise<SignInOutcome | null> | null>(null);

	useEffect(() => {
		if (loading || !user) {
			setPending(false);
			return;
		}

		const signedInUser = user;
		let active = true;
		const controller = new AbortController();
		let timeout: ReturnType<typeof setTimeout> | undefined;
		setError(null);
		setPending(true);

		async function verifyEmail() {
			// a sign-in sent to Check your email gets no welcome here: its verification link page greets it
			signInRef.current = null;
			await navigate({
				to: "/check-email",
				search: { purpose: "verify", email: signedInUser.email ?? undefined },
				replace: true,
				viewTransition: PUSH_FORWARD,
			});
		}

		async function finish() {
			try {
				await signedInUser.reload();
				if (!active) return;
				await signedInUser.getIdToken(true);
				if (!active) return;

				const isPasswordAccount = signedInUser.providerData.some((provider) => provider.providerId === "password");
				if (isPasswordAccount && !signedInUser.emailVerified) {
					await verifyEmail();
					return;
				}

				timeout = setTimeout(() => controller.abort(), PROFILE_WAIT_MS);
				try {
					await getProfile({ signal: controller.signal });
				} catch (reason) {
					if (!active) return;
					if (reason instanceof ApiError && reason.code === "email_not_verified") {
						await verifyEmail();
						return;
					}
					// down, failing, slow or refusing the token: the API never stops the person, the claim below decides
				}
				clearTimeout(timeout);
				if (!active) return;
				await signedInUser.getIdToken(true);
				if (!active) return;
				const result = await signedInUser.getIdTokenResult();
				if (!active) return;
				const destination: PostAuthDestination = result.claims.onboardingCompleted === true ? "/home" : "/onboarding";
				// The sign-in made on the page, if any, has settled by now in practice; waiting for it means either order works
				// (the new auth state before the sign-in's own promise, or after it).
				const pendingSignIn = signInRef.current;
				const outcome = pendingSignIn ? await pendingSignIn : null;
				if (!active) return;
				// once per sign-in: the run that decides takes it, so a retry or a later run of this effect never repeats it
				if (pendingSignIn && signInRef.current === pendingSignIn) {
					signInRef.current = null;
					const welcome = outcome ? welcomeFor(destination, outcome) : null;
					if (welcome) toast.success(welcome);
				}
				await navigate({
					to: destination,
					replace: true,
					viewTransition: PUSH_FORWARD,
				});
			} catch (reason) {
				if (!active) return;
				const code = (reason as { code?: string })?.code;
				if (code && EXPIRED_SESSION_CODES.has(code)) {
					// the sign-in ends with its session: nothing is left for a later session on this page to inherit
					signInRef.current = null;
					setError("Your session expired. Please sign in again.");
					await logout().catch(() => {});
				} else {
					setError("You are signed in, but we couldn't load your account. Check your connection and try again.");
				}
			} finally {
				clearTimeout(timeout);
				if (active) setPending(false);
			}
		}

		void finish();
		return () => {
			active = false;
			clearTimeout(timeout);
			controller.abort();
		};
	}, [user, loading, navigate, logout, attempt]);

	/**
	 * Runs a sign-in made on the page and records it for the routing above. `run` is called at once, inside the click, as
	 * before (a popup opened later can be blocked); the returned promise settles as the sign-in does, with its own error,
	 * so the page's error handling is unchanged.
	 */
	const signIn = useCallback((run: () => Promise<unknown>): Promise<void> => {
		let settle!: (outcome: SignInOutcome | null) => void;
		const outcome = new Promise<SignInOutcome | null>((resolve) => {
			settle = resolve;
		});
		signInRef.current = outcome;
		const signedIn = new Promise<unknown>((resolve) => resolve(run()));
		signedIn.then(
			(result) => settle({ isNew: createdAccount(result) }),
			() => {
				// a failed or cancelled sign-in is never welcomed
				if (signInRef.current === outcome) signInRef.current = null;
				settle(null);
			},
		);
		return signedIn.then(() => undefined);
	}, []);

	return {
		error,
		pending,
		retry: () => {
			setError(null);
			setAttempt((value) => value + 1);
		},
		signIn,
	};
}

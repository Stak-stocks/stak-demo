import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PUSH_BACK, PUSH_FORWARD } from "@/app/auth/motion";
import { AuthHeading, AuthLayout, FieldError, FootRow } from "@/app/auth/ui";
import { PROFILE_WAIT_MS, welcomeFor } from "@/app/auth/usePostAuthRedirect";
import { PrimaryButton } from "@/app/ui/Button";
import { getProfile } from "@/lib/api";
import { useAuth } from "../context/AuthContext";

// `from=profile`: opened by Edit profile's "Email me a link" (the reset email for the signed-in account)
type CheckEmailSearch = { email?: string; from?: "profile"; purpose?: "verify" };

export const Route = createFileRoute("/check-email")({
	validateSearch: (search: Record<string, unknown>): CheckEmailSearch => ({
		email: typeof search.email === "string" && search.email ? search.email : undefined,
		from: search.from === "profile" ? "profile" : undefined,
		purpose: search.purpose === "verify" ? "verify" : undefined,
	}),
	component: CheckEmailPage,
});

/** Figma 2:1566 "Desktop · Auth · Check your email" (the frame's demo address when none was passed). */
function CheckEmailPage() {
	const { email, from, purpose } = Route.useSearch();
	const { user, loading, resetPassword, sendVerificationEmail, logout } = useAuth();
	const navigate = useNavigate();
	const [resending, setResending] = useState(false);
	const [continuing, setContinuing] = useState(false);
	const [error, setError] = useState<string>();
	const verifying = purpose === "verify";
	const address = verifying ? user?.email ?? email : email ?? "hamza@gmail.com";
	const missingSession = verifying && !loading && !user;
	const currentUser = useRef(user);
	currentUser.current = user;
	const operation = useRef(0);
	const request = useRef<{ controller: AbortController; timeout?: ReturnType<typeof setTimeout> } | null>(null);
	const welcomed = useRef(false);

	useEffect(() => {
		setContinuing(false);
		return () => {
			operation.current++;
			request.current?.controller.abort();
			clearTimeout(request.current?.timeout);
		};
	}, [user]);

	async function continueAfterVerification() {
		if (loading || continuing) return;
		if (!user) {
			navigate({ to: "/login", replace: true, viewTransition: PUSH_FORWARD });
			return;
		}
		setContinuing(true);
		setError(undefined);
		const attempt = ++operation.current;
		const pending = { controller: new AbortController(), timeout: undefined as ReturnType<typeof setTimeout> | undefined };
		request.current = pending;
		const isCurrent = () => operation.current === attempt && currentUser.current === user;
		try {
			await user.reload();
			if (!isCurrent()) return;
			if (!user.emailVerified) {
				setError("Your email is not verified yet. Open the verification link in your email, then try again.");
				return;
			}
			// The API requires the refreshed verification claim. It also creates the profile and updates onboarding claims,
			// best-effort as in the original (its verification page made no API call): an API that is down, failing or slow
			// (PROFILE_WAIT_MS) never holds the person here; the refreshed claim below decides (N59).
			await user.getIdToken(true);
			if (!isCurrent()) return;
			pending.timeout = setTimeout(() => pending.controller.abort(), PROFILE_WAIT_MS);
			await getProfile({ signal: pending.controller.signal }).catch(() => {});
			clearTimeout(pending.timeout);
			if (!isCurrent()) return;
			await user.getIdToken(true);
			if (!isCurrent()) return;
			const result = await user.getIdTokenResult();
			if (!isCurrent()) return;
			const destination = result.claims.onboardingCompleted === true ? "/home" : "/onboarding";
			// As the sign-in pages' routing does (usePostAuthRedirect): an account that finished onboarding is welcomed back,
			// once, as it goes Home (an account from before verification was required can have done so); a new account goes
			// on to Onboarding without it, its verification link page having greeted it.
			const welcome = welcomeFor(destination, { isNew: false });
			if (welcome && !welcomed.current) {
				welcomed.current = true;
				toast.success(welcome);
			}
			await navigate({
				to: destination,
				viewTransition: PUSH_FORWARD,
				replace: true,
			});
		} catch {
			if (isCurrent()) setError("We couldn't continue right now. Your sign-in is saved. Please try again.");
		} finally {
			clearTimeout(pending.timeout);
			if (request.current === pending) request.current = null;
			if (isCurrent()) setContinuing(false);
		}
	}

	async function changeAccount() {
		operation.current++;
		request.current?.controller.abort();
		clearTimeout(request.current?.timeout);
		setContinuing(false);
		setError(undefined);
		try {
			await logout();
			await navigate({ to: "/signup", replace: true, viewTransition: PUSH_BACK });
		} catch {
			setError("We couldn't sign you out. Please try again.");
		}
	}

	async function resend() {
		if (resending) return;
		if (verifying) {
			if (loading || !user) return;
			setResending(true);
			setError(undefined);
			try {
				await sendVerificationEmail();
				toast.success("Verification email sent again!");
			} catch {
				setError("We couldn't resend your verification email. Please try again.");
			} finally {
				setResending(false);
			}
			return;
		}
		// Opened without an address (the frame's demo copy shows one, but nothing was sent to it): Resend link asks for the
		// address on Forgot password, the step before this one (PUSH RIGHT 0.3 s, like Back). No email goes to the demo one.
		if (!email) {
			navigate({ to: "/forgot-password", viewTransition: false });
			return;
		}
		setResending(true);
		try {
			await resetPassword(email);
			toast.success("Reset email sent again!");
		} catch {
			toast.error("Failed to resend. Try again.");
		} finally {
			setResending(false);
		}
	}

	return (
		<AuthLayout
			formTop={411}
			backTo={verifying ? "/signup" : from === "profile" ? "/profile/edit" : "/forgot-password"}
			backSearch={!verifying && from !== "profile" && email ? { email } : undefined}
			backTransition={verifying ? PUSH_BACK : false}
			onBack={verifying ? () => void changeAccount() : undefined}
		>
			<div className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start">
					<AuthHeading
						title="Check your email"
						subtitle={verifying
							? address
								? `We sent a verification link to ${address}. Open the link, then return here to continue.`
								: "Open the verification link in your email, then return here to continue."
							: `We sent a reset link to ${address}. It expires in 15 minutes.`}
						wrap
					/>
				</div>
				<FieldError>{error}</FieldError>
				<PrimaryButton
					disabled={verifying && (loading || continuing)}
					aria-busy={verifying && (loading || continuing)}
					onClick={() => {
						if (verifying) void continueAfterVerification();
						else window.location.href = "mailto:";
					}}
				>
					{verifying ? loading ? "Loading…" : continuing ? "Checking…" : missingSession ? "Sign in" : "I’ve verified my email" : "Open mail app"}
				</PrimaryButton>
			</div>
			{!missingSession && (
				<div className="flex flex-col items-center justify-center">
					<FootRow text="Didn’t get it?" textWidth={71} linkLabel={verifying && resending ? "Sending…" : "Resend link"} linkWidth={66} onClick={resend} />
					{verifying && !loading && <FootRow text="Wrong email?" linkLabel="Use a different account" onClick={() => void changeAccount()} />}
				</div>
			)}
		</AuthLayout>
	);
}

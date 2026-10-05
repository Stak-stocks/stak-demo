import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { JOIN_WAITLIST, WEB_SIGNUP_OPEN } from "@/lib/earlyAccess";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { getProfile } from "@/lib/api";
import {
	AuthBackLink, AuthCta, AuthHeader, AuthInput, AuthScreen, AuthSpinner, ErrorText, OTP_LENGTH, GooglePill, OrDivider, ShowHide, SwitchRow,
	confirmError as confirmProblem, emailError as emailProblem, friendlyAuthError, passwordError as passwordProblem, usePasswordVisibility,
} from "@/components/auth/AuthKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, PhonePage, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/signup")({
	component: SignUpPage,
	// login sends an unconfirmed account here (?confirm=<email>) to type the code it just re-sent.
	validateSearch: (search: Record<string, unknown>): { confirm?: string } => ({
		confirm: typeof search.confirm === "string" && search.confirm ? search.confirm : undefined,
	}),
	// Early access: no new accounts on the web. Only finishing one already started (typing its code) gets through.
	beforeLoad: ({ search }) => {
		if (!WEB_SIGNUP_OPEN && !search.confirm) throw redirect(JOIN_WAITLIST);
	},
});

/** Android's Create account: Google or email + password, then a confirmation code from the email. */
function SignUpPage() {
	const { loading, signUpWithEmail, signInWithGoogleSupabase, verifySignupOtp, resendSignupOtp, supabaseUserId } = useAuth();
	const navigate = useNavigate();
	const { confirm: confirmEmail } = Route.useSearch();
	const [mode, setMode] = useState<"form" | "confirm">(confirmEmail ? "confirm" : "form");
	const [submitting, setSubmitting] = useState(false);
	const [email, setEmail] = useState(confirmEmail ?? "");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [code, setCode] = useState("");
	const [attempted, setAttempted] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const { shown, toggle } = usePasswordVisibility();

	// Set for the whole verify -> navigate hop: confirming the code creates the session, which
	// would otherwise trip the "already logged in" redirect below and race handleVerify's own
	// navigation - whichever landed last won, sometimes dropping a new user back into the quiz.
	const verifyingRef = useRef(false);

	// Already logged in - redirect to the right page. A signed-in user who hasn't finished onboarding starts it at Intro,
	// exactly as Android does after sign-in.
	useEffect(() => {
		if (loading || !supabaseUserId || verifyingRef.current) return;
		getProfile()
			.then((profile) => {
				if (verifyingRef.current) return;
				navigate({ to: profile.onboardingCompleted ? "/" : "/onboarding" });
			})
			.catch(() => navigate({ to: "/" }));
	}, [loading, supabaseUserId, navigate]);

	const problems = { email: emailProblem(email), password: passwordProblem(password), confirm: confirmProblem(password, confirmPassword) };

	async function handleEmailSignUp() {
		setAttempted(true);
		setServerError(null);
		if (problems.email || problems.password || problems.confirm || submitting) return;
		setSubmitting(true);
		try {
			await signUpWithEmail(email.trim(), password);
			setMode("confirm");
			setAttempted(false);
		} catch (error) {
			setServerError(friendlyAuthError(error));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleVerify() {
		if (submitting || code.length < OTP_LENGTH) return;
		setSubmitting(true);
		setServerError(null);
		verifyingRef.current = true;
		try {
			await verifySignupOtp(email.trim(), code);
			// The account now exists: on to Intro, the first onboarding step.
			navigate({ to: "/onboarding" });
		} catch (error) {
			verifyingRef.current = false;
			setCode("");
			setServerError(friendlyAuthError(error));
			setSubmitting(false);
		}
	}

	async function handleResend() {
		setSubmitting(true);
		setServerError(null);
		try {
			await resendSignupOtp(email.trim());
		} catch (error) {
			setServerError(friendlyAuthError(error));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleGoogleSignIn() {
		setSubmitting(true);
		setServerError(null);
		try {
			await signInWithGoogleSupabase();
		} catch (error) {
			setServerError(friendlyAuthError(error));
			setSubmitting(false);
		}
	}

	if (loading) {
		return <PhonePage><div className="grid place-items-center" style={{ height: cu(300) }}><AuthSpinner size={32} /></div></PhonePage>;
	}

	const confirming = mode === "confirm";
	return (
		<AuthScreen
			// On the code step, back returns to the form (email kept) rather than leaving sign-up.
			nav={confirming ? <AuthBackLink label="Back to sign-up" onClick={() => { setMode("form"); setServerError(null); }} /> : undefined}
			bottom={
				<>
					{confirming
						? <AuthCta label="Verify" onClick={handleVerify} disabled={submitting || code.length < OTP_LENGTH} />
						: <AuthCta label="Create account" onClick={handleEmailSignUp} disabled={submitting} />}
					{submitting && <AuthSpinner />}
					{serverError && <ErrorText>{serverError}</ErrorText>}
					<SwitchRow prefix="Already have an account?" link="Sign in" onClick={() => navigate({ to: "/login" })} />
					<p className="text-center" style={{ padding: `0 ${cu(24)}`, font: f(400, 10), color: DISC.muted }}>By continuing you agree to the Terms and Privacy Policy.</p>
				</>
			}
		>
			{confirming ? (
				<>
					<AuthHeader title="Check your email" subtitle={`We sent a confirmation code to ${email.trim()}. Enter it below to confirm your account.`} />
					<div style={{ height: cu(4) }} />
					<AuthInput
						value={code}
						onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 10))}
						placeholder="Confirmation code"
						inputMode="numeric"
						autoComplete="one-time-code"
						autoFocus
						onEnter={handleVerify}
					/>
					<div style={{ display: "flex", flexDirection: "column", gap: cu(6), borderRadius: cu(14), background: DISC.sheet, padding: cu(16) }}>
						<p style={{ font: f(500, 14), color: "#fff" }}>Didn’t get it?</p>
						<p style={{ font: f(400, 11, 15), color: "#ACAFB1" }}>Check your spam folder, or</p>
						<button type="button" onClick={handleResend} disabled={submitting} className={`w-fit disabled:opacity-50 ${PRESS}`} style={{ font: f(500, 12), color: DISC.teal, ...focusRing }}>
							Resend confirmation email
						</button>
					</div>
				</>
			) : (
				<>
					<AuthHeader title="Create your account" subtitle="Enter your details below to continue" />
					<div style={{ height: cu(4) }} />
					<GooglePill onClick={handleGoogleSignIn} disabled={submitting} />
					<OrDivider />
					<AuthInput value={email} onChange={setEmail} placeholder="Email address" type="email" inputMode="email" autoComplete="email" error={attempted ? problems.email : null} onEnter={handleEmailSignUp} />
					<AuthInput value={password} onChange={setPassword} placeholder="Password" type={shown ? "text" : "password"} autoComplete="new-password" error={attempted ? problems.password : null} trailing={<ShowHide shown={shown} onToggle={toggle} />} onEnter={handleEmailSignUp} />
					<AuthInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm Password" type={shown ? "text" : "password"} autoComplete="new-password" error={attempted ? problems.confirm : null} onEnter={handleEmailSignUp} />
				</>
			)}
		</AuthScreen>
	);
}

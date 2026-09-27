import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { getProfile } from "@/lib/api";
import {
	AuthCta, AuthHeader, AuthInput, AuthScreen, AuthSpinner, ErrorText, GooglePill, OrDivider, ShowHide, SwitchRow,
	emailError as emailProblem, friendlyAuthError, usePasswordVisibility,
} from "@/components/auth/AuthKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, PhonePage, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

/** Android's Sign in: Google, or email and password. Problems show inline, after the first tap. */
function LoginPage() {
	const { loading, signInWithEmailSupabase, signInWithGoogleSupabase, resendSignupOtp, supabaseUserId } = useAuth();
	const navigate = useNavigate();
	const [signingIn, setSigningIn] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [attempted, setAttempted] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const { shown, toggle } = usePasswordVisibility();

	useEffect(() => {
		if (!supabaseUserId) return;
		getProfile()
			.then((profile) => {
				navigate({ to: profile.onboardingCompleted ? "/" : "/onboarding" });
			})
			.catch(() => navigate({ to: "/" }));
	}, [supabaseUserId, navigate]);

	async function handleEmailSignIn() {
		setAttempted(true);
		setServerError(null);
		if (emailProblem(email) || !password || signingIn) return;
		setSigningIn(true);
		try {
			await signInWithEmailSupabase(email.trim(), password);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "";
			if (message.toLowerCase().includes("not confirmed")) {
				// Signed up but never entered the code - send a fresh one and open the code step.
				await resendSignupOtp(email.trim()).catch(() => {});
				navigate({ to: "/signup", search: { confirm: email.trim() } });
				return;
			}
			setServerError(friendlyAuthError(error));
			setSigningIn(false);
		}
	}

	async function handleGoogleSignIn() {
		setSigningIn(true);
		setServerError(null);
		try {
			await signInWithGoogleSupabase();
		} catch (error) {
			setServerError(friendlyAuthError(error));
			setSigningIn(false);
		}
	}

	if (loading) {
		return <PhonePage><div className="grid place-items-center" style={{ height: cu(300) }}><AuthSpinner size={32} /></div></PhonePage>;
	}

	return (
		<AuthScreen
			bottom={
				<>
					<AuthCta label="Sign in" onClick={handleEmailSignIn} disabled={signingIn} />
					{signingIn && <AuthSpinner />}
					{serverError && <ErrorText>{serverError}</ErrorText>}
					<SwitchRow prefix="New to STAK?" link="Create account" onClick={() => navigate({ to: "/signup" })} />
				</>
			}
		>
			<AuthHeader title="Welcome back" subtitle="Your deck kept learning while you were away." />
			<div style={{ height: cu(4) }} />
			<GooglePill onClick={handleGoogleSignIn} disabled={signingIn} />
			<OrDivider />
			<AuthInput value={email} onChange={setEmail} placeholder="Email address" type="email" inputMode="email" autoComplete="email" error={attempted ? emailProblem(email) : null} onEnter={handleEmailSignIn} />
			<AuthInput value={password} onChange={setPassword} placeholder="Password" type={shown ? "text" : "password"} autoComplete="current-password" trailing={<ShowHide shown={shown} onToggle={toggle} />} onEnter={handleEmailSignIn} />
			<button type="button" onClick={() => navigate({ to: "/forgot-password" })} className={`w-fit ${PRESS}`} style={{ font: f(500, 12), color: DISC.teal, ...focusRing }}>
				Forgot password?
			</button>
		</AuthScreen>
	);
}

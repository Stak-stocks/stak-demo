import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AU } from "@/app/auth/assets";
import { usePostAuthRedirect } from "@/app/auth/usePostAuthRedirect";
import {
	AuthHeading,
	AuthInput,
	AuthLayout,
	AuthRedirectError,
	authErrorMessage,
	FieldError,
	FootRow,
	isEmail,
	OrDivider,
	ShowToggle,
	SocialButton,
	TextLink,
} from "@/app/auth/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

/** Figma 2:5664 "Desktop · Sign in": visuals from the frame, auth logic from the previous login page. */
function LoginPage() {
	const { signInWithGoogle, signInWithApple, signInWithEmail } = useAuth();
	const redirect = usePostAuthRedirect();
	const [signingIn, setSigningIn] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

	async function handleEmailSignIn(e: React.FormEvent) {
		e.preventDefault();
		if (signingIn || redirect.pending) return;
		const next: typeof errors = {};
		if (!isEmail(email)) next.email = "Enter the email you signed up with";
		if (!password) next.password = "Enter your password";
		setErrors(next);
		if (next.email || next.password) return;
		setSigningIn(true);
		try {
			// no toast here: the routing welcomes the person once it knows where they go, "Welcome back!" only for Home
			// (usePostAuthRedirect; a new account's first sign-in goes to Onboarding without it)
			await redirect.signIn(() => signInWithEmail(email.trim(), password));
		} catch (error: unknown) {
			setErrors({ form: authErrorMessage(error, "Sign in failed. Please try again.") });
		} finally {
			setSigningIn(false);
		}
	}

	async function handleSocialSignIn(provider: "google" | "apple") {
		if (signingIn || redirect.pending) return;
		setSigningIn(true);
		setErrors({});
		try {
			// The routing welcomes the person with the destination (usePostAuthRedirect): Home "Welcome back!", an account
			// this sign-in created "Welcome to STAK!" on Onboarding. The refreshed onboarding claim decides, so an existing
			// account linking Google is welcomed back only when it finished onboarding, with the API up or down.
			await redirect.signIn(() => (provider === "apple" ? signInWithApple() : signInWithGoogle()));
		} catch (error: unknown) {
			const code = (error as { code?: string }).code ?? "";
			const cancelled = code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
			if (!cancelled) setErrors({ form: provider === "apple" && code === "auth/operation-not-allowed"
				? "Apple sign-in is not configured for this app yet."
				: authErrorMessage(error, "Sign in failed. Please try again.") });
		} finally {
			setSigningIn(false);
		}
	}

	return (
		// prototype (phone 1:836): Back -> Sign up, PUSH RIGHT 0.3 s
		<AuthLayout formTop={242} backTo="/signup">
			<form onSubmit={handleEmailSignIn} noValidate className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start gap-[14px]">
					<div className="flex w-full flex-col items-start gap-[51px]">
						<AuthHeading title="Welcome back" subtitle="Your deck kept learning while you were away." />
						<div className="flex w-full flex-col items-start gap-[14px]">
							<SocialButton icon={AU.google} labelWidth={142} onClick={() => void handleSocialSignIn("google")} disabled={signingIn || redirect.pending}>
								Continue with Google
							</SocialButton>
							<SocialButton
								icon={AU.apple}
								labelWidth={133}
								onClick={() => void handleSocialSignIn("apple")}
								disabled={signingIn || redirect.pending}
							>
								Continue with Apple
							</SocialButton>
						</div>
					</div>
					<OrDivider />
				</div>
				<div className="flex w-full flex-col items-start gap-[14px]">
					<AuthInput
						type="email"
						name="email"
						autoComplete="email"
						placeholder="Email address"
						value={email}
						invalid={!!errors.email}
						onChange={(e) => {
							setEmail(e.target.value);
							if (errors.email || errors.form) setErrors((p) => ({ ...p, email: undefined, form: undefined }));
						}}
					/>
					<FieldError>{errors.email}</FieldError>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="password"
						autoComplete="current-password"
						placeholder="Password"
						value={password}
						invalid={!!errors.password}
						onChange={(e) => {
							setPassword(e.target.value);
							if (errors.password || errors.form) setErrors((p) => ({ ...p, password: undefined, form: undefined }));
						}}
						right={<ShowToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
					/>
					<FieldError>{errors.password ?? errors.form}</FieldError>
					<TextLink
						to="/forgot-password"
						search={{ email: isEmail(email) ? email.trim() : undefined }}
						viewTransition={false}
						width={102}
					>
						Forgot password?
					</TextLink>
				</div>
				{/* 2:5700: the canon draws "Sign in" in Figma's 45-wide text box (CANON_LABELS) */}
				<PrimaryButton type="submit" disabled={signingIn || redirect.pending} aria-busy={signingIn || redirect.pending}>
					{signingIn ? "Signing in…" : "Sign in"}
				</PrimaryButton>
			</form>
			<AuthRedirectError error={redirect.error} onRetry={redirect.retry} />
			<div className="flex flex-col items-center justify-center gap-[14px]">
				{/* prototype: "Create account" -> Sign up, DISSOLVE 0.35 s */}
				<FootRow text="New to STAK?" textWidth={78} linkLabel="Create account" linkWidth={87} to="/signup" />
			</div>
		</AuthLayout>
	);
}

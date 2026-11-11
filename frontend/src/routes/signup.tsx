import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AU } from "@/app/auth/assets";
import { usePostAuthRedirect } from "@/app/auth/usePostAuthRedirect";
import {
	AUTH_INK,
	AuthHeading,
	AuthInput,
	AuthLayout,
	AuthRedirectError,
	authErrorMessage,
	FieldError,
	FootRow,
	isEmail,
	OrDivider,
	passwordProblem,
	ShowToggle,
	SocialButton,
} from "@/app/auth/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/signup")({
	component: SignUpPage,
});

/** Figma 2:5619 "Desktop · Sign up": visuals from the frame, auth logic from the previous signup page. */
function SignUpPage() {
	const { signUpWithEmail, sendVerificationEmail, signInWithGoogle, signInWithApple } = useAuth();
	const redirect = usePostAuthRedirect();
	const [signingUp, setSigningUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; form?: string }>({});

	async function handleEmailSignUp(e: React.FormEvent) {
		e.preventDefault();
		if (signingUp || redirect.pending) return;
		const next: typeof errors = {};
		if (!isEmail(email)) next.email = "Enter a valid email address";
		const problem = passwordProblem(password);
		if (problem) next.password = problem;
		if (!confirmPassword) next.confirm = "Type your password again";
		else if (password !== confirmPassword) next.confirm = "The passwords do not match";
		setErrors(next);
		if (next.email || next.password || next.confirm) return;
		setSigningUp(true);
		try {
			await signUpWithEmail(email.trim(), password);
			// The shared continuation opens Check your email until this account is verified.
			await sendVerificationEmail();
			// Don't navigate here: the shared continuation handles it once auth state
			// updates with the new user (prevents a stale-user race)
		} catch (error: unknown) {
			setErrors({ form: authErrorMessage(error, "Sign up failed. Please try again.") });
		} finally {
			setSigningUp(false);
		}
	}

	async function handleSocialSignIn(provider: "google" | "apple") {
		if (signingUp || redirect.pending) return;
		setSigningUp(true);
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
			setSigningUp(false);
		}
	}

	const clear = (key: keyof typeof errors) => {
		if (errors[key] || errors.form) setErrors((p) => ({ ...p, [key]: undefined, form: undefined }));
	};

	return (
		// prototype (phone 1:826): Back -> "Onboarding · 01 Welcome", PUSH RIGHT 0.3 s. On the web that intro needs a
		// signed-in account (a visitor is sent to Sign in), and the splash would only time out back to this page, so Back
		// goes to the visitor's welcome: the landing page /welcome, where '/' sends everyone signed out and whose Sign up
		// opened this page (same PUSH RIGHT 0.3 s)
		<AuthLayout formTop={242} backTo="/welcome">
			<form onSubmit={handleEmailSignUp} noValidate className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start gap-[14px]">
					<div className="flex w-full flex-col items-start gap-[51px]">
						<AuthHeading title="Create your account" subtitle="Enter your details below to continue" />
						<div className="flex w-full flex-col items-start gap-[14px]">
							<SocialButton icon={AU.google} labelWidth={142} onClick={() => void handleSocialSignIn("google")} disabled={signingUp || redirect.pending}>
								Continue with Google
							</SocialButton>
							<SocialButton
								icon={AU.apple}
								labelWidth={133}
								onClick={() => void handleSocialSignIn("apple")}
								disabled={signingUp || redirect.pending}
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
							clear("email");
						}}
					/>
					<FieldError>{errors.email}</FieldError>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="password"
						autoComplete="new-password"
						placeholder="Password"
						value={password}
						invalid={!!errors.password}
						onChange={(e) => {
							setPassword(e.target.value);
							clear("password");
						}}
						right={<ShowToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
					/>
					<FieldError>{errors.password}</FieldError>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="confirmPassword"
						autoComplete="new-password"
						placeholder="Confirm Password"
						value={confirmPassword}
						invalid={!!errors.confirm}
						onChange={(e) => {
							setConfirmPassword(e.target.value);
							clear("confirm");
						}}
					/>
					<FieldError>{errors.confirm ?? errors.form}</FieldError>
				</div>
				{/* 2:5654: the canon draws "Create account" in Figma's 101-wide text box (CANON_LABELS) */}
				<PrimaryButton type="submit" disabled={signingUp || redirect.pending} aria-busy={signingUp || redirect.pending}>
					{signingUp ? "Creating account…" : "Create account"}
				</PrimaryButton>
			</form>
			<AuthRedirectError error={redirect.error} onRetry={redirect.retry} />
			<div className="flex flex-col items-center justify-center gap-[14px] whitespace-nowrap">
				{/* prototype: "Sign in" -> Sign in, DISSOLVE 0.35 s */}
				<FootRow text="Already have an account?" textWidth={142} linkLabel="Sign in" linkWidth={39} to="/login" />
				{/* 2:5660: Figma's 257 box on one line. Below 1024 the box is the line's own width, at most the column's, so a
				    column narrower than the line (a 280 phone: 248) wraps it at Figma's size into two balanced lines, centred
				    under the foot row, instead of clipping its ends (a fixed 257 also held the whole footer at 257). */}
				<p
					className={cn(
						"w-[257px] font-geist text-[10px] leading-[13px] text-[#819abb] max-lg:w-auto max-lg:max-w-full max-lg:whitespace-normal max-lg:text-balance max-lg:text-center",
						AUTH_INK.muted,
					)}
				>
					By continuing you agree to the Terms and Privacy Policy.
				</p>
			</div>
		</AuthLayout>
	);
}

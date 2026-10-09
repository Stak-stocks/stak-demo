import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AU } from "@/app/auth/assets";
import {
	AuthHeading,
	AuthInput,
	AuthLayout,
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
import { getProfile } from "@/lib/api";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/signup")({
	component: SignUpPage,
});

/** Figma 2:5619 "Desktop · Sign up": visuals from the frame, auth logic from the previous signup page. */
function SignUpPage() {
	const { user, loading, signUpWithEmail, sendVerificationEmail, signInWithGoogle, logout } = useAuth();
	const navigate = useNavigate();
	const [signingUp, setSigningUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; form?: string }>({});

	useEffect(() => {
		if (!loading && user) {
			user
				.getIdToken(true)
				.then(() => getProfile())
				.then(() => user.getIdToken(true))
				.then(() => user.getIdTokenResult())
				.then((result) => {
					const done = result.claims.onboardingCompleted === true;
					navigate({ to: done ? "/home" : "/onboarding" });
				})
				.catch(() => {
					logout().catch(() => {});
				});
		}
	}, [user, loading, navigate, logout]);

	async function handleEmailSignUp(e: React.FormEvent) {
		e.preventDefault();
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
			// The verification email still goes out; the user continues to onboarding without a verify screen.
			await sendVerificationEmail();
			// Don't navigate here: the effect above handles it once auth state
			// updates with the new user (prevents a stale-user race)
		} catch (error: unknown) {
			setErrors({ form: authErrorMessage(error, "Sign up failed. Please try again.") });
			setSigningUp(false);
		}
	}

	async function handleGoogleSignIn() {
		setSigningUp(true);
		try {
			const { isNew, uid } = await signInWithGoogle();
			if (isNew) {
				const lastUid = localStorage.getItem("last-user-uid");
				const isLinking = !!lastUid && lastUid === uid;
				if (isLinking) {
					try {
						const profile = await getProfile();
						if (profile.onboardingCompleted) {
							toast.success("Welcome back!");
							return;
						}
					} catch {
						/* fall through to new user */
					}
				}
				toast.success("Welcome to STAK!");
			} else {
				toast.success("Welcome back!");
			}
		} catch (error: unknown) {
			const code = (error as { code?: string }).code ?? "";
			const cancelled = code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
			if (!cancelled) setErrors({ form: authErrorMessage(error, "Sign in failed. Please try again.") });
		} finally {
			setSigningUp(false);
		}
	}

	const clear = (key: keyof typeof errors) => {
		if (errors[key] || errors.form) setErrors((p) => ({ ...p, [key]: undefined, form: undefined }));
	};

	return (
		<AuthLayout formTop={242}>
			<form onSubmit={handleEmailSignUp} noValidate className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start gap-[14px]">
					<div className="flex w-full flex-col items-start gap-[51px]">
						<AuthHeading title="Create your account" subtitle="Enter your details below to continue" />
						<div className="flex w-full flex-col items-start gap-[14px]">
							<SocialButton icon={AU.google} onClick={handleGoogleSignIn} disabled={signingUp}>
								Continue with Google
							</SocialButton>
							<SocialButton icon={AU.apple} onClick={() => toast.info("Apple sign-in is not available yet")} disabled={signingUp}>
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
				<PrimaryButton type="submit" disabled={signingUp} aria-busy={signingUp}>
					{signingUp ? "Creating account…" : "Create account"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center gap-[14px] whitespace-nowrap">
				<FootRow text="Already have an account?" linkLabel="Sign in" to="/login" />
				<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">By continuing you agree to the Terms and Privacy Policy.</p>
			</div>
		</AuthLayout>
	);
}

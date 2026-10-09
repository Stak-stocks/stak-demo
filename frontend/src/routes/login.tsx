import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
	ShowToggle,
	SocialButton,
} from "@/app/auth/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { getProfile } from "@/lib/api";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

/** Figma 2:5664 "Desktop · Sign in": visuals from the frame, auth logic from the previous login page. */
function LoginPage() {
	const { user, loading, signInWithGoogle, signInWithEmail, logout } = useAuth();
	const navigate = useNavigate();
	const [signingIn, setSigningIn] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

	useEffect(() => {
		if (!loading && user) {
			// Force-refresh the token to detect if the account was deleted server-side
			// (Firebase keeps the client session alive for up to 1 hour after deletion),
			// then read fresh claims, which avoids stale React state from the previous onAuthStateChanged call.
			user
				.getIdToken(true)
				.then(() => getProfile().catch(() => {}))
				.then(() => user.getIdToken(true))
				.then(() => user.getIdTokenResult())
				.then((result) => {
					const done = result.claims.onboardingCompleted === true;
					navigate({ to: done ? "/home" : "/onboarding" });
				})
				.catch(() => {
					// Token refresh failed: account was deleted or disabled on the server
					logout().catch(() => {});
				});
		}
	}, [user, loading, navigate, logout]);

	async function handleEmailSignIn(e: React.FormEvent) {
		e.preventDefault();
		const next: typeof errors = {};
		if (!isEmail(email)) next.email = "Enter the email you signed up with";
		if (!password) next.password = "Enter your password";
		setErrors(next);
		if (next.email || next.password) return;
		setSigningIn(true);
		try {
			await signInWithEmail(email.trim(), password);
			toast.success("Welcome back!");
		} catch (error: unknown) {
			setErrors({ form: authErrorMessage(error, "Sign in failed. Please try again.") });
			setSigningIn(false);
		}
	}

	async function handleGoogleSignIn() {
		setSigningIn(true);
		try {
			const { isNew, uid } = await signInWithGoogle();
			if (isNew) {
				const lastUid = localStorage.getItem("last-user-uid");
				// If the UID matches a previous session, this is an existing email/password
				// user linking their Google account: check the profile before overwriting.
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
			setSigningIn(false);
		}
	}

	return (
		<AuthLayout formTop={242} backTo="/signup">
			<form onSubmit={handleEmailSignIn} noValidate className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start gap-[14px]">
					<div className="flex w-full flex-col items-start gap-[51px]">
						<AuthHeading title="Welcome back" subtitle="Your deck kept learning while you were away." />
						<div className="flex w-full flex-col items-start gap-[14px]">
							<SocialButton icon={AU.google} onClick={handleGoogleSignIn} disabled={signingIn}>
								Continue with Google
							</SocialButton>
							<SocialButton icon={AU.apple} onClick={() => toast.info("Apple sign-in is not available yet")} disabled={signingIn}>
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
					<Link
						to="/forgot-password"
						search={{ email: isEmail(email) ? email.trim() : undefined }}
						className="stak-press whitespace-nowrap rounded-[4px] font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]"
					>
						Forgot password?
					</Link>
				</div>
				<PrimaryButton type="submit" disabled={signingIn} aria-busy={signingIn}>
					{signingIn ? "Signing in…" : "Sign in"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center gap-[14px]">
				<FootRow text="New to STAK?" linkLabel="Create account" to="/signup" />
			</div>
		</AuthLayout>
	);
}

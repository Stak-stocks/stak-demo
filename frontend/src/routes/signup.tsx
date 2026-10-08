import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AU } from "@/app/auth/assets";
import { AuthHeading, AuthInput, AuthLayout, FootRow, OrDivider, PrimaryButton, ShowToggle, SocialButton } from "@/app/auth/ui";
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
		if (!email || !password || !confirmPassword) return;
		if (password !== confirmPassword) {
			toast.error("Passwords don't match");
			return;
		}
		if (password.length < 6) {
			toast.error("Password must be at least 6 characters");
			return;
		}
		setSigningUp(true);
		try {
			await signUpWithEmail(email, password);
			// The verification email still goes out; the user continues to onboarding without a verify screen.
			await sendVerificationEmail();
			// Don't navigate here: the effect above handles it once auth state
			// updates with the new user (prevents a stale-user race)
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "";
			if (message.includes("email-already-in-use")) {
				toast.error("Email already in use. Try signing in instead.");
			} else if (message.includes("weak-password")) {
				toast.error("Password is too weak. Use at least 6 characters.");
			} else if (message.includes("invalid-email")) {
				toast.error("Invalid email address");
			} else {
				toast.error("Sign up failed. Please try again.");
			}
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
			if (!cancelled) toast.error("Sign in failed. Please try again.");
		} finally {
			setSigningUp(false);
		}
	}

	return (
		<AuthLayout formTop={242}>
			<form onSubmit={handleEmailSignUp} className="flex w-full flex-col items-start gap-[30px]">
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
						onChange={(e) => setEmail(e.target.value)}
					/>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="password"
						autoComplete="new-password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						right={<ShowToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
					/>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="confirmPassword"
						autoComplete="new-password"
						placeholder="Confirm Password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>
				</div>
				<PrimaryButton type="submit" disabled={signingUp || !email || !password || !confirmPassword}>
					{signingUp ? "Creating account..." : "Create account"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center gap-[14px] whitespace-nowrap">
				<FootRow text="Already have an account?" linkLabel="Sign in" to="/login" />
				<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">By continuing you agree to the Terms and Privacy Policy.</p>
			</div>
		</AuthLayout>
	);
}

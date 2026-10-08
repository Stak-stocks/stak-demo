import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AU } from "@/app/auth/assets";
import { AuthHeading, AuthInput, AuthLayout, FootRow, OrDivider, PrimaryButton, ShowToggle, SocialButton } from "@/app/auth/ui";
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
		if (!email || !password) return;
		setSigningIn(true);
		try {
			await signInWithEmail(email, password);
			toast.success("Welcome back!");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "";
			if (message.includes("user-not-found") || message.includes("invalid-credential")) {
				toast.error("Invalid email or password");
			} else if (message.includes("wrong-password")) {
				toast.error("Wrong password");
			} else {
				toast.error("Sign in failed. Please try again.");
			}
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
			if (!cancelled) toast.error("Sign in failed. Please try again.");
		} finally {
			setSigningIn(false);
		}
	}

	return (
		<AuthLayout formTop={242} backTo="/signup">
			<form onSubmit={handleEmailSignIn} className="flex w-full flex-col items-start gap-[30px]">
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
						onChange={(e) => setEmail(e.target.value)}
					/>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="password"
						autoComplete="current-password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						right={<ShowToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
					/>
					<Link to="/forgot-password" className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]">
						Forgot password?
					</Link>
				</div>
				<PrimaryButton type="submit" disabled={signingIn || !email || !password}>
					{signingIn ? "Signing in..." : "Sign in"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center gap-[14px]">
				<FootRow text="New to STAK?" linkLabel="Create account" to="/signup" />
			</div>
		</AuthLayout>
	);
}

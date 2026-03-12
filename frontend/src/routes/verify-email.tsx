import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { auth } from "../lib/firebase";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { toast } from "sonner";
import StakLogoIcon from "@/assets/stak-logo-icon.svg?react";

export const Route = createFileRoute("/verify-email")({
	component: VerifyEmailPage,
});

function VerifyEmailPage() {
	const { user, loading, sendVerificationEmail, logout } = useAuth();
	const navigate = useNavigate();
	const [cooldown, setCooldown] = useState(0);
	const [checking, setChecking] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [pendingCode, setPendingCode] = useState<string | null>(null);
	// null = still checking, true = valid, false = expired/invalid
	const [codeValid, setCodeValid] = useState<boolean | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// Set synchronously before location.replace so the guard doesn't race it
	const dispatchingRef = useRef(false);

	// Firebase sends all action-handler links to this page (it's the Console action URL).
	// Dispatch non-verification modes to their correct pages before auth state resolves.
	// Also restore pendingCode from sessionStorage after a page refresh.
	useEffect(() => {
		const params = new URLSearchParams(globalThis.location.search);
		const mode = params.get("mode");
		const oobCode = params.get("oobCode");

		if (oobCode) {
			if (mode === "resetPassword" || mode === "recoverEmail") {
				dispatchingRef.current = true; // prevent guard from redirecting to /signup
				globalThis.location.replace(`/reset-password?${params.toString()}`);
				return;
			}
			if (mode === "verifyEmail") {
				globalThis.history.replaceState({}, "", globalThis.location.pathname);
				sessionStorage.setItem("pendingVerifyCode", oobCode); // sync — guard reads this
				setPendingCode(oobCode);
				return;
			}
		}

		// Restore after refresh
		const stored = sessionStorage.getItem("pendingVerifyCode");
		if (stored) setPendingCode(stored);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Eagerly check if the pendingCode is still valid — gives immediate expired feedback
	// instead of making the user click the button to find out.
	useEffect(() => {
		if (!pendingCode) return;
		checkActionCode(auth, pendingCode)
			.then(() => setCodeValid(true))
			.catch(() => {
				sessionStorage.removeItem("pendingVerifyCode");
				setCodeValid(false);
			});
	}, [pendingCode]);

	// Only redirect to /signup if there is no user and no pending verification code.
	// Check sessionStorage directly (sync) to avoid racing setPendingCode's async state update.
	useEffect(() => {
		if (loading) return;
		if (dispatchingRef.current) return;
		if (!user && !pendingCode && !sessionStorage.getItem("pendingVerifyCode")) {
			navigate({ to: "/signup" });
		}
	}, [user, loading, pendingCode, navigate]);

	// Poll — runs an immediate check on mount, then every 3 s.
	// Skipped when the user arrived via email link (pendingCode set) — they must
	// click the Verify button first. Resumes after they do.
	// Also check sessionStorage directly to avoid racing setPendingCode's async state update.
	useEffect(() => {
		if (!user || pendingCode || sessionStorage.getItem("pendingVerifyCode") || dispatchingRef.current) return;

		async function check() {
			try {
				await auth.currentUser?.reload();
				if (auth.currentUser?.emailVerified) {
					clearInterval(pollRef.current!);
					// Force-refresh JWT so backend sees email_verified: true
					await auth.currentUser.getIdToken(true);
					toast.success("Email verified! Welcome to STAK!");
					navigate({ to: "/onboarding" });
				}
			} catch (err: unknown) {
				// Account was deleted (cleanup job ran or user deleted manually)
				const code = (err as { code?: string }).code ?? "";
				if (code === "auth/user-token-expired" || code === "auth/user-not-found") {
					clearInterval(pollRef.current!);
					toast.error("Verification window expired. Please sign up again.");
					await logout();
					navigate({ to: "/signup" });
				}
			}
		}

		check(); // immediate check — no 3 s wait on first load
		pollRef.current = setInterval(check, 3000);
		return () => { if (pollRef.current) clearInterval(pollRef.current); };
	}, [user, pendingCode, navigate, logout]);

	// Cooldown countdown
	useEffect(() => {
		if (cooldown <= 0) return;
		const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
		return () => clearTimeout(t);
	}, [cooldown]);

	async function handleResend() {
		if (cooldown > 0) return;
		try {
			await sendVerificationEmail();
			setCooldown(60);
			toast.success("Verification email resent!");
		} catch {
			toast.error("Couldn't resend. Please try again.");
		}
	}

	async function handleCheckNow() {
		setChecking(true);
		try {
			await auth.currentUser?.reload();
			if (auth.currentUser?.emailVerified) {
				// Force-refresh JWT so backend sees email_verified: true
				await auth.currentUser.getIdToken(true);
				toast.success("Email verified! Welcome to STAK!");
				navigate({ to: "/onboarding" });
			} else {
				toast.error("Not verified yet — check your inbox.");
			}
		} catch (err: unknown) {
			const code = (err as { code?: string }).code ?? "";
			if (code === "auth/user-token-expired" || code === "auth/user-not-found") {
				toast.error("Verification window expired. Please sign up again.");
				await logout();
				navigate({ to: "/signup" });
			}
		} finally {
			setChecking(false);
		}
	}

	async function handleVerifyNow() {
		if (!pendingCode) return;
		setVerifying(true);
		try {
			await applyActionCode(auth, pendingCode);
			sessionStorage.removeItem("pendingVerifyCode");
			if (auth.currentUser) {
				await auth.currentUser.reload();
				await auth.currentUser.getIdToken(true);
				toast.success("Email verified! Welcome to STAK!");
				navigate({ to: "/onboarding" });
			} else {
				// Opened link in a different browser — email is verified server-side,
				// user just needs to sign in now.
				toast.success("Email verified! Sign in to get started.");
				navigate({ to: "/login" });
			}
		} catch (err: unknown) {
			const code = (err as { code?: string }).code ?? "";
			if (code === "auth/invalid-action-code") {
				toast.error("Verification link expired or already used.");
			} else {
				toast.error("Verification failed. Please try again.");
			}
			sessionStorage.removeItem("pendingVerifyCode");
			setPendingCode(null);
		} finally {
			setVerifying(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0f1629]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	// Arrived via email link — check validity then show appropriate UI.
	// Works whether or not the user is logged in (applyActionCode is auth-agnostic).
	if (pendingCode) {
		// Still checking — show spinner
		if (codeValid === null) {
			return (
				<div className="flex items-center justify-center min-h-screen bg-[#0f1629]">
					<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
				</div>
			);
		}

		// Expired or already used
		if (codeValid === false) {
			return (
				<div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6">
					<div className="absolute top-5 left-6 flex items-center gap-2">
						<StakLogoIcon width={28} height={28} />
						<span className="text-white text-base font-bold tracking-wider">STAK</span>
					</div>
					<div className="w-full max-w-sm text-center space-y-6">
						<div className="flex justify-center">
							<div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
								<svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
								</svg>
							</div>
						</div>
						<div>
							<h1 className="text-2xl font-bold text-white">Link expired</h1>
							<p className="text-slate-400 mt-2 text-sm leading-relaxed">
								This verification link has expired or has already been used.
								Request a new one below.
							</p>
						</div>
						{user ? (
							<button
								type="button"
								onClick={async () => {
									setPendingCode(null);
									await handleResend();
								}}
								className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
							>
								Send a new verification email
							</button>
						) : (
							<button
								type="button"
								onClick={() => navigate({ to: "/login" })}
								className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
							>
								Sign in to resend
							</button>
						)}
					</div>
				</div>
			);
		}

		// Valid — show confirmation button
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6">
				<div className="absolute top-5 left-6 flex items-center gap-2">
					<StakLogoIcon width={28} height={28} />
					<span className="text-white text-base font-bold tracking-wider">STAK</span>
				</div>

				<div className="w-full max-w-sm text-center space-y-6">
					<div className="flex justify-center">
						<div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
							<svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>

					<div>
						<h1 className="text-2xl font-bold text-white">Almost there!</h1>
						<p className="text-slate-400 mt-2 text-sm leading-relaxed">
							Tap the button below to confirm your email address
							{user && <>{" "}<span className="text-white font-medium">{user.email}</span></>}
							{" "}and get started.
						</p>
					</div>

					<button
						type="button"
						onClick={handleVerifyNow}
						disabled={verifying}
						className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-green-500/25"
					>
						{verifying ? (
							<div className="flex items-center justify-center gap-2">
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
								Verifying...
							</div>
						) : (
							"Verify my email →"
						)}
					</button>
				</div>
			</div>
		);
	}

	if (!user) return null;

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6">
			{/* Logo */}
			<div className="absolute top-5 left-6 flex items-center gap-2">
				<StakLogoIcon width={28} height={28} />
				<span className="text-white text-base font-bold tracking-wider">STAK</span>
			</div>

			<div className="w-full max-w-sm text-center space-y-6">
				{/* Icon */}
				<div className="flex justify-center">
					<div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
						<svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
						</svg>
					</div>
				</div>

				<div>
					<h1 className="text-2xl font-bold text-white">Check your inbox</h1>
					<p className="text-slate-400 mt-2 text-sm leading-relaxed">
						We sent a verification link to{" "}
						<span className="text-white font-medium">{user.email}</span>.
						Click it to activate your account.
					</p>
				</div>

				{/* Primary action */}
				<button
					type="button"
					onClick={handleCheckNow}
					disabled={checking}
					className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-orange-500/25"
				>
					{checking ? (
						<div className="flex items-center justify-center gap-2">
							<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							Checking...
						</div>
					) : (
						"I've verified, continue →"
					)}
				</button>

				{/* Resend */}
				<button
					type="button"
					onClick={handleResend}
					disabled={cooldown > 0}
					className="w-full py-3 rounded-xl font-medium text-slate-300 border border-slate-700 hover:border-slate-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
				</button>

				{/* Sign out */}
				<button
					type="button"
					onClick={async () => { await logout(); navigate({ to: "/signup" }); }}
					className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
				>
					Wrong email? Sign out and try again
				</button>
			</div>
		</div>
	);
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { auth } from "../lib/firebase";
import { applyActionCode } from "firebase/auth";
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
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// If Firebase redirected here with an oobCode (action handler flow), apply it
	// immediately. The poll below will detect emailVerified=true within 3 s.
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("mode") !== "verifyEmail" || !params.get("oobCode")) return;
		const oobCode = params.get("oobCode")!;
		// Clean up URL so the code isn't reused on refresh
		window.history.replaceState({}, "", window.location.pathname);
		applyActionCode(auth, oobCode).catch((err: unknown) => {
			const code = (err as { code?: string }).code ?? "";
			if (code === "auth/invalid-action-code") {
				toast.error("Verification link expired or already used.");
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Only redirect to /signup if there is no user.
	// Do NOT redirect to /onboarding here — the poll below handles that via a
	// fresh reload() from Firebase's servers, which prevents acting on stale
	// React state (the Firebase User object is mutable; cached emailVerified
	// values can be wrong right after account creation).
	useEffect(() => {
		if (loading) return;
		if (!user) navigate({ to: "/signup" });
	}, [user, loading, navigate]);

	// Poll — runs an immediate check on mount, then every 3 s.
	// This is the ONLY code path that navigates to /onboarding.
	// Always starts (regardless of user.emailVerified in React state) so that
	// already-verified users are handled correctly too.
	useEffect(() => {
		if (!user) return;

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
	}, [user, navigate, logout]);

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

	if (loading || !user) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0f1629]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

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

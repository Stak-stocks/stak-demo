import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FloatingBrands } from "@/components/FloatingBrands";
import { StakLogo } from "@/components/StakLogo";
import { applyActionCode } from "firebase/auth";
import { auth } from "../lib/firebase";
import { supabase } from "../lib/supabase";
import { completeMigration } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>) => ({
		mode: (search.mode as string) || "",
		oobCode: (search.oobCode as string) || "",
		continueUrl: (search.continueUrl as string) || "",
		// Supabase password recovery params
		token_hash: (search.token_hash as string) || "",
		type: (search.type as string) || "",
		supabase_recovery: (search.supabase_recovery as string) || "",
	}),
});

function ResetPasswordPage() {
	const { mode, oobCode, continueUrl, token_hash, type, supabase_recovery } = Route.useSearch();
	const { verifyResetCode, confirmReset, confirmResetSupabase } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [verifying, setVerifying] = useState(true);
	const [email, setEmail] = useState("");
	const [invalidCode, setInvalidCode] = useState(false);

	// Detect Supabase recovery:
	// - token_hash + type=recovery: scanner-safe direct link (email template sends user here;
	//   scanners click it but don't execute JS, so verifyOtp is never called, token survives)
	// - supabase_recovery=1: PKCE redirectTo flow (legacy path, kept for backward compat)
	// - hash params: implicit flow fallback
	const hashParams = new URLSearchParams(window.location.hash.substring(1));
	const isTokenHashFlow = !!token_hash && type === "recovery";
	const isSupabaseReset = isTokenHashFlow
		|| supabase_recovery === "1"
		|| hashParams.get("type") === "recovery"
		|| hashParams.has("error_code");

	useEffect(() => {
		if (isSupabaseReset) {
			// Show error immediately if Supabase returned an error in the hash
			if (hashParams.has("error_code")) {
				setInvalidCode(true);
				setVerifying(false);
				return;
			}

			// token_hash flow: call verifyOtp explicitly. Scanners can't consume the token
			// because they don't execute JS -- the token only gets used when this runs.
			if (isTokenHashFlow) {
				console.log("[reset-password] token_hash flow", { token_hash, type });
				supabase.auth.verifyOtp({ token_hash, type: "recovery" })
					.then(({ data, error }) => {
						console.log("[reset-password] verifyOtp result", { error, session: data.session });
						if (error || !data.session?.user.email) {
							setInvalidCode(true);
							setVerifying(false);
						} else {
							setEmail(data.session.user.email);
							setVerifying(false);
						}
					});
				return;
			}

			// PKCE flow: Supabase appends ?code=xxx to the redirectTo URL. Call
			// exchangeCodeForSession explicitly rather than relying on detectSessionInUrl,
			// which fires before the component mounts and emits PASSWORD_RECOVERY before
			// we can register a listener -- causing the 15-second timeout to fire instead.
			// If detectSessionInUrl already ran and exchanged the code, the explicit call
			// will fail; the getSession() fallback catches that case.
			const urlCode = new URLSearchParams(window.location.search).get("code");
			if (urlCode) {
				supabase.auth.exchangeCodeForSession(urlCode)
					.then(async ({ data, error }) => {
						if (!error && data.session?.user.email) {
							setEmail(data.session.user.email);
							setVerifying(false);
							return;
						}
						// detectSessionInUrl may have already exchanged the code; check session
						const { data: existing } = await supabase.auth.getSession();
						if (existing.session?.user.email) {
							setEmail(existing.session.user.email);
							setVerifying(false);
						} else {
							setInvalidCode(true);
							setVerifying(false);
						}
					});
				return;
			}

			// Implicit flow fallback (?code absent, session arrives via URL hash)
			const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
				if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.user.email) {
					setEmail(session.user.email);
					setVerifying(false);
					listener.subscription.unsubscribe();
				}
			});

			supabase.auth.getSession().then(({ data }) => {
				if (data.session?.user.email) {
					setEmail(data.session.user.email);
					setVerifying(false);
					listener.subscription.unsubscribe();
				}
			});

			const t = setTimeout(() => {
				setInvalidCode(true);
				setVerifying(false);
				listener.subscription.unsubscribe();
			}, 15000);

			return () => { clearTimeout(t); listener.subscription.unsubscribe(); };
		}

		if (!oobCode) {
			setInvalidCode(true);
			setVerifying(false);
			return;
		}

		// Email verification link from Firebase
		if (mode === "verifyEmail") {
			applyActionCode(auth, oobCode)
				.then(() => {
					toast.success("Email verified! Welcome to STAK!");
					if (continueUrl) {
						window.location.href = continueUrl;
					} else {
						navigate({ to: "/verify-email" });
					}
				})
				.catch(() => {
					setInvalidCode(true);
					setVerifying(false);
				});
			return;
		}

		verifyResetCode(oobCode)
			.then((userEmail) => {
				setEmail(userEmail);
				setVerifying(false);
			})
			.catch(() => {
				setInvalidCode(true);
				setVerifying(false);
			});
	}, [mode, oobCode, isSupabaseReset, isTokenHashFlow, token_hash, verifyResetCode, navigate]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!password || !confirmPassword) return;
		if (password !== confirmPassword) {
			toast.error("Passwords don't match");
			return;
		}
		if (password.length < 6) {
			toast.error("Password must be at least 6 characters");
			return;
		}
		setResetting(true);
		try {
			if (isSupabaseReset) {
				await confirmResetSupabase(password);
				// Flip migration_status from requires_password_reset → supabase so future
				// logins don't show the reset gate again.
				await completeMigration().catch(() => {});
				// Navigate to / not /login -- the Supabase session is already active after
				// confirmResetSupabase, so /login would immediately redirect back anyway.
				toast.success("Password updated! You're now signed in.");
				navigate({ to: "/" });
				return;
			} else {
				await confirmReset(oobCode, password);
			}
			toast.success("Password reset! You can now sign in.");
			navigate({ to: "/login" });
		} catch {
			toast.error("Failed to reset password. The link may have expired.");
			setResetting(false);
		}
	}

	if (verifying) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0f1629]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6 overflow-hidden">
			<FloatingBrands />

			<div className="relative z-10 w-full max-w-sm space-y-6 text-center">
				{/* Logo */}
				<div className="flex items-center justify-center gap-2 mb-2">
					<StakLogo size={32} />
					<span className="text-foreground text-2xl font-bold tracking-wider">STAK</span>
				</div>

				{invalidCode ? (
					<div className="space-y-4">
						<h1 className="text-[26px] font-extrabold text-foreground">Invalid Link</h1>
						<p className="dark:text-slate-400 text-slate-500">
							This password reset link is invalid or has expired.
						</p>
						<Link
							to="/forgot-password"
							className="block w-full py-3.5 rounded-xl font-semibold text-foreground bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
						>
							Request a new link
						</Link>
					</div>
				) : (
					<>
						<div>
							<h1 className="text-[26px] font-extrabold text-foreground">New Password</h1>
							<p className="dark:text-slate-400 text-slate-500 mt-1">
								Enter a new password for <strong className="dark:text-slate-300 text-slate-600">{email}</strong>
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4 text-left">
							<div>
								<label htmlFor="new-password" className="block text-sm dark:text-slate-400 text-slate-500 mb-1.5">New Password</label>
								<div className="relative">
									<input
										id="new-password"
										type={showPassword ? "text" : "password"}
										placeholder="At least 6 characters"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 border-slate-200 text-foreground placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors pr-12"
										autoFocus
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:dark:text-slate-300 text-slate-600"
									>
										{showPassword ? (
											<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
											</svg>
										) : (
											<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										)}
									</button>
								</div>
							</div>

							<div>
								<label htmlFor="confirm-new-password" className="block text-sm dark:text-slate-400 text-slate-500 mb-1.5">Confirm Password</label>
								<input
									id="confirm-new-password"
									type={showPassword ? "text" : "password"}
									placeholder="Confirm new password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 border-slate-200 text-foreground placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
								/>
							</div>

							<button
								type="submit"
								disabled={resetting || !password || !confirmPassword}
								className="w-full py-3.5 rounded-xl font-semibold text-foreground bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
							>
								{resetting ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
										Resetting...
									</div>
								) : (
									"Reset Password"
								)}
							</button>
						</form>
					</>
				)}

				<p className="dark:text-slate-400 text-slate-500 text-sm pt-2">
					<Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
						Back to Sign In
					</Link>
				</p>
			</div>
		</div>
	);
}

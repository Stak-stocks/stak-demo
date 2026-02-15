import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FloatingBrands } from "@/components/FloatingBrands";
import { updateProfile } from "@/lib/api";

export const Route = createFileRoute("/signup")({
	component: SignUpPage,
});

function SignUpPage() {
	const { user, loading, signUpWithEmail, signInWithGoogle } = useAuth();
	const navigate = useNavigate();
	const [signingUp, setSigningUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		if (!loading && user) {
			if (localStorage.getItem("onboardingCompleted") === "false") {
				navigate({ to: "/onboarding" });
			} else {
				navigate({ to: "/" });
			}
		}
	}, [user, loading, navigate]);

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
			localStorage.setItem("onboardingCompleted", "false");
			await signUpWithEmail(email, password);
			updateProfile({ onboardingCompleted: false }).catch(() => {});
			toast.success("Account created! Welcome to STAK!");
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
			localStorage.setItem("onboardingCompleted", "false");
			await signInWithGoogle();
			updateProfile({ onboardingCompleted: false }).catch(() => {});
			toast.success("Welcome to STAK!");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "";
			if (!message.includes("popup-closed-by-user")) {
				toast.error("Sign in failed. Please try again.");
			}
			setSigningUp(false);
		}
	}

	if (loading) {
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
				{/* Heading */}
				<div>
					<h1 className="text-3xl font-bold text-white">Create Account</h1>
					<p className="text-slate-400 mt-1">Start building your stak</p>
				</div>

				{/* Form */}
				<form onSubmit={handleEmailSignUp} className="space-y-4 text-left">
					<div>
						<label htmlFor="email" className="block text-sm text-slate-400 mb-1.5">Email</label>
						<input
							id="email"
							type="email"
							placeholder="Email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
						/>
					</div>

					<div>
						<label htmlFor="password" className="block text-sm text-slate-400 mb-1.5">Password</label>
						<div className="relative">
							<input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="At least 6 characters"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors pr-12"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
						<label htmlFor="confirmPassword" className="block text-sm text-slate-400 mb-1.5">Confirm Password</label>
						<input
							id="confirmPassword"
							type={showPassword ? "text" : "password"}
							placeholder="Confirm password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
						/>
					</div>

					{/* Sign Up Button */}
					<button
						type="submit"
						disabled={signingUp || !email || !password || !confirmPassword}
						className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
					>
						{signingUp ? (
							<div className="flex items-center justify-center gap-2">
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
								Creating account...
							</div>
						) : (
							"Sign Up"
						)}
					</button>
				</form>

				{/* Divider */}
				<div className="flex items-center gap-3">
					<div className="flex-1 h-px bg-slate-700" />
					<span className="text-sm text-slate-500">or continue with</span>
					<div className="flex-1 h-px bg-slate-700" />
				</div>

				{/* Social Buttons */}
				<div className="space-y-3">
					<button
						type="button"
						onClick={handleGoogleSignIn}
						disabled={signingUp}
						className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#1a2332] border border-slate-700 text-white font-medium hover:bg-[#1f2b3d] transition-all active:scale-[0.98] disabled:opacity-50"
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
						</svg>
						Sign up with Google
					</button>

				</div>

				{/* Sign In Link */}
				<p className="text-slate-400 text-sm pt-2">
					Already have an account?{" "}
					<Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}

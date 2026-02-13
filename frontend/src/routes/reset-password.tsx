import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FloatingBrands } from "@/components/FloatingBrands";

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>) => ({
		oobCode: (search.oobCode as string) || "",
	}),
});

function ResetPasswordPage() {
	const { oobCode } = Route.useSearch();
	const { verifyResetCode, confirmReset } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [verifying, setVerifying] = useState(true);
	const [email, setEmail] = useState("");
	const [invalidCode, setInvalidCode] = useState(false);

	useEffect(() => {
		if (!oobCode) {
			setInvalidCode(true);
			setVerifying(false);
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
	}, [oobCode, verifyResetCode]);

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
			await confirmReset(oobCode, password);
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
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
						<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
						<path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
					<span className="text-white text-2xl font-bold tracking-wider">STAK</span>
				</div>

				{invalidCode ? (
					<div className="space-y-4">
						<h1 className="text-3xl font-bold text-white">Invalid Link</h1>
						<p className="text-slate-400">
							This password reset link is invalid or has expired.
						</p>
						<Link
							to="/forgot-password"
							className="block w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
						>
							Request a new link
						</Link>
					</div>
				) : (
					<>
						<div>
							<h1 className="text-3xl font-bold text-white">New Password</h1>
							<p className="text-slate-400 mt-1">
								Enter a new password for <strong className="text-slate-300">{email}</strong>
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4 text-left">
							<div>
								<label htmlFor="new-password" className="block text-sm text-slate-400 mb-1.5">New Password</label>
								<div className="relative">
									<input
										id="new-password"
										type={showPassword ? "text" : "password"}
										placeholder="At least 6 characters"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors pr-12"
										autoFocus
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
								<label htmlFor="confirm-new-password" className="block text-sm text-slate-400 mb-1.5">Confirm Password</label>
								<input
									id="confirm-new-password"
									type={showPassword ? "text" : "password"}
									placeholder="Confirm new password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
								/>
							</div>

							<button
								type="submit"
								disabled={resetting || !password || !confirmPassword}
								className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
							>
								{resetting ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										Resetting...
									</div>
								) : (
									"Reset Password"
								)}
							</button>
						</form>
					</>
				)}

				<p className="text-slate-400 text-sm pt-2">
					<Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
						Back to Sign In
					</Link>
				</p>
			</div>
		</div>
	);
}

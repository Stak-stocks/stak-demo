import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingBrands } from "@/components/FloatingBrands";
import StakLogoIcon from "@/assets/stak-logo-icon.svg?react";

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const { resetPassword } = useAuth();
	const [email, setEmail] = useState("");
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!email) return;
		setSending(true);
		try {
			await resetPassword(email);
			setSent(true);
			toast.success("Reset email sent!");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "";
			if (message.includes("invalid-email")) {
				toast.error("Invalid email address");
			} else {
				toast.error("Failed to send reset email. Try again.");
			}
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6 overflow-hidden">
			<FloatingBrands />

			<div className="relative z-10 w-full max-w-sm space-y-6 text-center">
				{/* Logo */}
				<div className="flex items-center justify-center gap-2 mb-2">
					<StakLogoIcon width={32} height={32} />
					<span className="text-white text-2xl font-bold tracking-wider">STAK</span>
				</div>

				{/* Heading */}
				<div>
					<h1 className="text-3xl font-bold text-white">Reset Password</h1>
					<p className="text-slate-400 mt-1">
						{sent
							? "Check your inbox for the reset link"
							: "Enter your email to receive a reset link"}
					</p>
				</div>

				{sent && (
					<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
						<p className="text-emerald-400 text-sm">
							If an account exists for <strong>{email}</strong>, we sent a reset link. Check your inbox and spam folder.
						</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4 text-left">
					<div>
						<label htmlFor="reset-email" className="block text-sm text-slate-400 mb-1.5">
							{sent ? "Wrong email? Enter the correct one" : "Email"}
						</label>
						<input
							id="reset-email"
							type="email"
							placeholder="Enter your email"
							value={email}
							onChange={(e) => { setEmail(e.target.value); setSent(false); }}
							className="w-full px-4 py-3 rounded-xl bg-[#1a2332] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
							autoFocus
						/>
					</div>

					<button
						type="submit"
						disabled={sending || !email}
						className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
					>
						{sending ? (
							<div className="flex items-center justify-center gap-2">
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
								Sending...
							</div>
						) : sent ? (
							"Resend Link"
						) : (
							"Send Reset Link"
						)}
					</button>
				</form>

				<p className="text-slate-400 text-sm pt-2">
					Remember your password?{" "}
					<Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}

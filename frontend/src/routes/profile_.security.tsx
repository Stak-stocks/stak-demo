import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
	updatePassword,
	reauthenticateWithCredential,
	EmailAuthProvider,
	sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ChevronLeft, Lock, Shield, Eye, EyeOff, KeyRound, Mail } from "lucide-react";

export const Route = createFileRoute("/profile_/security")({
	component: SecurityPage,
});

function SecurityPage() {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [saving, setSaving] = useState(false);

	// Swipe right to go back
	const touchStartX = useRef(0);
	const touchStartY = useRef(0);

	if (!user) {
		navigate({ to: "/login" });
		return null;
	}

	const provider = user.providerData[0]?.providerId;
	const isGoogle = provider === "google.com";

	async function handleChangePassword() {
		if (!user || !auth.currentUser || !user.email) return;
		if (newPassword.length < 6) {
			toast.error("Password must be at least 6 characters");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("Passwords don't match");
			return;
		}
		setSaving(true);
		try {
			const credential = EmailAuthProvider.credential(user.email, currentPassword);
			await reauthenticateWithCredential(auth.currentUser, credential);
			await updatePassword(auth.currentUser, newPassword);
			toast.success("Password updated successfully");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: unknown) {
			const code = (err as { code?: string }).code;
			if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
				toast.error("Current password is incorrect");
			} else if (code === "auth/too-many-requests") {
				toast.error("Too many attempts. Try again later.");
			} else {
				toast.error("Failed to update password");
			}
		} finally {
			setSaving(false);
		}
	}

	async function handleSendReset() {
		if (!user || !user.email) return;
		try {
			await sendPasswordResetEmail(auth, user.email);
			toast.success("Reset email sent", { description: `Check ${user.email}` });
		} catch {
			toast.error("Failed to send reset email");
		}
	}

	return (
		<div
			className="min-h-screen bg-[#080d1c] text-white pb-24"
			onTouchStart={(e) => {
				touchStartX.current = e.touches[0].clientX;
				touchStartY.current = e.touches[0].clientY;
			}}
			onTouchEnd={(e) => {
				const dx = e.changedTouches[0].clientX - touchStartX.current;
				const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
				if (dx > 60 && dy < 50) navigate({ to: "/profile" });
			}}
		>
			{/* Header */}
			<div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#080d1c]/95 backdrop-blur border-b border-slate-800/40">
				<button
					type="button"
					onClick={() => navigate({ to: "/profile" })}
					className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
				>
					<ChevronLeft className="w-5 h-5" />
					Back
				</button>
				<h1 className="text-sm font-semibold">Security & Password</h1>
				<div className="w-12" />
			</div>

			<div className="max-w-lg mx-auto px-4 pt-8">

				{/* Sign-in Method */}
				<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Sign-in Method</p>
				<div className="rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 mb-6">
					<div className="flex items-center gap-3 px-4 py-3.5">
						<div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
							<Shield className="w-4 h-4 text-amber-400" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Provider</p>
							<p className="text-sm font-medium text-white">{isGoogle ? "Google" : "Email & Password"}</p>
						</div>
						<span className={["text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border", isGoogle ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"].join(" ")}>
							{isGoogle ? "Google" : "Email"}
						</span>
					</div>
				</div>

				{/* Password Section */}
				<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Password</p>

				{isGoogle ? (
					<div className="rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 p-4 text-center">
						<div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-3">
							<KeyRound className="w-5 h-5 text-blue-400" />
						</div>
						<p className="text-sm font-medium text-white mb-1">Password managed by Google</p>
						<p className="text-xs text-zinc-500">Your sign-in is handled by Google. To change your password, visit your Google account settings.</p>
					</div>
				) : (
					<div className="rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 divide-y divide-slate-700/30">

						{/* Current Password */}
						<div className="flex items-center gap-3 px-4 py-3.5">
							<div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
								<Lock className="w-4 h-4 text-zinc-400" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Current Password</p>
								<input
									type={showCurrent ? "text" : "password"}
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									placeholder="Enter current password"
									className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
								/>
							</div>
							<button type="button" onClick={() => setShowCurrent((v) => !v)} className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
								{showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>

						{/* New Password */}
						<div className="flex items-center gap-3 px-4 py-3.5">
							<div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
								<KeyRound className="w-4 h-4 text-cyan-400" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">New Password</p>
								<input
									type={showNew ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Min. 6 characters"
									className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
								/>
							</div>
							<button type="button" onClick={() => setShowNew((v) => !v)} className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
								{showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>

						{/* Confirm Password */}
						<div className="flex items-center gap-3 px-4 py-3.5">
							<div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
								<Lock className="w-4 h-4 text-purple-400" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Confirm New Password</p>
								<input
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Repeat new password"
									onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
									className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
								/>
							</div>
						</div>

						{/* Save button */}
						<div className="px-4 py-3.5">
							<button
								type="button"
								onClick={handleChangePassword}
								disabled={saving || !currentPassword || !newPassword || !confirmPassword}
								className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
							>
								{saving ? "Saving…" : "Update Password"}
							</button>
						</div>
					</div>
				)}

				{/* Forgot / Reset password link */}
				{!isGoogle && (
					<button
						type="button"
						onClick={handleSendReset}
						className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2"
					>
						<Mail className="w-3.5 h-3.5" />
						Forgot password? Send reset email to {user.email}
					</button>
				)}
			</div>
		</div>
	);
}

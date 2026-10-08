import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { applyActionCode } from "firebase/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthHeading, AuthInput, AuthLayout, FootRow, PrimaryButton, ShowToggle, Spinner } from "@/app/auth/ui";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>) => ({
		mode: (search.mode as string) || "",
		oobCode: (search.oobCode as string) || "",
		continueUrl: (search.continueUrl as string) || "",
		// preview=1 renders the frame without a Firebase action code (design review / captures)
		preview: search.preview === 1 || search.preview === "1" || search.preview === true,
	}),
});

/** Figma 2:1283 "Desktop · Auth · Set a new password": keeps the Firebase oobCode verification and confirm flow. */
function ResetPasswordPage() {
	const { mode, oobCode, continueUrl, preview } = Route.useSearch();
	const { verifyResetCode, confirmReset } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [verifying, setVerifying] = useState(!preview);
	const [invalidCode, setInvalidCode] = useState(false);

	useEffect(() => {
		if (preview) return;
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
					// Redirect to continueUrl (handles cross-origin dev to localhost redirects), else sign in.
					if (continueUrl) {
						window.location.href = continueUrl;
					} else {
						navigate({ to: "/login" });
					}
				})
				.catch(() => {
					setInvalidCode(true);
					setVerifying(false);
				});
			return;
		}
		verifyResetCode(oobCode)
			.then(() => setVerifying(false))
			.catch(() => {
				setInvalidCode(true);
				setVerifying(false);
			});
	}, [mode, oobCode, continueUrl, preview, verifyResetCode, navigate]);

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

	if (verifying) return <Spinner />;

	if (invalidCode) {
		return (
			<AuthLayout formTop={372}>
				<div className="flex w-full flex-col items-start gap-[30px]">
					<div className="flex w-full flex-col items-start">
						<AuthHeading title="Invalid link" subtitle="This password reset link is invalid or has expired." />
					</div>
					<Link to="/forgot-password" className="w-full">
						<PrimaryButton>Request a new link</PrimaryButton>
					</Link>
				</div>
				<div className="flex flex-col items-center justify-center">
					<FootRow text="Changed your mind?" linkLabel="Sign in" to="/login" />
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout formTop={341}>
			<form onSubmit={handleSubmit} className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start">
					<AuthHeading
						title="Set a new password"
						subtitle="At least 8 characters, with a number. You’ll stay signed in on this computer."
					/>
				</div>
				<div className="flex w-full flex-col items-start gap-[14px]">
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="password"
						autoComplete="new-password"
						placeholder="New password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						right={<ShowToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
					/>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="confirmPassword"
						autoComplete="new-password"
						placeholder="Confirm new password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>
				</div>
				<PrimaryButton type="submit" disabled={resetting || preview || !password || !confirmPassword}>
					{resetting ? "Saving..." : "Save new password"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center">
				<FootRow text="Changed your mind?" linkLabel="Sign in" to="/login" />
			</div>
		</AuthLayout>
	);
}

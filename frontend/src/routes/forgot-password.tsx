import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
	AuthBackLink, AuthCta, AuthHeader, AuthInput, AuthScreen, AuthSpinner, ErrorText, OTP_LENGTH, ShowHide,
	confirmError as confirmProblem, emailError as emailProblem, friendlyAuthError, passwordError as passwordProblem, usePasswordVisibility,
} from "@/components/auth/AuthKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
});

type Step = "email" | "code" | "new-password" | "done";

const INFO_CARD = { display: "flex", flexDirection: "column", gap: cu(6), ...sheetCard(14), padding: cu(16) } as const;

/**
 * Android's Forgot password: four steps, all by emailed code, no links. Forward-only: a failed step shows its error in
 * place and retries there; the back circle always leaves the flow.
 */
function ForgotPasswordPage() {
	const { resetPasswordSupabase, verifyRecoveryOtp, confirmResetSupabase } = useAuth();
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>("email");
	const [busy, setBusy] = useState(false);
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [attempted, setAttempted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { shown, toggle } = usePasswordVisibility();


	async function sendCode() {
		setAttempted(true);
		setError(null);
		if (emailProblem(email) || busy) return;
		setBusy(true);
		try {
			await resetPasswordSupabase(email.trim());
			setAttempted(false);
			setStep("code");
		} catch (err) {
			setError(friendlyAuthError(err));
		} finally {
			setBusy(false);
		}
	}

	async function resend() {
		setBusy(true);
		setError(null);
		try { await resetPasswordSupabase(email.trim()); } catch (err) { setError(friendlyAuthError(err)); } finally { setBusy(false); }
	}

	async function verify() {
		if (busy || code.length < OTP_LENGTH) return;
		setBusy(true);
		setError(null);
		try {
			await verifyRecoveryOtp(email.trim(), code);
			setStep("new-password");
		} catch (err) {
			setCode("");
			setError(friendlyAuthError(err));
		} finally {
			setBusy(false);
		}
	}

	async function updatePassword() {
		setAttempted(true);
		setError(null);
		if (passwordProblem(newPassword) || confirmProblem(newPassword, confirmPassword) || busy) return;
		setBusy(true);
		try {
			await confirmResetSupabase(newPassword);
			// Drop the recovery session so the user must sign in fresh with the new password - on every device, on
			// purpose: a changed password should end sessions started with the old one.
			await supabase.auth.signOut();
			setStep("done");
		} catch (err) {
			setError(friendlyAuthError(err));
		} finally {
			setBusy(false);
		}
	}

	const cta =
		step === "email" ? <AuthCta label="Send code" onClick={sendCode} disabled={busy} />
		: step === "code" ? <AuthCta label="Verify" onClick={verify} disabled={busy || code.length < OTP_LENGTH} />
		: step === "new-password" ? <AuthCta label="Update password" onClick={updatePassword} disabled={busy} />
		: <AuthCta label="Back to sign in" onClick={() => navigate({ to: "/login" })} />;

	return (
		<AuthScreen
			nav={<AuthBackLink label="Back to sign in" onClick={() => navigate({ to: "/login" })} />}
			bottom={
				<>
					{cta}
					{busy && <AuthSpinner />}
					{error && <ErrorText>{error}</ErrorText>}
				</>
			}
		>
			{step === "email" && (
				<>
					<AuthHeader title="Reset your password" subtitle="Enter the email you signed up with and we’ll send you a code." />
					<div style={{ height: cu(4) }} />
					<AuthInput value={email} onChange={setEmail} placeholder="Email address" type="email" inputMode="email" autoComplete="email" autoFocus error={attempted ? emailProblem(email) : null} onEnter={sendCode} />
				</>
			)}
			{step === "code" && (
				<>
					<AuthHeader title="Check your email" subtitle={`We sent a code to ${email.trim()}. Enter it below.`} />
					<div style={{ height: cu(4) }} />
					<AuthInput value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 10))} placeholder="Confirmation code" inputMode="numeric" autoComplete="one-time-code" autoFocus onEnter={verify} />
					<div className="flex items-center" style={{ gap: cu(4) }}>
						<span style={{ font: f(400, 11, 15), color: "#ACAFB1" }}>Didn’t get it?</span>
						<button type="button" onClick={resend} disabled={busy} className={`disabled:opacity-50 ${PRESS}`} style={{ font: f(500, 11, 15), color: DISC.teal, ...focusRing }}>Resend code</button>
					</div>
				</>
			)}
			{step === "new-password" && (
				<>
					<AuthHeader title="Set a new password" subtitle="Choose a new password for your account." />
					<div style={{ height: cu(4) }} />
					<AuthInput value={newPassword} onChange={setNewPassword} placeholder="New password" type={shown ? "text" : "password"} autoComplete="new-password" error={attempted ? passwordProblem(newPassword) : null} trailing={<ShowHide shown={shown} onToggle={toggle} />} />
					<AuthInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" type={shown ? "text" : "password"} autoComplete="new-password" error={attempted ? confirmProblem(newPassword, confirmPassword) : null} onEnter={updatePassword} />
				</>
			)}
			{step === "done" && (
				<>
					<AuthHeader title="Password updated" subtitle="Sign in with your new password." />
					<div style={{ height: cu(4) }} />
					<div style={INFO_CARD}>
						<p style={{ font: f(500, 14), color: "#fff" }}>You’re all set</p>
						<p style={{ font: f(400, 11, 15), color: "#ACAFB1" }}>Your password was changed. Sign in below with the new one.</p>
					</div>
				</>
			)}
		</AuthScreen>
	);
}

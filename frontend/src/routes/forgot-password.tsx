import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthHeading, AuthInput, AuthLayout, FootRow, PrimaryButton } from "@/app/auth/ui";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
});

/** Figma 2:1257 "Desktop · Auth · Forgot password": sends the Firebase reset email, then shows Check your email. */
function ForgotPasswordPage() {
	const { resetPassword } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [sending, setSending] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!email) return;
		setSending(true);
		try {
			await resetPassword(email);
			toast.success("Reset email sent!");
			navigate({ to: "/check-email", search: { email } });
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
		<AuthLayout formTop={372} backTo="/login">
			<form onSubmit={handleSubmit} className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start">
					<AuthHeading title="Forgot your password?" subtitle="Enter the email you signed up with and we’ll send a reset link." />
				</div>
				<div className="flex w-full flex-col items-start">
					<AuthInput
						type="email"
						name="email"
						autoComplete="email"
						placeholder="Email address"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<PrimaryButton type="submit" disabled={sending || !email}>
					{sending ? "Sending..." : "Send reset link"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center">
				<FootRow text="Remembered it?" linkLabel="Sign in" to="/login" />
			</div>
		</AuthLayout>
	);
}

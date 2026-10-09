import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthHeading, AuthInput, AuthLayout, authErrorMessage, FieldError, FootRow, isEmail } from "@/app/auth/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { useAuth } from "../context/AuthContext";

type ForgotSearch = { email?: string };

export const Route = createFileRoute("/forgot-password")({
	validateSearch: (search: Record<string, unknown>): ForgotSearch => ({
		email: typeof search.email === "string" && search.email ? search.email : undefined,
	}),
	component: ForgotPasswordPage,
});

/** Figma 2:1257 "Desktop · Auth · Forgot password": sends the Firebase reset email, then shows Check your email. */
function ForgotPasswordPage() {
	const { email: prefilled } = Route.useSearch();
	const { resetPassword } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState(prefilled ?? "");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!isEmail(email)) {
			setError("Enter the email you signed up with");
			return;
		}
		setSending(true);
		try {
			await resetPassword(email.trim());
			toast.success("Reset email sent!");
			navigate({ to: "/check-email", search: { email: email.trim() } });
		} catch (err: unknown) {
			setError(authErrorMessage(err, "Could not send the reset email. Try again."));
		} finally {
			setSending(false);
		}
	}

	return (
		<AuthLayout formTop={372} backTo="/login">
			<form onSubmit={handleSubmit} noValidate className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start">
					<AuthHeading title="Forgot your password?" subtitle="Enter the email you signed up with and we’ll send a reset link." />
				</div>
				<div className="flex w-full flex-col items-start gap-[14px]">
					<AuthInput
						type="email"
						name="email"
						autoComplete="email"
						placeholder="Email address"
						value={email}
						invalid={!!error}
						onChange={(e) => {
							setEmail(e.target.value);
							if (error) setError(null);
						}}
					/>
					<FieldError>{error}</FieldError>
				</div>
				<PrimaryButton type="submit" disabled={sending} aria-busy={sending}>
					{sending ? "Sending…" : "Send reset link"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center">
				<FootRow text="Remembered it?" linkLabel="Sign in" to="/login" />
			</div>
		</AuthLayout>
	);
}

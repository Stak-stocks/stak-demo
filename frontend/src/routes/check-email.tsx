import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthHeading, AuthLayout, FootRow } from "@/app/auth/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { useAuth } from "../context/AuthContext";

type CheckEmailSearch = { email?: string };

export const Route = createFileRoute("/check-email")({
	validateSearch: (search: Record<string, unknown>): CheckEmailSearch => ({
		email: typeof search.email === "string" && search.email ? search.email : undefined,
	}),
	component: CheckEmailPage,
});

/** Figma 2:1566 "Desktop · Auth · Check your email" (the frame's demo address when none was passed). */
function CheckEmailPage() {
	const { email } = Route.useSearch();
	const { resetPassword } = useAuth();
	const [resending, setResending] = useState(false);
	const address = email ?? "hamza@gmail.com";

	async function resend() {
		if (!email || resending) return;
		setResending(true);
		try {
			await resetPassword(email);
			toast.success("Reset email sent again!");
		} catch {
			toast.error("Failed to resend. Try again.");
		} finally {
			setResending(false);
		}
	}

	return (
		<AuthLayout formTop={411} backTo="/forgot-password">
			<div className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start">
					<AuthHeading title="Check your email" subtitle={`We sent a reset link to ${address}. It expires in 15 minutes.`} />
				</div>
				<PrimaryButton
					onClick={() => {
						window.location.href = "mailto:";
					}}
				>
					Open mail app
				</PrimaryButton>
			</div>
			<div className="flex flex-col items-center justify-center">
				<FootRow text="Didn’t get it?" linkLabel="Resend link" onClick={resend} />
			</div>
		</AuthLayout>
	);
}

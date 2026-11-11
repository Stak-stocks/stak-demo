import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { applyActionCode, type User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	AuthHeading,
	AuthInput,
	AuthLayout,
	authErrorMessage,
	FieldError,
	FootRow,
	passwordProblem,
	ShowToggle,
} from "@/app/auth/ui";
import { PROFILE_WAIT_MS } from "@/app/auth/usePostAuthRedirect";
import { PrimaryButton } from "@/app/ui/Button";
import { getProfile } from "@/lib/api";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

const text = (v: unknown) => (typeof v === "string" && v ? v : undefined);

// Each value stays as written and a missing one stays missing, so opening the page does not rewrite its URL
// (?preview=1 used to become ?preview=true&mode=&oobCode=&continueUrl=).
type ResetSearch = { mode?: string; oobCode?: string; continueUrl?: string; preview?: true | 1 | "1" };

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>): ResetSearch => ({
		mode: text(search.mode),
		oobCode: text(search.oobCode),
		continueUrl: text(search.continueUrl),
		// preview=1 renders the frame without a Firebase action code (design review / captures)
		preview: search.preview === 1 || search.preview === "1" || search.preview === true ? search.preview : undefined,
	}),
});

/** Figma 2:1283 "Desktop · Auth · Set a new password": keeps the Firebase oobCode verification and confirm flow. */
function ResetPasswordPage() {
	const search = Route.useSearch();
	const { mode = "", oobCode = "", continueUrl = "" } = search;
	const preview = search.preview !== undefined;
	const { verifyResetCode, confirmReset } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [verifying, setVerifying] = useState(!preview);
	const [invalidCode, setInvalidCode] = useState(false);
	const verification = useRef<{ key: string; task: Promise<unknown> } | null>(null);
	const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});

	useEffect(() => {
		let active = true;
		setInvalidCode(false);
		setVerifying(!preview);
		if (preview) return;
		if (!oobCode) {
			setInvalidCode(true);
			setVerifying(false);
			return;
		}
		const key = `${mode}:${oobCode}`;
		if (verification.current?.key !== key) verification.current = { key, task: mode === "verifyEmail" ? applyActionCode(auth, oobCode) : verifyResetCode(oobCode) };
		const controller = new AbortController();
		/**
		 * The link opened where the person is signed in already (the sign-up's own session, BUILD-PLAN N64): go on as
		 * a sign-in does, by the onboarding claim, without passing through the Sign in page, whose Figma heading reads
		 * "Welcome back" (a new account must never be greeted so): reload (the email is verified now), refresh the
		 * token, ask the API for the account (best effort: it creates the account's record; a failure or a slow API
		 * never stops the person, as after a sign-in), then the claim sends them to Home or to Onboarding. A Firebase
		 * failure falls back to the old path, the Sign in page.
		 */
		async function continueSignedIn(user: User) {
			try {
				await user.reload();
				if (!active) return;
				await user.getIdToken(true);
				if (!active) return;
				const timer = setTimeout(() => controller.abort(), PROFILE_WAIT_MS);
				await getProfile({ signal: controller.signal }).catch(() => {});
				clearTimeout(timer);
				if (!active) return;
				const result = await user.getIdTokenResult(true);
				if (!active) return;
				navigate({ to: result.claims.onboardingCompleted === true ? "/home" : "/onboarding", replace: true });
			} catch {
				if (active) navigate({ to: "/login" });
			}
		}
		verification.current.task.then(() => {
			if (!active) return;
			if (mode === "verifyEmail") {
					toast.success("Email verified! Welcome to STAK!");
					// Redirect to continueUrl (handles cross-origin dev to localhost redirects); a session here goes on by
					// the claim; else sign in.
					if (continueUrl) {
						window.location.href = continueUrl;
					} else if (auth.currentUser) {
						void continueSignedIn(auth.currentUser);
					} else {
						navigate({ to: "/login" });
					}
			} else setVerifying(false);
		}).catch(() => {
				if (!active) return;
				setInvalidCode(true);
				setVerifying(false);
			});
		return () => {
			active = false;
			controller.abort();
		};
	}, [mode, oobCode, continueUrl, preview, verifyResetCode, navigate]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (resetting) return;
		// the frame preview has no action code: the button keeps its enabled look and submitting does nothing
		if (preview) return;
		const next: typeof errors = {};
		const problem = passwordProblem(password);
		if (problem) next.password = problem;
		if (!confirmPassword) next.confirm = "Type your new password again";
		else if (password !== confirmPassword) next.confirm = "The passwords do not match";
		setErrors(next);
		if (next.password || next.confirm) return;
		setResetting(true);
		try {
			await confirmReset(oobCode, password);
			toast.success("Password reset! You can now sign in.");
			navigate({ to: "/login", viewTransition: false });
		} catch (error: unknown) {
			setErrors({ form: authErrorMessage(error, "Could not reset the password. The link may have expired.") });
			setResetting(false);
		}
	}

	// While Firebase checks the link: the frame without its form (Figma draws no loading state, so nothing is added);
	// the form appears once the link is verified.
	if (verifying) return <AuthLayout formTop={341} backTo="/login" backTransition={false}>{null}</AuthLayout>;

	if (invalidCode) {
		return (
			<AuthLayout formTop={372} backTo="/login" backTransition={false}>
				<div className="flex w-full flex-col items-start gap-[30px]">
					<div className="flex w-full flex-col items-start">
						<AuthHeading title="Invalid link" subtitle="This password reset link is invalid or has expired." />
					</div>
					<Link to="/forgot-password" viewTransition={false} className="block w-full rounded-[6px]">
						<PrimaryButton as="span">Request a new link</PrimaryButton>
					</Link>
				</div>
				<div className="flex flex-col items-center justify-center">
					<FootRow text="Changed your mind?" textWidth={114} linkLabel="Sign in" linkWidth={39} to="/login" viewTransition={false} />
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout formTop={341} backTo="/login" backTransition={false}>
			<form onSubmit={handleSubmit} noValidate className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-full flex-col items-start">
					<AuthHeading
						title="Set a new password"
						subtitle="At least 8 characters, with a number. You’ll stay signed in on this computer."
					/>
				</div>
				<div className="flex w-full flex-col items-start gap-[14px]">
					{/* The frame draws these two fields without the "Show" its Sign in / Sign up password fields carry (2:5696 /
					    2:5651); the page has always let the person see what they type here (the product's show / hide, kept as
					    a feature), so it takes Figma's own "Show" from those fields, on the first field, and both follow it. */}
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="password"
						autoComplete="new-password"
						placeholder="New password"
						value={password}
						invalid={!!errors.password}
						onChange={(e) => {
							setPassword(e.target.value);
							if (errors.password || errors.form) setErrors((p) => ({ ...p, password: undefined, form: undefined }));
						}}
						right={<ShowToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
					/>
					<FieldError>{errors.password}</FieldError>
					<AuthInput
						type={showPassword ? "text" : "password"}
						name="confirmPassword"
						autoComplete="new-password"
						placeholder="Confirm new password"
						value={confirmPassword}
						invalid={!!errors.confirm}
						onChange={(e) => {
							setConfirmPassword(e.target.value);
							if (errors.confirm || errors.form) setErrors((p) => ({ ...p, confirm: undefined, form: undefined }));
						}}
					/>
					<FieldError>{errors.confirm ?? errors.form}</FieldError>
				</div>
				{/* 2:1302: the canon draws "Save new password" in Figma's 131-wide text box (CANON_LABELS) */}
				<PrimaryButton type="submit" disabled={resetting} aria-busy={resetting}>
					{resetting ? "Saving…" : "Save new password"}
				</PrimaryButton>
			</form>
			<div className="flex flex-col items-center justify-center">
				<FootRow text="Changed your mind?" textWidth={114} linkLabel="Sign in" linkWidth={39} to="/login" viewTransition={false} />
			</div>
		</AuthLayout>
	);
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { NoticeCard, SettingsScaffold } from "@/components/profile/ProfileKit";
import { SheetCta } from "@/components/simulate/simKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { f, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/security")({
	component: ChangePasswordPage,
});

/** Android's friendlyError: a Supabase failure in plain words. */
function friendlyError(err: unknown): string {
	const message = err instanceof Error ? err.message : "";
	const lower = message.toLowerCase();
	if (lower.includes("weak_password") || lower.includes("weak password")) return "Password is too weak — use at least 8 characters";
	if (lower.includes("network") || lower.includes("failed to fetch")) return "Network error — check your connection";
	if (lower.includes("user not found")) return "No account found for that email";
	if (lower.includes("security purposes")) return "Give it a moment before trying again.";
	return message || "Something went wrong. Try again.";
}

function Field({ value, onChange, placeholder, hidden, error, trailing }: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	hidden: boolean;
	error?: string | null;
	trailing?: React.ReactNode;
}) {
	const errorId = useId();
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
			<div className="flex items-center" style={{ gap: cu(8), ...sheetCard(14), padding: cu(16), border: error ? `${cu(1)} solid ${DISC.redDown}` : `${cu(1)} solid transparent` }}>
				<input
					type={hidden ? "password" : "text"}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					aria-label={placeholder}
					aria-invalid={!!error}
					aria-describedby={error ? errorId : undefined}
					autoComplete="new-password"
					className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#819ABB]"
					style={{ font: f(400, 13), color: "#fff", caretColor: "#69B3CA" }}
				/>
				{trailing}
			</div>
			{error && <p id={errorId} style={{ paddingLeft: cu(4), font: f(400, 11), color: DISC.redDown }}>{error}</p>}
		</div>
	);
}

/** Android's Change password (under App settings): two fields, checked after the first tap, then a "Password updated" card. */
function ChangePasswordPage() {
	const { appUser } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [show, setShow] = useState(false);
	const [attempted, setAttempted] = useState(false);
	const [saving, setSaving] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	useEffect(() => { if (!appUser) navigate({ to: "/login" }); }, [appUser, navigate]);
	if (!appUser) return null;

	const backTo = "/profile/app-settings";
	const passwordError = !attempted ? null : !password ? "Enter your password" : password.length < 8 ? "Use at least 8 characters" : null;
	const confirmError = !attempted ? null : !confirm ? "Confirm your password" : confirm !== password ? "Passwords don’t match" : null;

	async function submit() {
		setAttempted(true);
		setServerError(null);
		if (!password || password.length < 8 || confirm !== password || saving) return;
		setSaving(true);
		try {
			// The active session is enough; Supabase needs no re-authentication here.
			const { error } = await supabase.auth.updateUser({ password });
			if (error) throw error;
			setDone(true);
		} catch (err) {
			setServerError(friendlyError(err));
		} finally {
			setSaving(false);
		}
	}

	if (appUser.provider === "google.com") {
		return (
			<SettingsScaffold title="Change password" backTo={backTo}>
				<NoticeCard title="Password managed by Google" body="Your sign-in is handled by Google. To change your password, visit your Google account settings." />
			</SettingsScaffold>
		);
	}

	if (done) {
		return (
			<SettingsScaffold title="Change password" backTo={backTo}>
				<NoticeCard title="Password updated" body="Use it the next time you sign in." />
				<SheetCta onClick={() => navigate({ to: backTo })}>Done</SheetCta>
			</SettingsScaffold>
		);
	}

	const toggle = (
		<button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} style={{ font: f(500, 11), color: DISC.teal }}>{show ? "Hide" : "Show"}</button>
	);
	return (
		<SettingsScaffold title="Change password" backTo={backTo}>
			<Field value={password} onChange={setPassword} placeholder="New password" hidden={!show} error={passwordError} trailing={toggle} />
			<Field value={confirm} onChange={setConfirm} placeholder="Confirm new password" hidden={!show} error={confirmError} />
			<p style={{ padding: `0 ${cu(4)}`, font: f(400, 12, 16), color: DISC.muted }}>At least 8 characters.</p>
			{serverError && <p role="alert" style={{ font: f(400, 12), color: DISC.redDown }}>{serverError}</p>}
			<SheetCta onClick={submit} disabled={!password || !confirm || saving}>{saving ? "Updating…" : "Update password"}</SheetCta>
		</SettingsScaffold>
	);
}

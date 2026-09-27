import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { deleteMe } from "@/lib/api";
import { getAppearance } from "@/lib/appearance";
import { Caption, SettingsCard, SettingsLinkRow, SettingsScaffold } from "@/components/profile/ProfileKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/app-settings")({
	component: AppSettingsPage,
});

/** Android's App settings: Dark mode and Change password, and Delete account behind one expand-and-tap.
 *  (Its biometric lock has no browser equivalent.) The session is dropped only after the server confirms. */
function AppSettingsPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { logout } = useAuth();
	const [open, setOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleDelete() {
		if (deleting) return;
		setDeleting(true);
		setError(null);
		try {
			await deleteMe();
		} catch (err) {
			setError(err instanceof TypeError ? "Network error — check your connection" : "Something went wrong. Try again.");
			setDeleting(false);
			return;
		}
		try { await logout(); } catch { /* the account is already gone server-side */ }
		queryClient.clear();
		try { sessionStorage.clear(); } catch { /* best-effort */ }
		navigate({ to: "/signup" });
	}

	return (
		<SettingsScaffold title="App settings">
			<SettingsCard>
				<SettingsLinkRow label="Dark mode" value={getAppearance() === "system" ? "Match system" : "On"} onClick={() => navigate({ to: "/profile/appearance" })} />
				<SettingsLinkRow label="Change password" onClick={() => navigate({ to: "/profile/security" })} />
			</SettingsCard>

			<SettingsCard>
				<SettingsLinkRow label="Delete account" chevron={!open} onClick={() => setOpen((v) => !v)} />
				{open && (
					<div style={{ display: "flex", flexDirection: "column", gap: cu(10), padding: `0 ${cu(14)} ${cu(14)}` }}>
						<p style={{ font: f(400, 12, 17), color: DISC.body }}>This removes your saves, paper portfolio and settings from this device and signs you out. It can’t be undone.</p>
						{error && <p role="alert" style={{ font: f(400, 12), color: DISC.redDown }}>{error}</p>}
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleting}
							className={`w-full ${PRESS}`}
							style={{ height: cu(44), borderRadius: cu(6), background: "rgba(229,72,77,0.2)", font: f(500, 13), color: DISC.redDown, opacity: deleting ? 0.5 : 1, ...focusRing }}
						>
							{deleting ? "Deleting…" : "Delete my account"}
						</button>
					</div>
				)}
			</SettingsCard>

			<Caption>Log out from the Profile page ends this account’s session; a new sign-up starts fresh.</Caption>
		</SettingsScaffold>
	);
}

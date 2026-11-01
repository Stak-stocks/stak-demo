import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/lib/api";
import { capitalizeWords } from "@/lib/utils";
import { SettingsScaffold } from "@/components/profile/ProfileKit";
import { SheetCta } from "@/components/simulate/simKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { FIELD_EDGE, FIELD_FOCUS, f, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/personal-details")({
	component: EditProfilePage,
});

const NAME_MAX = 20;

/** Android's Edit profile: a display name (20 characters, capitalised) and Save changes. Only the name is stored; there are no photos. */
function EditProfilePage() {
	const { appUser } = useAuth();
	const { refreshAccount } = useAccount();
	const navigate = useNavigate();
	const [name, setName] = useState(appUser?.displayName ?? "");
	const [saving, setSaving] = useState(false);

	useEffect(() => { if (!appUser) navigate({ to: "/login" }); }, [appUser, navigate]);
	if (!appUser) return null;

	async function save() {
		const trimmed = capitalizeWords(name.trim());
		if (!trimmed || saving) return;
		setSaving(true);
		try {
			// The auth user's metadata (what the session reads) and the users row (what the app reads day to day).
			await supabase.auth.updateUser({ data: { full_name: trimmed } });
			await updateProfile({ displayName: trimmed });
			await refreshAccount().catch(() => {});
			navigate({ to: "/profile" });
		} catch {
			toast.error("Couldn't save your name. Try again.");
			setSaving(false);
		}
	}

	return (
		<SettingsScaffold title="Edit profile" gap={16}>
			<span className="mx-auto grid place-items-center rounded-full" style={{ width: cu(64), height: cu(64), background: DISC.avatar, font: f(600, 22, 28, "heading"), color: DISC.badgeInk }} aria-hidden="true">
				{(name.trim() || appUser.displayName || "S").slice(0, 1).toUpperCase()}
			</span>
			<label style={{ display: "flex", flexDirection: "column", gap: cu(8) }}>
				<span style={{ font: f(500, 10, 13), letterSpacing: cu(1.2), color: DISC.muted }}>DISPLAY NAME</span>
				<span className={`flex items-center ${FIELD_FOCUS}`} style={{ gap: cu(8), ...sheetCard(14), boxShadow: `inset 0 0 0 ${cu(1)} ${FIELD_EDGE}`, padding: cu(16) }}>
					<input
						value={name}
						onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
						placeholder="Your name"
						autoCapitalize="words"
						aria-label="Display name"
						className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#819ABB]"
						style={{ font: f(400, 14), color: "#fff", caretColor: "#69B3CA" }}
					/>
					<span style={{ font: f(400, 11), color: DISC.muted }}>{name.length} / {NAME_MAX}</span>
				</span>
			</label>
			<SheetCta onClick={save} disabled={!name.trim() || saving}>{saving ? "Saving…" : "Save changes"}</SheetCta>
		</SettingsScaffold>
	);
}

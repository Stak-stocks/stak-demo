import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { col } from "@/app/FitCanvas";
import { useLive } from "@/app/live/store";
import { PageHeader } from "@/app/PageHeader";
import { editProfile } from "@/app/profile/data";
import { GradientButton, RowLabel, RowValue, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { useAccountDisplay } from "@/app/useAccountDisplay";

export const Route = createFileRoute("/_app/profile_/edit")({
	component: EditProfilePage,
});

const NAME_MAX = 24;

/** Figma 2:2555 "Desktop · Edit profile": the display name is editable, the handle follows it, the email stays. */
function EditProfilePage() {
	const me = useAccountDisplay();
	const live = useLive();
	const navigate = useNavigate();
	const [name, setName] = useState(me.name);
	const [saving, setSaving] = useState(false);
	useEffect(() => setName(me.name), [me.name]);

	const first = name.trim().split(/\s+/)[0] ?? "";
	const handle = `@${first.toLowerCase().replace(/[^a-z0-9_]/g, "") || "you"}`;
	const initial = (first.charAt(0) || me.initial).toUpperCase();
	const dirty = name.trim().length > 0 && name.trim() !== me.name;

	async function save() {
		if (!dirty) {
			navigate({ to: "/profile" });
			return;
		}
		setSaving(true);
		try {
			await live.actions.setDisplayName(name);
			toast.success("Changes saved");
			navigate({ to: "/profile" });
		} catch {
			toast.error("Could not save your changes. Try again.");
		} finally {
			setSaving(false);
		}
	}

	const inputClass =
		"block h-[49px] w-full rounded-[14px] border-0 bg-[#181f30] px-[16px] py-0 font-geist text-[13px] leading-[17px] text-white outline-none";

	return (
		<div className="flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={editProfile.title} onBell={() => navigate({ to: "/home", search: { notifications: "1" } })} />
			<form
				className="flex flex-col items-start gap-[16px]"
				style={{ width: col(640) }}
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<div className="flex w-full flex-col items-center gap-[8px] overflow-clip">
					<button
						type="button"
						aria-label="Change photo"
						onClick={() => toast.info("Photos arrive with the next release. Your initial stands in for now.")}
						className="stak-press flex size-[64px] cursor-pointer items-center justify-center overflow-clip rounded-[32px] bg-[#242b3d]"
					>
						<span className="whitespace-nowrap font-sora text-[22px] font-semibold leading-[28px] text-[#9eadc7]">{initial}</span>
					</button>
					<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]">{editProfile.avatarHint}</p>
				</div>

				<label className="flex w-full flex-col items-start gap-[6px] overflow-clip">
					<span className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{editProfile.fields[0].label}</span>
					<input value={name} maxLength={NAME_MAX} autoComplete="name" onChange={(e) => setName(e.target.value)} className={inputClass} />
				</label>
				<label className="flex w-full flex-col items-start gap-[6px] overflow-clip">
					<span className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{editProfile.fields[1].label}</span>
					<input value={handle} readOnly aria-readonly="true" tabIndex={-1} className={inputClass} />
				</label>
				<label className="flex w-full flex-col items-start gap-[6px] overflow-clip">
					<span className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{editProfile.fields[2].label}</span>
					<input value={me.email} readOnly aria-readonly="true" tabIndex={-1} autoComplete="email" className={inputClass} />
				</label>

				<SectionLabel>{editProfile.security.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow
						href={`/forgot-password?email=${encodeURIComponent(me.email)}`}
						left={<RowLabel>{editProfile.security.row.label}</RowLabel>}
						right={<RowValue>{editProfile.security.row.value}</RowValue>}
					/>
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{editProfile.note}</p>

				<div className="flex w-full flex-col items-center overflow-clip pb-[26px] pt-[8px]">
					<GradientButton onClick={save} disabled={saving}>
						<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[20.69px] text-white">{saving ? "Saving…" : editProfile.save}</span>
					</GradientButton>
				</div>
			</form>
		</div>
	);
}

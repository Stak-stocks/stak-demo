import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { editProfile } from "@/app/profile/data";
import { useAccountDisplay } from "@/app/useAccountDisplay";
import { GradientButton, RowLabel, RowValue, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { col } from "@/app/FitCanvas";
import { PageHeader } from "@/app/PageHeader";

export const Route = createFileRoute("/_app/profile_/edit")({
	component: EditProfilePage,
});

/** Figma 2:2555 "Desktop · Edit profile". */
function EditProfilePage() {
	const me = useAccountDisplay();
	const values: Record<string, string> = { "DISPLAY NAME": me.name, HANDLE: me.handle, EMAIL: me.email };
	const navigate = useNavigate();
	return (
		<div className="flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={editProfile.title} onBell={() => navigate({ to: "/home", search: { notifications: "1" } })} />
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				<div className="flex w-full flex-col items-center gap-[8px] overflow-clip">
					<button
						type="button"
						aria-label="Change photo"
						className="flex size-[64px] items-center justify-center overflow-clip rounded-[32px] bg-[#242b3d]"
					>
						<span className="whitespace-nowrap font-sora text-[22px] font-semibold leading-[28px] text-[#9eadc7]">{me.initial}</span>
					</button>
					<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]">{editProfile.avatarHint}</p>
				</div>

				{editProfile.fields.map((field) => (
					<label key={field.label} className="flex w-full flex-col items-start gap-[6px] overflow-clip">
						<span className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{field.label}</span>
						<input
							defaultValue={values[field.label] ?? field.value}
							className="block h-[49px] w-full rounded-[14px] border-0 bg-[#181f30] px-[16px] py-0 font-geist text-[13px] leading-[17px] text-white outline-none"
						/>
					</label>
				))}

				<SectionLabel>{editProfile.security.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow
						href="/forgot-password"
						left={<RowLabel>{editProfile.security.row.label}</RowLabel>}
						right={<RowValue>{editProfile.security.row.value}</RowValue>}
					/>
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{editProfile.note}</p>

				<div className="flex w-full flex-col items-center overflow-clip pb-[26px] pt-[8px]">
					<GradientButton onClick={() => navigate({ to: "/profile" })}>
						<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[20.69px] text-white">{editProfile.save}</span>
					</GradientButton>
				</div>
			</div>
		</div>
	);
}

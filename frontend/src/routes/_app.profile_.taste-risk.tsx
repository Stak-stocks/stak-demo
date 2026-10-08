import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tasteRisk } from "@/app/profile/data";
import { CHEVRON, RowLabel, RowValue, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { col } from "@/app/FitCanvas";
import { PageHeader } from "@/app/PageHeader";

export const Route = createFileRoute("/_app/profile_/taste-risk")({
	component: TasteRiskPage,
});

/** Figma 2:2760 "Desktop · Taste & risk". Chip widths pinned to the frame (97 / 94 / 125) so glyph-width differences never move them. */
const CHIP_WIDTHS = [97, 94, 125];
function TasteRiskPage() {
	const navigate = useNavigate();
	const { taste, risk, goal } = tasteRisk;
	return (
		<div className="flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={tasteRisk.title} onBell={() => navigate({ to: "/home", search: { notifications: "1" } })} />
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				<SectionLabel>{taste.label}</SectionLabel>
				<div className="flex w-full flex-col items-start gap-[17px] overflow-clip rounded-[16px] bg-[#10182b] px-[14px] pb-[4px] pt-[14px]">
					<div className="flex w-full flex-wrap content-start items-start gap-y-[8px] overflow-clip">
						<div className="flex w-[332px] flex-col items-start">
							<div className="flex w-full items-center gap-[8px]">
								{taste.chips.map((chip, i) => (
									<span
										key={chip}
										className="flex h-[28px] items-center justify-center overflow-clip rounded-[14px] border-[0.5px] border-[rgba(44,157,188,0.14)] bg-[rgba(26,35,51,0.55)] px-[12px]"
										style={{ width: CHIP_WIDTHS[i] }}
									>
										<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#7fd4e8]">{chip}</span>
									</span>
								))}
							</div>
						</div>
					</div>
					<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#c8d2e0]">{taste.caption}</p>
					<a href="/onboarding" className="flex h-[48px] w-full items-center justify-between overflow-clip whitespace-nowrap">
						<RowLabel>{taste.retake}</RowLabel>
						<RowValue>{CHEVRON}</RowValue>
					</a>
				</div>

				<SectionLabel>{risk.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow left={<RowLabel>{risk.value}</RowLabel>} right={<RowValue accent>{risk.change}</RowValue>} />
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{risk.description}</p>

				<SectionLabel>{goal.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow left={<RowLabel>{goal.value}</RowLabel>} right={<RowValue accent>{goal.change}</RowValue>} />
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{goal.description}</p>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{tasteRisk.footnote}</p>
			</div>
		</div>
	);
}

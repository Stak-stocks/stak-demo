import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { col } from "@/app/FitCanvas";
import { useLive } from "@/app/live/store";
import { useTaste } from "@/app/live/taste";
import { PageHeader } from "@/app/PageHeader";
import { tasteRisk } from "@/app/profile/data";
import { CHEVRON, RowLabel, RowValue, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";

export const Route = createFileRoute("/_app/profile_/taste-risk")({
	component: TasteRiskPage,
});

/** Chip widths pinned to the frame for its three labels (97 / 94 / 125) so glyph-width differences never move them. */
const PINNED_CHIP_WIDTHS: Record<string, number> = { "Tech Curious": 97, "High Growth": 94, "Consumer Brands": 125 };

/** Figma 2:2760 "Desktop · Taste & risk": chips from the taste graph, risk style and goal from the onboarding answers. */
function TasteRiskPage() {
	const navigate = useNavigate();
	const live = useLive();
	const { chips, risk, goal } = useTaste();
	const { taste } = tasteRisk;

	/** The onboarding steps change these answers; the deck rebuilds from them. Guests need an account first. */
	const goOnboarding = (step: number) => {
		if (!live.signedIn) {
			toast("Create an account to save your taste");
			navigate({ to: "/signup" });
			return;
		}
		navigate({ to: "/onboarding", search: { step } });
	};

	return (
		<div className="flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={tasteRisk.title} onBell={() => navigate({ to: "/home", search: { notifications: "1" } })} />
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				<SectionLabel>{taste.label}</SectionLabel>
				<div className="flex w-full flex-col items-start gap-[17px] overflow-clip rounded-[16px] bg-[#10182b] px-[14px] pb-[4px] pt-[14px]">
					<div className="flex w-full flex-wrap content-start items-start gap-y-[8px] overflow-clip">
						<div className="flex w-[332px] flex-col items-start">
							<div className="flex w-full items-center gap-[8px]">
								{chips.map((chip) => (
									<span
										key={chip}
										className="flex h-[28px] items-center justify-center overflow-clip rounded-[14px] border-[0.5px] border-[rgba(44,157,188,0.14)] bg-[rgba(26,35,51,0.55)] px-[12px]"
										style={{ width: PINNED_CHIP_WIDTHS[chip] }}
									>
										<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#7fd4e8]">{chip}</span>
									</span>
								))}
							</div>
						</div>
					</div>
					<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#c8d2e0]">{taste.caption}</p>
					<button
						type="button"
						onClick={() => goOnboarding(2)}
						className="stak-press flex h-[48px] w-full cursor-pointer items-center justify-between overflow-clip whitespace-nowrap"
					>
						<RowLabel>{taste.retake}</RowLabel>
						<RowValue>{CHEVRON}</RowValue>
					</button>
				</div>

				<SectionLabel>{tasteRisk.risk.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow left={<RowLabel>{risk.value}</RowLabel>} right={<RowValue accent>{tasteRisk.risk.change}</RowValue>} onClick={() => goOnboarding(5)} />
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{risk.description}</p>

				<SectionLabel>{tasteRisk.goal.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow left={<RowLabel>{goal.value}</RowLabel>} right={<RowValue accent>{tasteRisk.goal.change}</RowValue>} onClick={() => goOnboarding(4)} />
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{goal.description}</p>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{tasteRisk.footnote}</p>
			</div>
		</div>
	);
}
